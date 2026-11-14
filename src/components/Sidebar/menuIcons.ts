import type { JSX } from 'react';
import type { MenuItem } from '../../navigation';
import {
  AccountIcon,
  BoardIcon,
  BrokersIcon,
  ChatsIcon,
  DriversIcon,
  FinanceIcon,
  InboxIcon,
  OverviewIcon,
  PlanningIcon,
} from './icons';

export const menuIcons: Record<MenuItem['id'], () => JSX.Element> = {
  overview: OverviewIcon,
  inbox: InboxIcon,
  planning: PlanningIcon,
  drivers: DriversIcon,
  chats: ChatsIcon,
  finance: FinanceIcon,
  board: BoardIcon,
  brokers: BrokersIcon,
  account: AccountIcon,
};
