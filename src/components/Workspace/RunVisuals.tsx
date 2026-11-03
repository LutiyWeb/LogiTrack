import { loadStatuses, type LoadStatus, type RunStatus } from '../../runs/demo';

const statusModifiers: Record<RunStatus, string> = {
  'In transit': 'runs__status--in-transit',
  'Empty return': 'runs__status--empty-return',
  Planned: 'runs__status--planned',
  Completed: 'runs__status--completed',
};

const loadStatusModifiers: Record<LoadStatus, string> = {
  Assigned: 'runs__status--planned',
  'At pickup': 'runs__status--in-transit',
  'In transit': 'runs__status--in-transit',
  Delivered: 'runs__status--completed',
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  return (
    <span className={`runs__status ${statusModifiers[status]}`}>
      <span className="runs__status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

export function LoadStatusBadge({ status }: { status: LoadStatus }) {
  return (
    <span className={`runs__status ${loadStatusModifiers[status]}`}>
      <span className="runs__status-dot" aria-hidden="true" />
      {status}
    </span>
  );
}

export function LoadStatusSelect({
  status,
  ariaLabel,
  onChange,
}: {
  status: LoadStatus;
  ariaLabel: string;
  onChange: (nextStatus: LoadStatus) => void;
}) {
  return (
    <select
      className={`runs__input runs__input--compact runs__status-select ${loadStatusModifiers[status]}`}
      aria-label={ariaLabel}
      value={status}
      onChange={(e) => onChange(e.target.value as LoadStatus)}
    >
      {loadStatuses.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function MilesSplitBar({
  paidMiles,
  emptyMiles,
}: {
  paidMiles: number;
  emptyMiles: number | null;
}) {
  const empty = emptyMiles ?? 0;
  const total = paidMiles + empty;
  const paidPct = total > 0 ? Math.round((paidMiles / total) * 100) : 100;
  const emptyPct = Math.max(0, 100 - paidPct);

  return (
    <span
      className="runs__miles-bar"
      aria-hidden="true"
      title={`Paid ${paidPct}% · Empty ${emptyPct}%`}
    >
      <span
        className="runs__miles-segment runs__miles-segment--paid"
        style={{ width: `${paidPct}%` }}
      />
      <span
        className="runs__miles-segment runs__miles-segment--empty"
        style={{ width: `${emptyPct}%` }}
      />
    </span>
  );
}

export function HosRing({ hoursLeft }: { hoursLeft: number | null }) {
  if (hoursLeft === null) return null;

  const radius = 7.5;
  const circumference = 2 * Math.PI * radius;
  const ratio = Math.max(0, Math.min(1, hoursLeft / 11));
  const dash = `${(ratio * circumference).toFixed(1)} ${circumference.toFixed(1)}`;
  const isLow = hoursLeft < 4;
  const strokeColor = isLow ? 'var(--color-warn)' : 'var(--color-good)';

  return (
    <svg
      className="runs__hos-ring"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <circle
        cx="10"
        cy="10"
        r={radius}
        fill="none"
        stroke="var(--color-line)"
        strokeWidth="2.5"
      />
      <circle
        cx="10"
        cy="10"
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={dash}
        transform="rotate(-90 10 10)"
      />
    </svg>
  );
}
