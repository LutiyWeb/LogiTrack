import { useEffect, type InputHTMLAttributes } from 'react';
import { loadStatusLabel, runStatusLabel, t } from '../../i18n';
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

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch(closeLoadModal());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, dispatch]);

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
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dispatch(closeLoadModal());
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t.addLoad.aria}
    >
      <form
        className="runs__form runs__modal"
        onSubmit={(e) => {
          e.preventDefault();
          if (canAdd) dispatch(addLoad(targetRunId));
        }}
      >
        <div className="runs__form-head">
          <h2 className="runs__subtitle">{t.addLoad.title}</h2>
          <div className="runs__load-actions">
            <button
              className="runs__button runs__button--secondary runs__button--small"
              type="button"
              onClick={() => dispatch(applyPresetToDraft(backhaulPreset))}
            >
              {t.addLoad.usePreset}
            </button>
            <button
              className="runs__button runs__button--tertiary runs__button--small"
              type="button"
              aria-label={t.addLoad.closeAria}
              onClick={() => dispatch(closeLoadModal())}
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
        <label className="runs__field runs__form-head">
          <span className="runs__label">{t.addLoad.truckDriver}</span>
          <select
            className="runs__input"
            aria-label={t.addLoad.truckDriver}
            value={targetRunId}
            onChange={(e) => dispatch(setModalRunId(e.target.value))}
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.truck} · {r.driver} ({runStatusLabel(r.status)})
              </option>
            ))}
          </select>
        </label>
        <FormInput
          label={t.addLoad.customer}
          value={draft.customer}
          onText={(customer) => update({ customer })}
        />
        <FormInput
          label={t.addLoad.rate}
          type="number"
          min="0"
          step="1"
          value={draft.rate}
          onText={(rate) => update({ rate })}
        />
        <label className="runs__field">
          <span className="runs__label">{t.addLoad.status}</span>
          <select
            className="runs__input"
            value={draft.status}
            onChange={(e) => update({ status: e.target.value as LoadStatus })}
          >
            {loadStatuses.map((s) => (
              <option key={s} value={s}>
                {loadStatusLabel(s)}
              </option>
            ))}
          </select>
        </label>
        <StopFields prefix="Pickup" draft={draft} onUpdate={update} />
        <StopFields prefix="Delivery" draft={draft} onUpdate={update} />
        <FormInput
          label={t.addLoad.miles}
          type="number"
          min="0"
          step="1"
          value={draft.miles}
          onText={(miles) => update({ miles })}
        />
        <FormInput
          label={t.addLoad.driveHours}
          type="number"
          min="0"
          step="0.1"
          value={draft.driveHours}
          onText={(driveHours) => update({ driveHours })}
        />
        <FormInput
          label={t.addLoad.bol}
          value={draft.bol}
          onText={(bol) => update({ bol })}
        />
        <FormInput
          label={t.addLoad.commodity}
          value={draft.commodity}
          onText={(commodity) => update({ commodity })}
        />
        <div className="runs__form-submit">
          <button className="runs__button" type="submit" disabled={!canAdd}>
            {t.addLoad.submit}
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
  const labels = t.addLoad[k];
  return (
    <>
      <FormInput
        label={labels.place}
        value={draft[`${k}Place`]}
        onText={(v) => onUpdate({ [`${k}Place`]: v })}
      />
      <FormInput
        label={labels.city}
        value={draft[`${k}City`]}
        onText={(v) => onUpdate({ [`${k}City`]: v })}
      />
      <FormInput
        label={labels.state}
        maxLength={2}
        value={draft[`${k}State`]}
        onText={(v) => onUpdate({ [`${k}State`]: v.toUpperCase() })}
      />
      <FormInput
        label={labels.time}
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
