import { useState, type ReactNode } from 'react';
import {
  backhaulPreset,
  dollarsPerMile,
  emptyLegKey,
  emptyMilesTotal,
  formatHours,
  formatMiles,
  formatMoney,
  formatWhen,
  isKnownEmptyLeg,
  lane,
  paidMiles,
  placeName,
  revenue,
  runLegs,
  runs as seedRuns,
  shiftNote,
  stopName,
  type Load,
  type LoadStatus,
  type Run,
  loadStatuses,
} from '../../runs/demo';
import './Workspace.scss';

type Draft = {
  customer: string;
  rate: string;
  pickupPlace: string;
  pickupCity: string;
  pickupState: string;
  pickupAt: string;
  deliveryPlace: string;
  deliveryCity: string;
  deliveryState: string;
  deliveryAt: string;
  miles: string;
  driveHours: string;
  bol: string;
  commodity: string;
  status: LoadStatus;
};

const emptyDraft: Draft = {
  customer: '',
  rate: '',
  pickupPlace: '',
  pickupCity: '',
  pickupState: '',
  pickupAt: '',
  deliveryPlace: '',
  deliveryCity: '',
  deliveryState: '',
  deliveryAt: '',
  miles: '',
  driveHours: '',
  bol: '',
  commodity: '',
  status: 'Assigned',
};

function Runs() {
  const [runs, setRuns] = useState<Run[]>(seedRuns);
  const [openId, setOpenId] = useState<string | null>(null);
  const [manualMiles, setManualMiles] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const openRun = runs.find((run) => run.id === openId) ?? null;

  function addLoad(runId: string) {
    const load: Load = {
      id: crypto.randomUUID(),
      customer: draft.customer.trim(),
      rate: readNumber(draft.rate),
      pickup: {
        place: draft.pickupPlace.trim(),
        city: draft.pickupCity.trim(),
        state: draft.pickupState.trim().toUpperCase(),
        at: draft.pickupAt,
      },
      delivery: {
        place: draft.deliveryPlace.trim(),
        city: draft.deliveryCity.trim(),
        state: draft.deliveryState.trim().toUpperCase(),
        at: draft.deliveryAt,
      },
      miles: readNumber(draft.miles),
      driveHours: readNumber(draft.driveHours),
      bol: draft.bol.trim(),
      commodity: draft.commodity.trim(),
      status: draft.status,
    };

    setRuns((current) =>
      current.map((run) =>
        run.id === runId ? { ...run, loads: [...run.loads, load] } : run,
      ),
    );
    setDraft(emptyDraft);
  }

  return openRun ? (
    <RunDetail
      run={openRun}
      manualMiles={manualMiles}
      draft={draft}
      onDraft={setDraft}
      onBack={() => setOpenId(null)}
      onMiles={(key, miles) =>
        setManualMiles((current) => {
          const next = { ...current };
          if (miles === null) delete next[key];
          else next[key] = miles;
          return next;
        })
      }
      onAdd={() => addLoad(openRun.id)}
    />
  ) : (
    <RunList runs={runs} manualMiles={manualMiles} onOpen={setOpenId} />
  );
}

function RunList({
  runs,
  manualMiles,
  onOpen,
}: {
  runs: Run[];
  manualMiles: Record<string, number>;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="runs">
      <h1 className="workspace__title">Runs</h1>
      <ul className="runs__list">
        {runs.map((run) => {
          const legs = runLegs(run, manualMiles);
          const empty = emptyMilesTotal(legs);
          const perMile = dollarsPerMile(run, legs);
          const earned = revenue(run);

          return (
            <li key={run.id}>
              <button
                className="runs__row"
                type="button"
                onClick={() => onOpen(run.id)}
              >
                <span className="runs__row-main">
                  <span className="runs__truck">{run.truck}</span>
                  <span className="runs__meta">
                    {run.driver} · {placeName(run.yardCity, run.yardState)}
                  </span>
                  <span className="runs__meta">{lane(run)}</span>
                </span>
                <span className="runs__row-side">
                  <span className="runs__status">{run.status}</span>
                  <span className="runs__meta">
                    {empty === null ? 'Empty miles needed' : `Empty ${formatMiles(empty)}`}
                    {perMile !== null && earned > 0
                      ? ` · ${formatMoney(perMile, 2)} / mi`
                      : ''}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function RunDetail({
  run,
  manualMiles,
  draft,
  onDraft,
  onBack,
  onMiles,
  onAdd,
}: {
  run: Run;
  manualMiles: Record<string, number>;
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onBack: () => void;
  onMiles: (key: string, miles: number | null) => void;
  onAdd: () => void;
}) {
  const legs = runLegs(run, manualMiles);
  const empty = emptyMilesTotal(legs);
  const perMile = dollarsPerMile(run, legs);
  const canAdd =
    draft.customer.trim() !== '' &&
    draft.pickupCity.trim() !== '' &&
    draft.pickupState.trim() !== '' &&
    draft.deliveryCity.trim() !== '' &&
    draft.deliveryState.trim() !== '' &&
    draft.miles.trim() !== '';

  return (
    <div className="runs">
      <button className="runs__back" type="button" onClick={onBack}>
        Runs
      </button>
      <header className="runs__heading">
        <h1 className="workspace__title">{run.truck}</h1>
        <p className="runs__status">{run.status}</p>
      </header>
      <dl className="runs__stats">
        <Stat label="Paid miles" value={formatMiles(paidMiles(run))} />
        <Stat
          label="Empty miles"
          value={empty === null ? '—' : formatMiles(empty)}
        />
        <Stat label="Revenue" value={formatMoney(revenue(run), 0)} />
        <Stat
          label="$ per mile"
          value={perMile === null ? '—' : formatMoney(perMile, 2)}
        />
      </dl>
      <p className="runs__meta">
        {run.driver} · Yard {placeName(run.yardCity, run.yardState)}
        {run.drivingHoursLeft === null
          ? ''
          : ` · ${formatHours(run.drivingHoursLeft)} left in this shift`}
      </p>
      <section className="runs__block" aria-label="Loads">
        <h2 className="runs__subtitle">Loads</h2>
        <ul className="runs__loads">
          {run.loads.map((load) => {
            const note = shiftNote(run, load);

            return (
              <li className="runs__load" key={load.id}>
                <div className="runs__load-head">
                  <p className="runs__truck">
                    {load.customer || 'No customer yet'}
                  </p>
                  <p className="runs__status">{load.status}</p>
                </div>
                <p className="runs__meta">
                  {load.rate > 0 ? formatMoney(load.rate, 0) : 'Rate not set'}
                  {load.miles > 0 ? ` · ${formatMiles(load.miles)}` : ''}
                  {load.driveHours > 0
                    ? ` · Drive time ${formatHours(load.driveHours)}`
                    : ''}
                </p>
                <p className="runs__meta">
                  {stopLine(load.pickup)} → {stopLine(load.delivery)}
                </p>
                {(load.bol || load.commodity) && (
                  <p className="runs__meta">
                    {[
                      load.bol ? `BOL ${load.bol}` : '',
                      load.commodity,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {note && <p className="runs__note">{note}</p>}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="runs__block" aria-label="Empty miles">
        <h2 className="runs__subtitle">Empty miles</h2>
        <ul className="runs__legs">
          {legs.map((leg) => {
            const key = emptyLegKey(leg.from, leg.to);

            return (
              <li className="runs__leg" key={key}>
                <span>
                  {leg.from} → {leg.to}
                </span>
                {isKnownEmptyLeg(leg.from, leg.to) ? (
                  <span>{leg.miles === null ? '—' : formatMiles(leg.miles)}</span>
                ) : (
                  <input
                    className="runs__input runs__input--miles"
                    aria-label={`Empty miles from ${leg.from} to ${leg.to}`}
                    type="number"
                    min="0"
                    step="1"
                    value={manualMiles[key] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      onMiles(key, value === '' ? null : readNumber(value));
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <form
        className="runs__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (canAdd) onAdd();
        }}
      >
        <div className="runs__form-head">
          <h2 className="runs__subtitle">Add a load</h2>
          {run.id === '214' && (
            <button
              className="runs__button runs__button--ghost"
              type="button"
              onClick={() => onDraft({ ...emptyDraft, ...backhaulPreset })}
            >
              Use Blue Ridge Logistics
            </button>
          )}
        </div>
        <Field label="Customer">
          <input
            className="runs__input"
            value={draft.customer}
            onChange={(event) =>
              onDraft({ ...draft, customer: event.target.value })
            }
          />
        </Field>
        <Field label="Rate, $">
          <input
            className="runs__input"
            type="number"
            min="0"
            step="1"
            value={draft.rate}
            onChange={(event) => onDraft({ ...draft, rate: event.target.value })}
          />
        </Field>
        <Field label="Status">
          <select
            className="runs__input"
            value={draft.status}
            onChange={(event) =>
              onDraft({ ...draft, status: event.target.value as LoadStatus })
            }
          >
            {loadStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Pickup place">
          <input
            className="runs__input"
            value={draft.pickupPlace}
            onChange={(event) =>
              onDraft({ ...draft, pickupPlace: event.target.value })
            }
          />
        </Field>
        <Field label="Pickup city">
          <input
            className="runs__input"
            value={draft.pickupCity}
            onChange={(event) =>
              onDraft({ ...draft, pickupCity: event.target.value })
            }
          />
        </Field>
        <Field label="Pickup state">
          <input
            className="runs__input"
            maxLength={2}
            value={draft.pickupState}
            onChange={(event) =>
              onDraft({ ...draft, pickupState: event.target.value.toUpperCase() })
            }
          />
        </Field>
        <Field label="Pickup time">
          <input
            className="runs__input"
            type="datetime-local"
            value={draft.pickupAt}
            onChange={(event) =>
              onDraft({ ...draft, pickupAt: event.target.value })
            }
          />
        </Field>
        <Field label="Delivery place">
          <input
            className="runs__input"
            value={draft.deliveryPlace}
            onChange={(event) =>
              onDraft({ ...draft, deliveryPlace: event.target.value })
            }
          />
        </Field>
        <Field label="Delivery city">
          <input
            className="runs__input"
            value={draft.deliveryCity}
            onChange={(event) =>
              onDraft({ ...draft, deliveryCity: event.target.value })
            }
          />
        </Field>
        <Field label="Delivery state">
          <input
            className="runs__input"
            maxLength={2}
            value={draft.deliveryState}
            onChange={(event) =>
              onDraft({
                ...draft,
                deliveryState: event.target.value.toUpperCase(),
              })
            }
          />
        </Field>
        <Field label="Delivery time">
          <input
            className="runs__input"
            type="datetime-local"
            value={draft.deliveryAt}
            onChange={(event) =>
              onDraft({ ...draft, deliveryAt: event.target.value })
            }
          />
        </Field>
        <Field label="Miles">
          <input
            className="runs__input"
            type="number"
            min="0"
            step="1"
            value={draft.miles}
            onChange={(event) =>
              onDraft({ ...draft, miles: event.target.value })
            }
          />
        </Field>
        <Field label="Drive time, hours">
          <input
            className="runs__input"
            type="number"
            min="0"
            step="0.1"
            value={draft.driveHours}
            onChange={(event) =>
              onDraft({ ...draft, driveHours: event.target.value })
            }
          />
        </Field>
        <Field label="BOL">
          <input
            className="runs__input"
            value={draft.bol}
            onChange={(event) => onDraft({ ...draft, bol: event.target.value })}
          />
        </Field>
        <Field label="Commodity">
          <input
            className="runs__input"
            value={draft.commodity}
            onChange={(event) =>
              onDraft({ ...draft, commodity: event.target.value })
            }
          />
        </Field>
        <div className="runs__form-submit">
          <button className="runs__button" type="submit" disabled={!canAdd}>
            Add load
          </button>
        </div>
      </form>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="runs__stat">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="runs__field">
      <span className="runs__label">{label}</span>
      {children}
    </label>
  );
}

function stopLine(stop: Load['pickup']) {
  const place = [stop.place, stopName(stop)].filter(Boolean).join(', ');
  const when = formatWhen(stop.at);
  return when ? `${place} · ${when}` : place;
}

function readNumber(value: string) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default Runs;
