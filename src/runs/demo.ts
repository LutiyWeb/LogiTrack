export type RunStatus = 'Planned' | 'In transit' | 'Completed';

export type LoadStatus = 'Assigned' | 'At pickup' | 'In transit' | 'Delivered';

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
};

export type Leg = {
  from: string;
  to: string;
  miles: number | null;
};

export const loadStatuses: LoadStatus[] = [
  'Assigned',
  'At pickup',
  'In transit',
  'Delivered',
];

export const backhaulPreset = {
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
  status: 'Assigned' as LoadStatus,
};

const emptyMiles: Record<string, number> = {
  'Indianapolis, IN|Joliet, IL': 180,
  'Atlanta, GA|Indianapolis, IN': 530,
  'Atlanta, GA|Marietta, GA': 20,
  'Greenwood, IN|Indianapolis, IN': 15,
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
    drivingHoursLeft: null,
    loads: [
      {
        id: '118-load',
        customer: '',
        rate: 0,
        pickup: { place: '', city: 'Fort Wayne', state: 'IN', at: '' },
        delivery: { place: '', city: 'Columbus', state: 'OH', at: '' },
        miles: 0,
        driveHours: 0,
        bol: '',
        commodity: '',
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
    drivingHoursLeft: null,
    loads: [
      {
        id: '107-load',
        customer: '',
        rate: 0,
        pickup: { place: '', city: 'Louisville', state: 'KY', at: '' },
        delivery: { place: '', city: 'Indianapolis', state: 'IN', at: '' },
        miles: 0,
        driveHours: 0,
        bol: '',
        commodity: '',
        status: 'Delivered',
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
