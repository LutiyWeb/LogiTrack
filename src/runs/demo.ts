export type RunStatus = 'Planned' | 'In transit' | 'Completed';

export type LoadStatus = 'Assigned' | 'At pickup' | 'In transit' | 'Delivered';

export type BillingStatus = 'POD required' | 'POD received' | 'Invoiced';

export type DispatchNote = {
  id: string;
  author: string;
  roleTitle: string;
  at: string;
  text: string;
};

export type Stop = {
  place: string;
  city: string;
  state: string;
  at: string;
};

export type Load = {
  id: string;
  customer: string;
  rate: number;
  pickup: Stop;
  delivery: Stop;
  miles: number;
  driveHours: number;
  bol: string;
  commodity: string;
  status: LoadStatus;
  billingStatus?: BillingStatus;
};

export type Run = {
  id: string;
  truck: string;
  driver: string;
  yardCity: string;
  yardState: string;
  status: RunStatus;
  drivingHoursLeft: number | null;
  loads: Load[];
  notes?: DispatchNote[];
};

export type Leg = {
  from: string;
  to: string;
  miles: number | null;
};

export type RouteStep = {
  id: string;
  kind: 'empty' | 'paid';
  from: string;
  to: string;
  miles: number | null;
  label: string;
  customer?: string;
  rate?: number;
};

export type LoadDraft = {
  customer: string;
  rate: string;
  pickupPlace: string;
  pickupCity: string;
  pickupState: string;
  pickupAt: string;
  deliveryPlace: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryAt: string;
  miles: string;
  driveHours: string;
  bol: string;
  commodity: string;
  status: LoadStatus;
};

export type BackhaulOffer = {
  id: string;
  tag: string;
  tone: 'recommended' | 'warning' | 'muted';
  summary: string;
  draft: LoadDraft;
};

export const runStatuses: RunStatus[] = ['Planned', 'In transit', 'Completed'];

export const loadStatuses: LoadStatus[] = [
  'Assigned',
  'At pickup',
  'In transit',
  'Delivered',
];

export const emptyDraft: LoadDraft = {
  customer: '',
  rate: '',
  pickupPlace: '',
  pickupCity: '',
  pickupState: '',
  pickupAt: '',
  deliveryPlace: '',
  deliveryCity: '',
  deliveryState: '',
  deliveryAt: '',
  miles: '',
  driveHours: '',
  bol: '',
  commodity: '',
  status: 'Assigned',
};

export const backhaulPreset: LoadDraft = {
  customer: 'Blue Ridge Logistics',
  rate: '2100',
  pickupPlace: 'Piedmont Yard',
  pickupCity: 'Marietta',
  pickupState: 'GA',
  pickupAt: '2026-10-29T08:00',
  deliveryPlace: 'Greenwood Distribution',
  deliveryCity: 'Greenwood',
  deliveryState: 'IN',
  deliveryAt: '2026-10-29T18:00',
  miles: '490',
  driveHours: '9',
  bol: '90214',
  commodity: 'Packaged beverages',
  status: 'Assigned',
};

export const backhaulOffers: BackhaulOffer[] = [
  {
    id: 'blue-ridge',
    tag: 'Best backhaul match',
    tone: 'recommended',
    summary:
      '20 mi deadhead from Atlanta, delivers 15 mi from Indianapolis yard. Morning pickup waits for 10 h reset.',
    draft: backhaulPreset,
  },
  {
    id: 'southern-express',
    tag: 'HOS conflict · Urgent pickup',
    tone: 'warning',
    summary:
      'Pickup today at 5:00 PM does not wait for required 10 h off-duty reset after 3.5 h remaining shift.',
    draft: {
      customer: 'Southern Express Brokerage',
      rate: '1950',
      pickupPlace: 'Southgate Cold Storage',
      pickupCity: 'Forest Park',
      pickupState: 'GA',
      pickupAt: '2026-10-28T17:00',
      deliveryPlace: 'Riverport Hub',
      deliveryCity: 'Louisville',
      deliveryState: 'KY',
      deliveryAt: '2026-10-29T06:00',
      miles: '420',
      driveHours: '7.5',
      bol: '77410',
      commodity: 'Refrigerated produce',
      status: 'Assigned',
    },
  },
  {
    id: 'delta-freight',
    tag: 'High deadhead · Low $/mi',
    tone: 'muted',
    summary:
      '85 mi empty south to Macon plus 170 mi empty return from Effingham keeps total $/mi low.',
    draft: {
      customer: 'Delta Freight Partners',
      rate: '1250',
      pickupPlace: 'Central Georgia Mill',
      pickupCity: 'Macon',
      pickupState: 'GA',
      pickupAt: '2026-10-29T09:00',
      deliveryPlace: 'Crossroads Terminal',
      deliveryCity: 'Effingham',
      deliveryState: 'IL',
      deliveryAt: '2026-10-29T20:00',
      miles: '560',
      driveHours: '10',
      bol: '61309',
      commodity: 'Paper rolls',
      status: 'Assigned',
    },
  },
];

const emptyMiles: Record<string, number> = {
  'Indianapolis, IN|Joliet, IL': 180,
  'Atlanta, GA|Indianapolis, IN': 530,
  'Atlanta, GA|Marietta, GA': 20,
  'Greenwood, IN|Indianapolis, IN': 15,
  'Atlanta, GA|Forest Park, GA': 12,
  'Louisville, KY|Indianapolis, IN': 115,
  'Atlanta, GA|Macon, GA': 85,
  'Effingham, IL|Indianapolis, IN': 170,
  'Indianapolis, IN|Fort Wayne, IN': 125,
  'Columbus, OH|Indianapolis, IN': 175,
  'Indianapolis, IN|Louisville, KY': 115,
  'Indianapolis, IN|Cincinnati, OH': 110,
  'Nashville, TN|Bowling Green, KY': 65,
};

const demoNow = new Date('2026-10-28T15:00:00');

export const runs: Run[] = [
  {
    id: '214',
    truck: 'Truck 214',
    driver: 'Marcus Hill',
    yardCity: 'Indianapolis',
    yardState: 'IN',
    status: 'In transit',
    drivingHoursLeft: 3.5,
    loads: [
      {
        id: 'hart',
        customer: 'Hart Freight',
        rate: 3200,
        pickup: {
          place: 'Midwest DC',
          city: 'Joliet',
          state: 'IL',
          at: '2026-10-27T08:00',
        },
        delivery: {
          place: 'South Park Warehouse',
          city: 'Atlanta',
          state: 'GA',
          at: '2026-10-28T14:00',
        },
        miles: 700,
        driveHours: 12,
        bol: '44821',
        commodity: 'Palletized auto parts',
        status: 'Delivered',
        billingStatus: 'POD required',
      },
    ],
    notes: [
      {
        id: 'n1',
        author: 'Marcus Hill',
        roleTitle: 'Driver · Truck 214',
        at: 'Oct 28, 2:15 PM',
        text: 'Unloaded at South Park Warehouse (Atlanta, GA). 3.5 h driving shift remaining.',
      },
      {
        id: 'n2',
        author: 'Alex Mercer',
        roleTitle: 'Senior Fleet Dispatcher',
        at: 'Oct 28, 2:30 PM',
        text: 'Checking Atlanta backhaul offers that allow a 10 h overnight reset.',
      },
    ],
  },
  {
    id: '118',
    truck: 'Truck 118',
    driver: 'Dana Brooks',
    yardCity: 'Indianapolis',
    yardState: 'IN',
    status: 'Planned',
    drivingHoursLeft: 8.0,
    loads: [
      {
        id: '118-load',
        customer: 'Midwest Steel Co.',
        rate: 1450,
        pickup: {
          place: 'Northside Foundry',
          city: 'Fort Wayne',
          state: 'IN',
          at: '2026-10-29T07:30',
        },
        delivery: {
          place: 'Buckeye Stamping Plant',
          city: 'Columbus',
          state: 'OH',
          at: '2026-10-29T12:30',
        },
        miles: 160,
        driveHours: 3.5,
        bol: '31904',
        commodity: 'Steel coils',
        status: 'Assigned',
      },
    ],
  },
  {
    id: '107',
    truck: 'Truck 107',
    driver: 'Luis Ortega',
    yardCity: 'Indianapolis',
    yardState: 'IN',
    status: 'Completed',
    drivingHoursLeft: 6.0,
    loads: [
      {
        id: '107-load',
        customer: 'Bluegrass Retail',
        rate: 950,
        pickup: {
          place: 'Derby Fulfillment Center',
          city: 'Louisville',
          state: 'KY',
          at: '2026-10-26T09:00',
        },
        delivery: {
          place: 'Circle City Depot',
          city: 'Indianapolis',
          state: 'IN',
          at: '2026-10-26T13:00',
        },
        miles: 115,
        driveHours: 2.5,
        bol: '18452',
        commodity: 'Consumer electronics',
        status: 'Delivered',
        billingStatus: 'Invoiced',
      },
    ],
  },
  {
    id: '305',
    truck: 'Truck 305',
    driver: 'Elena Rostova',
    yardCity: 'Indianapolis',
    yardState: 'IN',
    status: 'In transit',
    drivingHoursLeft: 5.5,
    loads: [
      {
        id: '305-load-1',
        customer: 'Apex Industrial',
        rate: 1650,
        pickup: {
          place: 'Queen City Logistics Park',
          city: 'Cincinnati',
          state: 'OH',
          at: '2026-10-27T10:00',
        },
        delivery: {
          place: 'Cumberland Freight Yard',
          city: 'Nashville',
          state: 'TN',
          at: '2026-10-27T17:00',
        },
        miles: 290,
        driveHours: 5,
        bol: '55120',
        commodity: 'HVAC equipment',
        status: 'Delivered',
        billingStatus: 'POD received',
      },
      {
        id: '305-load-2',
        customer: 'Heartland Foods',
        rate: 1400,
        pickup: {
          place: 'Valley Packaging',
          city: 'Bowling Green',
          state: 'KY',
          at: '2026-10-28T09:00',
        },
        delivery: {
          place: 'Crossroads Cold Hub',
          city: 'Indianapolis',
          state: 'IN',
          at: '2026-10-28T15:30',
        },
        miles: 225,
        driveHours: 4,
        bol: '55892',
        commodity: 'Dry grocery goods',
        status: 'In transit',
      },
    ],
  },
];

export function placeName(city: string, state: string) {
  return `${city}, ${state}`;
}

export function stopName(stop: Stop) {
  return placeName(stop.city, stop.state);
}

function legKey(from: string, to: string) {
  return `${from}|${to}`;
}

export function runLegs(run: Run, manual: Record<string, number>): Leg[] {
  if (run.loads.length === 0) return [];

  const yard = placeName(run.yardCity, run.yardState);
  const pairs = [
    { from: yard, to: stopName(run.loads[0].pickup) },
    ...run.loads.slice(1).map((load, index) => ({
      from: stopName(run.loads[index].delivery),
      to: stopName(load.pickup),
    })),
    {
      from: stopName(run.loads[run.loads.length - 1].delivery),
      to: yard,
    },
  ];

  return pairs.map((pair) => ({
    ...pair,
    miles: legMiles(pair.from, pair.to, manual),
  }));
}

function legMiles(from: string, to: string, manual: Record<string, number>) {
  if (from === to) return 0;

  const known = emptyMiles[legKey(from, to)];
  if (known !== undefined) return known;

  return manual[legKey(from, to)] ?? null;
}

export function emptyLegKey(from: string, to: string) {
  return legKey(from, to);
}

export function isKnownEmptyLeg(from: string, to: string) {
  return from === to || emptyMiles[legKey(from, to)] !== undefined;
}

export function paidMiles(run: Run) {
  return run.loads.reduce((sum, load) => sum + load.miles, 0);
}

export function revenue(run: Run) {
  return run.loads.reduce((sum, load) => sum + load.rate, 0);
}

export function emptyMilesTotal(legs: Leg[]) {
  if (legs.some((leg) => leg.miles === null)) return null;
  return legs.reduce((sum, leg) => sum + (leg.miles ?? 0), 0);
}

export function dollarsPerMile(run: Run, legs: Leg[]) {
  const empty = emptyMilesTotal(legs);
  if (empty === null) return null;

  const miles = paidMiles(run) + empty;
  if (miles <= 0) return null;

  return Math.round((revenue(run) / miles) * 100) / 100;
}

export function shiftNote(run: Run, load: Load) {
  if (load.status === 'Delivered' || run.drivingHoursLeft === null) return '';
  if (load.driveHours <= run.drivingHoursLeft) return '';

  const resumeAt =
    demoNow.getTime() + (run.drivingHoursLeft + 10) * 60 * 60 * 1000;
  const pickupAt = load.pickup.at ? new Date(load.pickup.at).getTime() : NaN;
  const pickupWaits = Number.isFinite(pickupAt) && pickupAt >= resumeAt;
  const waitLine = pickupWaits
    ? 'The pickup can wait, so the load stays.'
    : 'The pickup does not wait, so this load drops off.';

  return `This leg is ${formatHours(load.driveHours)}. ${formatHours(run.drivingHoursLeft)} left in this shift. He drives the remaining hours, then needs 10 h off before hours start again. A 30-minute break does not restore hours. ${waitLine}`;
}

export function draftToLoad(draft: LoadDraft, id = 'preview'): Load {
  return {
    id,
    customer: draft.customer.trim(),
    rate: readNumber(draft.rate),
    pickup: {
      place: draft.pickupPlace.trim(),
      city: draft.pickupCity.trim(),
      state: draft.pickupState.trim().toUpperCase(),
      at: draft.pickupAt,
    },
    delivery: {
      place: draft.deliveryPlace.trim(),
      city: draft.deliveryCity.trim(),
      state: draft.deliveryState.trim().toUpperCase(),
      at: draft.deliveryAt,
    },
    miles: readNumber(draft.miles),
    driveHours: readNumber(draft.driveHours),
    bol: draft.bol.trim(),
    commodity: draft.commodity.trim(),
    status: draft.status,
  };
}

export function previewOfferMetrics(
  run: Run,
  offer: BackhaulOffer,
  manual: Record<string, number>,
) {
  const candidateLoad = draftToLoad(offer.draft, offer.id);
  const simulatedRun: Run = {
    ...run,
    loads: [...run.loads, candidateLoad],
  };
  const legs = runLegs(simulatedRun, manual);
  return {
    emptyMiles: emptyMilesTotal(legs),
    perMile: dollarsPerMile(simulatedRun, legs),
    totalRevenue: revenue(simulatedRun),
    hosNote: shiftNote(simulatedRun, candidateLoad),
  };
}

export function routeTimeline(
  run: Run,
  manual: Record<string, number>,
): RouteStep[] {
  if (run.loads.length === 0) return [];
  const legs = runLegs(run, manual);
  const steps: RouteStep[] = [];

  run.loads.forEach((load, index) => {
    const beforeLeg = legs[index];
    if (beforeLeg) {
      steps.push({
        id: `empty-${index}-${beforeLeg.from}-${beforeLeg.to}`,
        kind: 'empty',
        from: beforeLeg.from,
        to: beforeLeg.to,
        miles: beforeLeg.miles,
        label: index === 0 ? 'Deadhead from yard' : 'Repositioning empty leg',
      });
    }

    steps.push({
      id: `paid-${load.id}`,
      kind: 'paid',
      from: stopName(load.pickup),
      to: stopName(load.delivery),
      miles: load.miles,
      label: load.commodity || 'Loaded freight leg',
      customer: load.customer,
      rate: load.rate,
    });
  });

  const returnLeg = legs[legs.length - 1];
  if (returnLeg) {
    steps.push({
      id: `empty-return-${returnLeg.from}-${returnLeg.to}`,
      kind: 'empty',
      from: returnLeg.from,
      to: returnLeg.to,
      miles: returnLeg.miles,
      label: 'Return to home yard',
    });
  }

  return steps;
}

export function readNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatHours(value: number) {
  return `${value} h`;
}

export function formatMoney(value: number, digits: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatMiles(value: number) {
  return `${new Intl.NumberFormat('en-US').format(value)} mi`;
}

export function formatWhen(value: string) {
  if (!value) return '';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export function lane(run: Run) {
  if (run.loads.length === 0) return placeName(run.yardCity, run.yardState);

  const first = run.loads[0].pickup;
  const last = run.loads[run.loads.length - 1].delivery;
  return `${placeName(first.city, first.state)} → ${placeName(last.city, last.state)}`;
}
