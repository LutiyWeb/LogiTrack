import { useState } from 'react';
import { t } from '../../i18n';
import ChatsView from './ChatsView';
import '../Workspace/Workspace.scss';
import './Chats.scss';

export { MessageBubble } from './ChatsView';

/** Страница «Чати»: тот же ChatsView, что и в боковой панели. */
function Chats() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="runs">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">{t.chats.title}</h1>
          <p className="runs__meta">{t.chats.subtitle}</p>
        </div>
      </header>
      <ChatsView selected={selected} onSelect={setSelected} variant="page" />
    </div>
  );
}

export default Chats;
