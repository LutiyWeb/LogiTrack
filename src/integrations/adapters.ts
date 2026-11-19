import { isUsState } from '../geo/geo';
import {
  validDate,
  paymentError,
  type InvoicePayment,
} from '../billing/billing';
import { seedDrivers } from '../drivers/drivers';
import { SEED_NOW, type TruckLocation } from '../runs/seed';
import type { RootState } from '../store/store';
import type {
  DriverAvailability,
  FuelPurchase,
  StateMileage,
  IntegrationEvent,
} from '../operations/model';

export type IntegrationPlan = {
  event: IntegrationEvent;
  fuel?: FuelPurchase[];
  mileage?: StateMileage[];
  eld?: DriverAvailability[];
  telemetry?: { truck: string; fix: TruckLocation }[];
  payments?: { invoiceId: string; payment: InvoicePayment }[];
};
type Row = Record<string, unknown>;
const record = (value: unknown): value is Row =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (row: Row, key: string) =>
  typeof row[key] === 'string' ? String(row[key]).trim() : '';
const number = (row: Row, key: string) =>
  typeof row[key] === 'number' && Number.isFinite(row[key])
    ? (row[key] as number)
    : NaN;
const timestamp = (value: string) =>
  !!value && Number.isFinite(Date.parse(value));
function bounded(value: number, min: number, max: number) {
  return Number.isFinite(value) && value >= min && value <= max;
}

/** Provider-neutral contract: replace the adapter, retain validation/idempotency and downstream workflows. */
export function planIntegration(
  raw: unknown,
  state: RootState,
  author: string,
): IntegrationPlan {
  if (
    !record(raw) ||
    !text(raw, 'id') ||
    !text(raw, 'provider') ||
    !Array.isArray(raw.records) ||
    raw.records.length > 1000 ||
    !raw.records.length
  )
    throw new Error('Потрібні id, provider та records (1–1000 записів).');
  const source = text(raw, 'provider');
  const kind = text(raw, 'kind');
  if (!['payments', 'telemetry', 'eld', 'fuel', 'mileage'].includes(kind))
    throw new Error('Невідомий тип інтеграції.');
  const plan: IntegrationPlan = {
    event: {
      id: `${source}:${text(raw, 'id')}`,
      source,
      kind,
      at: SEED_NOW,
      status: 'Applied',
      count: 0,
      detail: '',
    },
  };
  if (
    state.operations.integrations.some(
      (event) => event.id === plan.event.id && event.status === 'Applied',
    )
  )
    return {
      ...plan,
      event: { ...plan.event, detail: 'Цю подію вже застосовано.' },
    };
  const invoices = structuredClone(state.runs.invoices);
  const seen = new Set<string>();
  for (const [index, value] of raw.records.entries()) {
    if (!record(value) || !text(value, 'id'))
      throw new Error(`Запис ${index + 1}: потрібен зовнішній id.`);
    const id = `${source}:${text(value, 'id')}`;
    if (seen.has(id))
      throw new Error(`Запис ${index + 1}: повторний id усередині пакета.`);
    seen.add(id);
    if (kind === 'payments') {
      const invoice = invoices.find(
        (invoice) => invoice.number === text(value, 'invoiceNumber'),
      );
      if (!invoice) throw new Error(`Запис ${index + 1}: рахунок не знайдено.`);
      const amountCents = number(value, 'amountCents');
      if (!Number.isSafeInteger(amountCents))
        throw new Error(
          `Запис ${index + 1}: сума має бути цілим числом центів.`,
        );
      const payment: InvoicePayment = {
        id,
        amountCents,
        date: text(value, 'date'),
        method: text(value, 'method') as InvoicePayment['method'],
        reference: text(value, 'reference'),
        recordedBy: author,
      };
      const imported = invoices
        .flatMap((invoice) =>
          invoice.payments.map((payment) => ({ invoice, payment })),
        )
        .find((entry) => entry.payment.id === id);
      if (imported) {
        if (
          imported.invoice.id !== invoice.id ||
          imported.payment.amountCents !== amountCents ||
          imported.payment.date !== payment.date ||
          imported.payment.reference !== payment.reference
        )
          throw new Error(
            `Запис ${index + 1}: зовнішній платіж змінився; потрібне ручне звірення.`,
          );
        continue;
      }
      const sameReference = invoice.payments.find(
        (existing) =>
          existing.reference.trim().toLowerCase() ===
          payment.reference.trim().toLowerCase(),
      );
      if (sameReference) {
        if (
          sameReference.amountCents !== amountCents ||
          sameReference.date !== payment.date
        )
          throw new Error(
            `Запис ${index + 1}: референс уже існує з іншою сумою або датою.`,
          );
        continue;
      }
      const error = paymentError(
        {
          amount: (amountCents / 100).toFixed(2),
          date: payment.date,
          method: payment.method,
          reference: payment.reference,
        },
        invoice,
      );
      if (error) throw new Error(`Запис ${index + 1}: ${error}`);
      invoice.payments.push(payment);
      (plan.payments ??= []).push({ invoiceId: invoice.id, payment });
    } else if (kind === 'telemetry') {
      const truck = text(value, 'truck');
      const lat = number(value, 'lat');
      const lng = number(value, 'lng');
      const at = text(value, 'at');
      if (
        !state.operations.assets.some(
          (asset) => asset.kind === 'truck' && asset.number === truck,
        ) ||
        !bounded(lat, -90, 90) ||
        !bounded(lng, -180, 180) ||
        !timestamp(at) ||
        Date.parse(at) > Date.parse(SEED_NOW)
      )
        throw new Error(
          `Запис ${index + 1}: перевірте тягач, координати та час GPS (не пізніше дня демо).`,
        );
      const current = [
        ...state.runs.runs
          .filter((run) => run.truck === truck)
          .map((run) => run.location?.at ?? ''),
        ...(plan.telemetry ?? [])
          .filter((record) => record.truck === truck)
          .map((record) => record.fix.at),
      ]
        .sort((a, b) => Date.parse(a) - Date.parse(b))
        .at(-1);
      if (current && Date.parse(current) >= Date.parse(at)) continue;
      (plan.telemetry ??= []).push({
        truck,
        fix: {
          lat,
          lng,
          at,
          source,
          label: text(value, 'label') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        },
      });
    } else if (kind === 'eld') {
      const driver = text(value, 'driver');
      const drivingHoursLeft = number(value, 'drivingHoursLeft');
      const windowHoursLeft = number(value, 'windowHoursLeft');
      const cycleHoursLeft = number(value, 'cycleHoursLeft');
      const at = text(value, 'at');
      if (
        !seedDrivers.some((item) => item.name === driver) ||
        !bounded(drivingHoursLeft, 0, 11) ||
        !bounded(windowHoursLeft, 0, 14) ||
        !bounded(cycleHoursLeft, 0, 70) ||
        !timestamp(at) ||
        Date.parse(at) > Date.parse(SEED_NOW)
      )
        throw new Error(`Запис ${index + 1}: некоректний запис ELD.`);
      if (
        [...state.operations.eld, ...(plan.eld ?? [])].some(
          (item) =>
            item.driver === driver && Date.parse(item.at) >= Date.parse(at),
        )
      )
        continue;
      (plan.eld ??= []).push({
        driver,
        drivingHoursLeft,
        windowHoursLeft,
        cycleHoursLeft,
        at,
        source,
      });
    } else if (kind === 'fuel') {
      if (state.operations.fuel.some((item) => item.id === id)) continue;
      const truck = text(value, 'truck');
      const date = text(value, 'date');
      const usState = text(value, 'state');
      const gallons = number(value, 'gallons');
      const amountCents = number(value, 'amountCents');
      if (
        !state.operations.assets.some(
          (asset) => asset.number === truck && asset.kind === 'truck',
        ) ||
        !validDate(date) ||
        date > SEED_NOW.slice(0, 10) ||
        !isUsState(usState) ||
        !bounded(gallons, 0.01, 1000) ||
        !Number.isSafeInteger(amountCents) ||
        !bounded(amountCents, 1, 1000000)
      )
        throw new Error(`Запис ${index + 1}: некоректна закупівля пального.`);
      (plan.fuel ??= []).push({
        id,
        truck,
        date,
        state: usState.toUpperCase(),
        gallons,
        amountCents,
        source,
      });
    } else {
      if (state.operations.stateMileage.some((item) => item.id === id))
        continue;
      const truck = text(value, 'truck');
      const month = text(value, 'month');
      const usState = text(value, 'state');
      const miles = number(value, 'miles');
      if (
        !state.operations.assets.some(
          (asset) => asset.number === truck && asset.kind === 'truck',
        ) ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) ||
        !isUsState(usState) ||
        !bounded(miles, 0, 20000)
      )
        throw new Error(`Запис ${index + 1}: некоректний пробіг за штатом.`);
      (plan.mileage ??= []).push({
        id,
        truck,
        month,
        state: usState.toUpperCase(),
        miles,
        source,
      });
    }
  }
  plan.event.count =
    (plan.fuel?.length ?? 0) +
    (plan.mileage?.length ?? 0) +
    (plan.eld?.length ?? 0) +
    (plan.telemetry?.length ?? 0) +
    (plan.payments?.length ?? 0);
  plan.event.detail = `Застосовано ${plan.event.count} із ${raw.records.length}. Дублі та застарілі записи пропущено.`;
  return plan;
}

/** Neutral CSV export; protect spreadsheet users from formula injection. */
export function csv(rows: (string | number)[][]) {
  return (
    '\uFEFF' +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value);
            const safe =
              typeof value === 'string' && /^[\s]*[=+@-]/.test(text)
                ? `'${text}`
                : text;
            return `"${safe.replace(/"/g, '""')}"`;
          })
          .join(','),
      )
      .join('\r\n')
  );
}
