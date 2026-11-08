import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { areaSchema, manifestSchema, type Dataset } from '../domain/schema';
let loaded: Promise<Dataset> | undefined;
export function loadDataset(): Promise<Dataset> {
  loaded ??= Promise.all(
    ['manifest.json', 'areas.json'].map((name) =>
      readFile(join(process.cwd(), 'public/data', name), 'utf8'),
    ),
  ).then(([manifest, areas]) => ({
    manifest: manifestSchema.parse(JSON.parse(manifest)),
    areas: areaSchema.array().min(1).parse(JSON.parse(areas)),
  }));
  return loaded;
}
