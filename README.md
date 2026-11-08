# FARA · Food Access Resource Allocation

FARA (Food Access Resource Allocation) helps Central Florida food banks and pantry planners choose where to investigate a mobile pantry event. Planners can inspect tract-level indicators, compare locations, set a radius and capacity, record local objections, save a proposal, and collect anonymous community feedback. Scoring is deterministic; the application has no generative AI functionality. FARA is an independent tool, not an official DataKind product.

The local pipeline joins **490 census tracts** in Lake, Orange, Osceola and Seminole counties, with 488 eligible for scoring and 1,694 retailer points. The data does not describe existing pantry services. See [verification](docs/VERIFICATION.md) for test results, coverage, and deployment status. Cloud deployment is pending account setup.

The **Resources** page at `/resources` brings together food-program guidance, referral tools, and Central Florida organizations for nonprofit staff. The directory identifies publishers, service areas, and practical uses, and records when the links were reviewed. The [resource curation notes](docs/resources.md) record sources and maintenance guidance. These links do not add pantry locations or service-coverage data to the planning map.

![FARA desktop planning workspace](docs/screenshots/planner-desktop.png)

[Phone](docs/screenshots/planner-phone.png), [tablet](docs/screenshots/planner-tablet.png), and [wide desktop](docs/screenshots/planner-wide.png) screenshots were captured in Chromium. Regenerate them with `npm run test:e2e`.

```text
Local Beacon/public inputs ── uv + Pandas/DuckDB + spatial validation ── public/data/
                                                                         │ local Docker build
Browser ── Next.js App Router / one Cloud Run container ── static map assets
                          │ server-only Admin SDK / ADC
                     Firestore Native
                plans + creator hashes + surveys
```

## Prerequisites

Use macOS or Linux, or **Windows with WSL2 Ubuntu**. Run all shell, uv, npm and Google Cloud commands inside WSL; enable Docker Desktop’s WSL integration and keep the checkout in the Linux filesystem. Native PowerShell deployment scripts are not provided.

| Tool             | Supported / purpose                                                                                                                                                        | Install                                                                    |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Node.js          | 24.15+ LTS recommended; supported ranges are declared in `package.json`. Production uses Node 24. Host checks also ran on Node 26, with an emulator-CLI dependency warning | [Node](https://nodejs.org/en/download)                                     |
| npm              | 10+; use the committed lockfile and `npm ci`                                                                                                                               | Included with Node                                                         |
| Python           | ≥3.12,<3.14; tested 3.12.14                                                                                                                                                | Managed by uv                                                              |
| uv               | Tested 0.13.7; installs Python/dependencies as needed                                                                                                                      | [uv installation](https://docs.astral.sh/uv/getting-started/installation/) |
| Git              | Source only; raw and generated data stay ignored                                                                                                                           | [Git](https://git-scm.com/downloads)                                       |
| Docker           | Needed for production builds; optional for local JSON development. Also provides a tested emulator path without installing Java                                            | [Docker](https://docs.docker.com/get-started/get-docker/)                  |
| Google Cloud CLI | Deployment only, with a billed project and permissions                                                                                                                     | [gcloud](https://cloud.google.com/sdk/docs/install)                        |

The optional npm Firestore Emulator command needs a working Java runtime supported by Firebase CLI (Java 21+). The Docker emulator instructions below avoid that prerequisite.

## Repository and inputs

```text
src/app/                 Pages and thin Node route-handler exports
src/features/            Map, planner, anonymous survey and creator view
src/components/          Shared navigation and shadcn-style Radix button primitive
src/lib/domain/          Pure typed schemas, scoring, Haversine and ranking
src/lib/server/          Validated HTTP boundaries, creator auth and aggregation
src/lib/storage/         Firestore production adapter / explicit local JSON adapter
analysis/src/            Source-specific Python loaders, pipeline and notebook execution
analysis/tests/          Small synthetic fixtures, property and pipeline tests
analysis/notebooks/      Six executed source EDAs, aggregate-only outputs
data/raw/                LOCAL ONLY, immutable original inputs; ignored by Git and Docker
data/processed/          Optional local intermediates; ignored, never required at runtime
public/data/             Canonical minimized web assets; ignored by Git, bundled by Docker
references/brand/        Supplied Beacon brand guide; reference only, not in image
tests/                   Vitest / React Testing Library / Firestore integration
e2e/                     Browser journey, viewport, accessibility and tile-failure tests
scripts/                 Checks, preflight, local Docker build/deploy, smoke tests
docs/                    Data, design, deployment and verification
```

Place the original files in `data/raw/` and the guide in `references/brand/`. The pipeline requires these exact discovered filenames:

```text
ACSST5Y2024.S1701-Data.csv
ACSST5Y2024.S2201-Data.csv
SRAM General Tract Characteristics Data.csv
SRAM Straight Line Distance Data.csv
SNAP_Retailer_Location_data.csv
cb_2020_12_tract_500k.zip
```

Keep the provided metadata, lookup, and notes files beside them; they support the [data audit](docs/data_audit.md). Other supplied files are inventoried but unused.

Git excludes `data/`, `references/`, generated web assets, the original build brief, environment files, credentials, local stores, caches, and machine-specific editor and assistant files. `.env.example` is the only environment file intended for Git. The committed `docs/` files describe the product, design tokens, data methods, and operating procedures. `.dockerignore` separately restricts the build context to application code and the five permitted processed assets.

The source bundle had no tract geometry. The official supplemental file was downloaded locally with:

```sh
mkdir -p data/raw
curl --fail --location --retry 2 \
  https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_12_tract_500k.zip \
  --output data/raw/cb_2020_12_tract_500k.zip
```

The [publication basis](docs/LICENSING.md) covers published U.S. federal statistical aggregates and Census boundaries, with attribution. It does not grant rights to redistribute LandScan rasters or proprietary fonts. If additional source restrictions forbid derived publication, stop deployment. Raw files must never enter Git, a Docker build context, or image layers.

## First launch

From this repository root:

```sh
npm ci
cp .env.example .env.local
cd analysis
uv sync --locked
uv run python src/pipeline.py
cd ..
npm run data:validate
npm run dev
```

Open **http://localhost:3000**. Expected output includes `Validated 490 observed tracts` during validation and Next’s `Ready` message at startup. The local map uses official polygons and an external no-key OpenFreeMap basemap. If tiles fail, the labeled local boundary fallback remains available. Use the area list and coordinate fields for keyboard access.

In **Pantry planner**, choose a row under **Suggested areas**, review **Area details**, enter the proposal in **Event settings**, and use **Compare locations** to consider alternatives. **Show event overlay** turns the proposed marker and radius on or off; it does not show existing pantry coverage, which is unknown. The legend, selected-area summary, and event assumptions sit below the map. On phones, switch between **Areas / Map / Plan**, or use **View area details** beneath the selected map area.

`npm run dev` prepares the licensed same-origin MapLibre worker automatically. The pipeline reports counties, row counts, version, and missing values. Missing or malformed inputs stop processing with an error. Synthetic fixtures are used only in tests; the application requires the processed source data.

To reproduce the source analysis:

```sh
cd analysis
uv run python src/eda.py
cd ..
```

Each notebook executes top-to-bottom in a fresh uv Python kernel. Outputs contain aggregate descriptions/figures, not raw records. The guide’s fonts, sizes, palette and component rules are recorded in [BRAND.md](docs/BRAND.md). Local Avenir is used when available; licensed webfont files are needed for identical fonts on all devices.

## Local persistence and the full share flow

The copied `.env.local` **explicitly selects development JSON storage** at `.local/plans.json`. Save a plan, copy the public read-only URL, open it in an incognito browser, and send the four-choice survey. Open the separate private creator link to see n and protected aggregate results. The token is retained in the creator’s browser, and the private link carries it only in a URL fragment; it is exchanged for an HttpOnly SameSite Strict session cookie and removed from the address bar. No token appears in public JSON. Keep the private link; lost creator access cannot be recovered from the public URL.

JSON is for one local server process only. It is not cross-process safe and is **refused in production**. To reset development data, stop your server and delete only `.local/plans.json`; do not delete supplied data. Test data uses a separate `.local/e2e-plans.json` file.

For the preferred Firestore Emulator adapter, start the tested Docker runtime in a second terminal:

```sh
docker run --rm --name fara-firestore-emulator \
  -p 127.0.0.1:8080:8080 \
  gcr.io/google.com/cloudsdktool/google-cloud-cli:emulators \
  gcloud emulators firestore start \
  --host-port=0.0.0.0:8080 --project=demo-food-access --quiet
```

If a container with that name already exists, use `docker start fara-firestore-emulator`; stop it with `docker stop fara-firestore-emulator`. This emulator is ephemeral and unauthenticated: keep its port on loopback. Set these **server-only** values in `.env.local`, then restart Next:

```dotenv
STORAGE_ADAPTER=firestore
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
GOOGLE_CLOUD_PROJECT=demo-food-access
```

Alternatively, with Java installed, `npm run emulator` uses the committed Firebase config and exposes its UI at http://localhost:4000. That Java-based path requires your runtime; the Docker emulator path was exercised here. The Firebase Admin SDK is server-only and never exposed to the browser. Public Firestore client rules deny all direct reads/writes; the application authorizes through server tokens and production IAM.

## Environment variables

| Variable                         | Purpose / safe example                                           | Local                                                              | Production                                   | Visibility            |
| -------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------- | --------------------- |
| `STORAGE_ADAPTER`                | Explicit `json` for development, `firestore` for emulator/cloud  | Set in `.env.local`                                                | `firestore`; JSON refused                    | Server                |
| `LOCAL_STORE_PATH`               | `.local/plans.json`                                              | JSON only                                                          | Forbidden mode                               | Server                |
| `GOOGLE_CLOUD_PROJECT`           | `demo-food-access` locally; your actual project in cloud         | Required for emulator                                              | Required for Firestore                       | Server                |
| `FIRESTORE_EMULATOR_HOST`        | `127.0.0.1:8080`, no protocol                                    | Emulator only                                                      | Must be absent; production refuses it        | Server                |
| `NEXT_PUBLIC_MAP_STYLE`          | `https://tiles.openfreemap.org/styles/positron`                  | Optional default                                                   | Build-time Docker argument; default provided | Public                |
| `PORT`                           | Next dev defaults 3000; container 8080                           | Optional                                                           | Cloud Run / Docker                           | Server                |
| `HOSTNAME`                       | `0.0.0.0`                                                        | Dev script supplies host                                           | Docker supplies host                         | Server                |
| `GOOGLE_APPLICATION_CREDENTIALS` | Optional external ADC file path for local real-cloud development | Avoid downloaded keys; use `gcloud auth application-default login` | Use attached identity, not a key file        | Server, never bundled |

`NEXT_PUBLIC_` values are included in the public client build and must never contain secrets. The custom style’s tile/glyph hosts may need an explicit CSP allowlist change in `next.config.ts`. Docker does not copy `.env.local`; runtime Firestore settings are provided separately. Production uses Google ADC from a dedicated Cloud Run service account.

## Tests and required gates

With dependencies installed and the emulator running:

```sh
npm run lint
npm run format:check
npm run typecheck
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=demo-food-access npm run test:coverage
cd analysis
uv run ruff check src tests
uv run ruff format --check src tests
uv run mypy
uv run pytest
cd ..
npx playwright install chromium
npm run test:e2e
npm run data:validate
npm run build
```

To exercise the browser journey against Firestore instead of the explicit JSON test adapter:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 E2E_STORAGE_ADAPTER=firestore npm run test:e2e
```

The single orchestrator runs those quality checks, coverage, production build and browser tests, stopping at the first failure:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 GOOGLE_CLOUD_PROJECT=demo-food-access npm run check
```

Do not leave a separate `npm run dev` process running when Playwright starts its own server at port 3100; Next protects its dev build directory with a lock. Production uses the supported webpack build path after a host Turbopack worker-port error was observed. Tests run independently of raw datasets except browser/build checks, which require the local processed assets. Firestore integration tests explicitly skip without an emulator; such a run does not verify that adapter or satisfy full coverage.

`npm run typecheck` generates Next.js route declarations before running TypeScript. The generated `next-env.d.ts` stays ignored, so CI and new checkouts do not rely on a developer’s build directory.

Vitest requires **100% statements, branches, lines and functions** across authored `src/` and JavaScript build scripts. Python requires **100% branch-inclusive coverage** across `analysis/src/`. No application code is excluded to make a percentage pass. Only five route files consisting solely of framework exports/runtime declarations are excluded; the handlers they export are tested. Generated vendor files, dependencies, Next output and config scaffolding are outside authored application scope. See [VERIFICATION.md](docs/VERIFICATION.md) for measured results, any remaining gaps, and a clear pass/fail statement.

Reports: `coverage/index.html`, `coverage/coverage-summary.json`, `analysis/htmlcov/index.html`, `analysis/coverage.json`, and Playwright `test-results/` traces on failure. Format with `npm run format` and `cd analysis && uv run ruff format src tests`. Mypy remains strict for authored code; calls into untyped external nbformat are declared as that library boundary.

GitHub Actions runs lint, type checks, unit tests, Python checks, and coverage using synthetic fixtures and a Firestore Emulator. Its repository token has read-only access. Production builds and browser acceptance checks run locally on the machine holding the processed data; CI does not upload datasets or publish images.

## Build the exact production image locally

```sh
docker build --platform linux/amd64 -t food-access:local .
bash scripts/test-container.sh food-access:local
```

The automated test starts the standalone image, checks rendered pages, health, data manifest, area data and map geometry, checks forbidden final-image paths, and verifies writes fail closed without Firestore configuration. It binds only to loopback and removes its own test container. The Docker context is an allowlist: no raw data, notebooks, reference files, caches or credentials. `public/data/` is deliberately allowed even though Git ignores it. Production binds to `0.0.0.0:$PORT`, includes `public/`, MapLibre worker modules and `.next/static`, and runs as a non-root user.

## Deploy to Google Cloud

Follow **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for first-time billing, APIs, Firestore, IAM and registry setup. After those user-account prerequisites, invoke:

```sh
PROJECT_ID=your-project-id \
REGION=us-central1 \
SERVICE_ACCOUNT=food-access-runtime@your-project-id.iam.gserviceaccount.com \
PUBLIC_ACCESS=true \
bash scripts/deploy-gcp.sh
```

`PUBLIC_ACCESS=true` allows unauthenticated access; omit it to deploy a private service. The script validates local assets, builds Docker **locally**, tests that image, pushes to Artifact Registry, resolves its digest, and deploys that exact digest to one Cloud Run service. No Cloud Storage, BigQuery, Python API, remote source build, or GitHub data upload is involved. Deployment requires your authenticated cloud account and billed project; the checked-in script is not evidence that a live URL exists. Custom domains are outside the MVP.

## Troubleshooting

| Symptom                                        | Action                                                                                                                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Missing source / wrong filename                | Compare the required list above with `data/raw/`. Run the pipeline; it names the missing file. Do not rename unrelated tables to satisfy it                       |
| Invalid GEOIDs, mismatched joins or geometries | Stop processing, inspect the source vintage and metadata; no silent join loss or synthetic replacement is permitted                                               |
| uv/Python mismatch                             | Use `cd analysis && uv sync --locked`; project supports 3.12–3.13, not 3.14                                                                                       |
| Node or Firebase CLI engine warning            | Use Node 24 LTS. Use the tested Docker emulator path if local Java/CLI is unavailable                                                                             |
| Save says persistence unavailable              | Select explicit local JSON or start/configure the emulator. In cloud, verify project, attached service account and `roles/datastore.user`                         |
| Firestore 403 / no ADC                         | Local cloud: `gcloud auth application-default login`; production: attach the documented runtime identity. Never put Admin credentials in `NEXT_PUBLIC_` variables |
| Basemap/tiles blocked                          | Use the automatic local Census boundary fallback and area list. Preserve attribution; allow the chosen provider in CSP                                            |
| Port 3000/3100 busy or Next dev lock           | Stop your other Next process or use `npm run dev -- --port 3001`. Stop dev before Playwright. Emulator owns 8080; container tests choose a random loopback port   |
| Production missing map data                    | Re-run the local pipeline/validation and local Docker build. Git checkout alone has no generated data                                                             |
| Stale generated assets                         | Re-run the pipeline. This refreshes packaging metadata, not source vintages; check whether newer actual source data is needed                                     |
| Cloud Run startup failure                      | Check `PORT=8080`, standalone file copies and logs using deployment-guide commands                                                                                |
| Survey closed / duplicate browser response     | Creator can reopen it. An existing browser cookie prevents a second submission from that browser; this is a best-effort guard                                     |
| Creator results show suppression               | Expected when n<5 or any nonzero cell<5. No breakdown is exposed until disclosure rules are satisfied                                                             |

Read the [data audit](docs/data_audit.md), [dictionary](docs/data_dictionary.md), [transformations](docs/transformations.md), [methodology](docs/methodology.md), [limitations](docs/limitations.md), and [operational priorities](docs/next_steps.md). No transit/travel time, actual pantry utilization, or causal impact is modeled.
