import { useState } from 'react';
import { t } from '../../i18n';
import {
  emptyManualLoad,
  intakePdf,
  loadInboxPdf,
  pdfCache,
  sampleFiles,
  sampleUrl,
  type InboxLoad,
} from '../../inbox/inbox';
import { isPdfFile, readSource, type RateConSource } from '../../ratecon/files';
import { formatMiles, formatMoney, formatWhen, placeName, readNumber } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addInboxLoad, setInboxStatus } from '../../store/slices/inboxSlice';
import { showToast } from '../../store/slices/toastsSlice';
import { openRun } from '../../store/slices/runsSlice';
import { setActiveSection } from '../../store/slices/uiSlice';
import RateConImport, { type RateConDialogState } from '../RateCon/RateConImport';
import '../Workspace/Workspace.scss';

type Filter = 'waiting' | 'tentative' | 'assigned' | 'rejected';

const filterStatus = { tentative: 'Tentative', assigned: 'Assigned', rejected: 'Rejected' } as const;

const REQUIRED: (keyof InboxLoad['draft'])[] = [
  'customer',
  'rate',
  'pickupCity',
  'pickupState',
  'deliveryCity',
  'deliveryState',
  'miles',
];

const statusTone: Record<InboxLoad['status'], string> = {
  Tentative: '',
  New: 'warn',
  Ready: 'ok',
  Assigned: '',
  Rejected: '',
};

function Inbox() {
  const dispatch = useAppDispatch();
  const items = useAppSelector((state) => state.inbox.items);
  const [filter, setFilter] = useState<Filter>('waiting');
  const [dialog, setDialog] = useState<RateConDialogState>(null);
  const [emailCount, setEmailCount] = useState(0);
  const [receiving, setReceiving] = useState(false);
  const [draggingFile, setDraggingFile] = useState(false);

  const waiting = items.filter((item) => item.status === 'New' || item.status === 'Ready');
  const visible =
    filter === 'waiting'
      ? waiting
      : items.filter((item) => item.status === filterStatus[filter]);

  // Новый PDF сразу становится грузом в очереди и открывается на проверку.
  async function addPdf(source: RateConSource, meta: Partial<InboxLoad> = {}) {
    const item = await intakePdf(source.data, {
      fileName: source.name,
      source: 'pdf',
      ...meta,
    });
    pdfCache.set(item.id, source.data);
    dispatch(addInboxLoad(item));
    setFilter('waiting');
    return item;
  }

  async function simulateEmail() {
    const sample = sampleFiles[emailCount % sampleFiles.length];
    setReceiving(true);
    try {
      const response = await fetch(sampleUrl(sample.file));
      if (!response.ok) return;
      await addPdf(
        { name: sample.file, data: await response.arrayBuffer() },
        { source: 'email', emailFrom: sample.from, fileUrl: sampleUrl(sample.file) },
      );
      setEmailCount((count) => count + 1);
    } finally {
      setReceiving(false);
    }
  }

  async function openReview(item: InboxLoad) {
    setDialog({ stage: 'review', item, pdf: await loadInboxPdf(item) });
  }

  return (
    <div
      className="runs runs--droppable"
      onDragOver={(event) => {
        if (dialog || !Array.from(event.dataTransfer.types).includes('Files')) return;
        event.preventDefault();
        setDraggingFile(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDraggingFile(false);
      }}
      onDrop={(event) => {
        if (dialog) return;
        event.preventDefault();
        setDraggingFile(false);
        const file = event.dataTransfer.files[0];
        if (!file) return;
        if (!isPdfFile(file)) {
          setDialog({ stage: 'pick' });
          return;
        }
        void readSource(file).then(async (source) => {
          const item = await addPdf(source);
          setDialog({ stage: 'review', item, pdf: source.data });
        });
      }}
    >
      {draggingFile && (
        <div className="runs__drop-overlay" aria-hidden="true">
          <strong>{t.inbox.dropTitle}</strong>
          <span>{t.inbox.dropSub}</span>
        </div>
      )}

      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">{t.inbox.title}</h1>
          <p className="runs__meta">{t.inbox.subtitle}</p>
        </div>
        <div className="runs__toolbar-actions">
          <button
            type="button"
            className="runs__button runs__button--secondary runs__button--small"
            disabled={receiving}
            onClick={() => void simulateEmail()}
          >
            {receiving ? t.inbox.receivingEmail : t.inbox.simulateEmail}
          </button>
          <button
            type="button"
            className="runs__button runs__button--secondary runs__button--small"
            onClick={() => setDialog({ stage: 'review', item: emptyManualLoad(), pdf: null })}
          >
            {t.inbox.addManual}
          </button>
          <button
            type="button"
            className="runs__button runs__button--small"
            onClick={() => setDialog({ stage: 'pick' })}
          >
            {t.inbox.uploadPdf}
          </button>
        </div>
      </header>

      <div className="runs__filters runs__filters--inline" role="group" aria-label={t.inbox.filterAria}>
        {(['waiting', 'tentative', 'assigned', 'rejected'] as const).map((option) => (
          <button
            key={option}
            type="button"
            className={filter === option ? 'runs__filter is-active' : 'runs__filter'}
            onClick={() => setFilter(option)}
          >
            {option === 'waiting' ? t.inbox.filters.waiting(waiting.length) : t.inbox.filters[option]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="runs__note">{t.inbox.empty}</p>
      ) : (
        <ul className="runs__loads">
          {visible.map((item) => (
            <InboxCard
              key={item.id}
              item={item}
              onReview={() => void openReview(item)}
              onReject={() => {
                dispatch(setInboxStatus({ id: item.id, status: 'Rejected' }));
                dispatch(showToast('warning', t.notify.rejected(item.draft.customer || t.inbox.noCustomer)));
              }}
              onRestore={() => dispatch(setInboxStatus({ id: item.id, status: 'New' }))}
              onConfirm={() => {
                dispatch(setInboxStatus({ id: item.id, status: 'New' }));
                dispatch(showToast('success', t.planning.confirmed(item.draft.customer)));
              }}
              onOpenRun={() => {
                if (!item.runId) return;
                dispatch(openRun(item.runId));
                dispatch(setActiveSection('board'));
              }}
            />
          ))}
        </ul>
      )}

      <RateConImport
        state={dialog}
        onClose={() => setDialog(null)}
        onPick={(source) => {
          void addPdf(source).then((item) => setDialog({ stage: 'review', item, pdf: source.data }));
        }}
      />
    </div>
  );
}

function InboxCard({
  item,
  onReview,
  onReject,
  onRestore,
  onConfirm,
  onOpenRun,
}: {
  item: InboxLoad;
  onReview: () => void;
  onReject: () => void;
  onRestore: () => void;
  onConfirm: () => void;
  onOpenRun: () => void;
}) {
  const { draft } = item;
  const missing = REQUIRED.filter((key) => !String(draft[key] ?? '').trim()).map(
    (key) => t.rateCon.missingLabels[key] ?? key,
  );
  const route =
    draft.pickupCity || draft.deliveryCity
      ? `${placeName(draft.pickupCity, draft.pickupState)} → ${placeName(draft.deliveryCity, draft.deliveryState)}`
      : '';
  const dates = [formatWhen(draft.pickupAt), formatWhen(draft.deliveryAt)].filter(Boolean).join(' → ');
  const facts = [
    readNumber(draft.rate) > 0 ? formatMoney(readNumber(draft.rate), 0) : '',
    readNumber(draft.miles) > 0 ? formatMiles(readNumber(draft.miles)) : '',
    draft.equipment,
    draft.loadNumber ? t.runDetail.loadNumber(draft.loadNumber) : '',
  ].filter(Boolean);
  const source =
    item.source === 'email'
      ? t.inbox.source.email(item.emailFrom ?? '')
      : item.source === 'pdf'
        ? t.inbox.source.pdf
        : t.inbox.source.manual;
  const tone = statusTone[item.status];
  const isWaiting = item.status === 'New' || item.status === 'Ready';

  return (
    <li className={item.status === 'New' ? 'runs__load runs__account runs__load--new' : 'runs__load runs__account'}>
      <div className="runs__account-info">
        <span className="runs__meta">
          {source} · {t.inbox.received(formatWhen(item.receivedAt))}
        </span>
        <p className="runs__truck">{draft.customer || t.inbox.noCustomer}</p>
        {route && <p className="runs__meta">{route}</p>}
        {dates && <p className="runs__meta">{dates}</p>}
        {facts.length > 0 && <p className="runs__meta">{facts.join(' · ')}</p>}
        {isWaiting && missing.length > 0 && (
          <p className="runs__meta runs__meta--warn">{t.inbox.missing(missing.join(', '))}</p>
        )}
      </div>
      <span className={`runs__badge runs__account-status${tone ? ` runs__badge--${tone}` : ''}`}>
        {t.inbox.status[item.status]}
      </span>
      <div className="runs__load-actions runs__account-actions">
        {isWaiting && (
          <>
            <button type="button" className="runs__button runs__button--tertiary runs__button--small" onClick={onReject}>
              {t.inbox.reject}
            </button>
            <button type="button" className="runs__button runs__button--small" onClick={onReview}>
              {t.inbox.review}
            </button>
          </>
        )}
        {item.status === 'Tentative' && (
          <>
            <button type="button" className="runs__button runs__button--tertiary runs__button--small" onClick={onReject}>
              {t.inbox.reject}
            </button>
            <button type="button" className="runs__button runs__button--small" onClick={onConfirm}>
              {t.inbox.confirm}
            </button>
          </>
        )}
        {item.status === 'Assigned' && (
          <button type="button" className="runs__button runs__button--secondary runs__button--small" onClick={onOpenRun}>
            {t.inbox.openRun}
          </button>
        )}
        {item.status === 'Rejected' && (
          <button type="button" className="runs__button runs__button--tertiary runs__button--small" onClick={onRestore}>
            {t.inbox.restore}
          </button>
        )}
      </div>
    </li>
  );
}

export default Inbox;
