import { useEffect, useState } from 'react';
import { demoReplies, type BrokerTemplate } from '../../broker/broker';
import { messageTime } from '../../chats/chats';
import { t } from '../../i18n';
import type { Load } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { addBrokerMessage, markBrokerRead } from '../../store/slices/brokerSlice';
import { showToast } from '../../store/slices/toastsSlice';
import '../Chats/Chats.scss';

/** Задержка «ответа брокера» в демо. */
const DEMO_REPLY_MS = 3000;

const templateKeys = Object.keys(t.broker.templates) as BrokerTemplate[];

/** Переписка с брокером по одному грузу: письма, ответы и записи звонков. */
function BrokerThread({ load }: { load: Load }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const messages = useAppSelector((state) => state.broker.threads[load.id] ?? []);
  const [text, setText] = useState('');

  // Переписка открыта — новый ответ брокера сразу считается прочитанным.
  useEffect(() => {
    dispatch(markBrokerRead(load.id));
  }, [dispatch, load.id, messages.length]);
  const [template, setTemplate] = useState<BrokerTemplate | 'other'>('other');

  const author = user?.name ?? t.common.dispatcherFallback;
  const loadName = load.loadNumber
    ? t.runDetail.loadNumber(load.loadNumber)
    : load.bol
      ? t.runDetail.bol(load.bol)
      : load.customer;

  function send() {
    if (!text.trim()) return;
    if (!load.brokerEmail) {
      dispatch(showToast('error', t.broker.noEmailError));
      return;
    }
    dispatch(addBrokerMessage({ loadId: load.id, message: { kind: 'us', author, text: text.trim() } }));
    dispatch(showToast('success', t.broker.sent(load.customer)));
    const reply = demoReplies[template];
    setTimeout(() => {
      dispatch(addBrokerMessage({ loadId: load.id, message: { kind: 'broker', author: load.customer, text: reply } }));
      dispatch(showToast('info', t.broker.reply(load.customer)));
    }, DEMO_REPLY_MS);
    setText('');
    setTemplate('other');
  }

  function logCall() {
    if (!text.trim()) return;
    dispatch(
      addBrokerMessage({
        loadId: load.id,
        message: { kind: 'call', author, text: `${t.broker.callPrefix}${text.trim()}` },
      }),
    );
    dispatch(showToast('success', t.broker.callSaved));
    setText('');
  }

  return (
    <div className="runs__broker" aria-label={t.broker.openAria(load.customer)}>
      <p className={load.brokerEmail ? 'runs__meta' : 'runs__meta runs__meta--danger'}>
        {load.brokerEmail ? t.broker.to(load.brokerEmail) : t.broker.noEmail}
      </p>

      {messages.length === 0 ? (
        <p className="runs__meta">{t.broker.empty}</p>
      ) : (
        <ol className="chats__messages">
          {messages.map((message) => (
            <li
              key={message.id}
              className={`chats__bubble chats__bubble--${message.kind === 'us' ? 'dispatcher' : message.kind === 'call' ? 'call' : 'driver'}`}
            >
              <span className="chats__bubble-meta">
                {message.kind === 'call' ? t.broker.call : message.author} · {messageTime(message.at)}
              </span>
              {message.text}
            </li>
          ))}
        </ol>
      )}

      <div className="runs__load-actions" role="group" aria-label={t.broker.templatesAria}>
        {templateKeys.map((key) => (
          <button
            key={key}
            type="button"
            className="runs__chip"
            onClick={() => {
              setTemplate(key);
              setText(t.broker.templateText[key](loadName));
            }}
          >
            {t.broker.templates[key]}
          </button>
        ))}
      </div>

      <textarea
        className="runs__input runs__textarea"
        rows={3}
        placeholder={t.broker.placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="runs__load-actions runs__broker-actions">
        <button
          type="button"
          className="runs__button runs__button--secondary runs__button--small"
          disabled={!text.trim()}
          onClick={logCall}
        >
          {t.broker.logCall}
        </button>
        <button type="button" className="runs__button runs__button--small" disabled={!text.trim()} onClick={send}>
          {t.broker.send}
        </button>
      </div>
    </div>
  );
}

export default BrokerThread;
