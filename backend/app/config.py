import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT_DIR / "data" / "cache"
SNAPSHOT_PATH = CACHE_DIR / "macro_snapshot.json"
AI_CONFIG_PATH = Path(os.getenv("AI_CONFIG_PATH", CACHE_DIR / "ai_config.json"))
AI_ANALYSIS_CACHE_DIR = Path(os.getenv("AI_ANALYSIS_CACHE_DIR", CACHE_DIR / "ai_analysis"))
AI_ADMIN_PASSWORD = os.getenv("AI_ADMIN_PASSWORD", "")
AI_ANALYSIS_PASSWORD = os.getenv("AI_ANALYSIS_PASSWORD", "")
AI_CONNECT_TIMEOUT_SECONDS = 5.0
AI_RESPONSE_TIMEOUT_SECONDS = 45.0

CORS_ORIGINS = [
    "http://127.0.0.1:5173",
    "http://localhost:5173",
]

AUTH_DB_PATH = Path(os.getenv("AUTH_DB_PATH", CACHE_DIR / "auth.sqlite3"))
AUTH_COOKIE_NAME = "quantdesk_session"
AUTH_COOKIE_PATH = os.getenv("AUTH_COOKIE_PATH", "/")
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"
AUTH_ALLOWED_ORIGINS = tuple(
    filter(None, os.getenv("AUTH_ALLOWED_ORIGINS", ",".join(CORS_ORIGINS)).split(","))
)
AUTH_SESSION_DAYS = 30
