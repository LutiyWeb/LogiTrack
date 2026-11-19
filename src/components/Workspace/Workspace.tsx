import '../Operations/Operations.scss';
import { useAppSelector } from '../../store/hooks';
import Fleet from '../Operations/Fleet';
import DriverPortal from '../Operations/DriverPortal';
import Integrations from '../Operations/Integrations';
import type { MenuItem } from '../../navigation';
import Chats from '../Chats/Chats';
import Drivers from '../Drivers/Drivers';
import Finance from '../Finance/Finance';
import Inbox from '../Inbox/Inbox';
import Planning from '../Planning/Planning';
import Account from './Account';
import Brokers from './Brokers';
import Overview from './Overview';
import Runs from './Runs';

type WorkspaceProps = {
  sectionId: MenuItem['id'];
  title: string;
};

function Workspace({ sectionId, title }: WorkspaceProps) {
  const sync = useAppSelector((state) => state.ui.workspaceSync);
  return (
    <section className="workspace" aria-label={title}>
      <p className="runs__meta">
        {sync === 'shared'
          ? 'Спільна демо-сесія · зміни синхронізуються між вкладками'
          : sync === 'error'
            ? 'Зміни ще не збережено на сервері · перевірте з’єднання'
            : 'Локальна демо-сесія · дані зберігаються лише в цьому браузері'}
      </p>
      {sectionId === 'board' && <Runs />}
      {sectionId === 'overview' && <Overview />}
      {sectionId === 'inbox' && <Inbox />}
      {sectionId === 'planning' && <Planning />}
      {sectionId === 'drivers' && <Drivers />}
      {sectionId === 'chats' && <Chats />}
      {sectionId === 'finance' && <Finance />}
      {sectionId === 'brokers' && <Brokers />}
      {sectionId === 'account' && <Account />}
      {sectionId === 'fleet' && <Fleet />}
      {sectionId === 'driverPortal' && <DriverPortal />}
      {sectionId === 'integrations' && <Integrations />}
    </section>
  );
}

export default Workspace;
