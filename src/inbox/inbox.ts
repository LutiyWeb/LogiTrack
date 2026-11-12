import { extractPdfLines } from '../ratecon/pdfText';
import { parseRateCon, type RateConField } from '../ratecon/parseRateCon';
import { DEMO_NOW, emptyDraft, type LoadDraft } from '../runs/demo';

export type InboxSource = 'email' | 'pdf' | 'manual';

/** Tentative — брокер предупредил заранее, груз ещё не подтверждён. */
export type InboxStatus = 'Tentative' | 'New' | 'Ready' | 'Assigned' | 'Rejected';

/** Груз в очереди «Вхідні вантажі». */
export type InboxLoad = {
  id: string;
  source: InboxSource;
  status: InboxStatus;
  receivedAt: string;
  draft: LoadDraft;
  /** Поля, которые парсер нашёл в PDF (остальные подсвечиваются). */
  found: RateConField[];
  warnings: string[];
  unrecognized: boolean;
  fileName?: string;
  /** Путь к PDF-образцу в public/ (для демо-писем). */
  fileUrl?: string;
  emailFrom?: string;
  runId?: string;
};

/** PDF-образцы в public/samples — их «присылают» демо-письма. Первым — тот, которого нет в очереди. */
export const sampleFiles = [
  { file: 'ratecon-prairie-route.pdf', from: 'rbaker@prairieroute-demo.example' },
  { file: 'ratecon-crestline.pdf', from: 'jenna.collins@crestline-demo.example' },
  { file: 'ratecon-northbound.pdf', from: 'mdiaz@northbound-demo.example' },
];

export function sampleUrl(file: string) {
  return `${import.meta.env.BASE_URL}samples/${file}`;
}

/**
 * PDF загруженных вручную файлов живут только в памяти вкладки:
 * в localStorage их не кладём. После перезагрузки превью недоступно.
 */
export const pdfCache = new Map<string, ArrayBuffer>();

export async function loadInboxPdf(item: InboxLoad): Promise<ArrayBuffer | null> {
  const cached = pdfCache.get(item.id);
  if (cached) return cached;
  if (!item.fileUrl) return null;
  try {
    const response = await fetch(item.fileUrl);
    return response.ok ? await response.arrayBuffer() : null;
  } catch {
    return null;
  }
}

/** Читает PDF и превращает его в груз очереди. */
export async function intakePdf(
  data: ArrayBuffer,
  meta: { fileName: string; source: InboxSource; fileUrl?: string; emailFrom?: string },
): Promise<InboxLoad> {
  const result = await extractPdfLines(data)
    .then((lines) => parseRateCon(lines))
    .catch(() => parseRateCon([]));
  return {
    id: crypto.randomUUID(),
    status: 'New',
    receivedAt: DEMO_NOW,
    draft: result.draft,
    found: result.found,
    warnings: result.warnings,
    unrecognized: result.unrecognized,
    ...meta,
  };
}

export function emptyManualLoad(): InboxLoad {
  return {
    id: crypto.randomUUID(),
    source: 'manual',
    status: 'New',
    receivedAt: DEMO_NOW,
    draft: { ...emptyDraft },
    found: [],
    warnings: [],
    unrecognized: false,
  };
}

const crestlineFound: RateConField[] = [
  'customer', 'rate', 'pickupPlace', 'pickupCity', 'pickupState', 'pickupAt',
  'deliveryPlace', 'deliveryCity', 'deliveryState', 'deliveryAt', 'miles', 'bol',
  'commodity', 'loadNumber', 'poNumber', 'equipment', 'weight', 'brokerMc',
  'brokerContact', 'brokerPhone', 'brokerEmail',
];

/** Стартовое состояние очереди для демо. */
export const seedInbox: InboxLoad[] = [
  {
    id: 'inbox-crestline',
    source: 'email',
    status: 'New',
    receivedAt: '2026-10-28T13:42',
    fileName: 'ratecon-crestline.pdf',
    fileUrl: sampleUrl('ratecon-crestline.pdf'),
    emailFrom: 'jenna.collins@crestline-demo.example',
    found: crestlineFound,
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Crestline Freight Brokerage',
      rate: '1850',
      pickupPlace: 'Ohio Valley Paper Mill',
      pickupCity: 'Louisville',
      pickupState: 'KY',
      pickupAt: '2026-10-30T08:00',
      deliveryPlace: 'Delta Distribution Center',
      deliveryCity: 'Memphis',
      deliveryState: 'TN',
      deliveryAt: '2026-10-31T07:00',
      miles: '385',
      bol: 'OV-77310',
      commodity: 'Packaged paper goods',
      loadNumber: 'CFB-240917',
      poNumber: 'PU-55821',
      equipment: "Dry Van 53'",
      weight: '38500',
      brokerMc: '718244',
      brokerContact: 'Jenna Collins',
      brokerPhone: '(615) 555-0142',
      brokerEmail: 'jenna.collins@crestline-demo.example',
    },
  },
  {
    id: 'inbox-northbound',
    source: 'email',
    status: 'New',
    receivedAt: '2026-10-28T14:05',
    fileName: 'ratecon-northbound.pdf',
    fileUrl: sampleUrl('ratecon-northbound.pdf'),
    emailFrom: 'mdiaz@northbound-demo.example',
    // Миль и ТТН в этом PDF нет — их подсветит форма проверки.
    found: crestlineFound.filter((key) => key !== 'miles' && key !== 'bol'),
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Northbound Logistics Group',
      rate: '2450',
      pickupPlace: 'Gem City Cold Storage',
      pickupCity: 'Dayton',
      pickupState: 'OH',
      pickupAt: '2026-10-30T06:00',
      deliveryPlace: 'Queen City Grocers DC',
      deliveryCity: 'Charlotte',
      deliveryState: 'NC',
      deliveryAt: '2026-10-31T09:00',
      commodity: 'Frozen bakery goods, keep at -10F',
      loadNumber: 'NLG-88214',
      poNumber: '4410-QC',
      equipment: "Reefer 53'",
      weight: '42000',
      brokerMc: '603917',
      brokerContact: 'Marco Diaz',
      brokerPhone: '216-555-0187',
      brokerEmail: 'mdiaz@northbound-demo.example',
    },
  },
  // Предварительные грузы: брокеры предупредили заранее.
  {
    id: 'plan-arizona',
    source: 'manual',
    status: 'Tentative',
    receivedAt: '2026-10-27T16:10',
    found: [],
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Crestline Freight Brokerage',
      rate: '4800',
      pickupCity: 'Phoenix',
      pickupState: 'AZ',
      pickupAt: '2026-11-11T08:00',
      deliveryCity: 'New York',
      deliveryState: 'NY',
      commodity: 'Сонячні панелі',
    },
  },
  {
    id: 'plan-texas',
    source: 'manual',
    status: 'Tentative',
    receivedAt: '2026-10-26T10:30',
    found: [],
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Blue Ridge Logistics',
      pickupCity: 'Dallas',
      pickupState: 'TX',
      pickupAt: '2026-11-05T07:00',
      deliveryCity: 'Atlanta',
      deliveryState: 'GA',
      commodity: 'Будматеріали',
    },
  },
  {
    id: 'plan-newjersey',
    source: 'manual',
    status: 'Tentative',
    receivedAt: '2026-10-28T09:15',
    found: [],
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Northbound Logistics Group',
      rate: '2300',
      pickupCity: 'Newark',
      pickupState: 'NJ',
      pickupAt: '2026-11-03T06:00',
      deliveryCity: 'Columbus',
      deliveryState: 'OH',
      commodity: 'Продукти, рефрижератор',
    },
  },
  {
    id: 'inbox-phone',
    source: 'manual',
    status: 'Ready',
    receivedAt: '2026-10-28T11:20',
    found: [],
    warnings: [],
    unrecognized: false,
    draft: {
      ...emptyDraft,
      customer: 'Midwest Steel Co.',
      rate: '980',
      pickupPlace: 'Northside Foundry',
      pickupCity: 'Fort Wayne',
      pickupState: 'IN',
      pickupAt: '2026-10-30T07:00',
      deliveryPlace: 'Miami Valley Works',
      deliveryCity: 'Dayton',
      deliveryState: 'OH',
      deliveryAt: '2026-10-30T11:30',
      miles: '115',
      driveHours: '2.5',
      commodity: 'Сталеві листи',
    },
  },
];
