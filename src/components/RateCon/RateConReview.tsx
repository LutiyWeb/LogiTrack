import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { runStatusLabel, t } from '../../i18n';
import { daysUntil, seedDrivers } from '../../drivers/drivers';
import type { InboxLoad } from '../../inbox/inbox';
import type { RateConField } from '../../ratecon/parseRateCon';
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
import { addInboxLoad, saveInboxLoad } from '../../store/slices/inboxSlice';
import { showToast } from '../../store/slices/toastsSlice';
import { bookRateCon, openRun } from '../../store/slices/runsSlice';
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

function isStopComplete(city: string, state: string) {
  return city.trim().length > 1 && /^[A-Za-z]{2}$/.test(state.trim());
}

/** Проверка груза из очереди и назначение его на тягач. */
function RateConReview({
  item,
  pdf,
  onClose,
}: {
  item: InboxLoad;
  /** PDF груза; null — PDF нет (груз добавлен вручную или файл недоступен). */
  pdf: ArrayBuffer | null;
  onClose: () => void;
}) {
  const dispatch = useAppDispatch();
  const runs = useAppSelector((state) => state.runs.runs);
  const manualMiles = useAppSelector((state) => state.runs.manualMiles);
  const targetRate = useAppSelector((state) => state.ui.targetRatePerMile);
  const user = useAppSelector(selectCurrentUser);
  // Груз, добавленный вручную, попадает в очередь только при сохранении или назначении.
  const inQueue = useAppSelector((state) =>
    state.inbox.items.some((entry) => entry.id === item.id),
  );

  const [form, setForm] = useState<{
    draft: LoadDraft;
    sources: Partial<Record<FieldKey, FieldSource>>;
  }>(() => ({
    draft: item.draft,
    sources: Object.fromEntries(item.found.map((key) => [key, 'pdf' as const])),
  }));
  const { draft, sources } = form;
  const { warnings, unrecognized } = item;
  const [plan, setPlan] = useState<LoadRoutePlan | null>(null);
  const [routing, setRouting] = useState(false);

  const activeRuns = runs.filter((run) => run.status !== 'Completed');
  const busyTrucks = new Set(activeRuns.map((run) => run.truck));
  // Водителя с просроченными правами или медсправкой назначать нельзя.
  const expiredDrivers = new Set(
    seedDrivers
      .filter((driver) => Math.min(daysUntil(driver.cdlExpires), daysUntil(driver.medicalExpires)) < 0)
      .map((driver) => driver.name),
  );
  const isBlocked = (item: (typeof fleetRoster)[number]) =>
    busyTrucks.has(item.truck) || expiredDrivers.has(item.driver);
  const firstFreeTruck = fleetRoster.find((item) => !isBlocked(item));
  const [target, setTarget] = useState<Target>(
    firstFreeTruck
      ? { kind: 'new', truck: firstFreeTruck.truck }
      : { kind: 'existing', runId: activeRuns[0]?.id ?? '' },
  );

  const targetRun: Run | null =
    target.kind === 'existing' ? (runs.find((run) => run.id === target.runId) ?? null) : null;
  const pickupName = placeName(draft.pickupCity.trim(), draft.pickupState.trim().toUpperCase());
  const deliveryName = placeName(draft.deliveryCity.trim(), draft.deliveryState.trim().toUpperCase());
  const stopsReady =
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
    if (!stopsReady || !plan) return null;
    const load = draftToLoad(draft, 'preview');
    const simulated: Run =
      targetRun
        ? { ...targetRun, loads: [...targetRun.loads, load] }
        : {
            id: 'preview',
            truck: roster?.truck ?? t.rateCon.newTruckFallback,
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

  const update = (key: FieldKey, value: string) => {
    setForm((current) => {
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
  const f = t.rateCon.fields;

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
      expected={fromPdf && SHOULD_HAVE.includes(key)}
      fromPdf={fromPdf}
      onChange={(value) => update(key, value)}
      {...options}
    />
  );

  const book = () => {
    if (!canBook) return;
    const runId = target.kind === 'new' ? crypto.randomUUID() : (targetRun as Run).id;
    if (!inQueue) dispatch(addInboxLoad({ ...item, draft }));
    dispatch(
      bookRateCon({
        target:
          target.kind === 'new' && roster
            ? { kind: 'new', runId, truck: roster.truck, driver: roster.driver, drivingHoursLeft: roster.drivingHoursLeft }
            : { kind: 'existing', runId },
        draft,
        legMiles,
        fileName: item.fileName,
        inboxId: item.id,
        author: user?.name ?? t.common.dispatcherFallback,
        roleTitle: user?.roleTitle ?? t.common.dispatcherFallback,
      }),
    );
    dispatch(
      showToast(
        'success',
        t.notify.assigned(
          draft.customer,
          target.kind === 'new' ? (roster?.truck ?? '') : (targetRun?.truck ?? ''),
        ),
      ),
    );
    dispatch(openRun(runId));
    dispatch(setActiveSection('board'));
    onClose();
  };

  const save = () => {
    if (!inQueue) dispatch(addInboxLoad({ ...item, draft }));
    dispatch(saveInboxLoad({ id: item.id, draft }));
    dispatch(showToast('success', t.notify.saved(draft.customer || t.inbox.noCustomer)));
    onClose();
  };

  const fromPdf = item.source !== 'manual';

  return (
    <div className={pdf ? 'ratecon__review' : 'ratecon__review ratecon__review--no-pdf'}>
      {pdf && item.fileName && <PdfPreview data={pdf} fileName={item.fileName} />}

      <div className="ratecon__panel">
        <div className="ratecon__scroll">
          {fromPdf && (
            <p className={unrecognized ? 'ratecon__summary is-warn' : 'ratecon__summary'}>
              {unrecognized ? t.rateCon.unrecognized : t.rateCon.filled(foundCount)}
            </p>
          )}
          {warnings.map((warning) => (
            <p key={warning} className="ratecon__warning">
              {warning}
            </p>
          ))}

          <RcSection title={t.rateCon.sections.broker}>
            {field('customer', f.customer, { wide: true })}
            {field('brokerMc', f.brokerMc)}
            {field('loadNumber', f.loadNumber)}
            {field('brokerContact', f.brokerContact)}
            {field('brokerPhone', f.brokerPhone)}
            {field('brokerEmail', f.brokerEmail, { wide: true })}
          </RcSection>

          <RcSection title={t.rateCon.sections.pickup}>
            {field('pickupPlace', f.place, { wide: true })}
            {field('pickupCity', f.city)}
            {field('pickupState', f.state, { placeholder: 'IN' })}
            {field('pickupAt', f.appointment, { type: 'datetime-local', wide: true })}
          </RcSection>

          <RcSection title={t.rateCon.sections.delivery}>
            {field('deliveryPlace', f.place, { wide: true })}
            {field('deliveryCity', f.city)}
            {field('deliveryState', f.state, { placeholder: 'GA' })}
            {field('deliveryAt', f.appointment, { type: 'datetime-local', wide: true })}
          </RcSection>

          <RcSection title={t.rateCon.sections.freight}>
            {field('rate', f.rate, { type: 'number' })}
            {field('commodity', f.commodity)}
            {field('equipment', f.equipment)}
            {field('weight', f.weight, { type: 'number' })}
            {field('bol', f.bol)}
            {field('poNumber', f.poNumber)}
            {field('miles', f.miles, { type: 'number' })}
            {field('driveHours', f.driveHours, { type: 'number' })}
          </RcSection>

          <RcSection title={t.rateCon.sections.assign}>
            <div className="ratecon__segmented ratecon__wide" role="group" aria-label={t.rateCon.assignAria}>
              <button
                type="button"
                className={target.kind === 'new' ? 'is-active' : ''}
                disabled={!firstFreeTruck}
                onClick={() => firstFreeTruck && setTarget({ kind: 'new', truck: firstFreeTruck.truck })}
              >
                {t.rateCon.newRun}
              </button>
              <button
                type="button"
                className={target.kind === 'existing' ? 'is-active' : ''}
                disabled={activeRuns.length === 0}
                onClick={() => activeRuns[0] && setTarget({ kind: 'existing', runId: activeRuns[0].id })}
              >
                {t.rateCon.existingRun}
              </button>
            </div>
            {target.kind === 'new' ? (
              <label className="ratecon__field ratecon__wide">
                <span className="ratecon__label">{t.rateCon.truckDriver}</span>
                <select
                  className="runs__input"
                  value={target.truck}
                  onChange={(event) => setTarget({ kind: 'new', truck: event.target.value })}
                >
                  {fleetRoster.map((item) => (
                    <option key={item.truck} value={item.truck} disabled={isBlocked(item)}>
                      {item.truck} · {item.driver} · {t.rateCon.hoursLeft(item.drivingHoursLeft)}
                      {busyTrucks.has(item.truck) ? t.rateCon.onActiveRun : ''}
                      {expiredDrivers.has(item.driver) ? t.drivers.cannotAssign : ''}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="ratecon__field ratecon__wide">
                <span className="ratecon__label">{t.rateCon.run}</span>
                <select
                  className="runs__input"
                  value={target.runId}
                  onChange={(event) => setTarget({ kind: 'existing', runId: event.target.value })}
                >
                  {activeRuns.map((run) => (
                    <option key={run.id} value={run.id}>
                      {run.truck} · {run.driver} · {runStatusLabel(run.status)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </RcSection>

          <RcSection title={t.rateCon.sections.route}>
            <div className="ratecon__route ratecon__wide" aria-live="polite">
              {!stopsReady ? (
                <span>{t.rateCon.enterStops}</span>
              ) : routing && !plan ? (
                <span>{t.rateCon.routing(pickupName, deliveryName)}</span>
              ) : plan && projection ? (
                <>
                  <RouteStat label={t.rateCon.deadheadIn} value={milesText(plan.emptyLegs[0].miles)} hint={`${previousStop} → ${pickupName}`} />
                  <RouteStat label={t.rateCon.loaded} value={milesText(readNumber(draft.miles) || null)} hint={t.rateCon.drivingHours(draft.driveHours || '–')} />
                  <RouteStat label={t.rateCon.returnEmpty} value={milesText(plan.emptyLegs[1].miles)} hint={`${deliveryName} → ${YARD}`} />
                  <RouteStat
                    label={t.rateCon.runAllIn}
                    value={projection.perMile === null ? '–' : formatMoney(projection.perMile, 2)}
                    hint={
                      projection.perMile === null
                        ? t.rateCon.someUnknown
                        : projection.perMile >= targetRate
                          ? t.rateCon.atOrAbove(formatMoney(targetRate, 2))
                          : t.rateCon.below(formatMoney(targetRate, 2))
                    }
                    tone={projection.perMile === null ? undefined : projection.perMile >= targetRate ? 'good' : 'warn'}
                  />
                  {plan.unknownCities.length > 0 && (
                    <p className="ratecon__warning ratecon__wide">
                      {t.rateCon.cityNotFound(plan.unknownCities.join(', '))}
                    </p>
                  )}
                  {projection.hosNote && <p className="ratecon__note ratecon__wide">{projection.hosNote}</p>}
                </>
              ) : (
                <span>{t.rateCon.routeUnavailable}</span>
              )}
            </div>
          </RcSection>
        </div>

        <footer className="ratecon__footer">
          <span className="ratecon__footer-hint">
            {missingRequired.length > 0
              ? t.rateCon.missing(missingRequired.map(labelOf).join(', '))
              : `${draft.customer} · ${formatMoney(rateValue, 0)}`}
          </span>
          <button type="button" className="runs__button runs__button--tertiary" onClick={onClose}>
            {t.common.cancel}
          </button>
          <button
            type="button"
            className="runs__button runs__button--secondary"
            disabled={missingRequired.length > 0}
            onClick={save}
          >
            {t.inbox.saveChecked}
          </button>
          <button type="button" className="runs__button" disabled={!canBook} onClick={book}>
            {target.kind === 'new'
              ? t.rateCon.createRun(roster?.truck ?? '')
              : t.rateCon.addTo(targetRun?.truck ?? t.rateCon.runFallback)}
          </button>
        </footer>
      </div>
    </div>
  );
}

function labelOf(key: FieldKey) {
  return t.rateCon.missingLabels[key] ?? key;
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
  fromPdf,
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
  fromPdf: boolean;
  onChange: (value: string) => void;
  type?: string;
  wide?: boolean;
  placeholder?: string;
}) {
  const empty = !value.trim();
  const state =
    source ?? (empty ? (required || expected ? 'missing' : fromPdf ? 'absent' : 'edited') : 'edited');
  const chip = {
    pdf: t.rateCon.chips.pdf,
    calc: t.rateCon.chips.calc,
    missing: required ? t.rateCon.chips.required : t.rateCon.chips.notFound,
    absent: t.rateCon.chips.absent,
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
