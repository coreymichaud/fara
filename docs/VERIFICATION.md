# Verification ledger

**FARA (Food Access Resource Allocation)** verified locally on **7 November 2026, America/New_York**. This records executed checks, not an assertion of production readiness or a live cloud deployment.

## Actual check results

| Check                                                           | Result                                                                                                                                            |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entire brief / supplied source inventory / brand PDF inspection | Completed; rendered brand pages inspected                                                                                                         |
| Local uv pipeline / processed-asset validation                  | Pass: observed mode, 490 tracts, 488 eligible, 1,694 retailer points; version `5d7db3d37ab5`                                                      |
| Six source EDA notebooks                                        | Executed successfully in fresh uv kernels; aggregate-only outputs retained                                                                        |
| ESLint / Prettier / strict TypeScript                           | Pass                                                                                                                                              |
| Python Ruff lint / Ruff format / strict mypy                    | Pass                                                                                                                                              |
| Vitest + React Testing Library + Firestore Emulator             | **79 tests passed** across 12 test files                                                                                                          |
| V8 statement coverage                                           | **100%: 738 / 738**                                                                                                                               |
| V8 branch coverage                                              | **100%: 507 / 507**                                                                                                                               |
| V8 function coverage                                            | **100%: 255 / 255**                                                                                                                               |
| V8 line coverage                                                | **100%: 659 / 659**                                                                                                                               |
| Pytest + Hypothesis + pytest-cov                                | **19 tests passed**                                                                                                                               |
| Python statement / line coverage                                | **100%: 214 / 214**, zero excluded/missing lines                                                                                                  |
| Python branch coverage                                          | **100%: 72 / 72**, zero partial/missing branches                                                                                                  |
| Next production build                                           | Pass, standalone output with supported webpack builder                                                                                            |
| Full browser acceptance suite                                   | **3 passed**, including the complete cross-browser share/survey/creator journey against the real Firestore Emulator                               |
| Viewports                                                       | 390×844, 820×1180, 1440×1080, 1920×1080; no horizontal page overflow in tested states                                                             |
| Automated accessibility                                         | Zero axe WCAG 2A/AA/2.1AA violations in the tested desktop workspace; keyboard chart tooltip and labeled forms also exercised                     |
| Basemap failure                                                 | Real local Census polygon fallback, selection and planning tested; retailer overlay also tested at its integration boundary                       |
| Local production Docker build                                   | Pass, `linux/amd64`, Node 24, non-root standalone image                                                                                           |
| Final image/container smoke                                     | Pass: homepage, methodology/about, health, manifest, area JSON and map GeoJSON; forbidden raw/intermediate/notebook/reference/secret paths absent |
| Production persistence failure                                  | Pass: writes return 503 and a visible error when Firestore is unconfigured; no filesystem fallback                                                |
| Git exclusions                                                  | Verified raw/generated datasets and `.env.local` ignored; no tracked raw/processed web data                                                       |
| Shell scripts                                                   | `bash -n` passes; help paths and the actual local image smoke workflow exercised                                                                  |
| Single check command                                            | `npm run check` completed successfully with emulator variables and `E2E_STORAGE_ADAPTER=firestore`                                                |

A source-only checkout without raw datasets, generated web data, local environment files, or supplied reference inputs also passed ESLint, Prettier, Next route-type generation, strict TypeScript, and all 79 application tests at 100% coverage using an isolated Firestore Emulator. This verifies the data-independent CI path; production builds still require the locally processed web assets.

The JavaScript coverage scope is all authored `src/**/*.{ts,tsx}` and `scripts/*.mjs`. Only the five route files consisting solely of framework exports/runtime declarations are excluded; their actual handler implementations are covered. No application logic or uncovered branches are marked coverage-exempt, and thresholds remain 100. V8 reports the empty/type declaration storage module without executable statements as an empty file. Framework configuration, generated vendor modules, Next build output and external dependencies are outside application-source coverage.

Python measures all three authored modules in `analysis/src/`: source loaders, pipeline and EDA generator. Generated notebook cells are executed separately and are not independently branch-instrumented. Shell/deployment operations are verified by executed behavior/syntax checks rather than an invented shell coverage percentage. External cloud IAM, real-world attendance, accessibility compliance and data validity beyond the documented checks are not implied by code coverage.

Reproduce the complete local suite with the Docker emulator running:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
GOOGLE_CLOUD_PROJECT=demo-food-access \
E2E_STORAGE_ADAPTER=firestore npm run check
```

After an EDA-only plot-unit clarification, Ruff, mypy, all 19 Python tests/100% coverage, and all six notebook executions were rechecked. No web application behavior changed in that clarification.

## Production image proof

Final local image tag: `food-access:local`.

Final local image identity: `sha256:b21441557a73f2f49645e71db54d4e1e8330351741132224f860bb88a13d9a3d` (`linux/amd64`). This is a local image identity, **not** proof of an Artifact Registry push or Cloud Run revision.

```sh
docker build --platform linux/amd64 -t food-access:local .
bash scripts/test-container.sh food-access:local
```

The final smoke output was:

```text
Smoke passed: homepage, methodology, about, health, manifest, 490 areas and map geometry
No raw data, source notebooks, brand PDF or local secrets in final image
Production writes fail closed without Firestore configuration.
```

The independent Docker allowlist excludes the original source files from every build-context copy. The final image bundles only the five minimized, hash-validated web assets (about 832 KiB on disk) and generated MapLibre worker/license assets. The public-data publication assumption is documented in [LICENSING.md](LICENSING.md): selected published federal statistical facts and Census boundaries, with source attribution; no raw LandScan/road data, private Beacon inputs, or extracted proprietary fonts. No organizer-specific redistribution license file was supplied, and no broader legal clearance is invented.

## Browser/performance evidence and limits

Actual screenshots are in [screenshots/](screenshots/). A separate browser inspection of the local production container recorded **no uncaught page errors** and confirmed the explicit unconfigured-persistence error. One unthrottled desktop lab navigation observed LCP 952 ms and CLS 0.00391. See the timestamp/environment and full measurement in [performance.json](performance.json). This is not Lighthouse, a mobile-network test, field p75 Core Web Vitals, or an INP claim. That performance sample predates the FARA naming update; the screenshots and browser acceptance checks were refreshed for the new name.

Recharts emits a zero-size warning while the mobile evidence panel is intentionally hidden by the workspace tabs. The visible chart renders and resizes correctly in the tested states. Jupyter emits a local-kernel TCP warning during execution; kernels were local and no notebook server was published. These are disclosed warnings, not hidden test failures.

The dependency audit reported **zero known production dependency vulnerabilities**. The full development-tool tree still reports **20 moderate findings**, primarily tooling/transitive dependencies; no forced breaking downgrade was applied to disguise those. OS-image CVE scanning, broad browser-engine testing, assistive-technology review and live operational monitoring were not performed. The prototype deliberately disallows search indexing and does not fabricate business structured data or canonical URLs for a domain that does not exist.

## Cloud deployment status: blocked before authentication

**No live Cloud Run URL exists from this work, and none was smoke-tested.** Artifact Registry push, cloud IAM/billing setup, live Firestore writes and persistence across a real Cloud Run redeploy have not been executed.

Observed blockers: the host has no `gcloud` command, no local Google ADC file was found, and no authenticated target project/billing identity was supplied. Integration discovery did not reveal a usable Google Cloud deployment connector. The Google CLI inside the emulator image was used only for the local emulator, not as cloud authentication.

The exact remaining account-dependent commands are in [DEPLOYMENT.md](DEPLOYMENT.md), including project/billing creation, APIs, Firestore Native location, least-privilege runtime identity, deployer permissions and registry setup. After those prerequisites:

```sh
PROJECT_ID=your-project-id REGION=us-central1 \
SERVICE_ACCOUNT=food-access-runtime@your-project-id.iam.gserviceaccount.com \
PUBLIC_DEMO=true bash scripts/deploy-gcp.sh
```

That script builds from this local data-holding checkout, tests the image, pushes to Artifact Registry and deploys the exact pushed digest. Its cloud steps require the user’s authenticated account; only its local preflight/build/smoke path is claimed as exercised. Project/billing/deploy flag syntax was checked against the official [project creation](https://docs.cloud.google.com/sdk/gcloud/reference/projects/create), [billing linkage](https://docs.cloud.google.com/sdk/gcloud/reference/billing/projects/link), [Firestore creation](https://docs.cloud.google.com/sdk/gcloud/reference/firestore/databases/create), and [Cloud Run deployment](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy) references.

PowerPoint and YouTube artifacts remain teammate tasks. The five-slide outline, two-minute click path and 80-second video shot list are complete; no deck or upload is fabricated.
