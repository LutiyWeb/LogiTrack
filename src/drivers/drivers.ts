import { t } from '../i18n';
import { SEED_NOW, fleetRoster } from '../runs/seed';
import type { EnrichedRun } from '../store/selectors/runsSelectors';

export type Driver = {
  name: string;
  phone: string;
  truck: string;
  cdlNumber: string;
  /** Срок прав CDL, YYYY-MM-DD. */
  cdlExpires: string;
  /** Срок медсправки, YYYY-MM-DD. */
  medicalExpires: string;
  /** Когда закончился последний рейс (для простоя), если сейчас без рейса. */
  lastRunEnded?: string;
};

export type DriverStatus = 'Free' | 'OnRun' | 'Resting' | 'DocsExpired';

export type PayoutRecord = {
  driver: string;
  week: string;
  miles: number;
  amount: number;
};

/** Текущая неделя выплат. */
export const CURRENT_WEEK = '26 жовт. – 1 лист.';

export const seedDrivers: Driver[] = [
  { name: 'Marcus Hill', phone: '(317) 555-0114', truck: 'Тягач 214', cdlNumber: 'IN-4829103', cdlExpires: '2028-03-14', medicalExpires: '2027-01-20' },
  { name: 'Dana Brooks', phone: '(317) 555-0162', truck: 'Тягач 118', cdlNumber: 'IN-5531872', cdlExpires: '2027-08-02', medicalExpires: '2026-11-10' },
  { name: 'Luis Ortega', phone: '(317) 555-0139', truck: 'Тягач 107', cdlNumber: 'IN-3376021', cdlExpires: '2029-05-30', medicalExpires: '2027-06-11', lastRunEnded: '2026-10-26T15:40' },
  { name: 'Elena Rostova', phone: '(317) 555-0185', truck: 'Тягач 305', cdlNumber: 'IN-6114597', cdlExpires: '2028-09-18', medicalExpires: '2027-04-03' },
  { name: 'Sam Carter', phone: '(317) 555-0108', truck: 'Тягач 412', cdlNumber: 'IN-7720416', cdlExpires: '2027-12-01', medicalExpires: '2027-02-15', lastRunEnded: '2026-10-27T18:00' },
  { name: 'Priya Nair', phone: '(317) 555-0177', truck: 'Тягач 226', cdlNumber: 'IN-2048865', cdlExpires: '2028-01-22', medicalExpires: '2027-09-09', lastRunEnded: '2026-10-25T12:00' },
  { name: 'Jamal Wright', phone: '(317) 555-0193', truck: 'Тягач 331', cdlNumber: 'IN-8853310', cdlExpires: '2027-07-07', medicalExpires: '2026-10-20', lastRunEnded: '2026-10-19T16:00' },
];

/** Выплаты прошлой недели — уже выплачены. */
export const payoutHistory: PayoutRecord[] = [
  { driver: 'Marcus Hill', week: '19–25 жовт.', miles: 2140, amount: 1391 },
  { driver: 'Dana Brooks', week: '19–25 жовт.', miles: 1860, amount: 1209 },
  { driver: 'Luis Ortega', week: '19–25 жовт.', miles: 1720, amount: 1118 },
  { driver: 'Elena Rostova', week: '19–25 жовт.', miles: 2310, amount: 1502 },
  { driver: 'Sam Carter', week: '19–25 жовт.', miles: 1980, amount: 1287 },
  { driver: 'Priya Nair', week: '19–25 жовт.', miles: 1540, amount: 1001 },
  { driver: 'Jamal Wright', week: '19–25 жовт.', miles: 640, amount: 416 },
];

const DAY_MS = 24 * 60 * 60 * 1000;

/** Календарный день YYYY-MM-DD как UTC-полночь: разница дней не зависит от часового пояса и времени суток. */
function dayStart(date: string) {
  const [year, month, day] = date.slice(0, 10).split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Сколько календарных дней от «сегодня» (SEED_NOW) до даты (отрицательно — срок уже прошёл). */
export function daysUntil(date: string) {
  return Math.round((dayStart(date) - dayStart(SEED_NOW)) / DAY_MS);
}

/** Сколько полных дней прошло с даты до SEED_NOW. */
function daysSince(date: string) {
  return Math.round((dayStart(SEED_NOW) - dayStart(date)) / DAY_MS);
}

export type DriverRow = {
  driver: Driver;
  status: DriverStatus;
  activeRun: EnrichedRun | null;
  hoursLeft: number | null;
  location: string;
  /** Самый близкий срок документов. */
  docsDaysLeft: number;
  idleDays: number | null;
  /** Мили и сумма к выплате за текущую неделю. */
  weekMiles: number;
  /** Начислено за неделю по пройденным милям. */
  weekPay: number;
  /** Уже выплачено (сумма на момент отметки). */
  paidAmount: number;
  /** Осталось выплатить: начислено минус выплачено. */
  due: number;
  isPaid: boolean;
};

/**
 * Пройденные мили рейса: порожний перегон до загрузки — когда водитель выехал,
 * мили под вантажем — когда груз доставлен, возврат на базу — когда рейс завершён.
 */
export function traveledMiles(item: EnrichedRun) {
  const { run, legs } = item;
  let miles = 0;
  run.loads.forEach((load, index) => {
    if (load.status !== 'Assigned') miles += legs[index]?.miles ?? 0;
    if (load.status === 'Delivered') miles += load.miles;
  });
  if (run.status === 'Completed') miles += legs.at(-1)?.miles ?? 0;
  return miles;
}

export function buildDriverRows(
  drivers: Driver[],
  runs: EnrichedRun[],
  payPerMile: number,
  paidThisWeek: string[],
  paidAmounts: Record<string, number> = {},
): DriverRow[] {
  return drivers.map((driver) => {
    const own = runs.filter((item) => item.run.driver === driver.name);
    const activeRun = own.find((item) => item.run.status !== 'Completed') ?? null;
    const roster = fleetRoster.find((item) => item.driver === driver.name);
    const hoursLeft = activeRun?.run.drivingHoursLeft ?? roster?.drivingHoursLeft ?? null;
    const docsDaysLeft = Math.min(daysUntil(driver.cdlExpires), daysUntil(driver.medicalExpires));

    const status: DriverStatus =
      docsDaysLeft < 0
        ? 'DocsExpired'
        : activeRun
          ? 'OnRun'
          : hoursLeft === 0
            ? 'Resting'
            : 'Free';

    // Оплачиваются только пройденные мили.
    const weekMiles = own.reduce((sum, item) => sum + traveledMiles(item), 0);
    const weekPay = Math.round(weekMiles * payPerMile);
    const marked = paidThisWeek.includes(driver.name);
    const paidAmount = marked ? (paidAmounts[driver.name] ?? weekPay) : 0;
    const due = Math.max(0, weekPay - paidAmount);
    const isPaid = marked && due === 0;

    const idleDays = !activeRun && driver.lastRunEnded ? daysSince(driver.lastRunEnded) : null;

    return {
      driver,
      status,
      activeRun,
      hoursLeft,
      location: activeRun?.run.location?.label ?? t.map.homeYard('Indianapolis', 'IN'),
      docsDaysLeft,
      idleDays,
      weekMiles,
      weekPay,
      paidAmount,
      due,
      isPaid,
    };
  });
}

/** Сообщения о водителях для «Огляду». */
export function driverAlerts(rows: DriverRow[], idleDaysLimit: number) {
  const idle = rows.filter(
    (row) => row.status !== 'DocsExpired' && row.idleDays !== null && row.idleDays >= idleDaysLimit,
  );
  const docs = rows.filter((row) => row.docsDaysLeft <= 30);
  const toPay = rows.reduce((sum, row) => sum + row.due, 0);
  return { idle, docs, toPay };
}

const dateFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short', year: 'numeric' });

export function docDate(date: string) {
  return dateFormat.format(new Date(date));
}

/** Самый срочный документ водителя и текст про него. */
export function docNote(driver: Driver) {
  const docs = [
    { name: t.drivers.cdl, date: driver.cdlExpires },
    { name: t.drivers.medical, date: driver.medicalExpires },
  ].sort((a, b) => a.date.localeCompare(b.date));
  const soonest = docs[0];
  const days = daysUntil(soonest.date);
  if (days < 0) return { text: t.drivers.docExpired(soonest.name), tone: 'danger' };
  if (days <= 30) return { text: t.drivers.docExpiresIn(soonest.name, days), tone: 'warn' };
  return { text: t.drivers.docsOk(docDate(soonest.date)), tone: '' };
}
