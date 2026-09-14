'use strict';

/**
 * Low-Altitude Economy (LAE) go/no-go assessment.
 *
 * Combines four independent sources into a single operational verdict:
 *
 *   surface wind + gusts   HKO automatic station network (30 stations)
 *   visibility + ceiling   METAR / TAF for VHHH
 *   convective hazard      METAR/TAF thunderstorm coding, HKO lightning feed
 *   official warnings      HKO warnsum (typhoon, rainstorm, thunderstorm, monsoon)
 *
 * Every factor is evaluated independently and the verdict is the WORST factor,
 * because an operation is bounded by its most limiting constraint — averaging
 * hazards would let a thunderstorm be cancelled out by light wind.
 *
 * THRESHOLDS ARE A STARTING POINT, NOT AN APPROVED STANDARD. They are set for a
 * small uncrewed aircraft / eVTOL class operation and are stated explicitly
 * below so they can be reviewed and replaced. Nothing here substitutes for an
 * operator's own documented limits or for an approved flight planning process.
 */

const wind = require('./wind');

/* ------------------------------------------------------------------ *
 * thresholds
 * ------------------------------------------------------------------ */

const THRESHOLDS = {
  /* 10-minute mean wind at 10 m, km/h. Lower is better. */
  windKmh:        { caution: 25, noGo: 35 },
  /* Maximum gust, km/h. Lower is better. */
  gustKmh:        { caution: 35, noGo: 50 },
  /* Gust minus mean: a proxy for mechanical turbulence, km/h. */
  gustSpreadKmh:  { caution: 15, noGo: 25 },
  /* Visibility, metres. Higher is better. */
  visibilityM:    { noGo: 1500, caution: 5000 },
  /* Cloud ceiling (lowest BKN/OVC), feet. Higher is better. */
  ceilingFt:      { noGo: 500, caution: 1500 },
  /* Wind at the operating altitude, km/h. Lower is better. */
  windAtHeight:   { caution: 30, noGo: 45 },
};

const STATUS_ORDER = { 'GO': 0, 'CAUTION': 1, 'NO-GO': 2 };

/* ------------------------------------------------------------------ *
 * wind profile
 * ------------------------------------------------------------------ */

/**
 * Extrapolate a 10 m wind speed to an operating altitude with a power law:
 *
 *   v(z) = v10 * (z / 10) ^ alpha
 *
 * This is the standard engineering approximation (Hellmann exponent). It is an
 * approximation and it is stated as one: alpha depends on surface roughness and
 * stability, and the true profile over a city or a coastline can differ
 * substantially. It is useful for planning, not for a go/no-go margin call on
 * its own.
 *
 * Default alpha 0.143 corresponds to open, fairly flat terrain; 0.25-0.33 is
 * more appropriate over dense urban surfaces.
 */
function windAtAltitude(speed10m, altitudeM, alpha = 0.143) {
  if (speed10m == null || altitudeM == null) return null;
  if (altitudeM <= 10) return speed10m;
  return speed10m * Math.pow(altitudeM / 10, alpha);
}

const SURFACE_ALPHA = {
  open: 0.143,      // open water, flat coast
  suburban: 0.22,   // low-rise, mixed
  urban: 0.33,      // dense high-rise
};

/* ------------------------------------------------------------------ *
 * assessment
 * ------------------------------------------------------------------ */

function statusFrom(value, thresholds, higherIsBetter = false) {
  if (value == null || !Number.isFinite(value)) return 'UNKNOWN';
  if (higherIsBetter) {
    if (value < thresholds.noGo) return 'NO-GO';
    if (value < thresholds.caution) return 'CAUTION';
    return 'GO';
  }
  if (value > thresholds.noGo) return 'NO-GO';
  if (value > thresholds.caution) return 'CAUTION';
  return 'GO';
}

/** Worst status across a list, treating UNKNOWN as neutral. */
function worstStatus(statuses) {
  let worst = 'GO';
  for (const s of statuses) {
    if (s === 'UNKNOWN') continue;
    if ((STATUS_ORDER[s] ?? 0) > STATUS_ORDER[worst]) worst = s;
  }
  return worst;
}

/**
 * @param {object} input
 * @param {object} [input.windField]   { speedKmh, gustKmh, calm, station } representative or worst surface wind
 * @param {object} [input.metar]       decoded METAR
 * @param {object} [input.tafWorst]    worst-case TAF conditions for the window
 * @param {object} [input.warnings]    decoded HKO warnsum entries
 * @param {boolean} [input.lightning]  lightning detected in any district
 * @param {number} [input.altitudeM]   operating altitude, metres AGL
 * @param {number} [input.alpha]       wind profile exponent
 */
function assess(input = {}) {
  const factors = [];
  const alt = input.altitudeM ?? 120;
  const alpha = input.alpha ?? SURFACE_ALPHA.open;

  const add = (key, label, value, unit, status, threshold, note) =>
    factors.push({ key, label, value, unit, status, threshold, note });

  /* --- surface wind --- */
  const w = input.windField || null;
  if (w && w.speedKmh != null) {
    if (w.calm) {
      add('wind', 'Surface wind (10 m mean)', 0, 'km/h', 'GO', THRESHOLDS.windKmh, 'calm');
    } else {
      add('wind', 'Surface wind (10 m mean)', Math.round(w.speedKmh), 'km/h',
        statusFrom(w.speedKmh, THRESHOLDS.windKmh), THRESHOLDS.windKmh,
        w.station ? `worst station: ${w.station}` : null);
    }
  } else {
    add('wind', 'Surface wind (10 m mean)', null, 'km/h', 'UNKNOWN', THRESHOLDS.windKmh, 'no usable station');
  }

  /* --- gust --- */
  if (w && w.gustKmh != null) {
    add('gust', 'Maximum gust', Math.round(w.gustKmh), 'km/h',
      statusFrom(w.gustKmh, THRESHOLDS.gustKmh), THRESHOLDS.gustKmh, w.gustStation ? `station: ${w.gustStation}` : null);

    if (w.speedKmh != null && !w.calm) {
      const spread = w.gustKmh - w.speedKmh;
      add('gustSpread', 'Gust spread (gust - mean)', Math.round(spread), 'km/h',
        statusFrom(spread, THRESHOLDS.gustSpreadKmh), THRESHOLDS.gustSpreadKmh,
        'proxy for mechanical turbulence');
    }
  } else {
    add('gust', 'Maximum gust', null, 'km/h', 'UNKNOWN', THRESHOLDS.gustKmh, 'not reported');
  }

  /* --- wind at operating altitude --- */
  if (w && w.speedKmh != null) {
    const wz = windAtAltitude(w.speedKmh, alt, alpha);
    add('windAtHeight', `Wind at ${alt} m AGL`, Math.round(wz), 'km/h',
      statusFrom(wz, THRESHOLDS.windAtHeight), THRESHOLDS.windAtHeight,
      `power law, alpha=${alpha}`);
  }

  /* --- visibility / ceiling from METAR and TAF --- */
  const m = input.metar || null;
  const tw = input.tafWorst || null;

  const vis = m && m.visibility ? m.visibility.metres : null;
  const visSrc = m && m.visibility ? 'METAR VHHH' : null;
  if (vis != null) {
    add('visibility', 'Visibility', vis, 'm', statusFrom(vis, THRESHOLDS.visibilityM, true),
      THRESHOLDS.visibilityM, visSrc + (m.visibility.atLeast ? ' (10 km or more)' : ''));
  } else {
    add('visibility', 'Visibility', null, 'm', 'UNKNOWN', THRESHOLDS.visibilityM, 'no METAR');
  }

  if (m) {
    if (m.ceilingFt != null) {
      add('ceiling', 'Cloud ceiling', m.ceilingFt, 'ft',
        statusFrom(m.ceilingFt, THRESHOLDS.ceilingFt, true), THRESHOLDS.ceilingFt, 'lowest BKN/OVC layer');
    } else {
      add('ceiling', 'Cloud ceiling', null, 'ft', 'GO', THRESHOLDS.ceilingFt, 'no BKN/OVC layer reported');
    }
  }

  /* --- convective hazard --- */
  const metarThunder = !!(m && m.weather && m.weather.some((x) => x.thunder));
  const tafThunder = !!(tw && tw.thunder);
  if (metarThunder) {
    add('thunder', 'Thunderstorm (observed)', true, null, 'NO-GO', null, 'TS in current METAR');
  } else if (tafThunder) {
    add('thunder', 'Thunderstorm (forecast)', true, null, 'NO-GO', null, 'TS in TAF window');
  } else {
    add('thunder', 'Thunderstorm', false, null, 'GO', null, 'none observed or forecast in window');
  }

  if (input.lightning) {
    add('lightning', 'Lightning detected', true, null, 'CAUTION', null, 'at least one district reporting lightning');
  } else {
    add('lightning', 'Lightning detected', false, null, 'GO', null, 'none in current feed');
  }

  /* --- precipitation --- */
  const metarPrecip = !!(m && m.weather && m.weather.some((x) => x.precip));
  const tafPrecip = !!(tw && tw.precip);
  if (metarPrecip || tafPrecip) {
    add('precip', 'Precipitation', true, null, 'CAUTION', null,
      metarPrecip ? 'present in METAR' : 'forecast in TAF window');
  } else {
    add('precip', 'Precipitation', false, null, 'GO', null, 'none');
  }

  /* --- flight category --- */
  if (m && m.flightCategory) {
    const catStatus = m.flightCategory === 'VFR' ? 'GO'
                    : m.flightCategory === 'MVFR' ? 'CAUTION' : 'NO-GO';
    add('category', 'Flight category (VHHH)', m.flightCategory, null, catStatus, null, 'ICAO-style categorisation');
  }

  /* --- official warnings --- */
  const warns = input.warnings || [];
  if (warns.length) {
    for (const wr of warns) {
      add('warning:' + wr.code, `Warning: ${wr.name || wr.code}`, wr.code, null, wr.status, null, wr.note || null);
    }
  } else {
    add('warnings', 'Weather warnings', false, null, 'GO', null, 'none in force');
  }

  const overall = worstStatus(factors.map((f) => f.status));
  const blockers = factors.filter((f) => f.status === 'NO-GO').map((f) => f.label);
  const cautions = factors.filter((f) => f.status === 'CAUTION').map((f) => f.label);

  return {
    overall,
    assessedAt: new Date().toISOString(),
    altitudeM: alt,
    alpha,
    factors,
    blockers,
    cautions,
    summary: overall === 'NO-GO'
      ? `No-go: ${blockers.join('; ')}`
      : overall === 'CAUTION'
        ? `Caution: ${cautions.join('; ')}`
        : 'Go: no limiting factor exceeded',
  };
}

/**
 * Classify an HKO warning code for LAE purposes.
 * Exact matching matters: a substring test for 'WT' also matches 'WTS'
 * (thunderstorm, routine), while 'WT' alone is a tsunami warning.
 */
const WARNING_STATUS = [
  { re: /^(TC8[A-Z]{0,2}|TC9|TC10|WRB|WRC|WT)$/, status: 'NO-GO',
    note: 'typhoon signal 8+ / red or black rainstorm / tsunami: operations suspended' },
  { re: /^(WRA|WMS|WSS|WL|WLS|TC1|TC3)$/, status: 'CAUTION',
    note: 'official warning in force' },
  { re: /^(WTS|WCA|WHW|WF)$/, status: 'CAUTION',
    note: 'advisory warning in force' },
];

function classifyWarning(entry) {
  const code = String((entry && entry.code) || '').toUpperCase();
  for (const r of WARNING_STATUS) {
    if (r.re.test(code)) return { status: r.status, note: r.note };
  }
  return { status: 'CAUTION', note: 'unclassified warning in force' };
}

module.exports = {
  THRESHOLDS, STATUS_ORDER, SURFACE_ALPHA,
  windAtAltitude, statusFrom, worstStatus, assess, classifyWarning,
};
