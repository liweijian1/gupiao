from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT_DIR / "data" / "cache"
SNAPSHOT_PATH = CACHE_DIR / "macro_snapshot.json"

CORS_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]
