'use strict';

/**
 * Terrain elevation for Hong Kong, from the public Mapbox "terrarium" tile set
 * (AWS Open Data, no key, no rate limit worth worrying about).
 *
 * Terrarium encoding: elevation_metres = (R * 256 + G + B / 256) - 32768
 *
 * Tiles are cached on disk under .cache/dem so the mosaic is built once.
 */

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const png = require('./png');

const TILE_BASE = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium';
const UA = 'hko-local/1.0 (local analysis pipeline)';
const TILE_PX = 256;

function tileXY(lat, lon, z) {
  const n = 2 ** z;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * n);
  return [Math.min(Math.max(x, 0), n - 1), Math.min(Math.max(y, 0), n - 1)];
}

function tileLonLat(x, y, z) {
  const n = 2 ** z;
  const lon = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return [lon, lat];
}

/** Decode one terrarium tile into a Float32Array of metres. */
function decodeTile(buf) {
  const img = png.decode(buf);
  if (img.channels < 3) throw new Error(`terrarium tile must be RGB, got ${img.channels} channels`);
  const n = img.width * img.height;
  const elev = new Float32Array(n);
  const d = img.data;
  for (let i = 0, p = 0; i < n; i++, p += img.channels) {
    elev[i] = d[p] * 256 + d[p + 1] + d[p + 2] / 256 - 32768;
  }
  return { width: img.width, height: img.height, elev };
}

/* ------------------------------------------------------------------ *
 * tile cache + fetch
 * ------------------------------------------------------------------ */

async function fetchTile(z, x, y, cacheDir) {
  const dir = path.join(cacheDir, 'dem', String(z), String(x));
  const file = path.join(dir, `${y}.png`);
  try {
    return await fsp.readFile(file);
  } catch { /* not cached */ }

  await fsp.mkdir(dir, { recursive: true });
  const res = await fetch(`${TILE_BASE}/${z}/${x}/${y}.png`, {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`DEM tile ${z}/${x}/${y} HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  const tmp = `${file}.${process.pid}.tmp`;
  await fsp.writeFile(tmp, buf);
  await fsp.rename(tmp, file);
  return buf;
}

/* ------------------------------------------------------------------ *
 * mosaic
 * ------------------------------------------------------------------ */

/**
 * Build an elevation mosaic covering a lon/lat box.
 * @returns {{elev:Float32Array,width:number,height:number,west:number,north:number,zoom:number}}
 */
async function buildMosaic({ lonMin, latMin, lonMax, latMax }, zoom, cacheDir, onProgress) {
  const [x0, y0] = tileXY(latMax, lonMin, zoom); // north-west
  const [x1, y1] = tileXY(latMin, lonMax, zoom); // south-east

  const tilesX = x1 - x0 + 1;
  const tilesY = y1 - y0 + 1;
  const width = tilesX * TILE_PX;
  const height = tilesY * TILE_PX;
  const elev = new Float32Array(width * height);

  let done = 0;
  const total = tilesX * tilesY;

  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const buf = await fetchTile(zoom, x0 + tx, y0 + ty, cacheDir);
      const tile = decodeTile(buf);
      const ox = tx * TILE_PX;
      const oy = ty * TILE_PX;
      for (let r = 0; r < tile.height; r++) {
        const src = r * tile.width;
        const dst = (oy + r) * width + ox;
        for (let c = 0; c < tile.width; c++) elev[dst + c] = tile.elev[src + c];
      }
      done++;
      if (onProgress && (done % 8 === 0 || done === total)) onProgress(done, total);
    }
  }

  // geographic bounds of the mosaic
  const [west, north] = tileLonLat(x0, y0, zoom);
  const [east] = tileLonLat(x1 + 1, y1, zoom);
  const [, south] = tileLonLat(x1, y1 + 1, zoom);

  const voids = fillVoids(elev, width);

  return { elev, width, height, west, north, east, south, zoom, voids };
}

/* ------------------------------------------------------------------ *
 * void detection and filling
 * ------------------------------------------------------------------ */

/**
 * The source SRTM-derived tiles carry occasional no-data artifacts — measured
 * at ~0.05% of cells, appearing as isolated pixels of -1256 m or +6431 m next
 * to real terrain. Left in, they wreck an interpolation: one 6431 m cell drags
 * every station weight near it.
 *
 * So: reject cells outside a plausible range for the box, then fill them from
 * valid neighbours iteratively (8-connected mean), falling back to the local
 * median if a void is somehow isolated.
 *
 * @param {Float32Array} elev  mutated in place
 * @param {number} width
 * @param {{min:number,max:number}} range plausible elevation for this box
 */
function fillVoids(elev, width, range = { min: -100, max: 1100 }) {
  const N = elev.length;
  const rows = N / width;
  let voided = 0;

  for (let i = 0; i < N; i++) {
    if (elev[i] < range.min || elev[i] > range.max) { elev[i] = NaN; voided++; }
  }
  if (!voided) return { voided: 0, filled: 0 };

  let remaining = voided;
  for (let pass = 0; pass < 24 && remaining > 0; pass++) {
    const fill = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < width; c++) {
        const i = r * width + c;
        if (!Number.isNaN(elev[i])) continue;
        let sum = 0, n = 0;
        for (let dr = -1; dr <= 1; dr++) {
          const rr = r + dr;
          if (rr < 0 || rr >= rows) continue;
          for (let dc = -1; dc <= 1; dc++) {
            const cc = c + dc;
            if (cc < 0 || cc >= width) continue;
            const v = elev[rr * width + cc];
            if (!Number.isNaN(v)) { sum += v; n++; }
          }
        }
        if (n) fill.push([i, sum / n]);
      }
    }
    if (!fill.length) break;
    for (const [i, v] of fill) elev[i] = v;
    remaining -= fill.length;
  }

  for (let i = 0; i < N; i++) if (Number.isNaN(elev[i])) elev[i] = 0;

  let min = Infinity, max = -Infinity;
  for (let i = 0; i < N; i++) { if (elev[i] < min) min = elev[i]; if (elev[i] > max) max = elev[i]; }
  return { voided, filled: voided - remaining, min, max };
}

/* ------------------------------------------------------------------ *
 * sampling
 * ------------------------------------------------------------------ */

/**
 * Web-Mercator metres per pixel at a given latitude/zoom.
 * The y scale is uniform in Mercator, so a single value per row is exact.
 */
function mercatorResolution(zoom) {
  return (2 * Math.PI * 6378137) / (TILE_PX * 2 ** zoom);
}

/**
 * Bilinear elevation sample.
 * @param {object} mosaic from buildMosaic
 * @param {number} lat
 * @param {number} lon
 */
function sampleElevation(mosaic, lat, lon) {
  const { elev, width, height, west, north, zoom } = mosaic;
  const world = 2 * Math.PI * 6378137;
  const res = mercatorResolution(zoom);

  const px = ((lon + 180) / 360) * world / res - (west + 180) / 360 * world / res;
  const latRadN = (north * Math.PI) / 180;
  const yN = ((1 - Math.asinh(Math.tan(latRadN)) / Math.PI) / 2) * (world / res);
  const latRad = (lat * Math.PI) / 180;
  const yP = ((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2) * (world / res);
  const py = yP - yN;

  if (px < 0 || py < 0 || px > width - 1 || py > height - 1) return null;

  const x0 = Math.floor(px), y0 = Math.floor(py);
  const x1 = Math.min(x0 + 1, width - 1), y1 = Math.min(y0 + 1, height - 1);
  const fx = px - x0, fy = py - y0;

  const v = elev[y0 * width + x0] * (1 - fx) * (1 - fy)
          + elev[y0 * width + x1] * fx * (1 - fy)
          + elev[y1 * width + x0] * (1 - fx) * fy
          + elev[y1 * width + x1] * fx * fy;
  return v;
}

/**
 * Build an analysis grid over the mosaic.
 *
 * The grid is REGULAR IN LATITUDE AND LONGITUDE, deliberately, not in the
 * Mercator projection the tiles arrive in. The browser map draws with a plain
 * equirectangular projection, so a Mercator-regular grid would shear against
 * the station markers and the coastline. Regular-in-lat/lon means one affine
 * placement of the raster in the chart and no drift anywhere in the box.
 *
 * Cell size varies by well under a percent across 0.48 degrees of latitude.
 *
 * @returns {{cols,rows,lons,lats,terrain,metresPerCell}}
 */
function buildGrid(mosaic, targetMetres = 250) {
  const { west, north, east, south } = mosaic;
  const midLat = (north + south) / 2;
  const M_PER_DEG_LAT = 110574;
  const M_PER_DEG_LON = 111320 * Math.cos((midLat * Math.PI) / 180);

  const widthM = (east - west) * M_PER_DEG_LON;
  const heightM = (north - south) * M_PER_DEG_LAT;

  const cols = Math.max(2, Math.round(widthM / targetMetres));
  const rows = Math.max(2, Math.round(heightM / targetMetres));

  const lons = new Float64Array(cols);
  const lats = new Float64Array(rows);
  for (let i = 0; i < cols; i++) lons[i] = west + ((i + 0.5) * (east - west)) / cols;
  for (let j = 0; j < rows; j++) lats[j] = north - ((j + 0.5) * (north - south)) / rows;

  const terrain = new Float32Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const z = sampleElevation(mosaic, lats[j], lons[i]);
      terrain[j * cols + i] = (z == null || !Number.isFinite(z)) ? 0 : z;
    }
  }

  return { cols, rows, lons, lats, terrain, metresPerCell: widthM / cols };
}

module.exports = {
  tileXY, tileLonLat, decodeTile, buildMosaic, sampleElevation,
  buildGrid, mercatorResolution, fillVoids, TILE_PX,
};
