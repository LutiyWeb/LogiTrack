import type { MenuItem } from './navigation';

/** URL segment of every section; "board" is the runs list, so it lives at /runs. */
export const sectionPaths: Record<MenuItem['id'], string> = {
  overview: 'overview',
  inbox: 'inbox',
  planning: 'planning',
  board: 'runs',
  drivers: 'drivers',
  chats: 'chats',
  brokers: 'customers',
  finance: 'finance',
  account: 'account',
  fleet: 'fleet',
  integrations: 'integrations',
  driverPortal: 'my-work',
};

export type RouteState = {
  sectionId: MenuItem['id'];
  /** Only the runs section has an open run in its address (/runs/214). */
  runId: string | null;
};

export function stateToPath({ sectionId, runId }: RouteState): string {
  const base = `/${sectionPaths[sectionId]}`;
  return sectionId === 'board' && runId
    ? `${base}/${encodeURIComponent(runId)}`
    : base;
}

/** Null when the address is not one of the app's pages. */
export function pathToState(pathname: string): RouteState | null {
  const [first, second, ...rest] = pathname.split('/').filter(Boolean);
  const entry = (
    Object.entries(sectionPaths) as [MenuItem['id'], string][]
  ).find(([, segment]) => segment === first);
  if (!entry || rest.length > 0) return null;
  const sectionId = entry[0];
  if (second !== undefined && sectionId !== 'board') return null;
  return {
    sectionId,
    runId: second !== undefined ? decodeURIComponent(second) : null,
  };
}
