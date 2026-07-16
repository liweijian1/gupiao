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

## AI configuration

The AI endpoints use an OpenAI-compatible chat completions provider. Configure
two independent server-side passwords before starting Uvicorn:

```text
AI_ADMIN_PASSWORD=<administrator configuration password>
AI_ANALYSIS_PASSWORD=<separate analysis access password>
AI_CONFIG_PATH=/var/lib/stock-macro-terminal/ai_config.json
AI_ANALYSIS_CACHE_DIR=/var/lib/stock-macro-terminal/analysis-cache
```

`AI_ADMIN_PASSWORD` protects provider test/save operations.
`AI_ANALYSIS_PASSWORD` protects analysis generation and cache reads. Empty
passwords fail closed. The provider API key is written atomically to
`AI_CONFIG_PATH` with mode `0600`; keep its parent directory private and owned by
the service account. Do not put the API key or either password in Git or frontend
environment variables.

The provider Base URL must be HTTPS unless it points to `127.0.0.1`, `localhost`,
or `::1`, and should include its API version prefix (for example,
`https://api.openai.com/v1`).

## Endpoints

- `GET /health`
- `GET /api/macro/indicators`
- `GET /api/macro/snapshot`
- `GET /api/macro/snapshot?force=true`
- `GET /api/macro/series`
- `GET /api/macro/scores`
- `POST /api/macro/refresh`
- `GET /api/ai/config/status` (masked status only)
- `POST /api/ai/config/test` (`X-AI-Admin-Password`)
- `PUT /api/ai/config` (`X-AI-Admin-Password`)
- `POST /api/ai/analyze` (`X-AI-Analysis-Password`)
- `GET /api/ai/analysis/{ticker}?lang=zh` (`X-AI-Analysis-Password`)

AI analysis is built only from the selected stock snapshot, factor metrics, and
the current macro snapshot. The latest validated result is cached per ticker and
language, scoped to the configured provider URL and model. Forced refreshes do
not delete the previous cache entry when the provider fails.

## Frontend

Set the frontend API base if needed:

```bash
cd /Users/doususu/movie/stock-macro-terminal/frontend
VITE_API_BASE_URL=http://127.0.0.1:8000 npm run dev
```

If the backend is not running or AkShare fails, the current frontend keeps its prototype fallback data.
