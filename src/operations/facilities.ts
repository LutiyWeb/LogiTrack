import { runs, type Run, type Stop } from '../runs/seed';
import { stopZone } from './dispatch';
export type Facility = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  timeZone: string;
  contact: string;
  phone: string;
  instructions: string;
};
export function facilityKey(stop: Stop) {
  return [stop.city, stop.state, stop.address || stop.place]
    .map((value) => value.trim().toLowerCase())
    .join('|');
}
export function facilitiesFromRuns(items: Run[] = runs): Facility[] {
  const sites = new Map<string, Facility>();
  for (const run of items)
    for (const load of run.loads)
      for (const stop of [load.pickup, load.delivery]) {
        const id = facilityKey(stop);
        if (!sites.has(id))
          sites.set(id, {
            id,
            name: stop.place,
            address: stop.address || '',
            city: stop.city,
            state: stop.state,
            zip: stop.zip || '',
            timeZone: stop.timeZone || stopZone(stop.city, stop.state),
            contact: '',
            phone: '',
            instructions: '',
          });
      }
  return [...sites.values()];
}
