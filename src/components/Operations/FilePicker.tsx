import { useId, useRef, useState } from 'react';

type Props = {
  label: string;
  buttonText: string;
  accept: string;
  disabled?: boolean;
  maxFiles?: number;
  onFiles: (files: File[]) => void | Promise<void>;
};

export default function FilePicker({
  label,
  buttonText,
  accept,
  disabled,
  maxFiles = 1,
  onFiles,
}: Props) {
  const input = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const [names, setNames] = useState<string[]>([]);
  return (
    <div className="runs__field operations__file-field">
      <span id={labelId} className="runs__label">
        {label}
      </span>
      <div className="operations__file-picker">
        <button
          type="button"
          className="runs__button runs__button--secondary"
          disabled={disabled}
          aria-describedby={labelId}
          onClick={() => input.current?.click()}
        >
          {buttonText}
        </button>
        <span className="runs__meta operations__file-name" aria-live="polite">
          {names.length ? names.join(', ') : 'Файл не обрано'}
        </span>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept={accept}
        multiple={maxFiles > 1}
        disabled={disabled}
        aria-label={label}
        onChange={async (event) => {
          const target = event.currentTarget;
          const files = Array.from(target.files ?? []).slice(0, maxFiles);
          if (!files.length) return;
          setNames(files.map((file) => file.name));
          try {
            await onFiles(files);
          } finally {
            target.value = '';
          }
        }}
      />
    </div>
  );
}
