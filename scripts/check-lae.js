'use strict';

/**
 * Validates the wind and aviation decoders.
 *
 *   node scripts/check-lae.js
 *
 * The headline test is the vector-wind wraparound: interpolating meteorological
 * direction as a scalar is wrong by 180 degrees whenever the field straddles
 * north, and that error would silently corrupt every low-level wind product.
 * The test proves the u/v path does not do that.
 */

const wind = require('../lib/wind');
const av = require('../lib/aviation');
const { WIND_STATIONS, windStationByName } = require('../lib/stations');

const results = [];
function check(section, name, ok, detail) {
  results.push({ section, name, ok });
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(40)} ${detail}`);
}

/* Real feed sample, including every awkward cell the feed actually emits. */
const SAMPLE_CSV = `Date time,Automatic Weather Station,10-Minute Mean Wind Direction(Compass points),10-Minute Mean Speed(km/hour),10-Minute Maximum Gust(km/hour)
202609141520,Central Pier,Northwest,6,11
202609141520,Chek Lap Kok,North,7,10
202609141520,Green Island,N/A,8,10
202609141520,Stanley,N/A,N/A,N/A
202609141520,Tai Mei Tuk,Calm,Calm,2,
202609141520,Tai Po Kau,Variable,1,4
202609141520,Tate's Cairn,N/A,0,
202609141520,Waglan Island,Calm,Calm,0,
202609141520,Ngong Ping,Southwest,6,8
202609141520,Tap Mun,Southwest,8,12`;

/* Captured live from aviationweather.gov */
const SAMPLE_METAR = 'METAR VHHH 140730Z 32004KT 9999 FEW015 SCT045 29/24 Q1012 NOSIG';
const SAMPLE_TAF = `TAF VHHH 140500Z 1406/1512 30010KT 9999 FEW020 SCT035 TX31/1406Z TX32/1506Z TN27/1422Z
TEMPO 1406/1409 06015G25KT 3000 TSRA SHRA FEW010CB SCT020
TEMPO 1409/1412 3500 SHRA FEW015CB SCT020
BECMG 1410/1412 05010KT`;

(async () => {
  /* ============ 1. vector wind ============ */
  console.log('='.repeat(78));
  console.log('  1. Wind vector handling (the wraparound trap)');
  console.log('='.repeat(78));

  // Two winds 20 degrees apart, straddling north. A scalar mean gives 180 (S),
  // which is the exact opposite direction.
  const a = wind.toUV(10, 350);
  const b = wind.toUV(10, 10);
  const mean = wind.fromUV((a.u + b.u) / 2, (a.v + b.v) / 2);
  const scalarMean = (350 + 10) / 2;
  console.log(`   350 deg @ 10 km/h and 010 deg @ 10 km/h`);
  console.log(`   scalar mean would be ${scalarMean} deg (${wind.compassName(scalarMean)})`);
  console.log(`   vector mean is        ${mean.dir.toFixed(1)} deg (${wind.compassName(mean.dir)}), speed ${mean.speed.toFixed(1)} km/h`);
  check('wind', 'vector mean straddling north is ~000', wind.bearingDiff(mean.dir, 0) <= 1,
    `${mean.dir.toFixed(2)} deg, error ${wind.bearingDiff(mean.dir, 0).toFixed(2)} deg`);
  check('wind', 'scalar mean would be wrong by ~180', wind.bearingDiff(scalarMean, mean.dir) > 170,
    `scalar ${scalarMean} vs vector ${mean.dir.toFixed(1)} = ${wind.bearingDiff(scalarMean, mean.dir).toFixed(0)} deg apart`);
  // Averaging two 10 km/h vectors 20 deg apart shortens the mean by cos(10 deg),
  // not cos(20 deg) — my first expectation here was wrong, the code was right.
  const expectedMean = 10 * Math.cos(10 * Math.PI / 180);
  check('wind', 'vector mean preserves speed', Math.abs(mean.speed - expectedMean) < 0.01,
    `${mean.speed.toFixed(3)} km/h vs expected ${expectedMean.toFixed(3)} (10 x cos 10 deg)`);

  // round-trip every compass point
  let worst = 0;
  for (const [nm, deg] of Object.entries(wind.COMPASS)) {
    const uv = wind.toUV(25, deg);
    const back = wind.fromUV(uv.u, uv.v);
    worst = Math.max(worst, wind.bearingDiff(back.dir, deg));
  }
  check('wind', 'toUV/fromUV round-trips all 16 points', worst < 1e-9, `worst error ${worst.toExponential(1)} deg`);

  // calibration bearings
  const cases = [[0, 'N'], [90, 'E'], [180, 'S'], [270, 'W'], [45, 'NE'], [315, 'NW']];
  const named = cases.every(([deg, want]) => wind.compassName(deg) === want);
  check('wind', 'compass names correct for cardinals', named,
    cases.map(([d, w]) => `${d}=${wind.compassName(d)}`).join(' '));

  /* ============ 2. CSV parsing ============ */
  console.log('\n' + '='.repeat(78));
  console.log('  2. latest_10min_wind.csv parsing');
  console.log('='.repeat(78));

  const parsed = wind.parseWindCsv(SAMPLE_CSV);
  console.log(`   observedAt ${parsed.observedAt}, ${parsed.rows.length} rows`);
  const by = Object.fromEntries(parsed.rows.map((r) => [r.station, r]));
  for (const r of parsed.rows) {
    console.log(`   ${r.station.padEnd(18)} dir=${r.dirDeg == null ? '  -' : String(r.dirDeg).padStart(5)}` +
                ` spd=${r.speedKmh == null ? ' -' : String(r.speedKmh).padStart(3)}` +
                ` gust=${r.gustKmh == null ? ' -' : String(r.gustKmh).padStart(3)}` +
                ` calm=${r.calm ? 'Y' : 'n'} usable=${r.usable ? 'Y' : 'n'}`);
  }

  check('csv', 'timestamp parsed', parsed.observedAt === '2026-09-14T15:20:00+08:00', parsed.observedAt);
  check('csv', 'all rows kept (incl. 6-field Calm rows)', parsed.rows.length === 10, `${parsed.rows.length} of 10`);
  check('csv', 'compass point -> bearing', by['Central Pier'].dirDeg === 315, `Northwest -> ${by['Central Pier'].dirDeg}`);
  check('csv', 'Calm means speed 0, not N/A', by['Tai Mei Tuk'].calm && by['Tai Mei Tuk'].speedKmh === 0,
    `calm=${by['Tai Mei Tuk'].calm} speed=${by['Tai Mei Tuk'].speedKmh}`);
  check('csv', 'Calm row still carries its gust', by['Tai Mei Tuk'].gustKmh === 2, `gust ${by['Tai Mei Tuk'].gustKmh}`);
  check('csv', 'N/A direction with real speed -> unusable', by['Green Island'].usable === false,
    `speed ${by['Green Island'].speedKmh} but usable=${by['Green Island'].usable}`);
  check('csv', 'N/A speed 0 -> treated as calm', by["Tate's Cairn"].calm === true,
    `speed ${by["Tate's Cairn"].speedKmh}, calm=${by["Tate's Cairn"].calm}`);
  check('csv', 'Variable direction -> unusable', by['Tai Po Kau'].usable === false,
    `dir=${by['Tai Po Kau'].dirDeg} usable=${by['Tai Po Kau'].usable}`);
  check('csv', 'fully N/A row dropped', by['Stanley'].usable === false, `usable=${by['Stanley'].usable}`);

  const usable = parsed.rows.filter((r) => r.usable).length;
  console.log(`   usable rows for interpolation: ${usable} of ${parsed.rows.length}`);
  check('csv', 'usable count is sensible', usable >= 6, `${usable} usable`);

  /* station coverage */
  const matched = parsed.rows.map((r) => windStationByName(r.station)).filter(Boolean).length;
  check('stations', 'wind stations resolve to coordinates', matched === parsed.rows.length,
    `${matched}/${parsed.rows.length} matched, ${WIND_STATIONS.length} in table`);

  /* ============ 3. METAR ============ */
  console.log('\n' + '='.repeat(78));
  console.log('  3. METAR decoding');
  console.log('='.repeat(78));

  const m = av.parseMetar(SAMPLE_METAR, new Date('2026-09-14T08:00:00Z'));
  console.log(`   ${SAMPLE_METAR}`);
  console.log(`   station ${m.station}  issued ${m.issuedAt && m.issuedAt.toISOString()}`);
  console.log(`   wind ${m.wind.dirDeg} deg @ ${m.wind.speedKt} kt (gust ${m.wind.gustKt})`);
  console.log(`   vis ${m.visibility.metres} m (atLeast=${m.visibility.atLeast})  ceiling ${m.ceilingFt} ft`);
  console.log(`   clouds ${m.clouds.map((c) => c.raw).join(' ')}  temp ${m.temperatureC}/${m.dewpointC}  QNH ${m.qnhHpa}`);
  console.log(`   category ${m.flightCategory}  unparsed [${m.unparsed.join(' ')}]`);

  check('metar', 'station + issue time', m.station === 'VHHH' && m.issuedAt instanceof Date, m.station);
  check('metar', 'wind dir/speed without gust', m.wind.dirDeg === 320 && m.wind.speedKt === 4 && m.wind.gustKt === null,
    `${m.wind.dirDeg}/${m.wind.speedKt}`);
  check('metar', 'visibility 9999 = 10 km or more', m.visibility.metres === 10000 && m.visibility.atLeast,
    `${m.visibility.metres} m`);
  check('metar', 'FEW/SCT are not a ceiling', m.ceilingFt === null, `ceiling ${m.ceilingFt}`);
  check('metar', 'temperature and dewpoint', m.temperatureC === 29 && m.dewpointC === 24, `${m.temperatureC}/${m.dewpointC}`);
  check('metar', 'QNH', m.qnhHpa === 1012, `${m.qnhHpa} hPa`);
  check('metar', 'flight category VFR', m.flightCategory === 'VFR', m.flightCategory);
  check('metar', 'nothing silently dropped', m.unparsed.length === 0, `unparsed: [${m.unparsed.join(',')}]`);

  // gust + low visibility + thunderstorm variant
  const bad = av.parseMetar('METAR VHHH 140730Z 06015G28KT 2500 TSRA BKN008 OVC020 26/24 Q1008', new Date('2026-09-14T08:00:00Z'));
  console.log(`\n   ${'METAR VHHH 140730Z 06015G28KT 2500 TSRA BKN008 OVC020 26/24 Q1008'}`);
  console.log(`   gust ${bad.wind.gustKt} kt, vis ${bad.visibility.metres} m, ceiling ${bad.ceilingFt} ft, thunder=${bad.weather.some(w=>w.thunder)}, category ${bad.flightCategory}`);
  check('metar', 'gust decoded', bad.wind.gustKt === 28, `${bad.wind.gustKt} kt`);
  check('metar', 'ceiling = lowest BKN/OVC', bad.ceilingFt === 800, `${bad.ceilingFt} ft`);
  check('metar', 'TSRA flagged as thunderstorm', bad.weather.some((w) => w.thunder), bad.weather.map(w => w.raw).join(','));
  check('metar', 'degraded category', bad.flightCategory === 'IFR' || bad.flightCategory === 'LIFR', bad.flightCategory);

  /* ============ 4. TAF ============ */
  console.log('\n' + '='.repeat(78));
  console.log('  4. TAF decoding');
  console.log('='.repeat(78));

  const t = av.parseTaf(SAMPLE_TAF, new Date('2026-09-14T08:00:00Z'));
  console.log(`   station ${t.station}  validity ${t.validity.from.toISOString()} -> ${t.validity.to.toISOString()}`);
  console.log(`   base wind ${t.base.wind.dirDeg}@${t.base.wind.speedKt}kt vis ${t.base.visibility.metres}m clouds ${t.base.clouds.map(c=>c.raw).join(' ')}`);
  for (const g of t.groups) {
    console.log(`   ${g.type.padEnd(6)} ${g.from.toISOString().slice(5,16)} -> ${g.to.toISOString().slice(5,16)}` +
                `  wind ${g.wind ? g.wind.dirDeg + '@' + g.wind.speedKt + (g.wind.gustKt ? 'G' + g.wind.gustKt : '') : '-'}` +
                `  vis ${g.visibility ? g.visibility.metres : '-'}` +
                `  wx ${g.weather.map(w => w.raw).join('/') || '-'}`);
  }
  console.log(`   unparsed: [${t.unparsed.join(' ')}]`);

  check('taf', 'validity period parsed', !!t.validity && t.validity.to > t.validity.from,
    `${t.validity.from.toISOString().slice(5,16)} -> ${t.validity.to.toISOString().slice(5,16)}`);
  check('taf', 'base conditions decoded', t.base.wind.speedKt === 10 && t.base.visibility.metres === 10000,
    `wind ${t.base.wind.speedKt}kt vis ${t.base.visibility.metres}m`);
  check('taf', 'three change groups found', t.groups.length === 3, `${t.groups.length} groups`);
  check('taf', 'TEMPO period parsed', t.groups[0].from.getUTCHours() === 6 && t.groups[0].to.getUTCHours() === 9,
    `${t.groups[0].from.toISOString().slice(11,16)} -> ${t.groups[0].to.toISOString().slice(11,16)}`);
  check('taf', 'BECMG recognised', t.groups.some((g) => g.type === 'BECMG'), t.groups.map(g=>g.type).join(','));

  const wc = av.worstCase(t,
    new Date('2026-09-14T06:00:00Z'), new Date('2026-09-14T09:00:00Z'));
  console.log(`\n   worst case 1406-1409Z: wind ${wc.wind.dirDeg}@${wc.wind.speedKt}G${wc.wind.gustKt}kt, vis ${wc.visibility.metres} m, ceiling ${wc.ceilingFt}, thunder=${wc.thunder}, category ${wc.flightCategory}`);
  check('taf', 'worst case takes the gust', wc.wind.gustKt === 25, `gust ${wc.wind.gustKt} kt`);
  check('taf', 'worst case takes the lowest visibility', wc.visibility.metres === 3000, `${wc.visibility.metres} m`);
  check('taf', 'worst case flags thunderstorm', wc.thunder === true, `thunder=${wc.thunder}`);
  // FEW010CB is a cumulonimbus layer, but FEW is not a ceiling: only BKN and OVC
  // layers form one. Asserting null here is asserting correct aviation semantics.
  check('taf', 'FEW/SCT layers are not a ceiling', wc.ceilingFt === null,
    `ceiling ${wc.ceilingFt} ft (FEW010CB correctly not a ceiling)`);
  const wcBad = av.worstCase(av.parseTaf(
    'TAF VHHH 140500Z 1406/1512 30010KT 9999 BKN008 OVC015', new Date('2026-09-14T08:00:00Z')));
  check('taf', 'worst case takes the lowest BKN/OVC ceiling', wcBad.ceilingFt === 800, `${wcBad.ceilingFt} ft`);
  check('taf', 'degraded category in the hazard window', wc.flightCategory !== 'VFR', wc.flightCategory);

  /* ============ 5. unit conversion sanity ============ */
  console.log('\n' + '='.repeat(78));
  console.log('  5. Units');
  console.log('='.repeat(78));
  check('units', 'kt -> km/h conversion', Math.abs(10 * wind.KT_TO_KMH - 18.52) < 1e-9, `10 kt = ${(10*wind.KT_TO_KMH).toFixed(2)} km/h`);
  // Beaufort: F3 = 12-19 km/h, F4 = 20-28 km/h
  check('units', 'beaufort bounds',
    wind.beaufort(0) === 0 && wind.beaufort(15) === 3 && wind.beaufort(20) === 4 && wind.beaufort(90) >= 10,
    `0->${wind.beaufort(0)} 15->${wind.beaufort(15)} 20->${wind.beaufort(20)} 90->${wind.beaufort(90)}`);

  /* summary */
  const failed = results.filter((r) => !r.ok);
  console.log('\n' + '='.repeat(78));
  console.log(`  RESULT: ${results.length - failed.length}/${results.length} passed` +
              (failed.length ? `   FAILURES: ${failed.map((f) => f.name).join('; ')}` : ''));
  console.log('='.repeat(78));
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('\ncheck-lae failed:', e); process.exit(1); });
