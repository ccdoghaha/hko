'use strict';

/**
 * Diagnostics for the DEM sampling path.
 *
 * Checks the projection round-trip, then for each landmark searches a window
 * around the given coordinate and reports the HIGHEST cell found. Comparing
 * that against the published summit height separates two very different
 * failures: an imprecise landmark coordinate (peak is nearby and tall) versus
 * a broken projection or mosaic offset (peak is nowhere near, or the search
 * finds something far too low everywhere).
 */

const path = require('path');
const dem = require('../lib/dem');

const CACHE = path.join(__dirname, '..', '.cache');
const ZOOM = Number(process.argv[2]) || 12;
const BBOX = { lonMin: 113.83, latMin: 22.14, lonMax: 114.44, latMax: 22.58 };

const LANDMARKS = [
  { name: 'Tai Mo Shan',   lat: 22.4106, lon: 114.1242, published: 957 },
  { name: 'Lantau Peak',   lat: 22.2540, lon: 113.9066, published: 934 },
  { name: 'Sunset Peak',   lat: 22.2560, lon: 113.9430, published: 869 },
  { name: 'Victoria Peak', lat: 22.2715, lon: 114.1496, published: 552 },
  { name: 'Chek Lap Kok',  lat: 22.3080, lon: 113.9185, published: 7 },
  { name: 'HKO HQ',        lat: 22.3020, lon: 114.1740, published: 32 },
];

(async () => {
  console.log('--- projection round-trip (tileXY <-> tileLonLat) ---');
  for (const [lat, lon] of [[22.3020, 114.1740], [22.2540, 113.9066], [22.58, 113.83], [22.14, 114.44]]) {
    const [x, y] = dem.tileXY(lat, lon, ZOOM);
    const [tlon, tlat] = dem.tileLonLat(x, y, ZOOM);
    const dxm = (lon - tlon) * 111320 * Math.cos((lat * Math.PI) / 180);
    const dym = (lat - tlat) * 110574;
    console.log(`   in ${lat.toFixed(4)},${lon.toFixed(4)} -> tile ${x},${y}  nw ${tlat.toFixed(4)},${tlon.toFixed(4)}  offset ${dxm.toFixed(0)} m E, ${dym.toFixed(0)} m N (both should be 0..tile)`);
  }

  console.log('\n--- mosaic ---');
  const mosaic = await dem.buildMosaic(BBOX, ZOOM, CACHE);
  console.log(`   ${mosaic.width}x${mosaic.height} px, NW corner ${mosaic.north.toFixed(4)},${mosaic.west.toFixed(4)}, ${dem.mercatorResolution(ZOOM).toFixed(2)} m/px`);

  // independent expected pixel position, computed a different way
  const world = 2 * Math.PI * 6378137;
  const pxPerDegLon = mosaic.width / (((mosaic.width * dem.mercatorResolution(ZOOM)) / world) * 360);
  const mercY = (lat) => ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2);
  const yN = mercY(mosaic.north);

  console.log('\n--- landmark window search (max elevation within +/-0.012 deg) ---');
  console.log('   ' + 'landmark'.padEnd(16) + 'at-point'.padStart(9) + 'window-max'.padStart(12) +
              'published'.padStart(11) + 'max-err'.padStart(9) + '   found at');
  let bad = 0;
  for (const L of LANDMARKS) {
    const atPoint = dem.sampleElevation(mosaic, L.lat, L.lon);

    let best = -Infinity, bestLat = null, bestLon = null;
    const R = 0.012, STEP = 0.0004;
    for (let dla = -R; dla <= R; dla += STEP) {
      for (let dlo = -R; dlo <= R; dlo += STEP) {
        const v = dem.sampleElevation(mosaic, L.lat + dla, L.lon + dlo);
        if (v != null && v > best) { best = v; bestLat = L.lat + dla; bestLon = L.lon + dlo; }
      }
    }
    const err = Math.abs(best - L.published);
    const flag = err <= 40 ? 'ok  ' : 'BAD ';
    if (err > 40) bad++;
    console.log(`   ${flag}${L.name.padEnd(16)}${atPoint.toFixed(0).padStart(9)}${best.toFixed(0).padStart(12)}` +
                `${String(L.published).padStart(11)}${err.toFixed(0).padStart(9)}   ${bestLat.toFixed(4)},${bestLon.toFixed(4)}`);
  }

  console.log('\n--- independent pixel-position cross-check (Tai Mo Shan) ---');
  {
    const lat = 22.4106, lon = 114.1242;
    const res = dem.mercatorResolution(ZOOM);
    const pxA = (((lon + 180) / 360) * world / res) - (((mosaic.west + 180) / 360) * world / res);
    const pyA = (mercY(lat) - yN) * (world / res);
    const pxB = ((lon - mosaic.west) / (((mosaic.width * res) / world) * 360)) * mosaic.width;
    const pyB = ((mercY(lat) - yN) / (mercY(mosaic.north) - mercY(22.1107))) * mosaic.height;
    console.log(`   method A px,py = ${pxA.toFixed(1)}, ${pyA.toFixed(1)}`);
    console.log(`   method B px,py = ${pxB.toFixed(1)}, ${pyB.toFixed(1)}`);
    const elevA = dem.sampleElevation(mosaic, lat, lon);
    console.log(`   sample at that point = ${elevA.toFixed(0)} m (published 957)`);
  }

  console.log(`\nlandmarks failing a 40 m tolerance: ${bad}/${LANDMARKS.length}`);
})().catch((e) => { console.error(e); process.exit(1); });
