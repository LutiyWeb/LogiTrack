import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import {
  createInitialOperationsState,
  detentionAmount,
  inspectionChecks,
  type LoadDocument,
  type DetentionClaim,
  type LoadMessage,
  type FleetAsset,
  type Inspection,
  type IntegrationEvent,
  type DriverAdjustment,
} from '../../operations/model';
import type { Facility } from '../../operations/facilities';
import { timeZones } from '../../operations/dispatch';
import type { IntegrationPlan } from '../../integrations/adapters';
import { SEED_NOW } from '../../runs/seed';

const slice = createSlice({
  name: 'operations',
  initialState: createInitialOperationsState(),
  reducers: {
    addLoadDocument(state, action: PayloadAction<LoadDocument>) {
      const doc = action.payload;
      if (
        !doc.id ||
        !doc.name.trim() ||
        !doc.runId ||
        !doc.loadId ||
        state.documents.some((item) => item.id === doc.id)
      )
        return;
      state.documents.push(doc);
    },
    reviewPod(
      state,
      action: PayloadAction<{
        documentId: string;
        runId: string;
        loadId: string;
        author: string;
      }>,
    ) {
      const document = state.documents.find(
        (item) =>
          item.id === action.payload.documentId &&
          item.runId === action.payload.runId &&
          item.loadId === action.payload.loadId &&
          item.kind === 'POD',
      );
      if (document && !document.reviewedAt) {
        document.reviewedAt = SEED_NOW;
        document.reviewedBy = action.payload.author;
      }
    },
    addDetentionClaim(state, action: PayloadAction<DetentionClaim>) {
      const claim = action.payload;
      const amount = detentionAmount(
        claim.arrivalAt,
        claim.departedAt,
        claim.freeMinutes,
        claim.ratePerHour,
      );
      if (
        amount === null ||
        state.detention.some((item) => item.id === claim.id)
      )
        return;
      if (
        state.detention.some(
          (item) =>
            item.runId === claim.runId &&
            item.loadId === claim.loadId &&
            item.arrivalAt === claim.arrivalAt &&
            item.departedAt === claim.departedAt,
        )
      )
        return;
      state.detention.push({
        ...claim,
        status: 'Pending',
        amountCents: amount,
        clientReference: undefined,
        reviewedBy: undefined,
      });
    },
    resolveDetention(
      state,
      action: PayloadAction<{
        id: string;
        approved: boolean;
        clientReference: string;
        author: string;
      }>,
    ) {
      const claim = state.detention.find(
        (item) => item.id === action.payload.id,
      );
      if (
        !claim ||
        claim.status !== 'Pending' ||
        (action.payload.approved && !action.payload.clientReference.trim())
      )
        return;
      claim.status = action.payload.approved ? 'Approved' : 'Rejected';
      claim.clientReference = action.payload.clientReference.trim();
      claim.reviewedBy = action.payload.author;
    },
    addLoadMessage(state, action: PayloadAction<LoadMessage>) {
      const message = action.payload;
      if (
        message.text.trim() &&
        message.text.length <= 5000 &&
        !state.messages.some((item) => item.id === message.id)
      )
        state.messages.push({ ...message, text: message.text.trim() });
    },
    updateFacility(
      state,
      action: PayloadAction<
        Pick<Facility, 'id' | 'timeZone' | 'contact' | 'phone' | 'instructions'>
      >,
    ) {
      const facility = state.facilities.find(
        (item) => item.id === action.payload.id,
      );
      if (
        facility &&
        timeZones.includes(
          action.payload.timeZone as (typeof timeZones)[number],
        ) &&
        action.payload.contact.length <= 120 &&
        action.payload.phone.length <= 50 &&
        action.payload.instructions.length <= 2000
      )
        Object.assign(facility, action.payload);
    },
    updateAsset(
      state,
      action: PayloadAction<{
        id: string;
        status: FleetAsset['status'];
        serviceNote: string;
        inspectionDue: string;
      }>,
    ) {
      const asset = state.assets.find((item) => item.id === action.payload.id);
      if (
        asset &&
        ['Available', 'Maintenance'].includes(action.payload.status) &&
        /^\d{4}-\d{2}-\d{2}$/.test(action.payload.inspectionDue)
      )
        Object.assign(asset, action.payload);
    },
    submitInspection(state, action: PayloadAction<Inspection>) {
      const inspection = action.payload;
      if (
        !state.assets.some((asset) => asset.id === inspection.assetId) ||
        state.inspections.some((item) => item.id === inspection.id)
      )
        return;
      if (
        inspectionChecks.some(
          (name) => typeof inspection.checks[name] !== 'boolean',
        )
      )
        return;
      if (
        Object.values(inspection.checks).some((ok) => !ok) &&
        !inspection.defects.trim()
      )
        return;
      state.inspections.push(inspection);
      if (Object.values(inspection.checks).some((ok) => !ok)) {
        const asset = state.assets.find(
          (item) => item.id === inspection.assetId,
        )!;
        asset.status = 'Maintenance';
        asset.serviceNote = inspection.defects;
      }
    },
    resolveInspection(
      state,
      action: PayloadAction<{ id: string; author: string; resolution: string }>,
    ) {
      const inspection = state.inspections.find(
        (item) => item.id === action.payload.id,
      );
      if (
        !inspection ||
        inspection.resolvedBy ||
        !action.payload.resolution.trim()
      )
        return;
      inspection.resolvedBy = action.payload.author;
      inspection.resolution = action.payload.resolution.trim();
    },
    importOperationalData(
      state,
      action: PayloadAction<IntegrationPlan & { raw: unknown }>,
    ) {
      if (
        state.integrations.some((item) => item.id === action.payload.event.id)
      )
        return;
      state.integrations.unshift(action.payload.event);
      for (const eld of action.payload.eld ?? []) {
        const existing = state.eld.find((item) => item.driver === eld.driver);
        if (existing) Object.assign(existing, eld);
        else state.eld.push(eld);
      }
      for (const fuel of action.payload.fuel ?? [])
        if (!state.fuel.some((item) => item.id === fuel.id))
          state.fuel.push(fuel);
      for (const mileage of action.payload.mileage ?? [])
        if (!state.stateMileage.some((item) => item.id === mileage.id))
          state.stateMileage.push(mileage);
    },
    logIntegrationError(state, action: PayloadAction<IntegrationEvent>) {
      state.integrations.unshift(action.payload);
    },
    addDriverAdjustment(state, action: PayloadAction<DriverAdjustment>) {
      const adjustment = action.payload;
      if (
        !Number.isSafeInteger(adjustment.amountCents) ||
        !adjustment.amountCents ||
        Math.abs(adjustment.amountCents) > 10000000 ||
        !adjustment.reason.trim() ||
        !adjustment.approvedBy.trim() ||
        adjustment.date > SEED_NOW.slice(0, 10) ||
        state.adjustments.some((item) => item.id === adjustment.id)
      )
        return;
      state.adjustments.push(adjustment);
    },
    resetOperationsState() {
      return createInitialOperationsState();
    },
  },
});
export const {
  addLoadDocument,
  reviewPod,
  addDetentionClaim,
  resolveDetention,
  addLoadMessage,
  updateAsset,
  updateFacility,
  submitInspection,
  resolveInspection,
  importOperationalData,
  logIntegrationError,
  addDriverAdjustment,
  resetOperationsState,
} = slice.actions;
export default slice.reducer;
