# Watchlist Realtime and History Resilience Design

## Goal

Keep saved A-share prices current while the watchlist is visible, and prevent transient historical-data provider errors from exposing raw backend exceptions in the chart workspace.

## Watchlist Realtime Updates

The authenticated watchlist details endpoint continues to return the saved order and static fallback metadata. The frontend adds a watchlist quote refresh hook that polls the existing realtime endpoint for every eligible saved A-share in a bounded batch every 15 seconds while the application is open. The fetched quotes are merged into `watchlist.stocks` before the ranking table renders; each quote preserves the saved stock name, score, and sector while replacing price, change, OHLC, volume, amount, turnover, source, and timestamp.

Requests use one `AbortController` per polling cycle. A failed quote leaves the most recent valid saved quote visible and does not erase other watchlist rows. Non-A-share saved rows remain unchanged. Polling stops on logout and component cleanup.

## Historical Chart Resilience

The backend history endpoint keeps returning cached daily bars when AkShare fails after a cache exists. If no cache exists, it returns the stable `history_unavailable` error code without leaking the upstream exception string. The frontend maps that code to a localized unavailable state with retry, states that the provider is temporarily unavailable, and never renders the server exception text.

## Verification

- A frontend test proves multiple eligible watchlist rows receive realtime quote overlays without losing saved order or non-quote fields.
- A frontend test proves a failed polling cycle retains the prior visible rows.
- Backend route tests prove an unavailable history provider returns only the stable error code and generic localized-safe message.
- Existing account/watchlist, realtime quote, history service, frontend suite, and production build continue to pass.
