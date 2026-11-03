import { useState } from 'react';
import { formatHours, formatMiles, formatMoney, readNumber } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectFilteredRuns,
  selectOpenRun,
  type EnrichedRun,
} from '../../store/selectors/runsSelectors';
import { selectPermissions } from '../../store/slices/authSlice';
import {
  createRun,
  openLoadModal,
  openRun,
} from '../../store/slices/runsSlice';
import { setStatusFilter, type StatusFilter } from '../../store/slices/uiSlice';
import { resetAllDemoData } from '../../store/store';
import AddLoadModal from './AddLoadForm';
import RunDetail from './RunDetail';
import { HosRing, MilesSplitBar, RunStatusBadge } from './RunVisuals';
import './Workspace.scss';

const filterOptions: StatusFilter[] = [
  'All',
  'In transit',
  'Empty return',
  'Planned',
  'Completed',
];

function matchesSearch(item: EnrichedRun, query: string) {
  if (!query) return true;
  const { run, lane, yard } = item;
  const haystacks = [
    run.truck,
    run.driver,
    lane,
    yard,
    ...run.loads.flatMap((l) => [
      l.customer,
      l.bol,
      l.commodity,
      l.pickup.city,
      l.delivery.city,
    ]),
  ];
  return haystacks.some((text) => text.toLowerCase().includes(query));
}

function Runs() {
  const dispatch = useAppDispatch();
  const filteredRuns = useAppSelector(selectFilteredRuns);
  const currentOpenRun = useAppSelector(selectOpenRun);
  const statusFilter = useAppSelector((state) => state.ui.statusFilter);
  const permissions = useAppSelector(selectPermissions);

  const [search, setSearch] = useState('');
  const [showNewRun, setShowNewRun] = useState(false);
  const [truck, setTruck] = useState('');
  const [driver, setDriver] = useState('');
  const [yardCity, setYardCity] = useState('Indianapolis');
  const [yardState, setYardState] = useState('IN');
  const [hours, setHours] = useState('11');

  if (currentOpenRun) return <RunDetail />;

  const query = search.trim().toLowerCase();
  const visibleRuns = filteredRuns.filter((item) => matchesSearch(item, query));

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
          {permissions.canManageLoads && (
            <>
              <button
                type="button"
                className="runs__button runs__button--small"
                onClick={() => dispatch(openLoadModal('214'))}
              >
                New load
              </button>
              <button
                type="button"
                className="runs__button runs__button--ghost runs__button--small"
                onClick={() => setShowNewRun((open) => !open)}
              >
                + New run
              </button>
            </>
          )}
          <button
            type="button"
            className="runs__button runs__button--ghost"
            onClick={() => resetAllDemoData(dispatch)}
          >
            Reset demo
          </button>
        </div>
      </div>

      <input
        className="runs__input"
        placeholder="Search truck, driver, city, customer or BOL..."
        aria-label="Search runs"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {showNewRun && permissions.canManageLoads && (
        <form
          className="runs__form"
          aria-label="New run"
          onSubmit={(e) => {
            e.preventDefault();
            if (!truck.trim() || !driver.trim()) return;
            dispatch(
              createRun({
                truck,
                driver,
                yardCity,
                yardState,
                drivingHoursLeft: readNumber(hours),
              }),
            );
            setShowNewRun(false);
            setTruck('');
            setDriver('');
          }}
        >
          <div className="runs__form-head">
            <h2 className="runs__subtitle">Dispatch a new truck run</h2>
          </div>
          <label className="runs__field">
            <span className="runs__label">Truck</span>
            <input className="runs__input" placeholder="Truck 412" value={truck} onChange={(e) => setTruck(e.target.value)} />
          </label>
          <label className="runs__field">
            <span className="runs__label">Driver</span>
            <input className="runs__input" placeholder="Sam Carter" value={driver} onChange={(e) => setDriver(e.target.value)} />
          </label>
          <label className="runs__field">
            <span className="runs__label">Yard city</span>
            <input className="runs__input" value={yardCity} onChange={(e) => setYardCity(e.target.value)} />
          </label>
          <label className="runs__field">
            <span className="runs__label">Yard state</span>
            <input className="runs__input" maxLength={2} value={yardState} onChange={(e) => setYardState(e.target.value.toUpperCase())} />
          </label>
          <label className="runs__field">
            <span className="runs__label">Shift hours left</span>
            <input className="runs__input" type="number" min="0" step="0.5" value={hours} onChange={(e) => setHours(e.target.value)} />
          </label>
          <div className="runs__form-submit">
            <button type="submit" className="runs__button" disabled={!truck.trim() || !driver.trim()}>
              Create run
            </button>
          </div>
        </form>
      )}

      <ul className="runs__list">
        {visibleRuns.map((item) => {
          const {
            run,
            paidMiles,
            emptyMiles: empty,
            dollarsPerMile: perMile,
            revenue: earned,
            deadheadPercent,
            needsBackhaul,
            yard,
          } = item;

          return (
            <li key={run.id}>
              <button
                className="runs__row"
                type="button"
                onClick={() => dispatch(openRun(run.id))}
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
                  <span className="runs__inline-visual">
                    <span className="runs__meta">
                      {run.driver} · {yard}
                    </span>
                    {run.status !== 'Completed' &&
                      run.drivingHoursLeft !== null && (
                        <span className="runs__inline-visual">
                          <HosRing hoursLeft={run.drivingHoursLeft} />
                          <span className="runs__meta">
                            {formatHours(run.drivingHoursLeft)} HOS
                          </span>
                        </span>
                      )}
                  </span>
                  <span className="runs__meta">{item.lane}</span>
                </span>
                <span className="runs__row-side">
                  <RunStatusBadge status={run.status} />
                  <span className="runs__inline-visual">
                    <MilesSplitBar paidMiles={paidMiles} emptyMiles={empty} />
                    <span
                      className="runs__meta"
                      title="Revenue ÷ total miles (paid + empty)"
                    >
                      Paid {formatMiles(paidMiles)} ·{' '}
                      {empty === null
                        ? 'Empty miles needed'
                        : `Empty ${formatMiles(empty)}`}
                      {perMile !== null && earned > 0
                        ? ` · All-in ${formatMoney(perMile, 2)} / mi`
                        : ''}
                    </span>
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

      {permissions.canManageLoads && <AddLoadModal defaultRunId="214" />}
    </div>
  );
}

export default Runs;
