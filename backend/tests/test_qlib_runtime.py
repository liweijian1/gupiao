import pytest

from app.research.qlib_runtime import QlibUnavailable, initialize_qlib


def test_qlib_runtime_reports_a_clear_error_when_dependency_is_unavailable(monkeypatch, tmp_path):
    import app.research.qlib_runtime as runtime

    def missing_import(_name):
        raise ModuleNotFoundError("qlib")

    monkeypatch.setattr(runtime, "import_module", missing_import)

    with pytest.raises(QlibUnavailable, match="Qlib is unavailable"):
        initialize_qlib(tmp_path)
