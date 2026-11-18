import { useEffect, useRef, useState } from 'react';
import { t } from '../../i18n';

type NumberFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: string;
  disabled?: boolean;
  /** Только целые числа. */
  integer?: boolean;
  /** Строго больше min (например, ставка за милю не может быть нулевой). */
  exclusiveMin?: boolean;
  onCommit: (value: number) => void;
};

/**
 * Числовая настройка с проверкой: допустимое значение сохраняется сразу,
 * недопустимое остаётся в поле с ошибкой и в данные не попадает.
 */
function NumberField({ label, value, min, max, step, disabled, integer, exclusiveMin, onCommit }: NumberFieldProps) {
  const [text, setText] = useState(value ? String(value) : '');
  const committed = useRef(value);

  // Значение изменилось снаружи (например, сброс данных) — поле показывает его.
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setText(value ? String(value) : '');
    }
  }, [value]);

  const number = Number(text);
  let error = '';
  if (!text.trim() || !Number.isFinite(number)) error = t.validation.numberRequired;
  else if (number < min || number > max || (exclusiveMin && number === min) || (integer && !Number.isInteger(number))) {
    error = t.validation.numberRange(min, max);
  }

  return (
    <label className="runs__field">
      <span className="runs__label">{label}</span>
      <input
        className="runs__input"
        type="number"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        aria-invalid={!!error}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          const parsed = Number(next);
          const valid =
            next.trim() !== '' &&
            Number.isFinite(parsed) &&
            parsed >= min &&
            parsed <= max &&
            !(exclusiveMin && parsed === min) &&
            !(integer && !Number.isInteger(parsed));
          if (valid) {
            committed.current = parsed;
            onCommit(parsed);
          }
        }}
      />
      {error && <span className="runs__field-error">{error}</span>}
    </label>
  );
}

export default NumberField;
