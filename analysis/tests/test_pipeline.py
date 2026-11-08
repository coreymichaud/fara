import json
import runpy
import sys
from copy import deepcopy
from pathlib import Path

import pandas as pd
import pytest
from conftest import write_csv, write_shapes
from hypothesis import given
from hypothesis import strategies as st

from loaders import load_acs, load_retailers, load_usda, numeric, require_columns, unique_ids
from pipeline import (
    GENERAL,
    GEOMETRY,
    POVERTY,
    RETAILERS,
    build,
    digest,
    geometries,
    main,
    nullable,
    validate_areas,
)

AREA = {
    "id": "12095000100",
    "coordinates": [-81.5, 28.5],
    "poverty": 20,
    "povertyMoe": 3,
    "lowAccess": 50,
    "snap": None,
    "population": 200,
    "households": 100,
}


def test_numbers_and_validation() -> None:
    assert numeric(pd.Series(["10", "", "-", "(X)"]), "fixture").iloc[0] == 10
    assert numeric(pd.Series(["10", "", "-", "(X)"]), "fixture").isna().sum() == 3
    with pytest.raises(ValueError, match="invalid numeric"):
        numeric(pd.Series(["unreliable"]), "fixture")
    require_columns(pd.DataFrame({"id": []}), ["id"], "fixture")
    with pytest.raises(ValueError, match="missing columns"):
        require_columns(pd.DataFrame(), ["missing"], "fixture")
    for values in [[], ["bad"], ["12095000100", "12095000100"]]:
        with pytest.raises(ValueError, match="empty data"):
            unique_ids(pd.DataFrame({"id": pd.Series(values, dtype=str)}), "fixture")
    assert nullable(float("nan")) is None
    assert nullable(1.2345678) == 1.2346


def test_loaders(raw: Path) -> None:
    poverty = load_acs(raw / POVERTY, {"S1701_C03_001E": "poverty"})
    assert list(poverty.poverty) == [10, 30]
    assert set(poverty.county) == {"Lake County", "Orange County"}
    general = load_usda(raw / GENERAL, {"Lake County"}, {"OHU2020": "households"})
    assert len(general) == 1 and general.households.iloc[0] == 100
    with pytest.raises(ValueError, match="empty data"):
        load_usda(raw / GENERAL, {"not a county"}, {"OHU2020": "households"})
    path = raw / "invalid.csv"
    write_csv(path, [["GEO_ID", "NAME", "value"], ["0500000US12095", "Orange", "3"]])
    with pytest.raises(ValueError, match="expected census-tract"):
        load_acs(path, {"value": "value"})
    retailers = load_retailers(raw / RETAILERS, {"Orange County"})
    assert retailers.Longitude.iloc[0] == -81.6
    original = (raw / RETAILERS).read_text()
    (raw / RETAILERS).write_text(
        original + "546413,Known wrong location,Store,FL,ORANGE,-81.6,30.118788\n"
    )
    assert len(load_retailers(raw / RETAILERS, {"Orange County"})) == 1
    (raw / RETAILERS).write_text(original + "2,Invalid,Store,FL,ORANGE,-181,28\n")
    with pytest.raises(ValueError, match="coordinates"):
        load_retailers(raw / RETAILERS, {"Orange County"})
    (raw / RETAILERS).write_text(original + original.splitlines()[1] + "\n")
    with pytest.raises(ValueError, match="duplicate"):
        load_retailers(raw / RETAILERS, {"Orange County"})
    with pytest.raises(ValueError, match="empty"):
        load_retailers(raw / RETAILERS, {"not a county"})


def test_end_to_end_reproducibility(raw: Path, tmp_path: Path) -> None:
    before = {p.name: digest(p) for p in raw.iterdir() if p.is_file()}
    output = tmp_path / "web"
    first = build(raw, output, "2026-11-07T12:00:00+00:00")
    second = build(raw, tmp_path / "web2", "2026-11-07T12:00:00+00:00")
    assert first == second
    assert first["areaCount"] == 2 and first["retailerCount"] == 1
    assert before == {p.name: digest(p) for p in raw.iterdir() if p.is_file()}
    areas = json.loads((output / "areas.json").read_text())
    assert [area["households"] for area in areas] == [100, 300]
    assert first["geography"] == ["Lake", "Orange"]
    assert len(json.loads((output / "tracts.geojson").read_text())["features"]) == 2
    assert build(raw, tmp_path / "web3")["datasetVersion"] == first["datasetVersion"]


def test_geometry_filter_missing_and_invalid(raw: Path) -> None:
    features, _ = geometries(raw / GEOMETRY, {"12069000100"})
    assert set(features) == {"12069000100"}
    with pytest.raises(ValueError, match="Missing Census"):
        geometries(raw / GEOMETRY, {"12099000100"})
    write_shapes(raw / GEOMETRY, invalid=True)
    with pytest.raises(ValueError, match="Invalid Census geometry"):
        geometries(raw / GEOMETRY, {"12069000100"})


@pytest.mark.parametrize(
    "patch",
    [
        {"coordinates": [-181, 28]},
        {"coordinates": [-81, 91]},
        {"poverty": -1},
        {"lowAccess": 101},
        {"snap": float("inf")},
        {"population": -1},
        {"population": 1.5},
        {"households": float("nan")},
        {"povertyMoe": 101},
    ],
)
def test_invalid_area(patch: dict[str, object]) -> None:
    with pytest.raises(ValueError):
        validate_areas([{**AREA, **patch}])


def test_empty_duplicate_and_missing_indicators() -> None:
    for areas in [[], [AREA, AREA]]:
        with pytest.raises(ValueError, match="duplicate"):
            validate_areas(areas)
    validate_areas([{**AREA, "poverty": None, "povertyMoe": None, "lowAccess": None}])


@given(st.floats(min_value=0, max_value=100, allow_nan=False, allow_infinity=False))
def test_valid_percentage_invariant(value: float) -> None:
    area = deepcopy(AREA)
    area["poverty"] = value
    validate_areas([area])


def test_missing_source_and_key_mismatches(raw: Path, tmp_path: Path) -> None:
    with pytest.raises(ValueError, match="Missing"):
        build(tmp_path, tmp_path / "out")
    original = (raw / GENERAL).read_text()
    (raw / GENERAL).write_text(original.replace("12095000100", "12095009900"))
    with pytest.raises(ValueError, match="key mismatch"):
        build(raw, tmp_path / "out")
    (raw / GENERAL).write_text(original.replace(",600,300,1", ",,300,1"))
    with pytest.raises(ValueError, match="Missing population"):
        build(raw, tmp_path / "out")


def test_cli(
    raw: Path, tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    monkeypatch.setattr(
        sys, "argv", ["pipeline.py", "--raw", str(raw), "--output", str(tmp_path / "out")]
    )
    main()
    assert '"areaCount": 2' in capsys.readouterr().out
    runpy.run_path(
        str(Path(__file__).resolve().parents[1] / "src/pipeline.py"), run_name="__main__"
    )
    assert '"mode": "observed"' in capsys.readouterr().out


def test_rejects_overbroad_geography(raw: Path, tmp_path: Path) -> None:
    rows: list[list[object]] = [["GEO_ID", "NAME", "S1701_C03_001E", "S1701_C03_001M"]]
    for i in range(9):
        rows.append([f"1400000US12{i:09}", f"Tract 1; County {i}; Florida", 10, 2])
    write_csv(raw / POVERTY, rows)
    with pytest.raises(ValueError, match="Study area"):
        build(raw, tmp_path / "out")
