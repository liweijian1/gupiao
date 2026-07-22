from __future__ import annotations

from importlib import import_module
from pathlib import Path


class QlibUnavailable(RuntimeError):
    """Raised when the optional Qlib runtime cannot be initialized."""


def initialize_qlib(provider_uri: Path) -> str:
    try:
        qlib = import_module("qlib")
    except ModuleNotFoundError as exc:
        raise QlibUnavailable(
            "Qlib is unavailable in this Python runtime; use the server CPython 3.11 environment"
        ) from exc
    try:
        qlib.init(provider_uri=str(provider_uri), region="cn")
    except Exception as exc:  # noqa: BLE001 - expose a safe configuration error to the API layer.
        raise QlibUnavailable(f"Qlib initialization failed: {exc}") from exc
    return str(getattr(qlib, "__version__", "unknown"))
