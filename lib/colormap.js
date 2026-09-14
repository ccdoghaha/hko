'use strict';

/**
 * Colour ramps, shared by the raster overlay and (mirrored in) the browser.
 *
 * The stops below are duplicated in public/app.js as tempColor(). The browser
 * cannot require() this file, so check-interp.js asserts the two agree — if you
 * change one, the check fails until you change the other.
 *
 * Copyright note: these are our own chosen stops, not sampled from any HKO
 * graphic.
 */

const TEMP_STOPS = [
  [8,  '#2f6fb5'],
  [14, '#3f9ad1'],
  [20, '#4fb3a5'],
  [25, '#8ec24a'],
  [29, '#e8b230'],
  [32, '#e07b2c'],
  [35, '#c0392b'],
];

const SEA = '#e8f1f8';

function hexToRgb(h) {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function mix(a, b, f) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return [
    Math.round(r1 + (r2 - r1) * f),
    Math.round(g1 + (g2 - g1) * f),
    Math.round(b1 + (b2 - b1) * f),
  ];
}

/** Temperature (C) -> [r,g,b]. */
function tempRgb(v) {
  if (v == null || !Number.isFinite(v)) return hexToRgb(SEA);
  if (v <= TEMP_STOPS[0][0]) return hexToRgb(TEMP_STOPS[0][1]);
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    if (v <= TEMP_STOPS[i][0]) {
      const [v0, c0] = TEMP_STOPS[i - 1];
      const [v1, c1] = TEMP_STOPS[i];
      return mix(c0, c1, (v - v0) / (v1 - v0 || 1));
    }
  }
  return hexToRgb(TEMP_STOPS[TEMP_STOPS.length - 1][1]);
}

/**
 * Render a grid of temperatures to an RGBA buffer.
 *
 * Sea / no-data cells are fully transparent so the basemap shows through.
 * `landMask` overrides the terrain-based test where a caller knows better than
 * the DEM does (see analysis.js: the terrarium DEM encodes ocean as exactly
 * 0 m, so flat reclaimed land is indistinguishable from water).
 *
 * @param {Float32Array} values   row-major, cols*rows
 * @param {Float32Array} terrain  same shape; <= 0 means sea
 * @param {number} cols
 * @param {number} rows
 * @param {Uint8Array} [landMask] optional explicit land mask (1 = land)
 */
function renderFieldRGBA(values, terrain, cols, rows, landMask) {
  const out = Buffer.alloc(cols * rows * 4);
  for (let i = 0; i < cols * rows; i++) {
    const v = values[i];
    const isLand = landMask ? landMask[i] > 0 : terrain[i] > 0;
    const [r, g, b] = tempRgb(v);
    const o = i * 4;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = (isLand && Number.isFinite(v)) ? 210 : 0;   // slight transparency
  }
  return out;
}

module.exports = { TEMP_STOPS, SEA, tempRgb, renderFieldRGBA, hexToRgb, mix };
