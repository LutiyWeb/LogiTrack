import {
  fixedTotal,
  MONTH_LABEL,
  type FixedCosts,
  type MonthResult,
} from '../../finance/finance';
import { t } from '../../i18n';
import { formatMiles, formatMoney, readNumber } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectMonthResult } from '../../store/selectors/financeSelectors';
import { setFixedCost, updateFinance } from '../../store/slices/financeSlice';
import '../Workspace/Workspace.scss';
import './Finance.scss';

const fixedKeys = Object.keys(t.finance.fixed) as (keyof FixedCosts)[];

function Finance() {
  const dispatch = useAppDispatch();
  const month = useAppSelector(selectMonthResult);
  const settings = useAppSelector((state) => state.finance);
  const fuel = useAppSelector((state) => state.ui.fuelCostPerMile);
  const driverPay = useAppSelector((state) => state.ui.driverPayPerMile);

  const reachedBreakeven = month.revenue >= month.breakeven;

  return (
    <div className="runs">
      <header className="runs__heading">
        <div>
          <h1 className="workspace__title">{t.finance.title}</h1>
          <p className="runs__meta">{t.finance.subtitle(MONTH_LABEL)}</p>
        </div>
        <span className="runs__badge runs__badge--warn" title={t.finance.estimateNote}>
          {t.finance.estimate}
        </span>
      </header>

      <div className="finance__top">
        <section className="runs__block finance__ring-card" aria-label={t.finance.ringAria}>
          <ProgressRing month={month} />
          <div className="finance__ring-text">
            <p className="finance__headline">
              {reachedBreakeven
                ? t.finance.profitMonth(formatMoney(month.profit, 0))
                : t.finance.toBreakeven(
                    formatMoney(month.breakeven - month.revenue, 0),
                    formatMiles(month.milesToBreakeven ?? 0),
                  )}
            </p>
            <p className="runs__meta">
              {month.revenue >= month.goalRevenue
                ? t.finance.goalReached
                : t.finance.toGoal(formatMoney(month.goalRevenue - month.revenue, 0))}
            </p>
            <ul className="finance__legend">
              <li>
                <span className="finance__tick finance__tick--breakeven" aria-hidden="true" />
                {t.finance.breakeven} · {formatMoney(month.breakeven, 0)}
              </li>
              <li>
                <span className="finance__tick finance__tick--goal" aria-hidden="true" />
                {t.finance.goal} · {formatMoney(month.goalRevenue, 0)}
              </li>
            </ul>
          </div>
        </section>

        <dl className="runs__stats finance__stats" aria-label={t.finance.kpiAria}>
          <div className="runs__stat">
            <dt>{t.finance.revenue}</dt>
            <dd>{formatMoney(month.revenue, 0)}</dd>
            <span className="runs__meta">{formatMiles(month.miles)}</span>
          </div>
          <div className="runs__stat" title={t.finance.estimateNote}>
            <dt>{t.finance.costs}</dt>
            <dd>{formatMoney(month.costs, 0)}</dd>
            <span className="runs__meta">{t.finance.estimate}</span>
          </div>
          <div className="runs__stat">
            <dt>{t.finance.profit}</dt>
            <dd className={month.profit < 0 ? 'finance__negative' : undefined}>
              {formatMoney(month.profit, 0)}
            </dd>
          </div>
          <div className="runs__stat">
            <dt>{t.finance.costPerMile}</dt>
            <dd>{formatMoney(month.costPerMile, 2)}</dd>
            <span className="runs__meta">{t.finance.costPerMileSub}</span>
          </div>
        </dl>
      </div>

      <section className="runs__block" aria-label={t.finance.chartAria}>
        <div className="runs__form-head">
          <h2 className="runs__subtitle">{t.finance.chartTitle}</h2>
          <ul className="finance__legend finance__legend--row">
            <li>
              <span className="finance__swatch finance__swatch--revenue" aria-hidden="true" />
              {t.finance.legendRevenue}
            </li>
            <li>
              <span className="finance__swatch finance__swatch--costs" aria-hidden="true" />
              {t.finance.legendCosts}
            </li>
          </ul>
        </div>
        <WeeklyBars month={month} />
      </section>

      <section className="runs__form" aria-label={t.finance.settingsAria}>
        <div className="runs__form-head">
          <h2 className="runs__subtitle">{t.finance.settingsTitle}</h2>
          <span className="runs__meta">{t.finance.estimateNote}</span>
        </div>

        <h3 className="runs__label runs__form-head">
          {t.finance.fixedTitle} · {formatMoney(fixedTotal(settings.fixed), 0)}
        </h3>
        {fixedKeys.map((key) => (
          <MoneyField
            key={key}
            label={t.finance.fixed[key]}
            value={settings.fixed[key]}
            step="50"
            onChange={(value) => dispatch(setFixedCost({ key, value }))}
          />
        ))}

        <h3 className="runs__label runs__form-head">{t.finance.variableTitle}</h3>
        <MoneyField label={`${t.finance.fuel} (${t.finance.fromAccount})`} value={fuel} disabled />
        <MoneyField label={`${t.finance.driverPay} (${t.finance.fromAccount})`} value={driverPay} disabled />
        <MoneyField
          label={t.finance.tolls}
          value={settings.tollsPerMile}
          step="0.01"
          onChange={(value) => dispatch(updateFinance({ tollsPerMile: value }))}
        />
        <MoneyField
          label={t.finance.repairs}
          value={settings.repairsPerMile}
          step="0.01"
          onChange={(value) => dispatch(updateFinance({ repairsPerMile: value }))}
        />

        <MoneyField
          label={t.finance.goalField}
          value={settings.monthlyGoal}
          step="500"
          onChange={(value) => dispatch(updateFinance({ monthlyGoal: value }))}
        />
      </section>
    </div>
  );
}

function MoneyField({
  label,
  value,
  step,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  step?: string;
  disabled?: boolean;
  onChange?: (value: number) => void;
}) {
  return (
    <label className="runs__field">
      <span className="runs__label">{label}</span>
      <input
        className="runs__input"
        type="number"
        min="0"
        step={step}
        disabled={disabled}
        value={value || ''}
        onChange={(event) => onChange?.(readNumber(event.target.value))}
      />
    </label>
  );
}

/** Кольцо: выручка месяца относительно цели, с отметками безубыточности и цели. */
function ProgressRing({ month }: { month: MonthResult }) {
  const size = 168;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const max = Math.max(month.goalRevenue, month.revenue) * 1.08;
  const share = (value: number) => Math.min(1, value / max);
  const tick = (value: number) => {
    const angle = share(value) * 2 * Math.PI - Math.PI / 2;
    const inner = radius - stroke / 2 - 3;
    const outer = radius + stroke / 2 + 3;
    const c = size / 2;
    return {
      x1: c + inner * Math.cos(angle),
      y1: c + inner * Math.sin(angle),
      x2: c + outer * Math.cos(angle),
      y2: c + outer * Math.sin(angle),
    };
  };
  const progress = share(month.revenue) * circumference;

  return (
    <svg
      className="finance__ring"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={t.finance.revenueOf(formatMoney(month.revenue, 0), formatMoney(month.goalRevenue, 0))}
    >
      <circle className="finance__ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
      <circle
        className="finance__ring-progress"
        cx={size / 2}
        cy={size / 2}
        r={radius}
        strokeWidth={stroke}
        strokeDasharray={`${progress} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <line className="finance__tick-line finance__tick-line--breakeven" {...tick(month.breakeven)} />
      <line className="finance__tick-line finance__tick-line--goal" {...tick(month.goalRevenue)} />
      <text className="finance__ring-value" x="50%" y="48%" textAnchor="middle">
        {formatMoney(month.revenue, 0)}
      </text>
      <text className="finance__ring-caption" x="50%" y="60%" textAnchor="middle">
        {t.finance.legendRevenue}
      </text>
    </svg>
  );
}

/** Столбики «виручка / витрати» по неделям. */
function WeeklyBars({ month }: { month: MonthResult }) {
  const max = Math.max(...month.weeks.flatMap((week) => [week.revenue, week.costs]));

  return (
    <div className="finance__bars" role="list">
      {month.weeks.map((week) => (
        <div key={week.label} className="finance__week" role="listitem">
          <div className="finance__pair">
            {(
              [
                ['revenue', week.revenue, t.finance.legendRevenue],
                ['costs', week.costs, t.finance.legendCosts],
              ] as const
            ).map(([series, value, name]) => (
              <span
                key={series}
                className={`finance__bar finance__bar--${series}`}
                style={{ height: `${(value / max) * 100}%` }}
                tabIndex={0}
                aria-label={t.finance.barLabel(week.label, name, formatMoney(value, 0))}
                data-tip={`${name}: ${formatMoney(value, 0)}`}
              />
            ))}
          </div>
          <span className="runs__meta">{week.label}</span>
        </div>
      ))}
    </div>
  );
}

export default Finance;
