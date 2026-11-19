import type { LoadDraft } from '../runs/seed';
import { normalizeIdentity } from '../../shared/loadIdentity.ts';
export { normalizeIdentity, sameLoad } from '../../shared/loadIdentity.ts';

export function draftChanges(before: LoadDraft, after: LoadDraft) {
  const keys = [
    ...new Set([...Object.keys(before), ...Object.keys(after)]),
  ] as (keyof LoadDraft)[];
  return keys.filter(
    (key) =>
      normalizeIdentity(String(before[key] ?? '')) !==
      normalizeIdentity(String(after[key] ?? '')),
  );
}
