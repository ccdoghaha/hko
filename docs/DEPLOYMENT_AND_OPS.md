# Deployment and operations

Duty (c): running and maintaining the service. Every figure below is **measured
on this machine**, not estimated — commands to reproduce them are given.

---

## 1. Resource profile (measured)

| Property | Value | How measured |
|---|---|---|
| Runtime | Node v22.23.0 | `node -v` |
| Dependencies | **0** — no `package.json`, no build step | — |
| Source | 6,185 lines (`server.js`, `lib/`, `public/`, `scripts/`) | `wc -l` |
| Process RSS | ~73 MB | `tasklist` / `ps` on the live server |
| Repo on disk | 382 KB (excluding `.cache`) | `du -sh` |
| `.cache` | 2.1 MB — icons 332 KB, terrain 1.7 MB (48 tiles) | `du -sh` |
| In-memory cache | 7 entries, ~99 KB | `GET /api/status` |
| Full page sweep payload | 305 KB (`app.js` alone is 89 KB) | `node scripts/bench.js` |

Response latency (median of 3, loopback):

| Endpoint | Cached | Forced recompute |
|---|---|---|
| static assets | 4–16 ms | — |
| `/api/home` (6 upstream feeds) | 1–16 ms | — |
| `/api/status`, `/api/lunar`, `/api/news` | ~16 ms | — |
| `/api/analysis` | 15 ms | **146 ms** |
| `/api/wind` (vector field, 62,640 cells × 2) | 94 ms | 96 ms |
| `/api/lae` (wind + METAR + TAF) | 94 ms | 93 ms |

**First-ever terrain build** is the one expensive operation: ~**45 s**, fetching
48 tiles over the network. It is then cached on disk permanently, and the mosaic
is rebuilt from disk in ~**0.2 s**. The 2.4 s on a cold `/api/analysis` is that
rebuild plus the void fill, not the interpolation.

Practical consequence: a fresh container takes ~45 s to serve its first analysis
request. Size the health-check `start-period` accordingly (the Dockerfile uses
10 s, which is enough because `/api/status` does not touch the terrain — it will
report healthy while the first analysis is still warming).

---

## 2. Deployment

### Direct

```
node server.js 8787          # HOST defaults to 127.0.0.1
```

Windows: `start.bat`. POSIX: `./start.sh`. Both prompt for a port.

### systemd

```ini
[Unit]
Description=HKO local weather gateway
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=hko
WorkingDirectory=/opt/hko-local
Environment=PORT=8787
Environment=HOST=127.0.0.1
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5

# The service writes only to .cache
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/hko-local/.cache
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

`Restart=on-failure` matters: the service deliberately exits non-zero on
`EADDRINUSE` rather than limping, so a restart loop is visible rather than silent.

### Docker

```
docker build -t hko-local .
docker run -d --name hko-local \
  -p 127.0.0.1:8787:8787 \
  -v hko-cache:/app/.cache \
  hko-local
```

The volume matters. Without it, every container start re-fetches all 48 terrain
tiles (~45 s and 48 requests to a free public service, which is antisocial).

Publishing as `127.0.0.1:8787:8787` keeps the service off the network even though
the container binds `0.0.0.0`.

---

## 3. Cache lifecycle

| Path | Contents | Grows? | Safe to delete? |
|---|---|---|---|
| `.cache/dem/` | terrain tiles, 48 files, 1.7 MB | **no** — a fixed tile set for a fixed bounding box | yes, refetched on next analysis |
| `.cache/icons/` | weather icons, one file per icon code seen | slowly, bounded by the icon set (~100 files max) | yes, refetched on demand |
| in-memory | weather responses, lunar table, wind CSV, analysis field | bounded by TTLs | n/a — process restart |

Total disk growth is therefore **bounded and small**: the terrain cannot grow at
all for a fixed box, and the icon set is finite. There is no unbounded log or
accumulating archive to rotate — the service writes nothing else to disk.

Cache freshness is per source and set in `server.js` / `lib/analysis.js`:

```
rhrread            5 min      wind CSV          5 min
flw               10 min      METAR / TAF      10 min
fnd               60 min      imagery          60 s
warnings           1 min      lunar table      24 h
whatsnew RSS      30 min      analysis field    5 min
```

---

## 4. Monitoring

`GET /api/status` is the health endpoint. It is cheap (does not touch the
terrain or any upstream) and returns:

```json
{ "ok": true, "uptimeSec": 298, "node": "v22.23.0",
  "upstreamCalls": 15, "cacheHits": 70, "cacheMisses": 24, "errors": 0,
  "lastError": null, "cached": [ { "key": "rhrread:tc", "ageSec": 18, "bytes": 2608 } ] }
```

What to alert on:

| Signal | Meaning |
|---|---|
| `errors` increasing | upstream fetches failing; the service is serving stale |
| `lastError` non-null | the specific upstream and reason |
| `upstreamCalls` rising fast | cache is being bypassed — check for a client sending `force=1` |
| process RSS climbing without bound | a leak; expected steady state is ~73 MB |
| disk `.cache` growing beyond a few MB | unexpected — the terrain set is fixed |

A liveness probe should hit `/api/status`, not `/api/analysis` — the latter can
block for ~45 s on a cold cache and would fail a short-timeout check on a
perfectly healthy service.

---

## 5. Failure modes

| Failure | Behaviour | Recovery |
|---|---|---|
| Upstream unreachable | last known-good response served, flagged `stale: true`; UI shows an amber dot and `STALE` | automatic on the next successful fetch |
| Upstream returns HTML/JSONP | treated as a parse error, falls back to cache | automatic |
| `EADDRINUSE` | exits non-zero with a clear message | start on another port, or free the port |
| Terrain tile fetch fails | `/api/analysis` returns 502 with the failing tile | automatic on retry |
| One station reports `N/A` | that station is **dropped**, not read as calm | automatic |
| METAR/TAF unavailable | LAE factors become `UNKNOWN` (neutral) and remain visible | automatic |
| `.cache` deleted | terrain refetched (~45 s), icons refetched on demand | automatic |

The stale-on-error design is deliberate: weather an hour old with a visible
staleness marker is more useful than a blank page, but it must never be presented
as current.

---

## 6. Maintenance procedures

**Verify the build before deploying** — the checks are the regression gate:

```
node scripts/check-dem.js       # 16 checks — DEM, PNG codec, raster alignment
node scripts/check-interp.js    # 11 checks — estimator selection, synthetic control
node scripts/check-lae.js       # 41 checks — vector wind, CSV edge cases, METAR/TAF
node scripts/check-bind.js      #  5 checks — loopback default, HOST override
node scripts/bench.js           # latency + payload baseline
```

`check-dem.js` and `check-interp.js` reach the network; `check-lae.js` and
`check-bind.js` are self-contained apart from fixtures.

**Upgrade** — there is no dependency tree and no build step, so an upgrade is
`git pull` and restart. Roll back the same way.

**Adding an analysis variable** — extend `lib/stations.js`, then
`lib/analysis.js`. Keep the estimator-selection pattern rather than hard-coding a
method; that is what caught the lapse-rate correction not helping.

**Changing the operating altitude default** — `lib/lae.js` thresholds and the
`alt` parameter default in `server.js`.

---

## 7. Security posture

- **Binds loopback by default.** `HOST` must be set explicitly to expose it, and
  the startup banner warns when it is.
- **No authentication, by design.** This is a single-user local gateway. If it is
  ever exposed, put a reverse proxy with TLS and auth in front — binding `0.0.0.0`
  directly publishes an unauthenticated data gateway.
- **No secrets.** There are no credentials to store or rotate; all upstreams are
  open data. Nothing in the repo reads an `.env`.
- **Outbound only.** The service makes outbound HTTPS requests and opens no other
  ports.
- **Path traversal is refused.** Static resolution normalises and then checks the
  resolved path stays inside `public/`.
- **Upstream parameters are allow-listed.** `type`, `kind` and `lang` are
  validated against fixed sets before being forwarded, so the gateway cannot be
  used to probe arbitrary upstream endpoints.
- **Be a good citizen.** Upstream requests are cached aggressively and carry an
  identifying User-Agent. Do not lower the TTLs to poll HKO.

---

## 8. Capacity notes

The service is single-process and single-threaded. The only CPU-heavy work is the
interpolation, at ~146 ms for the analysis (62,640 cells) and ~94 ms for the wind
field (two such passes). Since both are cached for 5 minutes, a single instance
comfortably serves interactive use.

If it needed to serve many users, in order of usefulness:

1. **Cache the rasters on disk**, not just in memory — they change only every
   5 minutes and are pure functions of the observations.
2. **Restrict the analysis bounding box** to the area actually displayed. The
   grid currently covers the whole terrain mosaic, which is slightly larger than
   the map viewport, so some cells are computed and then clipped.
3. Only then consider clustering, and note that multiple instances must share the
   `.cache` volume or each will refetch the terrain.

The saturation point is `app.js` at 89 KB, not the server. It is served
uncompressed and uncompressed-on-the-wire; enabling gzip at a reverse proxy is
the cheapest single improvement available.
