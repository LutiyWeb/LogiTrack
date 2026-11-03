import type { InputHTMLAttributes } from 'react';
import { backhaulPreset, loadStatuses, type LoadDraft, type LoadStatus } from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addLoad, applyPresetToDraft, patchDraft } from '../../store/slices/runsSlice';

function AddLoadForm({ runId }: { runId: string }) {
  const dispatch = useAppDispatch();
  const draft = useAppSelector((state) => state.runs.draft);
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
    <form
      className="runs__form"
      onSubmit={(e) => {
        e.preventDefault();
        if (canAdd) dispatch(addLoad(runId));
      }}
    >
      <div className="runs__form-head">
        <h2 className="runs__subtitle">Add a load</h2>
        {runId === '214' && (
          <button
            className="runs__button runs__button--ghost"
            type="button"
            onClick={() => dispatch(applyPresetToDraft(backhaulPreset))}
          >
            Use Blue Ridge Logistics
          </button>
        )}
      </div>
      <FormInput label="Customer" value={draft.customer} onText={(customer) => update({ customer })} />
      <FormInput label="Rate, $" type="number" min="0" step="1" value={draft.rate} onText={(rate) => update({ rate })} />
      <label className="runs__field">
        <span className="runs__label">Status</span>
        <select className="runs__input" value={draft.status} onChange={(e) => update({ status: e.target.value as LoadStatus })}>
          {loadStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>
      <StopFields prefix="Pickup" draft={draft} onUpdate={update} />
      <StopFields prefix="Delivery" draft={draft} onUpdate={update} />
      <FormInput label="Miles" type="number" min="0" step="1" value={draft.miles} onText={(miles) => update({ miles })} />
      <FormInput label="Drive time, hours" type="number" min="0" step="0.1" value={draft.driveHours} onText={(driveHours) => update({ driveHours })} />
      <FormInput label="BOL" value={draft.bol} onText={(bol) => update({ bol })} />
      <FormInput label="Commodity" value={draft.commodity} onText={(commodity) => update({ commodity })} />
      <div className="runs__form-submit">
        <button className="runs__button" type="submit" disabled={!canAdd}>
          Add load
        </button>
      </div>
    </form>
  );
}

function StopFields({ prefix, draft, onUpdate }: { prefix: 'Pickup' | 'Delivery'; draft: LoadDraft; onUpdate: (p: Partial<LoadDraft>) => void }) {
  const k = prefix.toLowerCase() as 'pickup' | 'delivery';
  return (
    <>
      <FormInput label={`${prefix} place`} value={draft[`${k}Place`]} onText={(v) => onUpdate({ [`${k}Place`]: v })} />
      <FormInput label={`${prefix} city`} value={draft[`${k}City`]} onText={(v) => onUpdate({ [`${k}City`]: v })} />
      <FormInput label={`${prefix} state`} maxLength={2} value={draft[`${k}State`]} onText={(v) => onUpdate({ [`${k}State`]: v.toUpperCase() })} />
      <FormInput label={`${prefix} time`} type="datetime-local" value={draft[`${k}At`]} onText={(v) => onUpdate({ [`${k}At`]: v })} />
    </>
  );
}

function FormInput({ label, onText, ...props }: { label: string; onText: (v: string) => void } & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  return (
    <label className="runs__field">
      <span className="runs__label">{label}</span>
      <input className="runs__input" {...props} onChange={(e) => onText(e.target.value)} />
    </label>
  );
}

export default AddLoadForm;
