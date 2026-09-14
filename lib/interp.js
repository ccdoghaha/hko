'use strict';

/**
 * Spatial interpolation for the high-resolution surface analysis.
 *
 * The observing network is ~26 automatic stations across ~1,100 km² of land —
 * roughly 6.5 km between neighbours. This module turns those point observations
 * into a continuous field on a much finer grid, and quantifies how much of the
 * extra detail is real versus invented.
 *
 * Three estimators, deliberately comparable:
 *
 *   raw IDW              — standard inverse-distance weighting on the observed
 *                          values, no terrain awareness. The baseline.
 *   corrected IDW       — stations reduced to a common datum with a lapse rate,
 *                          interpolated, then re-referenced to the terrain.
 *                          This is the post-processing step under test.
 *   ordinary kriging    — same terrain handling, but weights derived from a
 *                          fitted variogram rather than a fixed 1/d^p law.
 *
 * The question that matters operationally is whether the terrain correction
 * actually reduces error, so every estimator is scored by leave-one-out
 * cross-validation rather than asserted to be better.
 */

/* ------------------------------------------------------------------ *
 * local projection
 * ------------------------------------------------------------------ */

/* Equirectangular about Hong Kong. Over a ~60 km box the distortion is well
   under 0.1%, which is far below the analysis resolution. */
function makeProjection(lat0 = 22.3, lon0 = 114.15) {
  const M_PER_DEG_LAT = 110574;
  const M_PER_DEG_LON = 111320 * Math.cos((lat0 * Math.PI) / 180);
  return {
    x: (lon) => (lon - lon0) * M_PER_DEG_LON,
    y: (lat) => (lat - lat0) * M_PER_DEG_LAT,
  };
}

function distanceMatrix(pts, proj) {
  const n = pts.length;
  const xs = pts.map((p) => proj.x(p.lon));
  const ys = pts.map((p) => proj.y(p.lat));
  const d = new Float64Array(n * n);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = xs[i] - xs[j], dy = ys[i] - ys[j];
      const v = Math.sqrt(dx * dx + dy * dy);
      d[i * n + j] = v;
      d[j * n + i] = v;
    }
  }
  return d;
}

/* ------------------------------------------------------------------ *
 * inverse distance weighting
 * ------------------------------------------------------------------ */

/**
 * @param {number[]} values  observed value per sample
 * @param {Float64Array} dist  n*n distance matrix (metres)
 * @param {number[]} targetDist  distance from each sample to the target
 * @param {number} power
 * @param {number[]} [neighbours] optional indices to restrict to
 */
function idw(values, targetDist, power = 2, neighbours = null) {
  const idx = neighbours || values.map((_, i) => i);
  let num = 0, den = 0;
  for (const i of idx) {
    const d = targetDist[i];
    if (d < 1e-6) return values[i];          // exact hit
    const w = 1 / Math.pow(d, power);
    num += w * values[i];
    den += w;
  }
  return den === 0 ? NaN : num / den;
}

/* ------------------------------------------------------------------ *
 * variogram
 * ------------------------------------------------------------------ */

/** Experimental variogram in distance bins. */
function experimentalVariogram(values, dist, n, binWidth = 1000, maxLag = 40000) {
  const nb = Math.floor(maxLag / binWidth) + 1;
  const sum = new Float64Array(nb);
  const cnt = new Int32Array(nb);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const b = Math.floor(dist[i * n + j] / binWidth);
      if (b >= nb) continue;
      const d = values[i] - values[j];
      sum[b] += d * d;
      cnt[b]++;
    }
  }
  const lags = [], gamma = [];
  for (let b = 0; b < nb; b++) {
    if (cnt[b] < 2) continue;
    lags.push((b + 0.5) * binWidth);
    gamma.push(sum[b] / (2 * cnt[b]));
  }
  return { lags, gamma };
}

/**
 * Fit a spherical model with a nugget by moment estimation.
 *   gamma(h) = nugget + sill * (1.5 h/a - 0.5 (h/a)^3)   for h < a
 */
function fitSpherical(values, dist, n) {
  const { lags, gamma } = experimentalVariogram(values, dist, n);
  if (lags.length < 3) return { nugget: 0, sill: Math.max(variance(values), 1e-6), range: 20000 };

  let mean = 0;
  for (const v of values) mean += v;
  mean /= values.length;
  let varr = 0;
  for (const v of values) varr += (v - mean) ** 2;
  varr /= values.length;

  const sill = Math.max(varr, 1e-9);
  const nugget = Math.max(gamma[0] * 0.25, 0);   // small fraction of first lag

  let range = lags[lags.length - 1];
  for (let i = 0; i < lags.length; i++) {
    if (gamma[i] >= 0.95 * sill) { range = lags[i]; break; }
  }
  return { nugget, sill, range: Math.max(range, 2000) };
}

function variance(values) {
  let m = 0;
  for (const v of values) m += v;
  m /= values.length;
  let s = 0;
  for (const v of values) s += (v - m) ** 2;
  return s / values.length;
}

function sphericalGamma(h, { nugget, sill, range }) {
  if (h <= 0) return nugget;
  if (h >= range) return nugget + sill;
  const r = h / range;
  return nugget + sill * (1.5 * r - 0.5 * r * r * r);
}

/* ------------------------------------------------------------------ *
 * ordinary kriging
 * ------------------------------------------------------------------ */

/** Solve A x = b for small dense symmetric systems (Gaussian elimination, partial pivot). */
function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => Float64Array.from([...row, b[i]]));

  for (let col = 0; col < n; col++) {
    let piv = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (Math.abs(M[piv][col]) < 1e-12) return null;
    if (piv !== col) { const t = M[piv]; M[piv] = M[col]; M[col] = t; }

    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = M[r][col] / M[col][col];
      if (!f) continue;
      for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
    }
  }
  const x = new Float64Array(n);
  for (let i = 0; i < n; i++) x[i] = M[i][n] / M[i][i];
  return x;
}

/**
 * Ordinary kriging estimate at a target point.
 * @param {number[]} values    observed values at the neighbour indices
 * @param {number[]} dNN       pairwise distances among those neighbours (m)
 * @param {number[]} dTarget   distances from each neighbour to the target (m)
 * @param {object} model       spherical variogram parameters
 */
function krige(values, dNN, dTarget, model) {
  const k = values.length;
  const n = k + 1;
  const A = [];
  for (let i = 0; i < k; i++) {
    const row = new Array(n).fill(0);
    for (let j = 0; j < k; j++) row[j] = sphericalGamma(dNN[i * k + j], model);
    row[k] = 1;
    A.push(row);
  }
  const last = new Array(n).fill(0); last[k] = 0; last.fill(1, 0, k);
  A.push(last);

  const b = new Array(n).fill(0);
  for (let i = 0; i < k; i++) b[i] = sphericalGamma(dTarget[i], model);
  b[k] = 1;

  const sol = solve(A, b);
  if (!sol) return null;

  let est = 0;
  for (let i = 0; i < k; i++) est += sol[i] * values[i];
  return est;
}

/** Indices of the k nearest samples to a target distance vector. */
function nearestK(dTarget, k) {
  const idx = dTarget.map((d, i) => [d, i]).sort((a, b) => a[0] - b[0]);
  return idx.slice(0, Math.min(k, idx.length)).map(([, i]) => i);
}

/* ------------------------------------------------------------------ *
 * the analysis pipeline
 * ------------------------------------------------------------------ */

/**
 * @param {Array<{lat,lon,value,elev}>} samples  station observations
 * @param {object} grid   from dem.buildGrid
 * @param {object} opts   { lapseRate, power, krigeNeighbours, method }
 */
function analyse(samples, grid, opts = {}) {
  const lapseRate = opts.lapseRate ?? 0.0065;       // K per metre
  const power = opts.power ?? 2;
  const errorRate = opts.errorRate ?? 0.5;          // assumed observation error, K
  const kNeighbours = opts.krigeNeighbours ?? 8;
  const proj = makeProjection();

  const n = samples.length;
  const dist = distanceMatrix(samples, proj);
  const observed = samples.map((s) => s.value);
  const reduced = samples.map((s) => s.value + lapseRate * s.elev);   // to sea level

  const working = opts.elevationCorrected === false ? observed : reduced;
  const model = fitSpherical(working, dist, n);

  const { cols, rows, lons, lats, terrain } = grid;
  const out = new Float32Array(cols * rows);

  const dTarget = new Float64Array(n);
  const useKriging = opts.method === 'kriging';

  for (let j = 0; j < rows; j++) {
    const ty = proj.y(lats[j]);
    for (let i = 0; i < cols; i++) {
      const tx = proj.x(lons[i]);

      for (let s = 0; s < n; s++) {
        const dx = tx - proj.x(samples[s].lon);
        const dy = ty - proj.y(samples[s].lat);
        dTarget[s] = Math.sqrt(dx * dx + dy * dy);
      }

      let est;
      if (useKriging) {
        const nb = nearestK(Array.from(dTarget), kNeighbours);
        const k = nb.length;
        const vals = new Array(k);
        const dT = new Array(k);
        const dNN = new Array(k * k);
        for (let a = 0; a < k; a++) {
          vals[a] = working[nb[a]];
          dT[a] = dTarget[nb[a]];
          for (let b = 0; b < k; b++) dNN[a * k + b] = dist[nb[a] * n + nb[b]];
        }
        est = krige(vals, dNN, dT, model);
        if (est == null) est = idw(working, dTarget, power);
      } else {
        est = idw(working, dTarget, power);
      }

      const z = terrain[j * cols + i];
      out[j * cols + i] = opts.elevationCorrected === false ? est : est - lapseRate * z;
    }
  }

  return { values: out, model, lapseRate, elevationCorrected: opts.elevationCorrected !== false, method: opts.method || 'idw' };
}

/* ------------------------------------------------------------------ *
 * leave-one-out cross-validation
 * ------------------------------------------------------------------ */

/**
 * Score an estimator by withholding each station in turn.
 *
 * For the terrain-corrected estimators, the held-out station's own elevation is
 * used both to reduce the neighbours and to re-reference the estimate — which
 * is what an operational analysis would do (terrain is known everywhere, so
 * using it at the verification point is legitimate, not leakage).
 */
function crossValidate(samples, opts = {}) {
  const lapseRate = opts.lapseRate ?? 0.0065;
  const power = opts.power ?? 2;
  const errorRate = opts.errorRate ?? 0.5;
  const proj = makeProjection();
  const n = samples.length;

  const obs = samples.map((s) => s.value);
  const corrected = opts.elevationCorrected !== false;

  const working = corrected ? samples.map((s) => s.value + lapseRate * s.elev) : obs;
  const distAll = distanceMatrix(samples, proj);

  const preds = new Array(n).fill(NaN);

  for (let hold = 0; hold < n; hold++) {
    // neighbours = everyone except the held-out station
    const keep = [];
    for (let i = 0; i < n; i++) if (i !== hold) keep.push(i);
    const k = keep.length;

    const vals = keep.map((i) => working[i]);
    const dT = keep.map((i) => distAll[hold * n + i]);

    let est;
    if (opts.method === 'kriging') {
      // variogram refitted without the held-out point
      const dNN = [];
      for (let a = 0; a < k; a++) for (let b = 0; b < k; b++) dNN.push(distAll[keep[a] * n + keep[b]]);
      const model = fitSphericalFromMatrix(vals, dNN, k);
      const nn = nearestK(dT, Math.min(8, k));
      const vv = nn.map((x) => vals[x]);
      const tt = nn.map((x) => dT[x]);
      const dd = [];
      for (let a = 0; a < nn.length; a++) for (let b = 0; b < nn.length; b++) dd.push(distAll[keep[nn[a]] * n + keep[nn[b]]]);
      const kr = krige(vv, dd, tt, model);
      est = kr == null ? idw(vals, dT, power) : kr;
    } else {
      est = idw(vals, dT, power);
    }

    preds[hold] = corrected ? est - lapseRate * samples[hold].elev : est;
  }

  let se = 0, bias = 0, mae = 0, maxErr = 0;
  for (let i = 0; i < n; i++) {
    const e = preds[i] - obs[i];
    se += e * e; bias += e; mae += Math.abs(e);
    if (Math.abs(e) > maxErr) maxErr = Math.abs(e);
  }

  return {
    n,
    rmse: Math.sqrt(se / n),
    bias: bias / n,
    mae: mae / n,
    maxError: maxErr,
    predictions: preds,
    residuals: preds.map((p, i) => p - obs[i]),
  };
}

function fitSphericalFromMatrix(values, dNN, n) {
  return fitSpherical(values, dNN, n);
}

/* ------------------------------------------------------------------ *
 * estimator selection
 * ------------------------------------------------------------------ */

/**
 * The three estimators under test.
 *
 * These are not ranked a priori. Whether a terrain correction helps depends on
 * how much elevation the observing network actually spans: with a lowland
 * network the lapse-rate term is extrapolation, and imposing it can add more
 * error than it removes. So the comparison is made empirically, per run, by
 * leave-one-out cross-validation, and the winner is the one actually used.
 */
const ESTIMATORS = [
  { key: 'raw-idw',       label: 'inverse distance weighting (no terrain correction)', method: 'idw',     elevationCorrected: false },
  { key: 'corrected-idw', label: 'inverse distance weighting with terrain correction', method: 'idw',     elevationCorrected: true  },
  { key: 'kriging',       label: 'ordinary kriging with terrain correction',           method: 'kriging', elevationCorrected: true  },
];

/** Score every estimator by LOO and return them worst-to-best by RMSE. */
function scoreEstimators(samples, opts = {}) {
  const scored = ESTIMATORS.map((e) => {
    const cv = crossValidate(samples, { ...opts, ...e });
    return { ...e, rmse: cv.rmse, mae: cv.mae, bias: cv.bias, maxError: cv.maxError, residuals: cv.residuals };
  });
  scored.sort((a, b) => a.rmse - b.rmse);
  return scored;
}

module.exports = {
  makeProjection, distanceMatrix, idw, experimentalVariogram, fitSpherical,
  sphericalGamma, krige, nearestK, solve, analyse, crossValidate, variance,
  ESTIMATORS, scoreEstimators,
};
