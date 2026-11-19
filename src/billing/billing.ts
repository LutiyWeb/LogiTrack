import { getBrokerInfo, SEED_NOW, type Load, type Run } from '../runs/seed';

export type InvoiceLine = { description: string; amountCents: number };
export type InvoicePayment = {
  id: string;
  amountCents: number;
  date: string;
  method: 'Bank transfer' | 'Check' | 'Cash' | 'Other';
  reference: string;
  recordedBy: string;
};
export type FactoringAgreement = {
  id: string;
  company: string;
  feeCents: number;
  advanceCents: number;
  date: string;
  reference: string;
  recordedBy: string;
};
export type Invoice = {
  documentIds?: string[];
  factoring?: FactoringAgreement;
  id: string;
  number: string;
  runId: string;
  loadId: string;
  customer: string;
  issuedOn: string;
  dueOn: string;
  createdBy: string;
  lines: InvoiceLine[];
  payments: InvoicePayment[];
};

export const toCents = (amount: number) =>
  Math.round((amount + Number.EPSILON) * 100);
export const invoiceTotal = (invoice: Invoice) =>
  invoice.lines.reduce((sum, line) => sum + line.amountCents, 0);
export const invoicePaid = (invoice: Invoice) =>
  invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
export const invoiceBalance = (invoice: Invoice) =>
  Math.max(0, invoiceTotal(invoice) - invoicePaid(invoice));
export const invoiceOverdue = (
  invoice: Invoice,
  today = SEED_NOW.slice(0, 10),
) => invoiceBalance(invoice) > 0 && invoice.dueOn < today;

export function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function addDays(date: string, days: number) {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}
export function displayDate(date: string) {
  return new Intl.DateTimeFormat('uk-UA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/** Invoice is a snapshot. Later rate/detention edits cannot rewrite what was issued. */
export function makeInvoice(
  run: Run,
  load: Load,
  sequence: number,
  author: string,
  issuedOn = SEED_NOW.slice(0, 10),
  amount = load.rate,
): Invoice {
  const totalCents = toCents(amount);
  const detentionCents = Math.min(totalCents, toCents(load.detentionFee ?? 0));
  return {
    id: `invoice:${run.id}:${load.id}:${sequence}`,
    number: `LT-${String(sequence).padStart(5, '0')}`,
    runId: run.id,
    loadId: load.id,
    customer: load.customer.trim(),
    issuedOn,
    dueOn: addDays(issuedOn, getBrokerInfo(load.customer).paymentDays ?? 30),
    createdBy: author,
    lines: [
      {
        description: `Перевезення · ${load.loadNumber || load.bol || load.id}`,
        amountCents: totalCents - detentionCents,
      },
      ...(detentionCents > 0
        ? [{ description: 'Погоджений простій', amountCents: detentionCents }]
        : []),
    ],
    payments: [],
  };
}

export function invoicesFromLoads(
  runs: Run[],
  existing: Invoice[] = [],
): Invoice[] {
  const invoices = structuredClone(existing);
  for (const run of runs)
    for (const load of run.loads) {
      if (
        load.billingStatus !== 'Invoiced' ||
        invoices.some(
          (invoice) => invoice.loadId === load.id && invoice.runId === run.id,
        )
      )
        continue;
      const date = load.delivery.at.slice(0, 10);
      invoices.push(
        makeInvoice(
          run,
          load,
          invoices.length + 1,
          'Початкові дані',
          validDate(date) ? date : SEED_NOW.slice(0, 10),
          load.invoicedAmount ?? load.rate,
        ),
      );
    }
  return invoices;
}

export type PaymentInput = {
  amount: string;
  date: string;
  method: InvoicePayment['method'];
  reference: string;
};
export function paymentError(input: PaymentInput, invoice: Invoice) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(input.amount.trim()))
    return 'Вкажіть суму з точністю до двох знаків після крапки.';
  const cents = toCents(Number(input.amount));
  if (
    !Number.isSafeInteger(cents) ||
    cents <= 0 ||
    cents > invoiceBalance(invoice)
  )
    return 'Сума має бути більшою за нуль і не перевищувати залишок боргу.';
  if (
    !validDate(input.date) ||
    input.date < invoice.issuedOn ||
    input.date > SEED_NOW.slice(0, 10)
  )
    return 'Дата платежу має бути між датою рахунку та сьогоднішнім днем демо.';
  if (!['Bank transfer', 'Check', 'Cash', 'Other'].includes(input.method))
    return 'Оберіть спосіб оплати.';
  if (!input.reference.trim() || input.reference.trim().length > 120)
    return 'Вкажіть номер або референс платежу (до 120 символів).';
  return '';
}
