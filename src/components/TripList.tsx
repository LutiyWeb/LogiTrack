import type { Trip } from '../types';

type TripListProps = {
  trips: Trip[];
};

export default function TripList({ trips }: TripListProps) {
  return (
    <ul className="trip-list">
      {trips.map((trip) => (
        <li className="trip-list__item" key={trip.id}>
          <span className="trip-list__title">{trip.title}</span>
          <span className="trip-list__actions">
            <button className="icon-button" type="button" aria-label="Редактировать">
              <EditIcon />
            </button>
            <button className="icon-button" type="button" aria-label="Удалить">
              <DeleteIcon />
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M11.1 1.9a1.5 1.5 0 0 1 2.1 2.1L5.4 11.8 2 12.7l.9-3.4 8.2-7.4z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
