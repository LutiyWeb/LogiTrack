import { emptyDraft, type LoadDraft } from '../runs/demo';
import { carrierProfile } from '../store/slices/uiSlice';

export type RateConField = Exclude<keyof LoadDraft, 'status' | 'driveHours'>;

export type ParsedRateCon = {
  draft: LoadDraft;
  /** Fields that were read from the document (the rest need a manual check). */
  found: RateConField[];
  warnings: string[];
  /** True when the text does not look like a rate confirmation at all. */
  unrecognized: boolean;
};

const OWN_MC = carrierProfile.mcNumber.replace(/\D/g, '');

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const ADDRESS =
  /(\d+[^|,\n]*?),\s*([A-Za-z][A-Za-z .'-]*?),\s*([A-Z]{2})\b(?:\s*\|?\s*\d{5}(?:-\d{4})?)?/;

const STOP_START = /\b(pick ?up|shipper|origin)\b/i;

const FACILITY_LABEL = /^(facility|name|shipper|consignee|location|receiver)\s*[|:]\s*(.+)$/i;

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function toIsoLocal(year: number, month: number, day: number, hour = 0, minute = 0, meridiem?: string) {
  let hours = hour;
  if (meridiem) {
    const pm = meridiem.toUpperCase() === 'PM';
    if (pm && hours < 12) hours += 12;
    if (!pm && hours === 12) hours = 0;
  }
  return `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minute)}`;
}

/** Finds the first date (with optional time) in a piece of text. */
export function findDateTime(text: string): string | null {
  const numeric = text.match(
    /(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s*(?:at|@|,)?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i,
  );
  const named = text.match(
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})(?:\s*(?:at|@|,)?\s*(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i,
  );

  const pick =
    numeric && named ? ((numeric.index ?? 0) <= (named.index ?? 0) ? 'numeric' : 'named') : numeric ? 'numeric' : named ? 'named' : null;

  if (pick === 'numeric' && numeric) {
    return toIsoLocal(
      Number(numeric[3]),
      Number(numeric[1]),
      Number(numeric[2]),
      Number(numeric[4] ?? 0),
      Number(numeric[5] ?? 0),
      numeric[6],
    );
  }
  if (pick === 'named' && named) {
    return toIsoLocal(
      Number(named[3]),
      MONTHS.indexOf(named[1].toLowerCase()) + 1,
      Number(named[2]),
      Number(named[4] ?? 0),
      Number(named[5] ?? 0),
      named[6],
    );
  }
  return null;
}

function money(value: string) {
  return String(Math.round(Number(value.replace(/,/g, ''))));
}

function titleCase(value: string) {
  if (/[a-z]/.test(value)) return value;
  return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function cleanFacility(value: string) {
  return value
    .replace(
      /^(?:pick ?up(?: at| from)?|deliver(?:y)?(?: to)?|ship (?:from|to)|consignee|shipper|origin|destination|stop \d+)\s*[:-]?\s*/i,
      '',
    )
    .replace(/[,\s]+$/, '')
    .trim();
}

type Stop = { place: string; city: string; state: string; at: string };

function readStop(lines: string[], lineIndex: number, match: RegExpMatchArray, nextStopLine: number): Stop {
  const line = lines[lineIndex];
  const start = match.index ?? 0;

  // Facility: same cell before the street address, or a labelled line just above.
  const beforeCell =
    line
      .slice(0, start)
      .split('|')
      .map((cell) => cell.trim())
      .filter(Boolean)
      .pop() ?? '';
  let place = cleanFacility(beforeCell);
  if (!place || /^(address|location|stop|\d+|pickup|delivery)$/i.test(place)) {
    place = '';
    for (let back = lineIndex; back >= Math.max(0, lineIndex - 3) && !place; back -= 1) {
      const labelled = lines[back].match(FACILITY_LABEL);
      if (labelled) place = cleanFacility(labelled[2]);
    }
  }

  // Appointment: rest of this line, then the following lines up to the next stop.
  let at: string | null = findDateTime(line.slice(start + match[0].length));
  for (let next = lineIndex + 1; !at && next < Math.min(nextStopLine, lineIndex + 4); next += 1) {
    at = findDateTime(lines[next]);
  }

  return {
    place,
    city: match[2].trim(),
    state: match[3],
    at: at ?? '',
  };
}

/** Reads load details out of the text lines of a rate confirmation. */
export function parseRateCon(lines: string[]): ParsedRateCon {
  const clean = lines.map((line) => line.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const flat = clean.join(' ');
  const draft: LoadDraft = { ...emptyDraft };
  const warnings: string[] = [];

  // Broker / customer: the letterhead line.
  const head = clean.find((line) => !/confirmation|^page\b/i.test(line));
  if (head) draft.customer = titleCase(head.split(' | ')[0]);

  const mcMatches = [...flat.matchAll(/\bMC\s*[#-]?\s*:?\s*(\d{5,7})\b/gi)].map((m) => m[1]);
  draft.brokerMc = mcMatches.find((mc) => mc !== OWN_MC) ?? '';

  draft.loadNumber =
    flat.match(/\b(?:Load|Order|Confirmation|Shipment|Pro)\s*(?:#|No\.?|Number)\s*:?\s*\|?\s*#?\s*([A-Z0-9][A-Z0-9-]{3,})/i)?.[1] ?? '';

  const rate =
    flat.match(/\bTotal(?: Carrier)? (?:Pay|Rate|Amount)\s*\|?\s*:?\s*\$\s*([\d,]+(?:\.\d{2})?)/i) ??
    flat.match(/\ball[- ]in rate(?: of)?\s*:?\s*\$\s*([\d,]+(?:\.\d{2})?)/i) ??
    flat.match(/\b(?:Rate|Line ?haul|Flat rate)\s*\|?\s*:?\s*\$\s*([\d,]+(?:\.\d{2})?)/i);
  if (rate) draft.rate = money(rate[1]);

  const equipment = flat.match(/\b(Dry Van|Reefer|Flatbed|Step ?Deck|Conestoga|Power Only|Box Truck|Hotshot)\b(?:\s*(\d{2})\s*['’]?)?/i);
  if (equipment) {
    const kind = equipment[1].replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
    draft.equipment = equipment[2] ? `${kind} ${equipment[2]}'` : kind;
  }

  const weight = flat.match(/\b(\d{1,3}(?:,\d{3})+|\d{4,6})\s*(?:lbs?|pounds)\b/i);
  if (weight) draft.weight = weight[1].replace(/,/g, '');

  const commodity = clean
    .map((line) => line.match(/\b(?:Commodity|Description|Freight)\s*[|:]\s*([^|]+)/i))
    .find(Boolean);
  if (commodity) {
    draft.commodity = commodity[1]
      .replace(/,?\s*\d{1,3}(?:,\d{3})*\s*lbs?\.?/i, '')
      .replace(/\.\s.*$/, '')
      .replace(/[.\s]+$/, '')
      .trim();
  }

  draft.poNumber =
    flat.match(/\b(?:PO|P\.O\.|Pickup|PU)\s*(?:#|No\.?|number)\s*:?\s*\|?\s*([A-Z0-9][A-Z0-9-]{2,})/i)?.[1] ?? '';

  draft.bol = flat.match(/\b(?:BOL|B\/L)\s*(?:#|No\.?)?\s*\|?\s*:?\s*([A-Z0-9][A-Z0-9-]{2,})/)?.[1] ?? '';

  const miles = flat.match(/\b(?:Miles|Distance)\s*\|?\s*:?\s*(\d{1,2},\d{3}|\d{2,4})\b/i);
  if (miles) draft.miles = miles[1].replace(/,/g, '');

  const contact = flat.match(/\b(?:[Cc]ontact|[Yy]our rep|[Rr]ep|[Aa]gent)\s*\|?\s*:?\s*([A-Z][a-z]+(?: [A-Z][a-z]+){1,2})/);
  if (contact) {
    draft.brokerContact = contact[1];
    const contactLine = clean.find((line) => line.includes(contact[1])) ?? '';
    draft.brokerPhone = contactLine.match(/\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}/)?.[0] ?? '';
    draft.brokerEmail = contactLine.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/)?.[0] ?? '';
  }

  // Stops: street addresses after the first pickup/shipper mention.
  const firstStopLine = clean.findIndex((line) => STOP_START.test(line));
  const stops: { lineIndex: number; match: RegExpMatchArray }[] = [];
  if (firstStopLine >= 0) {
    clean.forEach((line, lineIndex) => {
      if (lineIndex < firstStopLine || /logitrack/i.test(line)) return;
      const match = line.match(ADDRESS);
      if (match) stops.push({ lineIndex, match });
    });
  }

  if (stops.length >= 2) {
    const first = stops[0];
    const last = stops[stops.length - 1];
    const pickup = readStop(clean, first.lineIndex, first.match, stops[1].lineIndex);
    const delivery = readStop(clean, last.lineIndex, last.match, clean.length);
    draft.pickupPlace = pickup.place;
    draft.pickupCity = pickup.city;
    draft.pickupState = pickup.state;
    draft.pickupAt = pickup.at;
    draft.deliveryPlace = delivery.place;
    draft.deliveryCity = delivery.city;
    draft.deliveryState = delivery.state;
    draft.deliveryAt = delivery.at;
    if (stops.length > 2) {
      warnings.push(
        `This rate con has ${stops.length} stops. Only the first pickup and the last delivery were imported.`,
      );
    }
  } else if (stops.length === 1) {
    warnings.push('Only one stop address was found. Fill in the other stop by hand.');
  }

  const found = (Object.keys(draft) as (keyof LoadDraft)[]).filter(
    (key): key is RateConField => key !== 'status' && key !== 'driveHours' && draft[key] !== '',
  );

  const core: RateConField[] = ['rate', 'pickupCity', 'deliveryCity', 'loadNumber'];
  const unrecognized = core.filter((key) => found.includes(key)).length < 2;
  if (unrecognized) {
    // Guesses from a document we don't understand do more harm than good.
    return {
      draft: { ...emptyDraft },
      found: [],
      warnings: [
        "This file doesn't look like a rate confirmation we can read. Fill in the load by hand.",
      ],
      unrecognized,
    };
  }

  return { draft, found, warnings, unrecognized };
}
