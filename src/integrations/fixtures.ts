export const integrationFixtures = {
  payments: {
    id: 'payment-batch-1',
    provider: 'Demo accounting adapter',
    kind: 'payments',
    records: [
      {
        id: 'payment-001',
        invoiceNumber: 'LT-00001',
        amountCents: 40000,
        date: '2026-10-28',
        method: 'Bank transfer',
        reference: 'DEMO-PAYMENT-400',
      },
    ],
  },
  telemetry: {
    id: 'gps-batch-1',
    provider: 'Demo GPS adapter',
    kind: 'telemetry',
    records: [
      {
        id: 'gps-214-1458',
        truck: 'Тягач 214',
        lat: 33.91,
        lng: -84.45,
        at: '2026-10-28T14:58',
        label: 'Остання GPS-позиція біля Atlanta',
      },
    ],
  },
  eld: {
    id: 'eld-batch-1',
    provider: 'Demo ELD adapter',
    kind: 'eld',
    records: [
      {
        id: 'eld-luis-1459',
        driver: 'Luis Ortega',
        drivingHoursLeft: 0,
        windowHoursLeft: 0,
        cycleHoursLeft: 38,
        at: '2026-10-28T14:59',
      },
    ],
  },
  fuel: {
    id: 'fuel-batch-1',
    provider: 'Demo fuel card adapter',
    kind: 'fuel',
    records: [
      {
        id: 'fuel-001',
        truck: 'Тягач 214',
        date: '2026-10-28',
        state: 'GA',
        gallons: 80,
        amountCents: 28000,
      },
    ],
  },
  mileage: {
    id: 'mileage-batch-1',
    provider: 'Demo ELD adapter',
    kind: 'mileage',
    records: [
      {
        id: 'miles-214-ga-oct',
        truck: 'Тягач 214',
        month: '2026-10',
        state: 'GA',
        miles: 145,
      },
    ],
  },
} as const;
