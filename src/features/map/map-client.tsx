'use client';
import { useEffect, useRef, useState } from 'react';
import type * as GeoJSON from 'geojson';
import * as maplibregl from 'maplibre-gl';
import { type GeoJSONSource, type Map as LibreMap } from 'maplibre-gl';
import { circlePolygon } from '@/lib/domain/planner';
import type { MapProps } from './map-view';
import 'maplibre-gl/dist/maplibre-gl.css';

export default function MapClient(props: MapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LibreMap | null>(null);
  const marker = useRef<maplibregl.Marker | null>(null);
  const current = useRef(props);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  const [fallback, setFallback] = useState(false);
  const [geometry, setGeometry] = useState<GeoJSON.FeatureCollection<
    GeoJSON.Polygon | GeoJSON.MultiPolygon
  > | null>(null);
  const [retailerGeometry, setRetailerGeometry] =
    useState<GeoJSON.FeatureCollection<GeoJSON.Point> | null>(null);
  useEffect(() => {
    current.current = props;
  }, [props]);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/data/tracts.geojson', { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Map geometry unavailable');
        return r.json();
      })
      .then((geo: GeoJSON.FeatureCollection<GeoJSON.Polygon | GeoJSON.MultiPolygon>) =>
        setGeometry(geo),
      )
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError'))
          setNotice('Map geometry could not load. Use the area list and coordinate controls.');
      });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!fallback || !props.showRetailers) return;
    const abort = new AbortController();
    fetch('/data/retailers.geojson', { signal: abort.signal })
      .then((r) => {
        if (!r.ok) throw new Error('Retailer points unavailable');
        return r.json();
      })
      .then((geo: GeoJSON.FeatureCollection<GeoJSON.Point>) => setRetailerGeometry(geo))
      .catch((e: unknown) => {
        if (!(e instanceof DOMException && e.name === 'AbortError'))
          setNotice('Retailer points could not load. Tract planning remains available.');
      });
    return () => abort.abort();
  }, [fallback, props.showRetailers]);
  useEffect(() => {
    // The unconditional map div attaches this ref before the mount effect runs.
    const element = container.current!;
    let instance: LibreMap;
    let resize: ResizeObserver | undefined;
    const timer = setTimeout(() => {
      setNotice('Basemap unavailable. The local Census boundaries still work.');
    }, 12000);
    try {
      maplibregl.setWorkerUrl('/vendor/maplibre/maplibre-gl-worker.mjs');
      instance = new maplibregl.Map({
        container: element,
        style: process.env.NEXT_PUBLIC_MAP_STYLE ?? 'https://tiles.openfreemap.org/styles/positron',
        center: current.current.scenario.coordinates,
        zoom: 8.8,
        minZoom: 7,
        maxZoom: 16,
        attributionControl: { compact: true },
      });
      map.current = instance;
      instance.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
      instance.addControl(new maplibregl.ScaleControl({ unit: 'imperial' }), 'bottom-right');
      instance.on('error', () => {
        setNotice('Some basemap tiles could not load. Census data and planning remain available.');
        if (!instance.isStyleLoaded()) setFallback(true);
      });
      instance.on('load', () => {
        clearTimeout(timer);
        instance.addSource('tracts', {
          type: 'geojson',
          data: '/data/tracts.geojson',
          promoteId: 'id',
        });
        instance.addSource('counties', { type: 'geojson', data: '/data/counties.geojson' });
        instance.addSource('retailers', { type: 'geojson', data: '/data/retailers.geojson' });
        instance.addSource('catchment', {
          type: 'geojson',
          data: circlePolygon(
            current.current.scenario.coordinates,
            current.current.scenario.radius,
          ),
        });
        instance.addLayer({
          id: 'tract-fill',
          type: 'fill',
          source: 'tracts',
          paint: {
            'fill-color': [
              'case',
              ['==', ['feature-state', 'priority'], null],
              '#cfd5d8',
              [
                'interpolate',
                ['linear'],
                ['coalesce', ['feature-state', 'priority'], 0],
                0,
                '#e7eef0',
                25,
                '#b7cbd4',
                50,
                '#6b8fa8',
                75,
                '#385981',
                100,
                '#1e343f',
              ],
            ],
            'fill-opacity': ['case', ['boolean', ['feature-state', 'inScope'], true], 0.68, 0.12],
          },
        });
        instance.addLayer({
          id: 'tract-line',
          type: 'line',
          source: 'tracts',
          paint: { 'line-color': '#fff', 'line-width': 0.7 },
        });
        instance.addLayer({
          id: 'included',
          type: 'line',
          source: 'tracts',
          paint: {
            'line-color': '#f79122',
            'line-width': ['case', ['boolean', ['feature-state', 'included'], false], 2.2, 0],
          },
        });
        instance.addLayer({
          id: 'counties',
          type: 'line',
          source: 'counties',
          paint: { 'line-color': '#385981', 'line-width': 1.4, 'line-dasharray': [4, 3] },
        });
        instance.addLayer({
          id: 'catchment-fill',
          type: 'fill',
          source: 'catchment',
          paint: { 'fill-color': '#f79122', 'fill-opacity': 0.13 },
        });
        instance.addLayer({
          id: 'catchment-line',
          type: 'line',
          source: 'catchment',
          paint: { 'line-color': '#c16a08', 'line-width': 2, 'line-dasharray': [3, 2] },
        });
        instance.addLayer({
          id: 'retailers',
          type: 'circle',
          source: 'retailers',
          paint: {
            'circle-radius': 3,
            'circle-color': '#1e343f',
            'circle-stroke-color': '#fff',
            'circle-stroke-width': 1,
          },
          layout: { visibility: 'none' },
        });
        const popup = new maplibregl.Popup({ closeButton: false, closeOnClick: false });
        instance.on('mousemove', 'tract-fill', (event) => {
          instance.getCanvas().style.cursor = 'pointer';
          const id = String(event.features?.[0]?.properties?.id);
          const area = current.current.areas.find((a) => a.id === id);
          if (area) {
            const node = document.createElement('div');
            node.textContent = `${area.label} · ${area.county} · ${area.priority === null ? 'Insufficient data' : `${area.priority.toFixed(0)} / 100 priority`}`;
            popup.setLngLat(event.lngLat).setDOMContent(node).addTo(instance);
          }
        });
        instance.on('mouseleave', 'tract-fill', () => {
          instance.getCanvas().style.cursor = '';
          popup.remove();
        });
        instance.on('click', 'tract-fill', (event) => {
          const id = event.features?.[0]?.properties?.id;
          if (id) current.current.onSelect(String(id));
        });
        const el = document.createElement('div');
        el.className = 'site-marker';
        el.setAttribute('role', 'img');
        el.setAttribute('aria-label', 'Proposed site; drag to move or use coordinate fields');
        el.textContent = '●';
        marker.current = new maplibregl.Marker({ element: el, draggable: true })
          .setLngLat(current.current.scenario.coordinates)
          .addTo(instance);
        marker.current.on('dragend', () => {
          const pos = marker.current!.getLngLat();
          if (pos.lng >= -83 && pos.lng <= -80 && pos.lat >= 27 && pos.lat <= 30)
            current.current.onMove([Number(pos.lng.toFixed(6)), Number(pos.lat.toFixed(6))]);
          else marker.current!.setLngLat(current.current.scenario.coordinates);
        });
        setReady(true);
      });
      resize = new ResizeObserver(() => instance.resize());
      resize.observe(element);
    } catch {
      clearTimeout(timer);
      queueMicrotask(() => {
        setFallback(true);
        setNotice('WebGL is unavailable. Showing an interactive Census boundary map.');
      });
    }
    return () => {
      clearTimeout(timer);
      resize?.disconnect();
      marker.current?.remove();
      map.current?.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !map.current) return;
    const instance = map.current;
    for (const a of props.areas)
      instance.setFeatureState(
        { source: 'tracts', id: a.id },
        {
          priority: a.priority,
          included: props.included.includes(a.id) && !props.baseline,
          inScope: props.scenario.county === 'all' || a.county === props.scenario.county,
        },
      );
    (instance.getSource('catchment') as GeoJSONSource).setData(
      circlePolygon(props.scenario.coordinates, props.scenario.radius),
    );
    for (const layer of ['catchment-fill', 'catchment-line'])
      instance.setLayoutProperty(layer, 'visibility', props.baseline ? 'none' : 'visible');
    instance.setLayoutProperty('retailers', 'visibility', props.showRetailers ? 'visible' : 'none');
    marker.current?.setLngLat(props.scenario.coordinates);
  }, [props, ready]);
  const visible = new Map(props.areas.map((a) => [a.id, a]));
  const path = (ring: number[][]) =>
    ring
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${(p[0] + 82.05) * 560} ${(29.36 - p[1]) * 560}`)
      .join(' ') + 'Z';
  return (
    <div className="map-frame">
      <div
        ref={container}
        className="map-canvas"
        aria-label="Interactive Central Florida food access map"
      />
      {fallback && geometry && (
        <svg
          className="fallback-map"
          viewBox="0 0 760 1050"
          role="img"
          aria-label="Census tract boundaries; choose an area using the list for keyboard access"
        >
          {geometry.features.map((f) => {
            const a = visible.get(String(f.properties?.id));
            if (!a) return null;
            const rings =
              f.geometry.type === 'Polygon'
                ? f.geometry.coordinates
                : f.geometry.coordinates.flat();
            return (
              <path
                key={a.id}
                d={rings.map(path).join(' ')}
                fill={a.priority === null ? '#cfd5d8' : `hsl(207 29% ${91 - a.priority * 0.58}%)`}
                opacity={
                  props.scenario.county === 'all' || a.county === props.scenario.county ? 1 : 0.2
                }
                stroke={!props.baseline && props.included.includes(a.id) ? '#c16a08' : '#fff'}
                strokeWidth={!props.baseline && props.included.includes(a.id) ? 2 : 0.6}
                onClick={() => props.onSelect(a.id)}
              >
                <title>
                  {a.label}, {a.county}
                </title>
              </path>
            );
          })}
          {!props.baseline && (
            <>
              <ellipse
                cx={(props.scenario.coordinates[0] + 82.05) * 560}
                cy={(29.36 - props.scenario.coordinates[1]) * 560}
                rx={
                  (props.scenario.radius /
                    (69.093 * Math.cos((props.scenario.coordinates[1] * Math.PI) / 180))) *
                  560
                }
                ry={(props.scenario.radius / 69.093) * 560}
                fill="#f7912222"
                stroke="#c16a08"
                strokeDasharray="5 3"
              />
              <circle
                cx={(props.scenario.coordinates[0] + 82.05) * 560}
                cy={(29.36 - props.scenario.coordinates[1]) * 560}
                r="6"
                fill="#f79122"
                stroke="#fff"
                strokeWidth="3"
              />
            </>
          )}
          {props.showRetailers &&
            retailerGeometry?.features.map((feature, index) => (
              <circle
                key={index}
                cx={(feature.geometry.coordinates[0] + 82.05) * 560}
                cy={(29.36 - feature.geometry.coordinates[1]) * 560}
                r="2.3"
                fill="#1e343f"
              >
                <title>{feature.properties?.name}</title>
              </circle>
            ))}
        </svg>
      )}
      {notice && (
        <div className="map-notice" role="status">
          {notice}
          {!fallback && <button onClick={() => setFallback(true)}>Use boundary map</button>}
        </div>
      )}
      <div className="map-source">
        Census 2020 boundaries · USDA ERS ·{' '}
        {fallback ? 'Local boundary map' : '© OpenFreeMap · © OpenStreetMap contributors'}
      </div>
    </div>
  );
}
