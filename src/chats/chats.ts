import { t } from '../i18n';
import { DEMO_NOW } from '../runs/demo';

export type ChatChannel = 'whatsapp' | 'sms';

export type ChatMessage = {
  id: string;
  from: 'driver' | 'dispatcher';
  author: string;
  /** Время в ISO: по нему лента рейса сортирует сообщения и записи журнала. */
  at: string;
  text: string;
  /** Рейс, во время которого отправлено сообщение. */
  runId?: string;
};

export type Chat = {
  driver: string;
  channel: ChatChannel;
  unread: number;
  messages: ChatMessage[];
};

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' });

/** Время сообщения: всё, что новее «сейчас» демо, — «Щойно». */
export function messageTime(at: string) {
  return at > DEMO_NOW ? t.common.justNow : timeFormat.format(new Date(at));
}

export const seedChats: Chat[] = [
  {
    driver: 'Marcus Hill',
    channel: 'whatsapp',
    unread: 1,
    messages: [
      { id: 'm1', from: 'driver', author: 'Marcus Hill', at: '2026-10-28T11:50', runId: '214', text: 'Приїхав на South Park Warehouse, стою в черзі на розвантаження.' },
      { id: 'm2', from: 'driver', author: 'Marcus Hill', at: '2026-10-28T13:55', runId: '214', text: 'Досі чекаю, вже 2 години на складі. Фіксуємо простій?' },
      { id: 'm3', from: 'dispatcher', author: 'Alex Mercer', at: '2026-10-28T14:00', runId: '214', text: 'Так, фіксую простій. Після розвантаження надішли фото ТТН.' },
      { id: 'm4', from: 'driver', author: 'Marcus Hill', at: '2026-10-28T14:20', runId: '214', text: 'Розвантажився, фото ТТН надіслав. Чекаю на зворотний вантаж.' },
    ],
  },
  {
    driver: 'Elena Rostova',
    channel: 'sms',
    unread: 1,
    messages: [
      { id: 'e1', from: 'dispatcher', author: 'Alex Mercer', at: '2026-10-28T09:05', runId: '305', text: 'Як завантаження в Bowling Green?' },
      { id: 'e2', from: 'driver', author: 'Elena Rostova', at: '2026-10-28T14:45', runId: '305', text: 'Проїхала Louisville, все за графіком. На доставці буду до 15:30.' },
    ],
  },
  {
    driver: 'Dana Brooks',
    channel: 'whatsapp',
    unread: 0,
    messages: [
      { id: 'd1', from: 'dispatcher', author: 'Alex Mercer', at: '2026-10-28T10:15', runId: '118', text: 'Завтра Fort Wayne → Columbus, завантаження о 7:30.' },
      { id: 'd2', from: 'driver', author: 'Dana Brooks', at: '2026-10-28T10:22', runId: '118', text: 'Прийняла, о 7:30 буду на Northside Foundry.' },
    ],
  },
  {
    driver: 'Priya Nair',
    channel: 'sms',
    unread: 1,
    messages: [
      { id: 'p1', from: 'driver', author: 'Priya Nair', at: '2026-10-28T12:30', text: 'Я вільна, можу взяти рейс з завтрашнього ранку.' },
    ],
  },
];
