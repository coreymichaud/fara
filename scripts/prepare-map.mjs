import { mkdirSync, copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
// MapLibre 6 uses a module worker and a relative shared module. Keep both same-origin.
const destination = resolve('public/vendor/maplibre');
mkdirSync(destination, { recursive: true });
for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs'])
  copyFileSync(resolve('node_modules/maplibre-gl/dist', name), resolve(destination, name));
copyFileSync(resolve('node_modules/maplibre-gl/LICENSE.txt'), resolve(destination, 'LICENSE.txt'));
