# Verification results

**FARA (Food Access Resource Allocation)** verified locally on **7 November 2026, America/New_York**. The checks below cover the local application and container. Cloud deployment is pending.

## Checks

| Check                                               | Result                                                                                                                                                                                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Specification, source inventory, and brand review   | Completed; rendered brand pages inspected                                                                                                                                                                                    |
| Local uv pipeline / processed-asset validation      | Pass: observed mode, 490 tracts, 488 eligible, 1,694 retailer points; version `5d7db3d37ab5`                                                                                                                                 |
| Six source EDA notebooks                            | Executed successfully in fresh uv kernels; aggregate-only outputs retained                                                                                                                                                   |
| ESLint / Prettier / strict TypeScript               | Pass                                                                                                                                                                                                                         |
| Python Ruff lint / Ruff format / strict mypy        | Pass                                                                                                                                                                                                                         |
| Vitest + React Testing Library + Firestore Emulator | **104 tests passed** across 14 test files                                                                                                                                                                                    |
| V8 statement coverage                               | **100%: 791 / 791**                                                                                                                                                                                                          |
| V8 branch coverage                                  | **100%: 531 / 531**                                                                                                                                                                                                          |
| V8 function coverage                                | **100%: 276 / 276**                                                                                                                                                                                                          |
| V8 line coverage                                    | **100%: 711 / 711**                                                                                                                                                                                                          |
| Pytest + Hypothesis + pytest-cov                    | **19 tests passed**                                                                                                                                                                                                          |
| Python statement / line coverage                    | **100%: 214 / 214**, zero excluded/missing lines                                                                                                                                                                             |
| Python branch coverage                              | **100%: 72 / 72**, zero partial/missing branches                                                                                                                                                                             |
| Next production build                               | Pass, standalone output with supported webpack builder                                                                                                                                                                       |
| Full browser acceptance suite                       | **5 passed**, including the share/survey/creator journey in separate Chromium contexts against the Firestore Emulator                                                                                                        |
| Viewports                                           | 390×844, 820×1180, 1440×1080, 1920×1080; no horizontal page overflow in tested states                                                                                                                                        |
| Automated accessibility                             | Zero axe WCAG 2A/AA/2.1AA violations in desktop/phone homepage, workspace, Resources, About, and Data & methods, phone area details, public phone survey, and creator results; keyboard controls and chart tooltip exercised |
| Basemap failure                                     | Real local Census polygon fallback, selection and planning tested; retailer overlay also tested at its integration boundary                                                                                                  |
| Local production Docker build                       | Pass, `linux/amd64`, Node 24, non-root standalone image                                                                                                                                                                      |
| Final image/container smoke                         | Pass: homepage, planner, methodology/about/resources, health, manifest, area JSON and map GeoJSON; forbidden raw/intermediate/notebook/reference/secret paths absent                                                         |
| Production persistence failure                      | Pass: writes return 503 and a visible error when Firestore is unconfigured; no filesystem fallback                                                                                                                           |
| Git exclusions                                      | Verified raw/generated datasets and `.env.local` ignored; no tracked raw/processed web data                                                                                                                                  |
| Shell scripts                                       | `bash -n` passes; help paths and local image smoke workflow exercised                                                                                                                                                        |
| Single check command                                | `npm run check` completed successfully with emulator variables and `E2E_STORAGE_ADAPTER=firestore`                                                                                                                           |

Unit tests use committed fixtures and controlled filesystem reads. Production builds and browser checks require the locally processed web assets; raw inputs, reference PDFs, and local environment files remain outside Git and the Docker context.

The JavaScript coverage scope is all authored `src/**/*.{ts,tsx}` and `scripts/*.mjs`. Only the five route files consisting solely of framework exports/runtime declarations are excluded; their actual handler implementations are covered. No application logic or uncovered branches are marked coverage-exempt, and thresholds remain 100. V8 reports the empty/type declaration storage module without executable statements as an empty file. Framework configuration, generated vendor modules, Next build output and external dependencies are outside application-source coverage.

Python measures all three authored modules in `analysis/src/`: source loaders, pipeline and EDA generator. Generated notebook cells are executed separately and are not independently branch-instrumented. Shell scripts are checked through syntax validation and execution of the local build and smoke workflows. External cloud IAM, real-world attendance, accessibility compliance and data validity beyond the documented checks are not implied by code coverage.

Reproduce the complete local suite with the Docker emulator running:

```sh
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
GOOGLE_CLOUD_PROJECT=demo-food-access \
E2E_STORAGE_ADAPTER=firestore npm run check
```

## Local production image

Verified local image tag: `food-access:local`.

Verified local image identity: `sha256:f9ba23ba4cbba240acf2e11b7db9746b2470ce4780f07d592a50d7751bd6ccb4` (`linux/amd64`). Artifact Registry push and Cloud Run deployment remain pending.

```sh
docker build --platform linux/amd64 -t food-access:local .
bash scripts/test-container.sh food-access:local
```

The final smoke output was:

```text
Smoke passed: homepage, planner, methodology, about, resources, health, manifest, 490 areas and map geometry
No raw data, source notebooks, brand PDF or local secrets in final image
Production writes fail closed without Firestore configuration.
```

The independent Docker allowlist excludes the original source files from every build-context copy. The final image bundles only the five minimized, hash-validated web assets (about 832 KiB on disk) and generated MapLibre worker/license assets. The public-data publication assumption is documented in [LICENSING.md](LICENSING.md): selected published federal statistical facts and Census boundaries, with source attribution; no raw LandScan/road data, private Beacon inputs, or extracted proprietary fonts. No organizer-specific redistribution license was supplied; the publication basis is limited to the public federal sources described there.

## Browser/performance evidence and limits

Homepage and planner screenshots at all four tested widths are in [screenshots/](screenshots/). Browser checks exercise the homepage → planner → home journey, links to each reference page, the phone menu, and the existing planning and sharing workflow. The study-area preview is rendered from the same local county boundaries used by the planner. A separate browser inspection of the local production container recorded **no uncaught page errors** and confirmed the explicit unconfigured-persistence error. One unthrottled desktop lab navigation observed LCP 952 ms and CLS 0.00391. See the timestamp/environment and full measurement in [performance.json](performance.json). This is not Lighthouse, a mobile-network test, field p75 Core Web Vitals, or an INP claim. That historical performance sample predates the atlas redesign. The current screenshots and acceptance tests cover the redesign; no new LCP/CLS measurement is claimed.

The evidence chart keeps an explicit height when its mobile panel is hidden. Unit and browser checks cover the hidden panel without chart-size warnings, readable axes and tooltip text, and keyboard interaction. Jupyter emits a local-kernel TCP warning during execution; kernels were local and no notebook server was published.

The last recorded dependency audit reported **zero known production dependency vulnerabilities**. The full development-tool tree still reports **20 moderate findings**, primarily tooling/transitive dependencies; the proposed forced remediation would downgrade Firebase tooling and was not applied. OS-image CVE scanning, broad browser-engine testing, assistive-technology review and live operational monitoring were not performed. Search indexing is disabled for this application. Canonical URLs and business structured data are omitted until a deployment domain and appropriate content are available.

## Cloud deployment: pending account setup

**The application has not been deployed to Cloud Run.** Artifact Registry push, cloud IAM/billing setup, live Firestore writes, and persistence across a Cloud Run redeploy remain unverified.

The verification host has no `gcloud` installation or Application Default Credentials, and no authenticated target project or billing identity was configured. The Google CLI in the emulator image was used only to run the local Firestore Emulator.

The exact remaining account-dependent commands are in [DEPLOYMENT.md](DEPLOYMENT.md), including project/billing creation, APIs, Firestore Native location, least-privilege runtime identity, deployer permissions and registry setup. After those prerequisites:

```sh
PROJECT_ID=your-project-id REGION=us-central1 \
SERVICE_ACCOUNT=food-access-runtime@your-project-id.iam.gserviceaccount.com \
PUBLIC_ACCESS=true bash scripts/deploy-gcp.sh
```

That script builds from this local data-holding checkout, tests the image, pushes to Artifact Registry and deploys the exact pushed digest. The cloud steps require an authenticated deployer account. Local preflight, build, and smoke checks passed; the cloud steps have not been run. Project/billing/deploy flag syntax was checked against the official [project creation](https://docs.cloud.google.com/sdk/gcloud/reference/projects/create), [billing linkage](https://docs.cloud.google.com/sdk/gcloud/reference/billing/projects/link), [Firestore creation](https://docs.cloud.google.com/sdk/gcloud/reference/firestore/databases/create), and [Cloud Run deployment](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy) references.

The Resources page links to official operating guidance, referral tools, and Central Florida organizations. Its source-selection and review process is documented in [resources.md](resources.md).
