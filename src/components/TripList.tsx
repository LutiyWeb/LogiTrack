import type { Trip } from '../types';
import { formatEuro, quoteFromTrip } from '../quote';

type TripListProps = {
  trips: Trip[];
  onEdit: (trip: Trip) => void;
  oneDelete: (id: string) => void;
};

export const statusLabel: Record<Trip['status'], string> = {
  planned: 'Планируется',
  draft: 'Черновик',
  selling: 'Продаётся',
  confirmed: 'Набрана',
  done: 'Прошла',
  cancelled: 'Отменена',
};

export default function TripList({ trips, onEdit, oneDelete }: TripListProps) {
  if (trips.length === 0) {
    return <p className="trip-table__empty">Пока нет поездок</p>;
  }

  return (
    <div className="trip-table">
      <div className="trip-table__head">
        <span>Поездка</span>
        <span>Даты</span>
        <span>Люди</span>
        <span>Цена</span>
        <span>Статус</span>
        <span />
      </div>
      {trips.map((trip) => {
        const quote = quoteFromTrip(trip);
        const people = trip.participants ?? [];
        const peopleCount = people.length;
        const planned = trip.targetParticipants ?? 0;
        const remindCount = people.filter((person) => person.remind).length;

        return (
          <div
            className="trip-table__row"
            key={trip.id}
            tabIndex={0}
            onClick={() => onEdit(trip)}
            onKeyDown={(event) => {
              if (event.target !== event.currentTarget) return;
              if (event.key === 'Enter') onEdit(trip);
            }}
          >
            <span className="trip-table__trip">
              <span className="trip-table__title">{trip.title}</span>
              <span className="trip-table__city">{trip.city}</span>
            </span>
            <span className="trip-table__dates">
              {formatDate(trip.dateStart)} – {formatDate(trip.dateEnd)}
            </span>
            <span
              className={
                remindCount > 0
                  ? 'trip-table__people is-remind'
                  : 'trip-table__people'
              }
            >
              {planned > 0 ? `${peopleCount} из ${planned}` : peopleCount}
              {remindCount > 0 ? ` · написать ${remindCount}` : ''}
            </span>
            <span className="trip-table__price">
              {quote ? formatEuro(quote.perPerson) : '—'}
            </span>
            <span className={`trip-table__status is-${trip.status}`}>
              {statusLabel[trip.status]}
            </span>
            <span className="trip-table__actions">
              <button
                className="icon-button"
                type="button"
                aria-label="Удалить"
                onClick={(event) => {
                  event.stopPropagation();
                  oneDelete(trip.id);
                }}
              >
                <DeleteIcon />
              </button>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}.${month}.${year}`;
}

function DeleteIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 4.5h10M6.4 4.5V3.2h3.2v1.3M4.4 4.5l.5 8a1 1 0 0 0 1 .8h4.2a1 1 0 0 0 1-.8l.5-8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
