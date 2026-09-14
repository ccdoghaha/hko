# 本地天氣站 / Local Weather Station

A single-page weather dashboard that runs entirely on `localhost`, backed by the
**Hong Kong Observatory Open Data API**. Zero npm dependencies — Node's standard
library and a browser are all you need.

```
  http://localhost:8787/
```

---

## Scope and provenance — please read

This is an **independent implementation**, not a copy of `hko.gov.hk`.

* **What it does** — reproduces the *function and information architecture* of the
  HKO Traditional-Chinese homepage: current conditions, local forecast, 9-day
  forecast, district-level temperature and rainfall, and warnings/tips.
* **Where the content comes from** — every piece of weather text, every reading,
  and every weather icon is fetched live from the Observatory's own public
  endpoints at request time. Nothing is bundled, scraped, or redistributed.
* **What is original** — all HTML, CSS, JavaScript, layout, and the 3-D chart
  renderer in this repository were written from scratch. No HKO markup,
  stylesheet, script, or asset is copied into this project.

Weather data and the weather icon set remain the copyright of the
Hong Kong Observatory. See <https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>.

---

## Requirements

| | |
|---|---|
| Node.js | 18 or newer (uses global `fetch`; tested on v22) |
| Browser | any modern browser |
| Network | outbound HTTPS to `data.weather.gov.hk` and `www.hko.gov.hk` |

No `npm install`. There is no `package.json` and no build step.

---

## Running it

**Windows** — double-click `start.bat`, or from a shell:

```
node server.js 8787
```

**Linux / macOS**:

```
./start.sh
```

Both launchers prompt for a port and default to `8787`. You can also pass the
port directly: `node server.js 9000`. The server binds `127.0.0.1` only — it is
not reachable from the network.

---

## Layout

```
hko-local/
├─ server.js          zero-dependency HTTP server: static host, API gateway, icon cache
├─ start.bat          Windows launcher (prompts for port, opens browser)
├─ start.sh           POSIX launcher
├─ public/
│  ├─ index.html      SPA shell
│  ├─ styles.css      stylesheet
│  └─ app.js          SPA: hash router, views, i18n, 3-D canvas chart
└─ .cache/
   └─ icons/          weather icons cached on first request
```

---

## Architecture

The browser never talks to HKO directly. Everything goes through the local
server, which solves three problems at once:

1. **Caching** — each `dataType` has its own freshness window, so a page refresh
   costs HKO nothing. Icons are cached on disk permanently after first fetch.
2. **Resilience** — if HKO is unreachable, the last known-good response is served
   and flagged `stale` rather than showing an error. The UI marks this with an
   amber dot and a `STALE` note in the footer.
3. **Single round trip** — `/api/bundle` fans out to all six endpoints
   concurrently and returns one payload, instead of the browser making six calls.

```
browser ──▶ localhost:8787 ──▶ data.weather.gov.hk
                │
                ├─ in-memory cache (per dataType TTL)
                ├─ stale-on-error fallback
                └─ .cache/icons/*.png  (disk, permanent)
```

### Endpoints

| Route | Purpose |
|---|---|
| `GET /` | SPA shell |
| `GET /api/bundle?lang=tc` | all six data types in one response |
| `GET /api/weather?type=rhrread&lang=tc` | a single data type |
| `GET /api/status` | uptime, cache stats, last upstream error |
| `GET /icons/pic{nn}.png` | proxied + disk-cached HKO weather icon |

Add `&force=1` to bypass the cache. `lang` accepts `tc` (traditional Chinese),
`sc` (simplified Chinese), or `en` — this switches the API's own text, so the
station names, forecasts, and warnings all change language too.

### Data types

| `dataType` | Cache | Drives |
|---|---|---|
| `rhrread` | 5 min | current temp, humidity, UV, rainfall, lightning |
| `flw` | 10 min | local weather forecast |
| `fnd` | 60 min | 9-day forecast, sea and soil temperature |
| `warnsum` | 1 min | active weather warning summary |
| `warningInfo` | 1 min | full warning statements |
| `swt` | 1 min | special weather tips |

---

## The SPA

Four routes, hash-based, no framework:

| Route | Contents |
|---|---|
| `#/overview` | current conditions, forecast text, key readings |
| `#/regional` | district temperature/rainfall table + 3-D isometric chart |
| `#/forecast` | 9-day cards, sea and soil temperature |
| `#/alerts` | active warnings, warning statements, special tips |

**Language** — the 繁 / 简 / EN buttons switch both the UI chrome and the
underlying API language, so weather text comes back in the language you pick.
The choice persists in `localStorage`.

**The 3-D chart** is drawn with the Canvas 2D API using an isometric projection
written for this project — no charting library, no WebGL. Each bar is projected
as three shaded faces (top / side / front), and the whole scene is auto-fitted to
the canvas by measuring the projected bounding box before drawing. Hover a bar
for a readout; the tooltip is a second pass drawn over the bars.

Switch between temperature and rainfall with the buttons above the chart, and
click a column header to re-sort.

---

## Troubleshooting

**Port already in use** — the server prints a clear message and exits. Start on
another port: `node server.js 8788`.

**Everything is grey and the footer says STALE** — HKO was unreachable and the
server is serving its last successful response. Check `/api/status` for the last
upstream error.

**Icons missing** — delete `.cache/icons/` and reload; they will be re-fetched.

**Wrong language on first load** — clear the `hko-local-lang` `localStorage` key.
