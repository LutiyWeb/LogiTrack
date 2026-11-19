import {
  fleetRoster,
  draftToLoad,
  placeName,
  runLegs,
  SEED_NOW,
  type LoadDraft,
  type Run,
} from '../runs/seed';
import { seedDrivers } from '../drivers/drivers';
import type { DriverAvailability, FleetAsset } from './model';
import type { BookRateConPayload } from '../store/slices/runsSlice';

export const timeZones = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
] as const;
export function stopZone(city: string, state: string) {
  if (
    [
      'Nashville',
      'Bowling Green',
      'Memphis',
      'Joliet',
      'Chicago',
      'Dallas',
      'Houston',
    ].includes(city.trim())
  )
    return 'America/Chicago';
  if (['CA', 'WA', 'OR', 'NV'].includes(state.toUpperCase()))
    return 'America/Los_Angeles';
  if (['CO', 'MT', 'NM', 'WY', 'UT'].includes(state.toUpperCase()))
    return 'America/Denver';
  if (
    ['IL', 'TX', 'AL', 'AR', 'IA', 'LA', 'MN', 'MS', 'MO', 'OK', 'WI'].includes(
      state.toUpperCase(),
    )
  )
    return 'America/Chicago';
  return 'America/New_York';
}
function wallString(timestamp: number, zone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(timestamp)
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
/** Resolve explicit local appointments; reject nonexistent/ambiguous DST wall times. */
export function appointmentTime(value: string, zone: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const desired = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(desired)) return null;
  let time = desired;
  try {
    for (let i = 0; i < 3; i++)
      time += desired - Date.parse(`${wallString(time, zone)}:00Z`);
    if (
      wallString(time, zone) !== value ||
      wallString(time - 3600000, zone) === value ||
      wallString(time + 3600000, zone) === value
    )
      return null;
    return time;
  } catch {
    return null;
  }
}
const HOUR = 3600000;
/** Planning estimate only: 11h driving, 10h rest and a 30m break after 8h. ELD compliance is separate. */
function travel(start: number, hours: number, available: number) {
  let at = start;
  let left = Math.max(0, Math.min(11, available));
  let remaining = hours;
  let sinceBreak = 11 - left;
  while (remaining > 0) {
    if (left <= 0) {
      at += 10 * HOUR;
      left = 11;
      sinceBreak = 0;
    }
    if (sinceBreak >= 8) {
      at += 0.5 * HOUR;
      sinceBreak = 0;
    }
    const drive = Math.min(remaining, left, 8 - sinceBreak);
    at += drive * HOUR;
    remaining -= drive;
    left -= drive;
    sinceBreak += drive;
  }
  return { at, left };
}
export type AssignmentAssessment = {
  errors: string[];
  warnings: string[];
  readyAt: string | null;
  arrivalAt: string | null;
  deliveryAt: string | null;
  lateMinutes: number;
  trailer: FleetAsset | null;
  deadheadMiles: number | null;
};
export function assessAssignment(
  runs: Run[],
  assets: FleetAsset[],
  manualMiles: Record<string, number>,
  payload: BookRateConPayload,
  eld: DriverAvailability[] = [],
): AssignmentAssessment {
  const { target, draft } = payload;
  const result: AssignmentAssessment = {
    errors: [],
    warnings: [
      'Оцінка планування. 14-годинне вікно, тижневі ліміти та фактичний відпочинок потребують даних ELD.',
    ],
    readyAt: null,
    arrivalAt: null,
    deliveryAt: null,
    lateMinutes: 0,
    trailer: null,
    deadheadMiles: null,
  };
  const existing =
    target.kind === 'existing'
      ? runs.find((run) => run.id === target.runId)
      : undefined;
  const roster =
    target.kind === 'new'
      ? fleetRoster.find((item) => item.truck === target.truck)
      : undefined;
  const truck = existing?.truck ?? (target.kind === 'new' ? target.truck : '');
  const driverName =
    existing?.driver ?? (target.kind === 'new' ? target.driver : '');
  const driver = seedDrivers.find((item) => item.name === driverName);
  if (
    driver &&
    (driver.cdlExpires < draft.pickupAt.slice(0, 10) ||
      driver.medicalExpires < draft.pickupAt.slice(0, 10))
  )
    result.errors.push('Документи водія прострочені на дату завантаження.');
  const truckAsset = assets.find(
    (asset) => asset.kind === 'truck' && asset.number === truck,
  );
  if (
    truckAsset?.status === 'Maintenance' ||
    (truckAsset && truckAsset.inspectionDue < draft.pickupAt.slice(0, 10))
  )
    result.errors.push('Тягач на ремонті або прострочено огляд.');
  const requested = payload.trailerId ?? existing?.trailerId;
  const requirement = (draft.equipment ?? '').toLowerCase();
  const kind = /flatbed/.test(requirement)
    ? 'Flatbed'
    : /reefer|refrigerat/.test(requirement)
      ? 'Reefer'
      : 'Dry Van';
  const length = Number(requirement.match(/\b(\d{2})\s*(?:'|′|ft)/)?.[1] ?? 0);
  const compatible = (asset: FleetAsset) =>
    asset.kind === 'trailer' &&
    asset.status === 'Available' &&
    asset.equipment === kind &&
    (asset.lengthFeet ?? 0) >= length &&
    (asset.capacityLbs ?? 0) >= Number(draft.weight || 0) &&
    asset.inspectionDue >= draft.pickupAt.slice(0, 10) &&
    !runs.some(
      (run) =>
        run.id !== existing?.id &&
        run.status !== 'Completed' &&
        run.trailerId === asset.id,
    );
  result.trailer =
    assets.find(
      (asset) => (!requested || asset.id === requested) && compatible(asset),
    ) ?? null;
  if (!result.trailer)
    result.errors.push(
      'Немає вільного справного причепа потрібного типу, довжини та вантажності.',
    );
  const pickupZone =
    draft.pickupTimeZone || stopZone(draft.pickupCity, draft.pickupState);
  const deliveryZone =
    draft.deliveryTimeZone || stopZone(draft.deliveryCity, draft.deliveryState);
  const pickup = appointmentTime(draft.pickupAt, pickupZone);
  const delivery = appointmentTime(draft.deliveryAt, deliveryZone);
  const now = appointmentTime(SEED_NOW, 'America/New_York')!;
  if (pickup === null || delivery === null) {
    result.errors.push(
      'Вкажіть коректні час та часовий пояс завантаження й доставки.',
    );
    return result;
  }
  if (delivery <= pickup)
    result.errors.push(
      'Доставка має бути після завантаження з урахуванням часових поясів.',
    );
  const last = existing?.loads.at(-1);
  const previousDelivery = last
    ? appointmentTime(
        last.delivery.at,
        last.delivery.timeZone ||
          stopZone(last.delivery.city, last.delivery.state),
      )
    : null;
  let ready = Math.max(now, previousDelivery ?? now);
  let hours =
    existing?.drivingHoursLeft ??
    roster?.drivingHoursLeft ??
    (target.kind === 'new' ? target.drivingHoursLeft : 0);
  const availability = eld.find(
    (entry) =>
      entry.driver === driverName &&
      Date.parse(SEED_NOW) - Date.parse(entry.at) >= 0 &&
      Date.parse(SEED_NOW) - Date.parse(entry.at) <= 30 * 60000,
  );
  if (availability)
    hours = Math.min(
      availability.drivingHoursLeft,
      availability.windowHoursLeft,
    );
  if (!Number.isFinite(hours) || hours < 0) hours = 0;
  if (pickup - ready >= 10 * HOUR || hours === 0) {
    ready += 10 * HOUR;
    hours = 11;
  }
  result.readyAt = new Date(ready).toISOString();
  const preview: Run = existing
    ? {
        ...existing,
        loads: [...existing.loads, draftToLoad(draft, 'candidate')],
      }
    : {
        id: 'candidate',
        truck,
        driver: driverName,
        yardCity: 'Indianapolis',
        yardState: 'IN',
        status: 'Planned',
        drivingHoursLeft: hours,
        loads: [draftToLoad(draft, 'candidate')],
      };
  const legs = runLegs(preview, { ...manualMiles, ...payload.legMiles });
  const empty = legs[preview.loads.length - 1];
  result.deadheadMiles = empty?.miles ?? null;
  if (
    result.deadheadMiles === null ||
    !Number.isFinite(result.deadheadMiles) ||
    result.deadheadMiles < 0 ||
    result.deadheadMiles > 5000
  ) {
    result.errors.push(
      `Невідомий порожній пробіг до ${placeName(draft.pickupCity, draft.pickupState)}. Дочекайтеся розрахунку маршруту.`,
    );
    return result;
  }
  const arrival = travel(ready, result.deadheadMiles / 55, hours);
  result.arrivalAt = new Date(arrival.at).toISOString();
  const pickupEnd =
    draft.pickupWindow === 'fcfs'
      ? appointmentTime(draft.pickupWindowEnd ?? '', pickupZone)
      : pickup;
  if (pickupEnd === null || pickupEnd < pickup)
    result.errors.push('Для живої черги вкажіть кінець вікна завантаження.');
  const late = Math.max(0, arrival.at - (pickupEnd ?? pickup));
  result.lateMinutes = Math.ceil(late / 60000);
  if (late > 0)
    result.errors.push(
      `Запізнення на завантаження: ${result.lateMinutes} хв. Фіксоване вікно не може чекати.`,
    );
  const loadStart = Math.max(arrival.at, pickup) + 0.5 * HOUR;
  const loadedHours =
    Number(draft.driveHours) > 0
      ? Number(draft.driveHours)
      : Number(draft.miles) / 55;
  if (!Number.isFinite(loadedHours) || loadedHours <= 0 || loadedHours > 200) {
    result.errors.push(
      'Перевірте тривалість руху під вантажем (до 200 годин).',
    );
    return result;
  }
  if (
    availability &&
    result.deadheadMiles / 55 + loadedHours > availability.cycleHoursLeft
  )
    result.errors.push('За даними ELD недостатньо тижневого ліміту водіння.');
  const deliveryEta = travel(loadStart, loadedHours, arrival.left);
  result.deliveryAt = new Date(deliveryEta.at).toISOString();
  const deliveryEnd =
    draft.deliveryWindow === 'fcfs'
      ? appointmentTime(draft.deliveryWindowEnd ?? '', deliveryZone)
      : delivery;
  if (deliveryEnd === null || deliveryEnd < delivery)
    result.errors.push('Для живої черги вкажіть кінець вікна доставки.');
  if (deliveryEta.at > (deliveryEnd ?? delivery))
    result.errors.push(
      `Запізнення на доставку: ${Math.ceil((deliveryEta.at - (deliveryEnd ?? delivery)) / 60000)} хв.`,
    );
  return result;
}
export function appointmentSummary(timestamp: string | null, zone: string) {
  return timestamp
    ? `${wallString(Date.parse(timestamp), zone).replace('T', ' ')} · ${zone}`
    : '—';
}
export function draftFromLoad(load: ReturnType<typeof draftToLoad>): LoadDraft {
  return {
    customer: load.customer,
    rate: String(load.rate),
    pickupPlace: load.pickup.place,
    pickupCity: load.pickup.city,
    pickupState: load.pickup.state,
    pickupAt: load.pickup.at,
    deliveryPlace: load.delivery.place,
    deliveryCity: load.delivery.city,
    deliveryState: load.delivery.state,
    deliveryAt: load.delivery.at,
    miles: String(load.miles),
    driveHours: String(load.driveHours),
    bol: load.bol,
    commodity: load.commodity,
    status: load.status,
    equipment: load.equipment,
    weight: String(load.weightLbs ?? ''),
    pickupTimeZone: load.pickup.timeZone,
    deliveryTimeZone: load.delivery.timeZone,
  };
}
