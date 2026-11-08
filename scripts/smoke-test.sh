#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == '--help' || $# -ne 1 ]]; then
  echo 'Usage: bash scripts/smoke-test.sh http://localhost:8080 (or a Cloud Run URL)'
  exit "$(( $# == 1 ? 0 : 2 ))"
fi
BASE_URL="${1%/}"
case "$BASE_URL" in http://*|https://*) ;; *) echo 'Expected an http(s) URL' >&2; exit 2;; esac
TASK_TMP="$(mktemp -d)"
trap 'rm -rf "$TASK_TMP"' EXIT
for path in / /api/health /data/manifest.json /data/areas.json /data/tracts.geojson /methodology /about; do
  curl --fail --silent --show-error --retry 3 --retry-delay 2 "$BASE_URL$path" --output "$TASK_TMP/$(echo "$path" | tr '/' '_')"
done
node - "$TASK_TMP" <<'JS'
const fs=require('node:fs');
const dir=process.argv[2];
const manifest=JSON.parse(fs.readFileSync(`${dir}/_data_manifest.json`));
const areas=JSON.parse(fs.readFileSync(`${dir}/_data_areas.json`));
const tracts=JSON.parse(fs.readFileSync(`${dir}/_data_tracts.geojson`));
const health=JSON.parse(fs.readFileSync(`${dir}/_api_health`));
if(manifest.mode!=='observed'||manifest.schemaVersion!=='1.0'||areas.length!==manifest.areaCount||tracts.features.length!==areas.length||health.datasetVersion!==manifest.datasetVersion)throw new Error('Data endpoint mismatch');
if(!fs.readFileSync(`${dir}/_`,'utf8').includes('Pantry planner'))throw new Error('Homepage not rendered');
console.log(`Smoke passed: homepage, methodology, about, health, manifest, ${areas.length} areas and map geometry`);
JS
