export type TripQuoteInput = {
  tourists: number;
  ticketPerPerson: number;
  stayPerPerson: number;
  groupBudget: number;
  personalCosts: number;
  earnings: number;
};

export type TripQuote = {
  tourists: number;
  ticketPerPerson: number;
  stayPerPerson: number;
  foodPerPerson: number;
  personalPerPerson: number;
  earningsPerPerson: number;
  perPerson: number;
  total: number;
};

export function readMoney(value: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return number;
}

export function tripQuote(input: TripQuoteInput): TripQuote | null {
  if (!Number.isFinite(input.tourists) || input.tourists <= 0) return null;

  const foodPerPerson = input.groupBudget / input.tourists;
  const personalPerPerson = input.personalCosts / input.tourists;
  const earningsPerPerson = input.earnings / input.tourists;
  const perPerson =
    input.ticketPerPerson +
    input.stayPerPerson +
    foodPerPerson +
    personalPerPerson +
    earningsPerPerson;

  return {
    tourists: input.tourists,
    ticketPerPerson: input.ticketPerPerson,
    stayPerPerson: input.stayPerPerson,
    foodPerPerson,
    personalPerPerson,
    earningsPerPerson,
    perPerson,
    total: perPerson * input.tourists,
  };
}

export function quoteFromTrip(trip: {
  targetParticipants?: number;
  ticketPerPerson?: number;
  stayPerPerson?: number;
  groupBudget?: number;
  personalCosts?: number;
  earnings?: number;
}) {
  return tripQuote({
    tourists: trip.targetParticipants ?? 0,
    ticketPerPerson: trip.ticketPerPerson ?? 0,
    stayPerPerson: trip.stayPerPerson ?? 0,
    groupBudget: trip.groupBudget ?? 0,
    personalCosts: trip.personalCosts ?? 0,
    earnings: trip.earnings ?? 0,
  });
}

export function formatEuro(value: number) {
  return `${new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value)} €`;
}
