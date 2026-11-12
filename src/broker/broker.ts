import { t } from '../i18n';

export type BrokerMessage = {
  id: string;
  /** us — письмо от нас, broker — ответ брокера, call — запись звонка. */
  kind: 'us' | 'broker' | 'call';
  author: string;
  /** Время в ISO. */
  at: string;
  text: string;
};

export type BrokerTemplate = keyof typeof t.broker.templates;

/** Что брокер «ответит» в демо на каждый шаблон. */
export const demoReplies: Record<BrokerTemplate | 'other', string> = {
  delay: 'Дякую, що попередили. Передали отримувачу, нове вікно доставки погоджено.',
  detention: 'Простій зафіксовано. Вкажіть час прибуття і виїзду в рахунку — компенсуємо.',
  breakdown: 'Тримайте в курсі. Якщо ремонт довше 4 годин — шукатимемо заміну.',
  quantity: 'Надішліть фото ТТН з фактичною кількістю, уточнимо з відправником.',
  delivered: 'Отримали, дякуємо. Чекаємо підтвердження доставки для оплати.',
  other: 'Отримали, дякуємо.',
};

/** Стартовая переписка по грузу Hart Freight (Тягач 214). */
export const seedBrokerThreads: Record<string, BrokerMessage[]> = {
  hart: [
    { id: 'b1', kind: 'broker', author: 'Hart Freight', at: '2026-10-28T11:30', text: 'Підтвердіть, будь ласка, ETA на South Park Warehouse.' },
    { id: 'b2', kind: 'us', author: 'Alex Mercer', at: '2026-10-28T11:40', text: 'Водій уже на складі, стоїть у черзі на розвантаження.' },
    { id: 'b3', kind: 'call', author: 'Alex Mercer', at: '2026-10-28T13:58', text: 'Дзвінок з Hart Freight: простій понад 2 год погодили, $150 за простій.' },
  ],
};
