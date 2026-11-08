import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateData(directory = 'public/data', now = Date.now()) {
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(resolve(directory, 'manifest.json'), 'utf8'));
  } catch {
    throw new Error(
      'Missing/malformed public/data/manifest.json. Run: cd analysis && uv run python src/pipeline.py',
    );
  }
  if (
    manifest.schemaVersion !== '1.0' ||
    manifest.methodVersion !== 'priority-proximity-v1' ||
    manifest.mode !== 'observed' ||
    !manifest.publicationBasis ||
    !/^[a-f0-9]{12}$/.test(manifest.datasetVersion)
  )
    throw new Error(
      'Incompatible manifest. Rebuild the observed data assets locally. No synthetic production fallback is allowed.',
    );
  const age = now - Date.parse(manifest.generatedAt);
  if (!Number.isFinite(age) || age < -300000 || age > 30 * 86400000)
    throw new Error(
      'Processed assets are stale (>30 days) or future-dated. Re-run the local pipeline; source vintages remain disclosed.',
    );
  const required = ['areas.json', 'tracts.geojson', 'counties.geojson', 'retailers.geojson'];
  for (const name of required) {
    const bytes = readFileSync(resolve(directory, name));
    if (
      bytes.length < 3 ||
      createHash('sha256').update(bytes).digest('hex') !== manifest.assetHashes?.[name]
    )
      throw new Error(`Missing, empty, or hash-mismatched ${name}. Re-run the pipeline.`);
  }
  const areas = JSON.parse(readFileSync(resolve(directory, 'areas.json'), 'utf8'));
  if (
    !Array.isArray(areas) ||
    areas.length !== manifest.areaCount ||
    !areas.length ||
    new Set(areas.map((a) => a.id)).size !== areas.length
  )
    throw new Error('Invalid area count or duplicate keys');
  for (const area of areas) {
    if (
      !/^12\d{9}$/.test(area.id) ||
      !manifest.geography.includes(area.county) ||
      !Array.isArray(area.coordinates) ||
      area.coordinates.length !== 2 ||
      !area.coordinates.every(Number.isFinite) ||
      area.coordinates[0] < -83 ||
      area.coordinates[0] > -80 ||
      area.coordinates[1] < 27 ||
      area.coordinates[1] > 30
    )
      throw new Error('Invalid geography/coordinates');
    for (const key of ['poverty', 'lowAccess', 'snap', 'povertyMoe'])
      if (area[key] !== null && (!Number.isFinite(area[key]) || area[key] < 0 || area[key] > 100))
        throw new Error(`Invalid ${key} percent`);
    for (const key of ['population', 'households'])
      if (!Number.isInteger(area[key]) || area[key] < 0) throw new Error(`Invalid ${key} count`);
  }
  const tracts = JSON.parse(readFileSync(resolve(directory, 'tracts.geojson'), 'utf8'));
  if (
    tracts.type !== 'FeatureCollection' ||
    tracts.features.length !== areas.length ||
    new Set(tracts.features.map((f) => f.properties.id)).size !== areas.length ||
    areas.some((a) => !tracts.features.some((f) => f.properties.id === a.id))
  )
    throw new Error('Geometry and area keys do not agree');
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const manifest = validateData();
    console.log(
      `Validated ${manifest.areaCount} observed tracts · dataset ${manifest.datasetVersion} · schema ${manifest.schemaVersion}`,
    );
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
