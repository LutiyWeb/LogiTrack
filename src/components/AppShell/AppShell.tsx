import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { useRouteSync } from '../../hooks/useRouteSync';
import ChatPanel from '../Chats/ChatPanel';
import { ChatPanelContext } from '../Chats/ChatPanelContext';
import { ChatsIcon } from '../Sidebar/icons';
import LoginScreen from '../Auth/LoginScreen';
import MobileNav from '../MobileNav/MobileNav';
import Sidebar from '../Sidebar/Sidebar';
import SupportDialog from '../Support/SupportDialog';
import Toasts from '../Toasts/Toasts';
import Workspace from '../Workspace/Workspace';
import { t } from '../../i18n';
import { menuItems, type MenuItem } from '../../navigation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  logout,
  selectCurrentUser,
  selectPermissions,
} from '../../store/slices/authSlice';
import { dueReminders } from '../../planning/planning';
import { selectUnreadChats } from '../../store/slices/chatsSlice';
import { selectWaitingInboxCount } from '../../store/slices/inboxSlice';
import { openRun } from '../../store/slices/runsSlice';
import { selectRunIds } from '../../store/selectors/runsSelectors';
import { setActiveSection, toggleSidebar } from '../../store/slices/uiSlice';
import './AppShell.scss';

function AppShell() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const permissions = useAppSelector(selectPermissions);
  const activeId = useAppSelector((state) => state.ui.activeSectionId);
  const isOpen = useAppSelector((state) => state.ui.isSidebarOpen);
  const waitingInboxCount = useAppSelector(selectWaitingInboxCount);
  const unreadChats = useAppSelector(selectUnreadChats);
  const dueCount = useAppSelector((state) =>
    dueReminders(state.planner.reminders),
  );
  const [supportOpen, setSupportOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatDriver, setChatDriver] = useState<string | null>(null);
  const chatOpener = useRef<HTMLElement | null>(null);
  const openChat = useCallback((driver?: string, opener?: HTMLElement | null) => {
    chatOpener.current = opener ?? (document.activeElement as HTMLElement | null);
    setChatDriver(driver ?? null);
    setChatOpen(true);
  }, []);
  const closeChat = useCallback(() => setChatOpen(false), []);
  // После закрытия панели фокус возвращается на кнопку, которая её открыла.
  const wasChatOpen = useRef(false);
  useEffect(() => {
    if (wasChatOpen.current && !chatOpen && chatOpener.current?.isConnected) {
      chatOpener.current.focus({ preventScroll: true });
    }
    wasChatOpen.current = chatOpen;
  }, [chatOpen]);
  const isMobile = useIsMobile();
  const openRunId = useAppSelector((state) => state.runs.openRunId);
  const runIds = useAppSelector(selectRunIds);

  const visibleItems = useMemo(
    () => menuItems.filter((item) => !item.permission || permissions[item.permission]),
    [permissions],
  );
  const allowedSections = useMemo(() => visibleItems.map((item) => item.id), [visibleItems]);
  const active = visibleItems.find((item) => item.id === activeId) ?? visibleItems[0];

  useRouteSync({
    enabled: Boolean(currentUser),
    sectionId: active?.id ?? 'board',
    openRunId,
    allowedSections,
    runIds,
    lockedRunId: currentUser?.assignedRunId ?? null,
  });

  if (!currentUser) {
    return <LoginScreen />;
  }

  const badges = {
    inbox: waitingInboxCount,
    planning: dueCount,
    chats: unreadChats,
  };
  const selectSection = (sectionId: MenuItem['id']) => {
    if (sectionId === 'board') {
      dispatch(openRun(null));
    }
    dispatch(setActiveSection(sectionId));
    if (isMobile) window.scrollTo(0, 0);
  };

  // Панель чатов — для тех, у кого есть раздел «Чати»; на самой странице «Чати» кнопка не нужна.
  const canChat = permissions.canManageLoads;

  return (
    <ChatPanelContext.Provider value={{ openChat }}>
    <div className={isOpen ? 'shell' : 'shell is-collapsed'}>
      {!isMobile && (
        <Sidebar
          items={visibleItems}
          activeId={active.id}
          isOpen={isOpen}
          userName={currentUser.name}
          userRole={currentUser.roleTitle}
          badges={badges}
          onSelect={selectSection}
          onToggle={() => dispatch(toggleSidebar())}
          onLogout={() => dispatch(logout())}
          onSupport={() => setSupportOpen(true)}
        />
      )}
      {isMobile && (
        <MobileNav
          items={visibleItems}
          activeId={active.id}
          title={active.label}
          userName={currentUser.name}
          userRole={currentUser.roleTitle}
          badges={badges}
          onSelect={selectSection}
          onLogout={() => dispatch(logout())}
          onSupport={() => setSupportOpen(true)}
          onOpenChats={canChat ? (opener) => openChat(undefined, opener) : undefined}
          unreadChats={unreadChats}
        />
      )}
      <Workspace sectionId={active.id} title={active.label} />
      <Toasts />
      {canChat && !isMobile && active.id !== 'chats' && (
        <button
          type="button"
          className="chat-launcher"
          aria-label={t.chats.openPanel}
          onClick={(event) => openChat(undefined, event.currentTarget)}
        >
          <ChatsIcon />
          {unreadChats > 0 && <span className="chat-launcher__count">{unreadChats}</span>}
        </button>
      )}
      {chatOpen && canChat && (
        <ChatPanel selected={chatDriver} onSelect={setChatDriver} onClose={closeChat} />
      )}
      {supportOpen && (
        <SupportDialog
          sectionLabel={active.label}
          onClose={() => setSupportOpen(false)}
        />
      )}
    </div>
    </ChatPanelContext.Provider>
  );
}

export default AppShell;
