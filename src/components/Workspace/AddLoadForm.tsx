import { useEffect, type InputHTMLAttributes } from 'react';
import { loadStatusLabel, t } from '../../i18n';
import DateField from '../DateField/DateField';
import { useModalDialog } from '../../hooks/useModalDialog';
import { bookingConflict } from '../../store/booking';
import { validateDraft } from '../../runs/validation';
import '../RateCon/RateCon.scss';
import {
  backhaulPreset,
  loadStatuses,
  type LoadDraft,
  type LoadStatus,
} from '../../runs/seed';
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
  const state = useAppSelector((state) => state);
  const draft = useAppSelector((state) => state.runs.draft);
  const dialogRef = useModalDialog<HTMLFormElement>(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch(closeLoadModal());
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, dispatch]);

  if (!isOpen) return null;

  // В завершённый рейс груз не добавляется.
  const openRuns = runs.filter((run) => run.status !== 'Completed');
  const requested = modalRunId || defaultRunId || '';
  const targetRunId = openRuns.some((run) => run.id === requested)
    ? requested
    : (openRuns[0]?.id ?? '');
  const targetRun = runs.find((run) => run.id === targetRunId);
  const errors = validateDraft(draft);
  const f = t.addLoad;
  const missing = [
    !draft.customer.trim() && f.customer,
    !draft.pickupCity.trim() && f.pickup.city,
    !draft.pickupState.trim() && f.pickup.state,
    !draft.deliveryCity.trim() && f.delivery.city,
    !draft.deliveryState.trim() && f.delivery.state,
    !draft.miles.trim() && f.miles,
  ].filter(Boolean) as string[];
  const assignmentError = bookingConflict(state, {
    target: { kind: 'existing', runId: targetRunId },
    draft,
    legMiles: {},
    author: state.auth.currentUser?.name ?? '',
    roleTitle: state.auth.currentUser?.roleTitle ?? '',
  });
  const hasErrors = Object.keys(errors).length > 0;
  const canAdd =
    missing.length === 0 && !hasErrors && !assignmentError && !!targetRun;
  const update = (partial: Partial<LoadDraft>) => dispatch(patchDraft(partial));

  return (
    <div
      className="runs__modal-backdrop ratecon"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dispatch(closeLoadModal());
      }}
      role="dialog"
      aria-modal="true"
      aria-label={t.addLoad.aria}
    >
      <form
        ref={dialogRef}
        tabIndex={-1}
        className="ratecon__dialog ratecon__dialog--form"
        onSubmit={(e) => {
          e.preventDefault();
          if (canAdd) dispatch(addLoad(targetRunId));
        }}
      >
        <header className="ratecon__head">
          <div>
            <h2 className="runs__subtitle">{t.addLoad.title}</h2>
          </div>
          <button
            type="button"
            className="ratecon__close"
            aria-label={t.addLoad.closeAria}
            onClick={() => dispatch(closeLoadModal())}
          >
            ×
          </button>
        </header>

        <div className="ratecon__pick">
          {assignmentError && (
            <p className="ratecon__warning" role="alert">
              {assignmentError}
            </p>
          )}
          <button
            className="runs__button runs__button--secondary runs__button--small"
            type="button"
            onClick={() => dispatch(applyPresetToDraft(backhaulPreset))}
          >
            {t.addLoad.usePreset}
          </button>
          <div className="ratecon__grid">
            <label className="runs__field ratecon__wide">
              <span className="runs__label">{t.addLoad.truckDriver}</span>
              <select
                className="runs__input"
                aria-label={t.addLoad.truckDriver}
                value={targetRunId}
                onChange={(e) => dispatch(setModalRunId(e.target.value))}
              >
                {openRuns.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.truck} · {r.driver}
                  </option>
                ))}
              </select>
            </label>
            <FormInput
              label={t.addLoad.customer}
              value={draft.customer}
              required
              onText={(customer) => update({ customer })}
            />
            <FormInput
              label={t.addLoad.rate}
              type="number"
              min="0"
              step="1"
              value={draft.rate}
              onText={(rate) => update({ rate })}
              error={errors.rate}
            />
            <label className="runs__field">
              <span className="runs__label">{t.addLoad.status}</span>
              <select
                className="runs__input"
                value={draft.status}
                onChange={(e) =>
                  update({ status: e.target.value as LoadStatus })
                }
              >
                {loadStatuses.map((s) => (
                  <option key={s} value={s}>
                    {loadStatusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <StopFields
              prefix="Pickup"
              draft={draft}
              onUpdate={update}
              stateError={errors.pickupState}
            />
            <StopFields
              prefix="Delivery"
              draft={draft}
              onUpdate={update}
              stateError={errors.deliveryState}
              timeError={errors.deliveryAt}
            />
            <FormInput
              label={t.addLoad.miles}
              type="number"
              min="0"
              step="1"
              value={draft.miles}
              required
              onText={(miles) => update({ miles })}
              error={errors.miles}
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
          </div>
        </div>

        <footer className="ratecon__footer">
          <span className="ratecon__footer-hint">
            {missing.length > 0
              ? t.validation.missing(missing.join(', '))
              : assignmentError
                ? assignmentError
                : hasErrors
                  ? t.rateCon.fixErrors
                  : ''}
          </span>
          <button
            className="runs__button runs__button--tertiary"
            type="button"
            onClick={() => dispatch(closeLoadModal())}
          >
            {t.common.cancel}
          </button>
          <button className="runs__button" type="submit" disabled={!canAdd}>
            {t.addLoad.submit}
          </button>
        </footer>
      </form>
    </div>
  );
}

function StopFields({
  prefix,
  draft,
  onUpdate,
  timeError,
  stateError,
}: {
  prefix: 'Pickup' | 'Delivery';
  draft: LoadDraft;
  onUpdate: (p: Partial<LoadDraft>) => void;
  timeError?: string;
  stateError?: string;
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
        required
        value={draft[`${k}City`]}
        onText={(v) => onUpdate({ [`${k}City`]: v })}
      />
      <FormInput
        label={labels.state}
        required
        error={stateError}
        maxLength={2}
        value={draft[`${k}State`]}
        onText={(v) => onUpdate({ [`${k}State`]: v.toUpperCase() })}
      />
      <FormInput
        label={labels.time}
        type="datetime-local"
        value={draft[`${k}At`]}
        onText={(v) => onUpdate({ [`${k}At`]: v })}
        error={timeError}
      />
    </>
  );
}

function FormInput({
  label,
  onText,
  error,
  ...props
}: {
  label: string;
  onText: (v: string) => void;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'>) {
  const empty = !String(props.value ?? '').trim();
  return (
    <label className="runs__field">
      <span
        className="runs__label"
        data-required={
          props.required && empty ? t.validation.required : undefined
        }
      >
        {label}
      </span>
      {props.type === 'datetime-local' ? (
        <DateField
          type="datetime-local"
          value={String(props.value ?? '')}
          onValue={onText}
          aria-invalid={error ? true : undefined}
        />
      ) : (
        <input
          className="runs__input"
          {...props}
          required={undefined}
          aria-invalid={error ? true : undefined}
          onChange={(e) => onText(e.target.value)}
        />
      )}
      {error && (
        <span className="runs__field-error" role="alert">
          {error}
        </span>
      )}
    </label>
  );
}

export default AddLoadModal;
