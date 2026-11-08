"""Tiny invented fixtures, never copied from the supplied raw files."""

import csv
from pathlib import Path
from zipfile import ZipFile

import pytest
import shapefile
from pyproj import CRS

from pipeline import DISTANCE, GENERAL, GEOMETRY, POVERTY, RETAILERS, SNAP


def write_csv(path: Path, rows: list[list[object]]) -> None:
    with path.open("w", newline="", encoding="utf-8") as stream:
        csv.writer(stream).writerows(rows)


def write_shapes(path: Path, invalid: bool = False) -> None:
    base = path.parent / "tiny"
    with shapefile.Writer(str(base)) as writer:
        writer.field("GEOID", "C")
        for i, geoid in enumerate(["12069000100", "12095000100"]):
            x, y = -81.7 + i * 0.1, 28.5
            ring = [[x, y], [x, y + 0.02], [x + 0.02, y + 0.02], [x + 0.02, y], [x, y]]
            if invalid:
                ring = [[x, y], [x + 0.02, y + 0.02], [x, y + 0.02], [x + 0.02, y], [x, y]]
            writer.poly([ring])
            writer.record(geoid)
    base.with_suffix(".prj").write_text(CRS.from_epsg(4269).to_wkt())
    with ZipFile(path, "w") as archive:
        for suffix in [".shp", ".shx", ".dbf", ".prj"]:
            archive.write(base.with_suffix(suffix), "tiny" + suffix)


@pytest.fixture
def raw(tmp_path: Path) -> Path:
    target = tmp_path / "raw"
    target.mkdir()
    acs = [
        ["GEO_ID", "NAME", "S1701_C03_001E", "S1701_C03_001M"],
        ["Geography", "Geographic name", "Estimate", "MOE"],
        ["1400000US12069000100", "Census Tract 1; Lake County; Florida", 10, 2],
        ["1400000US12095000100", "Census Tract 1; Orange County; Florida", 30, 3],
    ]
    write_csv(target / POVERTY, acs)
    write_csv(
        target / SNAP,
        [
            ["GEO_ID", "NAME", "S2201_C04_001E"],
            ["1400000US12069000100", "Census Tract 1; Lake County; Florida", 5],
            ["1400000US12095000100", "Census Tract 1; Orange County; Florida", 15],
        ],
    )
    write_csv(
        target / GENERAL,
        [
            ["CensusTract20", "State", "County20", "POP2020", "OHU2020", "Urban"],
            ["12069000100", "Florida", "Lake County", 200, 100, 0],
            ["12095000100", "Florida", "Orange County", 600, 300, 1],
        ],
    )
    write_csv(
        target / DISTANCE,
        [
            ["CensusTract20", "State", "County20", "SD_SRAM_lapop1share"],
            ["12069000100", "Florida", "Lake County", 20],
            ["12095000100", "Florida", "Orange County", 80],
        ],
    )
    write_csv(
        target / RETAILERS,
        [
            ["Record_ID", "Store_Name", "Store_Type", "State", "County", "Longitude", "Latitude"],
            ["1", "Invented test shop", "Convenience Store", "FL", "ORANGE", -81.6, 28.5],
        ],
    )
    write_shapes(target / GEOMETRY)
    return target
