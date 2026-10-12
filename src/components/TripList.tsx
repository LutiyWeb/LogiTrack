import type { Trip } from '../types';

type TripListProps = {
  trips: Trip[];
};

export default function TripList({ trips }: TripListProps) {
  return (
    <ul className="trip-list">
      {trips.map((trip) => (
        <li className="trip-list__item" key={trip.id}>
          {trip.title}
        </li>
      ))}
    </ul>
  );
}
