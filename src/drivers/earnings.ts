import { SEED_NOW } from '../runs/seed';
import type { EnrichedRun } from '../store/selectors/runsSelectors';

export type MileageEntry = {
  id: string;
  runId: string;
  loadId?: string;
  kind: 'empty' | 'loaded' | 'return';
  from: string;
  to: string;
  miles: number | null;
  confirmed: boolean;
  at: string;
  basis: string;
};

/** A future appointment or a planned return is never a payable completion. */
export function mileageEntries(
  item: EnrichedRun,
  now = SEED_NOW,
): MileageEntry[] {
  const { run, legs } = item;
  const inPast = (date: string) =>
    !!date &&
    Number.isFinite(Date.parse(date)) &&
    Date.parse(date) <= Date.parse(now);
  const entries: MileageEntry[] = [];
  run.loads.forEach((load, index) => {
    const leg = legs[index];
    if (leg)
      entries.push({
        id: `${run.id}:${load.id}:empty`,
        runId: run.id,
        loadId: load.id,
        kind: 'empty',
        from: leg.from,
        to: leg.to,
        miles: leg.miles,
        confirmed:
          load.status !== 'Assigned' &&
          inPast(load.pickupConfirmedAt ?? load.pickup.at),
        at: load.pickupConfirmedAt ?? load.pickup.at,
        basis: 'Прибуття на завантаження підтверджено статусом вантажу',
      });
    entries.push({
      id: `${run.id}:${load.id}:loaded`,
      runId: run.id,
      loadId: load.id,
      kind: 'loaded',
      from: `${load.pickup.city}, ${load.pickup.state}`,
      to: `${load.delivery.city}, ${load.delivery.state}`,
      miles: load.miles,
      confirmed:
        load.status === 'Delivered' &&
        inPast(load.deliveredAt ?? load.delivery.at),
      at: load.deliveredAt ?? load.delivery.at,
      basis: 'Доставку вантажу підтверджено',
    });
  });
  const last = run.loads.at(-1);
  const leg = legs.at(-1);
  if (last && leg)
    entries.push({
      id: `${run.id}:return`,
      runId: run.id,
      kind: 'return',
      from: leg.from,
      to: leg.to,
      miles: leg.miles,
      confirmed:
        run.status === 'Completed' &&
        run.loads.every(
          (load) => load.status === 'Delivered' && inPast(load.delivery.at),
        ),
      at: run.location?.at ?? last.delivery.at,
      basis: 'Повернення на базу підтверджено завершенням рейсу',
    });
  return entries;
}

export function weekMileageEntries(items: EnrichedRun[], now = SEED_NOW) {
  const current = new Date(`${now.slice(0, 10)}T00:00:00Z`);
  current.setUTCDate(current.getUTCDate() - ((current.getUTCDay() + 6) % 7));
  const firstDay = current.toISOString().slice(0, 10);
  return items
    .flatMap((item) => mileageEntries(item, now))
    .filter(
      (entry) =>
        entry.confirmed &&
        entry.at.slice(0, 10) >= firstDay &&
        entry.at.slice(0, 10) <= now.slice(0, 10),
    );
}
