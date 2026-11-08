"""Source-specific readers. Raw files are read-only; missing values stay missing."""

from __future__ import annotations

from pathlib import Path

import pandas as pd

ACS_MISSING = {
    "",
    "-",
    "**",
    "***",
    "*****",
    "N",
    "(X)",
    "null",
    "-666666666",
    "-999999999",
    "-888888888",
}


def require_columns(frame: pd.DataFrame, columns: list[str], source: str) -> None:
    missing = set(columns) - set(frame.columns)
    if missing:
        raise ValueError(f"{source}: missing columns {sorted(missing)}")


def numeric(series: pd.Series[str], source: str) -> pd.Series[float]:
    cleaned = series.fillna("").astype(str).str.strip().replace(list(ACS_MISSING), None)
    try:
        return pd.to_numeric(cleaned, errors="raise").astype(float)
    except (ValueError, TypeError) as exc:
        raise ValueError(f"{source}: invalid numeric value") from exc


def unique_ids(frame: pd.DataFrame, source: str) -> None:
    if frame.empty or frame.id.duplicated().any() or not frame.id.str.fullmatch(r"\d{11}").all():
        raise ValueError(f"{source}: empty data, duplicate or invalid tract IDs")


def load_acs(path: Path, fields: dict[str, str]) -> pd.DataFrame:
    frame = pd.read_csv(path, dtype=str, encoding="utf-8-sig", keep_default_na=False)
    require_columns(frame, ["GEO_ID", "NAME", *fields], path.name)
    # Census CSV exports have a second, human-readable header row.
    frame = frame[frame.GEO_ID != "Geography"].copy()
    if not frame.GEO_ID.str.fullmatch(r"1400000US\d{11}").all():
        raise ValueError(f"{path.name}: expected census-tract GEO_IDs")
    frame["id"] = frame.GEO_ID.str.removeprefix("1400000US")
    frame = frame[frame.id.str.startswith("12")].copy()
    unique_ids(frame, path.name)
    frame["county"] = frame.NAME.str.split(";").str[1].str.strip()
    for original, name in fields.items():
        frame[name] = numeric(frame[original], path.name)
    return frame[["id", "NAME", "county", *fields.values()]].rename(columns={"NAME": "label"})


def load_usda(path: Path, counties: set[str], fields: dict[str, str]) -> pd.DataFrame:
    # USDA's national file contains Latin-1 county names. Read IDs as strings.
    frame = pd.read_csv(path, dtype=str, encoding="cp1252", keep_default_na=False)
    require_columns(frame, ["CensusTract20", "State", "County20", *fields], path.name)
    frame = frame[(frame.State == "Florida") & frame.County20.isin(counties)].copy()
    frame["id"] = frame.CensusTract20.str.zfill(11)
    unique_ids(frame, path.name)
    for original, name in fields.items():
        frame[name] = numeric(frame[original], path.name)
    return frame[["id", *fields.values()]]


def load_retailers(path: Path, counties: set[str]) -> pd.DataFrame:
    frame = pd.read_csv(path, dtype=str, keep_default_na=False)
    require_columns(
        frame,
        ["State", "County", "Record_ID", "Store_Name", "Longitude", "Latitude", "Store_Type"],
        path.name,
    )
    normalized = {c.removesuffix(" County").upper() for c in counties}
    frame = frame[(frame.State == "FL") & frame.County.isin(normalized)].copy()
    if frame.empty or frame.Record_ID.duplicated().any():
        raise ValueError("Retailer data empty or duplicate Record_ID")
    for col in ["Longitude", "Latitude"]:
        frame[col] = numeric(frame[col], path.name)
    # Supplied record 546413 says Osceola but is at 30.118788 N, outside the study area.
    # Quarantine the known source error; do not guess replacement coordinates.
    frame = frame[frame.Record_ID != "546413"].copy()
    if not (frame.Longitude.between(-83, -80) & frame.Latitude.between(27, 30)).all():
        raise ValueError("Retailer coordinates outside Central Florida or missing")
    return frame[["Record_ID", "Store_Name", "Store_Type", "Longitude", "Latitude"]]
