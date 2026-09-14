#!/usr/bin/env node
'use strict';

/**
 * hko-local — local SPA host + caching gateway for HKO public open data.
 *
 * Zero npm dependencies (Node >= 18, uses global fetch).
 *
 *   GET /                     -> SPA shell (public/index.html)
 *   GET /api/bundle?lang=tc   -> every weather dataType in one response
 *   GET /api/weather?type=..  -> single dataType passthrough
 *   GET /api/status           -> cache/health diagnostics
 *   GET /icons/pic{n}.png     -> HKO public weather icon (disk cached)
 *
 * Data source: Hong Kong Observatory Open Data API (data.weather.gov.hk).
 * Icons:       Hong Kong Observatory public weather icon set.
 */

const http = require('http');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const analysis = require('./lib/analysis');
const store = require('./lib/store');
const { STATIONS } = require('./lib/stations');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const CACHE_DIR = path.join(ROOT, '.cache');
const ICON_DIR = path.join(CACHE_DIR, 'icons');

const HKO_API = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php';
const HKO_OPEN = 'https://data.weather.gov.hk/weatherAPI/opendata/opendata.php';
const HKO_EQ = 'https://data.weather.gov.hk/weatherAPI/opendata/earthquake.php';
const HKO_ICON_BASE = 'https://www.hko.gov.hk/images/HKOWxIconOutline';
const UA = 'hko-local/1.0 (local development gateway; contact: local operator)';

const DEFAULT_PORT = 8787;
const UPSTREAM_TIMEOUT_MS = 20000;

/**
 * Upstream sources, keyed by dataType.
 *
 * The Observatory splits its open data across three services:
 *   weather.php     the six live products (observations, forecasts, warnings)
 *   opendata.php    dated and climatological products (climate, astronomy, tides,
 *                   visibility, yesterday's readings)
 *   earthquake.php  the earthquake service
 *
 * `ttl` is the freshness window. `extra` holds fixed query parameters; the tokens
 * 'yesterday' / 'lastYear' / 'thisYear' / 'thisMonth' are resolved per request,
 * because a dated product needs a concrete date and hard-coding one would rot.
 */
const SOURCES = {
  /* --- weather.php: live products --- */
  rhrread: { url: HKO_API, ttl: 5 * 60 * 1000 },
  flw: { url: HKO_API, ttl: 10 * 60 * 1000 },
  fnd: { url: HKO_API, ttl: 60 * 60 * 1000 },
  warnsum: { url: HKO_API, ttl: 60 * 1000 },
  warningInfo: { url: HKO_API, ttl: 60 * 1000 },
  swt: { url: HKO_API, ttl: 60 * 1000 },

  /* --- opendata.php: dated + climatological --- */
  LTMV: { url: HKO_OPEN, ttl: 10 * 60 * 1000, extra: { rformat: 'json' } },
  RYES: { url: HKO_OPEN, ttl: 6 * 60 * 60 * 1000, extra: { rformat: 'json', station: 'HKO', date: 'yesterday' } },
  CLMTEMP: { url: HKO_OPEN, ttl: 24 * 60 * 60 * 1000, extra: { rformat: 'json', station: 'HKO', year: 'lastYear' } },
  CLMMAXT: { url: HKO_OPEN, ttl: 24 * 60 * 60 * 1000, extra: { rformat: 'json', station: 'HKO', year: 'lastYear' } },
  CLMMINT: { url: HKO_OPEN, ttl: 24 * 60 * 60 * 1000, extra: { rformat: 'json', station: 'HKO', year: 'lastYear' } },
  SRS: { url: HKO_OPEN, ttl: 12 * 60 * 60 * 1000, extra: { rformat: 'json', year: 'thisYear', month: 'thisMonth' } },
  MRS: { url: HKO_OPEN, ttl: 12 * 60 * 60 * 1000, extra: { rformat: 'json', year: 'thisYear', month: 'thisMonth' } },
  HHOT: { url: HKO_OPEN, ttl: 6 * 60 * 60 * 1000, extra: { rformat: 'json', station: 'CCH', year: 'thisYear', month: 'thisMonth' } },

  /* --- earthquake.php --- */
  qem: { url: HKO_EQ, ttl: 5 * 60 * 1000 },
};

/** The live products on weather.php — what the home bundle fans out to. */
const LIVE_TYPES = ['rhrread', 'flw', 'fnd', 'warnsum', 'warningInfo', 'swt'];

/** The dated/climatological products behind the secondary pages. */
const PRODUCT_TYPES = ['LTMV', 'RYES', 'CLMTEMP', 'CLMMAXT', 'CLMMINT', 'SRS', 'MRS', 'HHOT', 'qem'];

const LANGS = new Set(['tc', 'sc', 'en']);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

/* ------------------------------------------------------------------ *
 * cache
 * ------------------------------------------------------------------ */

/** key: `${type}:${lang}` -> { body: object|string, ts: number, stale: boolean } */
const memCache = new Map();
const stats = { hits: 0, misses: 0, errors: 0, lastError: null, upstream: 0 };

function cacheGet(key) {
  const e = memCache.get(key);
  if (!e) return null;
  return e;
}

function isFresh(entry, ttl) {
  return entry && Date.now() - entry.ts < ttl;
}

/**
 * Resolve a relative date token into the concrete value the API expects.
 * Kept relative so the service does not silently keep asking for a stale year.
 */
function resolveParam(v) {
  const now = new Date();
  const p2 = (n) => String(n).padStart(2, '0');
  switch (v) {
    case 'yesterday': {
      const d = new Date(now.getTime() - 86400000);
      return `${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}`;
    }
    case 'lastYear': return String(now.getFullYear() - 1);
    case 'thisYear': return String(now.getFullYear());
    case 'thisMonth': return String(now.getMonth() + 1);
    default: return String(v);
  }
}

async function fetchUpstream(type, lang) {
  const src = SOURCES[type];
  if (!src) throw new Error(`unknown dataType ${type}`);
  const qs = new URLSearchParams({ dataType: type, lang });
  for (const [k, v] of Object.entries(src.extra || {})) qs.set(k, resolveParam(v));
  const u = `${src.url}?${qs.toString()}`;
  const res = await fetch(u, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`upstream ${type} HTTP ${res.status}`);
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    // HKO answers a bad request with an HTML help paragraph and HTTP 200, so a
    // parse failure here means the parameters are wrong, not that the service is
    // down. Surfacing it verbatim saves a lot of guessing.
    throw new Error(`upstream ${type} returned non-JSON payload: ${text.slice(0, 120)}`);
  }
  stats.upstream++;
  return parsed;
}

/**
 * Read-through cache. On upstream failure we deliberately serve the last
 * known-good value (marked stale) instead of erroring, so the UI stays useful
 * when HKO is unreachable or rate-limiting.
 */
async function getData(type, lang, { force = false } = {}) {
  const key = `${type}:${lang}`;
  const ttl = (SOURCES[type] && SOURCES[type].ttl) ?? 5 * 60 * 1000;
  const hit = cacheGet(key);

  if (!force && isFresh(hit, ttl)) {
    stats.hits++;
    return { value: hit.body, ts: hit.ts, stale: false, cached: true };
  }

  stats.misses++;
  try {
    const value = await fetchUpstream(type, lang);
    const ts = Date.now();
    memCache.set(key, { body: value, ts });
    // Archive every fresh rhrread report. Doing it here rather than in the route
    // means every caller is covered, and it only fires on a genuine upstream
    // fetch — the cache absorbs repeat polls, so the archive does not fill with
    // duplicate rows at the poll rate.
    if (type === 'rhrread') {
      try { store.recordObservations(value, STATIONS); } catch { /* archive must never break serving */ }
    }
    return { value, ts, stale: false, cached: false };
  } catch (err) {
    stats.errors++;
    stats.lastError = `${new Date().toISOString()} ${type}/${lang}: ${err.message}`;
    if (hit) {
      return { value: hit.body, ts: hit.ts, stale: true, cached: true, error: err.message };
    }
    throw err;
  }
}

/* ------------------------------------------------------------------ *
 * icon proxy (disk cached — HKO icon set is static)
 * ------------------------------------------------------------------ */

async function getIcon(picNo) {
  await fsp.mkdir(ICON_DIR, { recursive: true });
  const file = path.join(ICON_DIR, `pic${picNo}.png`);
  try {
    const buf = await fsp.readFile(file);
    return { buf, cached: true };
  } catch {
    /* not cached yet */
  }
  const res = await fetch(`${HKO_ICON_BASE}/pic${picNo}.png`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`icon ${picNo} HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  // Atomic-ish write so a killed process never leaves a truncated PNG behind.
  const tmp = `${file}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, buf);
  await fsp.rename(tmp, file);
  return { buf, cached: false };
}

/* ------------------------------------------------------------------ *
 * lunar calendar (Gregorian -> lunar date + solar term)
 * ------------------------------------------------------------------ */

const LUNAR_URL = (y, lang) =>
  lang === 'en'
    ? `https://www.hko.gov.hk/en/gts/time/calendar/text/files/T${y}e.txt`
    : `https://www.hko.gov.hk/tc/gts/time/calendar/text/files/T${y}c.txt`;
const lunarCache = new Map(); // `${year}:${lang}` -> { table, ts }

/** Chinese calendar table: 2026年1月5日  十七  星期一  小寒 */
function parseLunarTextC(txt) {
  const table = {};
  const re = /(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\S+)\s+星期(\S)\s*(.*)$/;
  for (const rawLine of txt.split(/\r?\n/)) {
    const m = re.exec(rawLine.trim());
    if (!m) continue;
    const [, y, mo, d, lunar, week, term] = m;
    const key = `${y.padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    table[key] = { lunar, week, term: (term || '').trim() };
  }
  return table;
}

/** English calendar table: 2026/1/5   17   Monday   Moderate Cold */
function parseLunarTextE(txt) {
  const table = {};
  const re = /^(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\S+)\s+(\S+)\s*(.*)$/;
  for (const rawLine of txt.split(/\r?\n/)) {
    const m = re.exec(rawLine.trim());
    if (!m) continue;
    const [, y, mo, d, lunar, week, term] = m;
    const key = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    table[key] = { lunar, week, term: (term || '').trim() };
  }
  return table;
}

async function getLunarTable(year, lang) {
  const cacheKey = `${year}:${lang}`;
  const hit = lunarCache.get(cacheKey);
  if (hit && Date.now() - hit.ts < 24 * 60 * 60 * 1000) return hit;

  const res = await fetch(LUNAR_URL(year, lang), {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`lunar HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const text = buf.toString('utf-8').replace(/^\uFEFF/, '');
  const entry = {
    table: lang === 'en' ? parseLunarTextE(text) : parseLunarTextC(text),
    ts: Date.now(),
    year,
    lang,
  };
  lunarCache.set(cacheKey, entry);
  return entry;
}

/** Today's date in Hong Kong time, as YYYY-MM-DD. */
function hkToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Hong_Kong', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

async function getLunarFor(dateIso, lang = 'tc') {
  const year = Number(dateIso.slice(0, 4));
  let entry = await getLunarTable(year, lang);
  if (!entry.table[dateIso]) {
    const prev = await getLunarTable(year - 1, lang).catch(() => null);
    if (prev && prev.table[dateIso]) entry = prev;
  }
  return entry.table[dateIso] || null;
}

/* ------------------------------------------------------------------ *
 * live imagery (radar / satellite / lightning)
 * ------------------------------------------------------------------ */

const IMAGERY = {
  radar: 'https://www.hko.gov.hk/content_elements_v2/images/radar/R1.jpg',
  satellite: 'https://www.hko.gov.hk/content_elements_v2/images/satellite/S1.jpg',
  lightning: 'https://www.hko.gov.hk/content_elements_v2/images/lightning/lightning.png',
};
const IMAGERY_TTL = 60 * 1000; // these products refresh every few minutes

async function getImagery(kind) {
  const key = `img:${kind}`;
  const hit = memCache.get(key);
  if (hit && Date.now() - hit.ts < IMAGERY_TTL) return hit.body;

  const res = await fetch(IMAGERY[kind], {
    headers: { 'User-Agent': UA, Referer: 'https://www.hko.gov.hk/' },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`imagery ${kind} HTTP ${res.status}`);
  const body = {
    buf: Buffer.from(await res.arrayBuffer()),
    type: res.headers.get('content-type') || 'image/jpeg',
  };
  memCache.set(key, { body, ts: Date.now() });
  return body;
}

/* ------------------------------------------------------------------ *
 * news headlines (link aggregation: headline text + URL, cached)
 * ------------------------------------------------------------------ */

/**
 * News sources.
 *
 * Only `whatsnew` publishes an RSS feed. The rest are JS-rendered index pages
 * with no machine-readable feed, so we link out to them rather than scraping.
 *
 * We surface headline text + URL only and link back to HKO. HKO's feed carries
 * an explicit copyright notice prohibiting republication of its content, so no
 * article body, image or feed payload is stored or reshown.
 */
const NEWS_SOURCES = {
  whatsnew: {
    kind: 'rss',
    url: 'https://rss.weather.gov.hk/rss/whatsnew_uc.xml',
    page: 'https://www.hko.gov.hk/tc/whatsnew/index.htm',
  },
  hkonews:            { kind: 'link', page: 'https://www.hko.gov.hk/tc/hkonews/index.htm' },
  blog:               { kind: 'link', page: 'https://www.hko.gov.hk/tc/blog/index.htm' },
  forecaster_blog:    { kind: 'link', page: 'https://www.hko.gov.hk/tc/forecaster_blog/index.htm' },
};
const NEWS_TTL = 30 * 60 * 1000;
const NEWS_CACHE = new Map();

function xmlUnescape(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ').trim();
}

/** Minimal RSS 2.0 item parser — title + link only. */
function parseRssItems(xml, limit = 8) {
  const out = [];
  const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) && out.length < limit) {
    const block = m[1];
    const t = /<title>([\s\S]*?)<\/title>/i.exec(block);
    const l = /<link>([\s\S]*?)<\/link>/i.exec(block);
    if (!t) continue;
    const text = xmlUnescape(t[1]);
    const url = l ? xmlUnescape(l[1]) : '';
    if (!text) continue;
    out.push({ text, url });
  }
  return out;
}

async function getNews(kind) {
  const hit = NEWS_CACHE.get(kind);
  if (hit && Date.now() - hit.ts < NEWS_TTL) return hit.items;

  const src = NEWS_SOURCES[kind];
  if (!src || src.kind !== 'rss') {
    // No feed available: caller renders a link out to HKO's own page instead.
    return [];
  }

  const res = await fetch(src.url, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`news ${kind} HTTP ${res.status}`);
  const xml = await res.text();
  const items = parseRssItems(xml);
  NEWS_CACHE.set(kind, { items, ts: Date.now() });
  return items;
}

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

function sendJson(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': MIME['.json'],
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(body);
}

function sendText(res, status, text, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

function safeLang(v) {
  const lang = String(v || 'tc').toLowerCase();
  return LANGS.has(lang) ? lang : 'tc';
}

function safePic(v) {
  const n = String(v || '').replace(/[^0-9w]/gi, '');
  // 'w' variants (e.g. pic54w) do not exist in the outline set; digits only.
  return /^\d{1,3}$/.test(n) ? n : null;
}

/** Resolve a URL path against PUBLIC_DIR, refusing anything that escapes it. */
function resolveStatic(urlPath) {
  let p = decodeURIComponent(urlPath.split('?')[0]);
  if (p === '/' || p === '') p = '/index.html';
  const resolved = path.resolve(PUBLIC_DIR, '.' + path.posix.normalize(p));
  const base = path.resolve(PUBLIC_DIR);
  if (resolved !== base && !resolved.startsWith(base + path.sep)) return null;
  return resolved;
}

/* ------------------------------------------------------------------ *
 * routes
 * ------------------------------------------------------------------ */

async function handleApi(req, res, u) {
  const q = u.searchParams;

  if (u.pathname === '/api/status') {
    const entries = [...memCache.entries()].map(([k, v]) => ({
      key: k,
      ageSec: Math.round((Date.now() - v.ts) / 1000),
      bytes: JSON.stringify(v.body).length,
    }));
    return sendJson(res, 200, {
      ok: true,
      now: new Date().toISOString(),
      uptimeSec: Math.round(process.uptime()),
      node: process.version,
      upstreamCalls: stats.upstream,
      cacheHits: stats.hits,
      cacheMisses: stats.misses,
      errors: stats.errors,
      lastError: stats.lastError,
      cached: entries,
    });
  }

  if (u.pathname === '/api/weather') {
    const type = String(q.get('type') || '');
    if (!Object.prototype.hasOwnProperty.call(SOURCES, type)) {
      return sendJson(res, 400, {
        ok: false,
        error: `unsupported dataType "${type}"`,
        allowed: Object.keys(SOURCES),
      });
    }
    const lang = safeLang(q.get('lang'));
    const force = q.get('force') === '1';
    try {
      const r = await getData(type, lang, { force });
      return sendJson(res, 200, {
        ok: true, type, lang, fetchedAt: new Date(r.ts).toISOString(),
        stale: r.stale, cached: r.cached, data: r.value,
        ...(r.error ? { upstreamError: r.error } : {}),
      });
    } catch (err) {
      return sendJson(res, 502, { ok: false, type, lang, error: err.message });
    }
  }

  if (u.pathname === '/api/bundle') {
    const lang = safeLang(q.get('lang'));
    const force = q.get('force') === '1';
    const types = LIVE_TYPES;

    const results = await Promise.all(
      types.map(async (t) => {
        try {
          const r = await getData(t, lang, { force });
          return [t, { ok: true, data: r.value, stale: r.stale, ts: r.ts, error: r.error || null }];
        } catch (err) {
          return [t, { ok: false, data: null, stale: true, ts: Date.now(), error: err.message }];
        }
      })
    );

    const payload = { ok: true, lang, requestedAt: new Date().toISOString(), errors: [], stale: false };
    for (const [t, r] of results) {
      payload[t] = r.data;
      payload.meta = payload.meta || {};
      payload.meta[t] = { ok: r.ok, stale: r.stale, fetchedAt: new Date(r.ts).toISOString(), error: r.error };
      if (!r.ok) payload.errors.push({ type: t, error: r.error });
      if (r.stale) payload.stale = true;
    }
    return sendJson(res, 200, payload);
  }

  if (u.pathname === '/api/lunar') {
    const dateIso = String(q.get('date') || hkToday());
    const lang = safeLang(q.get('lang'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
      return sendJson(res, 400, { ok: false, error: 'date must be YYYY-MM-DD' });
    }
    try {
      const entry = await getLunarFor(dateIso, lang);
      return sendJson(res, 200, { ok: true, date: dateIso, lang, hkToday: hkToday(), ...(entry || {}), found: !!entry });
    } catch (err) {
      return sendJson(res, 502, { ok: false, date: dateIso, lang, error: err.message });
    }
  }

  if (u.pathname === '/api/news') {
    const kind = String(q.get('kind') || 'whatsnew');
    if (!Object.prototype.hasOwnProperty.call(NEWS_SOURCES, kind)) {
      return sendJson(res, 400, { ok: false, error: `unknown news kind "${kind}"`, allowed: Object.keys(NEWS_SOURCES) });
    }
    try {
      const items = await getNews(kind);
      return sendJson(res, 200, {
        ok: true, kind,
        hasFeed: NEWS_SOURCES[kind].kind === 'rss',
        source: NEWS_SOURCES[kind].page,
        count: items.length, items,
      });
    } catch (err) {
      return sendJson(res, 502, { ok: false, kind, error: err.message, source: NEWS_SOURCES[kind].page, items: [] });
    }
  }

  if (u.pathname === '/api/home') {
    const lang = safeLang(q.get('lang'));
    const force = q.get('force') === '1';
    const types = LIVE_TYPES;
    const today = hkToday();

    const [weatherResults, lunarSettled, newsSettled] = await Promise.all([
      Promise.all(types.map(async (t) => {
        try {
          const r = await getData(t, lang, { force });
          return [t, { ok: true, data: r.value, stale: r.stale, ts: r.ts, error: r.error || null }];
        } catch (err) {
          return [t, { ok: false, data: null, stale: true, ts: Date.now(), error: err.message }];
        }
      })),
      getLunarFor(today, lang).then((v) => ({ ok: true, value: v })).catch((e) => ({ ok: false, error: e.message })),
      Promise.all(Object.keys(NEWS_SOURCES).map(async (k) => {
        try { return [k, { ok: true, items: await getNews(k) }]; }
        catch (e) { return [k, { ok: false, items: [], error: e.message }]; }
      })),
    ]);

    const payload = {
      ok: true, lang, requestedAt: new Date().toISOString(),
      errors: [], stale: false, meta: {},
      lunar: { date: today, ...(lunarSettled.ok ? lunarSettled.value || {} : {}), ok: lunarSettled.ok, error: lunarSettled.error || null },
      news: {},
    };

    for (const [t, r] of weatherResults) {
      payload[t] = r.data;
      payload.meta[t] = { ok: r.ok, stale: r.stale, fetchedAt: new Date(r.ts).toISOString(), error: r.error };
      if (!r.ok) payload.errors.push({ type: t, error: r.error });
      if (r.stale) payload.stale = true;
    }
    for (const [k, r] of newsSettled) {
      payload.news[k] = { ok: r.ok, items: r.items, error: r.error || null };
      if (!r.ok) payload.errors.push({ type: `news:${k}`, error: r.error });
    }
    return sendJson(res, 200, payload);
  }

  if (u.pathname === '/api/products') {
    const force = q.get('force') === '1';
    const lang = LANGS.has(q.get('lang')) ? q.get('lang') : 'tc';

    // One product on demand, or all of them for the secondary pages. The type is
    // checked against the table, so the endpoint cannot be pointed at an
    // arbitrary upstream URL.
    const only = q.get('type');
    if (only && !PRODUCT_TYPES.includes(only)) {
      return sendJson(res, 400, { ok: false, error: `unknown product type: ${only}` });
    }
    const types = only ? [only] : PRODUCT_TYPES;

    const out = { ok: true, lang, requestedAt: new Date().toISOString(), stale: false, errors: [], meta: {} };
    const settled = await Promise.all(types.map(async (t) => {
      try {
        const r = await getData(t, lang, { force });
        return [t, { ok: true, data: r.value, stale: r.stale, ts: r.ts, error: r.error || null }];
      } catch (err) {
        stats.errors++;
        stats.lastError = `${new Date().toISOString()} products:${t}: ${err.message}`;
        return [t, { ok: false, data: null, stale: true, ts: Date.now(), error: err.message }];
      }
    }));

    for (const [t, r] of settled) {
      out[t] = r.data;
      out.meta[t] = { ok: r.ok, stale: r.stale, fetchedAt: new Date(r.ts).toISOString(), error: r.error };
      if (!r.ok) out.errors.push({ type: t, error: r.error });
      if (r.stale) out.stale = true;
    }
    return sendJson(res, 200, out);
  }

  if (u.pathname === '/api/analysis') {
    const force = q.get('force') === '1';
    try {
      const r = await analysis.run({
        cacheDir: CACHE_DIR,
        getRhrread: () => getData('rhrread', 'tc', { force }).then((x) => x.value),
        force,
      });
      const { pngBuffer, ...json } = r;
      return sendJson(res, 200, json);
    } catch (err) {
      stats.errors++;
      stats.lastError = `${new Date().toISOString()} analysis: ${err.message}`;
      return sendJson(res, 502, { ok: false, error: err.message });
    }
  }

  if (u.pathname === '/api/wind') {
    try {
      const r = await analysis.runWind({ cacheDir: CACHE_DIR });
      return sendJson(res, 200, r);
    } catch (err) {
      stats.errors++;
      stats.lastError = `${new Date().toISOString()} wind: ${err.message}`;
      return sendJson(res, 502, { ok: false, error: err.message });
    }
  }

  if (u.pathname === '/api/lae') {
    // Number(null) is 0 and 0 is finite, so an absent parameter has to be tested
    // for explicitly — otherwise it silently clamps to the 10 m floor.
    const altParam = q.get('alt');
    const altRaw = (altParam == null || altParam === '') ? NaN : Number(altParam);
    const altitudeM = Number.isFinite(altRaw) ? Math.max(10, Math.min(3000, altRaw)) : 120;
    try {
      const lang = safeLang(q.get('lang'));
      const wRes = await getData('warnsum', lang, {});
      const warnObj = wRes.value || {};
      const warnings = Array.isArray(warnObj)
        ? []
        : Object.values(warnObj).filter((x) => x && typeof x === 'object');

      const r = await analysis.runLae({
        cacheDir: CACHE_DIR,
        getRhrread: () => getData('rhrread', 'tc', {}).then((x) => x.value),
        warnings,
        altitudeM,
      });
      return sendJson(res, 200, r);
    } catch (err) {
      stats.errors++;
      stats.lastError = `${new Date().toISOString()} lae: ${err.message}`;
      return sendJson(res, 502, { ok: false, error: err.message });
    }
  }

  if (u.pathname === '/api/db/status') {
    return sendJson(res, 200, { ok: true, ...store.dbStats() });
  }

  if (u.pathname === '/api/history') {
    const kind = String(q.get('kind') || 'lae');
    const limitRaw = Number(q.get('limit'));
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(1000, limitRaw)) : 20;
    const station = q.get('station') || null;
    const from = q.get('from') || null;
    const to = q.get('to') || null;

    if (!store.isOpen()) {
      return sendJson(res, 503, { ok: false, error: 'archive unavailable (node:sqlite not present)' });
    }

    try {
      switch (kind) {
        case 'lae':
          return sendJson(res, 200, { ok: true, kind, limit, items: store.recentAssessments(limit) });
        case 'analysis':
          return sendJson(res, 200, { ok: true, kind, limit, items: store.recentAnalyses(limit) });
        case 'observation':
          if (!station) return sendJson(res, 400, { ok: false, error: 'station is required for kind=observation' });
          return sendJson(res, 200, { ok: true, kind, station, limit, items: store.stationSeries(station, { from, to, limit }) });
        case 'wind':
          if (!station) return sendJson(res, 400, { ok: false, error: 'station is required for kind=wind' });
          return sendJson(res, 200, { ok: true, kind, station, limit, items: store.windSeries(station, { limit }) });
        case 'aviation':
          return sendJson(res, 200, { ok: true, kind, limit, items: store.verification(limit) });
        default:
          return sendJson(res, 400, {
            ok: false, error: `unknown kind "${kind}"`,
            allowed: ['lae', 'analysis', 'observation', 'wind', 'aviation'],
          });
      }
    } catch (err) {
      return sendJson(res, 500, { ok: false, error: err.message });
    }
  }

  if (u.pathname === '/api/db/maintain') {
    if (!store.isOpen()) return sendJson(res, 503, { ok: false, error: 'archive unavailable' });
    const daysRaw = Number(q.get('days'));
    const days = Number.isFinite(daysRaw) ? daysRaw : 90;
    const pruned = store.prune({ days });
    const maint = store.maintain();
    return sendJson(res, 200, { ok: true, pruned, maintenance: maint, stats: store.dbStats() });
  }

  return sendJson(res, 404, { ok: false, error: 'unknown api route' });
}

async function handleIcon(req, res, u, picNo) {
  try {
    const { buf, cached } = await getIcon(picNo);
    res.writeHead(200, {
      'Content-Type': 'image/png',
      'Content-Length': buf.length,
      'Cache-Control': 'public, max-age=86400',
      'X-Icon-Cache': cached ? 'HIT' : 'MISS',
    });
    return res.end(buf);
  } catch (err) {
    return sendJson(res, 502, { ok: false, error: err.message });
  }
}

async function handleStatic(req, res, u) {
  const file = resolveStatic(u.pathname);
  if (!file) return sendText(res, 403, 'Forbidden');
  try {
    const st = await fsp.stat(file);
    if (st.isDirectory()) {
      return sendText(res, 404, 'Not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': st.size,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(file).pipe(res);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

/* ------------------------------------------------------------------ *
 * server
 * ------------------------------------------------------------------ */

const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://localhost');

  try {
    if (u.pathname.startsWith('/api/')) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        return sendJson(res, 405, { ok: false, error: 'method not allowed' });
      }
      return await handleApi(req, res, u);
    }

    const iconMatch = u.pathname.match(/^\/icons\/pic([^/]+)\.png$/);
    if (iconMatch) {
      const picNo = safePic(iconMatch[1]);
      if (!picNo) return sendText(res, 400, 'Bad icon request');
      return await handleIcon(req, res, u, picNo);
    }

    const imgMatch = u.pathname.match(/^\/imagery\/(radar|satellite|lightning)$/);
    if (imgMatch) {
      try {
        const { buf, type } = await getImagery(imgMatch[1]);
        res.writeHead(200, {
          'Content-Type': type,
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=60',
        });
        return res.end(buf);
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message });
      }
    }

    if (u.pathname === '/analysis/field.png') {
      try {
        const buf = await analysis.raster({
          cacheDir: CACHE_DIR,
          getRhrread: () => getData('rhrread', 'tc', {}).then((x) => x.value),
        });
        res.writeHead(200, {
          'Content-Type': 'image/png',
          'Content-Length': buf.length,
          'Cache-Control': 'public, max-age=300',
        });
        return res.end(buf);
      } catch (err) {
        return sendJson(res, 502, { ok: false, error: err.message });
      }
    }

    return await handleStatic(req, res, u);
  } catch (err) {
    stats.errors++;
    stats.lastError = `${new Date().toISOString()} ${u.pathname}: ${err.message}`;
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: err.message });
    else res.end();
  }
});

/* ------------------------------------------------------------------ *
 * archive lifecycle
 * ------------------------------------------------------------------ */

const ARCHIVE_PATH = path.join(CACHE_DIR, 'archive.db');
const RETENTION_DAYS = Number(process.env.RETENTION_DAYS) || 90;
const PRUNE_INTERVAL_MS = 24 * 60 * 60 * 1000;

function startArchive() {
  const ok = store.open(ARCHIVE_PATH, { verbose: true });
  if (!ok) return false;

  // Retention runs on a timer, never in a request path — a DELETE that scans
  // every table has no business inside a response.
  const timer = setInterval(() => {
    const r = store.prune({ days: RETENTION_DAYS });
    if (r.deleted) console.log(`[archive] pruned ${r.deleted} rows older than ${RETENTION_DAYS} days`);
    if (r.error) console.warn(`[archive] prune refused: ${r.error}`);
  }, PRUNE_INTERVAL_MS);
  timer.unref();   // never hold the process open just to prune

  const shutdown = () => {
    clearInterval(timer);
    const m = store.maintain();
    if (m.ok) console.log('[archive] checkpointed and closed');
    store.close();
  };
  process.once('SIGINT', () => { shutdown(); process.exit(0); });
  process.once('SIGTERM', () => { shutdown(); process.exit(0); });

  return true;
}

function listen(port, host = '127.0.0.1') {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[!] Port ${port} is already in use.`);
      console.error(`    Start on another port, e.g.  node server.js ${port + 1}\n`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, host, () => {
    const line = '='.repeat(58);
    console.log(line);
    console.log('  HKO 本地天氣站  /  HKO local weather station');
    console.log(line);
    console.log(`  Listening http://${host}:${port}/`);
    if (host !== '127.0.0.1') {
      console.log(`  NOTE: bound to ${host}, not loopback — this gateway has no`);
      console.log(`        authentication and should sit behind a reverse proxy.`);
    }
    console.log(`  Health   http://${host}:${port}/api/status`);
    console.log(`  Data     HKO Open Data API (data.weather.gov.hk)`);
    if (store.isOpen()) {
      const s = store.dbStats();
      console.log(`  Archive  ${ARCHIVE_PATH}  (${Object.values(s.tables).reduce((a, b) => a + (b || 0), 0)} rows, retention ${RETENTION_DAYS}d)`);
    } else {
      console.log(`  Archive  disabled (node:sqlite unavailable) — display layer unaffected`);
    }
    console.log(line);
    console.log('  Ctrl+C to stop.');
  });
}

if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || DEFAULT_PORT);
  // Loopback by default. A container or reverse-proxy deployment sets HOST, but
  // this service has no auth, so exposing it is a deliberate act.
  const host = process.env.HOST || '127.0.0.1';
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid port: ${process.argv[2]}`);
    process.exit(1);
  }
  startArchive();
  listen(port, host);
}

module.exports = { server, getData, startArchive };
