// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const read = vi.hoisted(() => vi.fn());
vi.mock('node:fs/promises', () => ({ readFile: read }));
import { loadStudyMap } from '@/lib/data/study-map';

const ring = [
  [-82.05, 29.36],
  [-81.05, 29.36],
  [-81.05, 28.36],
  [-82.05, 29.36],
];
const feature = (geometry: unknown) => ({ type: 'Feature', properties: { id: '12095' }, geometry });
const collection = (features: unknown[]) => JSON.stringify({ type: 'FeatureCollection', features });
beforeEach(() => {
  read.mockReset();
});

it('projects Polygon and MultiPolygon boundaries, retaining inner rings and disconnected parts', async () => {
  read.mockResolvedValue(
    collection([
      feature({ type: 'Polygon', coordinates: [ring, ring] }),
      feature({ type: 'MultiPolygon', coordinates: [[ring], [ring]] }),
    ]),
  );
  const result = await loadStudyMap();
  const path = 'M0.00,0.00 L560.00,0.00 L560.00,560.00 L0.00,0.00Z';
  expect(result).toEqual([
    { id: '12095', path: `${path} ${path}` },
    { id: '12095', path: `${path} ${path}` },
  ]);
  expect(read).toHaveBeenCalledWith(
    expect.stringContaining('/public/data/counties.geojson'),
    'utf8',
  );
});

it.each([
  'not JSON',
  collection([]),
  collection([feature({ type: 'Point', coordinates: ring[0] })]),
  collection([feature({ type: 'Polygon', coordinates: [[[0, 0]]] })]),
  collection([feature({ type: 'Polygon', coordinates: [[[null, 0], ...ring]] })]),
  collection([
    { ...feature({ type: 'Polygon', coordinates: [ring] }), properties: { id: 'invalid' } },
  ]),
])('rejects malformed or empty boundaries instead of inventing a preview: %s', async (data) => {
  read.mockResolvedValue(data);
  await expect(loadStudyMap()).rejects.toThrow();
});

it('surfaces missing local assets to the page error boundary', async () => {
  read.mockRejectedValue(new Error('Boundary file unavailable'));
  await expect(loadStudyMap()).rejects.toThrow('Boundary file unavailable');
});
