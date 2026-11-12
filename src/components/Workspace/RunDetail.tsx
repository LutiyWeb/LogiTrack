import { useEffect, useState } from 'react';
import { billingStatusLabel, t } from '../../i18n';
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
  openRun,
  removeLoad,
  setManualMiles,
  updateLoadStatus,
} from '../../store/slices/runsSlice';
import { markBrokerRead } from '../../store/slices/brokerSlice';
import { showToast } from '../../store/slices/toastsSlice';
import { setActiveSection } from '../../store/slices/uiSlice';
import AddLoadModal from './AddLoadForm';
import BrokerThread from './BrokerThread';
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
  const unreadBroker = useAppSelector((state) => state.broker.unread);
  const [brokerLoadId, setBrokerLoadId] = useState<string | null>(null);

  useEffect(() => {
    if (!scrollToOffers) return;
    const offersEl = document.getElementById('backhaul-offers');
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
        {t.runDetail.back}
      </button>
      <header className="runs__heading">
        <h1 className="workspace__title">{run.truck}</h1>
        <div className="runs__heading-controls">
          <RunStatusBadge status={run.status} />
        </div>
      </header>
      <dl className="runs__stats">
        <Stat
          label={t.runDetail.paidMiles}
          value={formatMiles(paidMiles)}
          subtext={t.runDetail.paidMilesSub}
        />
        <Stat
          label={t.runDetail.emptyMiles}
          value={empty === null ? t.units.dash : formatMiles(empty)}
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
                ? t.runDetail.emptyAbove(deadheadPercent, maxEmptyPercent)
                : t.runDetail.emptyWithin(deadheadPercent)
              : undefined
          }
        />
        <Stat
          label={t.runDetail.revenue}
          value={formatMoney(earned, 0)}
          subtext={
            netProfit !== null && operatingCost !== null
              ? t.runDetail.netCost(formatMoney(netProfit, 0), formatMoney(operatingCost, 0))
              : undefined
          }
        />
        <Stat
          label={t.common.allInLabel}
          value={perMile === null ? t.units.dash : formatMoney(perMile, 2)}
          tooltip={t.common.allInTooltip}
          badgeTone={
            perMile !== null ? (rateIsGood ? 'ok' : 'warn') : undefined
          }
          badgeText={
            perMile !== null
              ? rateIsGood
                ? t.runDetail.rateAbove(formatMoney(targetRate, 2))
                : t.runDetail.rateBelow(formatMoney(targetRate, 2))
              : undefined
          }
        />
      </dl>
      <div className="runs__inline-visual">
        {run.status !== 'Completed' && (
          <HosRing hoursLeft={run.drivingHoursLeft} />
        )}
        <p className="runs__meta">
          {t.runDetail.yard(run.driver, yard)}
          {run.status === 'Completed' || run.drivingHoursLeft === null
            ? ''
            : t.runDetail.shiftLeft(formatHours(run.drivingHoursLeft))}
        </p>
        <MilesSplitBar paidMiles={paidMiles} emptyMiles={empty} />
      </div>
      <section className="runs__block" aria-label={t.runDetail.loadsAria}>
        <div className="runs__form-head">
          <h2 className="runs__subtitle">{t.runDetail.loads}</h2>
          {permissions.canManageLoads && (
            <button
              type="button"
              className="runs__button runs__button--secondary runs__button--small"
              onClick={() => dispatch(setActiveSection('inbox'))}
            >
              {t.inbox.fromQueue}
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
                    {load.customer || t.runDetail.noCustomer}
                  </p>
                  <div className="runs__load-actions">
                    {permissions.canManageLoads && (
                      <button
                        type="button"
                        className="runs__button runs__button--secondary runs__button--small"
                        aria-expanded={brokerLoadId === load.id}
                        onClick={() => {
                          setBrokerLoadId((id) => (id === load.id ? null : load.id));
                          dispatch(markBrokerRead(load.id));
                        }}
                      >
                        {t.broker.open}
                        {unreadBroker.includes(load.id) && (
                          <span className="runs__dot" aria-label={t.broker.reply(load.customer)} />
                        )}
                      </button>
                    )}
                    {load.detentionFee ? (
                      <span className="runs__badge runs__badge--ok">
                        {t.runDetail.detentionBadge(load.detentionFee)}
                      </span>
                    ) : (
                      permissions.canManageLoads && (
                        <button
                          type="button"
                          className="runs__button runs__button--secondary runs__button--small"
                          onClick={() =>
                            dispatch(
                              addLoadDetention({
                                runId: run.id,
                                loadId: load.id,
                                amount: 150,
                                author: currentUser?.name ?? t.common.dispatcherFallback,
                                roleTitle:
                                  currentUser?.roleTitle ?? t.common.dispatchFallbackRole,
                              }),
                            )
                          }
                        >
                          {t.runDetail.addDetention}
                        </button>
                      )
                    )}
                    {load.status === 'Delivered' && (
                      <>
                        <span
                          className={`runs__badge ${billingTone ? `runs__badge${billingTone}` : ''}`}
                        >
                          {billingStatusLabel(billing)}
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
                              {t.runDetail.confirmPod}
                            </button>
                          )}
                        {billing === 'POD received' &&
                          permissions.canManageLoads && (
                            <button
                              type="button"
                              className="runs__button runs__button--small"
                              onClick={() => {
                                dispatch(advanceLoadBilling({ runId: run.id, loadId: load.id }));
                                dispatch(showToast('success', t.notify.invoiced(load.customer)));
                              }}
                            >
                              {t.runDetail.sendInvoice}
                            </button>
                          )}
                      </>
                    )}
                    {permissions.canUpdateLoadStatus ? (
                      <LoadStatusSelect
                        status={load.status}
                        ariaLabel={t.runDetail.statusFor(load.customer || load.id)}
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
                        className="runs__button runs__button--tertiary runs__button--small"
                        onClick={() =>
                          dispatch(
                            removeLoad({ runId: run.id, loadId: load.id }),
                          )
                        }
                      >
                        {t.common.remove}
                      </button>
                    )}
                  </div>
                </div>
                <p className="runs__meta">
                  {load.rate > 0 ? formatMoney(load.rate, 0) : t.runDetail.rateNotSet}
                  {load.miles > 0 ? ` · ${formatMiles(load.miles)}` : ''}
                  {load.driveHours > 0
                    ? ` · ${t.runDetail.driveTime(formatHours(load.driveHours))}`
                    : ''}
                </p>
                <p className="runs__meta">
                  {stopLine(load.pickup)} → {stopLine(load.delivery)}
                </p>
                {(load.bol || load.commodity) && (
                  <p className="runs__meta">
                    {[load.bol ? t.runDetail.bol(load.bol) : '', load.commodity]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {(load.loadNumber || load.equipment || load.weightLbs || load.poNumber) && (
                  <p className="runs__meta">
                    {[
                      load.loadNumber ? t.runDetail.loadNumber(load.loadNumber) : '',
                      load.poNumber ? t.runDetail.poNumber(load.poNumber) : '',
                      load.equipment,
                      load.weightLbs
                        ? `${new Intl.NumberFormat('en-US').format(load.weightLbs)} ${t.units.pounds(load.weightLbs)}`
                        : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {(load.brokerContact || load.rateConFile) && (
                  <p className="runs__meta">
                    {[
                      load.brokerContact
                        ? `${t.runDetail.brokerContact(load.brokerContact)}${load.brokerPhone ? ` · ${load.brokerPhone}` : ''}`
                        : '',
                      load.rateConFile ? t.runDetail.rateConFile(load.rateConFile) : '',
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                )}
                {note && <p className="runs__note">{note}</p>}
                {brokerLoadId === load.id && <BrokerThread load={load} />}
              </li>
            );
          })}
        </ul>
      </section>
      <FleetRouteMap runs={[enriched]} title={t.runDetail.routeMapTitle(run.truck)} />
      <section className="runs__block" aria-label={t.runDetail.timelineAria}>
        <h2 className="runs__subtitle">{t.runDetail.timelineTitle}</h2>
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
                    {step.kind === 'paid' ? t.runDetail.paidLeg : t.runDetail.emptyLeg}
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
                      aria-label={t.runDetail.emptyMilesFor(step.from, step.to)}
                      type="number"
                      min="0"
                      step="1"
                      placeholder={t.runDetail.milesPlaceholder}
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
                      {step.miles === null ? t.units.dash : formatMiles(step.miles)}
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
