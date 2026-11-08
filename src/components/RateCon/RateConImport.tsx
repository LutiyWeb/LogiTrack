import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isPdfFile, readSource, type RateConSource } from '../../ratecon/files';
import RateConReview from './RateConReview';
import './RateCon.scss';

export type RateConImportState = { stage: 'pick' } | { stage: 'review'; source: RateConSource } | null;

const SAMPLES = [
  { file: 'ratecon-crestline.pdf', broker: 'Crestline Freight', detail: "Dry van · Louisville, KY → Memphis, TN" },
  { file: 'ratecon-northbound.pdf', broker: 'Northbound Logistics', detail: 'Reefer · Dayton, OH → Charlotte, NC' },
  { file: 'ratecon-prairie-route.pdf', broker: 'Prairie Route', detail: 'Flatbed · Lafayette, IN → St. Louis, MO' },
];

function RateConImport({
  state,
  onChange,
}: {
  state: RateConImportState;
  onChange: (state: RateConImportState) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState('');

  const close = () => {
    setError('');
    onChange(null);
  };

  useEffect(() => {
    if (!state) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onChange(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, onChange]);

  if (!state) return null;

  const takeFile = async (file: File | undefined) => {
    if (!file) return;
    if (!isPdfFile(file)) {
      setError(`${file.name} is not a PDF. Rate confirmations are usually PDF files.`);
      return;
    }
    setError('');
    onChange({ stage: 'review', source: await readSource(file) });
  };

  const openSample = async (file: string) => {
    setLoadingSample(file);
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}samples/${file}`);
      if (!response.ok) throw new Error('missing');
      onChange({ stage: 'review', source: { name: file, data: await response.arrayBuffer() } });
    } catch {
      setError('Could not load the sample file.');
    } finally {
      setLoadingSample('');
    }
  };

  const reviewing = state.stage === 'review';

  // Rendered into <body> so the backdrop covers the sidebar too.
  return createPortal(
    <div className="runs__modal-backdrop ratecon" role="dialog" aria-modal="true" aria-label="Import rate confirmation">
      <div className={reviewing ? 'ratecon__dialog ratecon__dialog--review' : 'ratecon__dialog'}>
        <header className="ratecon__head">
          <div>
            <h2 className="runs__subtitle">{reviewing ? 'Review rate con' : 'Import rate confirmation'}</h2>
            <p className="ratecon__sub">
              {reviewing
                ? state.source.name
                : 'Drop the PDF the broker sent. LogiTrack reads it and books the load.'}
            </p>
          </div>
          <button type="button" className="ratecon__close" aria-label="Close" onClick={close}>
            ×
          </button>
        </header>

        {reviewing ? (
          <RateConReview key={state.source.name + state.source.data.byteLength} source={state.source} onClose={close} />
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
              <strong>Drop rate con PDF here</strong>
              <span>or click to browse</span>
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
              <span className="ratecon__label">No rate con handy? Try a sample</span>
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
                      <span>{loadingSample === sample.file ? 'Opening…' : sample.detail}</span>
                    </button>
                    <a
                      className="ratecon__sample-download"
                      href={`${import.meta.env.BASE_URL}samples/${sample.file}`}
                      download
                    >
                      Download PDF
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
