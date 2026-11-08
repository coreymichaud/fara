# One local image → Artifact Registry → Cloud Run + Firestore

Use the data-holding local checkout. A fresh GitHub checkout does **not** contain raw or generated data. This guide never uploads source data to GitHub and does not use `gcloud run deploy --source`. All commands below use Bash on macOS/Linux or WSL2. Use [README](../README.md) to install dependencies and process data first.

Local processing, Next production build, linux/amd64 Docker build and container smoke checks were exercised. Cloud-account operations below require your actual project and credentials; see [VERIFICATION](VERIFICATION.md) for current live-deployment status. Do not mistake documented commands for a completed cloud deployment.

## 1. Choose and authenticate a project

Install [gcloud](https://cloud.google.com/sdk/docs/install), Docker and Node 24 LTS. Use an existing billed project or create one in the Cloud console. Project IDs are globally unique; replace all safe placeholders consistently. Billing must be enabled by an authorized billing-account user. Cloud Run, registry storage and Firestore can incur charges; free tiers and quotas vary. Limit instances and remove resources when they are no longer needed.

```sh
export PROJECT_ID=your-project-id
export REGION=us-central1
export SERVICE_NAME=food-access
export REPOSITORY=food-access
export SERVICE_ACCOUNT="food-access-runtime@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud auth login
gcloud config set project "$PROJECT_ID"
gcloud auth list --filter=status:ACTIVE --format='value(account)'
gcloud projects describe "$PROJECT_ID" --format='value(projectId)'
gcloud billing projects describe "$PROJECT_ID"
```

If you are creating a new project rather than selecting an existing billed one, authenticate first, choose a unique project ID above, and have the project/billing owner run:

```sh
gcloud projects create "$PROJECT_ID" --name='FARA'
gcloud billing accounts list
export BILLING_ACCOUNT_ID=your-billing-account-id
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT_ID"
gcloud config set project "$PROJECT_ID"
gcloud billing projects describe "$PROJECT_ID"
```

Replace the billing-account placeholder with an account you are authorized to charge. If project creation or billing linkage is restricted by your organization, its administrator must perform that step; deploying code cannot supply those permissions.

Choose a region supported by both [Cloud Run](https://cloud.google.com/run/docs/locations) and [Firestore](https://cloud.google.com/firestore/native/docs/locations). `us-central1` is the example for both; choose before creating the database. Your deployer needs access to this project, not just a Google login.

## 2. Project-owner setup: APIs and database

The project owner or a user with Service Usage Admin, database creation, service-account creation/IAM and registry administration permissions performs this initial setup. Do not give the runtime service account Owner or Editor. Cloud Build is unnecessary because the build is local.

```sh
gcloud services enable \
  run.googleapis.com artifactregistry.googleapis.com firestore.googleapis.com \
  iam.googleapis.com serviceusage.googleapis.com \
  --project="$PROJECT_ID"

gcloud firestore databases list --project="$PROJECT_ID"
```

If `(default)` does not already exist, create **Standard edition, Native mode**:

```sh
gcloud firestore databases create \
  --database='(default)' --location="$REGION" --type=firestore-native \
  --edition=standard --delete-protection --project="$PROJECT_ID"

gcloud firestore databases describe --database='(default)' \
  --project="$PROJECT_ID" --format='yaml(name,locationId,type,deleteProtectionState)'
```

The location is a consequential, effectively permanent choice for the database; a later move requires migration rather than editing the location. Do not recreate an existing database. Emulator data is separate and never migrated implicitly. The app uses `(default)`, so a named alternate database alone is insufficient. The server Admin SDK uses IAM, not public web-client security rules. The checked-in `firestore.rules` denies direct client access, but those rules do not authorize the Admin SDK.

## 3. Dedicated runtime identity and deployer permissions

```sh
gcloud iam service-accounts create food-access-runtime \
  --display-name='Food access Cloud Run runtime' --project="$PROJECT_ID"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$SERVICE_ACCOUNT" --role=roles/datastore.user
```

`roles/datastore.user` is the narrow standard data-read/write role needed by this implementation’s document get/list/create/update operations and Firestore transactions; it also includes some permissions (such as data deletion) not exposed by this app. A custom role can narrow that further after IAM review. It does not grant project administration. Prefer database-scoped IAM if your organization’s setup supports it; the commands here grant the standard role in this dedicated project. No storage, BigQuery, AI, or service-account-key permissions are needed at runtime.

The deployer separately needs Cloud Run Admin (`roles/run.admin`, including service IAM changes for public access), Artifact Registry Writer on the repository, and Service Account User on this specific runtime account. Initial API/repository/database/IAM creation requires additional owner-managed roles. For a separate deployer, the owner can use:

```sh
export DEPLOYER_EMAIL=your-google-account@example.com
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="user:$DEPLOYER_EMAIL" --role=roles/run.admin
gcloud iam service-accounts add-iam-policy-binding "$SERVICE_ACCOUNT" \
  --member="user:$DEPLOYER_EMAIL" --role=roles/iam.serviceAccountUser \
  --project="$PROJECT_ID"
```

Use Google-managed attached identity and ADC. **Do not download a service-account JSON key.** Local use of a real cloud backend can use `gcloud auth application-default login`; that is distinct from `gcloud auth login` used to deploy. Never copy ADC files into the repository or image.

## 4. Create the Docker registry

Run once, unless the repository already exists:

```sh
gcloud artifacts repositories describe "$REPOSITORY" \
  --location="$REGION" --project="$PROJECT_ID"
# Only if it does not exist:
gcloud artifacts repositories create "$REPOSITORY" \
  --repository-format=docker --location="$REGION" \
  --description='Locally built food-access application images' --project="$PROJECT_ID"

gcloud artifacts repositories add-iam-policy-binding "$REPOSITORY" \
  --location="$REGION" --project="$PROJECT_ID" \
  --member="user:$DEPLOYER_EMAIL" --role=roles/artifactregistry.writer

gcloud auth configure-docker "${REGION}-docker.pkg.dev"
```

If the same project owner deploys, set `DEPLOYER_EMAIL` to that authenticated account. Cross-project registry access would need additional permissions and is outside this path.

## 5. Rebuild and validate the local assets

From the checkout containing the locally supplied source files:

```sh
npm ci
cd analysis
uv sync --locked
uv run python src/pipeline.py
cd ..
npm run data:validate
git check-ignore data/raw/SNAP_Retailer_Location_data.csv public/data/manifest.json
git ls-files data/raw data/processed public/data
```

The last command must print no tracked source/generated datasets. `.gitignore` and `.dockerignore` are independent. Docker’s allowlist permits exactly the minimized web assets, source code, package/config files and two build helpers. It does not send raw data, notebooks, reference PDFs, `.env*`, caches or credential JSON to the builder. The manifest contains hashes/provenance, not raw source contents. Publication is based on [LICENSING](LICENSING.md); stop if additional terms forbid derived assets.

The preflight rejects missing/empty/hash-mismatched files, incompatible schemas/modes, invalid coordinates/counts/percentages, geometry-key mismatches, or generation timestamps over 30 days old/in the future. Reprocessing does not imply the old 2020/2024/2025 indicators became current.

## 6. Build, test, push and deploy the exact local image

The single repeatable entry point is:

```sh
PROJECT_ID="$PROJECT_ID" REGION="$REGION" \
SERVICE_ACCOUNT="$SERVICE_ACCOUNT" SERVICE_NAME="$SERVICE_NAME" \
REPOSITORY="$REPOSITORY" PUBLIC_ACCESS=true \
bash scripts/deploy-gcp.sh
```

`PUBLIC_ACCESS=true` allows unauthenticated access to the service. Without it, the script deploys privately. An organization policy may prohibit public invokers; do not work around that policy. Use an authenticated Cloud Run proxy for verification instead.

The script’s actual sequence is: validate assets → check Docker/Firestore Native → configure registry auth → `docker build --platform linux/amd64` locally → run `test-container.sh` → push → resolve repository digest → `gcloud run deploy --image=<digest>` with the dedicated account. It sets `GOOGLE_CLOUD_PROJECT` and `STORAGE_ADAPTER=firestore`; it never supplies emulator or JSON storage settings. The service uses port 8080, 1 GiB memory, 1 CPU, concurrency 40, 60-second request timeout, and 0–3 instances. Review these limits for real usage.

For a local image-only proof before any push:

```sh
docker build --platform linux/amd64 -t food-access:local .
bash scripts/test-container.sh food-access:local
```

The final image has standalone Next output, `.next/static`, `public/data`, and generated `public/vendor/maplibre` modules/license. It runs as a non-root user and binds `0.0.0.0:$PORT`. Missing Firestore configuration makes writes fail closed; there is no production filesystem fallback. Static exploration still works. Google ADC is acquired at runtime from the attached identity.

`NEXT_PUBLIC_MAP_STYLE` is a **build-time** public variable; to change it, build using `--build-arg NEXT_PUBLIC_MAP_STYLE=https://your-approved-provider/style.json` and adjust CSP if its hosts differ. Setting it only at runtime does not rewrite the client bundle. Runtime `GOOGLE_CLOUD_PROJECT` and storage variables do not contain secrets. `.env.local` is not copied into Docker.

No `gcloud run deploy --source .` is used: that remote build would upload a context governed by `.gcloudignore` and would not automatically obtain these Git-ignored local assets. Adding remote builds later requires a separately reviewed data-packaging/upload policy.

## 7. Verify the deployed service and persistence

```sh
URL="$(gcloud run services describe "$SERVICE_NAME" --project="$PROJECT_ID" \
  --region="$REGION" --format='value(status.url)')"
printf '%s\n' "$URL"
bash scripts/smoke-test.sh "$URL"

gcloud run services describe "$SERVICE_NAME" --project="$PROJECT_ID" \
  --region="$REGION" --format='yaml(status.url,status.latestReadyRevisionName,spec.template.spec.serviceAccountName)'
```

The script smoke test verifies the homepage, planner, Resources, methodology/about, health, manifest, area data and map geometry agreement. Health reports **configuration**, not a successful Firestore round-trip. Manually prove the mutable workflow:

1. Open the URL on a laptop and phone. Select a tract, change radius/capacity and compare an alternative.
2. Save a plan. Keep its separate private creator link safe; do not put it in public documents or channels.
3. Open only the public URL in incognito/another browser, submit all four fixed-choice answers, and verify success.
4. Confirm `/api/plans/PLAN_ID/manage` is 403 in the visitor context. It must never return raw responses or hashes.
5. Open the creator link, verify n increments and sparse breakdowns are withheld, then close the survey and refresh the public page.
6. Redeploy and reopen the same public URL in another browser. The plan must survive because Firestore, not the container filesystem, holds it.

For a private service, run `gcloud run services proxy "$SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION" --port=8090` and point the smoke test at `http://localhost:8090`. That proxy check is authenticated and is not proof of public accessibility.

## 8. Diagnose, roll back, and clean up

```sh
gcloud run services logs read "$SERVICE_NAME" --project="$PROJECT_ID" \
  --region="$REGION" --limit=50
gcloud run revisions list --service="$SERVICE_NAME" \
  --project="$PROJECT_ID" --region="$REGION"

# Choose an actual previous ready revision from the list; do not paste this placeholder unchanged.
export PREVIOUS_REVISION=food-access-previous-ready-revision
gcloud run services update-traffic "$SERVICE_NAME" \
  --to-revisions="${PREVIOUS_REVISION}=100" --project="$PROJECT_ID" --region="$REGION"
```

A rollback changes serving image/code, not saved Firestore data. After a fix, rerun the same deploy script; it makes a new timestamped image tag and deploys its exact digest. Keep schema changes backwards compatible with saved snapshots.

- **Cloud Run 403:** verify public-invoker policy/organization rules; authenticated access is distinct from public service access.
- **Firestore 403:** verify runtime account on the active revision, the project ID, database mode and the account’s Datastore User binding. Deployer permissions do not automatically apply to the runtime.
- **Missing ADC:** attach the service account; do not patch in a key file. Emulator variables must be absent in production.
- **Container fails to start:** inspect the startup log, port 8080, `HOSTNAME`, standalone copy steps and manifest. `test-container.sh` should reproduce missing-file issues locally.
- **Tile failure:** local Census boundaries/list remain available. Check network/CSP/provider terms before changing the basemap.
- **Survey 409/429:** survey may be closed, browser already submitted, response cap reached, or per-plan minute limit triggered. These failures are visible and are not fake success.

When retiring the service, export needed decision briefs first. Resource deletion is destructive. Only run these cleanup commands when you intend to remove the service/images:

```sh
gcloud run services delete "$SERVICE_NAME" --project="$PROJECT_ID" --region="$REGION"
gcloud artifacts repositories delete "$REPOSITORY" --project="$PROJECT_ID" --location="$REGION"
```

These commands do not delete Firestore; database deletion is intentionally not automated, and deletion protection was enabled above. Review Cloud Logging retention, Firestore data retention and registry cleanup to control privacy and costs. No domain purchase, Cloud Domains or custom DNS is required.

## Before real-world use

Review data licensing with the source providers, Avenir webfont rights, public-note handling, anonymous survey abuse protection and privacy/log retention. Conduct assistive-technology and community usability testing, validate venues and current services, monitor errors/costs, add operational alerts, and define retention/deletion. Passing an automated browser audit is not a claim of full WCAG compliance or production readiness.
