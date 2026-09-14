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
const { STATIONS } = require('./stations');

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
  return { ...value, pngBuffer, cached: false };
}

/** The rendered overlay PNG, generating the analysis if needed. */
async function raster(deps) {
  const r = await run(deps);
  return r.pngBuffer;
}

function resetCache() { cached = null; terrainPromise = null; }

module.exports = { run, raster, resetCache, BBOX, ZOOM, GRID_M };
