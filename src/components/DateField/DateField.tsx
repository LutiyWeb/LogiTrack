import { useRef, type InputHTMLAttributes } from 'react';
import { DATE_LOCALE } from '../../i18n';
import './DateField.scss';

type DateFieldProps = {
  type: 'date' | 'datetime-local';
  value: string;
  onValue: (value: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'>;

const dateFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormat = new Intl.DateTimeFormat(DATE_LOCALE, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function display(type: DateFieldProps['type'], value: string) {
  if (!value) return '';
  const [datePart, timePart = '00:00'] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (Number.isNaN(date.getTime())) return value;
  return (type === 'date' ? dateFormat : dateTimeFormat).format(date);
}

/**
 * Shows the value in the interface locale; the browser's own picker still does the choosing,
 * because a native date input always renders in the browser's locale.
 */
function DateField({ type, value, onValue, className = 'runs__input', placeholder, ...rest }: DateFieldProps) {
  const nativeRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const input = nativeRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
    }
  };

  return (
    <span className="date-field">
      <input
        {...rest}
        className={className}
        type="text"
        readOnly
        value={display(type, value)}
        placeholder={placeholder}
        onClick={openPicker}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
            event.preventDefault();
            openPicker();
          }
        }}
      />
      <input
        ref={nativeRef}
        className="date-field__native"
        type={type}
        value={value}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => onValue(event.target.value)}
      />
    </span>
  );
}

export default DateField;
