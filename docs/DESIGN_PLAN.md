# Design plan

Architecture, the decisions behind it, and the alternatives that were rejected.

---

## 1. Purpose

A local weather service for Hong Kong that does three things:

1. **Displays** the Observatory's published observations, forecasts and warnings,
   in the Observatory's own design language, on `localhost`.
2. **Post-processes** them — turning a 26-station point network into a 250 m
   gridded field, and a 30-station wind report into a vector wind field.
3. **Assesses** whether conditions permit a low-altitude operation, and keeps an
   audit trail of those calls.

It is a demonstration of the skills behind an HKO LAE/aviation-weather role: GIS
and 3-D visualisation, statistical post-processing, aviation met, database work,
and the operational side of running it.

---

## 2. Constraints that drove the design

These were chosen up front and everything else follows from them.

| Constraint | Why | Consequence |
|---|---|---|
| **Zero npm dependencies** | A demo that needs `npm install` is a demo that breaks on someone else's machine | Node stdlib only; a hand-written PNG codec instead of a library; `node:sqlite` instead of `better-sqlite3` |
| **Loopback by default** | It has no authentication and serves a gateway | `HOST` must be set explicitly to expose it; the banner warns when it is |
| **No secrets** | Nothing to leak, nothing to rotate | All upstreams are open data; no `.env`, no credentials anywhere |
| **No HKO assets committed** | The Observatory's HTML, CSS, JS, images and article text are theirs | Design tokens were read from the live page and re-implemented; only data and link-headlines are surfaced |
| **Graceful degradation** | A display layer that dies because an optional component is missing is a bad display layer | Every optional subsystem (archive, imagery, news, aviation) fails to a no-op |

---

## 3. Architecture

Four layers, each of which can fail without taking the others down.

```
┌──────────────────────────────────────────────────────────────┐
│  BROWSER — hash-routed SPA, no framework, no build step      │
│  views: home · overview · regional · analysis · lae ·        │
│         imagery · forecast · alerts · news                   │
│  rendering: SVG map, Canvas 2-D isometric chart, wind arrows │
└──────────────────────────┬───────────────────────────────────┘
                           │ JSON + PNG, loopback only
┌──────────────────────────▼───────────────────────────────────┐
│  GATEWAY — server.js                                          │
│  static host · per-source TTL cache · stale-on-error fallback │
│  proxy for icons/imagery · allow-listed upstream params       │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  PIPELINE — lib/                                              │
│  dem ──► interp ──► analysis ──► colormap ──► png            │
│  wind ──► (u/v fields) ──┐                                    │
│  aviation ───────────────┴──► lae ──► assessment              │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────┐
│  ARCHIVE — lib/store.js (SQLite, WAL)                         │
│  observations · wind · aviation reports · analysis runs ·     │
│  LAE verdicts · retention · backup                            │
└──────────────────────────────────────────────────────────────┘
     ▲                    ▲                     ▲
  HKO open data      HKO regional CSVs     NOAA aviation feeds
```

### Component responsibilities

| Module | Responsibility | Depends on |
|---|---|---|
| `server.js` | HTTP, routing, caching, upstream fetching | `lib/*` |
| `lib/png.js` | PNG decode and encode | zlib |
| `lib/dem.js` | Terrain tiles → mosaic → void fill → grid | `png` |
| `lib/interp.js` | IDW, kriging, variograms, cross-validation | — |
| `lib/wind.js` | Compass parsing, u/v algebra | — |
| `lib/aviation.js` | METAR/TAF decoding | — |
| `lib/lae.js` | Thresholds, scoring, wind profile | `wind` |
| `lib/analysis.js` | Orchestration: terrain, fields, LAE assembly | all of the above |
| `lib/store.js` | Archive and queries | `node:sqlite` |
| `lib/stations.js` | Station coordinates | — |
| `lib/colormap.js` | Ramps, raster rendering | — |

The layering is deliberate: `interp`, `wind` and `aviation` are **pure** — no
I/O, no network, no globals. That is what makes them testable without fixtures,
and it is why the test suites run in seconds.

---

## 4. Key decisions

### 4.1 Interpolate u and v, never direction

**Decision:** wind is decomposed into u/v components, interpolated as two scalar
fields, and recombined.

**Why:** 350° and 010° average to 180° as scalars — the exact opposite direction.
Hong Kong's prevailing easterlies and northerlies straddle north routinely, so a
scalar implementation would be wrong most of the time while looking entirely
plausible.

**Rejected:** interpolating direction with circular statistics. Correct in
principle, but it still cannot represent a wind that opposes itself across a
grid cell, and u/v is both simpler and better-founded.

### 4.2 Select the estimator by measurement, not by assumption

**Decision:** the analysis scores three estimators by leave-one-out
cross-validation on every run and uses whichever measured best.

**Why:** the terrain lapse-rate correction was expected to help and did not —
because the `rhrread` network spans only 203 m of elevation, so a lapse rate
fitted to it is extrapolation. Hard-coding the correction would have made the
product quietly worse.

**Rejected:** hard-coding "kriging is better than IDW". It is not, always. On
this network IDW beat kriging by 0.17 K.

**Consequence:** if HKO adds hilltop stations to the feed, the correction starts
winning on its own, with no code change.

### 4.3 The grid is regular in lat/lon, not Mercator

**Decision:** the analysis grid is equally spaced in latitude and longitude.

**Why:** the terrain tiles arrive Mercator-spaced, but the browser map draws
equirectangular. A Mercator-regular grid would shear against the station markers
and the coastline. Regular-in-lat/lon means the raster places with a single
affine transform and zero drift (verified to 1.4e-14 degrees).

**Rejected:** reprojecting the client to Mercator. Larger change, and it would
have distorted the hand-built coastline.

### 4.4 One round trip, not six

**Decision:** `/api/home` fans out to all six weather feeds, the calendar table
and every news feed concurrently, and returns one payload.

**Why:** the homepage needs all of it; six browser round trips per refresh is
wasteful and makes partial-failure handling harder.

### 4.5 Stale is served, but it is labelled

**Decision:** on upstream failure the last known-good response is served with
`stale: true`.

**Why:** weather ten minutes old with a visible amber marker beats a blank page.
But it must never be presented as current, so the flag propagates to the UI.

### 4.6 The archive is append-only and separate from serving

**Decision:** history goes to SQLite; the serving path never reads it.

**Why:** the two have opposite characteristics. Serving wants the latest value
and no disk I/O; the archive wants everything and tolerates latency. Coupling
them would make every display request wait on a write.

### 4.7 Graceful degradation everywhere

**Decision:** every optional subsystem fails to a no-op.

Examples: no `node:sqlite` → the archive disables and the banner says so; no
METAR → LAE factors become `UNKNOWN` (neutral, and visible) rather than silently
passing or failing; an unparseable upstream payload → serve stale.

---

## 5. Data flow

**Display path (per request):**

```
request ──► cache hit? ──yes──► respond (1–16 ms)
                │no
                ▼
        fetch upstream ──► cache ──► archive (rhrread only) ──► respond
                │fail
                ▼
        serve stale with stale:true
```

**Analysis path (per 5 minutes):**

```
rhrread ──► 26 stations with elevations sampled from the DEM
                │
        score 3 estimators by LOO  ──► pick the winner
                │
        interpolate onto 292×216 @ 250 m
                │
        land mask ──► RGBA ──► PNG (19 KB)
```

**LAE path (per request):**

```
wind CSV ──► u/v ──► vector field ──► worst station
                                          │
METAR/TAF ──► decode ──► worst-case merge ──┤
warnings  ──► classify ────────────────────┤
lightning ────────────────────────────────┤
                                          ▼
                         11 factors ──► worst-of ──► verdict
                                                       │
                                                    archive
```

---

## 6. Failure philosophy

| Layer | On failure | Rationale |
|---|---|---|
| Upstream fetch | serve stale, flag it | stale-but-labelled beats blank |
| Parse | treat as upstream failure | a JSONP-wrapped payload must not reach the client |
| Archive | disable, keep serving | display must not depend on history |
| Imagery | 502 for that image only | one broken product should not blank the page |
| Aviation | factors become UNKNOWN | neutral, and visible in the table |
| Terrain | 502 for the analysis only | the rest of the site is unaffected |

---

## 7. Deliberately not done

- **No authentication.** Single-user local gateway. Adding auth would be
  pretending to a security posture this does not have; instead it binds loopback
  and warns on exposure.
- **No front-end framework.** Nine views and no build step. A framework would add
  a toolchain, a lockfile and a supply chain for no gain at this size.
- **No HKO assets.** See §2. The design was matched by reading published tokens
  and re-implementing.
- **No forecast model.** This interprets other people's forecasts; it does not
  generate them. Claiming otherwise would be dishonest.
- **No WebGL.** The 3-D chart is Canvas 2-D isometric. For ~30 bars, the
  complexity of a GL pipeline is not repaid.
- **No quality control on observations.** Flagged as a limitation rather than
  half-implemented.

---

## 8. Future work, in order of value

1. **Per-window LAE assessment.** The TAF worst-case currently over-warns outside
   the actual hazard windows. Time-stepping per TEMPO/BECMG window would be more
   useful operationally.
2. **Forecast verification.** The archive already stores METARs and analysis
   runs; nothing yet scores a forecast against the observation that followed it.
3. **A coastline vector** to replace the terrain-threshold land mask, which
   misclassifies flat reclaimed land and cannot resolve a 100 m runway.
4. **Upper-air data.** The altitude wind is extrapolated from the surface; a
   radiosonde or profiler would remove the largest approximation in the LAE path.
5. **Raster caching on disk.** Fields change every 5 minutes and are pure
   functions of the observations.
6. **gzip at the proxy.** `app.js` is 89 KB uncompressed and is the real
   saturation point, not the server.

---

## 9. How to verify any of this

```
node scripts/check-dem.js       # 16 — PNG codec, georeferencing, DEM, alignment
node scripts/check-interp.js    # 11 — estimator selection, synthetic control
node scripts/check-lae.js       # 41 — vector wind, CSV edge cases, METAR/TAF
node scripts/check-db.js        # 25 — schema, idempotency, retention, durability
node scripts/check-bind.js      #  5 — loopback default, HOST override
node scripts/bench.js           # latency and payload baseline
```

98 checks. Every claim in this document is exercised by one of them.
