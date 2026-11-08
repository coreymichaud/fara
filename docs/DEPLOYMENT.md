# Deploy from GitHub with Google Cloud Console

This workflow needs no local Docker, `gcloud`, or Cloud Shell commands. Python/uv processing remains local. Cloud Build checks out source from GitHub, downloads five processed assets from your private bucket, validates them, builds the existing Dockerfile, pushes to Artifact Registry, and deploys the pushed digest to Cloud Run.

**No cloud deployment has been performed or verified by this change.** Configure and save the trigger without running it. Its deployment step runs only when you later invoke the trigger.

## 1. Record your configuration

Select the intended billed project in [Google Cloud Console](https://console.cloud.google.com/). Use its **project ID**, not its display name or numeric project number.

| Setting                             | Value                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------- |
| Trigger / GitHub connection region  | `us-central1`                                                             |
| Cloud Run region                    | `us-central1`                                                             |
| Artifact Registry location / format | `us-central1` / Docker                                                    |
| `_DATA_BUCKET`                      | Existing private bucket **name only**, without `gs://` or `/public-data/` |
| `_AR_REPOSITORY`                    | Existing Docker repository ID; default `food-access`                      |
| `_SERVICE_NAME`                     | Cloud Run service name; default `food-access`                             |
| Build account                       | `food-access-build@PROJECT_ID.iam.gserviceaccount.com`                    |
| Runtime account                     | `food-access-runtime@PROJECT_ID.iam.gserviceaccount.com`                  |
| Firestore database                  | `(default)`, Standard edition, Native mode                                |
| GitHub source                       | Your repository and release branch, normally `main`                       |

`PROJECT_ID` in this guide means your actual project ID. Cloud Build supplies `$PROJECT_ID` and `$BUILD_ID`; do not add them as custom substitutions. Your actual bucket name, project/repository/service IDs, GitHub repository/branch, IAM bindings, and database configuration have not been inspected in your cloud account.

The build, registry, Cloud Run, both service accounts, and Firestore must share a project for this setup. The bucket may be elsewhere if its owner grants the build account access. Cross-project runtime accounts or registries require additional IAM setup. The Dockerfile's default OpenFreeMap style is used; `NEXT_PUBLIC_MAP_STYLE` is a build-time argument, not a runtime setting.

## 2. Check the bucket and GitHub contents

In **Cloud Storage → Buckets → your bucket → Objects**, check these exact keys:

```text
public-data/manifest.json
public-data/areas.json
public-data/tracts.geojson
public-data/counties.geojson
public-data/retailers.geojson
```

They must be directly inside `public-data/`, not `public-data/data/`. Keep the bucket private. The build fetches these five objects by name, without recursively copying the bucket. Upload all five from one successful pipeline run before invoking a build; avoid replacing them during a build.

The existing validator runs **before Docker** with Node 24 and built-in modules. It checks schema/method/mode, publication basis, dataset version, four asset hashes, nonempty files, area counts and unique IDs, geography, coordinates, percentages, counts, and tract/area key agreement. `generatedAt` must be no more than **30 days old** and no more than **5 minutes in the future**. Docker's `npm run build` validates again. If validation fails, rerun the local Python/uv pipeline in [README](../README.md#first-launch), then replace all five objects using the Storage Console. Do not edit the manifest timestamp or disable validation. Regeneration does not update source vintages.

Only source/configuration belongs in GitHub. `.gitignore` excludes `data/`, `public/data/`, references, environment files, credentials, and caches. Check the **actual GitHub file tree**: ignoring a file does not remove an existing tracked copy. Never upload Beacon CSVs, processed assets, `.env.local`, ADC files, or service-account keys. If credentials were previously committed, remove them from history and rotate them.

`.dockerignore` independently denies everything except application/build files and exactly the five permitted data assets. It already allows the downloaded `public/data/` files. The image bundles these assets and generated MapLibre worker/license files, without raw data or bucket credentials. `/data/*` is served to anyone allowed to access the site: a private source bucket does **not** make bundled assets private. See [LICENSING](LICENSING.md) for the limited publication basis.

## 3. One-time project setup

An authorized project administrator performs provisioning and IAM changes. Those administration privileges belong to that person, not the build/runtime accounts.

1. Check **Billing** is enabled for the selected project.
2. In **APIs & Services → Library**, enable Cloud Build, Artifact Registry, Cloud Run Admin, Cloud Firestore, Identity and Access Management (IAM), Cloud Storage, Cloud Logging, and Secret Manager APIs. The GitHub connection uses Secret Manager for authorization; FARA does not read that secret.
3. In **Artifact Registry → Repositories**, inspect your repository. If absent, create one with format **Docker**, mode **Standard**, location type **Region**, and region **us-central1**. Its ID must match `_AR_REPOSITORY`.
4. In **Firestore → Databases**, inspect `(default)`. If absent, create a **Standard edition / Native mode** database with ID `(default)`, choose `us-central1`, and enable deletion protection where offered. Keep an existing Native database even if its location differs; location changes require migration. A named database alone is insufficient. Do not recreate a database containing plans. The app creates collections when saving a plan.
5. In **IAM & Admin → Service Accounts → Create service account**, create `food-access-build` and `food-access-runtime` if absent. Skip broad project roles in the creation wizard and grant the scoped roles below. Leave the **Keys** tab empty. Both services use attached identities and Application Default Credentials.

The Firestore Admin SDK uses IAM, not browser-client rules. The committed `firestore.rules` denies direct web-client access; do not open those rules to make server writes work.

## 4. Minimum predefined execution roles

Grant these roles at the scopes shown. Custom roles can narrow individual permissions further. Do not substitute Owner, Editor, or a downloaded key.

| Principal                                                | Role ID                         | Grant on                                                                                              | Purpose                                                    |
| -------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `food-access-build@PROJECT_ID.iam.gserviceaccount.com`   | `roles/storage.objectViewer`    | Only the processed-data bucket                                                                        | Download objects; no writes                                |
| Build account                                            | `roles/artifactregistry.writer` | Only the target Docker repository                                                                     | Push images/read digests; includes reader permissions      |
| Build account                                            | `roles/run.developer`           | Project for first service creation; existing service only if it never needs to create another service | Create/update Cloud Run, without public-access IAM changes |
| Build account                                            | `roles/iam.serviceAccountUser`  | Only `food-access-runtime` service account                                                            | Attach the runtime identity                                |
| Build account                                            | `roles/logging.logWriter`       | Project                                                                                               | Write build logs                                           |
| `food-access-runtime@PROJECT_ID.iam.gserviceaccount.com` | `roles/datastore.user`          | Project containing Firestore `(default)`                                                              | Read/write plans and surveys, including transactions       |

Apply the bucket grant under **Cloud Storage → bucket → Permissions → Grant access**, using the build account email and **Storage Object Viewer**. This predefined role reads objects throughout that bucket; use a dedicated processed-data bucket if other objects should be inaccessible. [Storage roles](https://docs.cloud.google.com/storage/docs/access-control/iam-roles).

Apply the registry grant under **Artifact Registry → Repositories → select repository → Permissions / Grant access**, selecting **Artifact Registry Writer** for the build account. The runtime account needs no registry-write role. [Artifact Registry access control](https://docs.cloud.google.com/artifact-registry/docs/access-control).

Apply project-level Cloud Run Developer and Logs Writer grants under **IAM & Admin → IAM → Grant access**. For an existing-service-only deployer, use that service's **Permissions** panel for Cloud Run Developer instead. Apply Service Account User under **IAM & Admin → Service Accounts → food-access-runtime → Permissions → Grant access**, with the **build account** as principal. Do not grant this on every service account. [Cloud Run deployment roles](https://docs.cloud.google.com/run/docs/deploying).

Grant **Cloud Datastore User** to the **runtime account** at project scope. This standard role includes some permissions, such as deletion, that the app does not expose; it does not administer the project. The build account needs no Firestore data role; the runtime account needs no GCS/build role. [Firestore IAM](https://docs.cloud.google.com/firestore/native/docs/security/iam).

`cloudbuild.yaml` uses `CLOUD_LOGGING_ONLY`, so no build-log GCS bucket is required. Logs Writer authorizes this logging mode. Explicitly select the build account in the trigger: the trigger's service-account setting overrides YAML. [User-specified build accounts](https://docs.cloud.google.com/build/docs/securing-builds/configure-user-specified-service-accounts).

### Human access and managed agents

The trigger operator needs **Cloud Build Editor** (`roles/cloudbuild.builds.editor`) on the project, **Service Account User** (`roles/iam.serviceAccountUser`) on **food-access-build**, and **Cloud Build Connection Viewer** (`roles/cloudbuild.connectionViewer`) to browse connected source. Grant **Logs Viewer** (`roles/logging.viewer`) to view Cloud Logging output. These are human permissions, separate from the attached account's roles. [Build IAM roles](https://docs.cloud.google.com/build/docs/iam-roles-permissions), [trigger identity permissions](https://docs.cloud.google.com/build/docs/cloud-build-service-account).

Creating the GitHub connection additionally needs **Cloud Build Connection Admin** (`roles/cloudbuild.connectionAdmin`), GitHub authorization, and permission to create/manage its Secret Manager authorization secret. Have the administrator handle that setup; do not add those administration roles to the build account.

Keep the automatically provisioned Google service-agent bindings intact: `service-PROJECT_NUMBER@gcp-sa-cloudbuild.iam.gserviceaccount.com` uses **Cloud Build Service Agent** (`roles/cloudbuild.serviceAgent`); `service-PROJECT_NUMBER@serverless-robot-prod.iam.gserviceaccount.com` uses **Cloud Run Service Agent** (`roles/run.serviceAgent`). The former manages connected source access; the latter pulls same-project images. Console's GitHub connection setup grants its Cloud Build service agent access to its authorization secret. If missing, scope **Secret Manager Secret Accessor** (`roles/secretmanager.secretAccessor`) to that connection secret for the managed agent. Do not assign service-agent roles to either user-managed account or a human. [GitHub connection setup](https://docs.cloud.google.com/build/docs/automating-builds/github/connect-repo-github?generation=2nd-gen).

## 5. Connect GitHub and save a manual trigger

1. Make the source changes available on your chosen GitHub branch. In **Cloud Build → Repositories → 2nd gen**, choose **us-central1**, then **Create host connection → GitHub**. Name the connection, authorize the Cloud Build GitHub App for the intended repository, and complete Console's authorization flow. Use **Link repositories** to link that repository. No account key or personal access token belongs in the repo.
2. In **Cloud Build → Triggers**, select **us-central1** and **Create trigger**.
3. Name it, for example, `fara-release`. Set the event to **Manual invocation**. Choose the linked 2nd-gen repository and release branch as source. Keep the connection, repository, and trigger in `us-central1`.
4. Under **Configuration**, choose **Cloud Build configuration file (yaml or json)** from the repository and enter `/cloudbuild.yaml` as its location.
5. Under **Service account**, explicitly select `food-access-build@PROJECT_ID.iam.gserviceaccount.com`. Do not select the runtime, default Compute Engine, or legacy Cloud Build account.
6. Add/override these **substitution variables**:

   | Variable         | Example                         | Replace with                            |
   | ---------------- | ------------------------------- | --------------------------------------- |
   | `_DATA_BUCKET`   | `your-private-processed-bucket` | Existing bucket's bare name             |
   | `_AR_REPOSITORY` | `food-access`                   | Your `us-central1` Docker repository ID |
   | `_SERVICE_NAME`  | `food-access`                   | Your Cloud Run service name             |

7. **Save without clicking Run.** No push event is configured, so a source commit does not invoke this deployment trigger. GitHub's separate quality workflow still runs on pushes/PRs.

See Google's [manual-trigger instructions](https://docs.cloud.google.com/build/docs/manually-build-code-source-repos) if Console labels change. Docker and CLI steps run remotely in Cloud Build; no corresponding local tools or login are required.

## 6. What an intentional release will do

When you decide to deploy, first check the chosen commit's **Data-independent quality gates** GitHub Actions job is green. Both existing 100% coverage gates remain unchanged. This release pipeline validates actual assets and builds production; it does not replace the unit/integration coverage job or local browser acceptance suite.

Open the saved trigger, choose **Run**, confirm the source branch/commit and substitutions, then start the build. Run one release at a time per service. In **Cloud Build → History**, follow these steps:

1. `fetch-processed-data`: downloads the five objects into shared `/workspace/public/data/`.
2. `validate-data`: runs the existing validator. Missing, incompatible, stale, or hash-mismatched assets stop the build before Docker.
3. `build-image`: uses the existing non-root standalone Dockerfile with `--platform=linux/amd64`. `npm ci`, worker preparation, validation, and the Next production build run inside Docker.
4. `push-image`: pushes `us-central1-docker.pkg.dev/PROJECT_ID/REPOSITORY/SERVICE:BUILD_ID`. The unique build tag is recorded in the build's image artifacts.
5. `deploy-cloud-run`: resolves and checks the pushed SHA-256 digest, then deploys `IMAGE@sha256:…`. Failed lookups or invalid digests stop deployment.

| Cloud Run setting                   | Value                                                          |
| ----------------------------------- | -------------------------------------------------------------- |
| Runtime account                     | `food-access-runtime@PROJECT_ID.iam.gserviceaccount.com`       |
| Environment                         | `GOOGLE_CLOUD_PROJECT=PROJECT_ID`, `STORAGE_ADAPTER=firestore` |
| Container port                      | `8080`                                                         |
| Memory / CPU                        | `1 GiB` / `1`                                                  |
| Concurrency / timeout               | `40` / `60 seconds`                                            |
| Service minimum / maximum instances | `0` / `3`                                                      |

The pipeline uses **service-level** limits (`--min=0`, `--max=3`) and clears older revision-level overrides. [Deployment flags](https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy). Scaling limits are not spending caps; builds, storage, Firestore, and running instances can incur charges.

Deployment **replaces existing user-defined environment variables** with the two above, removing development JSON/emulator settings. If an existing service needs other production variables, add them to the configuration before release; do not upload `.env.local`. No keys, ADC files, or runtime bucket access are used. The service's public-access policy stays unchanged. A new service requires authentication by default.

### Public access, if intended

Anonymous public plans and surveys require a publicly accessible application. After first deployment, an authorized human with **Cloud Run Admin** (`roles/run.admin`) can open **Cloud Run → service → Security → Allow public access**, review the diff, and deploy that access change. Keep the service private if intended. This is a separate Console decision: the build account cannot change access with its roles. Follow organization policies. [Public-access instructions](https://docs.cloud.google.com/run/docs/authenticating/public).

Console login alone does not authenticate ordinary browser requests to a private service URL; a 403 there can be expected. The app's private creator links/cookie checks still apply when the website is public.

## 7. Verify after deployment

In **Cloud Run → service → Revisions**, check the ready revision's image digest against the build artifact. Inspect its runtime account, environment, and scaling settings. If traffic was pinned to an old revision, use **Manage traffic** to route to the intended ready revision. Use the service's **Logs** tab for startup/request failures.

Once access is configured, use the service URL in a browser:

1. Check the homepage, planner, Resources, About, Data & methods, map, and area selection on desktop and phone.
2. Open `/api/health` and `/data/manifest.json`. Health reports configuration, not a successful Firestore round-trip.
3. Save a plan and retain the separate private creator link. Open only the public link in another browser/incognito context and submit all four survey choices.
4. Open the creator link; check the response count, small-cell suppression, and close/reopen action. A visitor must not gain creator access from a public link.
5. After a later release, revisit the same plan. It and its responses must survive because Firestore holds them outside the container.

These cloud checks remain pending. Local tests/builds cannot establish that cloud IAM, the database, or public access works.

## 8. Troubleshooting and rollback

| Failure                                     | Console check / remedy                                                                               |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Placeholder bucket / missing object         | Use the bare bucket name. Check all five exact keys, with no extra `data/` folder.                   |
| Storage 403                                 | Bucket Permissions: Object Viewer for **food-access-build**, including cross-project buckets.        |
| Wrong build identity                        | Edit the trigger service account; it overrides YAML.                                                 |
| Logging / logs-bucket error                 | Logs Writer for build account; trigger uses this YAML's `CLOUD_LOGGING_ONLY`.                        |
| Stale / hash mismatch                       | Reprocess locally using Python/uv, replace all five objects, then retry. Never bypass validation.    |
| GitHub connection failure                   | GitHub App repository selection, connection status, managed build agent's connection-secret access.  |
| Push / digest lookup denied                 | Writer on the exact `us-central1` Docker repository and correct substitution.                        |
| Deploy denied / `iam.serviceAccounts.actAs` | Run Developer at the right scope; Service Account User on **runtime account** for **build account**. |
| Image pull failure                          | Same-project registry and managed Cloud Run agent's standard role.                                   |
| Save/survey 503                             | Native `(default)` Firestore, runtime identity, project env, runtime Datastore User; inspect logs.   |
| Browser 403 / old version                   | Public-access policy / revision traffic; Console login alone does not authorize the URL.             |

To roll back, open **Cloud Run → service → Revisions → Manage traffic**, select a previous ready revision, and assign traffic to it. This rolls back code, not Firestore documents. Keep the prior image/revision until its replacement is verified. A build failure after pushing may leave an unused registry image; inspect build status before assuming deployment completed.

The older `scripts/deploy-gcp.sh` remains available for maintainers choosing a local build. It is not needed here. This Console workflow never uses Cloud Run source deployment, raw-data upload, generated-data Git commits, or service-account keys.
