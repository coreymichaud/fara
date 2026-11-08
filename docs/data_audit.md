# Local data audit

Audited 7 November 2026. Raw inputs are immutable, Git-ignored, and excluded from Docker by an independent allowlist. No raw files were uploaded. Source hashes are in the local generated manifest.

## Source inventory

CSV counts exclude column headers; ACS observation counts also exclude the second descriptive header. Full source labels are in each supplied Column-Metadata / Variable Lookup CSV. Only columns named in the data dictionary are published.

| Local filename under `data/raw/`                         |    Rows | Fields | Relevance / use                               |
| -------------------------------------------------------- | ------: | -----: | --------------------------------------------- |
| `ACSDT5Y2024.B23025-Column-Metadata.csv`                 |      16 |      2 | Unused: outside the minimal food-access model |
| `ACSDT5Y2024.B23025-Data.csv`                            |   3,085 |     17 | Unused: outside the minimal food-access model |
| `ACSDT5Y2024.B23025-Table-Notes.txt`                     |       — |      — | Unused reference                              |
| `ACSST5Y2024.S1701-Column-Metadata.csv`                  |     374 |      2 | Definition / provenance support               |
| `ACSST5Y2024.S1701-Data.csv`                             |   3,085 |    375 | Used: selected columns only                   |
| `ACSST5Y2024.S1701-Table-Notes.txt`                      |       — |      — | Definition / provenance support               |
| `ACSST5Y2024.S1901-Column-Metadata.csv`                  |     130 |      2 | Unused: outside the minimal food-access model |
| `ACSST5Y2024.S1901-Data.csv`                             |   3,085 |    131 | Unused: outside the minimal food-access model |
| `ACSST5Y2024.S1901-Table-Notes.txt`                      |       — |      — | Unused reference                              |
| `ACSST5Y2024.S2201-Column-Metadata.csv`                  |     458 |      2 | Definition / provenance support               |
| `ACSST5Y2024.S2201-Data.csv`                             |   3,085 |    459 | Used: selected columns only                   |
| `ACSST5Y2024.S2201-Table-Notes.txt`                      |       — |      — | Definition / provenance support               |
| `SNAP_Retailer_Location_data.csv`                        | 248,872 |     17 | Used: selected columns only                   |
| `SRAM Driving Distance Data.csv`                         |  84,119 |    135 | Unused: outside the minimal food-access model |
| `SRAM General Tract Characteristics Data.csv`            |  84,119 |     27 | Used: selected columns only                   |
| `SRAM Read Me.txt`                                       |       — |      — | Definition / provenance support               |
| `SRAM Straight Line Distance Data.csv`                   |  84,119 |    135 | Used: selected columns only                   |
| `SRAM Variable Lookup Driving Distance.csv`              |     135 |      3 | Unused: outside the minimal food-access model |
| `SRAM Variable Lookup General Tract Characteristics.csv` |      27 |      3 | Definition / provenance support               |
| `SRAM Variable Lookup Straight Line Distance.csv`        |     135 |      3 | Definition / provenance support               |
| `cb_2020_12_tract_500k.zip`                              |       — |      — | Used: official supplementary Census geometry  |

## Geography, vintages, and join checks

The four supplied ACS extracts span multiple challenge regions (including New York City and Salt Lake County). Florida rows in S1701 identify **Lake (75), Orange (267), Osceola (59), and Seminole (89)**: 490 tracts. The other ACS extracts contain the same Florida tract set. National USDA tables each have 84,119 tracts; the exact Florida study-area filter also yields 490. Keys are Census GEOIDs, not names. All used tract tables and downloaded 2020 geometry match exactly, with no unmatched or silently dropped tracts. Duplicate or mismatched IDs fail processing.

| Published asset     | Count | Granularity / units / limitations                              |
| ------------------- | ----: | -------------------------------------------------------------- |
| `areas.json`        |   490 | 2020 census tracts; mixed-vintage public indicators            |
| `retailers.geojson` |  1694 | Coordinates only with public store name/type; not pantry sites |
| `tracts.geojson`    |   490 | Official Census 2020 1:500,000 polygons, simplified 60m        |
| `counties.geojson`  |     4 | Dissolved 2020 tract coverage; display context only            |

The SNAP retailer file has 1,695 rows with Florida state and the four county labels. Record **546413** (PUBLIX 716) says Osceola but has latitude 30.118788. It is explicitly quarantined, leaving 1,694 points. Coordinates are not corrected or geocoded. Any additional invalid coordinates fail validation. Supplied retailer capture date is unknown; freshness cannot be established from a filename.

ACS is a 2020–2024 five-year estimate, not a 2024 point-in-time census. Poverty uses the population with determined poverty status as denominator; SNAP uses households. USDA SRAM describes 2025 retailers and 2020 population; its source Read Me says first release July 2026. 2020 counts are occupied housing units and people. No county rate is allocated to tracts.

## Spatial reference and geometry provenance

No polygons were supplied. Official supplemental geometry was downloaded from [Census GENZ2020 Florida tracts](https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_12_tract_500k.zip) into the ignored raw directory. The archive PRJ is read, transformed from NAD83 to EPSG:5070 for interior-point calculation and topology-preserving 60m simplification, then to EPSG:4326 for GeoJSON. Longitude precedes latitude. Polygon validity and exact key completeness are checked. County outlines are unions of the selected cartographic tracts, not separately surveyed county boundaries. No fabricated polygons or tract labels are used.

## Missingness and comparability

| Field        | Null tract count | Treatment                                                      |
| ------------ | ---------------: | -------------------------------------------------------------- |
| `poverty`    |                2 | Preserve null; exclude ranking if poverty or lowAccess missing |
| `povertyMoe` |                2 | Preserve null; exclude ranking if poverty or lowAccess missing |
| `lowAccess`  |                1 | Preserve null; exclude ranking if poverty or lowAccess missing |
| `snap`       |                2 | Preserve null; exclude ranking if poverty or lowAccess missing |

There are 488 eligible tracts under the complete-data, positive-population, positive-household rule. Missingness is never imputed to zero. ACS suppression/sentinel values are recognized explicitly. All-same normalized features use midpoint 0.5, not a divide-by-zero. Margins of error remain visible; they do not become confidence percentages.

## Deliberately unused inputs

S1901 and B23025 are inventoried but excluded to keep the index interpretable and avoid adding correlated proxies without a clear intervention model. USDA driving/network distance and vehicle-access fields are unused. Although a national driving-distance file exists, no transportation service, transit schedules, travel times, barrier rates, or transport routes are modeled, consistent with the brief. Lookup/notes files define source fields but do not need separate EDA notebooks. No baseline pantry sites or operational capacities were supplied.

See [transformations](transformations.md), [dictionary](data_dictionary.md), [licensing](LICENSING.md), and the six executed [notebooks](../analysis/notebooks/).
