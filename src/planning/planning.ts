import type { Driver } from '../drivers/drivers';
import { t } from '../i18n';
import type { InboxLoad } from '../inbox/inbox';
import { DEMO_NOW, placeName, type Run } from '../runs/demo';

/** Напоминание. Может быть привязано к грузу из очереди. */
export type Reminder = {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  text: string;
  done: boolean;
  inboxId?: string;
};

export type EventKind = 'tentative' | 'pickup' | 'delivery' | 'reminder' | 'document';

export type CalendarEvent = {
  id: string;
  date: string;
  kind: EventKind;
  text: string;
  done?: boolean;
  reminderId?: string;
  inboxId?: string;
  runId?: string;
};

export const TODAY = DEMO_NOW.slice(0, 10);

export const seedReminders: Reminder[] = [
  { id: 'r1', date: '2026-10-28', inboxId: 'plan-texas', done: false, text: 'Переспитати Blue Ridge Logistics: чи підтверджено Dallas → Atlanta на 5 листопада.' },
  { id: 'r2', date: '2026-10-28', done: false, text: 'Нагадати Dana Brooks продовжити медсправку.' },
  { id: 'r3', date: '2026-10-30', inboxId: 'plan-newjersey', done: false, text: 'Переспитати Northbound: Newark → Columbus на 3 листопада.' },
  { id: 'r4', date: '2026-11-08', inboxId: 'plan-arizona', done: false, text: 'Переспитати Crestline: Phoenix → New York на 11 листопада, узгодити ставку.' },
];

const day = (iso: string) => iso.slice(0, 10);

/** Все события календаря: рейсы, предварительные грузы, напоминания, документы водителей. */
export function buildEvents(
  runs: Run[],
  inbox: InboxLoad[],
  reminders: Reminder[],
  drivers: Driver[],
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  runs.forEach((run) =>
    run.loads.forEach((load) => {
      if (load.pickup.at) {
        events.push({
          id: `pickup-${load.id}`,
          date: day(load.pickup.at),
          kind: 'pickup',
          runId: run.id,
          text: t.planning.pickupText(run.truck, load.customer, placeName(load.pickup.city, load.pickup.state)),
        });
      }
      if (load.delivery.at) {
        events.push({
          id: `delivery-${load.id}`,
          date: day(load.delivery.at),
          kind: 'delivery',
          runId: run.id,
          text: t.planning.deliveryText(run.truck, load.customer, placeName(load.delivery.city, load.delivery.state)),
        });
      }
    }),
  );

  inbox
    .filter((item) => item.status === 'Tentative' && item.draft.pickupAt)
    .forEach((item) =>
      events.push({
        id: `tentative-${item.id}`,
        date: day(item.draft.pickupAt),
        kind: 'tentative',
        inboxId: item.id,
        text: t.planning.tentativeText(
          item.draft.customer,
          `${placeName(item.draft.pickupCity, item.draft.pickupState)} → ${placeName(item.draft.deliveryCity, item.draft.deliveryState)}`,
        ),
      }),
    );

  reminders.forEach((reminder) =>
    events.push({
      id: `reminder-${reminder.id}`,
      date: reminder.date,
      kind: 'reminder',
      text: reminder.text,
      done: reminder.done,
      reminderId: reminder.id,
      inboxId: reminder.inboxId,
    }),
  );

  drivers.forEach((driver) => {
    [
      { name: t.drivers.cdl, date: driver.cdlExpires },
      { name: t.drivers.medical, date: driver.medicalExpires },
    ].forEach((doc) =>
      events.push({
        id: `doc-${driver.name}-${doc.name}`,
        date: doc.date,
        kind: 'document',
        text: t.planning.documentText(driver.name, doc.name.toLowerCase()),
      }),
    );
  });

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

/** Количество открытых напоминаний на сегодня и раньше. */
export function dueReminders(reminders: Reminder[]) {
  return reminders.filter((reminder) => !reminder.done && reminder.date <= TODAY).length;
}
