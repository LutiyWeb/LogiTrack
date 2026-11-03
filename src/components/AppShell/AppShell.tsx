import Sidebar from '../Sidebar/Sidebar';
import Workspace from '../Workspace/Workspace';
import { menuItems } from '../../navigation';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setActiveSection, toggleSidebar } from '../../store/slices/uiSlice';
import './AppShell.scss';

function AppShell() {
  const dispatch = useAppDispatch();
  const activeId = useAppSelector((state) => state.ui.activeSectionId);
  const isOpen = useAppSelector((state) => state.ui.isSidebarOpen);
  const dispatcherName = useAppSelector((state) => state.ui.dispatcherName);
  const active =
    menuItems.find((item) => item.id === activeId) ?? menuItems[0];

  return (
    <div className={isOpen ? 'shell' : 'shell is-collapsed'}>
      <Sidebar
        items={menuItems}
        activeId={active.id}
        isOpen={isOpen}
        userName={dispatcherName}
        onSelect={(sectionId) => dispatch(setActiveSection(sectionId))}
        onToggle={() => dispatch(toggleSidebar())}
      />
      <Workspace sectionId={active.id} title={active.label} />
    </div>
  );
}

export default AppShell;
