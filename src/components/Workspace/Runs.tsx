import { useState } from 'react';
import { filterLabel, t } from '../../i18n';
import { formatHours, formatMiles, formatMoney } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectFilteredRuns,
  selectOpenRun,
  type EnrichedRun,
} from '../../store/selectors/runsSelectors';
import { openRun } from '../../store/slices/runsSlice';
import { setStatusFilter, type StatusFilter } from '../../store/slices/uiSlice';
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

  const [search, setSearch] = useState('');

  if (currentOpenRun) return <RunDetail />;

  const query = search.trim().toLowerCase();
  const visibleRuns = filteredRuns.filter((item) => matchesSearch(item, query));

  return (
    <div className="runs">
      <div className="runs__toolbar">
        <h1 className="workspace__title">{t.runs.title}</h1>
        <div className="runs__toolbar-actions">
          <div
            className="runs__filters runs__filters--scroll"
            role="group"
            aria-label={t.runs.filterAria}
          >
            {filterOptions.map((option) => (
              <button
                key={option}
                type="button"
                className={
                  statusFilter === option
                    ? 'runs__filter is-active'
                    : 'runs__filter'
                }
                onClick={(event) => {
                  dispatch(setStatusFilter(option));
                  event.currentTarget.scrollIntoView?.({
                    block: 'nearest',
                    inline: 'nearest',
                    behavior: 'smooth',
                  });
                }}
              >
                {filterLabel(option)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <input
        className="runs__input"
        placeholder={t.runs.searchPlaceholder}
        aria-label={t.runs.searchAria}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {visibleRuns.length === 0 && (
        <div className="runs__empty" role="status">
          <strong>{t.runs.searchEmpty}</strong>
          <span>
            {query ? t.runs.searchEmptyFor(search.trim()) : t.runs.filterEmpty}
          </span>
          {query && (
            <button
              type="button"
              className="runs__button runs__button--secondary runs__button--small"
              onClick={() => setSearch('')}
            >
              {t.runs.clearSearch}
            </button>
          )}
        </div>
      )}

      <ul className="runs__list runs__list--cards">
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
                        {t.runs.backhaulNeeded(deadheadPercent ?? 0)}
                      </span>
                    )}
                    {!needsBackhaul &&
                      run.loads.length > 1 &&
                      run.status !== 'Completed' && (
                        <span className="runs__badge runs__badge--ok">
                          {t.runs.backhaulAssigned}
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
                            {t.runs.hosShort(formatHours(run.drivingHoursLeft))}
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
                    <span className="runs__meta" title={t.common.allInTooltip}>
                      {t.common.paidMiles(formatMiles(paidMiles))} ·{' '}
                      {empty === null
                        ? t.runs.emptyNeeded
                        : t.common.emptyMiles(formatMiles(empty))}
                      {perMile !== null && earned > 0
                        ? ` · ${t.common.allIn(formatMoney(perMile, 2))}`
                        : ''}
                    </span>
                  </span>
                  <span className="runs__meta">
                    {t.common.loadsCount(run.loads.length)} ·{' '}
                    {formatMoney(earned, 0)}
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
