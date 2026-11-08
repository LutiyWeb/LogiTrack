import { fetchLegRoute, geocodeCity, type LegRoute } from '../geo/geo';

export type PlannedLeg = {
  from: string;
  to: string;
  miles: number | null;
};

export type LoadRoutePlan = {
  loaded: LegRoute | null;
  emptyLegs: PlannedLeg[];
  /** Cities the geocoder could not place on the map. */
  unknownCities: string[];
};

/**
 * Works out loaded miles, drive time and the empty legs around a load:
 * geocodes every city, then asks the router for each leg.
 */
export async function planLoadRoute(
  pickup: string,
  delivery: string,
  emptyLegs: [string, string][],
): Promise<LoadRoutePlan> {
  const cities = Array.from(new Set([pickup, delivery, ...emptyLegs.flat()]));
  const coords = await Promise.all(cities.map((city) => geocodeCity(city)));
  const unknownCities = cities.filter((_, index) => !coords[index]);

  const [loaded, ...legs] = await Promise.all([
    fetchLegRoute(pickup, delivery),
    ...emptyLegs.map(([from, to]) =>
      from === to ? Promise.resolve({ miles: 0, hours: 0, coords: [] }) : fetchLegRoute(from, to),
    ),
  ]);

  return {
    loaded,
    emptyLegs: emptyLegs.map(([from, to], index) => ({
      from,
      to,
      miles: legs[index]?.miles ?? null,
    })),
    unknownCities,
  };
}
