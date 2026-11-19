import { assessAssignment, draftFromLoad } from './dispatch';
import { fleetRoster, type Run } from '../runs/seed';
import type { RootState } from '../store/store';
export function reassignment(
  state: RootState,
  runId: string,
  truck: string,
  trailerId: string | undefined,
  reason: string,
) {
  const run = state.runs.runs.find((run) => run.id === runId);
  const roster = fleetRoster.find((item) => item.truck === truck);
  if (!run || !roster || !reason.trim() || reason.length > 500)
    return { error: 'Оберіть рейс, тягач і вкажіть причину перепризначення.' };
  if (
    run.status !== 'Planned' ||
    run.loads.some((load) => load.status !== 'Assigned') ||
    state.runs.invoices.some((invoice) => invoice.runId === run.id)
  )
    return {
      error:
        'Перепризначити можна лише запланований рейс без виконаних вантажів і рахунків.',
    };
  const others = state.runs.runs.filter((item) => item.id !== runId);
  if (
    others.some(
      (item) =>
        item.status !== 'Completed' &&
        (item.truck === truck || item.driver === roster.driver),
    )
  )
    return { error: 'Обраний тягач або водій зайнятий іншим активним рейсом.' };
  let simulated: Run = {
    ...run,
    truck,
    driver: roster.driver,
    drivingHoursLeft: roster.drivingHoursLeft,
    trailerId,
    loads: [],
  };
  let selectedTrailer = trailerId;
  for (const load of run.loads) {
    const draft = draftFromLoad(load);
    const assessment = assessAssignment(
      simulated.loads.length ? [...others, simulated] : others,
      state.operations.assets,
      state.runs.manualMiles,
      {
        target: simulated.loads.length
          ? { kind: 'existing', runId: simulated.id }
          : {
              kind: 'new',
              runId,
              truck: roster.truck,
              driver: roster.driver,
              drivingHoursLeft: roster.drivingHoursLeft,
            },
        draft,
        trailerId: selectedTrailer,
        legMiles: {},
        author: state.auth.currentUser?.name ?? '',
        roleTitle: '',
      },
      state.operations.eld,
    );
    if (assessment.errors.length) return { error: assessment.errors[0] };
    selectedTrailer = assessment.trailer?.id;
    simulated = {
      ...simulated,
      trailerId: selectedTrailer,
      loads: [...simulated.loads, load],
    };
  }
  return {
    error: '',
    driver: roster.driver,
    drivingHoursLeft: roster.drivingHoursLeft,
    trailerId: selectedTrailer,
  };
}
