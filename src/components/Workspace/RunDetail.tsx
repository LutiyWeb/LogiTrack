import { useEffect, useState } from 'react';
import { billingStatusLabel, t } from '../../i18n';
import {
  emptyLegKey,
  formatHours,
  formatMiles,
  formatMoney,
  formatWhen,
  isKnownEmptyLeg,
  shiftNote,
  stopName,
  type Load,
} from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectOpenRun } from '../../store/selectors/runsSelectors';
import {
  selectCurrentUser,
  selectPermissions,
} from '../../store/slices/authSlice';
import {
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
import LoadOperations from '../Operations/LoadOperations';
import ActionMenu from '../ActionMenu/ActionMenu';
import { useChatPanel } from '../Chats/ChatPanelContext';
import ConfirmDialog from '../ConfirmDialog/ConfirmDialog';
import AddLoadModal from './AddLoadForm';
import BrokerThread from './BrokerThread';
import BackhaulOffers from './BackhaulOffers';
import DispatchLog from './DispatchLog';
import FleetRouteMap from './FleetRouteMap';
import StatTile from './StatTile';
import {
  HosRing,
  LoadStatusBadge,
  LoadStatusSelect,
  MilesSplitBar,
  RunStatusBadge,
} from './RunVisuals';

/** A single empty leg is never longer than the whole country. */
const MAX_EMPTY_LEG_MILES = 5000;

function RunDetail() {
  const dispatch = useAppDispatch();
  const { openChat } = useChatPanel();
  const enriched = useAppSelector(selectOpenRun);
  const currentUser = useAppSelector(selectCurrentUser);
  const permissions = useAppSelector(selectPermissions);
  const manualMiles = useAppSelector((state) => state.runs.manualMiles);
  const scrollToOffers = useAppSelector((state) => state.runs.scrollToOffers);
  const targetRate = useAppSelector((state) => state.ui.targetRatePerMile);
  const maxEmptyPercent = useAppSelector((state) => state.ui.maxEmptyPercent);
  const unreadBroker = useAppSelector((state) => state.broker.unread);
  const [operationsLoadId, setOperationsLoadId] = useState<string | null>(null);
  const [brokerLoadId, setBrokerLoadId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{
    loadId: string;
    customer: string;
  } | null>(null);

  useEffect(() => {
    if (!scrollToOffers) return;
    const offersEl = document.getElementById('backhaul-offers');
    offersEl?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    dispatch(clearScrollToOffers());
  }, [scrollToOffers, dispatch]);

  if (!enriched) return null;

  // Выручка, расходы, маржа и $/милю — для диспетчера и менеджера; водителю видны только мили и часы.
  const showEconomics = permissions.canViewOverview;

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

  const emptyIsHigh =
    deadheadPercent !== null && deadheadPercent > maxEmptyPercent;
  const rateIsGood = perMile !== null && perMile >= targetRate;

  return (
    <div className="runs">
      <div className="runs__run-head">
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
            {permissions.canManageLoads && (
              <button
                type="button"
                className="runs__button runs__button--secondary runs__button--small"
                onClick={(event) => openChat(run.driver, event.currentTarget)}
              >
                {t.chats.chatWith}
              </button>
            )}
          </div>
        </header>
      </div>
      <dl className="runs__stats runs__stats--kpi">
        <StatTile
          label={t.runDetail.paidMiles}
          value={formatMiles(paidMiles)}
          meta={t.runDetail.paidMilesSub}
        />
        <StatTile
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
        {showEconomics && (
          <StatTile
            label={t.runDetail.revenue}
            value={formatMoney(earned, 0)}
            meta={
              netProfit !== null && operatingCost !== null
                ? t.runDetail.netCost(
                    formatMoney(netProfit, 0),
                    formatMoney(operatingCost, 0),
                  )
                : undefined
            }
          />
        )}
        {showEconomics && (
          <StatTile
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
        )}
      </dl>
      <div className="runs__run-status">
        <div className="runs__run-driver">
          {run.status !== 'Completed' && (
            <HosRing hoursLeft={run.drivingHoursLeft} />
          )}
          <p className="runs__meta">
            {t.runDetail.yard(run.driver, yard)}
            {run.status === 'Completed' || run.drivingHoursLeft === null
              ? ''
              : t.runDetail.shiftLeft(formatHours(run.drivingHoursLeft))}
          </p>
        </div>
        <MilesSplitBar paidMiles={paidMiles} emptyMiles={empty} />
      </div>
      <section className="runs__block" aria-label={t.runDetail.loadsAria}>
        <div className="runs__form-head runs__form-head--row">
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
                    <span className="runs__load-status">
                      {permissions.canUpdateLoadStatus ? (
                        <LoadStatusSelect
                          status={load.status}
                          ariaLabel={t.runDetail.statusFor(
                            load.customer || load.id,
                          )}
                          disabled={billing === 'Invoiced'}
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
                    </span>
                    {permissions.canManageLoads && (
                      <button
                        type="button"
                        className={`runs__button runs__button--secondary runs__button--small runs__load-broker${brokerLoadId === load.id ? ' is-active' : ''}`}
                        aria-expanded={brokerLoadId === load.id}
                        onClick={() => {
                          setBrokerLoadId((id) =>
                            id === load.id ? null : load.id,
                          );
                          dispatch(markBrokerRead(load.id));
                        }}
                      >
                        {t.broker.open}
                        {unreadBroker.includes(load.id) && (
                          <span
                            className="runs__dot"
                            aria-label={t.broker.reply(load.customer)}
                          />
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      className={`runs__button runs__button--secondary runs__button--small ${operationsLoadId === load.id ? 'is-active' : ''}`}
                      aria-expanded={operationsLoadId === load.id}
                      onClick={() =>
                        setOperationsLoadId((id) =>
                          id === load.id ? null : load.id,
                        )
                      }
                    >
                      Документи, POD і події
                    </button>
                    {load.status === 'Delivered' && (
                      <>
                        {billing === 'POD received' &&
                          permissions.canManageLoads && (
                            <button
                              type="button"
                              className="runs__button runs__button--secondary runs__button--small"
                              onClick={() => {
                                dispatch(
                                  advanceLoadBilling({
                                    runId: run.id,
                                    loadId: load.id,
                                    author: currentUser?.name,
                                  }),
                                );
                                dispatch(
                                  showToast(
                                    'success',
                                    t.notify.invoiced(load.customer),
                                  ),
                                );
                              }}
                            >
                              {t.runDetail.sendInvoice}
                            </button>
                          )}
                      </>
                    )}
                    <ActionMenu
                      label={t.common.more}
                      items={[
                        ...(permissions.canManageLoads && run.loads.length > 1
                          ? [
                              {
                                label: t.common.remove,
                                danger: true,
                                onSelect: () =>
                                  setPendingRemove({
                                    loadId: load.id,
                                    customer:
                                      load.customer || t.runDetail.noCustomer,
                                  }),
                              },
                            ]
                          : []),
                      ]}
                    />
                  </div>
                </div>
                {/* Статусы — отдельной строкой: в ряду справа остаются только действия. */}
                {(load.detentionFee || load.status === 'Delivered') && (
                  <div className="runs__load-tags">
                    {load.detentionFee ? (
                      <span className="runs__badge runs__badge--ok">
                        {t.runDetail.detentionBadge(load.detentionFee)}
                      </span>
                    ) : null}
                    {load.status === 'Delivered' && (
                      <span
                        className={`runs__badge ${billingTone ? `runs__badge${billingTone}` : ''}`}
                      >
                        {billingStatusLabel(billing)}
                      </span>
                    )}
                  </div>
                )}
                {operationsLoadId === load.id && (
                  <LoadOperations runId={run.id} load={load} />
                )}
                {load.specialInstructions && (
                  <div className="runs__instructions" role="note">
                    <strong className="runs__instructions-title">
                      <span aria-hidden="true">⚠</span>{' '}
                      {t.runDetail.instructions}
                    </strong>
                    <ul>
                      {load.specialInstructions
                        .split(';')
                        .map((item) => item.trim())
                        .filter(Boolean)
                        .map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                    </ul>
                  </div>
                )}
                <p className="runs__meta runs__meta--data">
                  {load.rate > 0
                    ? formatMoney(load.rate, 0)
                    : t.runDetail.rateNotSet}
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
                {(load.loadNumber ||
                  load.equipment ||
                  load.weightLbs ||
                  load.poNumber) && (
                  <p className="runs__meta">
                    {[
                      load.loadNumber
                        ? t.runDetail.loadNumber(load.loadNumber)
                        : '',
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
                      load.rateConFile
                        ? t.runDetail.rateConFile(load.rateConFile)
                        : '',
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
      <FleetRouteMap
        runs={[enriched]}
        title={t.runDetail.routeMapTitle(run.truck)}
      />
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
                    {step.kind === 'paid'
                      ? t.runDetail.paidLeg
                      : t.runDetail.emptyLeg}
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
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder={t.runDetail.milesPlaceholder}
                      value={manualMiles[key] ?? ''}
                      onChange={(e) => {
                        // Whole miles only: the fraction is dropped, sign and letters are ignored,
                        // capped at MAX_EMPTY_LEG_MILES.
                        const digits = e.target.value
                          .split(/[.,]/)[0]
                          .replace(/\D/g, '')
                          .slice(0, 4);
                        dispatch(
                          setManualMiles({
                            key,
                            miles:
                              digits === ''
                                ? null
                                : Math.min(Number(digits), MAX_EMPTY_LEG_MILES),
                          }),
                        );
                      }}
                    />
                  ) : (
                    <span className="runs__truck">
                      {step.miles === null
                        ? t.units.dash
                        : formatMiles(step.miles)}
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
      {pendingRemove && (
        <ConfirmDialog
          title={t.runDetail.removeTitle(pendingRemove.customer)}
          text={t.runDetail.removeText}
          confirmLabel={t.runDetail.removeConfirm}
          onCancel={() => setPendingRemove(null)}
          onConfirm={() => {
            dispatch(
              removeLoad({ runId: run.id, loadId: pendingRemove.loadId }),
            );
            setPendingRemove(null);
          }}
        />
      )}
    </div>
  );
}

function stopLine(stop: Load['pickup']) {
  const cityLine = stop.zip ? `${stopName(stop)} ${stop.zip}` : stopName(stop);
  const place = [stop.place, stop.address, cityLine].filter(Boolean).join(', ');
  const when = formatWhen(stop.at);
  return when ? `${place} · ${when}` : place;
}

export default RunDetail;
