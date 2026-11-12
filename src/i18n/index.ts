import type { BillingStatus, LoadStatus, RunStatus } from '../runs/demo';
import type { StatusFilter } from '../store/slices/uiSlice';
import { uk } from './uk';

export { plural } from './uk';

/** Словник інтерфейсу. Беремо тексти тільки звідси: `t.runs.title`. */
export const t = uk;

/** Локаль для дат і часу. */
export const DATE_LOCALE = 'uk-UA';

export const runStatusLabel = (status: RunStatus) => t.status.run[status];
export const loadStatusLabel = (status: LoadStatus) => t.status.load[status];
export const billingStatusLabel = (status: BillingStatus) => t.status.billing[status];
export const filterLabel = (filter: StatusFilter) => t.status.filter[filter];
export const customerKindLabel = (kind: 'Broker' | 'Shipper') => t.status.customerKind[kind];
