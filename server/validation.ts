import { sameLoad, type LoadIdentity } from '../shared/loadIdentity.ts';
type Obj = Record<string, unknown>;
function object(value: unknown): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Очікується об’єкт.');
  return value as Obj;
}
function array(value: unknown): Obj[] {
  if (!Array.isArray(value) || value.length > 10000)
    throw new Error('Некоректний список записів.');
  return value.map(object);
}
const text = (value: unknown) =>
  typeof value === 'string' && value.length <= 5000 ? value : '';
function identity(value: Obj): LoadIdentity {
  return {
    customer: text(value.customer),
    loadNumber: text(value.loadNumber),
    bol: text(value.bol),
    brokerMc: text(value.brokerMc),
  };
}
const amount = (value: unknown) =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  value <= 100000000;
export function validateSnapshot(raw: unknown) {
  const snapshot = object(raw);
  const runState = object(snapshot.runs);
  const runs = array(runState.runs);
  const inbox = array(object(snapshot.inbox).items);
  const loads = runs.flatMap((run) =>
    array(run.loads).map((load) => ({ run, load })),
  );
  const ids = new Set<string>();
  for (const run of runs) {
    const id = text(run.id);
    if (!id || ids.has(id)) throw new Error('Повторний id рейсу.');
    ids.add(id);
  }
  for (let i = 0; i < loads.length; i++)
    if (
      loads
        .slice(i + 1)
        .some((other) =>
          sameLoad(identity(loads[i].load), identity(other.load)),
        )
    )
      throw new Error('Один вантаж брокера призначено двічі.');
  for (let i = 0; i < inbox.length; i++)
    if (
      inbox
        .slice(i + 1)
        .some((other) =>
          sameLoad(
            identity(object(inbox[i].draft)),
            identity(object(other.draft)),
          ),
        )
    )
      throw new Error('У черзі є дубль вантажу брокера.');
  for (const item of inbox)
    if (
      item.status === 'Assigned' &&
      !loads.some(
        ({ run, load }) =>
          run.id === item.runId &&
          (load.sourceInboxId === item.id ||
            sameLoad(identity(load), identity(object(item.draft)))),
      )
    )
      throw new Error('Призначення черги не пов’язане з вантажем у рейсі.');
  const activeTrailers = new Set<string>();
  for (const run of runs)
    if (run.status !== 'Completed' && run.trailerId) {
      const id = text(run.trailerId);
      if (activeTrailers.has(id))
        throw new Error('Один причіп зайнятий двома активними рейсами.');
      activeTrailers.add(id);
    }
  const numbers = new Set<string>();
  const paymentIds = new Set<string>();
  for (const invoice of array(runState.invoices)) {
    const number = text(invoice.number);
    if (!number || numbers.has(number))
      throw new Error('Повторний номер рахунку.');
    numbers.add(number);
    if (
      !loads.some(
        ({ run, load }) =>
          run.id === invoice.runId && load.id === invoice.loadId,
      )
    )
      throw new Error('Рахунок не пов’язаний з вантажем.');
    const lines = array(invoice.lines);
    const payments = array(invoice.payments);
    if (!lines.length || lines.some((line) => !amount(line.amountCents)))
      throw new Error('Некоректні рядки рахунку.');
    const total = lines.reduce(
      (sum, line) => sum + Number(line.amountCents),
      0,
    );
    const paid = payments.reduce((sum, payment) => {
      const id = text(payment.id);
      if (
        !id ||
        paymentIds.has(id) ||
        !amount(payment.amountCents) ||
        Number(payment.amountCents) === 0
      )
        throw new Error('Некоректний або повторний платіж.');
      paymentIds.add(id);
      return sum + Number(payment.amountCents);
    }, 0);
    if (paid > total) throw new Error('Оплата перевищує суму рахунку.');
  }
  for (const key of [
    'operations',
    'drivers',
    'finance',
    'planner',
    'broker',
    'chats',
    'settings',
  ])
    object(snapshot[key]);
  return snapshot;
}
