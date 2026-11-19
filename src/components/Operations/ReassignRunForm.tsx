import { useState } from 'react';
import { fleetRoster } from '../../runs/seed';
import { reassignment } from '../../operations/reassignment';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { reassignRun } from '../../store/slices/runsSlice';
import { Field } from './LoadOperations';
export default function ReassignRunForm() {
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state);
  const eligible = state.runs.runs.filter(
    (run) =>
      run.status === 'Planned' &&
      run.loads.every((load) => load.status === 'Assigned'),
  );
  const [runId, setRunId] = useState('');
  const [truck, setTruck] = useState(fleetRoster[0].truck);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  if (!eligible.length) return null;
  return (
    <section className="runs__block">
      <h2 className="runs__subtitle">Перепризначення запланованого рейсу</h2>
      <p className="runs__meta">
        Перевіряються водій, тягач, причіп та часові вікна. Причина зберігається
        в журналі рейсу.
      </p>
      <form
        className="runs__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const target = reassignment(state, runId, truck, undefined, reason);
          if (target.error) {
            setError(target.error);
            return;
          }
          dispatch(
            reassignRun({
              runId,
              truck,
              driver: target.driver!,
              drivingHoursLeft: target.drivingHoursLeft!,
              trailerId: target.trailerId,
              author: state.auth.currentUser?.name ?? '',
              reason,
            }),
          );
          setError('');
          setSaved(true);
        }}
      >
        <Field label="Рейс для перепризначення">
          <select
            className="runs__input"
            value={runId}
            onChange={(event) => {
              setRunId(event.target.value);
              setSaved(false);
            }}
          >
            <option value="">Оберіть запланований рейс</option>
            {eligible.map((run) => (
              <option key={run.id} value={run.id}>
                {run.truck} · {run.driver}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Новий тягач і водій">
          <select
            className="runs__input"
            value={truck}
            onChange={(event) => {
              setTruck(event.target.value);
              setSaved(false);
            }}
          >
            {fleetRoster.map((roster) => (
              <option key={roster.truck} value={roster.truck}>
                {roster.truck} · {roster.driver}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Причина перепризначення">
          <input
            className="runs__input"
            maxLength={500}
            value={reason}
            onChange={(event) => {
              setReason(event.target.value);
              setSaved(false);
            }}
          />
        </Field>
        {error && (
          <p className="runs__field-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="runs__button runs__button--secondary">
          Перевірити й перепризначити
        </button>
        {saved && (
          <p className="runs__note" role="status">
            Рейс перепризначено. Запис додано в журнал.
          </p>
        )}
      </form>
    </section>
  );
}
