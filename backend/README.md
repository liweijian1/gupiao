# QuantDesk Macro API

Python backend for the stock analysis prototype. It fetches China macro data with AkShare, normalizes each series, calculates macro scores, caches the snapshot, and exposes frontend API endpoints.

## Setup

```bash
cd /Users/doususu/movie/stock-macro-terminal/backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/pip install -r requirements-akshare.txt
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

`requirements.txt` contains the runnable API dependencies. `requirements-akshare.txt`
adds AkShare. Use the Homebrew Python 3.14 environment on this machine for real
AkShare fetching. Without AkShare installed, the API still runs and returns
fallback prototype data with `source: "mock"`.

## Endpoints

- `GET /health`
- `GET /api/macro/indicators`
- `GET /api/macro/snapshot`
- `GET /api/macro/snapshot?force=true`
- `GET /api/macro/series`
- `GET /api/macro/scores`
- `POST /api/macro/refresh`

## Frontend

Set the frontend API base if needed:

```bash
cd /Users/doususu/movie/stock-macro-terminal/frontend
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

If the backend is not running or AkShare fails, the current frontend keeps its prototype fallback data.
