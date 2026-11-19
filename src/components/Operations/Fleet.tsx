import DateField from '../DateField/DateField';
import FilePicker from './FilePicker';
import FacilityDirectory from './FacilityDirectory';
import ReassignRunForm from './ReassignRunForm';
import { useState } from 'react';
import {
  inspectionChecks,
  type FleetAsset,
  type Inspection,
} from '../../operations/model';
import { SEED_NOW, formatWhen } from '../../runs/seed';
import { displayDate } from '../../billing/billing';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import {
  updateAsset,
  submitInspection,
  resolveInspection,
} from '../../store/slices/operationsSlice';
import { Field, DocumentLink } from './LoadOperations';
import { saveDocument } from '../../documents/storage';

export default function Fleet() {
  const assets = useAppSelector((state) => state.operations.assets);
  const inspections = useAppSelector((state) => state.operations.inspections);
  const manager = useAppSelector(selectCurrentUser)?.role === 'manager';
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <div className="runs operations">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">Техніка та огляди</h1>
          <p className="runs__meta">
            Тягачі й причепи, сумісність обладнання та контроль дефектів.
          </p>
        </div>
      </header>
      <ul className="runs__loads">
        {assets.map((asset) => (
          <li key={asset.id} className="runs__load">
            <div className="runs__load-head">
              <p className="runs__truck">{asset.number}</p>
              <span
                className={`runs__badge runs__badge--${asset.status === 'Maintenance' ? 'danger' : 'ok'}`}
              >
                {asset.status === 'Maintenance' ? 'На ремонті' : 'Справний'}
              </span>
            </div>
            <p className="runs__meta">
              {asset.kind === 'trailer'
                ? `${asset.equipment} · ${asset.lengthFeet}′ · ${asset.capacityLbs} lb`
                : 'Тягач'}{' '}
              · Огляд до {displayDate(asset.inspectionDue)}
              {asset.serviceNote ? ` · ${asset.serviceNote}` : ''}
            </p>
            {manager && <AssetForm asset={asset} />}
            <button
              type="button"
              className={`runs__button runs__button--secondary runs__button--small ${openId === asset.id ? 'is-active' : ''}`}
              aria-expanded={openId === asset.id}
              onClick={() =>
                setOpenId((id) => (id === asset.id ? null : asset.id))
              }
            >
              Провести огляд
            </button>
            {openId === asset.id && (
              <InspectionForm
                assetId={asset.id}
                onDone={() => setOpenId(null)}
              />
            )}
            <InspectionHistory
              inspections={inspections.filter(
                (item) => item.assetId === asset.id,
              )}
            />
          </li>
        ))}
      </ul>
      <ReassignRunForm />
      <FacilityDirectory />
    </div>
  );
}
function AssetForm({ asset }: { asset: FleetAsset }) {
  const dispatch = useAppDispatch();
  const inspections = useAppSelector((state) => state.operations.inspections);
  const [form, setForm] = useState({
    status: asset.status,
    serviceNote: asset.serviceNote,
    inspectionDue: asset.inspectionDue,
  });
  const [error, setError] = useState('');
  return (
    <details>
      <summary className="runs__label">Сервіс і доступність</summary>
      <form
        className="runs__form"
        onSubmit={(event) => {
          event.preventDefault();
          if (
            form.status === 'Available' &&
            inspections.some(
              (item) =>
                item.assetId === asset.id &&
                Object.values(item.checks).some((ok) => !ok) &&
                !item.resolvedBy,
            )
          ) {
            setError(
              'Спочатку закрийте відкриті дефекти та вкажіть виконані роботи.',
            );
            return;
          }
          dispatch(updateAsset({ id: asset.id, ...form }));
          setError('');
        }}
      >
        <Field label="Стан техніки">
          <select
            className="runs__input"
            value={form.status}
            onChange={(event) =>
              setForm({
                ...form,
                status: event.target.value as FleetAsset['status'],
              })
            }
          >
            <option value="Available">Доступний</option>
            <option value="Maintenance">На ремонті</option>
          </select>
        </Field>
        <Field label="Наступний огляд">
          <DateField
            type="date"
            required
            value={form.inspectionDue}
            onValue={(inspectionDue) => setForm({ ...form, inspectionDue })}
          />
        </Field>
        <Field label="Роботи / постачальник сервісу">
          <input
            className="runs__input"
            maxLength={500}
            value={form.serviceNote}
            onChange={(event) =>
              setForm({ ...form, serviceNote: event.target.value })
            }
          />
        </Field>
        {error && (
          <p className="runs__field-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="runs__button runs__button--secondary runs__button--small"
          type="submit"
        >
          Зберегти стан техніки
        </button>
      </form>
    </details>
  );
}
export function InspectionForm({
  assetId,
  onDone,
}: {
  assetId: string;
  onDone: () => void;
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const [checks, setChecks] = useState<Record<string, boolean | null>>(() =>
    Object.fromEntries(inspectionChecks.map((name) => [name, null])),
  );
  const [defects, setDefects] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="runs__form"
      aria-label="Передрейсовий огляд"
      noValidate
      onSubmit={async (event) => {
        event.preventDefault();
        if (Object.values(checks).some((value) => value === null)) {
          setError('Заповніть усі 13 пунктів огляду.');
          return;
        }
        if (Object.values(checks).some((ok) => !ok) && !defects.trim()) {
          setError('Опишіть виявлені дефекти.');
          return;
        }
        setBusy(true);
        setError('');
        try {
          const photos = [];
          for (const file of files) {
            if (!['image/jpeg', 'image/png'].includes(file.type))
              throw new Error('Фото мають бути у форматі PNG або JPEG.');
            const id = crypto.randomUUID();
            const storage = await saveDocument(id, file);
            photos.push({ id, name: file.name, mime: file.type, storage });
          }
          dispatch(
            submitInspection({
              id: crypto.randomUUID(),
              assetId,
              at: SEED_NOW,
              driver: user?.name ?? '',
              checks: checks as Record<string, boolean>,
              defects,
              photoIds: photos.map((photo) => photo.id),
              photos,
            }),
          );
          onDone();
        } catch (error) {
          setError(
            error instanceof Error
              ? error.message
              : 'Не вдалося зберегти огляд.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      {inspectionChecks.map((name) => (
        <Field key={name} label={name}>
          <select
            className="runs__input"
            value={checks[name] === null ? '' : checks[name] ? 'ok' : 'defect'}
            onChange={(event) =>
              setChecks({
                ...checks,
                [name]:
                  event.target.value === ''
                    ? null
                    : event.target.value === 'ok',
              })
            }
          >
            <option value="">Оберіть результат</option>
            <option value="ok">Справно</option>
            <option value="defect">Дефект</option>
          </select>
        </Field>
      ))}
      <Field label="Опис дефектів">
        <textarea
          className="runs__input runs__textarea"
          maxLength={2000}
          value={defects}
          onChange={(event) => setDefects(event.target.value)}
        />
      </Field>
      <FilePicker
        label="Фото огляду (до 4)"
        buttonText="Обрати фото"
        accept="image/jpeg,image/png"
        maxFiles={4}
        disabled={busy}
        onFiles={setFiles}
      />
      {error && (
        <p className="runs__field-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="runs__button runs__button--secondary"
        disabled={busy}
      >
        {busy ? 'Зберігаємо…' : 'Зберегти огляд'}
      </button>
    </form>
  );
}
export function InspectionHistory({
  inspections,
}: {
  inspections: Inspection[];
}) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const [resolution, setResolution] = useState('');
  return (
    <ul className="runs__driver-runs">
      {inspections.map((inspection) => (
        <li key={inspection.id} className="runs__meta">
          {formatWhen(inspection.at)} · {inspection.driver} ·{' '}
          {Object.values(inspection.checks).every(Boolean)
            ? 'Усі 13 пунктів справні'
            : `Дефекти: ${inspection.defects}`}
          <br />
          {inspection.resolvedBy
            ? `Усунено: ${inspection.resolution} · ${inspection.resolvedBy}`
            : ''}
          {inspection.photos?.map((photo) => (
            <DocumentLink
              key={photo.id}
              document={{
                ...photo,
                runId: '',
                loadId: '',
                kind: 'Other',
                uploadedAt: inspection.at,
                uploadedBy: inspection.driver,
                size: 0,
              }}
            />
          ))}
          {user?.role === 'manager' &&
            !inspection.resolvedBy &&
            Object.values(inspection.checks).some((ok) => !ok) && (
              <div className="runs__form">
                <Field label="Виконані роботи">
                  <input
                    className="runs__input"
                    maxLength={500}
                    value={resolution}
                    onChange={(event) => setResolution(event.target.value)}
                  />
                </Field>
                <button
                  type="button"
                  className="runs__button runs__button--secondary runs__button--small"
                  disabled={!resolution.trim()}
                  onClick={() => {
                    dispatch(
                      resolveInspection({
                        id: inspection.id,
                        author: user.name,
                        resolution,
                      }),
                    );
                    setResolution('');
                  }}
                >
                  Закрити дефект
                </button>
              </div>
            )}
        </li>
      ))}
    </ul>
  );
}
