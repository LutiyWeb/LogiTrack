import type { MenuItem } from '../../navigation';
import Runs from './Runs';

type WorkspaceProps = {
  sectionId: MenuItem['id'];
  title: string;
};

function Workspace({ sectionId, title }: WorkspaceProps) {
  return (
    <section className="workspace" aria-label={title}>
      {sectionId === 'board' ? (
        <Runs />
      ) : (
        <h1 className="workspace__title">{title}</h1>
      )}
    </section>
  );
}

export default Workspace;
