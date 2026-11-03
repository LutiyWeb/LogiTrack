import { useEffect } from 'react';
import {
  emptyLegKey,
  formatHours,
  formatMiles,
  formatMoney,
  formatWhen,
  isKnownEmptyLeg,
  readNumber,
  shiftNote,
  stopName,
  type Load,
} from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectOpenRun } from '../../store/selectors/runsSelectors';
import {
  selectCurrentUser,
  selectPermissions,
} from '../../store/slices/authSlice';
import {
  addLoadDetention,
  advanceLoadBilling,
  clearScrollToOffers,
  openLoadModal,
  openRun,
  removeLoad,
  setManualMiles,
  updateLoadStatus,
} from '../../store/slices/runsSlice';
import AddLoadModal from './AddLoadForm';
import BackhaulOffers from './BackhaulOffers';
import DispatchLog from './DispatchLog';
import FleetRouteMap from './FleetRouteMap';
import {
  HosRing,
  LoadStatusBadge,
  LoadStatusSelect,
  MilesSplitBar,
  RunStatusBadge,
} from './RunVisuals';

function RunDetail() {
  const dispatch = useAppDispatch();
  const enriched = useAppSelector(selectOpenRun);
  const currentUser = useAppSelector(selectCurrentUser);
  const permissions = useAppSelector(selectPermissions);
  const manualMiles = useAppSelector((state) => state.runs.manualMiles);
  const scrollToOffers = useAppSelector((state) => state.runs.scrollToOffers);
  const targetRate = useAppSelector((state) => state.ui.targetRatePerMile);
  const maxEmptyPercent = useAppSelector((state) => state.ui.maxEmptyPercent);

  useEffect(() => {
    if (!scrollToOffers) return;
    const offersEl = document.querySelector('[aria-label="Broker load board"]');
    offersEl?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    dispatch(clearScrollToOffers());
  }, [scrollToOffers, dispatch]);

  if (!enriched) return null;

  const {
    run,
    timeline,
    paidMiles,
    emptyMiles: empty,
    revenue: earned,
    operatingCost,
    netProfit,
    dollarsPerMile: perMile,
    deadheadPercent,
    yard,
  } = enriched;

  const emptyIsHigh = deadheadPercent !== null && deadheadPercent > maxEmptyPercent;
  const rateIsGood = perMile !== null && perMile >= targetRate;

  return (
    <div className="runs">
      <button
        className="runs__back"
        type="button"
        onClick={() => dispatch(openRun(null))}
      >
        ← Back to runs
      </button>
      <header className="runs__heading">
        <h1 className="workspace__title">{run.truck}</h1>
        <div className="runs__heading-controls">
          <RunStatusBadge status={run.status} />
        </div>
      </header>
      <dl className="runs__stats">
        <Stat
          label="Paid miles"
          value={formatMiles(paidMiles)}
          subtext="Loaded freight miles"
        />
        <Stat
          label="Empty miles"
          value={empty === null ? '—' : formatMiles(empty)}
          badgeTone={
            deadheadPercent !== null
              ? emptyIsHigh
                ? 'danger'
                : 'ok'
              : undefined
          }
          badgeText={
            deadheadPercent !== null
              ? emptyIsHigh
                ? `↑ ${deadheadPercent}% · Above ${maxEmptyPercent}% limit`
                : `✓ ${deadheadPercent}% · Within target`
              : undefined
          }
        />
        <Stat
          label="Revenue"
          value={formatMoney(earned, 0)}
          subtext={
            netProfit !== null && operatingCost !== null
              ? `Net ${formatMoney(netProfit, 0)} · Cost ${formatMoney(operatingCost, 0)}`
              : undefined
          }
        />
        <Stat
          label="All-in $/mi"
          value={perMile === null ? '—' : formatMoney(perMile, 2)}
          tooltip="Revenue ÷ total miles (paid + empty)"
          badgeTone={
            perMile !== null ? (rateIsGood ? 'ok' : 'warn') : undefined
          }
          badgeText={
            perMile !== null
              ? `${rateIsGood ? '↑ Above' : '↓ Below'} ${formatMoney(targetRate, 2)} target`
              : undefined
          }
        />
      </dl>
      <div className="runs__inline-visual">
        {run.status !== 'Completed' && (
          <HosRing hoursLeft={run.drivingHoursLeft} />
        )}
        <p className="runs__meta">
          {run.driver} · Yard {yard}
          {run.status === 'Completed' || run.drivingHoursLeft === null
            ? ''
            : ` · ${formatHours(run.drivingHoursLeft)} left in this shift`}
        </p>
        <MilesSplitBar paidMiles={paidMiles} emptyMiles={empty} />
      </div>
      <section className="runs__block" aria-label="Loads">
        <div className="runs__form-head">
          <h2 className="runs__subtitle">Loads</h2>
          {permissions.canManageLoads && (
            <button
              type="button"
              className="runs__button runs__button--small"
              onClick={() => dispatch(openLoadModal(run.id))}
            >
              New load
            </button>
          )}
        </div>
        <ul className="runs__loads">
          {run.loads.map((load) => {
            const note = shiftNote(run, load);
            const billing = load.billingStatus ?? 'POD required';
            const billingTone =
              billing === 'Invoiced'
                ? '--ok'
                : billing === 'POD required'
                  ? '--warn'
                  : '';

            return (
              <li className="runs__load" key={load.id}>
                <div className="runs__load-head">
                  <p className="runs__truck">
                    {load.customer || 'No customer yet'}
                  </p>
                  <div className="runs__load-actions">
                    {load.detentionFee ? (
                      <span className="runs__badge runs__badge--ok">
                        +${load.detentionFee} detention
                      </span>
                    ) : (
                      permissions.canManageLoads && (
                        <button
                          type="button"
                          className="runs__button runs__button--ghost runs__button--small"
                          onClick={() =>
                            dispatch(
                              addLoadDetention({
                                runId: run.id,
                                loadId: load.id,
                                amount: 150,
                                author: currentUser?.name ?? 'Dispatcher',
                                roleTitle:
                                  currentUser?.roleTitle ?? 'Dispatch',
                              }),
                            )
                          }
                        >
                          + $150 Detention
                        </button>
                      )
                    )}
                    {load.status === 'Delivered' && (
                      <>
                        <span
                          className={`runs__badge ${billingTone ? `runs__badge${billingTone}` : ''}`}
                        >
                          {billing}
                        </span>
                        {billing === 'POD required' &&
                          permissions.canUpdateLoadStatus && (
                            <button
                              type="button"
                              className="runs__button runs__button--small"
                              onClick={() =>
                                dispatch(
                                  advanceLoadBilling({
                                    runId: run.id,
                                    loadId: load.id,
                                  }),
                                )
                              }
                            >
                              Confirm POD
                            </button>
                          )}
                        {billing === 'POD received' &&
                          permissions.canManageLoads && (
                            <button
                              type="button"
                              className="runs__button runs__button--small"
                              onClick={() =>
                                dispatch(
                                  advanceLoadBilling({
                                    runId: run.id,
                                    loadId: load.id,
                                  }),
                                )
                              }
                            >
                              Send invoice
                            </button>
                          )}
                      </>
                    )}
                    {permissions.canUpdateLoadStatus ? (
                      <LoadStatusSelect
                        status={load.status}
                        ariaLabel={`Status for ${load.customer || load.id}`}
                        onChange={(nextStatus) =>
                          dispatch(
                            updateLoadStatus({
                              runId: run.id,
                              loadId: load.id,
                              status: nextStatus,
                            }),
                          )
                        }
                      />
                    ) : (
                      <LoadStatusBadge status={load.status} />
                    )}
                    {permissions.canManageLoads && run.loads.length > 1 && (
                      <button
                        type="button"
                        className="runs__button runs__button--ghost runs__button--small"
                        onClick={() =>
                          dispatch(
                            removeLoad({ runId: run.id, loadId: load.id }),
                          )
                        }
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
                    {[load.bol ? `BOL ${load.bol}` : '', load.commodity]
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
      <FleetRouteMap runs={[enriched]} title={`Route map · ${run.truck}`} />
      <section className="runs__block" aria-label="Route timeline">
        <h2 className="runs__subtitle">Route & leg breakdown</h2>
        <ol className="runs__timeline">
          {timeline.map((step) => {
            const key = emptyLegKey(step.from, step.to);
            const isEditableEmpty =
              step.kind === 'empty' &&
              !isKnownEmptyLeg(step.from, step.to) &&
              permissions.canManageLoads;

            return (
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
                  {isEditableEmpty ? (
                    <input
                      className="runs__input runs__input--miles"
                      aria-label={`Empty miles from ${step.from} to ${step.to}`}
                      type="number"
                      min="0"
                      step="1"
                      placeholder="mi"
                      value={manualMiles[key] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        dispatch(
                          setManualMiles({
                            key,
                            miles: val === '' ? null : readNumber(val),
                          }),
                        );
                      }}
                    />
                  ) : (
                    <span className="runs__truck">
                      {step.miles === null ? '—' : formatMiles(step.miles)}
                    </span>
                  )}
                  {step.rate !== undefined && (
                    <span className="runs__meta">
                      {formatMoney(step.rate, 0)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
      <DispatchLog run={run} />
      {permissions.canManageLoads &&
        run.id === '214' &&
        run.loads.length === 1 && <BackhaulOffers run={run} />}
      {permissions.canManageLoads && <AddLoadModal defaultRunId={run.id} />}
    </div>
  );
}

function Stat({
  label,
  value,
  subtext,
  badgeTone,
  badgeText,
  tooltip,
}: {
  label: string;
  value: string;
  subtext?: string;
  badgeTone?: 'ok' | 'warn' | 'danger';
  badgeText?: string;
  tooltip?: string;
}) {
  return (
    <div className="runs__stat" title={tooltip}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {badgeText && badgeTone && (
        <span className={`runs__badge runs__badge--${badgeTone}`}>
          {badgeText}
        </span>
      )}
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
