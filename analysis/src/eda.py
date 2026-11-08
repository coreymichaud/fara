"""Generate and execute one aggregate-only EDA notebook for each used source."""

from __future__ import annotations

import argparse
from pathlib import Path

import nbformat
from nbclient import NotebookClient

from pipeline import DISTANCE, GENERAL, GEOMETRY, POVERTY, RETAILERS, ROOT, SNAP

SOURCES = {
    POVERTY: ["S1701_C03_001E", "S1701_C03_001M"],
    SNAP: ["S2201_C04_001E"],
    GENERAL: ["POP2020", "OHU2020", "PovertyRate"],
    DISTANCE: ["SD_SRAM_lapop1share"],
    RETAILERS: ["Longitude", "Latitude"],
    GEOMETRY: [],
}


def build_notebooks(root: Path, execute: bool = True) -> list[Path]:
    output = root / "analysis/notebooks"
    output.mkdir(parents=True, exist_ok=True)
    paths: list[Path] = []
    setup = """from pathlib import Path
import json
import pandas as pd
import matplotlib.pyplot as plt
ROOT = next(p for p in [Path.cwd(), *Path.cwd().parents] if (p/'public/data/manifest.json').exists())
manifest = json.loads((ROOT/'public/data/manifest.json').read_text())
areas = pd.read_json(ROOT/'public/data/areas.json')
counties = {c + ' County' for c in manifest['geography']}
print('Mode:', manifest['mode'], '| Version:', manifest['datasetVersion'])
"""
    for index, (source, columns) in enumerate(SOURCES.items(), 1):
        cells = [
            nbformat.v4.new_markdown_cell(
                f"# {source}\n\nExecuted source EDA. Only aggregate outputs are retained. Public inputs remain local. No causal inference or attendance model is used."
            ),
            nbformat.v4.new_code_cell(setup),
        ]
        if source == GEOMETRY:
            code = f"""import shapefile
from zipfile import ZipFile
from shapely.geometry import shape
from pyproj import CRS
with ZipFile(ROOT/'data/raw/{source}') as archive:
    prj = next(n for n in archive.namelist() if n.endswith('.prj'))
    print('Source CRS:', CRS.from_wkt(archive.read(prj).decode()).name)
with shapefile.Reader(str(ROOT/'data/raw/{source}')) as reader:
    geometries = [shape(r.shape.__geo_interface__) for r in reader.iterShapeRecords() if r.record.as_dict()['GEOID'] in set(areas.id.astype(str))]
print('Matched tracts:', len(geometries), '| Invalid:', sum(not g.is_valid for g in geometries))
fig, ax = plt.subplots(figsize=(8,6))
for g in geometries:
    parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    for part in parts:
        x, y = part.exterior.xy
        ax.plot(x,y,linewidth=.4,color='#385981')
ax.set(xlabel='Longitude (NAD83 degrees)', ylabel='Latitude (NAD83 degrees)', title='Supplied-study-area tract boundary coverage')
plt.show()
"""
        else:
            unit = {GENERAL: "people, 2020 Census", RETAILERS: "WGS84 longitude degrees"}.get(
                source, "percent"
            )
            observation = "Retailer records" if source == RETAILERS else "Census tracts"
            encoding = "cp1252" if source in {GENERAL, DISTANCE} else "utf-8-sig"
            code = f"df = pd.read_csv(ROOT/'data/raw/{source}', dtype=str, encoding='{encoding}')\nprint('National/multiregion rows before filtering:', len(df))\n"
            if source in {POVERTY, SNAP}:
                code += "df = df[df.GEO_ID.str.startswith('1400000US12', na=False)].copy()\n"
            elif source in {GENERAL, DISTANCE}:
                code += "df = df[(df.State == 'Florida') & df.County20.isin(counties)].copy()\n"
            else:
                code += "df = df[(df.State == 'FL') & df.County.isin({c.removesuffix(' County').upper() for c in counties})].copy()\nprint('Known coordinate anomaly 546413:', int((df.Record_ID == '546413').sum()))\n"
            code += f"""columns = {columns!r}
values = df[columns].apply(pd.to_numeric, errors='coerce')
print('Study-area rows:', len(df))
display(values.isna().sum().rename('missing'))
display(values.describe())
q1, q3 = values.quantile(.25), values.quantile(.75)
display(((values < q1 - 1.5*(q3-q1)) | (values > q3 + 1.5*(q3-q1))).sum().rename('IQR outliers; inspect, do not delete automatically'))
fig, ax = plt.subplots(figsize=(7,3))
values[columns[0]].dropna().hist(ax=ax,bins=20,color='#385981',grid=False)
ax.set(xlabel='{columns[0]} ({unit})',ylabel='{observation}',title='Study-area source distribution')
plt.show()
"""
            if source in {POVERTY, SNAP, DISTANCE}:
                x, y = ("snap", "poverty") if source == SNAP else ("poverty", "lowAccess")
                code += f"""fig, ax = plt.subplots(figsize=(6,4))
areas.plot.scatter(x='{x}',y='{y}',ax=ax,color='#385981',alpha=.45,s=12)
ax.set(xlabel='{x} (%)',ylabel='{y} (%)',title='Aligned tract indicators; association is not causation')
plt.show()
"""
        cells += [
            nbformat.v4.new_code_cell(code),
            nbformat.v4.new_markdown_cell(
                "## Interpretation and limitations\n\nThe displayed row counts and missingness are observed from these local files. Numeric outliers are retained unless a documented source error exists. Statistical geography is the census tract; retailer locations are points, not service coverage. Estimates have mixed vintages and cannot establish individual need, travel time, attendance, or causal impact. ACS poverty/SNAP sentinel values remain missing. Tract-level associations do not describe individual households. The 2020 geometry joins by exact GEOID, never by tract label. See `docs/data_audit.md` and `docs/transformations.md` for exclusions and lineage."
            ),
        ]
        notebook = nbformat.v4.new_notebook(
            cells=cells,
            metadata={
                "kernelspec": {
                    "display_name": "Python 3 (uv)",
                    "language": "python",
                    "name": "python3",
                }
            },
        )
        if execute:
            NotebookClient(
                notebook, timeout=180, resources={"metadata": {"path": str(root)}}
            ).execute()
        path = output / f"{index:02d}_{Path(source).stem.replace(' ', '_')}.ipynb"
        nbformat.write(notebook, path)
        paths.append(path)
    return paths


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--no-execute", action="store_true", help="Generate notebook source only")
    args = parser.parse_args()
    for path in build_notebooks(ROOT, execute=not args.no_execute):
        print(path.relative_to(ROOT))


if __name__ == "__main__":
    main()
