'use strict';

/**
 * Endpoint latency and payload benchmark.
 *
 *   node scripts/bench.js [baseUrl] [--force]
 *
 * Measures from inside Node rather than through a shell, so the numbers are not
 * contaminated by process spawn overhead. Reports the median of several runs
 * because a single sample on a laptop is noise.
 *
 * Run this before and after a change to see what it cost.
 */

const BASE = process.argv.find((a) => a.startsWith('http')) || 'http://localhost:8787';
const FORCE = process.argv.includes('--force');
const RUNS = Number((process.argv.find((a) => a.startsWith('--runs=')) || '').split('=')[1]) || 3;

const ENDPOINTS = [
  ['/',                                   'SPA shell'],
  ['/app.js',                             'SPA script'],
  ['/styles.css',                         'stylesheet'],
  ['/icons/pic54.png',                    'weather icon (disk cached)'],
  ['/api/status',                         'health / cache stats'],
  ['/api/home?lang=tc',                   'all homepage data (6 upstream feeds)'],
  ['/api/lunar',                          'lunar date (calendar table)'],
  ['/api/news?kind=whatsnew',             'news headlines (RSS)'],
  ['/imagery/radar',                      'radar image (proxied)'],
  ['/api/analysis' + (FORCE ? '?force=1' : ''), 'temperature analysis (raster computed)'],
  ['/analysis/field.png',                 'analysis raster PNG'],
  ['/api/wind',                           'vector wind field (30 stations)'],
  ['/api/lae?alt=120',                    'LAE assessment (wind + METAR + TAF)'],
];

function ms(n) { return `${n.toFixed(0)} ms`; }
function kb(n) { return `${(n / 1024).toFixed(1)} KB`; }
function median(a) { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; }

(async () => {
  console.log('='.repeat(74));
  console.log(`  endpoint benchmark  ${BASE}${FORCE ? '  [forced recompute]' : ''}`);
  console.log('='.repeat(74));
  console.log(`  ${'endpoint'.padEnd(38)}${'median'.padStart(10)}${'min'.padStart(10)}${'bytes'.padStart(12)}`);

  let totalBytes = 0;
  const rows = [];

  for (const [path, label] of ENDPOINTS) {
    const times = [];
    let bytes = 0, status = 0;
    for (let i = 0; i < RUNS; i++) {
      const t0 = performance.now();
      try {
        const res = await fetch(BASE + path, { cache: 'no-store' });
        const buf = await res.arrayBuffer();
        times.push(performance.now() - t0);
        bytes = buf.byteLength;
        status = res.status;
      } catch (e) {
        times.push(NaN);
        status = -1;
      }
    }
    const med = median(times.filter(Number.isFinite));
    const min = Math.min(...times.filter(Number.isFinite));
    totalBytes += bytes;
    rows.push({ path, label, med, min, bytes, status });
    console.log(`  ${path.padEnd(38)}${ms(med).padStart(10)}${ms(min).padStart(10)}${kb(bytes).padStart(12)}` +
                (status === 200 ? '' : `   !! status ${status}`));
  }

  console.log('-'.repeat(74));
  console.log(`  total payload for one full page sweep: ${kb(totalBytes)}`);

  /* memory, if the process is local */
  try {
    const st = await (await fetch(BASE + '/api/status')).json();
    console.log(`  server uptime ${st.uptimeSec}s, node ${st.node}, ` +
                `upstream calls ${st.upstreamCalls}, cache hits ${st.cacheHits}, errors ${st.errors}`);
    const cached = (st.cached || []).reduce((a, c) => a + c.bytes, 0);
    console.log(`  in-memory cache: ${(st.cached || []).length} entries, ${kb(cached)}`);
  } catch { /* ignore */ }

  const slow = rows.filter((r) => r.med > 3000);
  console.log('\n' + '='.repeat(74));
  console.log(slow.length
    ? `  ${slow.length} endpoint(s) over 3 s: ${slow.map((r) => r.path).join(', ')}`
    : '  all endpoints under 3 s');
  console.log('='.repeat(74));
})();
