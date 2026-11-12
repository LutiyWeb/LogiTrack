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
  return (
    <section className="workspace" aria-label={title}>
      {sectionId === 'board' && <Runs />}
      {sectionId === 'overview' && <Overview />}
      {sectionId === 'inbox' && <Inbox />}
      {sectionId === 'planning' && <Planning />}
      {sectionId === 'drivers' && <Drivers />}
      {sectionId === 'chats' && <Chats />}
      {sectionId === 'finance' && <Finance />}
      {sectionId === 'brokers' && <Brokers />}
      {sectionId === 'account' && <Account />}
    </section>
  );
}

export default Workspace;
