import { describe, expect, it } from 'vitest';
import { daysUntil } from '../drivers/drivers';
import { emptyDraft } from './seed';
import { validateDraft } from './validation';

describe('validateDraft', () => {
  it('accepts an empty draft and a normal one', () => {
    expect(validateDraft(emptyDraft)).toEqual({});
    expect(
      validateDraft({ ...emptyDraft, rate: '1200', miles: '300', weight: '38000', pickupState: 'in', pickupZip: '46204', brokerEmail: 'a@b.co' }),
    ).toEqual({});
  });

  it('flags bad rate, miles, weight, state, zip, email', () => {
    const errors = validateDraft({
      ...emptyDraft,
      rate: '-5',
      miles: '1000000000',
      weight: '0',
      pickupState: 'ZZ',
      deliveryZip: '1234x',
      brokerEmail: 'not-an-email',
    });
    expect(Object.keys(errors).sort()).toEqual(['brokerEmail', 'deliveryZip', 'miles', 'pickupState', 'rate', 'weight']);
    expect(validateDraft({ ...emptyDraft, rate: '99999999999' }).rate).toBeTruthy();
  });

  it('flags delivery before pickup', () => {
    const errors = validateDraft({ ...emptyDraft, pickupAt: '2026-11-10T10:00', deliveryAt: '2026-11-05T09:00' });
    expect(errors.deliveryAt).toBeTruthy();
  });
});

describe('daysUntil', () => {
  it('counts calendar days from the demo today (28 Oct 2026)', () => {
    expect(daysUntil('2026-11-10')).toBe(13);
    expect(daysUntil('2026-10-28')).toBe(0);
    expect(daysUntil('2026-10-20')).toBe(-8);
  });
});
