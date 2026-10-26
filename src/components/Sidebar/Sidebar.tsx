import userPhoto from '../../assets/user.svg';
import type { MenuItem } from '../../navigation';

type SidebarProps = {
  items: MenuItem[];
  activeId: string;
  isOpen: boolean;
  userName: string;
  onSelect: (id: MenuItem['id']) => void;
  onToggle: () => void;
};

const icons = {
  overview: OverviewIcon,
  board: BoardIcon,
  account: AccountIcon,
};

function Sidebar({
  items,
  activeId,
  isOpen,
  userName,
  onSelect,
  onToggle,
}: SidebarProps) {
  return (
    <aside className={isOpen ? 'sidebar' : 'sidebar is-collapsed'}>
      <div className="sidebar__user">
        <img className="sidebar__photo" src={userPhoto} alt="" />
        <p className="sidebar__name">{userName}</p>
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
    </aside>
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
