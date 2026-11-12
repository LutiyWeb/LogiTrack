import { useState } from 'react';
import LoginScreen from '../Auth/LoginScreen';
import Sidebar from '../Sidebar/Sidebar';
import SupportDialog from '../Support/SupportDialog';
import Toasts from '../Toasts/Toasts';
import Workspace from '../Workspace/Workspace';
import { menuItems } from '../../navigation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  logout,
  selectCurrentUser,
  selectPermissions,
} from '../../store/slices/authSlice';
import { dueReminders } from '../../planning/planning';
import { selectUnreadChats } from '../../store/slices/chatsSlice';
import { selectNewInboxCount } from '../../store/slices/inboxSlice';
import { openRun } from '../../store/slices/runsSlice';
import { setActiveSection, toggleSidebar } from '../../store/slices/uiSlice';
import './AppShell.scss';

function AppShell() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const permissions = useAppSelector(selectPermissions);
  const activeId = useAppSelector((state) => state.ui.activeSectionId);
  const isOpen = useAppSelector((state) => state.ui.isSidebarOpen);
  const newInboxCount = useAppSelector(selectNewInboxCount);
  const unreadChats = useAppSelector(selectUnreadChats);
  const dueCount = useAppSelector((state) => dueReminders(state.planner.reminders));
  const [supportOpen, setSupportOpen] = useState(false);

  if (!currentUser) {
    return <LoginScreen />;
  }

  const visibleItems = menuItems.filter(
    (item) => !item.permission || permissions[item.permission],
  );
  const active =
    visibleItems.find((item) => item.id === activeId) ?? visibleItems[0];

  return (
    <div className={isOpen ? 'shell' : 'shell is-collapsed'}>
      <Sidebar
        items={visibleItems}
        activeId={active.id}
        isOpen={isOpen}
        userName={currentUser.name}
        userRole={currentUser.roleTitle}
        badges={{ inbox: newInboxCount, planning: dueCount, chats: unreadChats }}
        onSelect={(sectionId) => {
          if (sectionId === 'board') {
            dispatch(openRun(null));
          }
          dispatch(setActiveSection(sectionId));
        }}
        onToggle={() => dispatch(toggleSidebar())}
        onLogout={() => dispatch(logout())}
        onSupport={() => setSupportOpen(true)}
      />
      <Workspace sectionId={active.id} title={active.label} />
      <Toasts />
      {supportOpen && (
        <SupportDialog sectionLabel={active.label} onClose={() => setSupportOpen(false)} />
      )}
    </div>
  );
}

export default AppShell;
