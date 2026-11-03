import {
  emptyLegKey,
  formatHours,
  formatMiles,
  formatMoney,
  formatWhen,
  isKnownEmptyLeg,
  loadStatuses,
  readNumber,
  runStatuses,
  shiftNote,
  stopName,
  type Load,
  type LoadStatus,
  type RunStatus,
} from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectOpenRun } from '../../store/selectors/runsSelectors';
import {
  openRun,
  removeLoad,
  setManualMiles,
  updateLoadStatus,
  updateRunStatus,
} from '../../store/slices/runsSlice';
import AddLoadForm from './AddLoadForm';
import BackhaulOffers from './BackhaulOffers';

function RunDetail() {
  const dispatch = useAppDispatch();
  const enriched = useAppSelector(selectOpenRun);
  const manualMiles = useAppSelector((state) => state.runs.manualMiles);
  const targetRate = useAppSelector((state) => state.ui.targetRatePerMile);

  if (!enriched) return null;

  const { run, legs, timeline, paidMiles, emptyMiles: empty, revenue: earned, dollarsPerMile: perMile, yard } = enriched;

  return (
    <div className="runs">
      <button className="runs__back" type="button" onClick={() => dispatch(openRun(null))}>
        Runs
      </button>
      <header className="runs__heading">
        <h1 className="workspace__title">{run.truck}</h1>
        <div className="runs__heading-controls">
          <p className="runs__status">{run.status}</p>
          <select
            className="runs__input runs__input--compact"
            aria-label="Run status"
            value={run.status}
            onChange={(e) => dispatch(updateRunStatus({ runId: run.id, status: e.target.value as RunStatus }))}
          >
            {runStatuses.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </header>
      <dl className="runs__stats">
        <Stat label="Paid miles" value={formatMiles(paidMiles)} tone="blue" />
        <Stat label="Empty miles" value={empty === null ? '—' : formatMiles(empty)} tone="slate" />
        <Stat label="Revenue" value={formatMoney(earned, 0)} tone="blue" />
        <Stat
          label="$ per mile"
          value={perMile === null ? '—' : formatMoney(perMile, 2)}
          tone="slate"
          subtext={
            perMile !== null
              ? `${perMile >= targetRate ? 'Above' : 'Below'} ${formatMoney(targetRate, 2)} target`
              : undefined
          }
        />
      </dl>
      <p className="runs__meta">
        {run.driver} · Yard {yard}
        {run.drivingHoursLeft === null ? '' : ` · ${formatHours(run.drivingHoursLeft)} left in this shift`}
      </p>
      <section className="runs__block" aria-label="Loads">
        <h2 className="runs__subtitle">Loads</h2>
        <ul className="runs__loads">
          {run.loads.map((load) => {
            const note = shiftNote(run, load);
            return (
              <li className="runs__load" key={load.id}>
                <div className="runs__load-head">
                  <p className="runs__truck">{load.customer || 'No customer yet'}</p>
                  <div className="runs__load-actions">
                    <p className="runs__status">{load.status}</p>
                    <select
                      className="runs__input runs__input--compact"
                      aria-label={`Status for ${load.customer || load.id}`}
                      value={load.status}
                      onChange={(e) =>
                        dispatch(updateLoadStatus({ runId: run.id, loadId: load.id, status: e.target.value as LoadStatus }))
                      }
                    >
                      {loadStatuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {run.loads.length > 1 && (
                      <button
                        type="button"
                        className="runs__button runs__button--ghost runs__button--small"
                        onClick={() => dispatch(removeLoad({ runId: run.id, loadId: load.id }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <p className="runs__meta">
                  {load.rate > 0 ? formatMoney(load.rate, 0) : 'Rate not set'}
                  {load.miles > 0 ? ` · ${formatMiles(load.miles)}` : ''}
                  {load.driveHours > 0 ? ` · Drive time ${formatHours(load.driveHours)}` : ''}
                </p>
                <p className="runs__meta">{stopLine(load.pickup)} → {stopLine(load.delivery)}</p>
                {(load.bol || load.commodity) && (
                  <p className="runs__meta">{[load.bol ? `BOL ${load.bol}` : '', load.commodity].filter(Boolean).join(' · ')}</p>
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
                <span>{leg.from} → {leg.to}</span>
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
                    onChange={(e) => {
                      const val = e.target.value;
                      dispatch(setManualMiles({ key, miles: val === '' ? null : readNumber(val) }));
                    }}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>
      <section className="runs__block" aria-label="Route timeline">
        <h2 className="runs__subtitle">Route & leg breakdown</h2>
        <ol className="runs__timeline">
          {timeline.map((step) => (
            <li key={step.id} className={`runs__step runs__step--${step.kind}`}>
              <div className="runs__step-main">
                <span className="runs__badge">{step.kind === 'paid' ? 'Paid load' : 'Empty leg'}</span>
                <span className="runs__truck">{step.from} → {step.to}</span>
                <span className="runs__meta">{step.customer ? `${step.customer} · ` : ''}{step.label}</span>
              </div>
              <div className="runs__step-side">
                <span className="runs__truck">{step.miles === null ? '—' : formatMiles(step.miles)}</span>
                {step.rate !== undefined && <span className="runs__meta">{formatMoney(step.rate, 0)}</span>}
              </div>
            </li>
          ))}
        </ol>
      </section>
      {run.id === '214' && run.loads.length === 1 && <BackhaulOffers run={run} />}
      <AddLoadForm runId={run.id} />
    </div>
  );
}

function Stat({ label, value, tone, subtext }: { label: string; value: string; tone: 'blue' | 'slate'; subtext?: string }) {
  return (
    <div className={`runs__stat runs__stat--${tone}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {subtext && <span className="runs__meta">{subtext}</span>}
    </div>
  );
}

function stopLine(stop: Load['pickup']) {
  const place = [stop.place, stopName(stop)].filter(Boolean).join(', ');
  const when = formatWhen(stop.at);
  return when ? `${place} · ${when}` : place;
}

export default RunDetail;
