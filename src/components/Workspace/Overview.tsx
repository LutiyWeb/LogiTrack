import { formatHours, formatMiles, formatMoney } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectEnrichedRuns,
  selectFleetKpis,
} from '../../store/selectors/runsSelectors';
import { openRun } from '../../store/slices/runsSlice';
import { carrierProfile, setActiveSection } from '../../store/slices/uiSlice';

function Overview() {
  const dispatch = useAppDispatch();
  const kpis = useAppSelector(selectFleetKpis);
  const enrichedRuns = useAppSelector(selectEnrichedRuns);
  const targetRate = useAppSelector((state) => state.ui.targetRatePerMile);
  const maxEmptyPercent = useAppSelector((state) => state.ui.maxEmptyPercent);

  function jumpToRun(runId: string) {
    dispatch(openRun(runId));
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
        <div className="runs__stat runs__stat--blue">
          <dt>Fleet revenue</dt>
          <dd>{formatMoney(kpis.totalRevenue, 0)}</dd>
          <span className="runs__meta">
            Paid {formatMiles(kpis.totalPaidMiles)}
          </span>
        </div>
        <div className="runs__stat runs__stat--slate">
          <dt>Fleet $ per mile</dt>
          <dd>{formatMoney(kpis.averageDollarsPerMile, 2)}</dd>
          <span className="runs__meta">
            Target {formatMoney(targetRate, 2)} / mi
          </span>
        </div>
        <div className="runs__stat runs__stat--slate">
          <dt>Deadhead ratio</dt>
          <dd>{kpis.deadheadPercent}%</dd>
          <span className="runs__meta">
            Empty {formatMiles(kpis.totalEmptyMiles)} (max {maxEmptyPercent}%)
          </span>
        </div>
        <div className="runs__stat runs__stat--blue">
          <dt>Active trucks</dt>
          <dd>{kpis.activeRunsCount}</dd>
          <span className="runs__meta">
            {kpis.completedRunsCount} completed
          </span>
        </div>
      </dl>

      <section className="runs__block" aria-label="Dispatcher alerts">
        <h2 className="runs__subtitle">Dispatcher alerts & backhaul queue</h2>
        {kpis.runsNeedingBackhaul.length > 0 ? (
          <ul className="runs__loads">
            {kpis.runsNeedingBackhaul.map((item) => (
              <li className="runs__load" key={item.run.id}>
                <div className="runs__load-head">
                  <div>
                    <span className="runs__badge runs__badge--warn">
                      High empty return · {item.deadheadPercent}% deadhead
                    </span>
                    <p className="runs__truck">
                      {item.run.truck} · {item.run.driver}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="runs__button runs__button--small"
                    onClick={() => jumpToRun(item.run.id)}
                  >
                    Find backhaul
                  </button>
                </div>
                <p className="runs__meta">
                  Lane: {item.lane} · Empty{' '}
                  {item.emptyMiles === null
                    ? '—'
                    : formatMiles(item.emptyMiles)}{' '}
                  · Current{' '}
                  {item.dollarsPerMile === null
                    ? '—'
                    : `${formatMoney(item.dollarsPerMile, 2)} / mi`}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="runs__note">
            All active trucks are within the {maxEmptyPercent}% deadhead target.
            Backhaul loads are assigned and fleet rate per mile is{' '}
            {formatMoney(kpis.averageDollarsPerMile, 2)}.
          </p>
        )}
      </section>

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
                  <span className="runs__truck">
                    {item.run.truck} · {item.run.driver}
                  </span>
                  <span className="runs__meta">{item.lane}</span>
                  {item.run.drivingHoursLeft !== null && (
                    <span className="runs__meta">
                      HOS remaining: {formatHours(item.run.drivingHoursLeft)}
                    </span>
                  )}
                </span>
                <span className="runs__row-side">
                  <span className="runs__status">{item.run.status}</span>
                  <span className="runs__meta">
                    Paid {formatMiles(item.paidMiles)} · Empty{' '}
                    {item.emptyMiles === null
                      ? '—'
                      : formatMiles(item.emptyMiles)}
                  </span>
                  <span className="runs__meta">
                    {formatMoney(item.revenue, 0)}
                    {item.dollarsPerMile !== null
                      ? ` · ${formatMoney(item.dollarsPerMile, 2)} / mi`
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

export default Overview;
