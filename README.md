# sentinel-dashboard

TypeScript (Node, no framework) alert API and live dashboard. Part of the **Sentinel** system:

```
GitHub webhook ──▶ sentinel-webhook-receiver (Java) ──▶ sentinel-triage (Python) ──▶ sentinel-dashboard (TypeScript)
```

## Endpoints

| Method | Path | Notes |
|---|---|---|
| `GET` | `/` | Live dashboard (polls every 5s, filter by minimum severity) |
| `GET` | `/api/alerts?min=high` | Newest first |
| `POST` | `/api/alerts` | Ingest an alert; requires `Authorization: Bearer $DASHBOARD_TOKEN` when set |
| `GET` | `/health` | Liveness |

## Run

```bash
npm install
npm run build
DASHBOARD_TOKEN=devtoken PORT=3000 npm start
```

## Test

```bash
npm test
```

## Design notes

- **Validate at the boundary.** Incoming alerts are untrusted JSON; `parseAlert` enforces types, clamps the score, caps string lengths, and rejects unknown severities.
- **No `innerHTML`.** The page builds the DOM with `textContent`, so a malicious event title can't inject script.
- **Timing-safe token check**, 64 KB body cap, `nosniff` and `no-store` headers.
- The in-memory store is bounded and de-duplicates by id. Swap it for SQLite or Postgres for production.

## Ideas to extend

- Server-sent events instead of polling
- Persist alerts, add acknowledge / assign actions
- Render an agent-activity view (which automated actors touched which repos), a growing need as more work is delegated to agents

## License

MIT
