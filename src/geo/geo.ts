import demoRoutes from './demoRoutes.json';

export type LngLat = [number, number];

export type LegRoute = {
  miles: number;
  hours: number;
  coords: LngLat[];
};

type RouteData = {
  cities: Record<string, LngLat>;
  legs: Record<string, LegRoute>;
};

const data = demoRoutes as unknown as RouteData;
const OSRM_URL = 'https://router.project-osrm.org/route/v1/driving';

const cityCache = new Map<string, LngLat>(Object.entries(data.cities));
const legCache = new Map<string, LegRoute>(Object.entries(data.legs));
const pending = new Map<string, Promise<LegRoute | null>>();

function key(from: string, to: string) {
  return `${from}|${to}`;
}

export function cityCoords(name: string): LngLat | null {
  return cityCache.get(name) ?? null;
}

export function registerCity(name: string, coords: LngLat) {
  cityCache.set(name, coords);
}

/** Road geometry for a leg, from the bundled demo routes or the runtime cache. */
export function cachedLegRoute(from: string, to: string): LegRoute | null {
  const direct = legCache.get(key(from, to));
  if (direct) return direct;

  const reverse = legCache.get(key(to, from));
  if (reverse) return { ...reverse, coords: [...reverse.coords].reverse() };

  return null;
}

/** Straight segment used while a road route is loading or unavailable. */
export function straightLeg(from: string, to: string): LngLat[] | null {
  const a = cityCoords(from);
  const b = cityCoords(to);
  return a && b ? [a, b] : null;
}

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
  HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
  KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
  MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
  MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
  OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
  SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
  VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  DC: 'District of Columbia',
};

const PHOTON_URL = 'https://photon.komoot.io/api/';
const geocoding = new Map<string, Promise<LngLat | null>>();

type PhotonFeature = {
  geometry: { coordinates: LngLat };
  properties: { countrycode?: string; state?: string; osm_key?: string };
};

/** Looks up a "City, ST" name with the public Photon geocoder and caches it. */
export function geocodeCity(name: string): Promise<LngLat | null> {
  const known = cityCoords(name);
  if (known) return Promise.resolve(known);

  const inFlight = geocoding.get(name);
  if (inFlight) return inFlight;

  const [city, stateCode = ''] = name.split(',').map((part) => part.trim());
  const stateName = STATE_NAMES[stateCode.toUpperCase()];
  if (!city) return Promise.resolve(null);

  const query = new URLSearchParams({
    q: `${city}, ${stateName ?? stateCode}`,
    limit: '8',
    osm_tag: 'place',
  });

  const request = fetch(`${PHOTON_URL}?${query}`)
    .then((response) => (response.ok ? response.json() : null))
    .then((body: { features?: PhotonFeature[] } | null) => {
      const match = body?.features?.find(
        (feature) =>
          feature.properties.countrycode === 'US' &&
          (!stateName || feature.properties.state === stateName),
      );
      if (!match) return null;
      const coords = match.geometry.coordinates;
      registerCity(name, coords);
      return coords;
    })
    .catch(() => null);

  geocoding.set(name, request);
  request.then((coords) => {
    if (!coords) geocoding.delete(name);
  });
  return request;
}

/** Asks the public OSRM router for a road route and caches it. */
export function fetchLegRoute(from: string, to: string): Promise<LegRoute | null> {
  const cached = cachedLegRoute(from, to);
  if (cached) return Promise.resolve(cached);

  const id = key(from, to);
  const inFlight = pending.get(id);
  if (inFlight) return inFlight;

  const a = cityCoords(from);
  const b = cityCoords(to);
  if (!a || !b) return Promise.resolve(null);

  const request = fetch(
    `${OSRM_URL}/${a.join(',')};${b.join(',')}?overview=simplified&geometries=geojson`,
  )
    .then((response) => (response.ok ? response.json() : null))
    .then((body) => {
      const route = body?.routes?.[0];
      if (!route) return null;
      const leg: LegRoute = {
        miles: Math.round(route.distance / 1609.34),
        hours: Math.round(route.duration / 360) / 10,
        coords: route.geometry.coordinates as LngLat[],
      };
      legCache.set(id, leg);
      return leg;
    })
    .catch(() => null)
    .finally(() => pending.delete(id));

  pending.set(id, request);
  return request;
}
