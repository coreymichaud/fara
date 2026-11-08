# Transformation lineage

1. Read original local inputs without editing them. ACS CSVs use UTF-8 BOM; national USDA files contain Latin-1 county names and use CP1252. All IDs are strings. The pipeline requires exact named columns and rejects invalid numerics except documented ACS missing/suppression sentinels. ACS descriptive header rows are explicitly removed.
2. Discover study counties from Florida census-tract rows of supplied S1701. Current files identify Lake, Orange, Osceola, and Seminole, totaling 490. Other regions are discarded before publication. Filter USDA to the same counties and Florida; filter the retailer snapshot to FL and normalized county names.
3. Create 11-digit GEOIDs from ACS `GEO_ID` and USDA `CensusTract20`. Validate uniqueness, exact set agreement, and one-to-one merges. Left joins cannot silently lose rows. Missing positive counts or key/vintage mismatches fail processing. No spatial join or label-based matching is used.
4. Retain S1701 poverty estimate and 90% MOE, S2201 SNAP household percent, USDA `SD_SRAM_lapop1share`, `POP2020`, `OHU2020`, and `Urban`. Preserve null indicators. Do not invert SNAP or use driving/vehicle variables. Percent values must lie in [0,100], counts must be nonnegative integers, coordinates must be in the study envelope.
5. Load official supplemental `cb_2020_12_tract_500k.zip`, read its PRJ (NAD83), select exact GEOIDs, and reject invalid/empty polygons or missing geometry. Transform with always-XY PyProj to EPSG:5070, compute an interior representative point, simplify display boundaries by 60 meters with topology preserved, and return geometry/points to WGS84. Dissolve selected tract coverage by county FIPS. No area/population apportionment occurs.
6. Quarantine supplied retailer Record_ID 546413: Osceola county label with latitude 30.118788. Do not replace coordinates. Any other out-of-envelope/missing retailer point or duplicate ID raises an error. Publish 1,694 minimized public retailer points from 1,695 county-labeled rows; capture date remains unknown.
7. Use Pandas for validated source-specific loads and joins; DuckDB computes canonical row/population/household totals as an independent aggregation boundary. Sort by GEOID/store ID. Serialize JSON with no NaN/Infinity, four-decimal indicators and six-decimal coordinates. No source rate is spatially downscaled.
8. Write the canonical minimized web dataset to `public/data/`, the single explicit deployable output directory. `data/processed/` is reserved for optional local intermediates and is never required at runtime or copied into images. This avoids duplicating large files while preserving the raw/canonical/web boundary. No raw CSV is read by Next.js.
9. Derive dataset version from source SHA-256 hashes plus schema/method versions. Hash each published payload separately. Generation timestamp is provenance metadata and is the sole intentionally changing output for identical inputs. A production build rejects assets older than 30 days, future timestamps, wrong schemas/modes, changed hashes, missing files, invalid values, or mismatched map keys. Regeneration does not make old source data new.
10. At runtime, the TypeScript model normalizes complete eligible tracts globally. County filtering, weights, radius, capacity, cost/budget and practitioner decisions recompute scenarios deterministically. Results and all entered assumptions are recomputed server-side when saving; client-supplied results are not trusted.

Run from the repository root:

```sh
cd analysis
uv sync --locked
uv run python src/pipeline.py
uv run python src/eda.py
cd ..
npm run data:validate
```

The six notebooks use observed local inputs and retain aggregate summaries/figures, not row dumps. Each covers distributions, missingness, IQR outlier counts, geography, source-specific caveats and legitimate aligned cross-indicator comparisons where applicable. Notebook execution uses a fresh kernel for each source.
