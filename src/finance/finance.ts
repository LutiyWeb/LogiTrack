/** Обязательные расходы перевозчика (настройка в «Фінанси»). */
export type FixedCosts = {
  lease: number;
  insurance: number;
  permits: number;
  eld: number;
  parking: number;
  other: number;
};

export type FinanceSettings = {
  fixed: FixedCosts;
  /** Переменные расходы на милю (пальне и оплата водію — в «Акаунт»). */
  tollsPerMile: number;
  repairsPerMile: number;
  /** Прибыль, которую владелец хочет получить за месяц. */
  monthlyGoal: number;
};

export const defaultFinanceSettings: FinanceSettings = {
  fixed: { lease: 16000, insurance: 6300, permits: 700, eld: 350, parking: 900, other: 600 },
  tollsPerMile: 0.04,
  repairsPerMile: 0.15,
  monthlyGoal: 5000,
};

export const MONTH_LABEL = 'жовтень 2026';

/** Прошедшие недели месяца (демо). Текущая неделя считается из рейсов. */
export const pastWeeks = [
  { label: '1–5 жовт.', revenue: 9200, miles: 3000 },
  { label: '6–12 жовт.', revenue: 10400, miles: 3350 },
  { label: '13–19 жовт.', revenue: 8800, miles: 2950 },
  { label: '20–26 жовт.', revenue: 9600, miles: 3150 },
];

export const CURRENT_WEEK_LABEL = '27–31 жовт.';

export type WeekResult = { label: string; revenue: number; miles: number; costs: number };

export type MonthResult = {
  weeks: WeekResult[];
  revenue: number;
  miles: number;
  costs: number;
  profit: number;
  costPerMile: number;
  /** Выручка, при которой расходы покрыты. */
  breakeven: number;
  /** Выручка, при которой достигнута цель по прибыли. */
  goalRevenue: number;
  /** Сколько ещё миль нужно до безубыточности при текущей марже на милю. */
  milesToBreakeven: number | null;
};

export function fixedTotal(fixed: FixedCosts) {
  return Object.values(fixed).reduce((sum, value) => sum + value, 0);
}

export function monthResult(
  settings: FinanceSettings,
  variablePerMile: number,
  current: { revenue: number; miles: number },
): MonthResult {
  const fixed = fixedTotal(settings.fixed);
  const all = [...pastWeeks, { label: CURRENT_WEEK_LABEL, ...current }];
  // Постоянные расходы делим поровну между неделями месяца.
  const weeks = all.map((week) => ({
    ...week,
    costs: Math.round(week.miles * variablePerMile + fixed / all.length),
  }));

  const revenue = all.reduce((sum, week) => sum + week.revenue, 0);
  const miles = all.reduce((sum, week) => sum + week.miles, 0);
  const costs = Math.round(fixed + miles * variablePerMile);
  const marginPerMile = miles > 0 ? revenue / miles - variablePerMile : 0;
  const gap = costs - revenue;

  return {
    weeks,
    revenue,
    miles,
    costs,
    profit: revenue - costs,
    costPerMile: miles > 0 ? costs / miles : 0,
    breakeven: costs,
    goalRevenue: costs + settings.monthlyGoal,
    milesToBreakeven: gap > 0 && marginPerMile > 0 ? Math.ceil(gap / marginPerMile) : null,
  };
}
