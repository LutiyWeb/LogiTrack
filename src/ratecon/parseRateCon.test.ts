import { describe, expect, it } from 'vitest';
import { itemsToLines } from './pdfText';
import { findDateTime, parseRateCon } from './parseRateCon';
import {
  crestlineLines,
  northboundLines,
  prairieRouteLines,
} from './sampleLines.fixture';

describe('parseRateCon', () => {
  it('reads the labelled-block layout (Crestline)', () => {
    const { draft, unrecognized, warnings } = parseRateCon(crestlineLines);
    expect(unrecognized).toBe(false);
    expect(warnings).toEqual([]);
    expect(draft).toMatchObject({
      customer: 'Crestline Freight Brokerage',
      brokerMc: '718244',
      loadNumber: 'CFB-240917',
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
      equipment: "Dry Van 53'",
      weight: '38500',
      poNumber: 'PU-55821',
      brokerContact: 'Jenna Collins',
      brokerPhone: '(615) 555-0142',
      brokerEmail: 'jenna.collins@crestline-demo.example',
    });
  });

  it('reads the stops-table layout and uses the total carrier pay (Northbound)', () => {
    const { draft, found } = parseRateCon(northboundLines);
    expect(draft).toMatchObject({
      customer: 'Northbound Logistics Group',
      brokerMc: '603917',
      loadNumber: 'NLG-88214',
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
      equipment: "Reefer 53'",
      weight: '42000',
      poNumber: '4410-QC',
      brokerContact: 'Marco Diaz',
      brokerPhone: '216-555-0187',
    });
    // No BOL or miles on this document: they must be flagged, not invented.
    expect(found).not.toContain('bol');
    expect(found).not.toContain('miles');
  });

  it('reads the letter layout (Prairie Route)', () => {
    const { draft } = parseRateCon(prairieRouteLines);
    expect(draft).toMatchObject({
      customer: 'Prairie Route Brokerage',
      brokerMc: '552190',
      loadNumber: 'PRB-55102',
      rate: '1150',
      pickupPlace: 'Wabash Steel Supply',
      pickupCity: 'Lafayette',
      pickupState: 'IN',
      pickupAt: '2026-10-31T07:00',
      deliveryPlace: 'Gateway Fabrication',
      deliveryCity: 'St. Louis',
      deliveryState: 'MO',
      deliveryAt: '2026-10-31T15:00',
      bol: '22907',
      commodity: 'Structural steel beams',
      equipment: "Flatbed 48'",
      weight: '44000',
      poNumber: '7781-WS',
      brokerContact: 'Ruth Ann Baker',
      brokerPhone: '(309) 555-0136',
    });
  });

  it('strips stop labels from facility names on one-line stops', () => {
    const { draft } = parseRateCon([
      'Red River Brokerage',
      'RATE CONFIRMATION Load # RRB-1001',
      'PICKUP: Northern Grain Coop, 1200 Main Ave, Fargo, ND 58103 on 11/02/2026 at 09:00',
      'DELIVERY: Plains Mill, 400 E 8th St, Sioux Falls, SD 57103 on 11/02/2026 at 16:00',
      'Total Carrier Pay: $1,300.00',
    ]);
    expect(draft).toMatchObject({
      pickupPlace: 'Northern Grain Coop',
      pickupCity: 'Fargo',
      deliveryPlace: 'Plains Mill',
      deliveryCity: 'Sioux Falls',
      rate: '1300',
    });
  });

  it('never takes our own MC number as the broker MC', () => {
    const { draft } = parseRateCon([
      'Some Broker LLC',
      'Carrier: LogiTrack Freight LLC MC-849201',
    ]);
    expect(draft.brokerMc).toBe('');
  });

  it('flags a document that is not a rate confirmation', () => {
    const result = parseRateCon([
      'Quarterly newsletter',
      'Thanks for reading our updates this fall.',
    ]);
    expect(result.unrecognized).toBe(true);
    expect(result.warnings[0]).toMatch(/doesn't look like a rate confirmation/);
    expect(result.draft.pickupCity).toBe('');
    expect(result.draft.customer).toBe('');
    expect(result.found).toEqual([]);
  });
});

describe('findDateTime', () => {
  it('handles numeric and named dates with 12/24 h times', () => {
    expect(findDateTime('10/30/2026 08:00')).toBe('2026-10-30T08:00');
    expect(findDateTime('on 10/31/2026 at 15:00.')).toBe('2026-10-31T15:00');
    expect(findDateTime('Oct 31, 2026 9:00 PM')).toBe('2026-10-31T21:00');
    expect(findDateTime('Dec 1, 2026')).toBe('2026-12-01T00:00');
    expect(findDateTime('no date here')).toBeNull();
  });
});

describe('itemsToLines', () => {
  it('orders runs top to bottom and marks column gaps', () => {
    const lines = itemsToLines([
      { str: 'Value', x: 200, y: 700, width: 30 },
      { str: 'Label', x: 50, y: 700.5, width: 30 },
      { str: 'Header', x: 50, y: 720, width: 40 },
    ]);
    expect(lines).toEqual(['Header', 'Label | Value']);
  });
});
