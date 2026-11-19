import { useState } from 'react';
import type { Facility } from '../../operations/facilities';
import { timeZones } from '../../operations/dispatch';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateFacility } from '../../store/slices/operationsSlice';
import { Field } from './LoadOperations';
export default function FacilityDirectory() {
  const facilities = useAppSelector((state) => state.operations.facilities);
  return (
    <section className="runs__block">
      <h2 className="runs__subtitle">Площадки завантаження й доставки</h2>
      <ul className="runs__loads">
        {facilities.map((facility) => (
          <li key={facility.id} className="runs__load">
            <p className="runs__truck">{facility.name}</p>
            <p className="runs__meta">
              {facility.address || 'Адресу вулиці не задано'} · {facility.city},{' '}
              {facility.state} {facility.zip} · {facility.timeZone}
            </p>
            <FacilityForm facility={facility} />
          </li>
        ))}
      </ul>
    </section>
  );
}
function FacilityForm({ facility }: { facility: Facility }) {
  const dispatch = useAppDispatch();
  const [form, setForm] = useState({
    contact: facility.contact,
    phone: facility.phone,
    instructions: facility.instructions,
    timeZone: facility.timeZone,
  });
  const [saved, setSaved] = useState(false);
  return (
    <details>
      <summary className="runs__label">Контакти та правила в’їзду</summary>
      <form
        className="runs__form"
        onSubmit={(event) => {
          event.preventDefault();
          dispatch(updateFacility({ id: facility.id, ...form }));
          setSaved(true);
        }}
      >
        <Field label="Контакт складу">
          <input
            className="runs__input"
            maxLength={120}
            value={form.contact}
            onChange={(event) => {
              setForm({ ...form, contact: event.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label="Телефон складу">
          <input
            className="runs__input"
            type="tel"
            maxLength={50}
            value={form.phone}
            onChange={(event) => {
              setForm({ ...form, phone: event.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <Field label="Часовий пояс складу">
          <select
            className="runs__input"
            value={form.timeZone}
            onChange={(event) => {
              setForm({ ...form, timeZone: event.target.value });
              setSaved(false);
            }}
          >
            {timeZones.map((zone) => (
              <option key={zone} value={zone}>
                {zone}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Правила в’їзду та інструкції водію">
          <textarea
            className="runs__input runs__textarea"
            maxLength={2000}
            value={form.instructions}
            onChange={(event) => {
              setForm({ ...form, instructions: event.target.value });
              setSaved(false);
            }}
          />
        </Field>
        <button type="submit" className="runs__button runs__button--secondary">
          Зберегти площадку
        </button>
        {saved && (
          <p className="runs__note" role="status">
            Інструкції збережено та доступні водію.
          </p>
        )}
      </form>
    </details>
  );
}
