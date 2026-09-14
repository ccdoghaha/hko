'use strict';

/** Locate implausible cells in the DEM mosaic. */

const path = require('path');
const dem = require('../lib/dem');

const CACHE = path.join(__dirname, '..', '.cache');
const ZOOM = 12;
const BBOX = { lonMin: 113.83, latMin: 22.14, lonMax: 114.44, latMax: 22.58 };

(async () => {
  const m = await dem.buildMosaic(BBOX, ZOOM, CACHE);
  const { elev, width, height, west, north } = m;
  const res = dem.mercatorResolution(ZOOM);
  const world = 2 * Math.PI * 6378137;

  const lonOfCol = (c) => west + ((c * res) / world) * 360;
  const latOfRow = (r) => {
    const yN = ((1 - Math.asinh(Math.tan((north * Math.PI) / 180)) / Math.PI) / 2) * (world / res);
    return (Math.atan(Math.sinh(Math.PI * (1 - (2 * (yN + r)) / (world / res)))) * 180) / Math.PI;
  };

  // per-tile statistics: a bad tile shows up as an outlier block
  console.log('per-tile elevation range (rows = tile row, cols = tile col):');
  console.log('        ' + Array.from({length: width/256}, (_, i) => `x=${i}`.padStart(9)).join(''));
  for (let ty = 0; ty < height / 256; ty++) {
    let line = `  y=${ty} `;
    for (let tx = 0; tx < width / 256; tx++) {
      let mn = Infinity, mx = -Infinity;
      for (let r = 0; r < 256; r++) {
        const row = (ty * 256 + r) * width + tx * 256;
        for (let c = 0; c < 256; c++) {
          const v = elev[row + c];
          if (v < mn) mn = v;
          if (v > mx) mx = v;
        }
      }
      line += `${mn.toFixed(0)}/${mx.toFixed(0)}`.padStart(9);
    }
    console.log(line);
  }

  // global extremes with coordinates
  let gMax = -Infinity, gMin = Infinity, maxPos = 0, minPos = 0;
  for (let i = 0; i < elev.length; i++) {
    if (elev[i] > gMax) { gMax = elev[i]; maxPos = i; }
    if (elev[i] < gMin) { gMin = elev[i]; minPos = i; }
  }
  const loc = (i) => {
    const r = Math.floor(i / width), c = i % width;
    return { row: r, col: c, lat: latOfRow(r), lon: lonOfCol(c), tileX: Math.floor(c / 256), tileY: Math.floor(r / 256) };
  };
  console.log('\nglobal max', gMax.toFixed(0), 'm at', JSON.stringify(loc(maxPos)));
  console.log('global min', gMin.toFixed(0), 'm at', JSON.stringify(loc(minPos)));

  // how many cells are implausible for the HK box (anything above 1000 m or below -100 m)?
  let hi = 0, lo = 0;
  for (let i = 0; i < elev.length; i++) {
    if (elev[i] > 1000) hi++;
    if (elev[i] < -100) lo++;
  }
  console.log(`\ncells > 1000 m: ${hi} (${(100*hi/elev.length).toFixed(3)}%)`);
  console.log(`cells < -100 m: ${lo} (${(100*lo/elev.length).toFixed(3)}%)`);

  // distribution of the plausible part
  const sorted = Float32Array.from(elev).sort();
  const q = (p) => sorted[Math.floor(p * (sorted.length - 1))];
  console.log(`\npercentiles: p0=${q(0).toFixed(0)} p1=${q(0.01).toFixed(0)} p50=${q(0.5).toFixed(0)} p99=${q(0.99).toFixed(0)} p999=${q(0.999).toFixed(0)} p100=${q(1).toFixed(0)}`);
})().catch((e) => { console.error(e); process.exit(1); });
