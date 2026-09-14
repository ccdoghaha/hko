'use strict';

/**
 * High-resolution surface temperature analysis.
 *
 * Pipeline
 *   1. build/load the terrain mosaic (cached on disk after the first run)
 *   2. sample terrain elevation at each observing station
 *   3. pull current observations from the rhrread feed
 *   4. score three estimators by leave-one-out cross-validation
 *   5. produce the field with the estimator that actually measured best
 *   6. colour-map it to a transparent PNG overlay
 *
 * Step 4 is the point. It would be easy to assume a terrain correction helps,
 * but the rhrread network sits almost entirely in the lowlands, so the lapse
 * rate is extrapolation rather than a fitted relationship. Rather than hard-code
 * either behaviour, the analysis measures both on every run and reports which
 * one won and by how much.
 */

const dem = require('./dem');
const interp = require('./interp');
const png = require('./png');
const colormap = require('./colormap');
const wind = require('./wind');
const lae = require('./lae');
const aviation = require('./aviation');
const store = require('./store');
const { STATIONS, WIND_STATIONS, windStationByName } = require('./stations');

const BBOX = { lonMin: 113.83, latMin: 22.14, lonMax: 114.44, latMax: 22.58 };
const ZOOM = 12;                 // ~38 m/px terrain, ample for a 250 m analysis
const GRID_M = 250;              // target analysis resolution
const ANALYSIS_TTL = 5 * 60 * 1000;

/* terrain is expensive to assemble but never changes — build it once */
let terrainPromise = null;
function getTerrain(cacheDir) {
  if (!terrainPromise) {
    terrainPromise = (async () => {
      const mosaic = await dem.buildMosaic(BBOX, ZOOM, cacheDir);
      const grid = dem.buildGrid(mosaic, GRID_M);
      return { mosaic, grid };
    })();
  }
  return terrainPromise;
}

/* analysis result cache, keyed by nothing else because observations are global */
let cached = null;

function sampleStationElevations(mosaic) {
  return STATIONS.map((s) => {
    const e = dem.sampleElevation(mosaic, s.lat, s.lon);
    return { ...s, elev: (e == null || !Number.isFinite(e)) ? 0 : Math.max(0, e) };
  });
}

function joinReadings(stations, rhrread) {
  const readings = new Map(
    ((rhrread && rhrread.temperature && rhrread.temperature.data) || []).map((d) => [d.place, d.value])
  );
  return stations
    .map((s) => ({ ...s, value: readings.get(s.tc) }))
    .filter((s) => Number.isFinite(s.value));
}

/**
 * @param {object} deps
 * @param {string} deps.cacheDir
 * @param {() => Promise<object>} deps.getRhrread  current observations
 * @param {boolean} [deps.force]
 */
async function run({ cacheDir, getRhrread, force = false }) {
  if (!force && cached && Date.now() - cached.ts < ANALYSIS_TTL) {
    return { ...cached.value, cached: true };
  }

  const { mosaic, grid } = await getTerrain(cacheDir);
  const rhrread = await getRhrread();

  const stations = sampleStationElevations(mosaic);
  const joined = joinReadings(stations, rhrread);
  if (joined.length < 4) {
    throw new Error(`too few stations with live readings (${joined.length})`);
  }

  const estimators = interp.scoreEstimators(joined, {});
  const winner = estimators[0];
  const field = interp.analyse(joined, grid, winner);

  /* Land mask.
   *
   * The terrarium DEM encodes ocean as exactly 0 m, so flat reclaimed land is
   * numerically indistinguishable from water — and at a 250 m cell size a
   * narrow feature like the old Kai Tak runway can have its cell centre fall in
   * the sea even though an observing station sits on it. Station locations are
   * known to be on land, so their cell and its immediate neighbours are forced
   * to land. Everything else uses the plain terrain test. */
  const landMask = new Uint8Array(grid.cols * grid.rows);
  for (let i = 0; i < landMask.length; i++) landMask[i] = grid.terrain[i] > 0 ? 1 : 0;

  const dLon = grid.lons[1] - grid.lons[0];
  const dLat = grid.lats[0] - grid.lats[1];
  const westEdge = grid.lons[0] - dLon / 2;
  const northEdge = grid.lats[0] + dLat / 2;
  let forcedLand = 0;
  const forcedStations = [];
  for (const s of joined) {
    const c = Math.floor((s.lon - westEdge) / dLon);
    const r = Math.floor((northEdge - s.lat) / dLat);
    if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) continue;
    let touched = false;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= grid.rows || cc >= grid.cols) continue;
        const i = rr * grid.cols + cc;
        if (!landMask[i]) { landMask[i] = 1; forcedLand++; touched = true; }
      }
    }
    if (touched) forcedStations.push(s.tc);
  }

  let landCells = 0;
  for (let i = 0; i < landMask.length; i++) if (landMask[i]) landCells++;

  /* field statistics over land only */
  let fMin = Infinity, fMax = -Infinity, fSum = 0, fN = 0;
  for (let i = 0; i < field.values.length; i++) {
    if (!landMask[i]) continue;
    const v = field.values[i];
    if (!Number.isFinite(v)) continue;
    if (v < fMin) fMin = v;
    if (v > fMax) fMax = v;
    fSum += v; fN++;
  }

  const rgba = colormap.renderFieldRGBA(field.values, grid.terrain, grid.cols, grid.rows, landMask);
  const pngBuffer = png.encode(grid.cols, grid.rows, rgba, { channels: 4 });

  const elevs = stations.map((s) => s.elev);
  const elevMin = Math.min(...elevs);
  const elevMax = Math.max(...elevs);

  const value = {
    ok: true,
    generatedAt: new Date().toISOString(),
    observationTime: (rhrread.temperature && rhrread.temperature.recordTime) || rhrread.updateTime || null,
    grid: {
      cols: grid.cols,
      rows: grid.rows,
      metresPerCell: Number(grid.metresPerCell.toFixed(1)),
      west: grid.lons[0],
      east: grid.lons[grid.cols - 1],
      north: grid.lats[0],
      south: grid.lats[grid.rows - 1],
      crs: 'EPSG:4326 (grid regular in Web-Mercator y)',
    },
    network: {
      stations: joined.length,
      configured: STATIONS.length,
      elevationMin: Number(elevMin.toFixed(0)),
      elevationMax: Number(elevMax.toFixed(0)),
      elevationSpan: Number((elevMax - elevMin).toFixed(0)),
      spansRelief: (elevMax - elevMin) >= 400,
    },
    estimators: estimators.map((e) => ({
      key: e.key, label: e.label, rmse: Number(e.rmse.toFixed(3)),
      mae: Number(e.mae.toFixed(3)), bias: Number(e.bias.toFixed(3)),
      maxError: Number(e.maxError.toFixed(3)), selected: e.key === winner.key,
    })),
    selected: winner.key,
    lapseRate: winner.elevationCorrected ? winner.lapseRate ?? 0.0065 : 0,
    correctionHelped: winner.key !== 'raw-idw',
    field: {
      min: Number(fMin.toFixed(2)), max: Number(fMax.toFixed(2)),
      mean: Number((fSum / Math.max(fN, 1)).toFixed(2)),
      cells: fN, unit: 'degC',
    },
    mask: {
      landCells,
      forcedFromStation: forcedLand,
      stationsForced: forcedStations,
      note: 'Terrarium encodes ocean as exactly 0 m; station cells are forced to land because a 250 m cell cannot resolve narrow reclaimed features.',
    },
    variogram: {
      nugget: Number(field.model.nugget.toFixed(4)),
      sill: Number(field.model.sill.toFixed(4)),
      range: Number(field.model.range.toFixed(0)),
    },
    stations: joined.map((s) => ({
      id: s.id, name: s.tc, lat: s.lat, lon: s.lon,
      elevation: Number(s.elev.toFixed(0)), value: s.value,
    })),
    raster: { bytes: pngBuffer.length, width: grid.cols, height: grid.rows, format: 'image/png' },
  };

  cached = { ts: Date.now(), value: { ...value, pngBuffer } };

  // Archive the run: which estimator won, and how well it scored. If the choice
  // ever starts drifting, this is where it shows up.
  try {
    store.recordAnalysis({
      generatedAt: value.generatedAt,
      observationTime: value.observationTime,
      gridCols: value.grid.cols, gridRows: value.grid.rows,
      metresPerCell: value.grid.metresPerCell,
      selectedEstimator: value.selected,
      correctionHelped: value.correctionHelped,
      rmse: winner.rmse,
      fieldMin: value.field.min, fieldMax: value.field.max, fieldMean: value.field.mean,
      stations: value.network.stations,
    });
  } catch { /* archiving must never break the analysis */ }

  return { ...value, pngBuffer, cached: false };
}

/** The rendered overlay PNG, generating the analysis if needed. */
async function raster(deps) {
  const r = await run(deps);
  return r.pngBuffer;
}

function resetCache() { cached = null; terrainPromise = null; }

/* ------------------------------------------------------------------ *
 * wind analysis (vector field)
 * ------------------------------------------------------------------ */

const WIND_URL = 'https://data.weather.gov.hk/weatherAPI/hko_data/regional-weather/latest_10min_wind.csv';
const WIND_TTL = 5 * 60 * 1000;
const UA_LOCAL = 'hko-local/1.0 (local analysis pipeline)';
const FETCH_TIMEOUT = 25000;

let windCsvCache = null;
async function getWindCsv() {
  if (windCsvCache && Date.now() - windCsvCache.ts < WIND_TTL) return windCsvCache.text;
  const res = await fetch(WIND_URL, {
    headers: { 'User-Agent': UA_LOCAL },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!res.ok) throw new Error(`wind CSV HTTP ${res.status}`);
  const text = await res.text();
  windCsvCache = { text, ts: Date.now() };
  return text;
}

/**
 * Leave-one-out validation in vector terms.
 *
 * Scalar RMSE on u and v would be meaningless to an operator, so the errors are
 * reported as a speed error (km/h) and a direction error (degrees, circular).
 * Calm stations are excluded from the direction statistic because direction is
 * undefined at zero speed.
 */
function crossValidateVector(samples, opts = {}) {
  const proj = interp.makeProjection();
  const n = samples.length;
  const dist = interp.distanceMatrix(samples, proj);
  const out = [];

  for (let hold = 0; hold < n; hold++) {
    const keep = [];
    for (let i = 0; i < n; i++) if (i !== hold) keep.push(i);

    const uVals = keep.map((i) => samples[i].u);
    const vVals = keep.map((i) => samples[i].v);
    const dU = keep.map((i) => dist[hold * n + i]);

    const uEst = interp.idw(uVals, dU, opts.power ?? 2);
    const vEst = interp.idw(vVals, dU, opts.power ?? 2);
    const est = wind.fromUV(uEst, vEst);

    const obs = samples[hold];
    out.push({
      station: obs.station,
      obsSpeed: obs.speedKmh,
      estSpeed: est.speed,
      obsDir: obs.calm ? null : obs.dirDeg,
      estDir: est.dir,
      speedErr: est.speed - obs.speedKmh,
      dirErr: obs.calm ? null : wind.bearingDiff(est.dir, obs.dirDeg),
    });
  }

  let se = 0, bias = 0, mae = 0;
  for (const r of out) { se += r.speedErr ** 2; bias += r.speedErr; mae += Math.abs(r.speedErr); }

  // Direction error is meaningless when the wind is nearly calm: a 1 km/h wind
  // with a 1 km/h vector error is a 180 degree direction error that carries no
  // operational information. Statistics are therefore reported on winds at or
  // above a threshold, with the all-station figure kept alongside so the
  // filtering is visible rather than hidden.
  const MIN_DIR_SPEED = 5;   // km/h
  const dirsAll = out.filter((r) => r.dirErr != null);
  const dirs = dirsAll.filter((r) => r.obsSpeed >= MIN_DIR_SPEED);

  const mean = (arr, f) => (arr.length ? arr.reduce((a, r) => a + f(r), 0) / arr.length : null);

  return {
    n,
    speedRmse: Math.sqrt(se / n),
    speedMae: mae / n,
    speedBias: bias / n,
    dirMae: mean(dirs, (r) => r.dirErr),
    dirWorst: dirs.length ? Math.max(...dirs.map((r) => r.dirErr)) : null,
    nDirection: dirs.length,
    dirMaeAll: mean(dirsAll, (r) => r.dirErr),
    nDirectionAll: dirsAll.length,
    minDirSpeedKmh: MIN_DIR_SPEED,
    perStation: out,
  };
}

/**
 * Build the vector wind field on the same analysis grid.
 *
 * u and v are interpolated as two independent scalar fields and recombined.
 * Interpolating direction directly is not merely less accurate, it is wrong:
 * 350 and 010 degrees average to 180 as scalars.
 */
async function runWind({ cacheDir }) {
  const { grid } = await getTerrain(cacheDir);
  const csv = await getWindCsv();
  const parsed = wind.parseWindCsv(csv);

  // Archive every wind report, including the stations that get dropped — the
  // drop reasons are themselves operationally interesting (a station reporting
  // a speed with no resolvable direction is a sensor fault worth seeing).
  try { store.recordWind(parsed.rows, parsed.observedAt, windStationByName); } catch { /* ignore */ }

  const samples = [];
  const dropped = [];
  for (const r of parsed.rows) {
    const st = windStationByName(r.station);
    if (!st) { dropped.push({ station: r.station, reason: 'no coordinates' }); continue; }
    if (!r.usable) { dropped.push({ station: r.station, reason: r.speedKmh == null ? 'no reading' : 'direction unknown' }); continue; }
    const uv = r.calm ? { u: 0, v: 0 } : wind.toUV(r.speedKmh, r.dirDeg);
    samples.push({
      id: st.id, station: r.station, tc: st.tc, lat: st.lat, lon: st.lon,
      speedKmh: r.speedKmh, gustKmh: r.gustKmh, dirDeg: r.dirDeg, calm: r.calm,
      u: uv.u, v: uv.v,
    });
  }

  if (samples.length < 4) throw new Error(`too few usable wind stations (${samples.length})`);

  const uSamples = samples.map((s) => ({ lat: s.lat, lon: s.lon, value: s.u }));
  const vSamples = samples.map((s) => ({ lat: s.lat, lon: s.lon, value: s.v }));

  const idwOpts = { method: 'idw', elevationCorrected: false, lapseRate: 0 };
  const uField = interp.analyse(uSamples, grid, idwOpts);
  const vField = interp.analyse(vSamples, grid, idwOpts);

  /* recombine to speed and direction, over land only */
  const speed = new Float32Array(grid.cols * grid.rows);
  const dir = new Float32Array(grid.cols * grid.rows);
  let sMin = Infinity, sMax = -Infinity, sSum = 0, sN = 0;
  for (let i = 0; i < speed.length; i++) {
    const uw = uField.values[i], vw = vField.values[i];
    const c = wind.fromUV(uw, vw);
    speed[i] = c.speed;
    dir[i] = c.dir == null ? 0 : c.dir;
    if (!(grid.terrain[i] > 0)) continue;
    if (c.speed < sMin) sMin = c.speed;
    if (c.speed > sMax) sMax = c.speed;
    sSum += c.speed; sN++;
  }

  /* arrows: subsample the field so the map stays legible */
  const stride = Math.max(1, Math.round(grid.cols / 26));
  const arrows = [];
  for (let j = 0; j < grid.rows; j += stride) {
    for (let i = 0; i < grid.cols; i += stride) {
      const k = j * grid.cols + i;
      if (!(grid.terrain[k] > 0)) continue;
      arrows.push({
        lat: Number(grid.lats[j].toFixed(4)),
        lon: Number(grid.lons[i].toFixed(4)),
        speed: Number(speed[k].toFixed(1)),
        dir: Number(dir[k].toFixed(0)),
      });
    }
  }

  const validation = crossValidateVector(samples);

  /* worst and calmest observed stations, which is what an operator looks at */
  const sortedBySpeed = [...samples].sort((a, b) => b.speedKmh - a.speedKmh);
  const sortedByGust = [...samples].filter((s) => s.gustKmh != null).sort((a, b) => b.gustKmh - a.gustKmh);

  let gustMin = Infinity, gustMax = -Infinity;
  for (const s of samples) {
    if (s.gustKmh == null) continue;
    if (s.gustKmh < gustMin) gustMin = s.gustKmh;
    if (s.gustKmh > gustMax) gustMax = s.gustKmh;
  }

  return {
    ok: true,
    observedAt: parsed.observedAt,
    grid: {
      cols: grid.cols, rows: grid.rows,
      metresPerCell: Number(grid.metresPerCell.toFixed(1)),
      west: grid.lons[0], east: grid.lons[grid.cols - 1],
      north: grid.lats[0], south: grid.lats[grid.rows - 1],
    },
    network: { usable: samples.length, reported: parsed.rows.length, configured: WIND_STATIONS.length, dropped },
    interpolation: {
      method: 'inverse distance weighting on u and v, recombined',
      note: 'direction is never interpolated as a scalar',
      validation: {
        speedRmseKmh: Number(validation.speedRmse.toFixed(2)),
        speedMaeKmh: Number(validation.speedMae.toFixed(2)),
        speedBiasKmh: Number(validation.speedBias.toFixed(2)),
        dirMaeDeg: validation.dirMae == null ? null : Number(validation.dirMae.toFixed(1)),
        dirWorstDeg: validation.dirWorst == null ? null : Number(validation.dirWorst.toFixed(0)),
        dirMaeAllDeg: validation.dirMaeAll == null ? null : Number(validation.dirMaeAll.toFixed(1)),
        stations: validation.n,
        directionStations: validation.nDirection,
        directionStationsAll: validation.nDirectionAll,
        minDirSpeedKmh: validation.minDirSpeedKmh,
        note: `direction error is only meaningful above ${validation.minDirSpeedKmh} km/h; the all-station figure is reported separately`,
      },
    },
    field: {
      speedMinKmh: Number(sMin.toFixed(1)),
      speedMaxKmh: Number(sMax.toFixed(1)),
      speedMeanKmh: Number((sSum / Math.max(sN, 1)).toFixed(1)),
      landCells: sN,
    },
    stations: samples.map((s) => ({
      id: s.id, station: s.station, tc: s.tc, lat: s.lat, lon: s.lon,
      speedKmh: s.speedKmh, gustKmh: s.gustKmh,
      dirDeg: s.dirDeg, dirName: s.calm ? 'Calm' : wind.compassName(s.dirDeg),
      calm: s.calm, beaufort: wind.beaufort(s.speedKmh),
    })),
    extremes: {
      strongest: sortedBySpeed.slice(0, 3).map((s) => ({ station: s.station, tc: s.tc, speedKmh: s.speedKmh })),
      gustiest: sortedByGust.slice(0, 3).map((s) => ({ station: s.station, tc: s.tc, gustKmh: s.gustKmh })),
      gustRange: Number.isFinite(gustMin) ? [gustMin, gustMax] : null,
    },
    arrows,
    ramp: colormap.rampStops().wind,
  };
}

/* ------------------------------------------------------------------ *
 * LAE assessment assembly
 * ------------------------------------------------------------------ */

const METAR_URL = 'https://aviationweather.gov/api/data/metar?ids=VHHH&format=raw';
const TAF_URL = 'https://aviationweather.gov/api/data/taf?ids=VHHH&format=raw';
const AV_TTL = 10 * 60 * 1000;
const avCache = {};

async function getAviation(url, key) {
  const hit = avCache[key];
  if (hit && Date.now() - hit.ts < AV_TTL) return hit.body;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA_LOCAL },
    signal: AbortSignal.timeout(FETCH_TIMEOUT),
  });
  if (!res.ok) throw new Error(`${key} HTTP ${res.status}`);
  const body = (await res.text()).trim();
  avCache[key] = { body, ts: Date.now() };
  return body;
}

/**
 * @param {object} deps
 * @param {string} deps.cacheDir
 * @param {() => Promise<object>} deps.getRhrread
 * @param {Array} deps.warnings  decoded warnsum entries
 * @param {number} [deps.altitudeM]
 */
async function runLae({ cacheDir, getRhrread, warnings = [], altitudeM = 120, alpha }) {
  const [windResult, metarText, tafText, rhrread] = await Promise.all([
    runWind({ cacheDir }),
    getAviation(METAR_URL, 'metar').catch(() => null),
    getAviation(TAF_URL, 'taf').catch(() => null),
    getRhrread().catch(() => null),
  ]);

  const metar = metarText ? aviation.parseMetar(metarText) : null;
  const taf = tafText ? aviation.parseTaf(tafText) : null;
  const tafWorst = taf ? aviation.worstCase(taf) : null;

  const lightning = !!(rhrread && rhrread.lightning && Array.isArray(rhrread.lightning.data)
    && rhrread.lightning.data.some((d) => String(d.occur).toLowerCase() === 'true'));

  /* worst reported surface wind across the network, which is the conservative
     choice for a go/no-go that is not tied to one site */
  const usable = windResult.stations.filter((s) => !s.calm && s.speedKmh != null);
  const strongest = usable.length
    ? usable.reduce((a, b) => (b.speedKmh > a.speedKmh ? b : a))
    : windResult.stations[0];

  const gustCandidates = windResult.stations.filter((s) => s.gustKmh != null);
  const gustiest = gustCandidates.length
    ? gustCandidates.reduce((a, b) => (b.gustKmh > a.gustKmh ? b : a))
    : null;

  const windFieldForAssess = {
    speedKmh: strongest ? strongest.speedKmh : null,
    calm: strongest ? strongest.calm : false,
    station: strongest ? strongest.station : null,
    gustKmh: gustiest ? gustiest.gustKmh : null,
    gustStation: gustiest ? gustiest.station : null,
  };

  const decodedWarnings = (warnings || []).map((w) => ({
    code: w.code, name: w.name, ...lae.classifyWarning(w),
  }));

  const assessment = lae.assess({
    windField: windFieldForAssess,
    metar, tafWorst, warnings: decodedWarnings, lightning, altitudeM, alpha,
  });

  // Archive the raw reports alongside the verdict. Keeping the raw text matters:
  // if a decode is ever wrong, the original is still on disk to re-decode and
  // re-score without having to have been watching at the time.
  try {
    store.recordAviation('METAR', metar);
    store.recordAviation('TAF', taf);
    store.recordLae({
      generatedAt: new Date().toISOString(),
      altitudeM,
      verdict: assessment.overall,
      summary: assessment.summary,
      factors: assessment.factors,
      blockers: assessment.blockers,
      cautions: assessment.cautions,
    });
  } catch { /* archiving must never break the assessment */ }

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    observationTimes: {
      windNetwork: windResult.observedAt,
      metar: metar && metar.issuedAt ? metar.issuedAt.toISOString() : null,
      rhrread: (rhrread && rhrread.updateTime) || null,
    },
    assessment,
    metar: metar && {
      raw: metar.raw, station: metar.station,
      issuedAt: metar.issuedAt ? metar.issuedAt.toISOString() : null,
      wind: metar.wind, visibility: metar.visibility,
      ceilingFt: metar.ceilingFt, clouds: metar.clouds,
      weather: metar.weather, temperatureC: metar.temperatureC,
      dewpointC: metar.dewpointC, qnhHpa: metar.qnhHpa,
      flightCategory: metar.flightCategory, unparsed: metar.unparsed,
    },
    taf: taf && {
      raw: taf.raw, station: taf.station,
      validity: taf.validity ? { from: taf.validity.from.toISOString(), to: taf.validity.to.toISOString() } : null,
      base: { wind: taf.base.wind, visibility: taf.base.visibility, clouds: taf.base.clouds, weather: taf.base.weather },
      groups: taf.groups.map((g) => ({
        type: g.type, prob: g.prob,
        from: g.from ? g.from.toISOString() : null,
        to: g.to ? g.to.toISOString() : null,
        wind: g.wind, visibility: g.visibility, clouds: g.clouds, weather: g.weather,
      })),
      worstCase: tafWorst && {
        wind: tafWorst.wind, visibility: tafWorst.visibility,
        ceilingFt: tafWorst.ceilingFt, thunder: tafWorst.thunder,
        precip: tafWorst.precip, flightCategory: tafWorst.flightCategory,
      },
    },
    lightning,
    thresholds: lae.THRESHOLDS,
    wind: {
      network: windResult.network,
      field: windResult.field,
      validation: windResult.interpolation.validation,
      extremes: windResult.extremes,
      stations: windResult.stations,
      arrows: windResult.arrows,
      grid: windResult.grid,
      observedAt: windResult.observedAt,
      ramp: windResult.ramp,
    },
  };
}

module.exports = {
  run, raster, resetCache, runWind, runLae, BBOX, ZOOM, GRID_M,
};
