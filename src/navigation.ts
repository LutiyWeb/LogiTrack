export type MenuItem = {
  id: 'overview' | 'board' | 'account';
  label: string;
};

export const menuItems: MenuItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'board', label: 'Board' },
  { id: 'account', label: 'Account' },
];
