import type { InputHTMLAttributes } from 'react';
import {
  backhaulPreset,
  loadStatuses,
  type LoadDraft,
  type LoadStatus,
} from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addLoad,
  applyPresetToDraft,
  closeLoadModal,
  patchDraft,
  setModalRunId,
} from '../../store/slices/runsSlice';

function AddLoadModal({ defaultRunId }: { defaultRunId?: string }) {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((state) => state.runs.isLoadModalOpen);
  const runs = useAppSelector((state) => state.runs.runs);
  const modalRunId = useAppSelector((state) => state.runs.modalRunId);
  const draft = useAppSelector((state) => state.runs.draft);

  if (!isOpen) return null;

  const targetRunId = modalRunId || defaultRunId || runs[0]?.id || '214';
  const canAdd = Boolean(
    draft.customer.trim() &&
      draft.pickupCity.trim() &&
      draft.pickupState.trim() &&
      draft.deliveryCity.trim() &&
      draft.deliveryState.trim() &&
      draft.miles.trim(),
  );
  const update = (partial: Partial<LoadDraft>) => dispatch(patchDraft(partial));

  return (
    <div
      className="runs__modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Add a load"
    >
      <form
        className="runs__form runs__modal"
        onSubmit={(e) => {
          e.preventDefault();
          if (canAdd) dispatch(addLoad(targetRunId));
        }}
      >
        <div className="runs__form-head">
          <h2 className="runs__subtitle">Add a load</h2>
          <div className="runs__load-actions">
            <button
              className="runs__button runs__button--ghost runs__button--small"
              type="button"
              onClick={() => dispatch(applyPresetToDraft(backhaulPreset))}
            >
              Use Blue Ridge Logistics
            </button>
            <button
              className="runs__button runs__button--ghost runs__button--small"
              type="button"
              aria-label="Close modal"
              onClick={() => dispatch(closeLoadModal())}
            >
              Cancel
            </button>
          </div>
        </div>
        <label className="runs__field runs__form-head">
          <span className="runs__label">Truck / Driver</span>
          <select
            className="runs__input"
            aria-label="Truck / Driver"
            value={targetRunId}
            onChange={(e) => dispatch(setModalRunId(e.target.value))}
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.truck} · {r.driver} ({r.status})
              </option>
            ))}
            <option value="__new__">+ New run (Truck 412 · Sam Carter)</option>
          </select>
        </label>
        <FormInput
          label="Customer"
          value={draft.customer}
          onText={(customer) => update({ customer })}
        />
        <FormInput
          label="Rate, $"
          type="number"
          min="0"
          step="1"
          value={draft.rate}
          onText={(rate) => update({ rate })}
        />
        <label className="runs__field">
          <span className="runs__label">Status</span>
          <select
            className="runs__input"
            value={draft.status}
            onChange={(e) => update({ status: e.target.value as LoadStatus })}
          >
            {loadStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <StopFields prefix="Pickup" draft={draft} onUpdate={update} />
        <StopFields prefix="Delivery" draft={draft} onUpdate={update} />
        <FormInput
          label="Miles"
          type="number"
          min="0"
          step="1"
          value={draft.miles}
          onText={(miles) => update({ miles })}
        />
        <FormInput
          label="Drive time, hours"
          type="number"
          min="0"
          step="0.1"
          value={draft.driveHours}
          onText={(driveHours) => update({ driveHours })}
        />
        <FormInput
          label="BOL"
          value={draft.bol}
          onText={(bol) => update({ bol })}
        />
        <FormInput
          label="Commodity"
          value={draft.commodity}
          onText={(commodity) => update({ commodity })}
        />
        <div className="runs__form-submit">
          <button className="runs__button" type="submit" disabled={!canAdd}>
            Add load
          </button>
        </div>
      </form>
    </div>
  );
}

function StopFields({
  prefix,
  draft,
  onUpdate,
}: {
  prefix: 'Pickup' | 'Delivery';
  draft: LoadDraft;
  onUpdate: (p: Partial<LoadDraft>) => void;
}) {
  const k = prefix.toLowerCase() as 'pickup' | 'delivery';
  return (
    <>
      <FormInput
        label={`${prefix} place`}
        value={draft[`${k}Place`]}
        onText={(v) => onUpdate({ [`${k}Place`]: v })}
      />
      <FormInput
        label={`${prefix} city`}
        value={draft[`${k}City`]}
        onText={(v) => onUpdate({ [`${k}City`]: v })}
      />
      <FormInput
        label={`${prefix} state`}
        maxLength={2}
        value={draft[`${k}State`]}
        onText={(v) => onUpdate({ [`${k}State`]: v.toUpperCase() })}
      />
      <FormInput
        label={`${prefix} time`}
        type="datetime-local"
        value={draft[`${k}At`]}
        onText={(v) => onUpdate({ [`${k}At`]: v })}
      />
    </>
  );
}

function FormInput({
  label,
  onText,
  ...props
}: {
  label: string;
  onText: (v: string) => void;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <label className="runs__field">
      <span className="runs__label">{label}</span>
      <input
        className="runs__input"
        {...props}
        onChange={(e) => onText(e.target.value)}
      />
    </label>
  );
}

export default AddLoadModal;
