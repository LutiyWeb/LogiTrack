import { useState } from 'react';
import {
  buildDriverRows,
  CURRENT_WEEK,
  daysUntil,
  docDate,
  docNote,
  payoutHistory,
  seedDrivers,
  type DriverRow,
  type DriverStatus,
} from '../../drivers/drivers';
import { runStatusLabel, t } from '../../i18n';
import { formatHours, formatMiles, formatMoney } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectEnrichedRuns } from '../../store/selectors/runsSelectors';
import { markDriverPaid } from '../../store/slices/driversSlice';
import { showToast } from '../../store/slices/toastsSlice';
import { openRun } from '../../store/slices/runsSlice';
import { setActiveSection } from '../../store/slices/uiSlice';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { HosRing } from '../Workspace/RunVisuals';
import StatTile from '../Workspace/StatTile';
import '../Workspace/Workspace.scss';

const MOBILE_DRIVERS_LIMIT = 3;

type DriverFilter = 'all' | DriverStatus;

const statusClass: Record<DriverStatus, string> = {
  Free: 'runs__status--completed',
  OnRun: 'runs__status--in-transit',
  Resting: 'runs__status--planned',
  DocsExpired: 'runs__status--danger',
};

function Drivers() {
  const dispatch = useAppDispatch();
  const runs = useAppSelector(selectEnrichedRuns);
  const payPerMile = useAppSelector((state) => state.ui.driverPayPerMile);
  const paidThisWeek = useAppSelector((state) => state.drivers.paidThisWeek);
  const [openName, setOpenName] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState<DriverFilter>('all');
  const isMobile = useMediaQuery('(max-width: 767px)');

  const rows = buildDriverRows(seedDrivers, runs, payPerMile, paidThisWeek);
  const statusFilters = (Object.keys(t.drivers.statusFilter) as DriverFilter[]).filter(
    (key) => key === 'all' || rows.some((row) => row.status === key),
  );
  const activeFilter = statusFilters.includes(filter) ? filter : 'all';
  const filteredRows =
    isMobile && activeFilter !== 'all' ? rows.filter((row) => row.status === activeFilter) : rows;
  const isShortened = isMobile && activeFilter === 'all' && !showAll;
  const visibleRows = isShortened ? filteredRows.slice(0, MOBILE_DRIVERS_LIMIT) : filteredRows;
  const hasMore = isMobile && activeFilter === 'all' && rows.length > MOBILE_DRIVERS_LIMIT;
  const docsProblems = rows.filter((row) => row.docsDaysLeft <= 30).length;
  const toPay = rows.filter((row) => !row.isPaid).reduce((sum, row) => sum + row.weekPay, 0);

  return (
    <div className="runs">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">{t.drivers.title}</h1>
          <p className="runs__meta">{t.drivers.subtitle}</p>
        </div>
      </header>

      <dl className="runs__stats runs__stats--kpi" aria-label={t.drivers.kpiAria}>
        <StatTile label={t.drivers.free} value={rows.filter((row) => row.status === 'Free').length} />
        <StatTile label={t.drivers.onRun} value={rows.filter((row) => row.status === 'OnRun').length} />
        <StatTile label={t.drivers.docsProblems} value={docsProblems} meta={t.drivers.docsProblemsSub} />
        <StatTile label={t.drivers.toPay} value={formatMoney(toPay, 0)} meta={CURRENT_WEEK} />
      </dl>

      <section className="runs__block" aria-label={t.drivers.listAria}>
        {isMobile && (
          <div
            className="runs__filters runs__filters--inline runs__filters--scroll"
            role="group"
            aria-label={t.drivers.filterAria}
          >
            {statusFilters.map((key) => (
              <button
                key={key}
                type="button"
                className={activeFilter === key ? 'runs__filter is-active' : 'runs__filter'}
                onClick={(event) => {
                  setFilter(key);
                  event.currentTarget.scrollIntoView?.({
                    block: 'nearest',
                    inline: 'nearest',
                    behavior: 'smooth',
                  });
                }}
              >
                {t.drivers.statusFilter[key]} (
                {key === 'all' ? rows.length : rows.filter((row) => row.status === key).length})
              </button>
            ))}
          </div>
        )}
        <ul className="runs__list runs__list--tiles">
          {visibleRows.map((row) => (
            <DriverItem
              key={row.driver.name}
              row={row}
              isOpen={openName === row.driver.name}
              onToggle={() => setOpenName((name) => (name === row.driver.name ? null : row.driver.name))}
              runs={runs.filter((item) => item.run.driver === row.driver.name)}
              onOpenRun={(runId) => {
                dispatch(openRun(runId));
                dispatch(setActiveSection('board'));
              }}
            />
          ))}
        </ul>
        {hasMore && (
          <button
            type="button"
            className="runs__button runs__button--secondary runs__button--small"
            aria-expanded={showAll}
            onClick={() => setShowAll((value) => !value)}
          >
            {showAll ? t.drivers.showLess : t.drivers.showAll(rows.length)}
          </button>
        )}
      </section>

      <section className="runs__block" aria-label={t.drivers.payoutsAria}>
        <div className="runs__form-head">
          <h2 className="runs__subtitle">{t.drivers.payoutsTitle(CURRENT_WEEK)}</h2>
          <span className="runs__meta">{t.drivers.payoutsSub(formatMoney(payPerMile, 2))}</span>
        </div>
        <ul className="runs__loads">
          {rows
            .filter((row) => row.weekPay > 0)
            .map((row) => (
              <li key={row.driver.name} className="runs__load runs__account runs__account--compact">
                <div className="runs__account-info">
                  <p className="runs__truck">{row.driver.name}</p>
                  <p className="runs__meta">
                    {formatMiles(row.weekMiles)} · {formatMoney(row.weekPay, 0)}
                  </p>
                </div>
                <div className="runs__load-actions runs__account-actions">
                  <span className={`runs__badge runs__badge--${row.isPaid ? 'ok' : 'warn'}`}>
                    {row.isPaid ? t.drivers.paid : t.drivers.accrued}
                  </span>
                  {!row.isPaid && (
                    <button
                      type="button"
                      className="runs__button runs__button--secondary runs__button--small"
                      onClick={() => {
                        dispatch(markDriverPaid(row.driver.name));
                        dispatch(showToast('success', t.notify.paid(row.driver.name)));
                      }}
                    >
                      {t.drivers.markPaid}
                    </button>
                  )}
                </div>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}

function DriverItem({
  row,
  isOpen,
  onToggle,
  runs,
  onOpenRun,
}: {
  row: DriverRow;
  isOpen: boolean;
  onToggle: () => void;
  runs: ReturnType<typeof selectEnrichedRuns>;
  onOpenRun: (runId: string) => void;
}) {
  const { driver } = row;
  const doc = docNote(driver);
  const history = payoutHistory.filter((item) => item.driver === driver.name);

  return (
    <li>
      <button
        type="button"
        className="runs__row"
        aria-expanded={isOpen}
        onClick={onToggle}
      >
        <span className="runs__row-main">
          <span className="runs__row-title">
            <span className="runs__truck">{driver.name}</span>
            <span className="runs__badge">{driver.truck}</span>
          </span>
          <span className="runs__meta">
            {row.location}
            {row.activeRun ? ` · ${row.activeRun.lane}` : ''}
          </span>
          <span className={doc.tone ? `runs__meta runs__meta--${doc.tone}` : 'runs__meta'}>
            {doc.text}
          </span>
        </span>
        <span className="runs__row-side">
          <span className={`runs__status ${statusClass[row.status]}`}>
            <span className="runs__status-dot" aria-hidden="true" />
            {t.drivers.status[row.status]}
          </span>
          {row.hoursLeft !== null && row.status !== 'DocsExpired' && (
            <span className="runs__inline-visual">
              <HosRing hoursLeft={row.hoursLeft} />
              <span className="runs__meta">{t.drivers.hoursLeft(formatHours(row.hoursLeft))}</span>
            </span>
          )}
          {row.idleDays !== null && row.idleDays > 0 && (
            <span className="runs__meta">{t.drivers.idle(row.idleDays)}</span>
          )}
          <span className="runs__meta">
            {row.isPaid ? t.drivers.paid : t.drivers.weekPay(formatMoney(row.weekPay, 0))}
          </span>
        </span>
      </button>

      {isOpen && (
        <div className="runs__driver-card">
          <dl className="runs__driver-facts">
            <div>
              <dt>{t.drivers.phone}</dt>
              <dd>{driver.phone}</dd>
            </div>
            <div>
              <dt>{t.drivers.cdlNumber}</dt>
              <dd>{driver.cdlNumber}</dd>
            </div>
            <div>
              <dt>{t.drivers.cdl}</dt>
              <dd className={daysUntil(driver.cdlExpires) <= 30 ? 'runs__meta--warn' : undefined}>
                {docDate(driver.cdlExpires)}
              </dd>
            </div>
            <div>
              <dt>{t.drivers.medical}</dt>
              <dd className={daysUntil(driver.medicalExpires) <= 30 ? 'runs__meta--warn' : undefined}>
                {docDate(driver.medicalExpires)}
              </dd>
            </div>
          </dl>

          <h3 className="runs__subtitle">{t.drivers.runsHistory}</h3>
          {runs.length === 0 ? (
            <p className="runs__meta">{t.drivers.noRuns}</p>
          ) : (
            <ul className="runs__driver-runs">
              {runs.map((item) => (
                <li key={item.run.id}>
                  <button
                    type="button"
                    className="runs__button runs__button--tertiary runs__button--small"
                    onClick={() => onOpenRun(item.run.id)}
                  >
                    {item.run.truck} · {item.lane} · {runStatusLabel(item.run.status)}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <h3 className="runs__subtitle">{t.drivers.payouts}</h3>
          <ul className="runs__driver-runs">
            <li className="runs__meta">
              {t.drivers.payoutLine(CURRENT_WEEK, formatMiles(row.weekMiles), formatMoney(row.weekPay, 0))} ·{' '}
              {row.isPaid ? t.drivers.paid : t.drivers.accrued}
            </li>
            {history.map((item) => (
              <li key={item.week} className="runs__meta">
                {t.drivers.payoutLine(item.week, formatMiles(item.miles), formatMoney(item.amount, 0))} ·{' '}
                {t.drivers.paid}
              </li>
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export default Drivers;
