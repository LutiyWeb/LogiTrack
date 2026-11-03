import type { ReactNode } from 'react';
import {
  backhaulOffers,
  backhaulPreset,
  dollarsPerMile,
  emptyLegKey,
  emptyMilesTotal,
  formatHours,
  formatMiles,
  formatMoney,
  formatWhen,
  isKnownEmptyLeg,
  loadStatuses,
  paidMiles,
  placeName,
  previewOfferMetrics,
  readNumber,
  revenue,
  routeTimeline,
  runLegs,
  runStatuses,
  shiftNote,
  stopName,
  type BackhaulOffer,
  type Load,
  type LoadDraft,
  type LoadStatus,
  type Run,
  type RunStatus,
} from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectFilteredRuns,
  selectOpenRun,
  type EnrichedRun,
} from '../../store/selectors/runsSelectors';
import {
  addLoadDirect,
  addLoadFromDraft,
  applyPresetToDraft,
  openRun,
  patchDraft,
  removeLoad,
  setManualMiles,
  updateLoadStatus,
  updateRunStatus,
} from '../../store/slices/runsSlice';
import {
  setStatusFilter,
  type StatusFilter,
} from '../../store/slices/uiSlice';
import { resetAllDemoData } from '../../store/store';
import './Workspace.scss';

const filterOptions: StatusFilter[] = [
  'All',
  'In transit',
  'Planned',
  'Completed',
];

function Runs() {
  const dispatch = useAppDispatch();
  const filteredRuns = useAppSelector(selectFilteredRuns);
  const currentOpenRun = useAppSelector(selectOpenRun);
  const manualMiles = useAppSelector((state) => state.runs.manualMiles);
  const draft = useAppSelector((state) => state.runs.draft);
  const statusFilter = useAppSelector((state) => state.ui.statusFilter);
  const targetRate = useAppSelector((state) => state.ui.targetRatePerMile);

  return currentOpenRun ? (
    <RunDetail
      run={currentOpenRun}
      manualMiles={manualMiles}
      draft={draft}
      targetRate={targetRate}
      onDraftPatch={(partial) => dispatch(patchDraft(partial))}
      onApplyPreset={(preset) => dispatch(applyPresetToDraft(preset))}
      onAssignOffer={(offerDraft) =>
        dispatch(addLoadDirect({ runId: currentOpenRun.id, draft: offerDraft }))
      }
      onBack={() => dispatch(openRun(null))}
      onMiles={(key, miles) => dispatch(setManualMiles({ key, miles }))}
      onAdd={() => dispatch(addLoadFromDraft(currentOpenRun.id))}
      onRunStatusChange={(status) =>
        dispatch(updateRunStatus({ runId: currentOpenRun.id, status }))
      }
      onLoadStatusChange={(loadId, status) =>
        dispatch(
          updateLoadStatus({ runId: currentOpenRun.id, loadId, status }),
        )
      }
      onRemoveLoad={(loadId) =>
        dispatch(removeLoad({ runId: currentOpenRun.id, loadId }))
      }
    />
  ) : (
    <RunList
      runs={filteredRuns}
      statusFilter={statusFilter}
      onFilterChange={(filter) => dispatch(setStatusFilter(filter))}
      onResetDemo={() => resetAllDemoData(dispatch)}
      onOpen={(id) => dispatch(openRun(id))}
    />
  );
}

function RunList({
  runs,
  statusFilter,
  onFilterChange,
  onResetDemo,
  onOpen,
}: {
  runs: EnrichedRun[];
  statusFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onResetDemo: () => void;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="runs">
      <div className="runs__toolbar">
        <h1 className="workspace__title">Runs</h1>
        <div className="runs__toolbar-actions">
          <div className="runs__filters" role="group" aria-label="Filter runs by status">
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={
                  statusFilter === option
                    ? 'runs__filter is-active'
                    : 'runs__filter'
                }
                onClick={() => onFilterChange(option)}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="runs__button runs__button--ghost"
            onClick={onResetDemo}
          >
            Reset demo
          </button>
        </div>
      </div>
      <ul className="runs__list">
        {runs.map((item) => {
          const {
            run,
            emptyMiles: empty,
            dollarsPerMile: perMile,
            revenue: earned,
            deadheadPercent,
            needsBackhaul,
          } = item;

          return (
            <li key={run.id}>
              <button
                className="runs__row"
                type="button"
                onClick={() => onOpen(run.id)}
              >
                <span className="runs__row-main">
                  <span className="runs__row-title">
                    <span className="runs__truck">{run.truck}</span>
                    {needsBackhaul && (
                      <span className="runs__badge runs__badge--warn">
                        Backhaul needed · {deadheadPercent}% empty
                      </span>
                    )}
                    {!needsBackhaul &&
                      run.loads.length > 1 &&
                      run.status !== 'Completed' && (
                        <span className="runs__badge runs__badge--ok">
                          Backhaul assigned
                        </span>
                      )}
                  </span>
                  <span className="runs__meta">
                    {run.driver} · {placeName(run.yardCity, run.yardState)}
                  </span>
                  <span className="runs__meta">{item.lane}</span>
                </span>
                <span className="runs__row-side">
                  <span className="runs__status">{run.status}</span>
                  <span className="runs__meta">
                    {empty === null
                      ? 'Empty miles needed'
                      : `Empty ${formatMiles(empty)}`}
                    {perMile !== null && earned > 0
                      ? ` · ${formatMoney(perMile, 2)} / mi`
                      : ''}
                  </span>
                  <span className="runs__meta">
                    {run.loads.length === 1
                      ? '1 load'
                      : `${run.loads.length} loads`}{' '}
                    · {formatMoney(earned, 0)}
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
  targetRate,
  onDraftPatch,
  onApplyPreset,
  onAssignOffer,
  onBack,
  onMiles,
  onAdd,
  onRunStatusChange,
  onLoadStatusChange,
  onRemoveLoad,
}: {
  run: Run;
  manualMiles: Record<string, number>;
  draft: LoadDraft;
  targetRate: number;
  onDraftPatch: (partial: Partial<LoadDraft>) => void;
  onApplyPreset: (preset?: LoadDraft) => void;
  onAssignOffer: (draft: LoadDraft) => void;
  onBack: () => void;
  onMiles: (key: string, miles: number | null) => void;
  onAdd: () => void;
  onRunStatusChange: (status: RunStatus) => void;
  onLoadStatusChange: (loadId: string, status: LoadStatus) => void;
  onRemoveLoad: (loadId: string) => void;
}) {
  const legs = runLegs(run, manualMiles);
  const empty = emptyMilesTotal(legs);
  const perMile = dollarsPerMile(run, legs);
  const timeline = routeTimeline(run, manualMiles);
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
        <div className="runs__heading-controls">
          <p className="runs__status">{run.status}</p>
          <select
            className="runs__input runs__input--compact"
            aria-label="Run status"
            value={run.status}
            onChange={(event) =>
              onRunStatusChange(event.target.value as RunStatus)
            }
          >
            {runStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </header>
      <dl className="runs__stats">
        <Stat
          label="Paid miles"
          value={formatMiles(paidMiles(run))}
          tone="blue"
        />
        <Stat
          label="Empty miles"
          value={empty === null ? '—' : formatMiles(empty)}
          tone="slate"
        />
        <Stat
          label="Revenue"
          value={formatMoney(revenue(run), 0)}
          tone="blue"
        />
        <Stat
          label="$ per mile"
          value={perMile === null ? '—' : formatMoney(perMile, 2)}
          tone="slate"
          subtext={
            perMile !== null
              ? perMile >= targetRate
                ? `Above ${formatMoney(targetRate, 2)} target`
                : `Below ${formatMoney(targetRate, 2)} target`
              : undefined
          }
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
                  <div className="runs__load-actions">
                    <p className="runs__status">{load.status}</p>
                    <select
                      className="runs__input runs__input--compact"
                      aria-label={`Status for ${load.customer || load.id}`}
                      value={load.status}
                      onChange={(event) =>
                        onLoadStatusChange(
                          load.id,
                          event.target.value as LoadStatus,
                        )
                      }
                    >
                      {loadStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    {run.loads.length > 1 && (
                      <button
                        type="button"
                        className="runs__button runs__button--ghost runs__button--small"
                        onClick={() => onRemoveLoad(load.id)}
                      >
                        Remove
                      </button>
                    )}
                  </div>
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
      <section className="runs__block" aria-label="Route timeline">
        <h2 className="runs__subtitle">Route & leg breakdown</h2>
        <ol className="runs__timeline">
          {timeline.map((step) => (
            <li
              key={step.id}
              className={`runs__step runs__step--${step.kind}`}
            >
              <div className="runs__step-main">
                <span className="runs__badge">
                  {step.kind === 'paid' ? 'Paid load' : 'Empty leg'}
                </span>
                <span className="runs__truck">
                  {step.from} → {step.to}
                </span>
                <span className="runs__meta">
                  {step.customer ? `${step.customer} · ` : ''}
                  {step.label}
                </span>
              </div>
              <div className="runs__step-side">
                <span className="runs__truck">
                  {step.miles === null ? '—' : formatMiles(step.miles)}
                </span>
                {step.rate !== undefined && (
                  <span className="runs__meta">{formatMoney(step.rate, 0)}</span>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>
      {run.id === '214' && run.loads.length === 1 && (
        <section className="runs__block" aria-label="Broker load board">
          <div className="runs__form-head">
            <h2 className="runs__subtitle">
              Available backhaul offers near Atlanta, GA
            </h2>
            <span className="runs__meta">
              Compare how each broker load impacts deadhead and $/mile
            </span>
          </div>
          <ul className="runs__offers">
            {backhaulOffers.map((offer) => (
              <OfferCard
                key={offer.id}
                run={run}
                offer={offer}
                manualMiles={manualMiles}
                onFillForm={() => onApplyPreset(offer.draft)}
                onAssign={() => onAssignOffer(offer.draft)}
              />
            ))}
          </ul>
        </section>
      )}
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
              onClick={() => onApplyPreset(backhaulPreset)}
            >
              Use Blue Ridge Logistics
            </button>
          )}
        </div>
        <Field label="Customer">
          <input
            className="runs__input"
            value={draft.customer}
            onChange={(event) => onDraftPatch({ customer: event.target.value })}
          />
        </Field>
        <Field label="Rate, $">
          <input
            className="runs__input"
            type="number"
            min="0"
            step="1"
            value={draft.rate}
            onChange={(event) => onDraftPatch({ rate: event.target.value })}
          />
        </Field>
        <Field label="Status">
          <select
            className="runs__input"
            value={draft.status}
            onChange={(event) =>
              onDraftPatch({ status: event.target.value as LoadStatus })
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
              onDraftPatch({ pickupPlace: event.target.value })
            }
          />
        </Field>
        <Field label="Pickup city">
          <input
            className="runs__input"
            value={draft.pickupCity}
            onChange={(event) =>
              onDraftPatch({ pickupCity: event.target.value })
            }
          />
        </Field>
        <Field label="Pickup state">
          <input
            className="runs__input"
            maxLength={2}
            value={draft.pickupState}
            onChange={(event) =>
              onDraftPatch({
                pickupState: event.target.value.toUpperCase(),
              })
            }
          />
        </Field>
        <Field label="Pickup time">
          <input
            className="runs__input"
            type="datetime-local"
            value={draft.pickupAt}
            onChange={(event) => onDraftPatch({ pickupAt: event.target.value })}
          />
        </Field>
        <Field label="Delivery place">
          <input
            className="runs__input"
            value={draft.deliveryPlace}
            onChange={(event) =>
              onDraftPatch({ deliveryPlace: event.target.value })
            }
          />
        </Field>
        <Field label="Delivery city">
          <input
            className="runs__input"
            value={draft.deliveryCity}
            onChange={(event) =>
              onDraftPatch({ deliveryCity: event.target.value })
            }
          />
        </Field>
        <Field label="Delivery state">
          <input
            className="runs__input"
            maxLength={2}
            value={draft.deliveryState}
            onChange={(event) =>
              onDraftPatch({
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
              onDraftPatch({ deliveryAt: event.target.value })
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
            onChange={(event) => onDraftPatch({ miles: event.target.value })}
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
              onDraftPatch({ driveHours: event.target.value })
            }
          />
        </Field>
        <Field label="BOL">
          <input
            className="runs__input"
            value={draft.bol}
            onChange={(event) => onDraftPatch({ bol: event.target.value })}
          />
        </Field>
        <Field label="Commodity">
          <input
            className="runs__input"
            value={draft.commodity}
            onChange={(event) =>
              onDraftPatch({ commodity: event.target.value })
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

function OfferCard({
  run,
  offer,
  manualMiles,
  onFillForm,
  onAssign,
}: {
  run: Run;
  offer: BackhaulOffer;
  manualMiles: Record<string, number>;
  onFillForm: () => void;
  onAssign: () => void;
}) {
  const preview = previewOfferMetrics(run, offer, manualMiles);
  const { draft } = offer;

  return (
    <li className={`runs__offer runs__offer--${offer.tone}`}>
      <div className="runs__load-head">
        <div>
          <span
            className={
              offer.tone === 'recommended'
                ? 'runs__badge runs__badge--ok'
                : offer.tone === 'warning'
                  ? 'runs__badge runs__badge--warn'
                  : 'runs__badge'
            }
          >
            {offer.tag}
          </span>
          <p className="runs__truck">{draft.customer}</p>
        </div>
        <div className="runs__load-actions">
          <button
            type="button"
            className="runs__button runs__button--ghost runs__button--small"
            onClick={onFillForm}
          >
            Fill form
          </button>
          <button
            type="button"
            className="runs__button runs__button--small"
            onClick={onAssign}
          >
            Assign load
          </button>
        </div>
      </div>
      <p className="runs__meta">
        {placeName(draft.pickupCity, draft.pickupState)} →{' '}
        {placeName(draft.deliveryCity, draft.deliveryState)} ·{' '}
        {formatMoney(Number(draft.rate), 0)} · {formatMiles(Number(draft.miles))}{' '}
        · Drive time {formatHours(Number(draft.driveHours))}
      </p>
      <p className="runs__meta">
        Projected run result:{' '}
        <strong>
          {preview.emptyMiles === null
            ? '—'
            : `Empty ${formatMiles(preview.emptyMiles)}`}
        </strong>{' '}
        ·{' '}
        <strong>
          {preview.perMile === null
            ? '—'
            : `${formatMoney(preview.perMile, 2)} / mi`}
        </strong>{' '}
        · Revenue {formatMoney(preview.totalRevenue, 0)}
      </p>
      <p className="runs__meta">{offer.summary}</p>
    </li>
  );
}

function Stat({
  label,
  value,
  tone,
  subtext,
}: {
  label: string;
  value: string;
  tone: 'blue' | 'slate';
  subtext?: string;
}) {
  return (
    <div className={`runs__stat runs__stat--${tone}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {subtext && <span className="runs__meta">{subtext}</span>}
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

export default Runs;
