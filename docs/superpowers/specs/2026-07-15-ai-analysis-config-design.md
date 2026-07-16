# AI Analysis and Secure Configuration Design

## Summary

Add an OpenAI-compatible AI analysis feature for the currently selected stock. The backend owns all AI credentials and upstream calls. The frontend provides an administrator-protected settings dialog and a structured analysis panel with both research content and an explicit market rating.

## Goals

- Support OpenAI-compatible providers through configurable Base URL, model, and API key fields.
- Let an administrator test and update AI configuration from the application UI.
- Keep the API key out of frontend bundles, browser storage, API responses, and application logs.
- Analyze the selected stock using its quote, factor metrics, macro regime, and current macro inputs.
- Return a structured research summary, opportunities, risks, watch indicators, rating, and position range.
- Cache the latest analysis for each ticker and language to reduce cost and latency.

## Non-Goals

- Multi-turn chat or follow-up questions.
- Whole-portfolio optimization or automated order execution.
- Full analysis history and history-management screens.
- Supporting arbitrary provider-specific protocols outside the OpenAI-compatible chat-completions contract.
- Treating AI output as guaranteed financial advice.

## Architecture

### Backend modules

The backend adds three focused units:

1. **Configuration store**
   - Reads and writes the OpenAI-compatible Base URL, model, and API key.
   - Persists configuration outside release directories through `AI_CONFIG_PATH`.
   - Uses `/var/lib/stock-macro-terminal/ai_config.json` in production and a local data path during development.
   - Creates the file with mode `0600`, owned by the backend service account.
   - Never returns the plaintext API key after it has been submitted.

2. **OpenAI-compatible client**
   - Calls `<base_url>/chat/completions` with a Bearer API key.
   - Applies connection and response timeouts.
   - Requests a JSON response and converts upstream authentication, rate-limit, timeout, transport, and malformed-response errors into stable internal error categories.
   - Redacts the API key, administrator password, analysis password, authorization headers, and upstream response bodies from client-visible errors and logs.

3. **Analysis service**
   - Accepts a ticker, language, and force-refresh flag.
   - Builds the analysis context on the server from the stock snapshot/realtime quote and macro snapshot.
   - Sends a fixed system prompt and bounded structured context to the AI client.
   - Validates and normalizes the returned JSON before caching or returning it.
   - Keeps the previous valid cache entry when refresh fails.

### Frontend units

1. **AI settings dialog**
   - Opens from the existing settings control.
   - Collects Base URL, model, API key, and administrator password.
   - Shows only a masked API-key status returned by the backend.
   - An empty API-key field means “keep the existing key.”
   - Provides separate “Test connection” and “Save configuration” actions.

2. **Selected-stock AI analysis panel**
   - Adds an “AI Analysis” action to the selected-stock section.
   - Expands beneath the selected-stock metrics.
   - Shows loading, cached, refreshed, unavailable, and failure states.
   - Allows a user to request a forced refresh after a cached result is displayed.
   - Prompts for the separate analysis password before the first protected request in a page session.

3. **AI data hook**
   - Loads configuration status without requesting secrets.
   - Loads the latest cached analysis for the selected ticker.
   - Starts one analysis request per ticker at a time and ignores stale responses after the selection changes.

## Configuration Security

- `AI_ADMIN_PASSWORD` is supplied through the backend service environment and is never persisted by the application.
- `AI_ANALYSIS_PASSWORD` is a separate service-environment secret used only to authorize reading or generating AI analysis.
- Protected configuration endpoints require the password in the `X-AI-Admin-Password` request header.
- Analysis endpoints require `X-AI-Analysis-Password`; the administrator password cannot substitute for it.
- The backend compares administrator passwords with a constant-time comparison.
- The backend also compares the analysis password with a constant-time comparison and fails closed when either required server password is absent.
- The frontend keeps the administrator password and candidate API key only in dialog component memory and clears both when the dialog closes.
- The frontend keeps the analysis password only in page-session component memory. Refreshing or closing the page clears it.
- None of these secrets is written to local storage, session storage, URLs, analytics, or console logs.
- Base URLs must use `https`. `http` is accepted only for loopback hosts during local development.
- Base URLs containing embedded user credentials are rejected.
- The production configuration file is plaintext protected by operating-system ownership and mode `0600`; disk-level encryption remains an infrastructure responsibility.

## API Design

### `GET /api/ai/config/status`

Unprotected because it contains no secret.

Response:

```json
{
  "configured": true,
  "base_url": "https://api.example.com/v1",
  "model": "provider-model",
  "api_key_masked": "sk-••••••••abcd"
}
```

When no key is configured, `api_key_masked` is `null`.

### `POST /api/ai/config/test`

Requires `X-AI-Admin-Password`. Tests candidate settings without saving them. The API-key field may be omitted to test the existing saved key.

Request:

```json
{
  "base_url": "https://api.example.com/v1",
  "model": "provider-model",
  "api_key": "candidate-secret-or-null"
}
```

Response:

```json
{
  "ok": true,
  "model": "provider-model",
  "latency_ms": 420
}
```

### `PUT /api/ai/config`

Requires `X-AI-Admin-Password`. Validates all fields, atomically replaces the configuration file, and invalidates analysis cache entries generated under a different provider/model configuration. A missing or blank API key preserves the existing saved key.

### `POST /api/ai/analyze`

Requires `X-AI-Analysis-Password`.

Request:

```json
{
  "ticker": "600519",
  "lang": "zh",
  "force": false
}
```

The backend returns a valid cache entry first unless `force` is true. The same ticker and language may have only one active generation request.

### `GET /api/ai/analysis/{ticker}?lang=zh`

Requires `X-AI-Analysis-Password`. Returns the latest valid cached analysis or `404` when none exists. It never starts an upstream AI call.

## Analysis Context

The server supplies only bounded structured data:

- ticker, name, exchange, sector, price, percentage change, and quote timestamp;
- score, P/E, growth, RSI, beta, trend, and liquidity;
- macro cycle plus growth, liquidity, inflation, and external-pressure scores;
- up to 13 macro inputs with value, unit, group, and score;
- stock and macro data-source labels and timestamps.

The prompt instructs the model to use only the supplied data, label missing data, avoid inventing news or financial statements, and return the required JSON object without Markdown fences.

## Analysis Result Schema

```json
{
  "rating": "bullish",
  "position_range": {
    "min": 10,
    "max": 20
  },
  "summary": "综合研究摘要",
  "opportunities": ["机会 1"],
  "risks": ["风险 1"],
  "watchlist": [
    {
      "name": "PMI",
      "value": "50.4",
      "reason": "关注经济景气变化"
    }
  ],
  "disclaimer": "仅供研究参考，不构成投资建议"
}
```

Validation rules:

- `rating` is exactly `bullish`, `neutral`, or `bearish`.
- Position values are integers from 0 through 100, and `min <= max`.
- Summary and disclaimer are non-empty and length-bounded.
- Opportunities and risks contain one to three non-empty items each.
- Watchlist contains one to five entries with non-empty name, value, and reason fields.
- The backend supplies a localized fallback disclaimer if the model omits or changes it.

The API response also adds trusted metadata outside the model result:

```json
{
  "ticker": "600519",
  "lang": "zh",
  "model": "provider-model",
  "generated_at": "2026-07-15T08:00:00Z",
  "data_as_of": "2026-07-15T07:59:00Z",
  "cached": true,
  "analysis": {}
}
```

## Cache Behavior

- Store one latest analysis per `ticker + language`.
- Cache files live under the backend data cache directory and never contain the API key, administrator password, or analysis password.
- A normal analyze request returns the latest valid entry immediately.
- `force: true` requests a new upstream generation.
- A successful refresh atomically replaces the previous entry.
- A failed refresh returns a sanitized error and leaves the previous entry intact.
- Changing Base URL or model makes incompatible cached entries unavailable by comparing a non-secret configuration fingerprint.

## User Interface

### Settings dialog

Fields:

- Base URL
- Model
- API Key, password-masked, blank by default when a key already exists
- Administrator password

States:

- loading configuration status;
- not configured;
- configured with masked key;
- testing connection;
- connection success with latency;
- validation/authentication/upstream failure;
- saving and saved.

### AI analysis panel

Content order:

1. Rating badge and position-range summary.
2. Research summary.
3. Core opportunities.
4. Primary risks.
5. Watch indicators with current values and reasons.
6. Model, data timestamp, generation timestamp, and cache status.
7. Permanent localized investment-risk disclaimer.

The panel preserves the existing terminal visual language and becomes a single-column stack at narrow widths.

The first AI action in a page session opens a compact analysis-password prompt. A successful protected request keeps the password only in component memory for later analysis actions in that page session. An authentication failure clears it and prompts again.

## Error Handling

- Missing configuration: `409 ai_not_configured` with a UI action that opens settings.
- Invalid administrator password: `401 invalid_admin_password`.
- Missing or invalid analysis password: `401 invalid_analysis_password`.
- Invalid Base URL/model/input: `422 invalid_ai_config` or `422 invalid_analysis_request`.
- Upstream authentication failure: `502 upstream_auth_failed`.
- Upstream rate limit: `429 upstream_rate_limited` with an optional retry delay.
- Upstream timeout: `504 upstream_timeout`.
- Invalid model output: `502 invalid_ai_response`.
- Existing in-flight generation: the backend shares or rejects duplicate work with `409 analysis_in_progress`; the frontend keeps one active request per ticker.

All messages shown to normal users are localized and sanitized. Existing cached analysis remains readable during upstream outages.

## Testing

### Backend

- Configuration validation, atomic persistence, file permissions, masked status, and blank-key preservation.
- Constant-time administrator-password and analysis-password checks at the service boundary.
- No API key, administrator password, or analysis password in status, success, failure, or exception responses.
- Correct chat-completions URL, headers, request body, timeout behavior, and error mapping using a mocked HTTP transport.
- Structured-result validation for every field and boundary.
- Cache hit, language separation, force refresh, provider/model fingerprint invalidation, and failed-refresh preservation.
- API endpoint response codes for unconfigured, unauthorized, invalid, timeout, rate-limit, malformed-output, and success cases.

### Frontend

- Settings status, connection test, save, masked-key, and secret-clearing behavior.
- Analysis-password prompt, in-memory reuse, refresh clearing, authentication failure, and retry behavior.
- AI analysis idle, loading, cached, refreshed, error, and stale-selection behavior.
- Correct rendering of rating, position range, summary, opportunities, risks, watchlist, metadata, and disclaimer.
- Chinese and English copy.
- Desktop and 390 px responsive layout.

### Release verification

- Run backend tests, frontend tests, and the production frontend build.
- Verify AI configuration status, protected configuration, cached analysis, and forced analysis endpoints on the server.
- Verify `/stock-macro/` routes to the new feature while the existing `/` and `/api/` application remains unaffected.

## Deployment

- Add `AI_ADMIN_PASSWORD`, `AI_ANALYSIS_PASSWORD`, and `AI_CONFIG_PATH=/var/lib/stock-macro-terminal/ai_config.json` to the `stock-macro-terminal.service` environment.
- Create `/var/lib/stock-macro-terminal` owned by the `stockmacro` service account with restrictive directory permissions.
- Do not place provider credentials in Git, frontend environment variables, Nginx configuration, shell history, or deployment archives.
- Deploy backend and frontend together because the new UI depends on the new AI endpoints.
- Keep the existing `/stock-macro/` Nginx prefix and the old application routes unchanged.
