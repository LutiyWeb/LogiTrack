import LoginScreen from '../Auth/LoginScreen';
import Sidebar from '../Sidebar/Sidebar';
import Workspace from '../Workspace/Workspace';
import { menuItems } from '../../navigation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  logout,
  selectCurrentUser,
  selectPermissions,
} from '../../store/slices/authSlice';
import { openRun } from '../../store/slices/runsSlice';
import { setActiveSection, toggleSidebar } from '../../store/slices/uiSlice';
import './AppShell.scss';

function AppShell() {
  const dispatch = useAppDispatch();
  const currentUser = useAppSelector(selectCurrentUser);
  const permissions = useAppSelector(selectPermissions);
  const activeId = useAppSelector((state) => state.ui.activeSectionId);
  const isOpen = useAppSelector((state) => state.ui.isSidebarOpen);

  if (!currentUser) {
    return <LoginScreen />;
  }

  const visibleItems = permissions.canViewOverview
    ? menuItems
    : menuItems.filter(
        (item) => item.id !== 'overview' && item.id !== 'brokers',
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
        onSelect={(sectionId) => {
          if (sectionId === 'board') {
            dispatch(openRun(null));
          }
          dispatch(setActiveSection(sectionId));
        }}
        onToggle={() => dispatch(toggleSidebar())}
        onLogout={() => dispatch(logout())}
      />
      <Workspace sectionId={active.id} title={active.label} />
    </div>
  );
}

export default AppShell;
