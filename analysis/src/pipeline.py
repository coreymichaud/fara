"""Deterministic local build of minimized, public Central Florida map assets."""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from zipfile import ZipFile

import duckdb
import pandas as pd
import shapefile
from pyproj import CRS, Transformer
from shapely import transform
from shapely.geometry import mapping, shape
from shapely.ops import unary_union

from loaders import load_acs, load_retailers, load_usda

SCHEMA = "1.0"
METHOD = "priority-proximity-v1"
GENERAL = "SRAM General Tract Characteristics Data.csv"
DISTANCE = "SRAM Straight Line Distance Data.csv"
POVERTY = "ACSST5Y2024.S1701-Data.csv"
SNAP = "ACSST5Y2024.S2201-Data.csv"
RETAILERS = "SNAP_Retailer_Location_data.csv"
GEOMETRY = "cb_2020_12_tract_500k.zip"
ROOT = Path(__file__).resolve().parents[2]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def nullable(value: Any) -> float | None:
    return None if pd.isna(value) else round(float(value), 4)


def validate_areas(areas: list[dict[str, Any]]) -> None:
    if not areas or len({a["id"] for a in areas}) != len(areas):
        raise ValueError("No areas or duplicate tract IDs")
    for area in areas:
        lon, lat = area["coordinates"]
        if not (-83 <= lon <= -80 and 27 <= lat <= 30):
            raise ValueError(f"{area['id']}: invalid Central Florida coordinates")
        for col in ["poverty", "lowAccess", "snap"]:
            value = area[col]
            if value is not None and (not math.isfinite(value) or not 0 <= value <= 100):
                raise ValueError(f"{area['id']}: {col} must be percent or null")
        for col in ["population", "households"]:
            if not math.isfinite(area[col]) or area[col] < 0 or int(area[col]) != area[col]:
                raise ValueError(f"{area['id']}: invalid {col} count")
        if area["povertyMoe"] is not None and not 0 <= area["povertyMoe"] <= 100:
            raise ValueError("Invalid poverty margin of error")


def geometries(path: Path, ids: set[str]) -> tuple[dict[str, Any], dict[str, Any]]:
    with ZipFile(path) as archive:
        prj_name = next(n for n in archive.namelist() if n.endswith(".prj"))
        crs = CRS.from_wkt(archive.read(prj_name).decode())
    to_meters = Transformer.from_crs(crs, "EPSG:5070", always_xy=True).transform
    to_wgs84 = Transformer.from_crs("EPSG:5070", "EPSG:4326", always_xy=True).transform
    features: dict[str, Any] = {}
    county_parts: dict[str, list[Any]] = {}
    with shapefile.Reader(str(path)) as reader:
        for record in reader.iterShapeRecords():
            attrs = record.record.as_dict()
            geoid = attrs["GEOID"]
            if geoid not in ids:
                continue
            geom = shape(record.shape.__geo_interface__)
            if geom.is_empty or not geom.is_valid:
                raise ValueError(f"Invalid Census geometry for {geoid}")
            projected = transform(geom, to_meters, interleaved=False)
            reduced = transform(
                projected.simplify(60, preserve_topology=True), to_wgs84, interleaved=False
            )
            point = transform(projected.representative_point(), to_wgs84, interleaved=False)
            features[geoid] = {
                "type": "Feature",
                "id": geoid,
                "geometry": mapping(reduced),
                "properties": {"id": geoid, "coordinates": [round(point.x, 6), round(point.y, 6)]},
            }
            county_parts.setdefault(geoid[:5], []).append(reduced)
    if set(features) != ids:
        raise ValueError(f"Missing Census boundaries for {sorted(ids - set(features))}")
    counties = {
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "geometry": mapping(unary_union(parts)), "properties": {"id": key}}
            for key, parts in sorted(county_parts.items())
        ],
    }
    return features, counties


def build(raw: Path, output: Path, generated_at: str | None = None) -> dict[str, Any]:
    sources = [GENERAL, DISTANCE, POVERTY, SNAP, RETAILERS, GEOMETRY]
    for filename in sources:
        if not (raw / filename).is_file():
            raise ValueError(
                f"Missing {raw / filename}. Supply original inputs; no synthetic fallback."
            )
    poverty = load_acs(raw / POVERTY, {"S1701_C03_001E": "poverty", "S1701_C03_001M": "povertyMoe"})
    counties = set(poverty.county)
    if len(counties) > 8:
        raise ValueError("Study area must be supported by the supplied Central Florida ACS extract")
    snap = load_acs(raw / SNAP, {"S2201_C04_001E": "snap"})
    general = load_usda(
        raw / GENERAL,
        counties,
        {"POP2020": "population", "OHU2020": "households", "Urban": "urban"},
    )
    distance = load_usda(raw / DISTANCE, counties, {"SD_SRAM_lapop1share": "lowAccess"})
    frame = (
        poverty.merge(general, on="id", validate="one_to_one", how="left")
        .merge(distance, on="id", validate="one_to_one", how="left")
        .merge(snap[["id", "snap"]], on="id", validate="one_to_one", how="left")
    )
    if (
        set(poverty.id) != set(general.id)
        or set(poverty.id) != set(distance.id)
        or set(poverty.id) != set(snap.id)
    ):
        raise ValueError("Tract key mismatch across sources; reconcile vintages before publication")
    if frame[["population", "households", "urban"]].isna().any().any():
        raise ValueError("Missing population/household/urban source values")
    shapes, county_geo = geometries(raw / GEOMETRY, set(frame.id))
    areas: list[dict[str, Any]] = []
    for row in frame.sort_values("id").to_dict("records"):
        areas.append(
            {
                "id": row["id"],
                "label": row["label"].split(";")[0],
                "county": row["county"].removesuffix(" County"),
                "coordinates": shapes[row["id"]]["properties"]["coordinates"],
                "poverty": nullable(row["poverty"]),
                "povertyMoe": nullable(row["povertyMoe"]),
                "lowAccess": nullable(row["lowAccess"]),
                "snap": nullable(row["snap"]),
                "population": int(row["population"]),
                "households": int(row["households"]),
                "urban": bool(row["urban"]),
            }
        )
    validate_areas(areas)
    retailers = load_retailers(raw / RETAILERS, counties)
    with duckdb.connect() as conn:
        conn.register("tracts", frame)
        summary = conn.execute(
            "SELECT count(*), sum(population), sum(households) FROM tracts"
        ).fetchone()
    assert summary is not None
    output.mkdir(parents=True, exist_ok=True)
    assets: dict[str, Any] = {
        "areas.json": areas,
        "tracts.geojson": {
            "type": "FeatureCollection",
            "features": [shapes[a["id"]] for a in areas],
        },
        "counties.geojson": county_geo,
        "retailers.geojson": {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": {
                        "type": "Point",
                        "coordinates": [float(r["Longitude"]), float(r["Latitude"])],
                    },
                    "properties": {
                        "id": r["Record_ID"],
                        "name": r["Store_Name"],
                        "type": r["Store_Type"],
                    },
                }
                for r in retailers.sort_values("Record_ID").to_dict("records")
            ],
        },
    }
    for name, asset in assets.items():
        (output / name).write_text(
            json.dumps(asset, allow_nan=False, separators=(",", ":")), encoding="utf-8"
        )
    hashes = {name: digest(raw / name) for name in sources}
    version = hashlib.sha256(
        json.dumps({"sources": hashes, "schema": SCHEMA, "method": METHOD}, sort_keys=True).encode()
    ).hexdigest()[:12]
    manifest = {
        "schemaVersion": SCHEMA,
        "methodVersion": METHOD,
        "datasetVersion": version,
        "mode": "observed",
        "generatedAt": generated_at or datetime.now(UTC).isoformat(),
        "geography": sorted(c.removesuffix(" County") for c in counties),
        "areaCount": len(areas),
        "retailerCount": len(retailers),
        "sourceHashes": hashes,
        "assetHashes": {name: digest(output / name) for name in assets},
        "units": {
            "poverty": "percent, ACS 2020–2024",
            "povertyMoe": "percentage points, 90% MOE",
            "lowAccess": "percent of 2020 population >1 straight-line mile from 2025 SNAP-authorized retailers",
            "snap": "percent households receiving SNAP, ACS 2020–2024; context only",
            "population": "2020 Census people",
            "households": "2020 Census occupied housing units",
        },
        "publicationBasis": "Published US federal statistical aggregates and Census boundaries; see docs/LICENSING.md. No LandScan raster or private Beacon data redistributed.",
        "baseline": "Current pantry network unknown",
        "missingness": {
            col: int(frame[col].isna().sum())
            for col in ["poverty", "povertyMoe", "lowAccess", "snap"]
        },
        "sourceDates": {
            "acs": "2020–2024 five-year estimates",
            "census": "2020",
            "sram": "2025 indicators, released July 2026",
            "retailers": "Supplied snapshot; capture date not recorded",
        },
    }
    (output / "manifest.json").write_text(
        json.dumps(manifest, indent=2, allow_nan=False) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--raw", type=Path, default=ROOT / "data/raw")
    parser.add_argument("--output", type=Path, default=ROOT / "public/data")
    args = parser.parse_args()
    manifest = build(args.raw, args.output)
    print(
        json.dumps(
            {
                k: manifest[k]
                for k in [
                    "mode",
                    "datasetVersion",
                    "geography",
                    "areaCount",
                    "retailerCount",
                    "missingness",
                ]
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
