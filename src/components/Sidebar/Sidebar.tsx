import userPhoto from '../../assets/user.svg';
import { t } from '../../i18n';
import type { MenuItem } from '../../navigation';
import { BrandMark, ChevronIcon, LogoutIcon, SupportIcon } from './icons';
import { menuIcons as icons } from './menuIcons';

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
              // В свёрнутом меню подпись скрыта: имя и подсказка нужны самой кнопке.
              aria-label={isOpen ? undefined : item.label}
              title={isOpen ? undefined : item.label}
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
        <button
          className="sidebar__item sidebar__support"
          type="button"
          aria-label={isOpen ? undefined : t.support.nav}
          title={isOpen ? undefined : t.support.nav}
          onClick={onSupport}
        >
          <SupportIcon />
          <span className="sidebar__label">{t.support.nav}</span>
        </button>
      )}
      {onLogout && (
        <button
          className="sidebar__item sidebar__logout"
          type="button"
          aria-label={isOpen ? undefined : t.nav.signOut}
          title={isOpen ? undefined : t.nav.signOut}
          onClick={onLogout}
        >
          <LogoutIcon />
          <span className="sidebar__label">{t.nav.signOut}</span>
        </button>
      )}
    </aside>
  );
}

export default Sidebar;
