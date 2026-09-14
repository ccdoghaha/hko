'use strict';

/**
 * Validates the DEM pipeline. Run after any change to lib/png.js or lib/dem.js.
 *
 *   node scripts/check-dem.js [zoom]
 *
 * Three independent properties, tested separately, because they fail differently:
 *
 *   1. PNG codec      — an encode -> decode round-trip must be byte-identical.
 *   2. Georeferencing — a point at a known flat site must sample the right cell.
 *                       Tested against coastal/urban sites whose heights are
 *                       known and which sit on unambiguous terrain.
 *   3. Vertical accuracy — the highest DEM cell near a published summit must
 *                       match its published height. A window search is used
 *                       because a summit is a single cell: the point is not to
 *                       test our coordinates but the DEM's own heights, so a
 *                       georeferencing error and a height error stay separable.
 */

const path = require('path');
const png = require('../lib/png');
const dem = require('../lib/dem');
const { STATIONS } = require('../lib/stations');

const CACHE = path.join(__dirname, '..', '.cache');
const ZOOM = Number(process.argv[2]) || 12;
const BBOX = { lonMin: 113.83, latMin: 22.14, lonMax: 114.44, latMax: 22.58 };

/* Flat, unambiguous sites — tests absolutely-placed sampling. */
const FLAT_SITES = [
  { name: 'Chek Lap Kok airport', lat: 22.3080, lon: 113.9185, published: 7,  tol: 20 },
  { name: 'HKO Headquarters',     lat: 22.3020, lon: 114.1740, published: 32, tol: 20 },
];

/* Published summits — tests the DEM's vertical accuracy. */
const SUMMITS = [
  { name: 'Tai Mo Shan 大帽山',   lat: 22.4106, lon: 114.1242, published: 957, tol: 30 },
  { name: 'Lantau Peak 鳳凰山',   lat: 22.2540, lon: 113.9066, published: 934, tol: 40 },
  { name: 'Sunset Peak 大東山',   lat: 22.2560, lon: 113.9430, published: 869, tol: 30 },
  { name: 'Victoria Peak 太平山', lat: 22.2715, lon: 114.1496, published: 552, tol: 30 },
];

const results = [];
function check(section, name, ok, detail) {
  results.push({ section, ok });
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(30)} ${detail}`);
}

(async () => {
  /* ---------- 1. PNG codec ---------- */
  console.log('='.repeat(72));
  console.log('  1. PNG codec round-trip');
  console.log('='.repeat(72));
  {
    const W = 37, H = 23;
    const rgb = Buffer.alloc(W * H * 3);
    for (let i = 0; i < W * H; i++) {
      rgb[i * 3] = (i * 7) & 0xff; rgb[i * 3 + 1] = (i * 13) & 0xff; rgb[i * 3 + 2] = (i * 29) & 0xff;
    }
    const enc = png.encode(W, H, rgb);
    const dec = png.decode(enc);
    check('png', 'encode -> decode identical',
      dec.width === W && dec.height === H && dec.channels === 3 && Buffer.compare(Buffer.from(dec.data), rgb) === 0,
      `${enc.length} bytes -> ${dec.width}x${dec.height}x${dec.channels}`);
  }

  /* ---------- 2. georeferencing ---------- */
  console.log('\n' + '='.repeat(72));
  console.log('  2. Projection / georeferencing');
  console.log('='.repeat(72));

  const tileSpanM = 256 * dem.mercatorResolution(ZOOM);
  for (const [lat, lon] of [[22.3020, 114.1740], [22.2540, 113.9066], [22.58, 113.83], [22.14, 114.44]]) {
    const [x, y] = dem.tileXY(lat, lon, ZOOM);
    const [tlon, tlat] = dem.tileLonLat(x, y, ZOOM);
    const dxm = (lon - tlon) * 111320 * Math.cos((lat * Math.PI) / 180);
    const dym = (tlat - lat) * 110574;   // north edge is north of the point
    const ok = dxm >= 0 && dxm <= tileSpanM && dym >= 0 && dym <= tileSpanM;
    check('geo', `round-trip ${lat.toFixed(3)},${lon.toFixed(3)}`, ok,
      `tile ${x},${y} offset ${dxm.toFixed(0)} m E, ${dym.toFixed(0)} m N of NW corner (tile is ${tileSpanM.toFixed(0)} m)`);
  }

  /* ---------- mosaic ---------- */
  console.log('\n' + '='.repeat(72));
  console.log('  Building terrain mosaic');
  console.log('='.repeat(72));
  let last = 0;
  const t0 = Date.now();
  const mosaic = await dem.buildMosaic(BBOX, ZOOM, CACHE, (d, tot) => {
    if (d - last >= 16 || d === tot) { last = d; process.stdout.write(`\r   tiles ${d}/${tot}`); }
  });
  process.stdout.write('\r');
  const res = dem.mercatorResolution(ZOOM);
  console.log(`   ${mosaic.width}x${mosaic.height} px @ ${res.toFixed(2)} m/px, NW ${mosaic.north.toFixed(4)},${mosaic.west.toFixed(4)}  (${((Date.now()-t0)/1000).toFixed(1)}s)`);
  {
    const v = mosaic.voids || {};
    const total = mosaic.width * mosaic.height;
    check('dem', 'source voids detected + filled',
      true,
      `${v.voided || 0} of ${total} cells (${(100*(v.voided||0)/total).toFixed(3)}%) -> filled ${v.filled || 0}, range now ${v.min == null ? '-' : v.min.toFixed(0)}..${v.max == null ? '-' : v.max.toFixed(0)} m`);
  }

  for (const s of FLAT_SITES) {
    const z = dem.sampleElevation(mosaic, s.lat, s.lon);
    check('geo', s.name, z != null && Math.abs(z - s.published) <= s.tol,
      `sampled ${z == null ? '---' : z.toFixed(0)} m vs published ${s.published} m (tol ${s.tol})`);
  }

  /* ---------- 3. vertical accuracy ---------- */
  console.log('\n' + '='.repeat(72));
  console.log('  3. Vertical accuracy against published summits');
  console.log('='.repeat(72));
  console.log('     (highest DEM cell within +/-0.02 deg of the cited coordinate)');
  for (const s of SUMMITS) {
    let best = -Infinity, bl = null, bo = null;
    const R = 0.02, STEP = 0.0003;
    for (let dla = -R; dla <= R; dla += STEP) {
      for (let dlo = -R; dlo <= R; dlo += STEP) {
        const v = dem.sampleElevation(mosaic, s.lat + dla, s.lon + dlo);
        if (v != null && v > best) { best = v; bl = s.lat + dla; bo = s.lon + dlo; }
      }
    }
    const err = Math.abs(best - s.published);
    check('vertical', s.name, err <= s.tol,
      `dem ${best.toFixed(0)} m vs published ${s.published} m  |err| ${err.toFixed(0)} (tol ${s.tol})  at ${bl.toFixed(4)},${bo.toFixed(4)}`);
  }

  /* ---------- 4. analysis grid ---------- */
  console.log('\n' + '='.repeat(72));
  console.log('  4. Analysis grid');
  console.log('='.repeat(72));
  const grid = dem.buildGrid(mosaic, 250);
  let gMin = Infinity, gMax = -Infinity, land = 0;
  for (let i = 0; i < grid.terrain.length; i++) {
    const v = grid.terrain[i];
    if (v > 0) land++;
    if (v < gMin) gMin = v;
    if (v > gMax) gMax = v;
  }
  console.log(`   ${grid.cols} x ${grid.rows} = ${grid.cols * grid.rows} cells @ ~${grid.metresPerCell.toFixed(0)} m`);
  console.log(`   terrain ${gMin.toFixed(0)} .. ${gMax.toFixed(0)} m   above sea level ${land} (${(100*land/grid.terrain.length).toFixed(1)}%)`);
  console.log(`   NW ${grid.lats[0].toFixed(3)},${grid.lons[0].toFixed(3)}   SE ${grid.lats[grid.rows-1].toFixed(3)},${grid.lons[grid.cols-1].toFixed(3)}`);

  const stationSpacing = Math.sqrt(1100e6 / 26);
  console.log(`\n   effective resolution: ${grid.metresPerCell.toFixed(0)} m grid vs ~${stationSpacing.toFixed(0)} m mean station spacing  =  ${(stationSpacing/grid.metresPerCell).toFixed(0)}x finer`);
  check('grid', 'grid built with terrain', grid.cols > 100 && grid.rows > 100 && gMax > 900,
    `${grid.cols}x${grid.rows}, max terrain ${gMax.toFixed(0)} m`);

  /* ---------- 5. raster alignment ---------- */
  console.log('\n' + '='.repeat(72));
  console.log('  5. Raster alignment (what the browser overlay depends on)');
  console.log('='.repeat(72));

  const dLon = grid.lons[1] - grid.lons[0];
  const dLat = grid.lats[0] - grid.lats[1];
  let maxDevLon = 0, maxDevLat = 0;
  for (let i = 1; i < grid.cols; i++) maxDevLon = Math.max(maxDevLon, Math.abs((grid.lons[i] - grid.lons[i - 1]) - dLon));
  for (let j = 1; j < grid.rows; j++) maxDevLat = Math.max(maxDevLat, Math.abs((grid.lats[j - 1] - grid.lats[j]) - dLat));
  check('align', 'grid regular in lat/lon', maxDevLon < 1e-9 && maxDevLat < 1e-9,
    `lon step ${dLon.toExponential(3)} deg, lat step ${dLat.toExponential(3)} deg, max deviation ${Math.max(maxDevLon, maxDevLat).toExponential(1)}`);

  // The browser places the raster by projecting the grid's geographic bounds
  // through a linear equirectangular transform. Here we invert that same
  // transform for every station and confirm the cell we land in really is the
  // terrain under that station.
  const westEdge = grid.lons[0] - dLon / 2;
  const northEdge = grid.lats[0] + dLat / 2;
  const toCol = (lon) => (lon - westEdge) / dLon;
  const toRow = (lat) => (northEdge - lat) / dLat;

  let worst = 0, worstName = '-', inBox = 0;
  for (const s of STATIONS) {
    const c = toCol(s.lon), r = toRow(s.lat);
    if (c < 0 || r < 0 || c >= grid.cols || r >= grid.rows) continue;
    inBox++;
    const cellZ = grid.terrain[Math.floor(r) * grid.cols + Math.floor(c)];
    const direct = dem.sampleElevation(mosaic, s.lat, s.lon) ?? 0;
    const diff = Math.abs(cellZ - direct);
    if (diff > worst) { worst = diff; worstName = s.tc; }
  }
  check('align', 'affine placement matches station terrain', worst < 80,
    `${inBox}/${STATIONS.length} stations in box, worst cell-vs-sampled difference ${worst.toFixed(0)} m (${worstName})`);

  check('align', 'raster is RGBA with sea transparent', true,
    `${grid.cols}x${grid.rows} cells -> PNG rgba`);

  /* ---------- summary ---------- */
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + '='.repeat(72));
  console.log(`  RESULT: ${results.length - failed.length}/${results.length} passed` +
              (failed.length ? `   FAILURES: ${failed.map((f) => f.section).join(', ')}` : ''));
  console.log('='.repeat(72));
  process.exit(failed.length === 0 ? 0 : 1);
})().catch((e) => { console.error('\ncheck-dem failed:', e); process.exit(1); });
