import type { ReactNode } from 'react';

type StatTileProps = {
  label: string;
  value: ReactNode;
  tooltip?: string;
  badgeTone?: 'ok' | 'warn' | 'danger';
  badgeText?: string;
  meta?: string;
  valueClassName?: string;
};

// One KPI tile: label, value, optional status badge and muted details.
// The badge and the details share one row when both are given.
function StatTile({
  label,
  value,
  tooltip,
  badgeTone,
  badgeText,
  meta,
  valueClassName,
}: StatTileProps) {
  const badge =
    badgeText && badgeTone ? (
      <span className={`runs__badge runs__badge--${badgeTone}`}>
        {badgeText}
      </span>
    ) : null;
  const details = meta ? <span className="runs__meta">{meta}</span> : null;

  return (
    <div className="runs__stat" title={tooltip}>
      <dt>{label}</dt>
      <dd className={valueClassName}>{value}</dd>
      {badge && details ? (
        <div className="runs__inline-visual">
          {badge}
          {details}
        </div>
      ) : (
        (badge ?? details)
      )}
    </div>
  );
}

export default StatTile;
