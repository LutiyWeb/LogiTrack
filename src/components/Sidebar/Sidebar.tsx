import userPhoto from '../../assets/user.svg';
import { t } from '../../i18n';
import type { MenuItem } from '../../navigation';

type SidebarProps = {
  items: MenuItem[];
  activeId: string;
  isOpen: boolean;
  userName: string;
  userRole?: string;
  /** Счётчики рядом с пунктами меню. */
  badges?: Partial<Record<MenuItem['id'], number>>;
  onSelect: (id: MenuItem['id']) => void;
  onToggle: () => void;
  onLogout?: () => void;
  onSupport?: () => void;
};

const icons = {
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

function Sidebar({
  items,
  activeId,
  isOpen,
  userName,
  userRole,
  badges = {},
  onSelect,
  onToggle,
  onLogout,
  onSupport,
}: SidebarProps) {
  return (
    <aside className={isOpen ? 'sidebar' : 'sidebar is-collapsed'}>
      <div className="sidebar__brand">
        <div className="sidebar__logo" aria-hidden="true">
          <BrandMark />
        </div>
        <div className="sidebar__brand-info">
          <p className="sidebar__brand-title">{t.app.title}</p>
          <p className="sidebar__brand-sub">{t.app.subtitle}</p>
        </div>
        <button
          className="sidebar__toggle"
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? t.nav.collapse : t.nav.expand}
          onClick={onToggle}
        >
          <ChevronIcon direction={isOpen ? 'left' : 'right'} />
        </button>
      </div>
      <div className="sidebar__user">
        <img className="sidebar__photo" src={userPhoto} alt="" />
        <div className="sidebar__user-info">
          <p className="sidebar__name">{userName}</p>
          {userRole && <p className="sidebar__role">{userRole}</p>}
        </div>
      </div>
      <nav className="sidebar__nav" aria-label={t.nav.ariaLabel}>
        {items.map((item) => {
          const Icon = icons[item.id];

          return (
            <button
              key={item.id}
              className={
                item.id === activeId
                  ? 'sidebar__item is-active'
                  : 'sidebar__item'
              }
              type="button"
              aria-current={item.id === activeId ? 'page' : undefined}
              onClick={() => onSelect(item.id)}
            >
              <Icon />
              <span className="sidebar__label">{item.label}</span>
              {!!badges[item.id] && (
                <span className="sidebar__count">{badges[item.id]}</span>
              )}
            </button>
          );
        })}
      </nav>
      {onSupport && (
        <button className="sidebar__item sidebar__support" type="button" onClick={onSupport}>
          <SupportIcon />
          <span className="sidebar__label">{t.support.nav}</span>
        </button>
      )}
      {onLogout && (
        <button
          className="sidebar__item sidebar__logout"
          type="button"
          onClick={onLogout}
        >
          <span className="sidebar__label">{t.nav.signOut}</span>
        </button>
      )}
    </aside>
  );
}

/** Знак LogiTrack: маршрут от точки отправления к точке назначения (как в favicon). */
function BrandMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M9.5 22.5C9.5 15 22.5 17 22.5 9.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <circle cx="9.5" cy="22.5" r="3.9" fill="var(--color-good-fill)" />
      <circle cx="22.5" cy="9.5" r="3.9" fill="currentColor" />
    </svg>
  );
}

function OverviewIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="3" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="3" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="11" y="11" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M3 11.5 5 4.5h10l2 7v3.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15v-3.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M3 11.5h4l1 2h4l1-2h4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function DriversIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="10" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3.8 8.5h4.7M11.5 8.5h4.7M10 11.5v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function FinanceIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 16V9M8.5 16V5M13 16v-5M17 16V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3 16.5h15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChatsIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 4.5h12a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1H8l-3.5 2.5V14H4a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SupportIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 8a2 2 0 1 1 2.8 1.8c-.5.2-.8.7-.8 1.2v.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14" r="0.9" fill="currentColor" />
    </svg>
  );
}

function PlanningIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="4.5" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8.5h14M7 3v3M13 3v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function BoardIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="3" y="3.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 8h14" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BrokersIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3.5 7.5h13v8a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-8Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 7.5V5.5A1.5 1.5 0 0 1 8.5 4h3A1.5 1.5 0 0 1 13 5.5v2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function AccountIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M4.5 16c.8-2.6 2.8-4 5.5-4s4.7 1.4 5.5 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d={direction === 'left' ? 'M12 5.5 7.5 10 12 14.5' : 'M8 5.5 12.5 10 8 14.5'}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default Sidebar;
