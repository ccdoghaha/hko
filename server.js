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

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');
const CACHE_DIR = path.join(ROOT, '.cache');
const ICON_DIR = path.join(CACHE_DIR, 'icons');

const HKO_API = 'https://data.weather.gov.hk/weatherAPI/opendata/weather.php';
const HKO_ICON_BASE = 'https://www.hko.gov.hk/images/HKOWxIconOutline';
const UA = 'hko-local/1.0 (local development gateway; contact: local operator)';

const DEFAULT_PORT = 8787;
const UPSTREAM_TIMEOUT_MS = 20000;

/** dataType -> freshness window in ms */
const DATA_TYPES = {
  rhrread: 5 * 60 * 1000,
  flw: 10 * 60 * 1000,
  fnd: 60 * 60 * 1000,
  warnsum: 60 * 1000,
  warningInfo: 60 * 1000,
  swt: 60 * 1000,
};

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

async function fetchUpstream(type, lang) {
  const u = `${HKO_API}?dataType=${encodeURIComponent(type)}&lang=${encodeURIComponent(lang)}`;
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
    throw new Error(`upstream ${type} returned non-JSON payload`);
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
  const ttl = DATA_TYPES[type] ?? 5 * 60 * 1000;
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
    if (!Object.prototype.hasOwnProperty.call(DATA_TYPES, type)) {
      return sendJson(res, 400, { ok: false, error: `unsupported dataType "${type}"`, allowed: Object.keys(DATA_TYPES) });
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
    const types = Object.keys(DATA_TYPES);

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

    return await handleStatic(req, res, u);
  } catch (err) {
    stats.errors++;
    stats.lastError = `${new Date().toISOString()} ${u.pathname}: ${err.message}`;
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: err.message });
    else res.end();
  }
});

function listen(port) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[!] Port ${port} is already in use.`);
      console.error(`    Start on another port, e.g.  node server.js ${port + 1}\n`);
      process.exit(1);
    }
    throw err;
  });

  server.listen(port, '127.0.0.1', () => {
    const line = '='.repeat(58);
    console.log(line);
    console.log('  HKO 本地天氣站  /  HKO local weather station');
    console.log(line);
    console.log(`  Local    http://localhost:${port}/`);
    console.log(`  Health   http://localhost:${port}/api/status`);
    console.log(`  Data     HKO Open Data API (data.weather.gov.hk)`);
    console.log(line);
    console.log('  Ctrl+C to stop.');
  });
}

if (require.main === module) {
  const port = Number(process.argv[2] || process.env.PORT || DEFAULT_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid port: ${process.argv[2]}`);
    process.exit(1);
  }
  listen(port);
}

module.exports = { server, getData };
