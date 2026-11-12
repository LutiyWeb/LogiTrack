import { useState } from 'react';
import { seedDrivers } from '../../drivers/drivers';
import { t } from '../../i18n';
import { emptyManualLoad } from '../../inbox/inbox';
import { buildEvents, TODAY, type CalendarEvent, type EventKind } from '../../planning/planning';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addInboxLoad, setInboxStatus } from '../../store/slices/inboxSlice';
import { addReminder, toggleReminder } from '../../store/slices/plannerSlice';
import { openRun } from '../../store/slices/runsSlice';
import { showToast } from '../../store/slices/toastsSlice';
import { setActiveSection } from '../../store/slices/uiSlice';
import '../Workspace/Workspace.scss';
import './Planning.scss';

const kinds: EventKind[] = ['tentative', 'pickup', 'delivery', 'reminder', 'document'];

const monthFormatter = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('uk-UA', { weekday: 'long', day: 'numeric', month: 'long' });

/** Заглавная только первая буква: «Жовтень 2026 р.», «Середа, 28 жовтня». */
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const monthFormat = { format: (date: Date) => capitalize(monthFormatter.format(date)) };
const dayFormat = { format: (date: Date) => capitalize(dayFormatter.format(date)) };

/** Дата в формате YYYY-MM-DD без сдвига часового пояса. */
function toKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function fromKey(key: string) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Дни сетки месяца, неделя с понедельника. Пустые ячейки — null. */
function monthCells(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const offset = (first.getDay() + 6) % 7;
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: days }, (_, i) => toKey(new Date(month.getFullYear(), month.getMonth(), i + 1))),
  ];
}

type FormKind = 'tentative' | 'reminder' | null;

function Planning() {
  const dispatch = useAppDispatch();
  const runs = useAppSelector((state) => state.runs.runs);
  const inbox = useAppSelector((state) => state.inbox.items);
  const reminders = useAppSelector((state) => state.planner.reminders);
  const [month, setMonth] = useState(() => fromKey(TODAY.slice(0, 8) + '01'));
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<FormKind>(null);

  const events = buildEvents(runs, inbox, reminders, seedDrivers);
  const byDay = new Map<string, CalendarEvent[]>();
  events.forEach((event) => byDay.set(event.date, [...(byDay.get(event.date) ?? []), event]));

  // Без выбранного дня — ближайшие 14 дней начиная с сегодня.
  const horizon = toKey(new Date(fromKey(TODAY).getTime() + 13 * 24 * 60 * 60 * 1000));
  const agendaDays = selected
    ? [selected]
    : [...byDay.keys()].filter((key) => key >= TODAY && key <= horizon);

  function confirmTentative(event: CalendarEvent) {
    if (!event.inboxId) return;
    const item = inbox.find((entry) => entry.id === event.inboxId);
    dispatch(setInboxStatus({ id: event.inboxId, status: 'New' }));
    dispatch(showToast('success', t.planning.confirmed(item?.draft.customer ?? '')));
  }

  return (
    <div className="runs">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">{t.planning.title}</h1>
          <p className="runs__meta">{t.planning.subtitle}</p>
        </div>
        <div className="runs__toolbar-actions">
          <button
            type="button"
            className="runs__button runs__button--secondary runs__button--small"
            onClick={() => setForm((current) => (current === 'reminder' ? null : 'reminder'))}
          >
            + {t.planning.addReminder}
          </button>
          <button
            type="button"
            className="runs__button runs__button--small"
            onClick={() => setForm((current) => (current === 'tentative' ? null : 'tentative'))}
          >
            + {t.planning.addTentative}
          </button>
        </div>
      </header>

      {form === 'tentative' && (
        <TentativeForm
          onCancel={() => setForm(null)}
          onSave={(values) => {
            const item = emptyManualLoad();
            item.status = 'Tentative';
            item.draft = {
              ...item.draft,
              customer: values.customer,
              pickupCity: values.fromCity,
              pickupState: values.fromState.toUpperCase(),
              deliveryCity: values.toCity,
              deliveryState: values.toState.toUpperCase(),
              pickupAt: `${values.date}T08:00`,
              rate: values.rate,
            };
            dispatch(addInboxLoad(item));
            if (values.remindAt && values.note) {
              dispatch(addReminder({ date: values.remindAt, text: values.note, inboxId: item.id }));
            }
            dispatch(showToast('success', t.planning.savedTentative));
            setForm(null);
          }}
        />
      )}
      {form === 'reminder' && (
        <ReminderForm
          onCancel={() => setForm(null)}
          onSave={(date, text) => {
            dispatch(addReminder({ date, text }));
            dispatch(showToast('success', t.planning.savedReminder));
            setForm(null);
          }}
        />
      )}

      <div className="planning">
        <section className="runs__block planning__calendar" aria-label={monthFormat.format(month)}>
          <div className="planning__month-head">
            <button
              type="button"
              className="runs__button runs__button--tertiary runs__button--small"
              aria-label={t.planning.prevMonth}
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            >
              ←
            </button>
            <h2 className="runs__subtitle">{monthFormat.format(month)}</h2>
            <button
              type="button"
              className="runs__button runs__button--tertiary runs__button--small"
              aria-label={t.planning.nextMonth}
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            >
              →
            </button>
          </div>
          <div className="planning__grid">
            {t.planning.weekdays.map((weekday) => (
              <span key={weekday} className="planning__weekday">
                {weekday}
              </span>
            ))}
            {monthCells(month).map((key, index) =>
              key ? (
                <button
                  key={key}
                  type="button"
                  className={[
                    'planning__day',
                    key === TODAY ? 'is-today' : '',
                    key === selected ? 'is-selected' : '',
                  ].join(' ')}
                  aria-pressed={key === selected}
                  aria-label={dayFormat.format(fromKey(key))}
                  onClick={() => setSelected((current) => (current === key ? null : key))}
                >
                  <span>{fromKey(key).getDate()}</span>
                  <span className="planning__dots">
                    {kinds
                      .filter((kind) => byDay.get(key)?.some((event) => event.kind === kind && !event.done))
                      .map((kind) => (
                        <span key={kind} className={`planning__dot planning__dot--${kind}`} />
                      ))}
                  </span>
                </button>
              ) : (
                <span key={`empty-${index}`} />
              ),
            )}
          </div>
          <ul className="planning__legend" aria-label={t.planning.legendAria}>
            {kinds.map((kind) => (
              <li key={kind}>
                <span className={`planning__dot planning__dot--${kind}`} aria-hidden="true" />
                {t.planning.kinds[kind]}
              </li>
            ))}
          </ul>
        </section>

        <section className="runs__block planning__agenda" aria-label={t.planning.upcoming}>
          <div className="runs__form-head">
            <h2 className="runs__subtitle">
              {selected ? t.planning.dayTitle(dayFormat.format(fromKey(selected))) : t.planning.upcoming}
            </h2>
            {selected && (
              <button
                type="button"
                className="runs__button runs__button--tertiary runs__button--small"
                onClick={() => setSelected(null)}
              >
                {t.planning.showUpcoming}
              </button>
            )}
          </div>

          {agendaDays.length === 0 || agendaDays.every((key) => !byDay.get(key)?.length) ? (
            <p className="runs__meta">{t.planning.empty}</p>
          ) : (
            agendaDays.map((key) => (
              <div key={key} className="planning__agenda-day">
                {!selected && (
                  <h3 className="planning__agenda-date">
                    {key === TODAY ? `${t.planning.today} · ` : ''}
                    {dayFormat.format(fromKey(key))}
                  </h3>
                )}
                <ul className="runs__loads">
                  {(byDay.get(key) ?? []).map((event) => (
                    <li key={event.id} className={`planning__event planning__event--${event.kind}${event.done ? ' is-done' : ''}`}>
                      <span className={`planning__dot planning__dot--${event.kind}`} aria-hidden="true" />
                      <span className="planning__event-text">
                        <span className="planning__event-kind">{t.planning.kinds[event.kind]}</span>
                        {event.text}
                      </span>
                      <EventActions
                        event={event}
                        onToggle={() => {
                          if (!event.reminderId) return;
                          dispatch(toggleReminder(event.reminderId));
                          if (!event.done) dispatch(showToast('success', t.planning.reminderDone));
                        }}
                        onConfirm={() => confirmTentative(event)}
                        onOpenRun={() => {
                          if (!event.runId) return;
                          dispatch(openRun(event.runId));
                          dispatch(setActiveSection('board'));
                        }}
                        onOpenDrivers={() => dispatch(setActiveSection('drivers'))}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

function EventActions({
  event,
  onToggle,
  onConfirm,
  onOpenRun,
  onOpenDrivers,
}: {
  event: CalendarEvent;
  onToggle: () => void;
  onConfirm: () => void;
  onOpenRun: () => void;
  onOpenDrivers: () => void;
}) {
  if (event.kind === 'reminder') {
    return (
      <label className="runs__check">
        <input type="checkbox" checked={!!event.done} onChange={onToggle} />
        {t.planning.done}
      </label>
    );
  }
  if (event.kind === 'tentative') {
    return (
      <button type="button" className="runs__button runs__button--secondary runs__button--small" onClick={onConfirm}>
        {t.planning.confirm}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="runs__button runs__button--tertiary runs__button--small"
      onClick={event.kind === 'document' ? onOpenDrivers : onOpenRun}
    >
      {t.planning.open}
    </button>
  );
}

type TentativeValues = {
  customer: string;
  fromCity: string;
  fromState: string;
  toCity: string;
  toState: string;
  date: string;
  rate: string;
  remindAt: string;
  note: string;
};

function TentativeForm({ onSave, onCancel }: { onSave: (values: TentativeValues) => void; onCancel: () => void }) {
  const [values, setValues] = useState<TentativeValues>({
    customer: '',
    fromCity: '',
    fromState: '',
    toCity: '',
    toState: '',
    date: '',
    rate: '',
    remindAt: '',
    note: '',
  });
  const f = t.planning.fields;
  const set = (key: keyof TentativeValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [key]: event.target.value }));
  const ready = values.customer.trim() && values.fromCity.trim() && values.toCity.trim() && values.date;

  return (
    <form
      className="runs__form"
      aria-label={t.planning.formTentative}
      onSubmit={(event) => {
        event.preventDefault();
        if (ready) onSave(values);
      }}
    >
      <h2 className="runs__subtitle runs__form-head">{t.planning.formTentative}</h2>
      <Field label={f.customer} value={values.customer} onChange={set('customer')} />
      <Field label={f.rate} value={values.rate} onChange={set('rate')} type="number" />
      <Field label={f.fromCity} value={values.fromCity} onChange={set('fromCity')} />
      <Field label={f.fromState} value={values.fromState} onChange={set('fromState')} maxLength={2} />
      <Field label={f.toCity} value={values.toCity} onChange={set('toCity')} />
      <Field label={f.toState} value={values.toState} onChange={set('toState')} maxLength={2} />
      <Field label={f.date} value={values.date} onChange={set('date')} type="date" />
      <Field label={f.remindAt} value={values.remindAt} onChange={set('remindAt')} type="date" />
      <label className="runs__field runs__field--wide">
        <span className="runs__label">{f.note}</span>
        <input
          className="runs__input"
          placeholder={t.planning.notePlaceholder}
          value={values.note}
          onChange={set('note')}
        />
      </label>
      <div className="runs__form-submit">
        <button type="button" className="runs__button runs__button--tertiary" onClick={onCancel}>
          {t.common.cancel}
        </button>
        <button type="submit" className="runs__button" disabled={!ready}>
          {t.planning.save}
        </button>
      </div>
    </form>
  );
}

function ReminderForm({ onSave, onCancel }: { onSave: (date: string, text: string) => void; onCancel: () => void }) {
  const [date, setDate] = useState(TODAY);
  const [text, setText] = useState('');
  const f = t.planning.fields;

  return (
    <form
      className="runs__form"
      aria-label={t.planning.formReminder}
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) onSave(date, text.trim());
      }}
    >
      <h2 className="runs__subtitle runs__form-head">{t.planning.formReminder}</h2>
      <Field label={f.reminderDate} value={date} onChange={(event) => setDate(event.target.value)} type="date" />
      <Field label={f.note} value={text} onChange={(event) => setText(event.target.value)} />
      <div className="runs__form-submit">
        <button type="button" className="runs__button runs__button--tertiary" onClick={onCancel}>
          {t.common.cancel}
        </button>
        <button type="submit" className="runs__button" disabled={!text.trim()}>
          {t.planning.save}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="runs__field">
      <span className="runs__label">{label}</span>
      <input className="runs__input" {...props} />
    </label>
  );
}

export default Planning;
