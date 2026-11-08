#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == '--help' || $# -gt 1 ]]; then echo 'Usage: bash scripts/test-container.sh [image-tag]'; exit 0; fi
IMAGE="${1:-food-access:local}"
CONTAINER_ID="$(docker run -d -p 127.0.0.1::8080 "$IMAGE")"
trap 'docker rm -f "$CONTAINER_ID" >/dev/null' EXIT
PORT_NUMBER="$(docker port "$CONTAINER_ID" 8080/tcp | sed 's/.*://')"
for attempt in {1..30}; do
  if curl --silent --fail "http://127.0.0.1:$PORT_NUMBER/api/health" >/dev/null; then break; fi
  sleep 1
done
bash scripts/smoke-test.sh "http://127.0.0.1:$PORT_NUMBER"
docker exec "$CONTAINER_ID" node -e 'const fs=require("fs"); for(const p of ["data/raw","data/processed","analysis",".env.local","references"]){if(fs.existsSync(p))throw new Error(`Forbidden image path: ${p}`)} console.log("No raw data, source notebooks, brand PDF or local secrets in final image")'
STATUS="$(curl --silent --output /dev/null --write-out '%{http_code}' -X POST -H 'Content-Type: application/json' -d '{}' "http://127.0.0.1:$PORT_NUMBER/api/plans")"
[[ "$STATUS" == 503 ]] || { echo "Expected production persistence to fail closed without credentials, got $STATUS" >&2; exit 1; }
echo 'Production writes fail closed without Firestore configuration.'
