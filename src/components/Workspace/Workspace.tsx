type WorkspaceProps = {
  title: string;
};

function Workspace({ title }: WorkspaceProps) {
  return (
    <section className="workspace" aria-label={title}>
      <h1 className="workspace__title">{title}</h1>
    </section>
  );
}

export default Workspace;
