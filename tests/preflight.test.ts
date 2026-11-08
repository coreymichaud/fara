// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { validateData } from '../scripts/validate-data.mjs';
import { dataset, areas } from './fixtures';
let directory: string;
const now = Date.parse('2026-11-07T12:00:00Z');
beforeEach(() => {
  directory = mkdtempSync(join(tmpdir(), 'data-preflight-'));
});
afterEach(() => {
  rmSync(directory, { recursive: true, force: true });
});
function assets(overrides: Record<string, unknown> = {}) {
  const payloads: Record<string, unknown> = {
    'areas.json': areas,
    'tracts.geojson': {
      type: 'FeatureCollection',
      features: areas.map((a) => ({
        type: 'Feature',
        properties: { id: a.id },
        geometry: { type: 'Polygon', coordinates: [] },
      })),
    },
    'counties.geojson': { type: 'FeatureCollection', features: [] },
    'retailers.geojson': { type: 'FeatureCollection', features: [] },
    ...overrides,
  };
  const hashes: Record<string, string> = {};
  for (const [name, value] of Object.entries(payloads)) {
    const content = JSON.stringify(value);
    writeFileSync(join(directory, name), content);
    hashes[name] = createHash('sha256').update(content).digest('hex');
  }
  const manifest = { ...dataset.manifest, mode: 'observed', assetHashes: hashes };
  writeFileSync(join(directory, 'manifest.json'), JSON.stringify(manifest));
  return manifest;
}
function changeManifest(patch: Record<string, unknown>) {
  const path = join(directory, 'manifest.json');
  writeFileSync(path, JSON.stringify({ ...JSON.parse(readFileSync(path, 'utf8')), ...patch }));
}
describe('local packaging preflight', () => {
  it('validates matching assets and refuses missing/malformed/stale/future manifests', () => {
    expect(() => validateData(directory, now)).toThrow('Missing/malformed');
    assets();
    expect(validateData(directory, now).areaCount).toBe(3);
    changeManifest({ schemaVersion: 'bad' });
    expect(() => validateData(directory, now)).toThrow('Incompatible');
    assets();
    changeManifest({ generatedAt: '2020-01-01' });
    expect(() => validateData(directory, now)).toThrow('stale');
    changeManifest({ generatedAt: 'not-date' });
    expect(() => validateData(directory, now)).toThrow('stale');
    changeManifest({ generatedAt: '2027-01-01' });
    expect(() => validateData(directory, now)).toThrow('future');
  });
  it('checks manifest compatibility and every required asset hash', () => {
    for (const patch of [
      { methodVersion: 'bad' },
      { mode: 'illustrative' },
      { publicationBasis: '' },
      { datasetVersion: 'bad' },
    ]) {
      assets();
      changeManifest(patch);
      expect(() => validateData(directory, now)).toThrow('Incompatible');
    }
    assets();
    writeFileSync(join(directory, 'areas.json'), '[]');
    expect(() => validateData(directory, now)).toThrow('hash-mismatched');
    assets();
    changeManifest({ assetHashes: {} });
    expect(() => validateData(directory, now)).toThrow('hash-mismatched');
  });
  it('rejects invalid data despite matching hashes', () => {
    for (const replacement of [null, [], [areas[0], areas[0], areas[2]]]) {
      assets({ 'areas.json': replacement });
      expect(() => validateData(directory, now)).toThrow();
    }
    for (const patch of [
      { id: 'bad' },
      { county: 'Outside' },
      { coordinates: [] },
      { coordinates: [-181, 28] },
      { coordinates: [0, 28] },
      { coordinates: [-81, 26] },
      { coordinates: [-81, 31] },
      { coordinates: [-81, null] },
      { poverty: 101 },
      { lowAccess: -1 },
      { snap: '50' },
      { population: -1 },
      { households: 1.5 },
    ]) {
      assets({ 'areas.json': [{ ...areas[0], ...patch }, ...areas.slice(1)] });
      expect(() => validateData(directory, now)).toThrow();
    }
    assets({ 'tracts.geojson': { type: 'Invalid', features: [] } });
    expect(() => validateData(directory, now)).toThrow('Geometry');
    assets({
      'tracts.geojson': {
        type: 'FeatureCollection',
        features: [
          { properties: { id: 'a' } },
          { properties: { id: 'a' } },
          { properties: { id: 'b' } },
        ],
      },
    });
    expect(() => validateData(directory, now)).toThrow('Geometry');
    assets({
      'tracts.geojson': {
        type: 'FeatureCollection',
        features: [
          { properties: { id: 'a' } },
          { properties: { id: 'b' } },
          { properties: { id: 'c' } },
        ],
      },
    });
    expect(() => validateData(directory, now)).toThrow('Geometry');
  });
  it('prepares licensed same-origin map worker assets', async () => {
    await import('../scripts/prepare-map.mjs');
    expect(readFileSync(resolve('public/vendor/maplibre/LICENSE.txt'), 'utf8')).toContain(
      'Copyright',
    );
    expect(
      readFileSync(resolve('public/vendor/maplibre/maplibre-gl-worker.mjs'), 'utf8'),
    ).toContain('MapLibre');
  });
  it('runs the actual CLI with default paths and visible failure exit codes', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(now);
    const root = process.cwd(),
      argv = process.argv,
      previousExit = process.exitCode;
    const local = join(directory, 'public/data');
    mkdirSync(local, { recursive: true });
    directory = local;
    assets();
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined),
      error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      process.chdir(resolve(local, '../..'));
      process.argv = [process.execPath, resolve(root, 'scripts/validate-data.mjs')];
      vi.resetModules();
      await import('../scripts/validate-data.mjs');
      expect(log).toHaveBeenCalledWith(expect.stringContaining('Validated 3 observed tracts'));
      writeFileSync(join(local, 'manifest.json'), '{}');
      vi.resetModules();
      await import('../scripts/validate-data.mjs');
      expect(process.exitCode).toBe(1);
      expect(error).toHaveBeenCalled();
      process.argv = [process.execPath];
      vi.resetModules();
      await import('../scripts/validate-data.mjs');
    } finally {
      process.chdir(root);
      process.argv = argv;
      process.exitCode = previousExit;
      directory = resolve(local, '../..');
    }
  });
});
