export type LoadIdentity = {
  customer: string;
  loadNumber?: string;
  bol?: string;
  brokerMc?: string;
};
export function normalizeIdentity(value: string | undefined) {
  return (value ?? '')
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** Load numbers are unique within a broker, not across all carriers/brokers. */
export function sameLoad(a: LoadIdentity, b: LoadIdentity) {
  const aMc = (a.brokerMc ?? '').replace(/\D/g, '');
  const bMc = (b.brokerMc ?? '').replace(/\D/g, '');
  const brokerMatches =
    aMc && bMc
      ? aMc === bMc
      : normalizeIdentity(a.customer) !== '' &&
        normalizeIdentity(a.customer) === normalizeIdentity(b.customer);
  if (!brokerMatches) return false;
  const aNumber = normalizeIdentity(a.loadNumber);
  const bNumber = normalizeIdentity(b.loadNumber);
  if (aNumber && bNumber) return aNumber === bNumber;
  const aBol = normalizeIdentity(a.bol);
  return !!aBol && aBol === normalizeIdentity(b.bol);
}
