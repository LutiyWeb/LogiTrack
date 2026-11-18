import { useEffect, useState } from 'react';
import { useModalDialog } from '../../hooks/useModalDialog';
import userPhoto from '../../assets/user.svg';
import { t } from '../../i18n';
import { primaryMenuIds, type MenuItem } from '../../navigation';
import { ChatsIcon, LogoutIcon, SupportIcon } from '../Sidebar/icons';
import { menuIcons } from '../Sidebar/menuIcons';
import './MobileNav.scss';

type MobileNavProps = {
  items: MenuItem[];
  activeId: MenuItem['id'];
  title: string;
  userName: string;
  userRole?: string;
  badges?: Partial<Record<MenuItem['id'], number>>;
  onSelect: (id: MenuItem['id']) => void;
  onLogout: () => void;
  onSupport: () => void;
  /** Открывает боковую панель чатов (кнопка в верхней панели). */
  onOpenChats?: (opener: HTMLElement) => void;
  unreadChats?: number;
};

/** Mobile navigation (≤ 768px): fixed top bar with ☰, fixed bottom bar with the main sections. */
function MobileNav({
  items,
  activeId,
  title,
  userName,
  userRole,
  badges = {},
  onSelect,
  onLogout,
  onSupport,
  onOpenChats,
  unreadChats = 0,
}: MobileNavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // Фокус уходит в шторку и возвращается на ☰ после закрытия.
  const panelRef = useModalDialog<HTMLDivElement>(menuOpen);

  const primary = primaryMenuIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is MenuItem => Boolean(item));
  const secondary = items.filter((item) => !primaryMenuIds.includes(item.id));
  const secondaryHasBadge = secondary.some((item) => Boolean(badges[item.id]));

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const select = (id: MenuItem['id']) => {
    setMenuOpen(false);
    onSelect(id);
  };

  return (
    <>
      <header className="mobile-bar">
        <button
          type="button"
          className="mobile-bar__menu"
          data-modal-return
          aria-label={t.nav.openMenu}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <MenuIcon />
          {secondaryHasBadge && <span className="mobile-bar__dot" aria-hidden="true" />}
        </button>
        <p className="mobile-bar__title">{title}</p>
        {onOpenChats ? (
          <button type="button" className="mobile-bar__chat" aria-label={t.chats.openPanel} onClick={(event) => onOpenChats(event.currentTarget)}>
            <ChatsIcon />
            {unreadChats > 0 && <span className="mobile-bar__chat-count">{unreadChats}</span>}
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
      </header>

      <nav className="mobile-tabs" aria-label={t.nav.bottomNav}>
        {primary.map((item) => {
          const Icon = menuIcons[item.id];
          const isActive = item.id === activeId;
          return (
            <button
              key={item.id}
              type="button"
              className={isActive ? 'mobile-tabs__item is-active' : 'mobile-tabs__item'}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
              onClick={() => select(item.id)}
            >
              <span className="mobile-tabs__icon">
                <Icon />
                {!!badges[item.id] && <span className="mobile-tabs__count">{badges[item.id]}</span>}
              </span>
              <span className="mobile-tabs__label">{t.nav.short[item.id] ?? item.label}</span>
            </button>
          );
        })}
      </nav>

      {menuOpen && (
        <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label={t.nav.moreMenu}>
          <button
            type="button"
            className="mobile-drawer__backdrop"
            aria-label={t.nav.closeMenu}
            onClick={() => setMenuOpen(false)}
          />
          <div ref={panelRef} tabIndex={-1} className="mobile-drawer__panel">
            <div className="mobile-drawer__head">
              <img className="mobile-drawer__avatar" src={userPhoto} alt="" />
              <div className="mobile-drawer__user">
                <p className="mobile-drawer__name">{userName}</p>
                {userRole && <p className="mobile-drawer__role">{userRole}</p>}
              </div>
              <button
                type="button"
                className="mobile-drawer__close"
                aria-label={t.nav.closeMenu}
                onClick={() => setMenuOpen(false)}
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="mobile-drawer__nav" aria-label={t.nav.moreMenu}>
              {secondary.map((item) => {
                const Icon = menuIcons[item.id];
                const isActive = item.id === activeId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={isActive ? 'mobile-drawer__item is-active' : 'mobile-drawer__item'}
                    aria-current={isActive ? 'page' : undefined}
                    onClick={() => select(item.id)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                    {!!badges[item.id] && <span className="mobile-drawer__count">{badges[item.id]}</span>}
                  </button>
                );
              })}
            </nav>
            <div className="mobile-drawer__footer">
              <button
                type="button"
                className="mobile-drawer__item"
                onClick={() => {
                  setMenuOpen(false);
                  onSupport();
                }}
              >
                <SupportIcon />
                <span>{t.support.nav}</span>
              </button>
              <button
                type="button"
                className="mobile-drawer__item mobile-drawer__logout"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
              >
                <LogoutIcon />
                <span>{t.nav.signOut}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
      <path d="M4 6.5h14M4 11h14M4 15.5h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export default MobileNav;
