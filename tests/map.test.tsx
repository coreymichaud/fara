import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MapProps } from '@/features/map/map-view';
import { scoreAreas } from '@/lib/domain/planner';
import { areas, scenario } from './fixtures';
type Listener = (event: never) => void;
type MapStub = {
  events: Record<string, Listener>;
  data: { setData: ReturnType<typeof vi.fn> };
  setLayoutProperty: ReturnType<typeof vi.fn>;
  setFeatureState: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};
type MarkerStub = {
  events: Record<string, Listener>;
  setLngLat: ReturnType<typeof vi.fn>;
  getElement: () => HTMLElement;
};
const state = vi.hoisted(() => ({
  maps: [] as MapStub[],
  markers: [] as MarkerStub[],
  throw: false,
  styleLoaded: true,
  position: { lng: -81.41, lat: 28.52 },
  popup: vi.fn(),
}));
vi.mock('maplibre-gl', () => ({
  setWorkerUrl: vi.fn(),
  Map: class {
    events: Record<string, Listener> = {};
    data = { setData: vi.fn() };
    setLayoutProperty = vi.fn();
    setFeatureState = vi.fn();
    remove = vi.fn();
    constructor() {
      if (state.throw) throw new Error('WebGL unavailable');
      state.maps.push(this);
    }
    addControl() {}
    addSource() {}
    addLayer() {}
    resize() {}
    getSource() {
      return this.data;
    }
    getCanvas() {
      return { style: { cursor: '' } };
    }
    isStyleLoaded() {
      return state.styleLoaded;
    }
    on(name: string, layerOrListener: string | Listener, listener?: Listener) {
      this.events[typeof layerOrListener === 'string' ? `${name}:${layerOrListener}` : name] =
        listener ?? (layerOrListener as Listener);
    }
  },
  Marker: class {
    events: Record<string, Listener> = {};
    setLngLat = vi.fn(() => this);
    element: HTMLElement;
    constructor({ element }: { element: HTMLElement }) {
      this.element = element;
      state.markers.push(this);
    }
    getElement() {
      return this.element;
    }
    addTo() {
      return this;
    }
    remove() {}
    getLngLat() {
      return state.position;
    }
    on(name: string, listener: Listener) {
      this.events[name] = listener;
    }
  },
  Popup: class {
    setLngLat() {
      return this;
    }
    setDOMContent(node: Node) {
      state.popup(node.textContent);
      return this;
    }
    addTo() {
      return this;
    }
    remove() {}
  },
  NavigationControl: class {},
  ScaleControl: class {},
}));
import MapClient from '@/features/map/map-client';
import { MapView } from '@/features/map/map-view';
const geometry = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { id: areas[0].id },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-81.4, 28.5],
            [-81.4, 28.6],
            [-81.3, 28.5],
            [-81.4, 28.5],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { id: areas[1].id },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [-81.5, 28.5],
              [-81.5, 28.6],
              [-81.4, 28.5],
              [-81.5, 28.5],
            ],
          ],
        ],
      },
    },
    { type: 'Feature', properties: null, geometry: { type: 'Polygon', coordinates: [] } },
  ],
};
function setup(overrides: Partial<MapProps> = {}) {
  state.maps = [];
  state.markers = [];
  state.throw = false;
  state.styleLoaded = true;
  state.popup.mockClear();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(private callback: () => void) {}
      observe() {
        this.callback();
      }
      disconnect() {}
    },
  );
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => geometry }));
  return {
    areas: scoreAreas(areas, 50),
    scenario,
    included: [areas[0].id],
    showProposal: true,
    showRetailers: false,
    onSelect: vi.fn(),
    onMove: vi.fn(),
    ...overrides,
  };
}
function emit(map: MapStub, name: string, value: unknown = {}) {
  act(() => {
    map.events[name](value as never);
  });
}

describe('MapLibre integration boundary and honest local fallback', () => {
  it('mounts layers, updates overlays, selects areas, explains hover and drags within bounds', async () => {
    const props = setup(),
      view = render(<MapClient {...props} />),
      map = state.maps[0];
    emit(map, 'load');
    await waitFor(() => expect(map.data.setData).toHaveBeenCalled());
    expect(screen.queryByText('Census 2020 boundaries · USDA ERS')).not.toBeInTheDocument();
    expect(state.markers[0].getElement().style.display).toBe('');
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'tracts', id: areas[0].id },
      { priority: 0, included: true, inScope: true },
    );
    emit(map, 'mousemove:tract-fill', {
      features: [{ properties: { id: areas[0].id } }],
      lngLat: {},
    });
    expect(state.popup).toHaveBeenCalledWith(expect.stringContaining('0 / 100 priority'));
    emit(map, 'mousemove:tract-fill', { features: [], lngLat: {} });
    emit(map, 'mouseleave:tract-fill');
    emit(map, 'click:tract-fill', { features: [] });
    emit(map, 'click:tract-fill', { features: [{ properties: { id: areas[1].id } }] });
    expect(props.onSelect).toHaveBeenCalledWith(areas[1].id);
    state.position = { lng: -81.41234567, lat: 28.52345678 };
    act(() => state.markers[0].events.dragend({} as never));
    expect(props.onMove).toHaveBeenCalledWith([-81.412346, 28.523457]);
    state.position = { lng: -90, lat: 28 };
    act(() => state.markers[0].events.dragend({} as never));
    expect(state.markers[0].setLngLat).toHaveBeenLastCalledWith(scenario.coordinates);
    view.rerender(
      <MapClient
        {...props}
        showProposal={false}
        showRetailers
        scenario={{ ...scenario, county: 'Orange' }}
        areas={[{ ...props.areas[0], priority: null }, ...props.areas.slice(1)]}
      />,
    );
    expect(map.setLayoutProperty).toHaveBeenCalledWith('retailers', 'visibility', 'visible');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('catchment-fill', 'visibility', 'none');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('catchment-line', 'visibility', 'none');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('included', 'visibility', 'none');
    expect(state.markers[0].getElement()).toHaveStyle({ display: 'none' });
    expect(map.setFeatureState).toHaveBeenCalledWith(
      { source: 'tracts', id: areas[0].id },
      { priority: null, included: false, inScope: true },
    );
    emit(map, 'mousemove:tract-fill', {
      features: [{ properties: { id: areas[0].id } }],
      lngLat: {},
    });
    expect(state.popup).toHaveBeenLastCalledWith(expect.stringContaining('Insufficient data'));
    view.rerender(<MapClient {...props} showRetailers />);
    expect(state.markers[0].getElement().style.display).toBe('');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('included', 'visibility', 'visible');
    expect(map.setLayoutProperty).toHaveBeenLastCalledWith('retailers', 'visibility', 'visible');
    view.unmount();
    expect(map.remove).toHaveBeenCalledOnce();
  });
  it('starts with the proposal hidden without disabling tract selection or retailer points', async () => {
    const props = setup({ showProposal: false, showRetailers: true });
    const view = render(<MapClient {...props} />);
    const map = state.maps[0];
    emit(map, 'load');
    expect(state.markers[0].getElement()).toHaveStyle({ display: 'none' });
    expect(map.setLayoutProperty).toHaveBeenCalledWith('catchment-fill', 'visibility', 'none');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('included', 'visibility', 'none');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('retailers', 'visibility', 'visible');
    emit(map, 'click:tract-fill', { features: [{ properties: { id: areas[1].id } }] });
    expect(props.onSelect).toHaveBeenCalledWith(areas[1].id);
    view.rerender(<MapClient {...props} showProposal />);
    expect(state.markers[0].getElement().style.display).toBe('');
    expect(map.setLayoutProperty).toHaveBeenCalledWith('catchment-fill', 'visibility', 'visible');
  });
  it('automatically offers real Census polygons when WebGL or the basemap fails', async () => {
    const props = setup({
      areas: [{ ...scoreAreas(areas, 50)[0], priority: null }, ...scoreAreas(areas, 50).slice(1)],
    });
    state.throw = true;
    const view = render(<MapClient {...props} />);
    expect(await screen.findByLabelText(/Census tract boundaries/)).toBeInTheDocument();
    expect(screen.getByText('Census 2020 boundaries · USDA ERS')).toBeInTheDocument();
    expect(screen.queryByText(/OpenFreeMap/)).not.toBeInTheDocument();
    expect(view.container.querySelectorAll('path')).toHaveLength(2);
    fireEvent.click(view.container.querySelector('path')!);
    expect(props.onSelect).toHaveBeenCalledWith(areas[0].id);
    view.unmount();
    const next = setup();
    state.styleLoaded = false;
    render(<MapClient {...next} />);
    emit(state.maps[0], 'error');
    expect(await screen.findByLabelText(/Census tract boundaries/)).toBeInTheDocument();
  });
  it('keeps map failure visible and lets the planner explicitly switch to boundaries', async () => {
    const props = setup();
    render(<MapClient {...props} />);
    emit(state.maps[0], 'error');
    await screen.findByText(/Some basemap tiles/);
    fireEvent.click(screen.getByText('Use boundary map'));
    expect(await screen.findByLabelText(/Census tract boundaries/)).toBeInTheDocument();
  });
  it('discloses unavailable local geometry, ignores canceled loads and times out visibly', async () => {
    const props = setup();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
    const view = render(<MapClient {...props} />);
    expect(await screen.findByText(/Map geometry could not load/)).toBeInTheDocument();
    view.unmount();
    const next = setup();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('aborted', 'AbortError')));
    const aborted = render(<MapClient {...next} />);
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.queryByText(/could not load/)).not.toBeInTheDocument();
    aborted.unmount();
    const last = setup();
    vi.useFakeTimers();
    render(<MapClient {...last} />);
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(12000);
    });
    expect(screen.getByText(/Basemap unavailable/)).toBeInTheDocument();
    vi.useRealTimers();
  });
  it('loads the client-only map wrapper', async () => {
    const props = setup();
    render(<MapView {...props} />);
    await waitFor(() =>
      expect(
        screen.getByLabelText('Interactive Central Florida food access map'),
      ).toBeInTheDocument(),
    );
  });
});

it('keeps county filters and retailer points independent of the proposal overlay in fallback mode', async () => {
  const props = setup();
  state.throw = true;
  const points = {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-81.4, 28.5] },
        properties: { name: 'Fixture public retailer' },
      },
    ],
  };
  const fetcher = vi.fn().mockImplementation(async (url: string) => ({
    ok: true,
    json: async () => (url.includes('retailers') ? points : geometry),
  }));
  vi.stubGlobal('fetch', fetcher);
  const view = render(<MapClient {...props} />);
  await screen.findByLabelText(/Census tract boundaries/);
  view.rerender(
    <MapClient {...props} showRetailers scenario={{ ...scenario, county: 'Orange' }} />,
  );
  expect(await screen.findByText('Fixture public retailer')).toBeInTheDocument();
  expect(view.container.querySelector('ellipse')).toBeInTheDocument();
  expect(view.container.querySelectorAll('circle')).toHaveLength(2);
  expect(view.container.querySelector('path')).toHaveAttribute('stroke', '#c16a08');
  view.rerender(
    <MapClient
      {...props}
      showRetailers
      showProposal={false}
      scenario={{ ...scenario, county: 'Lake' }}
    />,
  );
  expect(view.container.querySelector('ellipse')).not.toBeInTheDocument();
  expect(view.container.querySelectorAll('circle')).toHaveLength(1);
  expect(screen.getByText('Fixture public retailer')).toBeInTheDocument();
  expect(view.container.querySelector('path')).toHaveAttribute('stroke', '#fff');
  expect(view.container.querySelector('path')).toHaveAttribute('stroke-width', '0.6');
  expect(view.container.querySelector('path')).toHaveAttribute('opacity', '0.2');
  view.rerender(<MapClient {...props} />);
  expect(view.container.querySelector('ellipse')).toBeInTheDocument();
  expect(view.container.querySelectorAll('circle')).toHaveLength(1);
  expect(screen.queryByText('Fixture public retailer')).not.toBeInTheDocument();
  fetcher.mockResolvedValueOnce({ ok: false });
  view.rerender(<MapClient {...props} showRetailers />);
  expect(await screen.findByText(/Retailer points could not load/)).toBeInTheDocument();
  view.rerender(<MapClient {...props} />);
  fetcher.mockRejectedValueOnce(new DOMException('aborted', 'AbortError'));
  view.rerender(<MapClient {...props} showRetailers />);
  await act(async () => {
    await Promise.resolve();
  });
});
