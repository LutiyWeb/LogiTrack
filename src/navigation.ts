import { t } from './i18n';
import type { RolePermissions } from './store/slices/authSlice';

export type MenuItem = {
  id:
    | 'overview'
    | 'inbox'
    | 'planning'
    | 'board'
    | 'drivers'
    | 'chats'
    | 'brokers'
    | 'finance'
    | 'account'
    | 'fleet'
    | 'integrations'
    | 'driverPortal';
  label: string;
  /** Право роли, без которого пункт скрыт. */
  permission?: keyof RolePermissions;
  role?: 'driver';
};

export const menuItems: MenuItem[] = [
  { id: 'overview', label: t.nav.overview, permission: 'canViewOverview' },
  { id: 'inbox', label: t.nav.inbox, permission: 'canManageLoads' },
  { id: 'planning', label: t.nav.planning, permission: 'canManageLoads' },
  { id: 'board', label: t.nav.board },
  { id: 'drivers', label: t.nav.drivers, permission: 'canManageLoads' },
  { id: 'chats', label: t.nav.chats, permission: 'canManageLoads' },
  { id: 'brokers', label: t.nav.brokers, permission: 'canViewOverview' },
  { id: 'finance', label: t.nav.finance, permission: 'canViewFinance' },
  { id: 'fleet', label: 'Техніка та огляди', permission: 'canManageLoads' },
  { id: 'integrations', label: 'Інтеграції', permission: 'canViewFinance' },
  { id: 'driverPortal', label: 'Моє завдання та виплати', role: 'driver' },
  { id: 'account', label: t.nav.account },
];

/** Sections in the mobile bottom bar, in display order; the rest go to the ☰ menu. */
export const primaryMenuIds: MenuItem['id'][] = [
  'driverPortal',
  'overview',
  'inbox',
  'board',
  'chats',
  'planning',
];
