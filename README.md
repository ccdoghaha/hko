# 本地天氣站 / Local Weather Station

A single-page weather dashboard that runs entirely on `localhost`, covering every
homepage component of the Hong Kong Observatory's Traditional-Chinese site and
fed by the **HKO Open Data API**. Zero npm dependencies — Node's standard library
and a browser are all you need.

```
  http://localhost:8787/
```

---

## Scope and provenance — please read

This is an **independent implementation**, not a copy of `hko.gov.hk`.

**What "matching the design" means here.** The visual language — palette,
typography scale, container width, module ordering, section backgrounds — was
derived by reading the Observatory's published design tokens (computed styles off
the live page): a 1249 px container, `Arial/Helvetica/Microsoft JhengHei` at a
16 px base, `#1B5397` primary blue, `#3E5259` secondary text, `#DCF6FF` content
band. My stylesheet re-implements that design from scratch against those values.

**What was not copied.** No HKO HTML, CSS, JavaScript, image or written text is
included in this repository. There is no scraped markup and no vendored
stylesheet. The `public/` directory is written from scratch.

**Where content comes from at runtime.** Weather readings, forecasts, warning
text, weather icons, radar/satellite/lightning imagery and news headlines are all
fetched live from the Observatory's own public endpoints. They are not bundled or
redistributed.

**Copyright.** Weather data, imagery and the icon set remain the copyright of the
Hong Kong Observatory. Note that HKO's own RSS feed carries an explicit notice
that republication of its content is prohibited without written authorisation —
which is why this app shows headline text with a link back to HKO rather than
republishing articles, and why no HKO asset is committed. Please read
<https://www.hko.gov.hk/en/abouthko/opendata_intro.htm>.

If you want the actual HKO site, use the actual HKO site: <https://www.hko.gov.hk/tc/>.

---

## Requirements

| | |
|---|---|
| Node.js | 18 or newer (uses global `fetch`; tested on v22) |
| Browser | any modern browser |
| Network | outbound HTTPS to `data.weather.gov.hk`, `www.hko.gov.hk`, `rss.weather.gov.hk` |

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
port directly: `node server.js 9000`. The server binds `127.0.0.1` only.

---

## Component coverage

Every module on the Observatory's homepage has a counterpart:

| HKO homepage module | Here | Source |
|---|---|---|
| 天氣實況 (current conditions, icon, max/min) | 天氣實況 | `rhrread` + `fnd` |
| 分區天氣 (district map + variable selector) | 分區天氣圖 (SVG, 26 stations) | `rhrread` |
| 我的位置天氣 (weather at my location) | 定位 button → nearest station | browser geolocation |
| 雷達 / 衛星 / 閃電 | 天氣圖像 module + page | proxied live imagery |
| 地球天氣 / 世界天氣 | linked out to HKO | — |
| 天氣預報 / 天氣概況 / 展望 | 本港地區天氣預報 | `flw` |
| 九天天氣預報 | 九天天氣預報 (9 cards) | `fnd` |
| 天氣警告 / 特別天氣提示 | 警告及提示 | `warnsum`, `warningInfo`, `swt` |
| 天氣圖像 | 天氣圖像 | live imagery |
| 最新消息 / 天氣隨筆 / 天文台最新動態 / 天文台網誌 | 最新消息 | `whatsnew` RSS + links |
| 香港氣候 / 氣候摘要 | 香港氣候 | `flw` + link |
| 社交媒體 / 天文台頻道 | linked out to HKO | — |
| header: Gregorian + **lunar date** + solar term | masthead datebox | HKO calendar tables |
| header: search + language menu | station search + 繁/简/EN | — |
| top-level nav (9 sections) | blue nav bar | links to HKO |
| footer link set | footer | links to HKO |

**Where this deliberately differs:** modules whose content is HKO's own
promotional or editorial material — the banner carousel, the Facebook page
plugin, the YouTube embed, and the article bodies behind 天氣隨筆 / 天文台網誌 —
are linked out rather than reproduced. Everything data-driven is implemented.

---

## High-resolution analysis (post-processing)

Beyond displaying observations, this project contains a genuine post-processing
pipeline: the ~26-station network is interpolated onto a **250 m grid** using
real terrain, with the method chosen by measurement rather than assumption.

```
lib/png.js        PNG decoder/encoder, no dependencies (needed for the DEM)
lib/dem.js        terrarium terrain tiles -> mosaic -> void fill -> 250 m grid
lib/interp.js     IDW, ordinary kriging, variogram fitting, leave-one-out CV
lib/analysis.js   pipeline orchestration + estimator selection
lib/colormap.js   temperature ramp -> RGBA raster
docs/ANALYSIS_METHOD.md   full method, validation results, limitations
```

Measured on live observations:

| Estimator | LOO RMSE |
|---|---|
| **IDW, no terrain correction** | **1.03 K** ← selected |
| IDW with terrain correction | 1.07 K |
| Ordinary kriging with terrain correction | 1.20 K |

The terrain correction **did not help**, and the reason is a property of the
network: the `rhrread` stations span only **1–204 m** of elevation. HKO's hilltop
sites are not in that feed, so a lapse-rate correction is extrapolation rather
than a fitted relationship. A control experiment confirms the mechanism is sound
— the same code on a synthetic network spanning 587 m of relief improves RMSE by
**48%** instead of 22%. The estimator is therefore re-selected by measured RMSE
on every run; if the feed gains hilltop stations, the correction will start
winning on its own.

Full write-up, including the DEM's 0.004% void rate, the pillow cross-check of
the PNG decoder, and seven documented limitations: `docs/ANALYSIS_METHOD.md`.

Validate any change with:

```
node scripts/check-dem.js      # 16 checks
node scripts/check-interp.js   # 11 checks
```

---

## LAE operations product

A go/no-go assessment for low-altitude operations, from four independent sources:

| Source | Provides |
|---|---|
| HKO `latest_10min_wind.csv` (30 stations) | 10-min mean wind, direction, maximum gust |
| METAR / TAF via aviationweather.gov | visibility, **ceiling**, wind, QNH |
| HKO `warnsum` | typhoon, rainstorm, thunderstorm, monsoon warnings |
| HKO `rhrread.lightning` | convective activity by district |

The district feeds carry no visibility and no ceiling at all — the automatic
network does not measure either — which is why the product needs both families of
data rather than one.

**Direction is never interpolated as a scalar.** 350° and 010° average to 180° as
numbers, the exact opposite direction. The field is interpolated as u and v and
recombined, and the test suite asserts the scalar alternative would have been 180°
wrong, because Hong Kong's prevailing easterlies straddle north routinely.

**Wind is extrapolated to the operating altitude** (default 120 m) with a power
law, `v(z) = v10 * (z/10)^alpha`. This is an engineering approximation and is
documented as one.

Every factor is scored independently and the verdict is the worst, since an
operation is bounded by its most limiting constraint. Thresholds are stated
explicitly in `lib/lae.js` and are **not an approved standard** — the UI says so
too. Full method, validation and nine documented limitations:
`docs/LAE_PRODUCT.md`.

```
node scripts/check-lae.js      # 41 checks
```

---

## Deployment and operations

Measured resource profile: **~73 MB RSS, 2.1 MB cache, 6,185 lines, zero
dependencies**. Response times 1–16 ms for cached endpoints, 94–146 ms for the
interpolations. The single expensive operation is the first-ever terrain build
(~45 s, 48 tiles), after which it is cached on disk permanently.

```
node server.js 8787          # HOST defaults to 127.0.0.1
docker build -t hko-local . && docker run -d -p 127.0.0.1:8787:8787 -v hko-cache:/app/.cache hko-local
```

`HOST` must be set explicitly to expose the service; the startup banner warns
when it is, because there is no authentication. The service writes only to
`.cache`, and that growth is bounded — the terrain tile set is fixed for a fixed
bounding box.

Runbook, failure modes, monitoring signals and capacity notes:
`docs/DEPLOYMENT_AND_OPS.md`.

---

## Layout and interaction

The homepage is built to the Observatory's information architecture: a **1249 px
container**, a masthead carrying the Gregorian + lunar date and a toolbar
(text size · share · search · menu · language), a blue section bar, then a
**two-column body — a 218 px left navigation tree beside the content**, and a
footer link set.

The sidebar mirrors HKO's grouping and labels and is expandable per section
(collapse state persists):

```
天氣                    本港天氣 · 天氣預測 · 天氣警告 · 航運天氣 · 天氣監測圖像 · 地理信息系統天氣服務
天文、潮汐及地球物理     太陽及月亮 · 潮汐 · 地震
本站分析                天氣總覽 · 高解析度分析 · 最新消息
```

**All 43 entries are local routes.** Nothing in the sidebar, the top section bar
or the footer navigates to hko.gov.hk — 89 links on the page, zero external.
Where HKO publishes a product the open-data API does not carry, the entry still
resolves to a local page that names the product and states plainly why it is not
shown, rather than an empty shell or a redirect away.

That gives **22 pages backed by live data**:

| page | source |
|---|---|
| 主頁 · 總覽 · 分區天氣 · 雨量分佈圖 | `rhrread` (+ wind CSV) |
| 天氣報告 · 九天預報 | `flw`, `fnd` |
| 警告及提示 · 熱帶氣旋警告 | `warnsum`, `warningInfo`, `swt`, `tcmessage` |
| 大雨及雷暴區域資訊 · 閃電位置 | `rhrread` rainfall + lightning |
| 紫外線資訊 · 京士柏氣象站 | `rhrread` uvindex |
| **香港水域能見度** | **`LTMV`** |
| **昨日天氣及輻射水平資料** | **`RYES`** |
| **過去天氣及氣候** | **`CLMTEMP` / `CLMMAXT` / `CLMMINT`** |
| **太陽及月亮** | **`SRS` / `MRS`** |
| **潮汐** | **`HHOT`** |
| **地震** | **`qem`** |
| **觀測歷史 · 作業評估記錄 · 分析執行記錄** | **local SQLite archive** |
| **警告類型參考** | **API doc warning codes + live status** |
| 高解析度分析 · 低空作業 | computed (see below) |

and **15 further product pages** that explain what is not in the open data.

The three archive-backed pages are worth calling out: the service writes every
observation, analysis run and LAE verdict to SQLite, and those pages are the
reason that history exists. `觀測歷史` charts a stored station series (surface or
wind) with an inline SVG sparkline; `作業評估記錄` is the go/no-go audit trail with
the blockers and cautions recorded at the time; `分析執行記錄` shows which
interpolation method each run selected, so method drift is visible.

`警告類型參考` lists all 16 warning codes the API uses with what each means, marks
which are **in force right now**, and flags the three that normally halt HKEX
trading (Signal 8+, black rainstorm, tsunami) — stated as general market practice,
not as advice.

Homepage modules in HKO's order, with two working widgets:

- **Parameter / station picker** — the feed's real *networks* are temperature
  (26 stations), rainfall (18 districts) and wind (23 stations, fetched lazily).
  Humidity and UV are carried from a *single* station each, so they are shown as
  point readings rather than a one-row table; parameters the feed does not carry
  at all are listed as such instead of being silently dropped.
- **9-day forecast carousel** — date · min | max · humidity range · confidence,
  matching the shape of HKO's own forecast strip.

Every toolbar control does something real: text size cycles 100/115/130 %, share
copies the link, search toggles and focuses, menu collapses the sidebar. Dead
chrome would be worse than no chrome.

Design tokens (palette, type scale, container width, module order) were read from
the live page's computed styles and re-implemented in an original stylesheet.
HKO's HTML, CSS, JS, images and article text are their copyright and are not
copied. News appears as **headlines only** — the article bodies are not
republished, and the headlines are rendered as text rather than deep links.

---

## Archive (database)

The serving path caches the latest reading and discards the previous one. That is
right for showing the weather and useless for everything asked *afterwards* —
"why was a no-go issued at 14:00 yesterday?", "has the estimator selection been
drifting?". So history is kept in SQLite (`node:sqlite`, still zero
dependencies), entirely off the serving path.

```
observation      surface readings over time
wind_observation wind by station, including the stations dropped from analysis
aviation_report  METAR/TAF — raw text AND decoded, so a decoder bug stays auditable
analysis_run     which estimator won and how well it scored
lae_assessment   every verdict with its full factor list — the go/no-go audit trail
```

```bash
curl '/api/history?kind=lae&limit=20'                    # audit trail
curl '/api/history?kind=analysis&limit=50'               # estimator drift
curl '/api/history?kind=observation&station=HKO'         # station time series
curl '/api/db/status'                                    # row counts, size, errors
curl '/api/db/maintain?days=90'                          # prune, checkpoint, integrity
```

Writes are `INSERT OR IGNORE` against natural keys, so re-polling a report that
has not changed inserts nothing — the normal case, since the poller runs twice as
often as the feed updates. Batches run in one transaction: that single change cut
the write-ahead log from **1.76 MB to 276 KB** for comparable activity.

Retention defaults to 90 days and runs on a timer, never in a request path.
`prune()` **refuses a retention below 1 day** rather than obeying it, because a
zero or negative value computes a cutoff in the future and would delete the whole
archive.

Schema, backup/restore, migration, checkpointing and a query cookbook:
`docs/DATABASE_MANAGEMENT.md`.

```
node scripts/check-db.js       # 25 checks
```

---

## Directory structure

### Version controlled

```
hko-local/
│
├─ server.js                    zero-dependency HTTP server: static host, per-source
│                               TTL cache, stale-on-error fallback, API gateway,
│                               archive lifecycle, HOST/PORT config
├─ start.bat                    Windows launcher (prompts for port, opens browser)
├─ start.sh                     POSIX launcher
├─ Dockerfile                   container build: no dependencies, healthcheck, .cache volume
├─ .dockerignore                keeps .git, .cache and node_modules out of the image
├─ .gitignore                   keeps .cache (terrain, icons, archive) out of the repo
├─ .gitattributes               line endings: *.sh LF, *.bat CRLF
├─ LICENSE                      Apache-2.0
├─ README.md                    this file
│
├─ lib/                         the pipeline — pure logic, no HTTP
│  ├─ png.js                    PNG codec, decode + encode. Needed because the terrain
│  │                            DEM ships as PNG; verified byte-identical to Pillow
│  ├─ dem.js                    Mapbox terrarium tiles -> mosaic -> void fill -> grid
│  ├─ interp.js                 IDW, ordinary kriging, variogram fitting, LOO CV
│  ├─ wind.js                   compass parsing (abbreviated + spelled out), u/v algebra,
│  │                            wind CSV edge cases (N/A, Calm, Variable, empty)
│  ├─ aviation.js               METAR / TAF decoding, worst-case merging over change groups
│  ├─ lae.js                    go/no-go model, thresholds, power-law wind profile
│  ├─ analysis.js               orchestration: temperature field, vector wind field,
│  │                            LAE assembly, archive hooks
│  ├─ store.js                  SQLite archive: schema, writes, queries, retention, backup
│  ├─ stations.js               26 observation + 30 wind station coordinates
│  └─ colormap.js               temperature and wind ramps -> RGBA raster
│
├─ public/                      the SPA — no framework, no build step
│  ├─ index.html                shell: masthead + toolbar, section nav, sidebar host,
│  │                            two-column body, footer
│  ├─ styles.css                stylesheet, HKO design tokens re-implemented
│  └─ app.js                    router, 9 views, sidebar tree, i18n (tc/sc/en),
│                               parameter/station picker, forecast carousel, SVG map,
│                               wind arrows, 3-D isometric chart, analysis + LAE views
│
├─ scripts/                     verification and tooling
│  ├─ check-dem.js              16 checks: PNG codec, georeferencing, DEM accuracy,
│  │                            void fill, raster alignment
│  ├─ check-interp.js           11 checks: estimator selection, synthetic control,
│  │                            station-table sync
│  ├─ check-lae.js              41 checks: vector wind wraparound, CSV edge cases,
│  │                            METAR/TAF decoding, ceiling semantics
│  ├─ check-db.js               25 checks: schema, idempotency, retention guard,
│  │                            backup, integrity, durability across reopen
│  ├─ check-ui.js               18 checks: DOM id resolution (shell vs script),
│  │                            i18n key coverage in all 3 languages, sidebar tree
│  │                            integrity, product-key + route resolution, picker
│  │                            wiring, layout structure
│  ├─ check-bind.js              5 checks: loopback default, HOST override, warning
│  ├─ bench.js                  endpoint latency + payload baseline
│  ├─ debug-dem.js              ad-hoc: landmark sampling vs published heights
│  └─ debug-mosaic.js           ad-hoc: locate implausible cells in the terrain mosaic
│
└─ docs/
   ├─ DESIGN_PLAN.md            architecture, decisions, rejected alternatives
   ├─ ANALYSIS_METHOD.md        post-processing method, validation results, limitations
   ├─ LAE_PRODUCT.md            LAE method, thresholds, aviation decoding, limitations
   ├─ DATABASE_MANAGEMENT.md    schema, retention, checkpointing, backup, queries
   └─ DEPLOYMENT_AND_OPS.md     measured resource profile, deployment, runbook
```

### Generated at runtime — never committed

```
.cache/
├─ dem/                         48 terrain tiles (1.7 MB), fixed set for a fixed bbox.
│                               Fetched once on first analysis, then never again
├─ icons/                       weather icons (332 KB), one per icon code seen
├─ samples/                     captured feed samples used as test fixtures
└─ archive.db                   SQLite history (WAL mode) + -wal / -shm siblings
```

Everything under `.cache/` is reproducible and safe to delete. Total growth is
bounded: the terrain set cannot grow for a fixed bounding box, and the icon set
is finite. See `docs/DATABASE_MANAGEMENT.md` §4 for archive retention.

### Where to start reading

| If you want to understand… | Read |
|---|---|
| the whole design and why | `docs/DESIGN_PLAN.md` |
| how the grid is computed | `docs/ANALYSIS_METHOD.md`, then `lib/interp.js` |
| the LAE verdict | `docs/LAE_PRODUCT.md`, then `lib/lae.js` |
| the data model | `docs/DATABASE_MANAGEMENT.md`, then `lib/store.js` |
| running it | `docs/DEPLOYMENT_AND_OPS.md` |
| what is verified | `scripts/check-*.js` |

---

## Architecture

The browser never talks to HKO directly. Everything goes through the local
server, which solves three problems at once:

1. **Caching** — each source has its own freshness window, so a page refresh costs
   HKO nothing. Weather icons are cached on disk permanently after first fetch.
2. **Resilience** — if a source is unreachable, the last known-good response is
   served and flagged `stale` rather than erroring. The UI shows an amber dot and
   a `STALE` note in the footer.
3. **Fewer round trips** — `/api/home` fans out to all weather types, the lunar
   table and every news feed concurrently and returns one payload.

```
browser ──▶ localhost:8787 ──┬──▶ data.weather.gov.hk   (weather)
                             ├──▶ www.hko.gov.hk         (icons, imagery, calendar)
                             └──▶ rss.weather.gov.hk     (news)
                │
                ├─ in-memory cache (per-source TTL)
                ├─ stale-on-error fallback
                └─ .cache/icons/*.png  (disk, permanent)
```

### Endpoints

| Route | Purpose |
|---|---|
| `GET /` | SPA shell |
| `GET /api/home?lang=tc` | **everything the homepage needs** in one response |
| `GET /api/bundle?lang=tc` | the six weather data types only |
| `GET /api/weather?type=rhrread&lang=tc` | a single data type (all 15 types accepted) |
| `GET /api/products?lang=tc` | **the nine dated/climatological products** in one response |
| `GET /api/products?type=LTMV` | one product only |
| `GET /api/history?kind=stations` | stations the archive actually holds, with row counts |
| `GET /api/history?kind=observation&station=HKO` | archived station series (`wind`, `lae`, `analysis`, `aviation` too) |
| `GET /api/lunar?date=2026-09-14&lang=tc` | lunar date + solar term |
| `GET /api/news?kind=whatsnew` | news headlines (RSS) |
| `GET /api/status` | uptime, cache stats, last upstream error |
| `GET /api/analysis` | high-resolution analysis: grid, scores, selection, field stats |
| `GET /analysis/field.png` | the analysis raster (RGBA, sea transparent) |
| `GET /api/wind` | vector wind field, station observations, vector LOO validation |
| `GET /api/lae?alt=120` | full LAE assessment + decoded METAR/TAF + wind field |
| `GET /icons/pic{nn}.png` | proxied + disk-cached weather icon |
| `GET /imagery/{radar,satellite,lightning}` | proxied live imagery, 60 s cache |

Add `&force=1` to bypass the cache. `lang` accepts `tc`, `sc`, or `en` — this
switches the API's own text, so station names, forecasts, warnings **and the lunar
calendar table** all change language.

### Data types

| Source | Cache | Drives |
|---|---|---|
| `rhrread` | 5 min | current temp, humidity, UV, rainfall, lightning |
| `flw` | 10 min | local weather forecast |
| `fnd` | 60 min | 9-day forecast, sea and soil temperature |
| `warnsum` / `warningInfo` | 1 min | active warnings |
| `swt` | 1 min | special weather tips |
| lunar calendar | 24 h | header date box |
| imagery | 60 s | radar / satellite / lightning |
| `whatsnew` RSS | 30 min | news headlines |

---

## The SPA

Seven hash-routed views, no framework:

| Route | Contents |
|---|---|
| `#/home` | **all homepage modules in the Observatory's order** |
| `#/overview` | current conditions, forecast text, key readings |
| `#/regional` | SVG station map + sortable table + 3-D isometric chart |
| `#/analysis` | high-resolution analysis: raster overlay, estimator comparison |
| `#/lae` | **LAE go/no-go**: verdict, factor table, wind arrows, METAR/TAF |
| `#/imagery` | radar, satellite, lightning |
| `#/forecast` | 9-day cards, sea and soil temperature |
| `#/alerts` | warnings, warning statements, special tips |
| `#/news` | headline lists with links back to HKO |

**Language** — 繁 / 简 / EN switches the UI chrome, the API language, and the
calendar source. Persisted in `localStorage`.

**The station map** is hand-built SVG — an equirectangular projection over a
760×470 viewBox with stylised land outlines and 26 station markers coloured on a
temperature ramp. Station coordinates are approximate and the map says so.

**The 3-D chart** is drawn with the Canvas 2D API using an isometric projection
written for this project — no charting library, no WebGL. Each bar is three shaded
faces, and the scene auto-fits by measuring its projected bounding box before
drawing. Hover for a readout, drawn as a second pass over the bars.

---

## Troubleshooting

**Port already in use** — the server says so and exits. Start elsewhere:
`node server.js 8788`.

**Everything grey, footer says STALE** — HKO was unreachable; the last successful
response is being served. Check `/api/status` for the upstream error.

**Icons missing** — delete `.cache/icons/` and reload.

**Wrong language on first load** — clear the `hko-local-lang` `localStorage` key.
