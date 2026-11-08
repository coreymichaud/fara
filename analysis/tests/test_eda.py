import runpy
import sys
from pathlib import Path

import nbformat
import pytest

import eda
import pipeline


def test_notebook_generation_and_execution_boundary(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    executed: list[object] = []

    class Kernel:
        def __init__(self, notebook: object, **kwargs: object) -> None:
            self.notebook = notebook
            assert kwargs["timeout"] == 180

        def execute(self) -> None:
            executed.append(self.notebook)

    monkeypatch.setattr(eda, "NotebookClient", Kernel)
    paths = eda.build_notebooks(tmp_path)
    assert len(paths) == len(executed) == 6
    for path in paths:
        notebook = nbformat.read(path, as_version=4)
        assert len(notebook.cells) == 4
        assert "Interpretation and limitations" in notebook.cells[-1].source
        assert "manifest" in notebook.cells[1].source
    assert "IQR outliers" in nbformat.read(paths[0], as_version=4).cells[2].source
    assert "Source CRS" in nbformat.read(paths[-1], as_version=4).cells[2].source
    monkeypatch.setattr(eda, "ROOT", tmp_path)
    monkeypatch.setattr(sys, "argv", ["eda.py", "--no-execute"])
    eda.main()
    assert "analysis/notebooks" in capsys.readouterr().out
    assert len(executed) == 6
    monkeypatch.setattr(pipeline, "ROOT", tmp_path)
    runpy.run_path(str(Path(eda.__file__)), run_name="__main__")
    assert "analysis/notebooks" in capsys.readouterr().out
