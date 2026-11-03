import type { MenuItem } from '../../navigation';
import Account from './Account';
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
      {sectionId === 'account' && <Account />}
    </section>
  );
}

export default Workspace;
