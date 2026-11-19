import DateField from '../DateField/DateField';
import FilePicker from './FilePicker';
import { useEffect, useState, type ReactNode } from 'react';
import { saveDocument, documentUrl } from '../../documents/storage';
import {
  detentionAmount,
  type LoadDocument,
  type DetentionClaim,
} from '../../operations/model';
import { formatMoney, formatWhen, SEED_NOW, type Load } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import {
  addLoadDocument,
  reviewPod,
  addDetentionClaim,
  resolveDetention,
  addLoadMessage,
} from '../../store/slices/operationsSlice';
import { showToast } from '../../store/slices/toastsSlice';

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="runs__field">
      <span className="runs__label">{label}</span>
      {children}
    </label>
  );
}

export default function LoadOperations({
  runId,
  load,
}: {
  runId: string;
  load: Load;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const documents = useAppSelector(
    (state) => state.operations.documents,
  ).filter((doc) => doc.runId === runId && doc.loadId === load.id);
  const claims = useAppSelector((state) => state.operations.detention).filter(
    (claim) => claim.runId === runId && claim.loadId === load.id,
  );
  const messages = useAppSelector((state) => state.operations.messages).filter(
    (message) => message.runId === runId && message.loadId === load.id,
  );
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [text, setText] = useState('');
  const [claimOpen, setClaimOpen] = useState(false);
  const office = user?.role === 'manager' || user?.role === 'dispatcher';
  return (
    <div
      className="runs__block operations"
      aria-label={`Документи та події ${load.customer}`}
    >
      <h3 className="runs__subtitle">Документи вантажу</h3>
      {!documents.length && <p className="runs__meta">Документів ще немає.</p>}
      <ul className="runs__driver-runs">
        {documents.map((doc) => (
          <li key={doc.id} className="runs__meta">
            <DocumentLink document={doc} /> · {doc.kind} · {doc.uploadedBy} ·{' '}
            {doc.reviewedBy
              ? `Перевірив: ${doc.reviewedBy}`
              : 'Потребує перевірки'}
            {office &&
              doc.kind === 'POD' &&
              !doc.reviewedAt &&
              load.status === 'Delivered' && (
                <button
                  type="button"
                  className="runs__button runs__button--secondary runs__button--small"
                  onClick={() =>
                    dispatch(
                      reviewPod({
                        documentId: doc.id,
                        runId,
                        loadId: load.id,
                        author: user?.name ?? '',
                      }),
                    )
                  }
                >
                  Підтвердити POD
                </button>
              )}
          </li>
        ))}
      </ul>
      <FilePicker
        label={
          uploading
            ? 'Зберігаємо POD…'
            : 'Додати POD (PDF / PNG / JPEG, до 10 МБ)'
        }
        buttonText={uploading ? 'Зберігаємо POD…' : 'Обрати POD'}
        accept="application/pdf,image/png,image/jpeg"
        disabled={uploading}
        onFiles={async ([file]) => {
          if (!file) return;
          const id = crypto.randomUUID();
          setUploading(true);
          setError('');
          try {
            const storage = await saveDocument(id, file);
            dispatch(
              addLoadDocument({
                id,
                runId,
                loadId: load.id,
                kind: 'POD',
                name: file.name,
                mime: file.type,
                size: file.size,
                uploadedAt: SEED_NOW,
                uploadedBy: user?.name ?? '',
                storage,
              }),
            );
            dispatch(
              showToast('success', 'POD збережено та передано на перевірку.'),
            );
          } catch (error) {
            setError(
              error instanceof Error
                ? error.message
                : 'Не вдалося зберегти документ.',
            );
          } finally {
            setUploading(false);
          }
        }}
      />
      {error && (
        <p className="runs__field-error" role="alert">
          {error}
        </p>
      )}
      <h3 className="runs__subtitle">Простій</h3>
      <ul className="runs__driver-runs">
        {claims.map((claim) => (
          <li key={claim.id}>
            <p className="runs__meta">
              {claim.arrivalAt.replace('T', ' ')} →{' '}
              {claim.departedAt.replace('T', ' ')} · {claim.freeMinutes} хв
              безкоштовно · {formatMoney(claim.ratePerHour, 2)}/год ·{' '}
              {formatMoney(claim.amountCents / 100, 2)} ·{' '}
              {
                {
                  Pending: 'На погодженні',
                  Approved: 'Погоджено',
                  Rejected: 'Відхилено',
                }[claim.status]
              }
            </p>
            {claim.clientReference && (
              <p className="runs__meta">
                Підтвердження клієнта: {claim.clientReference} ·{' '}
                {claim.reviewedBy}
              </p>
            )}
            {user?.role === 'manager' && claim.status === 'Pending' && (
              <ClaimApproval claim={claim} />
            )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`runs__button runs__button--secondary runs__button--small ${claimOpen ? 'is-active' : ''}`}
        aria-expanded={claimOpen}
        onClick={() => setClaimOpen((value) => !value)}
      >
        Зафіксувати простій
      </button>
      {claimOpen && (
        <DetentionForm
          runId={runId}
          loadId={load.id}
          onClose={() => setClaimOpen(false)}
        />
      )}
      <h3 className="runs__subtitle">Повідомлення цього вантажу</h3>
      <ol className="runs__driver-runs">
        {messages.map((message) => (
          <li key={message.id} className="runs__meta">
            <strong>{message.author}</strong> · {formatWhen(message.at)}
            <p>{message.text}</p>
          </li>
        ))}
      </ol>
      <form
        className="runs__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          dispatch(
            addLoadMessage({
              id: crypto.randomUUID(),
              runId,
              loadId: load.id,
              author: user?.name ?? '',
              at: SEED_NOW,
              text,
            }),
          );
          setText('');
        }}
      >
        <Field label="Повідомлення до вантажу">
          <textarea
            className="runs__input runs__textarea"
            rows={2}
            maxLength={5000}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </Field>
        <button
          type="submit"
          className="runs__button runs__button--secondary runs__button--small"
          disabled={!text.trim()}
        >
          Додати повідомлення
        </button>
      </form>
    </div>
  );
}
export function DocumentLink({ document }: { document: LoadDocument }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    let result: string | null = null;
    void documentUrl(document)
      .then((value) => {
        result = value;
        if (live) setUrl(value);
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (result?.startsWith('blob:')) URL.revokeObjectURL(result);
    };
  }, [document]);
  return url ? (
    <a className="runs__link" href={url} target="_blank" rel="noreferrer">
      {document.name}
    </a>
  ) : (
    <span>{document.name} · файл недоступний у цьому браузері</span>
  );
}
function ClaimApproval({ claim }: { claim: DetentionClaim }) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const [reference, setReference] = useState('');
  return (
    <div className="runs__form">
      <Field label="Підтвердження брокера / клієнта">
        <input
          className="runs__input"
          maxLength={200}
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="Номер листа або погодження"
        />
      </Field>
      <div className="runs__load-actions">
        <button
          type="button"
          className="runs__button runs__button--secondary runs__button--small"
          disabled={!reference.trim()}
          onClick={() =>
            dispatch(
              resolveDetention({
                id: claim.id,
                approved: true,
                clientReference: reference,
                author: user?.name ?? '',
              }),
            )
          }
        >
          Погодити та додати до вартості
        </button>
        <button
          type="button"
          className="runs__button runs__button--tertiary runs__button--small"
          onClick={() =>
            dispatch(
              resolveDetention({
                id: claim.id,
                approved: false,
                clientReference: reference,
                author: user?.name ?? '',
              }),
            )
          }
        >
          Відхилити
        </button>
      </div>
    </div>
  );
}
function DetentionForm({
  runId,
  loadId,
  onClose,
}: {
  runId: string;
  loadId: string;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const [form, setForm] = useState({
    arrival: '',
    departure: '',
    free: '120',
    rate: '75',
  });
  const [submitted, setSubmitted] = useState(false);
  const amount = detentionAmount(
    form.arrival,
    form.departure,
    Number(form.free),
    Number(form.rate),
  );
  return (
    <form
      className="runs__form"
      aria-label="Фіксація простою"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        setSubmitted(true);
        if (amount === null || amount <= 0) return;
        dispatch(
          addDetentionClaim({
            id: crypto.randomUUID(),
            runId,
            loadId,
            arrivalAt: form.arrival,
            departedAt: form.departure,
            freeMinutes: Number(form.free),
            ratePerHour: Number(form.rate),
            status: 'Pending',
            createdBy: user?.name ?? '',
            amountCents: amount,
          }),
        );
        onClose();
      }}
    >
      <Field label="Прибуття">
        <DateField
          type="datetime-local"
          value={form.arrival}
          onValue={(value) => setForm({ ...form, arrival: value })}
        />
      </Field>
      <Field label="Завершення очікування">
        <DateField
          type="datetime-local"
          max={SEED_NOW}
          value={form.departure}
          onValue={(value) => setForm({ ...form, departure: value })}
        />
      </Field>
      <Field label="Безкоштовний період, хв">
        <input
          className="runs__input"
          type="number"
          min="0"
          max="1440"
          value={form.free}
          onChange={(event) => setForm({ ...form, free: event.target.value })}
        />
      </Field>
      <Field label="Ставка за годину, USD">
        <input
          className="runs__input"
          type="number"
          min="0.01"
          max="1000"
          step="0.01"
          value={form.rate}
          onChange={(event) => setForm({ ...form, rate: event.target.value })}
        />
      </Field>
      <p className="runs__meta">
        Розрахунок похвилинно після безкоштовного періоду:{' '}
        {amount === null ? '—' : formatMoney(amount / 100, 2)}. До рахунку
        потрапить лише погоджена сума.
      </p>
      {submitted && (amount === null || amount <= 0) && (
        <p className="runs__field-error" role="alert">
          Перевірте час, безкоштовний період та ставку. Платний простій має бути
          більшим за нуль.
        </p>
      )}
      <div className="runs__load-actions">
        <button className="runs__button runs__button--secondary" type="submit">
          Передати на погодження
        </button>
        <button
          className="runs__button runs__button--tertiary"
          type="button"
          onClick={onClose}
        >
          Скасувати
        </button>
      </div>
    </form>
  );
}
