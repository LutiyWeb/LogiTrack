import { draftChanges } from '../../inbox/identity';
import type { InboxLoad } from '../../inbox/inbox';
import { t } from '../../i18n';
import { useAppDispatch } from '../../store/hooks';
import { acceptInboxRevision } from '../../store/slices/inboxSlice';

export function LoadDifferences({
  before,
  after,
}: {
  before: InboxLoad['draft'];
  after: InboxLoad['draft'];
}) {
  const labels: Record<string, string> = {
    ...t.rateCon.fields,
    pickupAt: 'Час завантаження',
    deliveryAt: 'Час доставки',
    pickupCity: 'Місто завантаження',
    deliveryCity: 'Місто доставки',
    pickupPlace: 'Місце завантаження',
    deliveryPlace: 'Місце доставки',
    status: 'Статус',
  };
  return (
    <dl className="runs__driver-facts">
      {draftChanges(before, after).map((key) => (
        <div key={key}>
          <dt>{labels[key] ?? key}</dt>
          <dd>
            {String(before[key] || '—')} → {String(after[key] || '—')}
          </dd>
        </div>
      ))}
    </dl>
  );
}
export default function LoadRevisions({ item }: { item: InboxLoad }) {
  const dispatch = useAppDispatch();
  if (!item.revisions?.length) return null;
  return (
    <details>
      <summary className="runs__label">
        Нові версії RateCon ({item.revisions.length})
      </summary>
      {item.revisions.map((revision) => (
        <div key={revision.id} className="runs__load">
          <p className="runs__meta">
            {revision.fileName ?? 'Оновлення вантажу'} · {revision.receivedAt}
          </p>
          <LoadDifferences before={item.draft} after={revision.draft} />
          {item.status !== 'Assigned' ? (
            <button
              type="button"
              className="runs__button runs__button--secondary runs__button--small"
              onClick={() =>
                dispatch(
                  acceptInboxRevision({ id: item.id, revisionId: revision.id }),
                )
              }
            >
              Прийняти цю версію
            </button>
          ) : (
            <p className="runs__meta">
              Вантаж уже призначено. Зміни збережено для погодження; новий
              вантаж не створюється.
            </p>
          )}
        </div>
      ))}
    </details>
  );
}
