'use strict';

/**
 * SQLite archive for the observation, analysis and LAE history.
 *
 * WHY THIS EXISTS
 *
 * The rest of the service is a *display* layer: it caches the latest reading and
 * throws the previous one away. That is fine for showing the weather and useless
 * for everything an operational service is actually asked afterwards:
 *
 *   "why was a no-go issued at 14:00 yesterday?"
 *   "how well did the wind field do against what actually happened?"
 *   "has the estimator selection been drifting?"
 *
 * Those are questions about history, so the history has to be kept. This module
 * writes an append-only archive and answers queries against it.
 *
 * Uses node:sqlite (Node 22+), which keeps the project at zero npm dependencies.
 * The module is marked experimental, so the store degrades to a NO-OP if it is
 * unavailable rather than taking the service down with it — the display layer
 * must keep working on a Node without it.
 *
 * Page data is HKO's, and the archive stores readings, not HKO's presentation:
 * no HTML, no images, no article text.
 */

const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;

/* ------------------------------------------------------------------ *
 * connection
 * ------------------------------------------------------------------ */

let DatabaseSync = null;
let available = false;
try {
  ({ DatabaseSync } = require('node:sqlite'));
  available = true;
} catch {
  available = false;
}

let db = null;
let statements = null;
let stats = { available, writes: 0, pruned: 0, errors: 0, lastError: null, openedAt: null, path: null };

const SCHEMA = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS observation (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  observed_at   TEXT    NOT NULL,
  station_id    TEXT    NOT NULL,
  station_name  TEXT    NOT NULL,
  lat           REAL,
  lon           REAL,
  temperature_c REAL,
  humidity_pct  REAL,
  rainfall_mm   REAL,
  source        TEXT    NOT NULL DEFAULT 'rhrread',
  recorded_at   TEXT    NOT NULL,
  UNIQUE(observed_at, station_id, source)
);

CREATE TABLE IF NOT EXISTS wind_observation (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  observed_at   TEXT    NOT NULL,
  station_id    TEXT    NOT NULL,
  station_name  TEXT    NOT NULL,
  lat           REAL,
  lon           REAL,
  direction_deg REAL,
  speed_kmh     REAL,
  gust_kmh      REAL,
  calm          INTEGER NOT NULL DEFAULT 0,
  recorded_at   TEXT    NOT NULL,
  UNIQUE(observed_at, station_id)
);

CREATE TABLE IF NOT EXISTS aviation_report (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  kind         TEXT    NOT NULL,
  station      TEXT    NOT NULL,
  issued_at    TEXT,
  raw          TEXT    NOT NULL,
  decoded      TEXT    NOT NULL,
  recorded_at  TEXT    NOT NULL,
  UNIQUE(kind, station, issued_at, raw)
);

CREATE TABLE IF NOT EXISTS analysis_run (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  generated_at       TEXT    NOT NULL,
  observation_time   TEXT,
  grid_cols          INTEGER,
  grid_rows          INTEGER,
  metres_per_cell    REAL,
  selected_estimator TEXT,
  correction_helped  INTEGER,
  rmse               REAL,
  field_min          REAL,
  field_max          REAL,
  field_mean         REAL,
  stations           INTEGER,
  recorded_at        TEXT    NOT NULL,
  UNIQUE(generated_at, selected_estimator)
);

CREATE TABLE IF NOT EXISTS lae_assessment (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  generated_at TEXT    NOT NULL,
  altitude_m   REAL,
  verdict      TEXT    NOT NULL,
  summary      TEXT,
  factors      TEXT    NOT NULL,
  blockers     TEXT,
  cautions     TEXT,
  recorded_at  TEXT    NOT NULL,
  UNIQUE(generated_at, altitude_m)
);

CREATE INDEX IF NOT EXISTS idx_observation_time    ON observation(observed_at);
CREATE INDEX IF NOT EXISTS idx_observation_station ON observation(station_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_wind_time           ON wind_observation(observed_at);
CREATE INDEX IF NOT EXISTS idx_wind_station        ON wind_observation(station_id, observed_at);
CREATE INDEX IF NOT EXISTS idx_aviation_kind       ON aviation_report(kind, station, issued_at);
CREATE INDEX IF NOT EXISTS idx_analysis_time       ON analysis_run(generated_at);
CREATE INDEX IF NOT EXISTS idx_lae_time            ON lae_assessment(generated_at);
CREATE INDEX IF NOT EXISTS idx_lae_verdict         ON lae_assessment(verdict, generated_at);
`;

/**
 * Open the archive.
 *
 * WAL is enabled so a reader (a query from the UI) never blocks the writer
 * (the next observation landing). synchronous=NORMAL is the right trade for an
 * append-only archive that can lose its last few seconds on a hard power cut
 * without losing the file.
 */
function open(dbPath, { verbose = false } = {}) {
  if (!available) {
    if (verbose) console.log('[store] node:sqlite unavailable — archive disabled, display layer unaffected');
    return false;
  }
  try {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    db = new DatabaseSync(dbPath);

    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA synchronous = NORMAL');
    db.exec('PRAGMA foreign_keys = ON');
    db.exec('PRAGMA busy_timeout = 5000');

    db.exec(SCHEMA);

    const row = db.prepare('SELECT version FROM schema_version LIMIT 1').get();
    if (!row) {
      db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(SCHEMA_VERSION);
    } else if (row.version !== SCHEMA_VERSION) {
      throw new Error(`schema version ${row.version} != expected ${SCHEMA_VERSION} (migration required)`);
    }

    statements = {
      obs: db.prepare(`INSERT OR IGNORE INTO observation
        (observed_at, station_id, station_name, lat, lon, temperature_c, humidity_pct, rainfall_mm, source, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
      wind: db.prepare(`INSERT OR IGNORE INTO wind_observation
        (observed_at, station_id, station_name, lat, lon, direction_deg, speed_kmh, gust_kmh, calm, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
      aviation: db.prepare(`INSERT OR IGNORE INTO aviation_report
        (kind, station, issued_at, raw, decoded, recorded_at) VALUES (?, ?, ?, ?, ?, ?)`),
      analysis: db.prepare(`INSERT OR IGNORE INTO analysis_run
        (generated_at, observation_time, grid_cols, grid_rows, metres_per_cell, selected_estimator,
         correction_helped, rmse, field_min, field_max, field_mean, stations, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`),
      lae: db.prepare(`INSERT OR IGNORE INTO lae_assessment
        (generated_at, altitude_m, verdict, summary, factors, blockers, cautions, recorded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`),
    };

    stats.openedAt = new Date().toISOString();
    stats.path = dbPath;
    return true;
  } catch (err) {
    stats.errors++;
    stats.lastError = `${new Date().toISOString()} open: ${err.message}`;
    db = null;
    statements = null;
    return false;
  }
}

function close() {
  if (db) { try { db.close(); } catch { /* already closed */ } }
  db = null;
  statements = null;
}

/* ------------------------------------------------------------------ *
 * writes
 * ------------------------------------------------------------------ */

function guard(fn) {
  if (!db || !statements) return 0;
  try {
    const n = fn();
    stats.writes += n;
    return n;
  } catch (err) {
    stats.errors++;
    stats.lastError = `${new Date().toISOString()} write: ${err.message}`;
    return 0;
  }
}

/**
 * Wrap a batch of writes in one transaction.
 *
 * Without this, every statement is its own implicit transaction: recording 26
 * observations means 26 commits, 26 WAL frame flushes and 26 fsyncs. Measured,
 * that inflated the write-ahead log to ~1.7 MB for a few hundred rows. One
 * transaction per report collapses that to a single commit.
 */
function inTransaction(fn) {
  db.exec('BEGIN');
  try {
    const n = fn();
    db.exec('COMMIT');
    return n;
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* rollback of a failed txn can itself fail */ }
    throw err;
  }
}

/**
 * Station observations from the rhrread feed.
 * Keyed on (observed_at, station_id, source) so re-fetching the same report is
 * idempotent — the poller runs every 5 minutes and the upstream updates every
 * 10, so duplicates are the normal case, not an edge case.
 */
function recordObservations(rhrread, stationTable) {
  return guard(() => {
    const observedAt = (rhrread.temperature && rhrread.temperature.recordTime)
      || rhrread.updateTime || new Date().toISOString();
    const now = new Date().toISOString();

    const byName = new Map();
    for (const s of stationTable) byName.set(s.tc, s);
    const rhByPlace = new Map(((rhrread.humidity && rhrread.humidity.data) || []).map((d) => [d.place, d.value]));
    const rainByPlace = new Map(((rhrread.rainfall && rhrread.rainfall.data) || []).map((d) => [d.place, d.max]));

    let n = 0;
    inTransaction(() => {
      for (const d of ((rhrread.temperature && rhrread.temperature.data) || [])) {
        const meta = byName.get(d.place);
        statements.obs.run(
          observedAt, (meta && meta.id) || d.place, d.place,
          meta ? meta.lat : null, meta ? meta.lon : null,
          Number.isFinite(d.value) ? d.value : null,
          rhByPlace.has(d.place) ? rhByPlace.get(d.place) : null,
          rainByPlace.has(d.place) ? Number(rainByPlace.get(d.place)) || 0 : null,
          'rhrread', now
        );
        n++;
      }
    });
    return n;
  });
}

/** Wind observations, including the stations that had to be dropped. */
function recordWind(rows, observedAt, stationLookup) {
  return guard(() => {
    const now = new Date().toISOString();
    let n = 0;
    inTransaction(() => {
      for (const r of rows) {
        const meta = stationLookup(r.station);
        statements.wind.run(
          observedAt || now, (meta && meta.id) || r.station, r.station,
          meta ? meta.lat : null, meta ? meta.lon : null,
          r.dirDeg == null ? null : r.dirDeg,
          r.speedKmh == null ? null : r.speedKmh,
          r.gustKmh == null ? null : r.gustKmh,
          r.calm ? 1 : 0, now
        );
        n++;
      }
    });
    return n;
  });
}

/** A decoded METAR or TAF. Raw text is kept so a decode bug stays auditable. */
function recordAviation(kind, decoded) {
  return guard(() => {
    if (!decoded) return 0;
    const now = new Date().toISOString();
    statements.aviation.run(
      kind, decoded.station || 'VHHH',
      decoded.issuedAt ? new Date(decoded.issuedAt).toISOString() : null,
      decoded.raw, JSON.stringify(decoded), now
    );
    return 1;
  });
}

/** One row per analysis run: what was chosen, and how well it scored. */
function recordAnalysis(info) {
  return guard(() => {
    const now = new Date().toISOString();
    statements.analysis.run(
      info.generatedAt || now, info.observationTime || null,
      info.gridCols || null, info.gridRows || null, info.metresPerCell || null,
      info.selectedEstimator || null, info.correctionHelped ? 1 : 0,
      info.rmse == null ? null : info.rmse,
      info.fieldMin == null ? null : info.fieldMin,
      info.fieldMax == null ? null : info.fieldMax,
      info.fieldMean == null ? null : info.fieldMean,
      info.stations == null ? null : info.stations, now
    );
    return 1;
  });
}

/** One row per LAE verdict. This is the audit trail for the go/no-go call. */
function recordLae(info) {
  return guard(() => {
    if (!info || !info.verdict) return 0;
    const now = new Date().toISOString();
    statements.lae.run(
      info.generatedAt || now, info.altitudeM == null ? null : info.altitudeM,
      info.verdict, info.summary || null,
      JSON.stringify(info.factors || []),
      JSON.stringify(info.blockers || []),
      JSON.stringify(info.cautions || []), now
    );
    return 1;
  });
}

/* ------------------------------------------------------------------ *
 * queries
 * ------------------------------------------------------------------ */

function rows(sql, params = []) {
  if (!db) return [];
  try { return db.prepare(sql).all(...params); }
  catch (err) { stats.errors++; stats.lastError = `${new Date().toISOString()} query: ${err.message}`; return []; }
}

/** Recent LAE verdicts, newest first — the audit trail. */
function recentAssessments(limit = 20) {
  return rows(`SELECT generated_at, altitude_m, verdict, summary, blockers, cautions
               FROM lae_assessment ORDER BY generated_at DESC LIMIT ?`, [limit])
    .map((r) => ({
      ...r,
      blockers: safeParse(r.blockers, []),
      cautions: safeParse(r.cautions, []),
    }));
}

/** Recent analysis runs with the estimator that won. */
function recentAnalyses(limit = 20) {
  return rows(`SELECT generated_at, selected_estimator, correction_helped, rmse,
                      field_min, field_max, field_mean, stations, grid_cols, grid_rows
               FROM analysis_run ORDER BY generated_at DESC LIMIT ?`, [limit]);
}

/** Temperature time series for one station. */
function stationSeries(stationId, { from = null, to = null, limit = 500 } = {}) {
  const where = ['station_id = ?'];
  const params = [stationId];
  if (from) { where.push('observed_at >= ?'); params.push(from); }
  if (to) { where.push('observed_at <= ?'); params.push(to); }
  params.push(limit);
  return rows(`SELECT observed_at, temperature_c, humidity_pct, rainfall_mm
               FROM observation WHERE ${where.join(' AND ')}
               ORDER BY observed_at DESC LIMIT ?`, params);
}

/** Wind time series for one station. */
function windSeries(stationId, { limit = 500 } = {}) {
  return rows(`SELECT observed_at, direction_deg, speed_kmh, gust_kmh, calm
               FROM wind_observation WHERE station_id = ?
               ORDER BY observed_at DESC LIMIT ?`, [stationId, limit]);
}

/**
 * Verification: pair each METAR with the observation nearest in time and report
 * the difference. This is the point of keeping history — a forecast you cannot
 * score is a forecast you cannot improve.
 */
function verification(limit = 50) {
  return rows(`
    SELECT a.issued_at,
           json_extract(a.decoded, '$.temperatureC') AS metar_temp,
           a.station
    FROM aviation_report a
    WHERE a.kind = 'METAR' AND a.issued_at IS NOT NULL
    ORDER BY a.issued_at DESC LIMIT ?`, [limit]);
}

/** Row counts and database size, for monitoring. */
function dbStats() {
  if (!db) return { available, ...stats, tables: {} };
  const tables = {};
  for (const t of ['observation', 'wind_observation', 'aviation_report', 'analysis_run', 'lae_assessment']) {
    try { tables[t] = db.prepare(`SELECT COUNT(*) AS n FROM ${t}`).get().n; }
    catch { tables[t] = null; }
  }
  let bytes = null;
  try { if (stats.path && fs.existsSync(stats.path)) bytes = fs.statSync(stats.path).size; } catch { /* ignore */ }
  const range = rows(`SELECT MIN(observed_at) AS oldest, MAX(observed_at) AS newest FROM observation`)[0] || {};
  return {
    available, path: stats.path, bytes, writes: stats.writes, errors: stats.errors,
    lastError: stats.lastError, openedAt: stats.openedAt, tables,
    observationRange: range.oldest ? { oldest: range.oldest, newest: range.newest } : null,
  };
}

/* ------------------------------------------------------------------ *
 * retention
 * ------------------------------------------------------------------ */

/**
 * Delete rows older than the retention window.
 *
 * Without this the archive grows without bound, which is the classic way an
 * observability table takes down the service it was meant to help. Called on a
 * timer, never in a request path.
 */
function prune({ days = 90, now = new Date() } = {}) {
  if (!db) return { deleted: 0 };
  // A retention of zero or less would compute a cutoff in the future and delete
  // the entire archive. Refuse rather than wipe: this is a destructive operation
  // reached from a config value, and config values get typos.
  if (!Number.isFinite(days) || days < 1) {
    return { deleted: 0, error: `refusing to prune with retention ${days} days (must be >= 1)` };
  }
  const cutoff = new Date(now.getTime() - days * 86400000).toISOString();
  try {
    let deleted = 0;
    for (const [table, col] of [['observation', 'observed_at'], ['wind_observation', 'observed_at'],
                                ['aviation_report', 'issued_at'], ['analysis_run', 'generated_at'],
                                ['lae_assessment', 'generated_at']]) {
      const r = db.prepare(`DELETE FROM ${table} WHERE ${col} IS NOT NULL AND ${col} < ?`).run(cutoff);
      deleted += Number(r.changes || 0);
    }
    stats.pruned += deleted;
    // Reclaim space after a large delete; harmless when there is nothing to do.
    db.exec('PRAGMA incremental_vacuum');
    return { deleted, cutoff };
  } catch (err) {
    stats.errors++;
    stats.lastError = `${new Date().toISOString()} prune: ${err.message}`;
    return { deleted: 0, error: err.message };
  }
}

/* ------------------------------------------------------------------ *
 * maintenance
 * ------------------------------------------------------------------ */

/** Online backup to a file (SQLite VACUUM INTO). Safe while serving. */
function backupTo(destPath) {
  if (!db) return { ok: false, error: 'no database' };
  try {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    db.exec(`VACUUM INTO '${destPath.replace(/'/g, "''")}'`);
    return { ok: true, path: destPath, bytes: fs.statSync(destPath).size };
  } catch (err) {
    stats.errors++;
    stats.lastError = `${new Date().toISOString()} backup: ${err.message}`;
    return { ok: false, error: err.message };
  }
}

/** Integrity check + WAL checkpoint. */
function maintain() {
  if (!db) return { ok: false, error: 'no database' };
  try {
    const integ = db.prepare('PRAGMA integrity_check').get();
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    db.exec('PRAGMA optimize');
    return { ok: true, integrity: integ && (integ.integrity_check || Object.values(integ)[0]) };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

function safeParse(s, fallback) {
  try { return s == null ? fallback : JSON.parse(s); } catch { return fallback; }
}

function isOpen() { return !!db; }

/**
 * Distinct stations actually present in the archive, with row counts and the
 * span each covers.
 *
 * The history page needs this because the set of stations that have been archived
 * is not the same as the live network: it grows as the service runs, and a
 * station that was dropped from a report is still on record.
 */
function archiveStations() {
  if (!db) return { observation: [], wind: [] };
  try {
    const q = (table) => db.prepare(
      `SELECT station_id AS id, station_name AS name, COUNT(*) AS n,
              MIN(observed_at) AS oldest, MAX(observed_at) AS newest
         FROM ${table}
        WHERE observed_at IS NOT NULL
        GROUP BY station_id, station_name
        ORDER BY n DESC, station_id`
    ).all();
    return { observation: q('observation'), wind: q('wind_observation') };
  } catch (err) {
    stats.errors++;
    stats.lastError = `${new Date().toISOString()} archiveStations: ${err.message}`;
    return { observation: [], wind: [], error: err.message };
  }
}

module.exports = {
  open, close, isOpen, available,
  recordObservations, recordWind, recordAviation, recordAnalysis, recordLae,
  recentAssessments, recentAnalyses, stationSeries, windSeries, verification,
  archiveStations,
  dbStats, prune, backupTo, maintain, safeParse,
  SCHEMA_VERSION,
};
