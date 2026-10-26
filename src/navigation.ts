export type MenuItem = {
  id: 'overview' | 'board' | 'account';
  label: string;
};

export const menuItems: MenuItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'board', label: 'Runs' },
  { id: 'account', label: 'Account' },
];
