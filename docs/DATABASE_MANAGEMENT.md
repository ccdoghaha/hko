# Database management

The archive: schema, write path, retention, checkpointing, backup, and how to
query it. All figures are measured on this machine.

---

## 1. Why an archive exists

The serving path caches the latest reading and discards the previous one. That is
correct for displaying the weather and useless for everything a service is asked
*afterwards*:

- "Why was a no-go issued at 14:00 yesterday?"
- "How well did the wind field do against what actually happened?"
- "Has the estimator selection been drifting?"

Those are questions about history, so history has to be kept. The archive is
append-only and sits entirely off the serving path — a display request never
waits on a write.

**Engine:** `node:sqlite`, Node 22's built-in SQLite. Chosen so the project stays
at zero npm dependencies. It is marked experimental upstream, so the store
**degrades to a no-op** on a Node without it rather than taking the service down.

**Location:** `.cache/archive.db` (gitignored, like the rest of `.cache`).

---

## 2. Schema

Version 1. `schema_version` holds the current version and is checked on open; a
mismatch **refuses to open** rather than guessing.

### `observation` — surface readings

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `observed_at` | TEXT | ISO 8601, **the observation's own time**, not the stored time |
| `station_id` | TEXT | from the station table, or the raw name if unmatched |
| `station_name` | TEXT | as reported |
| `lat`, `lon` | REAL | null when the station could not be resolved |
| `temperature_c`, `humidity_pct`, `rainfall_mm` | REAL | null when not reported |
| `source` | TEXT | `rhrread` |
| `recorded_at` | TEXT | when this row was written |

Unique on `(observed_at, station_id, source)`.

### `wind_observation`

Same shape, plus `direction_deg`, `speed_kmh`, `gust_kmh`, and
`calm` (INTEGER 0/1). Unique on `(observed_at, station_id)`.

Stations that had to be **dropped** from the analysis are still archived — a
station reporting a speed with no resolvable direction is a sensor fault worth
seeing, and discarding it would hide the fault.

### `aviation_report`

| Column | Notes |
|---|---|
| `kind` | `METAR` or `TAF` |
| `station` | e.g. `VHHH` |
| `issued_at` | from the report itself |
| `raw` | **the original text, verbatim** |
| `decoded` | JSON of the decoded structure |

Unique on `(kind, station, issued_at, raw)`.

Keeping the raw text is the point: if a decoder is ever wrong, the original is
still on disk to re-decode and re-score. A store that kept only decoded fields
would have made a decoder bug unrecoverable.

### `analysis_run`

One row per analysis: `selected_estimator`, `correction_helped`, `rmse`,
`field_min/max/mean`, `station` count, grid dimensions.

This is what makes estimator drift visible. If `selected_estimator` changes and
stays changed, something real has changed in the network.

### `lae_assessment`

`verdict`, `summary`, and `factors` / `blockers` / `cautions` as JSON.

This is the audit trail. "Why no-go?" is answered by reading the row, including
the full factor list with each status — not just the final verdict.

### Indexes

```
observation(observed_at)                observation(station_id, observed_at)
wind_observation(observed_at)           wind_observation(station_id, observed_at)
aviation_report(kind, station, issued_at)
analysis_run(generated_at)              lae_assessment(generated_at)
lae_assessment(verdict, generated_at)
```

The `(station_id, observed_at)` composites serve the time-series queries; the
`generated_at` ones serve the "recent N" listings.

---

## 3. Write path

### Archive on fetch, not on request

Observations are recorded inside `getData`, **only on a genuine upstream fetch**.
The cache absorbs repeat polls, so the archive gets one row per upstream update
rather than one per request. The poller runs every 5 minutes and the feed updates
every 10, so without the cache the archive would be half duplicates.

### Idempotency is the normal case, not an edge case

Every write is `INSERT OR IGNORE` against a natural key. Re-recording the same
report inserts nothing. This matters because the poll rate deliberately exceeds
the update rate.

### One transaction per report

Batches are wrapped in `BEGIN`/`COMMIT`. Without it, each statement is its own
implicit transaction: recording 26 observations meant 26 commits, 26 WAL-frame
flushes and 26 fsyncs.

**Measured effect:**

| | WAL after comparable activity |
|---|---|
| per-statement transactions | **1,763,392 bytes** |
| one transaction per report | **276,072 bytes** |

A 6.4× reduction for one `BEGIN`/`COMMIT`. This is the single highest-value line
of database code in the project.

### Failures never propagate

Writes are wrapped so a database error cannot break the analysis or the page.
Errors increment a counter and set `lastError`, both visible at `/api/db/status`.

---

## 4. Retention

Default **90 days**, configurable via `RETENTION_DAYS`. Pruning runs on a **24-hour
timer, never in a request path** — a `DELETE` that scans five tables has no
business inside a response. The timer is `unref()`'d so it never holds the
process open.

```
DELETE FROM <table> WHERE <time column> IS NOT NULL AND <time column> < ?
```

then `PRAGMA incremental_vacuum`.

### A guard that matters

A retention of **zero or negative computes a cutoff in the future and deletes the
entire archive.** Since the value comes from configuration and configuration gets
typos, `prune()` refuses any value below 1 and returns an error rather than
obeying:

```
prune({ days: -1 })  ->  { deleted: 0, error: "refusing to prune with retention -1 days (must be >= 1)" }
```

`check-db.js` asserts this, and asserts that the refused call deleted nothing.

---

## 5. WAL and checkpointing

`journal_mode = WAL` so a reader (a `/api/history` query) never blocks the writer
(the next observation landing). `synchronous = NORMAL` — the right trade for an
append-only archive that can lose its last few seconds on a hard power cut
without corrupting the file.

WAL grows until it checkpoints. **Measured:**

| Stage | `archive.db` | `archive.db-wal` |
|---|---|---|
| fresh, after startup + 116 writes | 4 KB | 276 KB |
| after `PRAGMA wal_checkpoint(TRUNCATE)` | 94 KB | 8 KB |

A large WAL against a tiny `.db` is normal and not a problem — it means the data
is in the log and has not been folded back yet. `/api/db/maintain` checkpoints
and truncates on demand, and graceful shutdown (`SIGINT`/`SIGTERM`) checkpoints
before closing.

---

## 6. Backup and restore

### Backup

`VACUUM INTO` produces a consistent copy **while the service keeps serving** — no
file copy race, no need to stop the process.

```
curl 'http://localhost:8787/api/db/maintain'          # checkpoint first
```

```js
store.backupTo('/backup/archive-2026-09-14.db')       // then snapshot
```

Or directly against a stopped service, copy all three files — `archive.db`,
`archive.db-wal`, `archive.db-shm`. Copying only the `.db` while WAL data is
outstanding loses recent rows.

### Restore

Stop the service, replace `archive.db` (and delete any stale `-wal`/`-shm`), start.
The schema version is checked on open; a mismatch refuses rather than corrupting.

### Verification

`PRAGMA integrity_check` via `/api/db/maintain`, or `store.maintain()`.

---

## 7. Migration

There is no migration framework — deliberately, at this size. The rule is:

1. Bump `SCHEMA_VERSION` in `lib/store.js`.
2. Add the migration step.
3. A version mismatch **refuses to open** with a clear error rather than
   running against an unexpected schema.

For a change that only adds a table or index, `CREATE TABLE IF NOT EXISTS` in the
schema block handles it. For a column change, the accepted approach at this scale
is: export with `store.stationSeries`/`recentAssessments`, drop, recreate, reload.

---

## 8. Monitoring

`GET /api/db/status`:

```json
{ "available": true, "bytes": 94208, "writes": 116, "errors": 0,
  "lastError": null, "openedAt": "2026-09-14T07:53:00.000Z",
  "tables": { "observation": 26, "wind_observation": 30, "aviation_report": 2,
              "analysis_run": 1, "lae_assessment": 2 },
  "observationRange": { "oldest": "...", "newest": "..." } }
```

| Signal | Meaning |
|---|---|
| `available: false` | `node:sqlite` missing — display still works, history is not being kept |
| `errors` rising | writes failing; check `lastError` |
| `lastError` | the specific failure |
| table counts flat while the service runs | nothing is being recorded — check the fetch path |
| `bytes` growing without bound | retention is not running |
| `observationRange.oldest` not advancing | prune is not running |

---

## 9. Query cookbook

```bash
# the audit trail — why was a verdict issued?
curl '/api/history?kind=lae&limit=20'

# estimator drift
curl '/api/history?kind=analysis&limit=50'

# a station's temperature history
curl '/api/history?kind=observation&station=HKO&limit=500'
curl '/api/history?kind=observation&station=HKO&from=2026-09-01&to=2026-09-15'

# a station's wind history
curl '/api/history?kind=wind&station=HKP&limit=500'
```

Direct SQL against a copy is fine for anything the API does not expose:

```sql
-- how often has each verdict been issued?
SELECT verdict, COUNT(*) FROM lae_assessment GROUP BY verdict ORDER BY 2 DESC;

-- which factor blocks most often?
SELECT json_extract(value, '$.key') AS factor, COUNT(*)
FROM lae_assessment, json_each(lae_assessment.factors)
WHERE json_extract(value, '$.status') = 'NO-GO'
GROUP BY 1 ORDER BY 2 DESC;

-- stations that most often report a wind speed with no direction
SELECT station_name, COUNT(*) FROM wind_observation
WHERE direction_deg IS NULL AND speed_kmh > 0 GROUP BY 1 ORDER BY 2 DESC;

-- estimator selection over time
SELECT date(generated_at), selected_estimator, ROUND(AVG(rmse),3)
FROM analysis_run GROUP BY 1, 2 ORDER BY 1 DESC;
```

SQLite's JSON1 extension is compiled in, so the `factors` blob is queryable
without a separate table. That was a deliberate trade: a normalised
`assessment_factor` table would be more relational, but the factor list is
always read as a whole and never joined.

---

## 10. Limitations

1. **`node:sqlite` is experimental.** Upstream may change it. The no-op fallback
   means that would disable history, not break the service — but a production
   deployment should pin the Node version.
2. **No schema migration framework.** Adequate at this size; it would not be at
   ten tables with foreign keys.
3. **`factors` is a JSON blob, not normalised.** Queryable via JSON1, but no
   referential integrity on factor keys.
4. **Single-writer.** SQLite serialises writes. Fine for one process; a
   multi-process deployment would need the archive behind a service, or a
   client/server database.
5. **No off-site backup.** `VACUUM INTO` writes locally; shipping the copy
   somewhere else is the operator's job.
6. **Retention is time-based only.** No size cap, so a sudden increase in
   ingest rate would grow the archive until the time window caught up.
7. **No observation quality control.** The archive faithfully records whatever
   the feed said, including sensor errors — which is arguably correct for an
   archive, but means queries must not assume the data is clean.
8. **`issued_at` may be null** for a report that carries no parseable timestamp;
   such rows are excluded from time-based pruning to avoid deleting them
   immediately.
