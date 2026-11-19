import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  backhaulPreset,
  deriveRunStatus,
  draftToLoad,
  emptyDraft,
  formatMoney,
  runs as seedRuns,
  SEED_NOW,
  type LoadDraft,
  type LoadStatus,
  type Run,
  type RunStatus,
} from '../../runs/seed';
import { t } from '../../i18n';
import {
  invoiceTotal,
  invoicesFromLoads,
  makeInvoice,
  paymentError,
  toCents,
  type Invoice,
  type InvoicePayment,
  type FactoringAgreement,
  validDate,
} from '../../billing/billing';
import { sameLoad } from '../../inbox/identity';
import { reviewPod } from './operationsSlice';
import { carrierProfile } from './uiSlice';

export type RateConTarget =
  | {
      kind: 'new';
      runId: string;
      truck: string;
      driver: string;
      drivingHoursLeft: number;
    }
  | { kind: 'existing'; runId: string };

export type BookRateConPayload = {
  target: RateConTarget;
  draft: LoadDraft;
  /** Empty-leg miles worked out by routing, keyed like manualMiles. */
  legMiles: Record<string, number>;
  /** Имя PDF, если груз пришёл из подтверждения ставки. */
  fileName?: string;
  author: string;
  roleTitle: string;
  /** Груз из очереди «Вхідні вантажі». */
  inboxId?: string;
  trailerId?: string;
};

export type RunsState = {
  runs: Run[];
  invoices: Invoice[];
  openRunId: string | null;
  manualMiles: Record<string, number>;
  draft: LoadDraft;
  isLoadModalOpen: boolean;
  modalRunId: string;
  scrollToOffers: boolean;
};

export function createInitialRunsState(): RunsState {
  const runs = structuredClone(seedRuns);
  return {
    runs,
    invoices: invoicesFromLoads(runs),
    openRunId: null,
    manualMiles: {},
    draft: { ...emptyDraft },
    isLoadModalOpen: false,
    modalRunId: '214',
    scrollToOffers: false,
  };
}

const runsSlice = createSlice({
  name: 'runs',
  initialState: createInitialRunsState(),
  reducers: {
    openRun(
      state,
      action: PayloadAction<
        string | null | { runId: string | null; scrollToOffers?: boolean }
      >,
    ) {
      if (typeof action.payload === 'object' && action.payload !== null) {
        state.openRunId = action.payload.runId;
        state.scrollToOffers = Boolean(action.payload.scrollToOffers);
      } else {
        state.openRunId = action.payload;
        state.scrollToOffers = false;
      }
      if (state.openRunId) {
        state.modalRunId = state.openRunId;
      }
      state.isLoadModalOpen = false;
      state.draft = { ...emptyDraft };
    },
    clearScrollToOffers(state) {
      state.scrollToOffers = false;
    },
    openLoadModal(state, action: PayloadAction<string | undefined>) {
      state.isLoadModalOpen = true;
      if (action.payload) {
        state.modalRunId = action.payload;
      } else if (state.openRunId) {
        state.modalRunId = state.openRunId;
      }
    },
    closeLoadModal(state) {
      state.isLoadModalOpen = false;
    },
    setModalRunId(state, action: PayloadAction<string>) {
      state.modalRunId = action.payload;
    },
    patchDraft(state, action: PayloadAction<Partial<LoadDraft>>) {
      state.draft = { ...state.draft, ...action.payload };
    },
    applyPresetToDraft(state, action: PayloadAction<LoadDraft | undefined>) {
      state.draft = { ...emptyDraft, ...(action.payload ?? backhaulPreset) };
      state.isLoadModalOpen = true;
    },
    addLoad(
      state,
      action: PayloadAction<
        string | { runId: string; draft?: LoadDraft; trailerId?: string }
      >,
    ) {
      const runId =
        typeof action.payload === 'string'
          ? action.payload
          : action.payload.runId;
      const sourceDraft =
        typeof action.payload === 'string'
          ? state.draft
          : (action.payload.draft ?? state.draft);

      const run = state.runs.find((item) => item.id === runId);
      // В завершённый рейс груз не добавляется: для тягача создаётся новый рейс.
      if (!run || run.status === 'Completed') return;

      if (
        state.runs.some((item) =>
          item.loads.some((load) => sameLoad(load, sourceDraft)),
        )
      )
        return;
      if (typeof action.payload !== 'string' && action.payload.trailerId)
        run.trailerId = action.payload.trailerId;
      const load = draftToLoad(sourceDraft, crypto.randomUUID());
      if (load.status === 'Delivered') {
        load.billingStatus = 'POD required';
      }
      run.loads.push(load);
      run.status = deriveRunStatus(run);
      state.isLoadModalOpen = false;
      state.draft = { ...emptyDraft };
    },
    bookRateCon(state, action: PayloadAction<BookRateConPayload>) {
      const { target, draft, legMiles, fileName, author, roleTitle } =
        action.payload;
      if (
        state.runs.some((item) =>
          item.loads.some((load) => sameLoad(load, draft)),
        )
      )
        return;
      let run: Run | undefined;

      if (target.kind === 'new') {
        if (
          state.runs.some(
            (item) =>
              item.id === target.runId ||
              (item.truck === target.truck && item.status !== 'Completed'),
          )
        )
          return;
        const [yardCity, yardState] = carrierProfile.homeYard
          .split(',')
          .map((part) => part.trim());
        run = {
          id: target.runId,
          truck: target.truck,
          driver: target.driver,
          yardCity,
          yardState,
          status: 'Planned',
          drivingHoursLeft: target.drivingHoursLeft,
          trailerId: action.payload.trailerId,
          loads: [],
          notes: [],
        };
        state.runs.unshift(run);
      } else {
        run = state.runs.find((item) => item.id === target.runId);
      }
      if (!run || run.status === 'Completed') return;
      if (action.payload.trailerId) run.trailerId = action.payload.trailerId;

      const load = draftToLoad(draft, crypto.randomUUID());
      if (fileName) load.rateConFile = fileName;
      if (action.payload.inboxId) load.sourceInboxId = action.payload.inboxId;
      run.loads.push(load);
      run.status = deriveRunStatus(run);
      Object.assign(state.manualMiles, legMiles);

      const reference = load.loadNumber
        ? t.notes.bookedLoad(load.loadNumber)
        : t.notes.bookedAny;
      run.notes = [
        ...(run.notes ?? []),
        {
          id: crypto.randomUUID(),
          author,
          roleTitle,
          at: t.common.justNow,
          iso: new Date().toISOString(),
          text: t.notes.booked(
            reference,
            fileName ? t.notes.fromRateCon(fileName) : t.notes.fromQueue,
            `${load.customer}, ${load.pickup.city}, ${load.pickup.state} → ${load.delivery.city}, ${load.delivery.state}, ${formatMoney(load.rate, 0)}`,
          ),
        },
      ];

      state.openRunId = run.id;
      state.modalRunId = run.id;
      state.isLoadModalOpen = false;
      state.scrollToOffers = false;
    },
    updateLoadStatus(
      state,
      action: PayloadAction<{
        runId: string;
        loadId: string;
        status: LoadStatus;
      }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      const load = run?.loads.find((item) => item.id === action.payload.loadId);
      // После выставленного счёта статус груза не откатывается.
      if (
        run &&
        load &&
        load.billingStatus !== 'Invoiced' &&
        load.billingStatus !== 'POD received'
      ) {
        load.status = action.payload.status;
        if (action.payload.status === 'At pickup')
          load.pickupConfirmedAt ??= SEED_NOW;
        if (action.payload.status === 'Delivered')
          load.deliveredAt ??= SEED_NOW;
        if (action.payload.status === 'Delivered' && !load.billingStatus) {
          load.billingStatus = 'POD required';
        }
        run.status = deriveRunStatus(run);
      }
    },
    advanceLoadBilling(
      state,
      action: PayloadAction<{ runId: string; loadId: string; author?: string }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      const load = run?.loads.find((item) => item.id === action.payload.loadId);
      if (!run || !load || load.status !== 'Delivered') return;
      if (load.billingStatus === 'POD received') {
        if (
          state.invoices.some(
            (invoice) => invoice.loadId === load.id && invoice.runId === run.id,
          )
        )
          return;
        state.invoices.push(
          makeInvoice(
            run,
            load,
            state.invoices.length + 1,
            action.payload.author ?? 'Диспетчер',
          ),
        );
        load.billingStatus = 'Invoiced';
        load.invoicedAmount = load.rate;
      }
    },
    invoiceCustomerLoads(
      state,
      action: PayloadAction<string | { customer: string; author: string }>,
    ) {
      const target = (
        typeof action.payload === 'string'
          ? action.payload
          : action.payload.customer
      ).trim();
      const author =
        typeof action.payload === 'string'
          ? 'Диспетчер'
          : action.payload.author;
      state.runs.forEach((run) => {
        run.loads.forEach((load) => {
          if (
            load.customer.trim() === target &&
            load.status === 'Delivered' &&
            load.billingStatus === 'POD received' &&
            !state.invoices.some(
              (invoice) =>
                invoice.loadId === load.id && invoice.runId === run.id,
            )
          ) {
            state.invoices.push(
              makeInvoice(run, load, state.invoices.length + 1, author),
            );
            load.billingStatus = 'Invoiced';
            load.invoicedAmount = load.rate;
          }
        });
      });
    },
    recordInvoiceFactoring(
      state,
      action: PayloadAction<{
        invoiceId: string;
        agreement: FactoringAgreement;
      }>,
    ) {
      const invoice = state.invoices.find(
        (item) => item.id === action.payload.invoiceId,
      );
      const agreement = action.payload.agreement;
      if (
        !invoice ||
        invoice.factoring ||
        invoice.payments.length ||
        !agreement.company.trim() ||
        !agreement.reference.trim() ||
        !agreement.recordedBy.trim()
      )
        return;
      if (
        !Number.isSafeInteger(agreement.feeCents) ||
        !Number.isSafeInteger(agreement.advanceCents) ||
        agreement.feeCents < 0 ||
        agreement.advanceCents < 0 ||
        agreement.feeCents + agreement.advanceCents > invoiceTotal(invoice)
      )
        return;
      if (
        !validDate(agreement.date) ||
        agreement.date < invoice.issuedOn ||
        agreement.date > SEED_NOW.slice(0, 10)
      )
        return;
      invoice.factoring = agreement;
    },
    recordInvoicePayment(
      state,
      action: PayloadAction<{ invoiceId: string; payment: InvoicePayment }>,
    ) {
      const invoice = state.invoices.find(
        (item) => item.id === action.payload.invoiceId,
      );
      if (!invoice) return;
      const payment = action.payload.payment;
      if (
        !payment.id ||
        invoice.payments.some((item) => item.id === payment.id)
      )
        return;
      if (
        invoice.payments.some(
          (item) =>
            item.reference.trim().toLowerCase() ===
            payment.reference.trim().toLowerCase(),
        )
      )
        return;
      if (
        !Number.isSafeInteger(payment.amountCents) ||
        !payment.recordedBy.trim()
      )
        return;
      if (
        paymentError(
          {
            amount: (payment.amountCents / 100).toFixed(2),
            date: payment.date,
            method: payment.method,
            reference: payment.reference,
          },
          invoice,
        )
      )
        return;
      invoice.payments.push({
        ...payment,
        reference: payment.reference.trim(),
      });
    },
    issueLoadSupplement(
      state,
      action: PayloadAction<{ runId: string; loadId: string; author: string }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      const load = run?.loads.find((item) => item.id === action.payload.loadId);
      if (
        !run ||
        !load ||
        load.status !== 'Delivered' ||
        load.billingStatus !== 'Invoiced'
      )
        return;
      const alreadyInvoiced = state.invoices
        .filter(
          (invoice) => invoice.runId === run.id && invoice.loadId === load.id,
        )
        .reduce((sum, invoice) => sum + invoiceTotal(invoice), 0);
      const remainingCents = toCents(load.rate) - alreadyInvoiced;
      if (remainingCents <= 0) return;
      const invoice = makeInvoice(
        run,
        load,
        state.invoices.length + 1,
        action.payload.author,
        undefined,
        remainingCents / 100,
      );
      invoice.lines = [
        {
          description: 'Додаткова погоджена оплата за простій',
          amountCents: remainingCents,
        },
      ];
      state.invoices.push(invoice);
      load.invoicedAmount = load.rate;
    },
    addLoadDetention(
      state,
      action: PayloadAction<{
        runId: string;
        loadId: string;
        amount: number;
        claimId?: string;
        author: string;
        roleTitle: string;
      }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      const load = run?.loads.find((item) => item.id === action.payload.loadId);
      if (
        !run ||
        !load ||
        (action.payload.claimId
          ? load.detentionClaimIds?.includes(action.payload.claimId)
          : load.detentionFee) ||
        !Number.isFinite(action.payload.amount) ||
        action.payload.amount <= 0 ||
        action.payload.amount > 100000
      )
        return;
      load.rate = Math.round((load.rate + action.payload.amount) * 100) / 100;
      load.detentionFee = (load.detentionFee ?? 0) + action.payload.amount;
      if (action.payload.claimId) {
        load.detentionClaimIds ??= [];
        load.detentionClaimIds.push(action.payload.claimId);
      }
      run.notes = [
        ...(run.notes ?? []),
        {
          id: crypto.randomUUID(),
          author: action.payload.author,
          roleTitle: action.payload.roleTitle,
          at: t.common.justNow,
          iso: new Date().toISOString(),
          text: t.notes.detention(
            action.payload.amount,
            load.customer || t.notes.detentionFallback,
            load.rate,
          ),
        },
      ];
    },
    addRunNote(
      state,
      action: PayloadAction<{
        runId: string;
        author: string;
        roleTitle: string;
        text: string;
      }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      const text = action.payload.text.trim();
      if (!run || !text) return;
      run.notes = [
        ...(run.notes ?? []),
        {
          id: crypto.randomUUID(),
          author: action.payload.author,
          roleTitle: action.payload.roleTitle,
          at: t.common.justNow,
          iso: new Date().toISOString(),
          text,
        },
      ];
    },
    removeLoad(
      state,
      action: PayloadAction<{ runId: string; loadId: string }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      if (
        !run ||
        run.loads.length <= 1 ||
        state.invoices.some(
          (invoice) =>
            invoice.runId === run.id &&
            invoice.loadId === action.payload.loadId,
        )
      )
        return;
      run.loads = run.loads.filter((item) => item.id !== action.payload.loadId);
      run.status = deriveRunStatus(run);
    },
    reassignRun(
      state,
      action: PayloadAction<{
        runId: string;
        truck: string;
        driver: string;
        drivingHoursLeft: number;
        trailerId?: string;
        author: string;
        reason: string;
      }>,
    ) {
      const run = state.runs.find((run) => run.id === action.payload.runId);
      if (
        !run ||
        run.status !== 'Planned' ||
        run.loads.some((load) => load.status !== 'Assigned')
      )
        return;
      const previous = `${run.truck} / ${run.driver}`;
      run.truck = action.payload.truck;
      run.driver = action.payload.driver;
      run.drivingHoursLeft = action.payload.drivingHoursLeft;
      run.trailerId = action.payload.trailerId;
      run.location = undefined;
      run.notes ??= [];
      run.notes.push({
        id: crypto.randomUUID(),
        author: action.payload.author,
        roleTitle: 'Диспетчер',
        at: t.common.justNow,
        iso: SEED_NOW,
        text: `Перепризначено: ${previous} → ${run.truck} / ${run.driver}. Причина: ${action.payload.reason}`,
      });
    },
    updateRunStatus(
      state,
      action: PayloadAction<{ runId: string; status: RunStatus }>,
    ) {
      const run = state.runs.find((item) => item.id === action.payload.runId);
      if (run) {
        run.status = action.payload.status;
      }
    },
    setManualMiles(
      state,
      action: PayloadAction<{ key: string; miles: number | null }>,
    ) {
      const { key, miles } = action.payload;
      if (miles === null) {
        delete state.manualMiles[key];
      } else {
        state.manualMiles[key] = miles;
      }
    },
    resetRunsState() {
      return createInitialRunsState();
    },
  },
  extraReducers: (builder) => {
    builder.addCase(reviewPod, (state, action) => {
      const load = state.runs
        .find((run) => run.id === action.payload.runId)
        ?.loads.find((load) => load.id === action.payload.loadId);
      if (load?.status === 'Delivered' && load.billingStatus !== 'Invoiced')
        load.billingStatus = 'POD received';
    });
  },
});

export const {
  openRun,
  clearScrollToOffers,
  openLoadModal,
  closeLoadModal,
  setModalRunId,
  patchDraft,
  applyPresetToDraft,
  addLoad,
  bookRateCon,
  updateLoadStatus,
  advanceLoadBilling,
  invoiceCustomerLoads,
  recordInvoiceFactoring,
  recordInvoicePayment,
  issueLoadSupplement,
  addLoadDetention,
  addRunNote,
  removeLoad,
  reassignRun,
  updateRunStatus,
  setManualMiles,
  resetRunsState,
} = runsSlice.actions;

export const addLoadFromDraft = addLoad;

export default runsSlice.reducer;
