import { bookingConflict } from '../../store/booking';
import type { RootState } from '../../store/store';
import { t } from '../../i18n';
import {
  backhaulOffers,
  formatHours,
  formatMiles,
  formatMoney,
  placeName,
  previewOfferMetrics,
  type BackhaulOffer,
  type Run,
} from '../../runs/seed';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addLoad,
  applyPresetToDraft,
  openLoadModal,
} from '../../store/slices/runsSlice';

function BackhaulOffers({ run }: { run: Run }) {
  const dispatch = useAppDispatch();
  const state = useAppSelector((state) => state);
  const manualMiles = useAppSelector((state) => state.runs.manualMiles);

  return (
    <section
      id="backhaul-offers"
      className="runs__block"
      aria-label={t.backhaul.aria}
    >
      <div className="runs__form-head">
        <h2 className="runs__subtitle">{t.backhaul.title}</h2>
        <span className="runs__meta">{t.backhaul.subtitle}</span>
      </div>
      <ul className="runs__offers">
        {backhaulOffers.map((offer) => (
          <OfferCard
            key={offer.id}
            run={run}
            offer={offer}
            manualMiles={manualMiles}
            state={state}
            onFillForm={() => {
              dispatch(openLoadModal(run.id));
              dispatch(applyPresetToDraft(offer.draft));
            }}
            onAssign={() =>
              dispatch(addLoad({ runId: run.id, draft: offer.draft }))
            }
          />
        ))}
      </ul>
    </section>
  );
}

function OfferCard({
  run,
  offer,
  manualMiles,
  onFillForm,
  onAssign,
  state,
}: {
  run: Run;
  offer: BackhaulOffer;
  manualMiles: Record<string, number>;
  state: RootState;
  onFillForm: () => void;
  onAssign: () => void;
}) {
  const preview = previewOfferMetrics(run, offer, manualMiles);
  const { draft } = offer;
  const badgeTone =
    offer.tone === 'recommended'
      ? '--ok'
      : offer.tone === 'warning'
        ? '--warn'
        : '';
  const conflict = bookingConflict(state, {
    target: { kind: 'existing', runId: run.id },
    draft,
    legMiles: {},
    author: state.auth.currentUser?.name ?? '',
    roleTitle: state.auth.currentUser?.roleTitle ?? '',
  });
  const hasHosConflict = !!conflict;

  return (
    <li className={`runs__offer runs__offer--${offer.tone}`}>
      <div className="runs__load-head">
        <div>
          <span
            className={`runs__badge ${badgeTone ? `runs__badge${badgeTone}` : ''}`}
          >
            {offer.tag}
          </span>
          <p className="runs__truck">{draft.customer}</p>
        </div>
        <div className="runs__load-actions">
          <button
            type="button"
            className="runs__button runs__button--tertiary runs__button--small"
            onClick={onFillForm}
          >
            {t.backhaul.fillForm}
          </button>
          <button
            type="button"
            className="runs__button runs__button--secondary runs__button--small"
            disabled={hasHosConflict}
            title={hasHosConflict ? (conflict ?? undefined) : undefined}
            onClick={onAssign}
          >
            {t.backhaul.assign}
          </button>
        </div>
      </div>
      <p className="runs__meta">
        {placeName(draft.pickupCity, draft.pickupState)} →{' '}
        {placeName(draft.deliveryCity, draft.deliveryState)} ·{' '}
        {formatMoney(Number(draft.rate), 0)} ·{' '}
        {formatMiles(Number(draft.miles))} ·{' '}
        {t.backhaul.driveTime(formatHours(Number(draft.driveHours)))}
      </p>
      <p className="runs__meta">
        {t.backhaul.projected}{' '}
        <strong>
          {preview.emptyMiles === null
            ? t.units.dash
            : t.backhaul.projectedEmpty(formatMiles(preview.emptyMiles))}
        </strong>{' '}
        ·{' '}
        <strong title={t.common.allInTooltip}>
          {preview.perMile === null
            ? t.units.dash
            : t.common.allIn(formatMoney(preview.perMile, 2))}
        </strong>{' '}
        · {t.backhaul.projectedRevenue(formatMoney(preview.totalRevenue, 0))}
      </p>
      <p className="runs__meta">{offer.summary}</p>
    </li>
  );
}

export default BackhaulOffers;
