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

## Layout

```
hko-local/
├─ server.js          zero-dependency HTTP server: static host, API gateway, caches
├─ start.bat          Windows launcher (prompts for port, opens browser)
├─ start.sh           POSIX launcher
├─ lib/
│  ├─ png.js          PNG codec (terrarium DEM in, RGBA raster out)
│  ├─ dem.js          terrain tiles -> mosaic -> void fill -> analysis grid
│  ├─ interp.js       IDW, kriging, variogram, leave-one-out cross-validation
│  ├─ analysis.js     post-processing pipeline, vector wind field, LAE assembly
│  ├─ wind.js         compass parsing, u/v vector algebra, CSV edge cases
│  ├─ aviation.js     METAR / TAF decoding, worst-case merging
│  ├─ lae.js          go/no-go model, thresholds, wind-profile extrapolation
│  ├─ stations.js     observation + wind station coordinates
│  └─ colormap.js     temperature and wind ramps -> RGBA
├─ scripts/
│  ├─ check-dem.js    16 checks: codec, georeferencing, DEM accuracy, alignment
│  ├─ check-interp.js 11 checks: synthetic control + live LOO
│  ├─ check-lae.js    41 checks: vector wind, CSV edge cases, METAR/TAF
│  └─ debug-*.js      ad-hoc diagnostics used while building
├─ docs/
│  ├─ ANALYSIS_METHOD.md   analysis method, validation, limitations
│  └─ LAE_PRODUCT.md       LAE product method, thresholds, limitations
├─ public/
│  ├─ index.html      SPA shell: masthead, nav, modules, footer
│  ├─ styles.css      stylesheet (design tokens matched to HKO)
│  └─ app.js          SPA: router, views, i18n, SVG map, 3-D chart, analysis view
└─ .cache/
   ├─ icons/          weather icons cached on first request
   └─ dem/            terrain tiles cached on first run (~48 tiles)
```

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
| `GET /api/weather?type=rhrread&lang=tc` | a single data type |
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
