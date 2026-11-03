import userPhoto from '../../assets/user.svg';
import type { MenuItem } from '../../navigation';

type SidebarProps = {
  items: MenuItem[];
  activeId: string;
  isOpen: boolean;
  userName: string;
  userRole?: string;
  onSelect: (id: MenuItem['id']) => void;
  onToggle: () => void;
  onLogout?: () => void;
};

const icons = {
  overview: OverviewIcon,
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
  onSelect,
  onToggle,
  onLogout,
}: SidebarProps) {
  return (
    <aside className={isOpen ? 'sidebar' : 'sidebar is-collapsed'}>
      <div className="sidebar__brand">
        <div className="sidebar__logo" aria-hidden="true">
          <BrandTruckIcon />
        </div>
        <div className="sidebar__brand-info">
          <p className="sidebar__brand-title">LogiTrack</p>
          <p className="sidebar__brand-sub">TMS & Dispatch</p>
        </div>
        <button
          className="sidebar__toggle"
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
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
      <nav className="sidebar__nav" aria-label="Main">
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
            </button>
          );
        })}
      </nav>
      {onLogout && (
        <button
          className="sidebar__item sidebar__logout"
          type="button"
          onClick={onLogout}
        >
          <span className="sidebar__label">Sign out</span>
        </button>
      )}
    </aside>
  );
}

function BrandTruckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="5" width="9.5" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M11.5 7.5h3.2l2.3 2.5v3h-5.5v-5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="5.5" cy="14" r="1.8" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.2" cy="14" r="1.8" fill="var(--color-surface)" stroke="currentColor" strokeWidth="1.5" />
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
