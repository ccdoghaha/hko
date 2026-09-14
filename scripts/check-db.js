'use strict';

/**
 * Validates the SQLite archive.
 *
 *   node scripts/check-db.js
 *
 * Runs entirely against a throwaway database in a temp directory, because a
 * test that scribbles on the live archive is not a test you can run often.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const store = require('../lib/store');
const { windStationByName } = require('../lib/stations');

const TMP = path.join(os.tmpdir(), 'hko-store-test');
const DB = path.join(TMP, 'archive.db');

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(44)} ${detail}`);
};

function cleanup() {
  for (const f of [DB, `${DB}-wal`, `${DB}-shm`]) { try { fs.unlinkSync(f); } catch {} }
  try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
}
function fresh() { store.close(); cleanup(); }

/* ---------- fixtures ---------- */
const STATIONS = [
  { id: 'HKO', tc: '香港天文台', lat: 22.302, lon: 114.174 },
  { id: 'KSC', tc: '京士柏', lat: 22.310, lon: 114.173 },
];

const RHRREAD = {
  updateTime: '2026-09-14T15:00:00+08:00',
  temperature: {
    recordTime: '2026-09-14T15:00:00+08:00',
    data: [{ place: '香港天文台', value: 28, unit: 'C' }, { place: '京士柏', value: 29, unit: 'C' }],
  },
  humidity: { recordTime: '2026-09-14T15:00:00+08:00', data: [{ place: '香港天文台', value: 81, unit: 'percent' }] },
  rainfall: { data: [{ place: '香港天文台', max: 0, min: 0, unit: 'mm' }] },
};

const WIND_ROWS = [
  // A station that exists in the wind network, and one that does not — the
  // second exercises the "no coordinates, keep it anyway" path.
  { station: "King's Park", dirDeg: 90, speedKmh: 5, gustKmh: 8, calm: false, usable: true },
  { station: 'Unknown Place', dirDeg: null, speedKmh: null, gustKmh: null, calm: false, usable: false },
];

(async () => {
  console.log('='.repeat(80));
  console.log('  1. Open and schema');
  console.log('='.repeat(80));

  console.log(`   node:sqlite available: ${store.available}`);
  if (!store.available) {
    console.log('   (node:sqlite missing — the store must degrade to a no-op, testing that path)');
    check('degrades without throwing', store.recordObservations(RHRREAD, STATIONS) === 0 && store.isOpen() === false,
      'writes return 0, isOpen false');
    check('queries return empty', Array.isArray(store.recentAssessments()) && store.recentAssessments().length === 0, '[]');
    check('dbStats reports unavailable', store.dbStats().available === false, 'available=false');
    const failed = results.filter((r) => !r.ok).length;
    console.log(`\n  RESULT: ${results.length - failed}/${results.length} passed`);
    process.exit(failed ? 1 : 0);
  }

  fresh();
  const opened = store.open(DB);
  check('database opens', opened && store.isOpen(), DB);
  check('file created on disk', fs.existsSync(DB), `${fs.statSync(DB).size} bytes`);

  /* ---------- 2. writes ---------- */
  console.log('\n' + '='.repeat(80));
  console.log('  2. Writes and idempotency');
  console.log('='.repeat(80));

  const n1 = store.recordObservations(RHRREAD, STATIONS);
  const n2 = store.recordObservations(RHRREAD, STATIONS);   // same report again
  let st = store.dbStats();
  check('observations inserted', st.tables.observation === 2, `${n1} rows reported, ${st.tables.observation} in table`);
  check('re-recording the same report is idempotent', st.tables.observation === 2,
    `inserted twice -> still ${st.tables.observation} rows (the poller runs twice as often as the feed updates)`);

  const later = JSON.parse(JSON.stringify(RHRREAD));
  later.temperature.recordTime = '2026-09-14T15:10:00+08:00';
  store.recordObservations(later, STATIONS);
  st = store.dbStats();
  check('a newer report adds rows', st.tables.observation === 4, `${st.tables.observation} rows`);

  store.recordWind(WIND_ROWS, '2026-09-14T15:20:00+08:00', windStationByName);
  st = store.dbStats();
  check('wind rows stored', st.tables.wind_observation === 2, `${st.tables.wind_observation} rows`);
  check('unmatched wind station still recorded', st.tables.wind_observation === 2,
    'station with no coordinates is kept, not discarded');

  store.recordAviation('METAR', {
    station: 'VHHH', issuedAt: new Date('2026-09-14T07:30:00Z'), raw: 'METAR VHHH 140730Z 32004KT 9999 FEW015 29/24 Q1012',
  });
  store.recordAviation('METAR', {
    station: 'VHHH', issuedAt: new Date('2026-09-14T07:30:00Z'), raw: 'METAR VHHH 140730Z 32004KT 9999 FEW015 29/24 Q1012',
  });
  store.recordAviation('TAF', { station: 'VHHH', issuedAt: new Date('2026-09-14T05:00:00Z'), raw: 'TAF VHHH 140500Z 1406/1512 30010KT' });
  st = store.dbStats();
  check('aviation reports stored', st.tables.aviation_report === 2, `METAR x2 (deduped) + TAF = ${st.tables.aviation_report}`);

  store.recordAnalysis({
    generatedAt: '2026-09-14T15:30:00.000Z', observationTime: '2026-09-14T15:00:00+08:00',
    gridCols: 290, gridRows: 216, metresPerCell: 249.6, selectedEstimator: 'raw-idw',
    correctionHelped: false, rmse: 1.026, fieldMin: 25.0, fieldMax: 30.0, fieldMean: 27.6, stations: 26,
  });
  store.recordLae({
    generatedAt: '2026-09-14T15:30:00.000Z', altitudeM: 120, verdict: 'NO-GO',
    summary: 'No-go: Thunderstorm (forecast)',
    factors: [{ key: 'thunder', status: 'NO-GO' }], blockers: ['Thunderstorm (forecast)'], cautions: ['Lightning detected'],
  });
  st = store.dbStats();
  check('analysis run stored', st.tables.analysis_run === 1, `${st.tables.analysis_run} row`);
  check('LAE assessment stored', st.tables.lae_assessment === 1, `${st.tables.lae_assessment} row`);

  /* ---------- 3. queries ---------- */
  console.log('\n' + '='.repeat(80));
  console.log('  3. Queries');
  console.log('='.repeat(80));

  const lae = store.recentAssessments(5);
  check('recentAssessments returns a verdict', lae.length === 1 && lae[0].verdict === 'NO-GO', lae[0] ? lae[0].verdict : '-');
  check('JSON columns are parsed back to arrays',
    Array.isArray(lae[0].blockers) && lae[0].blockers[0] === 'Thunderstorm (forecast)',
    JSON.stringify(lae[0].blockers));

  const an = store.recentAnalyses(5);
  check('recentAnalyses returns the selected estimator', an.length === 1 && an[0].selected_estimator === 'raw-idw',
    an[0] ? `${an[0].selected_estimator} rmse ${an[0].rmse}` : '-');

  const series = store.stationSeries('HKO', { limit: 10 });
  check('station time series in descending time', series.length === 2 && series[0].observed_at > series[1].observed_at,
    `${series.length} points, newest ${series[0].observed_at}`);
  check('time series carries the values', series[0].temperature_c === 28 && series[0].humidity_pct === 81,
    `T=${series[0].temperature_c} RH=${series[0].humidity_pct}`);

  const ws = store.windSeries('HKP', { limit: 5 });
  check('wind series returns rows', ws.length >= 1,
    `${ws.length} rows for HKP (King's Park), resolved via the wind station table`);
  check('wind series carries direction and gust', ws.length >= 1 && ws[0].direction_deg === 90 && ws[0].gust_kmh === 8,
    ws.length ? `dir=${ws[0].direction_deg} gust=${ws[0].gust_kmh}` : '-');
  const unresolved = store.windSeries('Unknown Place', { limit: 5 });
  check('station without coordinates is still queryable', unresolved.length === 1,
    `${unresolved.length} row under its raw name`);

  /* ---------- 4. retention ---------- */
  console.log('\n' + '='.repeat(80));
  console.log('  4. Retention and maintenance');
  console.log('='.repeat(80));

  // A dangerous retention must be refused, not obeyed: a negative or zero value
  // computes a cutoff in the future and would delete the whole archive.
  const refusal = store.prune({ days: -1 });
  check('prune refuses a nonsensical retention', refusal.deleted === 0 && !!refusal.error,
    refusal.error || 'no error reported');
  check('refused prune deleted nothing', store.dbStats().tables.observation === 4,
    `${store.dbStats().tables.observation} observation rows still present`);

  // Realistic retention: a recent row survives, an old one does not.
  const OLD = { ...RHRREAD, temperature: { recordTime: '2020-01-01T00:00:00+08:00', data: [{ place: '香港天文台', value: 15, unit: 'C' }] } };
  store.recordObservations(OLD, STATIONS);
  const withOld = store.dbStats().tables.observation;
  const pruned = store.prune({ days: 30 });
  const afterPrune = store.dbStats().tables.observation;
  check('prune removes only rows past retention', pruned.deleted > 0 && afterPrune < withOld,
    `${withOld} rows -> deleted ${pruned.deleted} -> ${afterPrune} left`);

  const maint = store.maintain();
  check('integrity check passes', maint.ok && /ok/i.test(String(maint.integrity)), String(maint.integrity));

  const bk = store.backupTo(path.join(TMP, 'backup.db'));
  check('online backup written', bk.ok && fs.existsSync(bk.path), bk.ok ? `${bk.bytes} bytes` : bk.error);

  /* ---------- 5. durability across reopen ---------- */
  console.log('\n' + '='.repeat(80));
  console.log('  5. Durability');
  console.log('='.repeat(80));

  const beforeReopen = store.recentAssessments(10).length;
  store.recordLae({ generatedAt: '2026-09-14T16:00:00.000Z', altitudeM: 60, verdict: 'GO', summary: 'Go', factors: [], blockers: [], cautions: [] });
  store.close();

  const reopened = store.open(DB);
  const after = store.recentAssessments(10);
  check('reopens and preserves history', reopened && after.length === beforeReopen + 1,
    `${beforeReopen} before -> ${after.length} after reopen`);
  check('newest first ordering', after.length >= 2 && after[0].generated_at > after[1].generated_at,
    after.length >= 2 ? `${after[0].generated_at} > ${after[1].generated_at}` : 'not enough rows');

  /* ---------- summary ---------- */
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + '='.repeat(80));
  console.log(`  RESULT: ${results.length - failed.length}/${results.length} passed` +
              (failed.length ? `   FAILURES: ${failed.map((f) => f.name).join('; ')}` : ''));
  console.log('='.repeat(80));

  store.close();
  cleanup();
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('\ncheck-db failed:', e); store.close(); cleanup(); process.exit(1); });
