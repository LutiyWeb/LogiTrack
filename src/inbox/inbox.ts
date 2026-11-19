import { extractPdfLines } from '../ratecon/pdfText';
import { parseRateCon, type RateConField } from '../ratecon/parseRateCon';
import { SEED_NOW, emptyDraft, type LoadDraft } from '../runs/seed';
import { draftChanges, sameLoad } from './identity';

export type InboxSource = 'email' | 'pdf' | 'manual';

/** Tentative — брокер предупредил заранее, груз ещё не подтверждён. */
export type InboxStatus =
  'Tentative' | 'New' | 'Ready' | 'Assigned' | 'Rejected';

/** Груз в очереди «Вхідні вантажі». */
export type InboxLoad = {
  id: string;
  source: InboxSource;
  status: InboxStatus;
  receivedAt: string;
  draft: LoadDraft;
  /** Поля, которые парсер нашёл в PDF (остальные подсвечиваются). */
  found: RateConField[];
  warnings: string[];
  unrecognized: boolean;
  fileName?: string;
  /** Путь к PDF-образцу в public/ (для стартовых писем). */
  fileUrl?: string;
  emailFrom?: string;
  runId?: string;
  sourceMessageId?: string;
  contentHash?: string;
  documentId?: string;
  revisions?: Omit<InboxLoad, 'revisions'>[];
};

/** PDF-образцы в public/samples — их «присылают» стартовые письма. Первым — тот, которого нет в очереди. */
export const sampleFiles = [
  { file: 'ratecon-prairie-route.pdf', from: 'rbaker@prairieroute.example' },
  { file: 'ratecon-crestline.pdf', from: 'jenna.collins@crestline.example' },
  { file: 'ratecon-northbound.pdf', from: 'mdiaz@northbound.example' },
];

export function sampleUrl(file: string) {
  return `${import.meta.env.BASE_URL}samples/${file}`;
}

/**
 * PDF загруженных вручную файлов живут только в памяти вкладки:
 * в localStorage их не кладём. После перезагрузки превью недоступно.
 */
export const pdfCache = new Map<string, ArrayBuffer>();

export async function loadInboxPdf(
  item: InboxLoad,
): Promise<ArrayBuffer | null> {
  const cached = pdfCache.get(item.documentId ?? item.id);
  if (cached) return cached;
  if (!item.fileUrl) return null;
  try {
    const response = await fetch(item.fileUrl);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Читает PDF и превращает его в груз очереди. */
export async function intakePdf(
  data: ArrayBuffer,
  meta: {
    fileName: string;
    source: InboxSource;
    fileUrl?: string;
    emailFrom?: string;
    sourceMessageId?: string;
  },
): Promise<InboxLoad> {
  const hash = await crypto.subtle.digest('SHA-256', data.slice(0));
  const contentHash = Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const result = await extractPdfLines(data)
    .then((lines) => parseRateCon(lines))
    .catch(() => parseRateCon([]));
  return {
    id: crypto.randomUUID(),
    contentHash,
    status: 'New',
    receivedAt: SEED_NOW,
    draft: result.draft,
    found: result.found,
    warnings: result.warnings,
    unrecognized: result.unrecognized,
    ...meta,
  };
}

/** Match a source message/document or a broker-scoped load identity. */
export function findDuplicate(
  items: InboxLoad[],
  candidate: InboxLoad,
  ignoreId?: string,
) {
  return items.find(
    (item) =>
      item.id !== ignoreId &&
      ((candidate.sourceMessageId &&
        item.sourceMessageId === candidate.sourceMessageId) ||
        (candidate.contentHash && item.contentHash === candidate.contentHash) ||
        sameLoad(item.draft, candidate.draft)),
  );
}

/** Preserve an assigned canonical item and keep changed imports as reviewable revisions. */
export function dedupeInboxItems(items: InboxLoad[]) {
  const result: InboxLoad[] = [];
  for (const source of [...items].sort(
    (a, b) => Number(b.status === 'Assigned') - Number(a.status === 'Assigned'),
  )) {
    const item = structuredClone(source);
    const existing = findDuplicate(result, item);
    if (!existing) {
      result.push(item);
      continue;
    }
    if (draftChanges(existing.draft, item.draft).length) {
      existing.revisions ??= [];
      const { revisions: _revisions, ...revision } = item;
      existing.revisions.push(revision);
    }
  }
  return result;
}

export function emptyManualLoad(): InboxLoad {
  return {
    id: crypto.randomUUID(),
    source: 'manual',
    status: 'New',
    receivedAt: SEED_NOW,
    draft: { ...emptyDraft },
    found: [],
    warnings: [],
    unrecognized: false,
  };
}

const crestlineFound: RateConField[] = [
  'customer',
  'rate',
  'pickupPlace',
  'pickupCity',
  'pickupState',
  'pickupAt',
  'deliveryPlace',
  'deliveryCity',
  'deliveryState',
  'deliveryAt',
  'miles',
  'bol',
  'commodity',
  'loadNumber',
  'poNumber',
  'equipment',
  'weight',
  'brokerMc',
  'brokerContact',
  'brokerPhone',
  'brokerEmail',
  'pickupAddress',
  'pickupZip',
  'deliveryAddress',
  'deliveryZip',
];

/** Стартовое состояние очереди. */
export const seedInbox: InboxLoad[] = [
  {
    id: 'inbox-crestline',
    source: 'email',
    status: 'New',
    receivedAt: '2026-10-28T13:42',
    fileName: 'ratecon-crestline.pdf',
    fileUrl: sampleUrl('ratecon-crestline.pdf'),
    emailFrom: 'jenna.collins@crestline.example',
    found: crestlineFound,
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Crestline Freight Brokerage',
      rate: '1850',
      pickupPlace: 'Ohio Valley Paper Mill',
      pickupAddress: '4100 Bells Ln',
      pickupCity: 'Louisville',
      pickupState: 'KY',
      pickupZip: '40211',
      pickupAt: '2026-10-30T08:00',
      deliveryPlace: 'Delta Distribution Center',
      deliveryAddress: '3050 Democrat Rd',
      deliveryCity: 'Memphis',
      deliveryState: 'TN',
      deliveryZip: '38118',
      deliveryAt: '2026-10-31T07:00',
      miles: '385',
      bol: 'OV-77310',
      commodity: 'Packaged paper goods',
      loadNumber: 'CFB-240917',
      poNumber: 'PU-55821',
      equipment: "Dry Van 53'",
      weight: '38500',
      brokerMc: '718244',
      brokerContact: 'Jenna Collins',
      brokerPhone: '(615) 555-0142',
      brokerEmail: 'jenna.collins@crestline.example',
    },
  },
  {
    id: 'inbox-northbound',
    source: 'email',
    status: 'New',
    receivedAt: '2026-10-28T14:05',
    fileName: 'ratecon-northbound.pdf',
    fileUrl: sampleUrl('ratecon-northbound.pdf'),
    emailFrom: 'mdiaz@northbound.example',
    // Миль и ТТН в этом PDF нет — их подсветит форма проверки.
    found: [
      ...crestlineFound.filter((key) => key !== 'miles' && key !== 'bol'),
      'specialInstructions',
    ],
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Northbound Logistics Group',
      rate: '2450',
      pickupPlace: 'Gem City Cold Storage',
      pickupAddress: '400 Webster St',
      pickupCity: 'Dayton',
      pickupState: 'OH',
      pickupZip: '45402',
      pickupAt: '2026-10-30T06:00',
      deliveryPlace: 'Queen City Grocers DC',
      deliveryAddress: '8800 Statesville Rd',
      deliveryCity: 'Charlotte',
      deliveryState: 'NC',
      deliveryZip: '28269',
      deliveryAt: '2026-10-31T09:00',
      commodity: 'Frozen bakery goods, keep at -10F',
      specialInstructions: 'Temperature: -10F continuous',
      loadNumber: 'NLG-88214',
      poNumber: '4410-QC',
      equipment: "Reefer 53'",
      weight: '42000',
      brokerMc: '603917',
      brokerContact: 'Marco Diaz',
      brokerPhone: '216-555-0187',
      brokerEmail: 'mdiaz@northbound.example',
    },
  },
  // Предварительные грузы: брокеры предупредили заранее.
  {
    id: 'plan-arizona',
    source: 'manual',
    status: 'Tentative',
    receivedAt: '2026-10-27T16:10',
    found: [],
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Crestline Freight Brokerage',
      rate: '4800',
      pickupCity: 'Phoenix',
      pickupState: 'AZ',
      pickupAt: '2026-11-11T08:00',
      deliveryCity: 'New York',
      deliveryState: 'NY',
      commodity: 'Сонячні панелі',
    },
  },
  {
    id: 'plan-texas',
    source: 'manual',
    status: 'Tentative',
    receivedAt: '2026-10-26T10:30',
    found: [],
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Blue Ridge Logistics',
      pickupCity: 'Dallas',
      pickupState: 'TX',
      pickupAt: '2026-11-05T07:00',
      deliveryCity: 'Atlanta',
      deliveryState: 'GA',
      commodity: 'Будматеріали',
    },
  },
  {
    id: 'plan-newjersey',
    source: 'manual',
    status: 'Tentative',
    receivedAt: '2026-10-28T09:15',
    found: [],
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Northbound Logistics Group',
      rate: '2300',
      pickupCity: 'Newark',
      pickupState: 'NJ',
      pickupAt: '2026-11-03T06:00',
      deliveryCity: 'Columbus',
      deliveryState: 'OH',
      commodity: 'Продукти, рефрижератор',
    },
  },
  {
    id: 'inbox-phone',
    source: 'manual',
    status: 'Ready',
    receivedAt: '2026-10-28T11:20',
    found: [],
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Midwest Steel Co.',
      rate: '980',
      pickupPlace: 'Northside Foundry',
      pickupCity: 'Fort Wayne',
      pickupState: 'IN',
      pickupAt: '2026-10-30T07:00',
      deliveryPlace: 'Miami Valley Works',
      deliveryCity: 'Dayton',
      deliveryState: 'OH',
      deliveryAt: '2026-10-30T11:30',
      miles: '115',
      driveHours: '2.5',
      commodity: 'Сталеві листи',
    },
  },
];
