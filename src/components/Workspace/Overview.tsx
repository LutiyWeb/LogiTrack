import { formatHours, formatMiles, formatMoney } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectEnrichedRuns,
  selectFleetKpis,
} from '../../store/selectors/runsSelectors';
import { openRun } from '../../store/slices/runsSlice';
import { carrierProfile, setActiveSection } from '../../store/slices/uiSlice';
import FleetRouteMap from './FleetRouteMap';
import { HosRing, MilesSplitBar, RunStatusBadge } from './RunVisuals';

function Overview() {
  const dispatch = useAppDispatch();
  const kpis = useAppSelector(selectFleetKpis);
  const enrichedRuns = useAppSelector(selectEnrichedRuns);
  const targetRate = useAppSelector((state) => state.ui.targetRatePerMile);
  const maxEmptyPercent = useAppSelector((state) => state.ui.maxEmptyPercent);

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
          <h1 className="workspace__title">Overview</h1>
          <p className="runs__meta">
            {carrierProfile.carrierName} · Home yard {carrierProfile.homeYard} ·{' '}
            {kpis.totalLoadsCount} total loads
          </p>
        </div>
      </header>

      <dl className="runs__stats" aria-label="Fleet KPIs">
        <div className="runs__stat runs__stat--good">
          <div className="runs__stat-head">
            <dt>Fleet revenue</dt>
            <Sparkline points="2,16 16,13 30,14 46,8 62,4" color="var(--color-good)" />
          </div>
          <dd>{formatMoney(kpis.totalRevenue, 0)}</dd>
          <span className="runs__meta">
            Net profit {formatMoney(kpis.totalNetProfit, 0)} · Paid{' '}
            {formatMiles(kpis.totalPaidMiles)}
          </span>
        </div>

        <div
          className={`runs__stat runs__stat--${rateIsGood ? 'good' : 'warn'}`}
          title="Revenue ÷ total miles (paid + empty)"
        >
          <div className="runs__stat-head">
            <dt>All-in $/mi</dt>
            <Sparkline
              points={rateIsGood ? '2,15 18,12 34,10 48,7 62,4' : '2,6 18,9 34,11 48,14 62,15'}
              color={rateIsGood ? 'var(--color-good)' : 'var(--color-warn)'}
            />
          </div>
          <dd>{formatMoney(kpis.averageDollarsPerMile, 2)}</dd>
          <span className="runs__meta">
            {rateIsGood ? '↑' : '↓'} Target {formatMoney(targetRate, 2)} / mi
          </span>
        </div>

        <div className={`runs__stat runs__stat--${deadheadIsHigh ? 'danger' : 'good'}`}>
          <div className="runs__stat-head">
            <dt>Deadhead ratio</dt>
            <Sparkline
              points={deadheadIsHigh ? '2,16 18,14 34,11 48,7 62,3' : '2,5 18,8 34,12 48,14 62,16'}
              color={deadheadIsHigh ? 'var(--color-danger)' : 'var(--color-good)'}
            />
          </div>
          <dd>{kpis.deadheadPercent}%</dd>
          <span className="runs__meta">
            {deadheadIsHigh ? `↑ Above ${maxEmptyPercent}% limit` : '✓ Within target'} · Empty{' '}
            {formatMiles(kpis.totalEmptyMiles)}
          </span>
        </div>

        <div className="runs__stat runs__stat--good">
          <div className="runs__stat-head">
            <dt>Active trucks</dt>
            <Sparkline points="2,14 18,12 34,9 48,9 62,6" color="var(--color-primary)" />
          </div>
          <dd>{kpis.activeRunsCount}</dd>
          <span className="runs__meta">
            {kpis.completedRunsCount} completed
          </span>
        </div>
      </dl>

      <div className="runs__overview-grid">
        <section className="runs__block" aria-label="Dispatcher alerts">
          <h2 className="runs__subtitle">Dispatcher alerts & backhaul queue</h2>
          {kpis.runsNeedingBackhaul.length > 0 ? (
            <ul className="runs__loads">
              {kpis.runsNeedingBackhaul.map((item) => (
                <li className="runs__load runs__load--alert" key={item.run.id}>
                  {item.run.id === '214' && (
                    <p className="runs__demo-hint">
                      <strong>Start here:</strong> Truck 214 is returning empty → click Find
                      backhaul → assign a load → watch All-in $/mi jump.
                    </p>
                  )}
                  <div className="runs__load-head">
                    <div>
                      <span className="runs__badge runs__badge--warn">
                        <AlertTriangleIcon />
                        High empty return · {item.deadheadPercent}% deadhead
                      </span>
                      <p className="runs__truck">
                        {item.run.truck} · {item.run.driver}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="runs__button runs__button--small"
                      onClick={() => jumpToRun(item.run.id, true)}
                    >
                      Find backhaul
                    </button>
                  </div>
                  <p className="runs__meta">
                    Lane: {item.lane} · Empty{' '}
                    {item.emptyMiles === null
                      ? '—'
                      : formatMiles(item.emptyMiles)}{' '}
                    · All-in $/mi:{' '}
                    <span title="Revenue ÷ total miles (paid + empty)">
                      {item.dollarsPerMile === null
                        ? '—'
                        : `${formatMoney(item.dollarsPerMile, 2)} / mi`}
                    </span>
                  </p>
                  <div className="runs__inline-visual">
                    <MilesSplitBar paidMiles={item.paidMiles} emptyMiles={item.emptyMiles} />
                    <span className="runs__meta">
                      Paid {formatMiles(item.paidMiles)} vs Empty{' '}
                      {item.emptyMiles === null ? '—' : formatMiles(item.emptyMiles)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="runs__note">
              All active trucks are within the {maxEmptyPercent}% deadhead target.
              Backhaul loads are assigned and fleet All-in $/mi is{' '}
              {formatMoney(kpis.averageDollarsPerMile, 2)}.
            </p>
          )}
        </section>

        <FleetRouteMap runs={enrichedRuns} />
      </div>

      <section className="runs__block" aria-label="Fleet status board">
        <div className="runs__form-head">
          <h2 className="runs__subtitle">Fleet runs summary</h2>
          <button
            type="button"
            className="runs__button runs__button--ghost runs__button--small"
            onClick={() => {
              dispatch(openRun(null));
              dispatch(setActiveSection('board'));
            }}
          >
            View all runs
          </button>
        </div>
        <ul className="runs__list">
          {enrichedRuns.map((item) => (
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
                      {item.run.loads.length === 1
                        ? '1 load'
                        : `${item.run.loads.length} loads`}
                    </span>
                  </span>
                  <span className="runs__meta">{item.lane}</span>
                  {item.run.status !== 'Completed' &&
                    item.run.drivingHoursLeft !== null && (
                      <span className="runs__inline-visual">
                        <HosRing hoursLeft={item.run.drivingHoursLeft} />
                        <span className="runs__meta">
                          HOS remaining: {formatHours(item.run.drivingHoursLeft)}
                        </span>
                      </span>
                    )}
                </span>
                <span className="runs__row-side">
                  <RunStatusBadge status={item.run.status} />
                  <span className="runs__inline-visual">
                    <MilesSplitBar paidMiles={item.paidMiles} emptyMiles={item.emptyMiles} />
                    <span className="runs__meta">
                      Paid {formatMiles(item.paidMiles)} · Empty{' '}
                      {item.emptyMiles === null
                        ? '—'
                        : formatMiles(item.emptyMiles)}
                    </span>
                  </span>
                  <span
                    className="runs__meta"
                    title="Revenue ÷ total miles (paid + empty)"
                  >
                    {formatMoney(item.revenue, 0)}
                    {item.dollarsPerMile !== null
                      ? ` · All-in ${formatMoney(item.dollarsPerMile, 2)} / mi`
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

function Sparkline({ points, color }: { points: string; color: string }) {
  return (
    <svg width="64" height="20" viewBox="0 0 64 20" fill="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M8 2.2 14.4 13.5H1.6L8 2.2Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 6.5v3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="0.8" fill="currentColor" />
    </svg>
  );
}

export default Overview;
