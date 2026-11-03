import type { EnrichedRun } from '../../store/selectors/runsSelectors';

type CityNode = {
  x: number;
  y: number;
  short: string;
  isYard?: boolean;
};

const cityNodes: Record<string, CityNode> = {
  'Joliet, IL': { x: 118, y: 44, short: 'Joliet, IL' },
  'Fort Wayne, IN': { x: 288, y: 42, short: 'Fort Wayne, IN' },
  'Indianapolis, IN': { x: 226, y: 86, short: 'Indianapolis ★', isYard: true },
  'Greenwood, IN': { x: 234, y: 108, short: 'Greenwood' },
  'Effingham, IL': { x: 136, y: 114, short: 'Effingham' },
  'Columbus, OH': { x: 406, y: 78, short: 'Columbus, OH' },
  'Cincinnati, OH': { x: 344, y: 118, short: 'Cincinnati, OH' },
  'Louisville, KY': { x: 266, y: 148, short: 'Louisville, KY' },
  'Bowling Green, KY': { x: 232, y: 184, short: 'Bowling Green' },
  'Nashville, TN': { x: 214, y: 218, short: 'Nashville, TN' },
  'Marietta, GA': { x: 364, y: 232, short: 'Marietta, GA' },
  'Atlanta, GA': { x: 388, y: 250, short: 'Atlanta, GA' },
  'Forest Park, GA': { x: 404, y: 260, short: 'Forest Park' },
  'Macon, GA': { x: 432, y: 266, short: 'Macon, GA' },
};

const primaryCities = [
  'Joliet, IL',
  'Fort Wayne, IN',
  'Indianapolis, IN',
  'Columbus, OH',
  'Cincinnati, OH',
  'Louisville, KY',
  'Nashville, TN',
  'Marietta, GA',
  'Atlanta, GA',
];

export function FleetRouteMap({
  runs,
  title = 'Live corridor map · Midwest ↔ Southeast',
}: {
  runs: EnrichedRun[];
  title?: string;
}) {
  const segments = runs.flatMap((item) =>
    item.timeline
      .filter((step) => step.from !== step.to && cityNodes[step.from] && cityNodes[step.to])
      .map((step) => ({
        id: `${item.run.id}-${step.id}`,
        kind: step.kind,
        from: cityNodes[step.from],
        to: cityNodes[step.to],
      })),
  );

  return (
    <section className="runs__block runs__map-card" aria-label="Corridor route map">
      <div className="runs__form-head">
        <h2 className="runs__subtitle">{title}</h2>
        <div className="runs__map-legend">
          <span className="runs__map-key runs__map-key--paid">Paid load</span>
          <span className="runs__map-key runs__map-key--empty">Empty leg</span>
        </div>
      </div>
      <svg
        className="runs__map-svg"
        viewBox="0 0 560 280"
        role="img"
        aria-label="Midwest to Southeast freight corridor map"
      >
        <rect x="0" y="0" width="560" height="280" rx="8" fill="#f8fafc" />
        <g stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3">
          <line x1="40" y1="86" x2="520" y2="86" />
          <line x1="40" y1="168" x2="520" y2="168" />
          <line x1="226" y1="20" x2="226" y2="265" />
        </g>
        {segments.map((seg) => (
          <line
            key={seg.id}
            x1={seg.from.x}
            y1={seg.from.y}
            x2={seg.to.x}
            y2={seg.to.y}
            stroke={seg.kind === 'paid' ? 'var(--color-primary)' : 'var(--color-warn)'}
            strokeWidth={seg.kind === 'paid' ? '3' : '2'}
            strokeDasharray={seg.kind === 'empty' ? '5 4' : undefined}
            strokeLinecap="round"
          />
        ))}
        {primaryCities.map((name) => {
          const node = cityNodes[name];
          return (
            <g key={name} transform={`translate(${node.x}, ${node.y})`}>
              <circle
                r={node.isYard ? 5.5 : 4}
                fill={node.isYard ? 'var(--color-primary)' : 'var(--color-surface)'}
                stroke={node.isYard ? 'var(--color-surface)' : 'var(--color-text)'}
                strokeWidth="2"
              />
              <text
                x="8"
                y="4"
                fontSize="10"
                fontWeight={node.isYard ? '700' : '500'}
                fill="var(--color-text)"
              >
                {node.short}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}

export default FleetRouteMap;
