// Бизнес-данные CRM, которые живут на сервере по сущностям (одна запись = один груз, рейс, чат…).
// Состояние интерфейса и сессия (auth, ui-вид, открытый рейс, фильтры) остаются локальными.
import type { RootState } from './store';

export type Collection =
  | 'runs'
  | 'inbox'
  | 'chats'
  | 'reminders'
  | 'brokerThreads'
  | 'settings';

export type EntityDoc = { id: string; ord: number; data: unknown };
export type RemoteData = Record<Collection, EntityDoc[]>;

/** key — отпечаток для записей, которые собираются заново при каждом select (сравнивать по нему). */
export type Entry = { id: string; value: unknown; key?: string };

const entry = (id: string, value: unknown): Entry => ({ id, value, key: JSON.stringify(value) });

export type Descriptor = {
  collection: Collection;
  /** Порядок записей в массиве важен (новый груз сверху и т.п.). */
  ordered: boolean;
  select: (state: RootState) => Entry[];
  /** Накладывает записи с сервера на состояние. */
  apply: (state: RootState, docs: EntityDoc[]) => RootState;
};

const UI_BUSINESS_KEYS = [
  'dispatcherName',
  'targetRatePerMile',
  'maxEmptyPercent',
  'fuelCostPerMile',
  'driverPayPerMile',
  'idleDaysAlert',
] as const;

const byId = (docs: EntityDoc[]) => new Map(docs.map((doc) => [doc.id, doc.data]));

export const descriptors: Descriptor[] = [
  {
    collection: 'runs',
    ordered: true,
    select: (s) => s.runs.runs.map((run) => ({ id: run.id, value: run })),
    apply: (s, docs) => ({
      ...s,
      runs: { ...s.runs, runs: docs.map((d) => d.data as RootState['runs']['runs'][number]) },
    }),
  },
  {
    collection: 'inbox',
    ordered: true,
    select: (s) => s.inbox.items.map((item) => ({ id: item.id, value: item })),
    apply: (s, docs) => ({
      ...s,
      inbox: { ...s.inbox, items: docs.map((d) => d.data as RootState['inbox']['items'][number]) },
    }),
  },
  {
    collection: 'chats',
    ordered: true,
    select: (s) => s.chats.chats.map((chat) => ({ id: chat.driver, value: chat })),
    apply: (s, docs) => ({
      ...s,
      chats: { ...s.chats, chats: docs.map((d) => d.data as RootState['chats']['chats'][number]) },
    }),
  },
  {
    collection: 'reminders',
    ordered: true,
    select: (s) => s.planner.reminders.map((item) => ({ id: item.id, value: item })),
    apply: (s, docs) => ({
      ...s,
      planner: {
        ...s.planner,
        reminders: docs.map((d) => d.data as RootState['planner']['reminders'][number]),
      },
    }),
  },
  {
    collection: 'brokerThreads',
    ordered: false,
    select: (s) =>
      Object.entries(s.broker.threads).map(([id, messages]) => entry(id, { messages })),
    apply: (s, docs) => ({
      ...s,
      broker: {
        ...s.broker,
        threads: Object.fromEntries(
          docs.map((d) => [
            d.id,
            (d.data as { messages: RootState['broker']['threads'][string] }).messages,
          ]),
        ),
      },
    }),
  },
  {
    collection: 'settings',
    ordered: false,
    select: (s) => [
      entry('ui', Object.fromEntries(UI_BUSINESS_KEYS.map((key) => [key, s.ui[key]]))),
      { id: 'drivers', value: s.drivers },
      { id: 'finance', value: s.finance },
      entry('brokerUnread', { unread: s.broker.unread }),
      entry('manualMiles', { miles: s.runs.manualMiles }),
    ],
    apply: (s, docs) => {
      const m = byId(docs);
      let next = s;
      const ui = m.get('ui') as Partial<RootState['ui']> | undefined;
      if (ui) next = { ...next, ui: { ...next.ui, ...ui } };
      const drivers = m.get('drivers') as RootState['drivers'] | undefined;
      if (drivers) next = { ...next, drivers: { ...next.drivers, ...drivers } };
      const finance = m.get('finance') as RootState['finance'] | undefined;
      if (finance) next = { ...next, finance: { ...next.finance, ...finance } };
      const unread = m.get('brokerUnread') as { unread: string[] } | undefined;
      if (unread) next = { ...next, broker: { ...next.broker, unread: unread.unread } };
      const miles = m.get('manualMiles') as { miles: Record<string, number> } | undefined;
      if (miles) next = { ...next, runs: { ...next.runs, manualMiles: miles.miles } };
      return next;
    },
  },
];

/** Накладывает данные сервера на состояние. Пустые коллекции не затирают локальные. */
export function applyRemote(state: RootState, remote: RemoteData): RootState {
  return descriptors.reduce((acc, d) => {
    const docs = remote[d.collection];
    return docs && docs.length > 0 ? d.apply(acc, docs) : acc;
  }, state);
}
