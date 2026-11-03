import { describe, expect, it } from 'vitest';
import {
  backhaulOffers,
  backhaulPreset,
  dollarsPerMile,
  draftToLoad,
  emptyMilesTotal,
  lane,
  paidMiles,
  previewOfferMetrics,
  revenue,
  routeTimeline,
  runLegs,
  runs,
  shiftNote,
} from './demo';

describe('demo domain calculations', () => {
  const truck214 = runs.find((run) => run.id === '214')!;

  it('calculates paid miles and revenue for a single-load run', () => {
    expect(paidMiles(truck214)).toBe(700);
    expect(revenue(truck214)).toBe(3200);
    expect(lane(truck214)).toBe('Joliet, IL → Atlanta, GA');
  });

  it('calculates empty miles and $/mile before adding backhaul on Truck 214', () => {
    const legs = runLegs(truck214, {});
    expect(legs).toEqual([
      { from: 'Indianapolis, IN', to: 'Joliet, IL', miles: 180 },
      { from: 'Atlanta, GA', to: 'Indianapolis, IN', miles: 530 },
    ]);
    expect(emptyMilesTotal(legs)).toBe(710);
    expect(dollarsPerMile(truck214, legs)).toBe(2.27);
  });

  it('recalculates empty miles (215) and $/mile ($3.77) after adding Blue Ridge Logistics backhaul', () => {
    const secondLoad = draftToLoad(backhaulPreset, 'blue-ridge');
    const updatedRun = {
      ...truck214,
      loads: [...truck214.loads, secondLoad],
    };

    const legs = runLegs(updatedRun, {});
    expect(legs).toEqual([
      { from: 'Indianapolis, IN', to: 'Joliet, IL', miles: 180 },
      { from: 'Atlanta, GA', to: 'Marietta, GA', miles: 20 },
      { from: 'Greenwood, IN', to: 'Indianapolis, IN', miles: 15 },
    ]);
    expect(paidMiles(updatedRun)).toBe(1190);
    expect(emptyMilesTotal(legs)).toBe(215);
    expect(revenue(updatedRun)).toBe(5300);
    expect(dollarsPerMile(updatedRun, legs)).toBe(3.77);
  });

  it('uses manual empty miles when a city pair is not in the known lookup table', () => {
    const customLoad = draftToLoad(
      {
        ...backhaulPreset,
        pickupCity: 'Savannah',
        pickupState: 'GA',
      },
      'custom-1',
    );
    const customRun = {
      ...truck214,
      loads: [...truck214.loads, customLoad],
    };

    const legsWithoutManual = runLegs(customRun, {});
    expect(emptyMilesTotal(legsWithoutManual)).toBeNull();
    expect(dollarsPerMile(customRun, legsWithoutManual)).toBeNull();

    const legsWithManual = runLegs(customRun, {
      'Atlanta, GA|Savannah, GA': 250,
    });
    expect(emptyMilesTotal(legsWithManual)).toBe(180 + 250 + 15);
  });

  it('generates HOS shift note explaining 10-hour reset and whether pickup waits', () => {
    const waitingBackhaul = draftToLoad(backhaulPreset, 'wait-ok');
    const note = shiftNote(truck214, waitingBackhaul);
    expect(note).toContain('This leg is 9 h.');
    expect(note).toContain('3.5 h left in this shift.');
    expect(note).toContain('The pickup can wait, so the load stays.');

    const urgentOffer = backhaulOffers.find(
      (offer) => offer.id === 'southern-express',
    )!;
    const urgentLoad = draftToLoad(urgentOffer.draft, 'urgent');
    const urgentNote = shiftNote(truck214, urgentLoad);
    expect(urgentNote).toContain(
      'The pickup does not wait, so this load drops off.',
    );
  });

  it('builds route timeline steps and broker offer preview metrics', () => {
    const steps = routeTimeline(truck214, {});
    expect(steps).toHaveLength(3);
    expect(steps[0].kind).toBe('empty');
    expect(steps[1].kind).toBe('paid');
    expect(steps[2].kind).toBe('empty');

    const blueRidgeOffer = backhaulOffers[0];
    const preview = previewOfferMetrics(truck214, blueRidgeOffer, {});
    expect(preview.emptyMiles).toBe(215);
    expect(preview.perMile).toBe(3.77);
    expect(preview.totalRevenue).toBe(5300);
  });
});
