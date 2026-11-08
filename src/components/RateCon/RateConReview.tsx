import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { parseRateCon, type RateConField } from '../../ratecon/parseRateCon';
import type { RateConSource } from '../../ratecon/files';
import { extractPdfLines } from '../../ratecon/pdfText';
import { planLoadRoute, type LoadRoutePlan } from '../../ratecon/routing';
import {
  dollarsPerMile,
  draftToLoad,
  emptyLegKey,
  emptyMilesTotal,
  fleetRoster,
  formatMiles,
  formatMoney,
  isKnownEmptyLeg,
  placeName,
  readNumber,
  runLegs,
  shiftNote,
  type LoadDraft,
  type Run,
} from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { bookRateCon } from '../../store/slices/runsSlice';
import { carrierProfile, setActiveSection } from '../../store/slices/uiSlice';
import PdfPreview from './PdfPreview';


type FieldKey = RateConField | 'driveHours';
type FieldSource = 'pdf' | 'calc';
type Target = { kind: 'new'; truck: string } | { kind: 'existing'; runId: string };

const REQUIRED: FieldKey[] = [
  'customer',
  'rate',
  'pickupCity',
  'pickupState',
  'deliveryCity',
  'deliveryState',
  'miles',
];

const SHOULD_HAVE: FieldKey[] = ['pickupAt', 'deliveryAt', 'commodity', 'loadNumber'];

const [yardCity, yardState] = carrierProfile.homeYard.split(',').map((part) => part.trim());
const YARD = placeName(yardCity, yardState);
const MIN_READING_MS = 700;

function isStopComplete(city: string, state: string) {
  return city.trim().length > 1 && /^[A-Za-z]{2}$/.test(state.trim());
}

function RateConReview({ source, onClose }: { source: RateConSource; onClose: () => void }) {
  const dispatch = useAppDispatch();
  const runs = useAppSelector((state) => state.runs.runs);
  const manualMiles = useAppSelector((state) => state.runs.manualMiles);
  const targetRate = useAppSelector((state) => state.ui.targetRatePerMile);
  const user = useAppSelector(selectCurrentUser);

  const [reading, setReading] = useState(true);
  const [form, setForm] = useState<{
    draft: LoadDraft;
    sources: Partial<Record<FieldKey, FieldSource>>;
  } | null>(null);
  const draft = form?.draft ?? null;
  const sources = form?.sources ?? {};
  const [warnings, setWarnings] = useState<string[]>([]);
  const [unrecognized, setUnrecognized] = useState(false);
  const [plan, setPlan] = useState<LoadRoutePlan | null>(null);
  const [routing, setRouting] = useState(false);

  const activeRuns = runs.filter((run) => run.status !== 'Completed');
  const busyTrucks = new Set(activeRuns.map((run) => run.truck));
  const firstFreeTruck = fleetRoster.find((item) => !busyTrucks.has(item.truck));
  const [target, setTarget] = useState<Target>(
    firstFreeTruck
      ? { kind: 'new', truck: firstFreeTruck.truck }
      : { kind: 'existing', runId: activeRuns[0]?.id ?? '' },
  );

  // 1. Read the PDF and pull out the fields.
  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    extractPdfLines(source.data)
      .then((lines) => parseRateCon(lines))
      .catch(() => parseRateCon([]))
      .then(async (result) => {
        const wait = MIN_READING_MS - (Date.now() - startedAt);
        if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
        if (cancelled) return;
        setForm({
          draft: result.draft,
          sources: Object.fromEntries(result.found.map((key) => [key, 'pdf' as const])),
        });
        setWarnings(result.warnings);
        setUnrecognized(result.unrecognized);
        setReading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  const targetRun: Run | null =
    target.kind === 'existing' ? (runs.find((run) => run.id === target.runId) ?? null) : null;
  const pickupName = draft ? placeName(draft.pickupCity.trim(), draft.pickupState.trim().toUpperCase()) : '';
  const deliveryName = draft ? placeName(draft.deliveryCity.trim(), draft.deliveryState.trim().toUpperCase()) : '';
  const stopsReady =
    !!draft &&
    isStopComplete(draft.pickupCity, draft.pickupState) &&
    isStopComplete(draft.deliveryCity, draft.deliveryState);
  const previousStop = targetRun?.loads.length
    ? placeName(
        targetRun.loads[targetRun.loads.length - 1].delivery.city,
        targetRun.loads[targetRun.loads.length - 1].delivery.state,
      )
    : YARD;
  const routeKey = stopsReady ? `${pickupName}|${deliveryName}|${previousStop}` : '';

  // 2. Route the load: loaded miles, drive time and the empty legs around it.
  useEffect(() => {
    if (!routeKey) {
      setPlan(null);
      return;
    }
    let cancelled = false;
    setRouting(true);
    const timer = setTimeout(() => {
      planLoadRoute(pickupName, deliveryName, [
        [previousStop, pickupName],
        [deliveryName, YARD],
      ]).then((result) => {
        if (cancelled) return;
        setPlan(result);
        setRouting(false);
        const loaded = result.loaded;
        if (!loaded) return;
        // Fill miles and drive time unless they came from the PDF or were typed in.
        setForm((current) => {
          if (!current) return current;
          const next = { draft: { ...current.draft }, sources: { ...current.sources } };
          if (current.sources.miles === 'calc' || (!current.sources.miles && !current.draft.miles)) {
            next.draft.miles = String(loaded.miles);
            next.sources.miles = 'calc';
          }
          if (current.sources.driveHours === 'calc' || !current.draft.driveHours) {
            next.draft.driveHours = String(Math.round(loaded.hours * 2) / 2);
            next.sources.driveHours = 'calc';
          }
          return next;
        });
      });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // pickup/delivery/previous stop are all encoded in routeKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  const legMiles = useMemo(() => {
    const result: Record<string, number> = {};
    plan?.emptyLegs.forEach((leg) => {
      if (leg.miles !== null && leg.from !== leg.to && !isKnownEmptyLeg(leg.from, leg.to)) {
        result[emptyLegKey(leg.from, leg.to)] = leg.miles;
      }
    });
    return result;
  }, [plan]);

  const roster = fleetRoster.find((item) => target.kind === 'new' && item.truck === target.truck);

  const projection = useMemo(() => {
    if (!draft || !stopsReady || !plan) return null;
    const load = draftToLoad(draft, 'preview');
    const simulated: Run =
      targetRun
        ? { ...targetRun, loads: [...targetRun.loads, load] }
        : {
            id: 'preview',
            truck: roster?.truck ?? 'New truck',
            driver: roster?.driver ?? '',
            yardCity,
            yardState,
            status: 'Planned',
            drivingHoursLeft: roster?.drivingHoursLeft ?? 11,
            loads: [load],
          };
    const legs = runLegs(simulated, { ...manualMiles, ...legMiles });
    return {
      emptyMiles: emptyMilesTotal(legs),
      perMile: dollarsPerMile(simulated, legs),
      revenue: simulated.loads.reduce((sum, item) => sum + item.rate, 0),
      hosNote: shiftNote(simulated, load),
    };
  }, [draft, stopsReady, plan, targetRun, roster, manualMiles, legMiles]);

  if (reading || !draft) {
    return (
      <div className="ratecon__reading" role="status">
        <div className="ratecon__spinner" aria-hidden="true" />
        <strong>Reading {source.name}…</strong>
        <span>Extracting text, matching broker, stops, rate and references</span>
      </div>
    );
  }

  const update = (key: FieldKey, value: string) => {
    setForm((current) => {
      if (!current) return current;
      const nextSources = { ...current.sources };
      delete nextSources[key];
      return { draft: { ...current.draft, [key]: value }, sources: nextSources };
    });
  };

  const missingRequired = REQUIRED.filter((key) => !String(draft[key] ?? '').trim());
  const rateValue = readNumber(draft.rate);
  const canBook =
    missingRequired.length === 0 &&
    rateValue > 0 &&
    (target.kind === 'new' ? !!roster : !!targetRun);
  const foundCount = Object.values(sources).filter((value) => value === 'pdf').length;

  const field = (
    key: FieldKey,
    label: string,
    options: { type?: string; wide?: boolean; placeholder?: string } = {},
  ) => (
    <RcField
      key={key}
      label={label}
      value={String(draft[key] ?? '')}
      source={sources[key]}
      required={REQUIRED.includes(key)}
      expected={SHOULD_HAVE.includes(key)}
      onChange={(value) => update(key, value)}
      {...options}
    />
  );

  const book = () => {
    if (!canBook) return;
    dispatch(
      bookRateCon({
        target:
          target.kind === 'new' && roster
            ? { kind: 'new', truck: roster.truck, driver: roster.driver, drivingHoursLeft: roster.drivingHoursLeft }
            : { kind: 'existing', runId: (targetRun as Run).id },
        draft,
        legMiles,
        fileName: source.name,
        author: user?.name ?? 'Dispatcher',
        roleTitle: user?.roleTitle ?? 'Dispatcher',
      }),
    );
    dispatch(setActiveSection('board'));
    onClose();
  };

  return (
    <div className="ratecon__review">
      <PdfPreview data={source.data} fileName={source.name} />

      <div className="ratecon__panel">
        <div className="ratecon__scroll">
          <p className={unrecognized ? 'ratecon__summary is-warn' : 'ratecon__summary'}>
            {unrecognized
              ? 'Could not read this document automatically.'
              : `Filled ${foundCount} fields from the PDF. Check the highlighted ones before booking.`}
          </p>
          {warnings.map((warning) => (
            <p key={warning} className="ratecon__warning">
              {warning}
            </p>
          ))}

          <RcSection title="Broker">
            {field('customer', 'Broker / customer', { wide: true })}
            {field('brokerMc', 'MC #')}
            {field('loadNumber', 'Load #')}
            {field('brokerContact', 'Contact')}
            {field('brokerPhone', 'Phone')}
            {field('brokerEmail', 'Email', { wide: true })}
          </RcSection>

          <RcSection title="Pickup">
            {field('pickupPlace', 'Facility', { wide: true })}
            {field('pickupCity', 'City')}
            {field('pickupState', 'State', { placeholder: 'IN' })}
            {field('pickupAt', 'Appointment', { type: 'datetime-local', wide: true })}
          </RcSection>

          <RcSection title="Delivery">
            {field('deliveryPlace', 'Facility', { wide: true })}
            {field('deliveryCity', 'City')}
            {field('deliveryState', 'State', { placeholder: 'GA' })}
            {field('deliveryAt', 'Appointment', { type: 'datetime-local', wide: true })}
          </RcSection>

          <RcSection title="Freight & pay">
            {field('rate', 'Rate, $', { type: 'number' })}
            {field('commodity', 'Commodity')}
            {field('equipment', 'Equipment')}
            {field('weight', 'Weight, lbs', { type: 'number' })}
            {field('bol', 'BOL #')}
            {field('poNumber', 'PO / Pickup #')}
            {field('miles', 'Loaded miles', { type: 'number' })}
            {field('driveHours', 'Drive time, h', { type: 'number' })}
          </RcSection>

          <RcSection title="Assign">
            <div className="ratecon__segmented ratecon__wide" role="group" aria-label="Assign to">
              <button
                type="button"
                className={target.kind === 'new' ? 'is-active' : ''}
                disabled={!firstFreeTruck}
                onClick={() => firstFreeTruck && setTarget({ kind: 'new', truck: firstFreeTruck.truck })}
              >
                New run
              </button>
              <button
                type="button"
                className={target.kind === 'existing' ? 'is-active' : ''}
                disabled={activeRuns.length === 0}
                onClick={() => activeRuns[0] && setTarget({ kind: 'existing', runId: activeRuns[0].id })}
              >
                Add to an active run
              </button>
            </div>
            {target.kind === 'new' ? (
              <label className="ratecon__field ratecon__wide">
                <span className="ratecon__label">Truck & driver</span>
                <select
                  className="runs__input"
                  value={target.truck}
                  onChange={(event) => setTarget({ kind: 'new', truck: event.target.value })}
                >
                  {fleetRoster.map((item) => (
                    <option key={item.truck} value={item.truck} disabled={busyTrucks.has(item.truck)}>
                      {item.truck} · {item.driver} · {item.drivingHoursLeft} h left
                      {busyTrucks.has(item.truck) ? ' · on an active run' : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="ratecon__field ratecon__wide">
                <span className="ratecon__label">Run</span>
                <select
                  className="runs__input"
                  value={target.runId}
                  onChange={(event) => setTarget({ kind: 'existing', runId: event.target.value })}
                >
                  {activeRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.truck} · {run.driver} · {run.status}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </RcSection>

          <RcSection title="Route check">
            <div className="ratecon__route ratecon__wide" aria-live="polite">
              {!stopsReady ? (
                <span>Enter pickup and delivery city + state to route this load.</span>
              ) : routing && !plan ? (
                <span>Routing {pickupName} → {deliveryName}…</span>
              ) : plan && projection ? (
                <>
                  <RouteStat label="Deadhead in" value={milesText(plan.emptyLegs[0].miles)} hint={`${previousStop} → ${pickupName}`} />
                  <RouteStat label="Loaded" value={milesText(readNumber(draft.miles) || null)} hint={`${draft.driveHours || '–'} h driving`} />
                  <RouteStat label="Return empty" value={milesText(plan.emptyLegs[1].miles)} hint={`${deliveryName} → ${YARD}`} />
                  <RouteStat
                    label="Run All-in $/mi"
                    value={projection.perMile === null ? '–' : formatMoney(projection.perMile, 2)}
                    hint={
                      projection.perMile === null
                        ? 'Some empty miles are unknown'
                        : projection.perMile >= targetRate
                          ? `At or above ${formatMoney(targetRate, 2)} target`
                          : `Below ${formatMoney(targetRate, 2)} target`
                    }
                    tone={projection.perMile === null ? undefined : projection.perMile >= targetRate ? 'good' : 'warn'}
                  />
                  {plan.unknownCities.length > 0 && (
                    <p className="ratecon__warning ratecon__wide">
                      Could not find {plan.unknownCities.join(', ')} on the map. Check the spelling.
                    </p>
                  )}
                  {projection.hosNote && <p className="ratecon__note ratecon__wide">{projection.hosNote}</p>}
                </>
              ) : (
                <span>Route service is unavailable. Enter loaded miles by hand.</span>
              )}
            </div>
          </RcSection>
        </div>

        <footer className="ratecon__footer">
          <span className="ratecon__footer-hint">
            {missingRequired.length > 0
              ? `Missing: ${missingRequired.map(labelOf).join(', ')}`
              : `${draft.customer} · ${formatMoney(rateValue, 0)}`}
          </span>
          <button type="button" className="runs__button runs__button--ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="runs__button" disabled={!canBook} onClick={book}>
            {target.kind === 'new' ? `Create run · ${roster?.truck ?? ''}` : `Add to ${targetRun?.truck ?? 'run'}`}
          </button>
        </footer>
      </div>
    </div>
  );
}

const LABELS: Partial<Record<FieldKey, string>> = {
  customer: 'broker',
  rate: 'rate',
  pickupCity: 'pickup city',
  pickupState: 'pickup state',
  deliveryCity: 'delivery city',
  deliveryState: 'delivery state',
  miles: 'loaded miles',
};

function labelOf(key: FieldKey) {
  return LABELS[key] ?? key;
}

function milesText(value: number | null) {
  return value === null ? '–' : formatMiles(value);
}

function RcSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ratecon__section">
      <h3 className="ratecon__section-title">{title}</h3>
      <div className="ratecon__grid">{children}</div>
    </section>
  );
}

function RcField({
  label,
  value,
  source,
  required,
  expected,
  onChange,
  type = 'text',
  wide,
  placeholder,
}: {
  label: string;
  value: string;
  source?: FieldSource;
  required: boolean;
  expected: boolean;
  onChange: (value: string) => void;
  type?: string;
  wide?: boolean;
  placeholder?: string;
}) {
  const empty = !value.trim();
  const state = source ?? (empty ? (required || expected ? 'missing' : 'absent') : 'edited');
  const chip = {
    pdf: 'From PDF',
    calc: 'Calculated',
    missing: required ? 'Required' : 'Not found',
    absent: 'Not in PDF',
    edited: '',
  }[state];

  return (
    <label className={`ratecon__field ratecon__field--${state}${wide ? ' ratecon__wide' : ''}`}>
      <span className="ratecon__label">
        {label}
        {chip && <span className={`ratecon__chip ratecon__chip--${state}`}>{chip}</span>}
      </span>
      <input
        className="runs__input"
        type={type}
        value={value}
        placeholder={placeholder}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function RouteStat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: 'good' | 'warn';
}) {
  return (
    <div className={tone ? `ratecon__stat ratecon__stat--${tone}` : 'ratecon__stat'}>
      <span className="ratecon__stat-label">{label}</span>
      <strong>{value}</strong>
      <span className="ratecon__stat-hint">{hint}</span>
    </div>
  );
}

export default RateConReview;
