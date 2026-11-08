#!/usr/bin/env bash
set -euo pipefail
if [[ "${1:-}" == '--help' ]]; then
  echo 'Usage: PROJECT_ID=your-project REGION=us-central1 SERVICE_ACCOUNT=food-access-runtime@your-project.iam.gserviceaccount.com bash scripts/deploy-gcp.sh'
  echo 'Optional: SERVICE_NAME=food-access REPOSITORY=food-access PUBLIC_DEMO=true'
  echo 'Requires prepared local public/data assets, Docker, authenticated gcloud, and GCP prerequisites in docs/DEPLOYMENT.md.'
  exit 0
fi
cd "$(dirname "$0")/.."
: "${PROJECT_ID:?Set PROJECT_ID to your billed Google Cloud project}"
: "${REGION:?Set REGION, e.g. us-central1}"
: "${SERVICE_ACCOUNT:?Set the dedicated runtime SERVICE_ACCOUNT email}"
SERVICE_NAME="${SERVICE_NAME:-food-access}"
REPOSITORY="${REPOSITORY:-food-access}"
for command in node npm docker gcloud; do command -v "$command" >/dev/null || { echo "Install $command first" >&2; exit 1; }; done
node scripts/validate-data.mjs
docker info >/dev/null
gcloud firestore databases describe --database='(default)' --project="$PROJECT_ID" --format='value(type)' | grep -q FIRESTORE_NATIVE || { echo 'Create a Firestore Native database first; see docs/DEPLOYMENT.md' >&2; exit 1; }
VERSION="$(node -e 'console.log(JSON.parse(require("fs").readFileSync("public/data/manifest.json")).datasetVersion)')"
TAG="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE_NAME}:${VERSION}-$(date -u +%Y%m%d%H%M%S)"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
# Local context deliberately contains only minimal permitted processed assets, never raw data.
docker build --platform linux/amd64 --tag "$TAG" .
bash scripts/test-container.sh "$TAG"
docker push "$TAG"
DIGEST="$(docker inspect --format='{{index .RepoDigests 0}}' "$TAG")"
ACCESS_FLAG=--no-allow-unauthenticated
if [[ "${PUBLIC_DEMO:-false}" == true ]]; then ACCESS_FLAG=--allow-unauthenticated; fi
gcloud run deploy "$SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" \
  --image="$DIGEST" --service-account="$SERVICE_ACCOUNT" "$ACCESS_FLAG" \
  --port=8080 --memory=1Gi --cpu=1 --concurrency=40 --timeout=60 \
  --min-instances=0 --max-instances=3 --set-env-vars="GOOGLE_CLOUD_PROJECT=$PROJECT_ID,STORAGE_ADAPTER=firestore" \
  --quiet
URL="$(gcloud run services describe "$SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --format='value(status.url)')"
if [[ "${PUBLIC_DEMO:-false}" == true ]]; then bash scripts/smoke-test.sh "$URL"; else echo 'Service is private. Use gcloud run services proxy to run the smoke test.'; fi
echo "Deployed image: $DIGEST"
echo "Service URL: $URL"
