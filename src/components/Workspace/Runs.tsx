import { formatMiles, formatMoney } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectFilteredRuns, selectOpenRun } from '../../store/selectors/runsSelectors';
import { openRun } from '../../store/slices/runsSlice';
import { setStatusFilter, type StatusFilter } from '../../store/slices/uiSlice';
import { resetAllDemoData } from '../../store/store';
import RunDetail from './RunDetail';
import './Workspace.scss';

const filterOptions: StatusFilter[] = ['All', 'In transit', 'Planned', 'Completed'];

function Runs() {
  const dispatch = useAppDispatch();
  const filteredRuns = useAppSelector(selectFilteredRuns);
  const currentOpenRun = useAppSelector(selectOpenRun);
  const statusFilter = useAppSelector((state) => state.ui.statusFilter);

  if (currentOpenRun) return <RunDetail />;

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
                className={statusFilter === option ? 'runs__filter is-active' : 'runs__filter'}
                onClick={() => dispatch(setStatusFilter(option))}
              >
                {option}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="runs__button runs__button--ghost"
            onClick={() => resetAllDemoData(dispatch)}
          >
            Reset demo
          </button>
        </div>
      </div>
      <ul className="runs__list">
        {filteredRuns.map((item) => {
          const { run, emptyMiles: empty, dollarsPerMile: perMile, revenue: earned, deadheadPercent, needsBackhaul, yard } = item;

          return (
            <li key={run.id}>
              <button className="runs__row" type="button" onClick={() => dispatch(openRun(run.id))}>
                <span className="runs__row-main">
                  <span className="runs__row-title">
                    <span className="runs__truck">{run.truck}</span>
                    {needsBackhaul && (
                      <span className="runs__badge runs__badge--warn">
                        Backhaul needed · {deadheadPercent}% empty
                      </span>
                    )}
                    {!needsBackhaul && run.loads.length > 1 && run.status !== 'Completed' && (
                      <span className="runs__badge runs__badge--ok">Backhaul assigned</span>
                    )}
                  </span>
                  <span className="runs__meta">{run.driver} · {yard}</span>
                  <span className="runs__meta">{item.lane}</span>
                </span>
                <span className="runs__row-side">
                  <span className="runs__status">{run.status}</span>
                  <span className="runs__meta">
                    {empty === null ? 'Empty miles needed' : `Empty ${formatMiles(empty)}`}
                    {perMile !== null && earned > 0 ? ` · ${formatMoney(perMile, 2)} / mi` : ''}
                  </span>
                  <span className="runs__meta">
                    {run.loads.length === 1 ? '1 load' : `${run.loads.length} loads`} · {formatMoney(earned, 0)}
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

export default Runs;
