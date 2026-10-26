import { useState } from 'react';
import Sidebar from '../Sidebar/Sidebar';
import Workspace from '../Workspace/Workspace';
import { menuItems, type MenuItem } from '../../navigation';
import './AppShell.scss';

function AppShell() {
  const [activeId, setActiveId] = useState<MenuItem['id']>('board');
  const [isOpen, setIsOpen] = useState(true);
  const active = menuItems.find((item) => item.id === activeId) ?? menuItems[0];

  return (
    <div className={isOpen ? 'shell' : 'shell is-collapsed'}>
      <Sidebar
        items={menuItems}
        activeId={active.id}
        isOpen={isOpen}
        userName="User Name"
        onSelect={setActiveId}
        onToggle={() => setIsOpen((open) => !open)}
      />
      <Workspace sectionId={active.id} title={active.label} />
    </div>
  );
}

export default AppShell;
