import { useEffect, useMemo, useRef, useState } from 'react';
import type { GeoJSONSource, Map as MapLibreMap, Marker } from 'maplibre-gl';
import type { FeatureCollection as GeoCollection, Geometry, LineString } from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import {
  cachedLegRoute,
  cityCoords,
  fetchLegRoute,
  straightLeg,
  type LngLat,
} from '../../geo/geo';
import { runStatusLabel, t } from '../../i18n';
import { formatWhen, nextStop, placeName, type Run } from '../../runs/demo';
import type { EnrichedRun } from '../../store/selectors/runsSelectors';

type MapLib = typeof import('maplibre-gl');

const STYLE_URL = 'https://tiles.openfreemap.org/styles/positron';
const US_BOUNDS: [LngLat, LngLat] = [
  [-124, 25],
  [-67, 49],
];

// Every leg is drawn to the right of its travel direction, like a traffic lane,
// so outbound and return legs on the same interstate stay visible side by side.
const LANE_OFFSET = 3.5;

const statusTone: Record<Run['status'], string> = {
  Planned: 'planned',
  'In transit': 'transit',
  'Empty return': 'empty',
  Completed: 'done',
};

type FeatureCollection = GeoCollection<Geometry>;

function emptyCollection(): FeatureCollection {
  return { type: 'FeatureCollection', features: [] };
}

function truckPosition(run: Run): LngLat | null {
  if (run.location) return [run.location.lng, run.location.lat];
  return cityCoords(placeName(run.yardCity, run.yardState));
}

function buildMapData(runs: EnrichedRun[], showCompleted: boolean) {
  const routes = emptyCollection();
  const stops = new Map<string, { coords: LngLat; isYard: boolean }>();
  const missing: [string, string][] = [];

  runs.forEach((item) => {
    const yard = item.yard;
    const yardCoords = cityCoords(yard);
    if (yardCoords) stops.set(yard, { coords: yardCoords, isYard: true });
    if (!showCompleted && item.run.status === 'Completed') return;

    item.timeline.forEach((step) => {
      if (step.from === step.to) return;
      const road = cachedLegRoute(step.from, step.to);
      if (!road) missing.push([step.from, step.to]);
      const coords = road?.coords ?? straightLeg(step.from, step.to);
      if (!coords) return;

      routes.features.push({
        type: 'Feature',
        properties: { kind: step.kind, runId: item.run.id },
        geometry: { type: 'LineString', coordinates: coords },
      });
      [step.from, step.to].forEach((name) => {
        const point = cityCoords(name);
        if (point && !stops.has(name)) {
          stops.set(name, { coords: point, isYard: false });
        }
      });
    });
  });

  const stopFeatures: FeatureCollection = {
    type: 'FeatureCollection',
    features: Array.from(stops, ([name, stop]) => ({
      type: 'Feature',
      properties: { name, isYard: stop.isYard },
      geometry: { type: 'Point', coordinates: stop.coords },
    })),
  };

  return { routes, stops: stopFeatures, missing };
}

function boundsOf(points: LngLat[]): [LngLat, LngLat] {
  if (points.length === 0) return US_BOUNDS;
  const lngs = points.map((point) => point[0]);
  const lats = points.map((point) => point[1]);
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ];
}

function truckMarkerElement(run: Run) {
  const element = document.createElement('button');
  element.type = 'button';
  element.className = `truck-marker truck-marker--${statusTone[run.status]}`;
  element.setAttribute('aria-label', `${run.truck} · ${runStatusLabel(run.status)}`);
  element.innerHTML = `
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h11v9H3zM14 9h4l3 3v3h-7z" fill="currentColor"/><circle cx="7" cy="17" r="2" fill="currentColor"/><circle cx="17" cy="17" r="2" fill="currentColor"/></svg>
    <span>${run.truck.replace(/^\D+/, '')}</span>`;
  return element;
}

function popupContent(run: Run, onOpenRun?: (runId: string) => void) {
  const root = document.createElement('div');
  root.className = 'truck-popup';

  const title = document.createElement('strong');
  title.textContent = `${run.truck} · ${run.driver}`;

  const status = document.createElement('span');
  status.className = `truck-popup__status truck-popup__status--${statusTone[run.status]}`;
  status.textContent = runStatusLabel(run.status);

  const where = document.createElement('p');
  where.textContent = run.location?.label ?? t.map.homeYard(run.yardCity, run.yardState);

  const meta = document.createElement('p');
  meta.className = 'truck-popup__meta';
  const next = nextStop(run);
  const ping = run.location ? t.map.lastPing(formatWhen(run.location.at)) : '';
  meta.textContent = [next ? t.map.next(next) : t.map.runCompleted, ping]
    .filter(Boolean)
    .join(' · ');

  root.append(title, status, where, meta);

  if (onOpenRun) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'truck-popup__open';
    button.textContent = t.map.openRun;
    button.addEventListener('click', () => onOpenRun(run.id));
    root.append(button);
  }

  return root;
}

export function FleetRouteMap({
  runs,
  title = t.map.title,
  onOpenRun,
}: {
  runs: EnrichedRun[];
  title?: string;
  onOpenRun?: (runId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const libRef = useRef<MapLib | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const onOpenRunRef = useRef(onOpenRun);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [routesVersion, setRoutesVersion] = useState(0);

  useEffect(() => {
    onOpenRunRef.current = onOpenRun;
  }, [onOpenRun]);

  const isFleetView = runs.length > 1;
  const mapData = useMemo(
    () => buildMapData(runs, !isFleetView),
    // routesVersion re-reads the leg cache after road routes arrive
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [runs, isFleetView, routesVersion],
  );
  const fitKey = runs
    .map((item) => `${item.run.id}:${item.timeline.map((step) => step.id).join(',')}`)
    .join('|');

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | null = null;

    import('maplibre-gl')
      .then((lib) => {
        if (cancelled || !containerRef.current) return;
        libRef.current = lib;
        // Point maplibre at the emitted worker file (Vite does not detect it).
        lib.setWorkerUrl(mapWorkerUrl);
        map = new lib.Map({
          container: containerRef.current,
          style: STYLE_URL,
          bounds: US_BOUNDS,
          fitBoundsOptions: { padding: 40 },
          attributionControl: { compact: true },
          cooperativeGestures: true,
          locale: t.map.locale,
        });
        mapRef.current = map;
        map.addControl(
          new lib.NavigationControl({ showCompass: false }),
          'top-right',
        );
        map.on('load', () => {
          if (!map) return;
          map.addSource('routes', { type: 'geojson', data: emptyCollection() });
          map.addSource('stops', { type: 'geojson', data: emptyCollection() });
          map.addLayer({
            id: 'route-casing',
            type: 'line',
            source: 'routes',
            filter: ['==', ['get', 'kind'], 'paid'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#ffffff', 'line-width': 7, 'line-offset': LANE_OFFSET },
          });
          map.addLayer({
            id: 'route-paid',
            type: 'line',
            source: 'routes',
            filter: ['==', ['get', 'kind'], 'paid'],
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: { 'line-color': '#2563eb', 'line-width': 4, 'line-offset': LANE_OFFSET },
          });
          map.addLayer({
            id: 'route-empty',
            type: 'line',
            source: 'routes',
            filter: ['==', ['get', 'kind'], 'empty'],
            layout: { 'line-join': 'round' },
            paint: {
              'line-color': '#d97706',
              'line-width': 3,
              'line-offset': LANE_OFFSET,
              'line-dasharray': [1.5, 1.5],
            },
          });
          map.addLayer({
            id: 'stop-dots',
            type: 'circle',
            source: 'stops',
            paint: {
              'circle-radius': ['case', ['get', 'isYard'], 7, 5],
              'circle-color': ['case', ['get', 'isYard'], '#1c1c1c', '#ffffff'],
              'circle-stroke-color': ['case', ['get', 'isYard'], '#ffffff', '#1c1c1c'],
              'circle-stroke-width': 2,
            },
          });
          map.addLayer({
            id: 'stop-labels',
            type: 'symbol',
            source: 'stops',
            layout: {
              'text-field': ['get', 'name'],
              'text-font': [
                'case',
                ['get', 'isYard'],
                ['literal', ['Noto Sans Bold']],
                ['literal', ['Noto Sans Regular']],
              ],
              'text-size': 12,
              'text-offset': [0, 1.1],
              'text-anchor': 'top',
              'text-optional': true,
            },
            paint: {
              'text-color': '#1c1c1c',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1.5,
            },
          });
          setReady(true);
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
      map?.remove();
      mapRef.current = null;
    };
  }, []);

  // Push routes, stops and truck markers into the map.
  useEffect(() => {
    const map = mapRef.current;
    const lib = libRef.current;
    if (!ready || !map || !lib) return;

    (map.getSource('routes') as GeoJSONSource | undefined)?.setData(mapData.routes);
    (map.getSource('stops') as GeoJSONSource | undefined)?.setData(mapData.stops);

    markersRef.current.forEach((marker) => marker.remove());
    const placed = runs.flatMap(({ run }) => {
      const position = truckPosition(run);
      return position ? [{ run, position, key: position.join(',') }] : [];
    });
    markersRef.current = placed.map(({ run, position, key }) => {
      // Trucks parked at the same spot (e.g. the yard) sit side by side.
      const sameSpot = placed.filter((item) => item.key === key);
      const slot = sameSpot.findIndex((item) => item.run.id === run.id);
      const offsetX = (slot - (sameSpot.length - 1) / 2) * 56;
      const popup = new lib.Popup({ offset: 18, closeButton: false, maxWidth: '260px' })
        .setDOMContent(popupContent(run, onOpenRunRef.current));
      return new lib.Marker({
        element: truckMarkerElement(run),
        anchor: 'bottom',
        offset: [offsetX, -6],
      })
        .setLngLat(position)
        .setPopup(popup)
        .addTo(map);
    });
  }, [ready, mapData, runs]);

  // Frame the visible runs whenever the set of legs changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    const points: LngLat[] = [
      ...mapData.routes.features.flatMap(
        (feature) => (feature.geometry as LineString).coordinates as LngLat[],
      ),
      ...runs.flatMap(({ run }) => {
        const position = truckPosition(run);
        return position ? [position] : [];
      }),
    ];
    map.fitBounds(boundsOf(points), {
      padding: { top: 64, bottom: 72, left: 56, right: 56 },
      maxZoom: 9,
      duration: 0,
    });
    // fitKey changes only when runs or their legs change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, fitKey]);

  // Fetch road geometry for legs that are not in the bundled demo routes.
  useEffect(() => {
    if (mapData.missing.length === 0) return;
    let cancelled = false;
    Promise.all(mapData.missing.map(([from, to]) => fetchLegRoute(from, to))).then(
      (results) => {
        if (!cancelled && results.some(Boolean)) {
          setRoutesVersion((version) => version + 1);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [mapData.missing]);

  return (
    <section className="runs__block runs__map-card" aria-label={t.map.aria}>
      <div className="runs__form-head">
        <h2 className="runs__subtitle">{title}</h2>
        <div className="runs__map-legend">
          <span className="runs__map-key runs__map-key--paid">{t.map.paidLoad}</span>
          <span className="runs__map-key runs__map-key--empty">{t.map.emptyLeg}</span>
        </div>
      </div>
      <div className="runs__map" ref={containerRef}>
        {failed && (
          <p className="runs__map-fallback">{t.map.unavailable}</p>
        )}
      </div>
    </section>
  );
}

export default FleetRouteMap;
