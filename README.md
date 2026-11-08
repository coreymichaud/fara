# FARA — Geospatial Food Access Analysis

**A data-driven approach to prioritizing mobile food pantry locations in Central Florida.**

FARA (Food Access Resource Allocation) combines Census and USDA data to identify areas where poverty and limited access to food retailers overlap. The project takes the analysis beyond a static map: users can compare candidate locations, change assumptions, and build a plan for a mobile pantry event.

The goal is to support better site-selection conversations, not to predict attendance or replace local knowledge.

**Stack:** Python, pandas, DuckDB, Shapely, PyProj, Jupyter, TypeScript, Next.js, MapLibre, Firestore

![FARA planner showing tract-level evidence, candidate locations, and an interactive map](docs/screenshots/planner-desktop.png)

## Project at a glance

|                     |                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------- |
| **Study area**      | Lake, Orange, Osceola, and Seminole counties, Florida                                               |
| **Geographic unit** | 490 Census tracts; 488 eligible for scoring                                                         |
| **Retailer data**   | 1,694 SNAP-authorized retailer locations after quality checks                                       |
| **Core methods**    | Data integration, geospatial processing, feature normalization, weighted scoring, scenario analysis |
| **Deliverable**     | Interactive decision-support application with reproducible data preparation                         |

## The problem

Choosing a mobile pantry location involves more than finding a neighborhood with high poverty. Food access, the number of households potentially within reach, event capacity, and practical constraints all matter. These signals also come from different sources, with different geographic definitions and observation years.

FARA addresses three questions:

1. **Where is the evidence of need strongest?** Compare tracts using poverty and limited retailer access.
2. **How do potential event locations compare?** Rank candidate areas under a consistent radius, capacity, and set of indicator weights.
3. **How sensitive is the recommendation?** Recalculate rankings when assumptions change, and preserve the choices for discussion with community partners.

## Data and preparation

| Source                                                                                                   | Variables used                                                                                                                  | Role in the analysis                                                         |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| [American Community Survey, 2020–2024](https://www.census.gov/programs-surveys/acs)                      | Poverty rate, 90% margin of error, SNAP participation                                                                           | Socioeconomic indicators; SNAP participation is context, not a scoring input |
| [USDA retail-access data](https://www.ers.usda.gov/data-products/food-access-research-atlas/)            | Share of residents more than one straight-line mile from a SNAP-authorized retailer; 2020 population and occupied housing units | Retail-access measure and household counts                                   |
| [2020 Census tract boundaries](https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_12_tract_500k.zip) | Tract polygons                                                                                                                  | Spatial reference, representative points, and map layers                     |
| USDA SNAP retailer snapshot                                                                              | Store coordinates, names, and types                                                                                             | Retailer map layer and geographic quality checks                             |

The Python pipeline in [`analysis/src/pipeline.py`](analysis/src/pipeline.py) performs the following work:

1. **Ingest and validate.** Parse source-specific CSV formats, preserve Census GEOIDs as strings, handle documented missing-value codes, and reject duplicate or mismatched tract IDs.
2. **Join and audit.** Align ACS and USDA records at the 2020 tract level; verify exact key coverage and check missingness, ranges, and counts. DuckDB provides an independent aggregation check.
3. **Process geography.** Reproject Census polygons to EPSG:5070, calculate interior representative points, simplify display geometry, and export WGS84 GeoJSON. One retailer record with an inconsistent county/coordinate pairing is quarantined rather than silently corrected.
4. **Publish a small, traceable dataset.** Produce five JSON/GeoJSON assets for the application, with source hashes, asset hashes, schema version, and data provenance recorded in a manifest.

Six [EDA notebooks](analysis/notebooks/) cover source distributions, missing values, outliers, spatial coverage, and cross-indicator relationships. The [data audit](docs/data_audit.md), [dictionary](docs/data_dictionary.md), and [transformation log](docs/transformations.md) document the decisions behind the processed dataset.

## Scoring and site ranking

### 1. Tract-level priority

Two variables drive the index:

- **Poverty:** ACS share of residents below the poverty threshold.
- **Low retail access:** USDA share of residents living more than one straight-line mile from a SNAP-authorized retailer.

Both features are min–max normalized across eligible tracts in the four-county study area. Each tract receives a score from 0 to 100:

$$
\text{Priority}_i = 100\left[w\,\text{Poverty}_i^* + (1-w)\,\text{LowAccess}_i^*\right]
$$

The default weight is $w=0.5$. Users can change it to examine how the ranking responds to different priorities. Tracts with missing scoring inputs or nonpositive population/household counts are excluded from ranking; missing values are not imputed.

This is a **relative prioritization index**, not a probability of food insecurity or a trained predictive model.

### 2. Candidate event locations

Each eligible tract's interior point is evaluated as a candidate location. For a selected radius, FARA includes other tract representative points within that distance using the Haversine formula. It then calculates:

- The total **2020 occupied housing units** in included tracts.
- The **household-weighted mean priority** of those tracts.
- A **capacity-adjusted planning value**: the smaller of event capacity and included housing units, multiplied by mean priority divided by 100.

Candidates are ranked by that planning value, with deterministic tie-breaking. Users can compare a manual location with up to two candidates and inspect sensitivity to 1-, 2.5-, and 5-mile radii and alternative indicator weights.

The planning value is an index for comparing scenarios. It is **not** an estimate of households served, attendance, or causal impact.

The scoring and ranking implementation is in [`src/lib/domain/planner.ts`](src/lib/domain/planner.ts); the full specification is in the [methodology](docs/methodology.md).

## Interactive deliverable

The application connects the analysis to a practical planning workflow:

- Explore tract-level indicators and retailer locations on an interactive map.
- Adjust weights, service radius, and event capacity to compare ranked candidates.
- Record an event location, schedule, budget, and local considerations.
- Save a read-only proposal, collect optional anonymous community feedback, and review aggregated responses through a private organizer link.

The interface is built with Next.js, TypeScript, React, and MapLibre. Firestore supports persisted plans and survey responses in the production configuration; local development can use a JSON store. The application is designed for Cloud Run, but a live cloud deployment is not claimed in this repository.

## Reproduce the analysis

**Requirements:** Python 3.12–3.13 with [uv](https://docs.astral.sh/uv/), Node.js 24 LTS, and npm.

The raw source files and generated web assets are intentionally excluded from Git. To rebuild the dataset, obtain the original source files and place them under `data/raw/` using the filenames in the [data audit](docs/data_audit.md). Then run:

```bash
cd analysis
uv sync --locked
uv run python src/pipeline.py
uv run python src/eda.py
cd ..
npm run data:validate
```

The pipeline writes these five files to `public/data/`:

```text
manifest.json
areas.json
tracts.geojson
counties.geojson
retailers.geojson
```

If you already have an authorized set of processed assets, place them directly in `public/data/`. To run the application:

```bash
npm ci
cp .env.example .env.local
npm run data:validate
npm run dev
```

Open [localhost:3000](http://localhost:3000). The example environment uses development-only JSON persistence; see [deployment instructions](docs/DEPLOYMENT.md) for the Firestore/Cloud Run setup.

### Validation and tests

The project includes schema and geography checks, reproducibility tests, property-based tests with Hypothesis, TypeScript unit tests, and Playwright browser tests.

```bash
cd analysis && uv run pytest && cd ..
npm run lint
npm run typecheck
npm test
```

The broader `npm run check` workflow also requires the processed data and a Firestore Emulator. See the [verification record](docs/VERIFICATION.md) for measured coverage, test results, and remaining gaps.

## Limitations and next steps

The inputs span different years: 2020 Census counts, 2020–2024 ACS estimates, and 2025 USDA access measures. Retailer snapshot freshness is unknown. Straight-line distance is not travel time, representative points are not population centers, and SNAP retailers are not the same as pantry service locations. ACS uncertainty is not propagated through the final score.

The most useful next step is to integrate a verified inventory of existing pantry locations and service schedules, followed by field validation of candidate sites. Any claim about actual reach or improvement would require additional data and a separate evaluation design.

See [known limitations](docs/limitations.md) and [next steps](docs/next_steps.md) for details.

---

**Sources:** U.S. Census Bureau and USDA Economic Research Service. FARA is an independent project, not an official DataKind or Beacon product. [MIT License](LICENSE).
