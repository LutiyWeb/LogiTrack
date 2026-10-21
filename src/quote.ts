export type TripQuoteInput = {
  tourists: number;
  ticketPerPerson: number;
  stayPerPerson: number;
  rate: number;
  groupBudget: number;
  personalCosts: number;
  advertising: number;
  reservePerPerson: number;
  earnings: number;
  referrals: number;
};

export type TripQuote = {
  tourists: number;
  ticketLei: number;
  stayLei: number;
  foodLei: number;
  personalLei: number;
  advertisingLei: number;
  reserveLei: number;
  earningsLei: number;
  ticketPerPerson: number;
  stayPerPerson: number;
  foodPerPerson: number;
  personalPerPerson: number;
  advertisingPerPerson: number;
  reservePerPerson: number;
  earningsPerPerson: number;
  perPersonLei: number;
  perPerson: number;
  totalLei: number;
  total: number;
  depositLei: number;
  deposit: number;
  referralLei: number;
  referral: number;
};

export function readMoney(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
}

export function quoteGaps(input: TripQuoteInput) {
  const hasLei =
    input.ticketPerPerson > 0 ||
    input.stayPerPerson > 0 ||
    input.groupBudget > 0 ||
    input.personalCosts > 0 ||
    input.advertising > 0 ||
    input.reservePerPerson > 0 ||
    input.earnings > 0;

  return {
    needsTourists: !Number.isFinite(input.tourists) || input.tourists <= 0,
    needsRate: hasLei && input.rate <= 0,
  };
}

export function tripQuote(input: TripQuoteInput): TripQuote | null {
  const gaps = quoteGaps(input);
  if (gaps.needsTourists || gaps.needsRate) return null;

  const toEuro = (lei: number) => (input.rate > 0 ? lei / input.rate : 0);
  const ticketPerPerson = toEuro(input.ticketPerPerson);
  const stayPerPerson = toEuro(input.stayPerPerson);
  const foodLei = input.groupBudget / input.tourists;
  const personalLei = input.personalCosts / input.tourists;
  const advertisingLei = input.advertising / input.tourists;
  const reservePerPerson = toEuro(input.reservePerPerson);
  const earningsLei = input.earnings / input.tourists;
  const foodPerPerson = toEuro(foodLei);
  const personalPerPerson = toEuro(personalLei);
  const advertisingPerPerson = toEuro(advertisingLei);
  const earningsPerPerson = toEuro(earningsLei);
  const perPersonLei =
    input.ticketPerPerson +
    input.stayPerPerson +
    foodLei +
    personalLei +
    advertisingLei +
    input.reservePerPerson +
    earningsLei;
  const perPerson =
    ticketPerPerson +
    stayPerPerson +
    foodPerPerson +
    personalPerPerson +
    advertisingPerPerson +
    reservePerPerson +
    earningsPerPerson;
  const depositLei = input.ticketPerPerson + input.stayPerPerson;
  const deposit = ticketPerPerson + stayPerPerson;
  const referred = Math.min(input.referrals, input.tourists);
  const referralLei = referred * perPersonLei * 0.1;
  const referral = referred * perPerson * 0.1;

  return {
    tourists: input.tourists,
    ticketLei: input.ticketPerPerson,
    stayLei: input.stayPerPerson,
    foodLei,
    personalLei,
    advertisingLei,
    reserveLei: input.reservePerPerson,
    earningsLei,
    ticketPerPerson,
    stayPerPerson,
    foodPerPerson,
    personalPerPerson,
    advertisingPerPerson,
    reservePerPerson,
    earningsPerPerson,
    perPersonLei,
    perPerson,
    totalLei: perPersonLei * input.tourists,
    total: perPerson * input.tourists,
    depositLei,
    deposit,
    referralLei,
    referral,
  };
}

export function quoteFromTrip(trip: {
  targetParticipants?: number;
  ticketPerPerson?: number;
  stayPerPerson?: number;
  rate?: number;
  groupBudget?: number;
  personalCosts?: number;
  advertising?: number;
  reservePerPerson?: number;
  earnings?: number;
  referrals?: number;
}) {
  return tripQuote({
    tourists: trip.targetParticipants ?? 0,
    ticketPerPerson: trip.ticketPerPerson ?? 0,
    stayPerPerson: trip.stayPerPerson ?? 0,
    rate: trip.rate ?? 0,
    groupBudget: trip.groupBudget ?? 0,
    personalCosts: trip.personalCosts ?? 0,
    advertising: trip.advertising ?? 0,
    reservePerPerson: trip.reservePerPerson ?? 0,
    earnings: trip.earnings ?? 0,
    referrals: trip.referrals ?? 0,
  });
}

function formatAmount(value: number) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatEuro(value: number) {
  return `${formatAmount(value)} €`;
}

export function formatLei(value: number) {
  return `${formatAmount(value)} lei`;
}
