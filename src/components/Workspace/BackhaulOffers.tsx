import {
  backhaulOffers,
  formatHours,
  formatMiles,
  formatMoney,
  placeName,
  previewOfferMetrics,
  type BackhaulOffer,
  type Run,
} from '../../runs/demo';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  addLoad,
  applyPresetToDraft,
  openLoadModal,
} from '../../store/slices/runsSlice';

function BackhaulOffers({ run }: { run: Run }) {
  const dispatch = useAppDispatch();
  const manualMiles = useAppSelector((state) => state.runs.manualMiles);

  return (
    <section
      id="backhaul-offers"
      className="runs__block"
      aria-label="Broker load board"
    >
      <div className="runs__form-head">
        <h2 className="runs__subtitle">Available backhaul offers near Atlanta, GA</h2>
        <span className="runs__meta">
          Compare how each broker load impacts deadhead and All-in $/mi
        </span>
      </div>
      <ul className="runs__offers">
        {backhaulOffers.map((offer) => (
          <OfferCard
            key={offer.id}
            run={run}
            offer={offer}
            manualMiles={manualMiles}
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
}: {
  run: Run;
  offer: BackhaulOffer;
  manualMiles: Record<string, number>;
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
  const hasHosConflict =
    offer.tone === 'warning' || preview.hosNote.includes('drops off');

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
            className="runs__button runs__button--ghost runs__button--small"
            onClick={onFillForm}
          >
            Fill form
          </button>
          <button
            type="button"
            className="runs__button runs__button--small"
            disabled={hasHosConflict}
            title={
              hasHosConflict
                ? 'HOS conflict: pickup at 5:00 PM does not wait for required 10h off-duty reset'
                : undefined
            }
            onClick={onAssign}
          >
            Assign load
          </button>
        </div>
      </div>
      <p className="runs__meta">
        {placeName(draft.pickupCity, draft.pickupState)} →{' '}
        {placeName(draft.deliveryCity, draft.deliveryState)} ·{' '}
        {formatMoney(Number(draft.rate), 0)} · {formatMiles(Number(draft.miles))}{' '}
        · Drive time {formatHours(Number(draft.driveHours))}
      </p>
      <p className="runs__meta">
        Projected run result:{' '}
        <strong>
          {preview.emptyMiles === null
            ? '—'
            : `Empty ${formatMiles(preview.emptyMiles)}`}
        </strong>{' '}
        ·{' '}
        <strong title="Revenue ÷ total miles (paid + empty)">
          {preview.perMile === null
            ? '—'
            : `All-in ${formatMoney(preview.perMile, 2)} / mi`}
        </strong>{' '}
        · Revenue {formatMoney(preview.totalRevenue, 0)}
      </p>
      <p className="runs__meta">{offer.summary}</p>
    </li>
  );
}

export default BackhaulOffers;
