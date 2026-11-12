import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { t } from '../../i18n';
import { sampleUrl, type InboxLoad } from '../../inbox/inbox';
import { isPdfFile, readSource, type RateConSource } from '../../ratecon/files';
import RateConReview from './RateConReview';
import './RateCon.scss';

export type RateConDialogState =
  | { stage: 'pick' }
  | { stage: 'review'; item: InboxLoad; pdf: ArrayBuffer | null }
  | null;

const SAMPLES = [
  { file: 'ratecon-crestline.pdf', broker: 'Crestline Freight', detail: t.rateCon.samples.crestline },
  { file: 'ratecon-northbound.pdf', broker: 'Northbound Logistics', detail: t.rateCon.samples.northbound },
  { file: 'ratecon-prairie-route.pdf', broker: 'Prairie Route', detail: t.rateCon.samples.prairie },
];

/**
 * Окно работы с подтверждением ставки:
 * «pick» — выбрать PDF, «review» — проверить груз из очереди и назначить его.
 */
function RateConImport({
  state,
  onPick,
  onClose,
}: {
  state: RateConDialogState;
  onPick: (source: RateConSource) => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState('');

  const close = () => {
    setError('');
    onClose();
  };

  useEffect(() => {
    if (!state) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, onClose]);

  if (!state) return null;

  const takeFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isPdfFile(file)) {
      setError(t.rateCon.notPdf(file.name));
      return;
    }
    setError('');
    onPick(await readSource(file));
  };

  const openSample = async (file: string) => {
    setLoadingSample(file);
    try {
      const response = await fetch(sampleUrl(file));
      if (!response.ok) throw new Error('missing');
      onPick({ name: file, data: await response.arrayBuffer() });
    } catch {
      setError(t.rateCon.sampleFailed);
    } finally {
      setLoadingSample('');
    }
  };

  const reviewing = state.stage === 'review';

  // Rendered into <body> so the backdrop covers the sidebar too.
  return createPortal(
    <div
      className="runs__modal-backdrop ratecon"
      role="dialog"
      aria-modal="true"
      aria-label={t.rateCon.importAria}
      // Клик по затемнённому фону (не по окну) закрывает окно.
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        className={
          reviewing
            ? `ratecon__dialog ratecon__dialog--review${state.pdf ? '' : ' ratecon__dialog--form'}`
            : 'ratecon__dialog'
        }
      >
        <header className="ratecon__head">
          <div>
            <h2 className="runs__subtitle">
              {reviewing ? t.inbox.reviewTitle : t.rateCon.importTitle}
            </h2>
            <p className="ratecon__sub">
              {reviewing
                ? (state.item.fileName ?? t.inbox.source.manual)
                : t.rateCon.importSub}
            </p>
          </div>
          <button type="button" className="ratecon__close" aria-label={t.rateCon.closeAria} onClick={close}>
            ×
          </button>
        </header>

        {reviewing ? (
          <RateConReview key={state.item.id} item={state.item} pdf={state.pdf} onClose={close} />
        ) : (
          <div className="ratecon__pick">
            <button
              type="button"
              className={dragging ? 'ratecon__drop is-dragging' : 'ratecon__drop'}
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setDragging(false);
                void takeFile(event.dataTransfer.files[0]);
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M14 3v6h6M12 18v-6m-3 3 3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <strong>{t.rateCon.dropTitle}</strong>
              <span>{t.rateCon.dropSub}</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              hidden
              onChange={(event) => {
                void takeFile(event.target.files?.[0]);
                event.target.value = '';
              }}
            />
            {error && <p className="ratecon__warning">{error}</p>}

            <div className="ratecon__samples">
              <span className="ratecon__label">{t.rateCon.samplesTitle}</span>
              <div className="ratecon__sample-list">
                {SAMPLES.map((sample) => (
                  <div key={sample.file} className="ratecon__sample">
                    <button
                      type="button"
                      className="ratecon__sample-open"
                      disabled={!!loadingSample}
                      onClick={() => void openSample(sample.file)}
                    >
                      <strong>{sample.broker}</strong>
                      <span>{loadingSample === sample.file ? t.rateCon.opening : sample.detail}</span>
                    </button>
                    <a className="ratecon__sample-download" href={sampleUrl(sample.file)} download>
                      {t.rateCon.downloadPdf}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

export default RateConImport;
