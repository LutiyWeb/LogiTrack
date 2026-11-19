import { facilitiesFromRuns, type Facility } from './facilities';
import { fleetRoster, SEED_NOW } from '../runs/seed';

export type Equipment = 'Dry Van' | 'Reefer' | 'Flatbed';
export type FleetAsset = {
  id: string;
  kind: 'truck' | 'trailer';
  number: string;
  status: 'Available' | 'Maintenance';
  equipment?: Equipment;
  lengthFeet?: number;
  capacityLbs?: number;
  trailerId?: string;
  inspectionDue: string;
  serviceNote: string;
};
export type LoadDocument = {
  id: string;
  runId: string;
  loadId: string;
  kind: 'POD' | 'RateCon' | 'Other';
  name: string;
  storage?: 'server' | 'local';
  mime: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  url?: string;
  reviewedAt?: string;
  reviewedBy?: string;
};
export type DetentionClaim = {
  id: string;
  runId: string;
  loadId: string;
  arrivalAt: string;
  departedAt: string;
  freeMinutes: number;
  ratePerHour: number;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdBy: string;
  clientReference?: string;
  reviewedBy?: string;
  amountCents: number;
};
export type LoadMessage = {
  id: string;
  runId: string;
  loadId: string;
  author: string;
  at: string;
  text: string;
};
export const inspectionChecks = [
  'Гальма',
  'Кермове управління',
  'Шини',
  'Колеса',
  'Фари',
  'Поворотники',
  'Дзеркала',
  'Склоочисники',
  'Зчіпка',
  'Ремені',
  'Сигнал',
  'Витоки',
  'Кузов / причіп',
] as const;
export type Inspection = {
  id: string;
  assetId: string;
  at: string;
  driver: string;
  checks: Record<string, boolean>;
  defects: string;
  photoIds: string[];
  photos?: {
    id: string;
    name: string;
    mime: string;
    storage: 'server' | 'local';
  }[];
  resolvedBy?: string;
  resolution?: string;
};
export type FuelPurchase = {
  id: string;
  truck: string;
  date: string;
  state: string;
  gallons: number;
  amountCents: number;
  source: string;
};
export type StateMileage = {
  id: string;
  truck: string;
  month: string;
  state: string;
  miles: number;
  source: string;
};
export type IntegrationEvent = {
  id: string;
  source: string;
  kind: string;
  at: string;
  status: 'Applied' | 'Rejected';
  count: number;
  detail: string;
};
export type DriverAdjustment = {
  id: string;
  driver: string;
  amountCents: number;
  reason: string;
  date: string;
  approvedBy: string;
};
export type DriverAvailability = {
  driver: string;
  drivingHoursLeft: number;
  windowHoursLeft: number;
  cycleHoursLeft: number;
  at: string;
  source: string;
};
export type OperationsState = {
  eld: DriverAvailability[];
  facilities: Facility[];
  assets: FleetAsset[];
  documents: LoadDocument[];
  detention: DetentionClaim[];
  messages: LoadMessage[];
  inspections: Inspection[];
  fuel: FuelPurchase[];
  stateMileage: StateMileage[];
  integrations: IntegrationEvent[];
  adjustments: DriverAdjustment[];
};
export function createInitialOperationsState(): OperationsState {
  const trailers: FleetAsset[] = [
    {
      id: 'trailer-dv1',
      kind: 'trailer',
      number: 'DV-101',
      status: 'Available',
      equipment: 'Dry Van',
      lengthFeet: 53,
      capacityLbs: 45000,
      inspectionDue: '2026-12-31',
      serviceNote: '',
    },
    {
      id: 'trailer-dv2',
      kind: 'trailer',
      number: 'DV-102',
      status: 'Available',
      equipment: 'Dry Van',
      lengthFeet: 53,
      capacityLbs: 45000,
      inspectionDue: '2026-12-31',
      serviceNote: '',
    },
    {
      id: 'trailer-flat',
      kind: 'trailer',
      number: 'FB-201',
      status: 'Available',
      equipment: 'Flatbed',
      lengthFeet: 48,
      capacityLbs: 48000,
      inspectionDue: '2026-12-31',
      serviceNote: '',
    },
    {
      id: 'trailer-reefer',
      kind: 'trailer',
      number: 'RF-301',
      status: 'Available',
      equipment: 'Reefer',
      lengthFeet: 53,
      capacityLbs: 43000,
      inspectionDue: '2026-12-31',
      serviceNote: '',
    },
  ];
  return {
    assets: [
      ...fleetRoster.map((roster, index): FleetAsset => ({
        id: `truck-${roster.truck.replace(/\D/g, '')}`,
        kind: 'truck',
        number: roster.truck,
        status: 'Available',
        trailerId: index < 2 ? `trailer-dv${index + 1}` : undefined,
        inspectionDue: '2026-12-31',
        serviceNote: '',
      })),
      ...trailers,
    ],
    documents: [
      {
        id: 'pod-hart',
        runId: '214',
        loadId: 'hart',
        kind: 'POD',
        name: 'POD-Hart-demo.svg',
        mime: 'image/svg+xml',
        size: 0,
        uploadedAt: '2026-10-28T14:15',
        uploadedBy: 'Marcus Hill',
        url: '/samples/pod-hart-demo.svg',
      },
      {
        id: 'pod-apex',
        runId: '305',
        loadId: '305-load-1',
        kind: 'POD',
        name: 'POD-Apex-demo.svg',
        mime: 'image/svg+xml',
        size: 0,
        uploadedAt: '2026-10-27T17:10',
        uploadedBy: 'Elena Rostova',
        reviewedAt: '2026-10-27T17:30',
        reviewedBy: 'Sarah Jenkins',
        url: '/samples/pod-apex-demo.svg',
      },
      {
        id: 'pod-bluegrass',
        runId: '107',
        loadId: '107-load',
        kind: 'POD',
        name: 'POD-Bluegrass-demo.svg',
        mime: 'image/svg+xml',
        size: 0,
        uploadedAt: '2026-10-26T13:15',
        uploadedBy: 'Luis Ortega',
        reviewedAt: '2026-10-26T14:00',
        reviewedBy: 'Sarah Jenkins',
        url: '/samples/pod-bluegrass-demo.svg',
      },
    ],
    facilities: facilitiesFromRuns(),
    eld: [],
    detention: [],
    messages: [],
    inspections: [],
    fuel: [],
    stateMileage: [],
    integrations: [],
    adjustments: [],
  };
}
export function detentionAmount(
  arrivalAt: string,
  departedAt: string,
  freeMinutes: number,
  ratePerHour: number,
) {
  const minutes = (Date.parse(departedAt) - Date.parse(arrivalAt)) / 60000;
  if (
    !arrivalAt ||
    !departedAt ||
    !Number.isFinite(minutes) ||
    minutes <= 0 ||
    minutes > 72 * 60 ||
    Date.parse(departedAt) > Date.parse(SEED_NOW)
  )
    return null;
  if (
    !Number.isInteger(freeMinutes) ||
    freeMinutes < 0 ||
    freeMinutes > 24 * 60 ||
    !Number.isFinite(ratePerHour) ||
    ratePerHour <= 0 ||
    ratePerHour > 1000
  )
    return null;
  return Math.round(
    ((Math.max(0, minutes - freeMinutes) * ratePerHour) / 60) * 100,
  );
}
