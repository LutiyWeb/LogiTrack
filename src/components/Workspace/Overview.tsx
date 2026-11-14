import {
  buildDriverRows,
  docNote,
  driverAlerts,
  seedDrivers,
} from '../../drivers/drivers';
import { t } from '../../i18n';
import { dueReminders } from '../../planning/planning';
import { formatHours, formatMiles, formatMoney } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectEnrichedRuns,
  selectOverviewRuns,
  selectFleetKpis,
} from '../../store/selectors/runsSelectors';
import { selectMonthResult } from '../../store/selectors/financeSelectors';
import { selectPermissions } from '../../store/slices/authSlice';
import { selectWaitingInboxCount } from '../../store/slices/inboxSlice';
import { openRun } from '../../store/slices/runsSlice';
import { carrierProfile, setActiveSection } from '../../store/slices/uiSlice';
import FleetRouteMap from './FleetRouteMap';
import StatTile from './StatTile';
import { HosRing, MilesSplitBar, RunStatusBadge } from './RunVisuals';

function Overview() {
  const dispatch = useAppDispatch();
  const kpis = useAppSelector(selectFleetKpis);
  const enrichedRuns = useAppSelector(selectEnrichedRuns);
  const overviewRuns = useAppSelector(selectOverviewRuns);
  const targetRate = useAppSelector((state) => state.ui.targetRatePerMile);
  const maxEmptyPercent = useAppSelector((state) => state.ui.maxEmptyPercent);
  const waitingLoads = useAppSelector(selectWaitingInboxCount);
  const dueCount = useAppSelector((state) =>
    dueReminders(state.planner.reminders),
  );
  const month = useAppSelector(selectMonthResult);
  const canViewFinance = useAppSelector(selectPermissions).canViewFinance;
  const payPerMile = useAppSelector((state) => state.ui.driverPayPerMile);
  const idleDaysAlert = useAppSelector((state) => state.ui.idleDaysAlert);
  const paidThisWeek = useAppSelector((state) => state.drivers.paidThisWeek);
  const drivers = driverAlerts(
    buildDriverRows(seedDrivers, enrichedRuns, payPerMile, paidThisWeek),
    idleDaysAlert,
  );
  const hasDriverAlerts =
    drivers.idle.length > 0 || drivers.docs.length > 0 || drivers.toPay > 0;

  const rateIsGood = kpis.averageDollarsPerMile >= targetRate;
  const deadheadIsHigh = kpis.deadheadPercent > maxEmptyPercent;

  function jumpToRun(runId: string, scrollToOffers = false) {
    dispatch(openRun({ runId, scrollToOffers }));
    dispatch(setActiveSection('board'));
  }

  return (
    <div className="runs">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">{t.overview.title}</h1>
          <p className="runs__meta">
            {t.overview.meta(
              carrierProfile.carrierName,
              carrierProfile.homeYard,
              kpis.totalLoadsCount,
            )}
          </p>
        </div>
      </header>

      <dl
        className="runs__stats runs__stats--kpi"
        aria-label={t.overview.kpiAria}
      >
        <StatTile
          label={t.overview.revenue}
          value={formatMoney(kpis.totalRevenue, 0)}
          meta={t.overview.revenueMeta(
            formatMoney(kpis.totalNetProfit, 0),
            formatMiles(kpis.totalPaidMiles),
          )}
        />
        <StatTile
          label={t.common.allInLabel}
          value={formatMoney(kpis.averageDollarsPerMile, 2)}
          tooltip={t.common.allInTooltip}
          badgeTone={rateIsGood ? 'ok' : 'warn'}
          badgeText={
            rateIsGood ? t.overview.aboveTarget : t.overview.belowTarget
          }
          meta={t.overview.target(formatMoney(targetRate, 2))}
        />
        <StatTile
          label={t.overview.deadhead}
          value={`${kpis.deadheadPercent}%`}
          badgeTone={deadheadIsHigh ? 'danger' : 'ok'}
          badgeText={
            deadheadIsHigh
              ? t.overview.aboveLimit(maxEmptyPercent)
              : t.overview.withinTarget
          }
          meta={t.overview.emptyTotal(formatMiles(kpis.totalEmptyMiles))}
        />
        <StatTile
          label={t.overview.activeTrucks}
          value={kpis.activeRunsCount}
          meta={t.overview.completed(kpis.completedRunsCount)}
        />
      </dl>

      <div className="runs__overview-grid">
        <section
          className="runs__block runs__block--flat-mobile runs__alerts"
          aria-label={t.overview.alertsAria}
        >
          <h2 className="runs__subtitle">{t.overview.alertsTitle}</h2>
          {canViewFinance && (
            <div className="runs__load runs__account runs__account--compact">
              <p className="runs__truck">
                {month.revenue < month.breakeven
                  ? t.finance.overviewBreakeven(
                      formatMoney(month.breakeven - month.revenue, 0),
                    )
                  : t.finance.overviewProfit(formatMoney(month.profit, 0))}
              </p>
              <div className="runs__load-actions runs__account-actions">
                <button
                  type="button"
                  className="runs__button runs__button--secondary runs__button--small"
                  onClick={() => dispatch(setActiveSection('finance'))}
                >
                  {t.finance.overviewOpen}
                </button>
              </div>
            </div>
          )}
          {dueCount > 0 && (
            <div className="runs__load runs__account runs__account--compact">
              <p className="runs__truck">
                {t.planning.overviewToday(dueCount)}
              </p>
              <div className="runs__load-actions runs__account-actions">
                <button
                  type="button"
                  className="runs__button runs__button--secondary runs__button--small"
                  onClick={() => dispatch(setActiveSection('planning'))}
                >
                  {t.planning.overviewOpen}
                </button>
              </div>
            </div>
          )}
          {waitingLoads > 0 && (
            <div className="runs__load runs__account runs__account--compact">
              <p className="runs__truck">
                {t.inbox.overviewAlert(waitingLoads)}
              </p>
              <div className="runs__load-actions runs__account-actions">
                <button
                  type="button"
                  className="runs__button runs__button--small"
                  onClick={() => dispatch(setActiveSection('inbox'))}
                >
                  {t.inbox.overviewOpen}
                </button>
              </div>
            </div>
          )}
          {hasDriverAlerts && (
            <div className="runs__load runs__account">
              <ul className="runs__account-info runs__driver-alerts">
                {drivers.idle.map((row) => (
                  <li
                    key={`idle-${row.driver.name}`}
                    className="runs__meta runs__driver-alert"
                  >
                    <span>
                      {t.drivers.overviewIdle(
                        row.driver.truck,
                        row.driver.name,
                        row.idleDays ?? 0,
                      )}
                    </span>
                    <span className="runs__badge runs__badge--warn">
                      {t.drivers.badgeIdle}
                    </span>
                  </li>
                ))}
                {drivers.docs.map((row) => {
                  const note = docNote(row.driver);
                  const expired = note.tone === 'danger';
                  return (
                    <li
                      key={`doc-${row.driver.name}`}
                      className="runs__meta runs__driver-alert"
                    >
                      <span>
                        {t.drivers.overviewDoc(row.driver.name, note.text)}
                      </span>
                      <span
                        className={`runs__badge runs__badge--${expired ? 'danger' : 'warn'}`}
                      >
                        {expired ? t.drivers.badgeExpired : t.drivers.badgeSoon}
                      </span>
                    </li>
                  );
                })}
                {drivers.toPay > 0 && (
                  <li className="runs__meta">
                    {t.drivers.overviewPay(formatMoney(drivers.toPay, 0))}
                  </li>
                )}
              </ul>
              <div className="runs__load-actions runs__account-actions">
                <button
                  type="button"
                  className="runs__button runs__button--secondary runs__button--small"
                  onClick={() => dispatch(setActiveSection('drivers'))}
                >
                  {t.drivers.overviewOpen}
                </button>
              </div>
            </div>
          )}
          {kpis.runsNeedingBackhaul.some((item) => item.run.id === '214') && (
            <p className="runs__hint">
              <strong>{t.overview.startHere}</strong> {t.overview.startHereText}
            </p>
          )}
          {kpis.runsNeedingBackhaul.length > 0 ? (
            <ul className="runs__loads">
              {kpis.runsNeedingBackhaul.map((item) => (
                <li className="runs__load runs__load--alert" key={item.run.id}>
                  <div className="runs__load-head runs__alert-head">
                    <div className="runs__alert-title">
                      <span className="runs__badge runs__badge--warn">
                        <AlertTriangleIcon />
                        {t.overview.highEmpty(item.deadheadPercent ?? 0)}
                      </span>
                      <p className="runs__truck">
                        {item.run.truck} ·{' '}
                        {item.run.driver.replace(/ /g, '\u00a0')}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="runs__button runs__button--secondary runs__button--small runs__alert-action"
                      onClick={() => jumpToRun(item.run.id, true)}
                    >
                      {t.overview.findBackhaul}
                    </button>
                  </div>
                  <p className="runs__meta">
                    {t.overview.lane} {item.lane} · {t.overview.emptyLabel}{' '}
                    {item.emptyMiles === null
                      ? t.units.dash
                      : formatMiles(item.emptyMiles)}{' '}
                    · {t.overview.allInShort}{' '}
                    <span title={t.common.allInTooltip}>
                      {item.dollarsPerMile === null
                        ? t.units.dash
                        : `${formatMoney(item.dollarsPerMile, 2)} ${t.units.perMile}`}
                    </span>
                  </p>
                  <div className="runs__inline-visual">
                    <MilesSplitBar
                      paidMiles={item.paidMiles}
                      emptyMiles={item.emptyMiles}
                    />
                    <span className="runs__meta">
                      {t.overview.paidVsEmpty(
                        formatMiles(item.paidMiles),
                        item.emptyMiles === null
                          ? t.units.dash
                          : formatMiles(item.emptyMiles),
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="runs__note">
              {t.overview.allClear(
                maxEmptyPercent,
                formatMoney(kpis.averageDollarsPerMile, 2),
              )}
            </p>
          )}
        </section>

        <FleetRouteMap
          runs={enrichedRuns}
          onOpenRun={(runId) => jumpToRun(runId)}
        />
      </div>

      <section className="runs__block" aria-label={t.overview.boardAria}>
        <div className="runs__form-head runs__summary-head">
          <h2 className="runs__subtitle">{t.overview.summaryTitle}</h2>
          <button
            type="button"
            className="runs__button runs__button--secondary runs__button--small"
            onClick={() => {
              dispatch(openRun(null));
              dispatch(setActiveSection('board'));
            }}
          >
            {t.overview.viewAll}
          </button>
        </div>
        <ul className="runs__list runs__list--summary">
          {overviewRuns.map((item) => (
            <li key={item.run.id}>
              <button
                type="button"
                className="runs__row"
                onClick={() => jumpToRun(item.run.id)}
              >
                <span className="runs__row-main">
                  <span className="runs__row-title">
                    <span className="runs__truck">
                      {item.run.truck} · {item.run.driver}
                    </span>
                    <span className="runs__badge">
                      {t.common.loadsCount(item.run.loads.length)}
                    </span>
                  </span>
                  <span className="runs__meta">{item.lane}</span>
                  {item.run.status !== 'Completed' &&
                    item.run.drivingHoursLeft !== null && (
                      <span className="runs__inline-visual">
                        <HosRing hoursLeft={item.run.drivingHoursLeft} />
                        <span className="runs__meta">
                          {t.overview.hosRemaining(
                            formatHours(item.run.drivingHoursLeft),
                          )}
                        </span>
                      </span>
                    )}
                </span>
                <span className="runs__row-side">
                  <RunStatusBadge status={item.run.status} />
                  <span className="runs__inline-visual">
                    <MilesSplitBar
                      paidMiles={item.paidMiles}
                      emptyMiles={item.emptyMiles}
                    />
                    <span className="runs__meta">
                      {t.common.paidMiles(formatMiles(item.paidMiles))} ·{' '}
                      {t.common.emptyMiles(
                        item.emptyMiles === null
                          ? t.units.dash
                          : formatMiles(item.emptyMiles),
                      )}
                    </span>
                  </span>
                  <span className="runs__meta" title={t.common.allInTooltip}>
                    {formatMoney(item.revenue, 0)}
                    {item.dollarsPerMile !== null
                      ? ` · ${t.common.allIn(formatMoney(item.dollarsPerMile, 2))}`
                      : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 2.2 14.4 13.5H1.6L8 2.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8 6.5v3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="8" cy="11.6" r="0.8" fill="currentColor" />
    </svg>
  );
}

export default Overview;
