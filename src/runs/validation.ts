import { isUsState } from '../geo/geo';
import { t } from '../i18n';
import { readNumber, type LoadDraft } from './seed';

export const MAX_RATE = 100_000;
export const MAX_LOADED_MILES = 5_000;
export const MAX_WEIGHT_LBS = 100_000;

export type DraftErrors = Partial<Record<keyof LoadDraft, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ZIP = /^\d{5}(-\d{4})?$/;

/** Ставка груза: пустое значение не ошибка формата (его ловит «обов’язкове поле»). */
export function rateError(value: string): string {
  if (!value.trim()) return '';
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate <= 0) return t.validation.rateNotPositive;
  if (rate > MAX_RATE) return t.validation.rateTooHigh;
  return '';
}

export function stateError(value: string): string {
  return value.trim() && !isUsState(value) ? t.validation.state : '';
}

/** Ошибки формата полей груза. Пустые необязательные поля ошибкой не считаются. */
export function validateDraft(draft: LoadDraft): DraftErrors {
  const errors: DraftErrors = {};
  const weight = draft.weight ?? '';
  const email = (draft.brokerEmail ?? '').trim();
  const pickupZip = (draft.pickupZip ?? '').trim();
  const deliveryZip = (draft.deliveryZip ?? '').trim();
  const set = (key: keyof LoadDraft, message: string) => {
    if (message) errors[key] = message;
  };

  set('rate', rateError(draft.rate));
  set('pickupState', stateError(draft.pickupState));
  set('deliveryState', stateError(draft.deliveryState));

  if (draft.miles.trim()) {
    const miles = readNumber(draft.miles);
    if (miles <= 0 || miles > MAX_LOADED_MILES) set('miles', t.validation.miles);
  }
  if (weight.trim()) {
    const value = readNumber(weight);
    if (value <= 0 || value > MAX_WEIGHT_LBS) set('weight', t.validation.weight);
  }
  if (email && !EMAIL.test(email)) set('brokerEmail', t.validation.email);
  if (pickupZip && !ZIP.test(pickupZip)) set('pickupZip', t.validation.zip);
  if (deliveryZip && !ZIP.test(deliveryZip)) set('deliveryZip', t.validation.zip);
  if (draft.pickupAt && draft.deliveryAt && draft.deliveryAt < draft.pickupAt) {
    set('deliveryAt', t.validation.deliveryBeforePickup);
  }
  return errors;
}
