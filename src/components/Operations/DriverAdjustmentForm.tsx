import { useState } from 'react';
import { toCents } from '../../billing/billing';
import { seedDrivers } from '../../drivers/drivers';
import { SEED_NOW } from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { addDriverAdjustment } from '../../store/slices/operationsSlice';
import { Field } from './LoadOperations';
export default function DriverAdjustmentForm() {
  const dispatch = useAppDispatch();
  const user = useAppSelector(selectCurrentUser);
  const [form, setForm] = useState({
    driver: seedDrivers[0].name,
    amount: '',
    kind: 'bonus',
    reason: '',
  });
  const [error, setError] = useState('');
  if (user?.role !== 'manager') return null;
  return (
    <section className="runs__block operations">
      <h2 className="runs__subtitle">Доплата або утримання</h2>
      <form
        className="runs__form"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          const cents = toCents(Number(form.amount));
          if (
            !/^\d+(?:\.\d{1,2})?$/.test(form.amount) ||
            cents <= 0 ||
            cents > 10000000 ||
            !form.reason.trim()
          ) {
            setError(
              'Вкажіть додатну суму до $100,000 та підставу коригування.',
            );
            return;
          }
          dispatch(
            addDriverAdjustment({
              id: crypto.randomUUID(),
              driver: form.driver,
              amountCents: form.kind === 'bonus' ? cents : -cents,
              reason: form.reason.trim(),
              date: SEED_NOW.slice(0, 10),
              approvedBy: user.name,
            }),
          );
          setForm({ ...form, amount: '', reason: '' });
          setError('');
        }}
      >
        <Field label="Водій для коригування">
          <select
            className="runs__input"
            value={form.driver}
            onChange={(event) =>
              setForm({ ...form, driver: event.target.value })
            }
          >
            {seedDrivers.map((driver) => (
              <option key={driver.name} value={driver.name}>
                {driver.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Тип коригування">
          <select
            className="runs__input"
            value={form.kind}
            onChange={(event) => setForm({ ...form, kind: event.target.value })}
          >
            <option value="bonus">Доплата</option>
            <option value="deduction">Утримання</option>
          </select>
        </Field>
        <Field label="Сума коригування, USD">
          <input
            className="runs__input"
            type="number"
            min="0.01"
            max="100000"
            step="0.01"
            value={form.amount}
            onChange={(event) =>
              setForm({ ...form, amount: event.target.value })
            }
          />
        </Field>
        <Field label="Підстава коригування">
          <input
            className="runs__input"
            maxLength={500}
            value={form.reason}
            onChange={(event) =>
              setForm({ ...form, reason: event.target.value })
            }
          />
        </Field>
        {error && (
          <p role="alert" className="runs__field-error">
            {error}
          </p>
        )}
        <button type="submit" className="runs__button runs__button--secondary">
          Додати коригування
        </button>
      </form>
    </section>
  );
}
