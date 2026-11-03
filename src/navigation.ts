export type MenuItem = {
  id: 'overview' | 'board' | 'brokers' | 'account';
  label: string;
};

export const menuItems: MenuItem[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'board', label: 'Runs' },
  { id: 'brokers', label: 'Brokers' },
  { id: 'account', label: 'Account' },
];
