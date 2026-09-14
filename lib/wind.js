'use strict';

/**
 * Wind: parsing, vector algebra, and the reason direction must never be
 * interpolated directly.
 *
 * The HKO wind feed reports a 16-point compass direction, a 10-minute mean
 * speed and a maximum gust, in km/h. Direction is meteorological — it is the
 * direction the wind blows FROM, so 270 degrees means a westerly.
 *
 * Why vectors: a wind of 350 degrees and a wind of 010 degrees are 20 degrees
 * apart, but their mean as a scalar is 180 degrees — the exact opposite
 * direction. Any interpolation of direction as a number is therefore wrong
 * whenever the field straddles north (which, in Hong Kong's prevailing
 * easterlies and northerlies, is routine). The field is interpolated as u and v
 * components and converted back afterwards.
 */

const COMPASS = {
  N: 0, NORTH: 0,
  NNE: 22.5, NORTHNORTHEAST: 22.5,
  NE: 45, NORTHEAST: 45,
  ENE: 67.5, EASTNORTHEAST: 67.5,
  E: 90, EAST: 90,
  ESE: 112.5, EASTSOUTHEAST: 112.5,
  SE: 135, SOUTHEAST: 135,
  SSE: 157.5, SOUTHSOUTHEAST: 157.5,
  S: 180, SOUTH: 180,
  SSW: 202.5, SOUTHSOUTHWEST: 202.5,
  SW: 225, SOUTHWEST: 225,
  WSW: 247.5, WESTSOUTHWEST: 247.5,
  W: 270, WEST: 270,
  WNW: 292.5, WESTNORTHWEST: 292.5,
  NW: 315, NORTHWEST: 315,
  NNW: 337.5, NORTHNORTHWEST: 337.5,
};

/* ------------------------------------------------------------------ *
 * parsing
 * ------------------------------------------------------------------ */

/**
 * Parse a compass-point direction.
 * @returns {null | {calm:boolean, deg:number|null}}
 *   null            unusable (N/A, Variable, blank)
 *   {calm:true}     direction is meaningless because there is no wind
 *   {calm:false,deg} a real bearing in degrees
 */
function parseCompass(s) {
  if (s == null) return null;
  const t = String(s).trim().toUpperCase();
  if (!t) return null;
  if (t === 'N/A' || t === 'NA' || t === 'VARIABLE' || t === 'VRB') return null;
  if (t === 'CALM') return { calm: true, deg: null };
  if (Object.prototype.hasOwnProperty.call(COMPASS, t)) {
    return { calm: false, deg: COMPASS[t] };
  }
  return null;
}

/** Parse a speed cell. Accepts numbers, 'N/A', and 'Calm' (which means zero). */
function parseSpeed(s) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t) return null;
  if (/^N\/?A$/i.test(t)) return null;
  if (/^CALM$/i.test(t)) return 0;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parse latest_10min_wind.csv.
 *
 * Rows can carry N/A, Calm, Variable, or a blank gust. Calm means a real zero
 * speed with no meaningful direction; N/A means the sensor gave nothing and the
 * station must be dropped rather than read as calm — conflating the two would
 * inject false zeros into the analysis.
 */
function parseWindCsv(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { observedAt: null, rows: [] };

  const rows = [];
  let observedAt = null;

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 5) continue;
    const [dt, station, dirRaw, spdRaw, gustRaw] = parts;

    if (!observedAt && /^\d{12}$/.test(dt.trim())) {
      const t = dt.trim();
      observedAt = `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:00+08:00`;
    }

    const compass = parseCompass(dirRaw);
    const speed = parseSpeed(spdRaw);
    const gust = parseSpeed(gustRaw);

    let dir = null;
    let isCalm = false;
    let usable = true;

    if (compass && compass.calm) {
      isCalm = true;
      dir = null;                       // calm: direction carries no information
    } else if (compass && compass.deg != null) {
      dir = compass.deg;
    } else if (speed === 0) {
      isCalm = true;                    // no direction given, but speed is zero
    } else {
      usable = false;                   // direction unknown and non-zero speed
    }

    if (speed == null && gust == null) usable = false;

    rows.push({
      station: String(station).trim(),
      dirDeg: dir,
      speedKmh: speed,
      gustKmh: gust,
      calm: isCalm,
      usable,
      raw: { dt: dt.trim(), dir: dirRaw, speed: spdRaw, gust: gustRaw },
    });
  }

  return { observedAt, rows };
}

/* ------------------------------------------------------------------ *
 * vector algebra
 * ------------------------------------------------------------------ */

/** Meteorological wind -> u,v components (km/h). */
function toUV(speedKmh, dirDeg) {
  const r = (dirDeg * Math.PI) / 180;
  return { u: -speedKmh * Math.sin(r), v: -speedKmh * Math.cos(r) };
}

/** u,v components -> speed and meteorological direction. */
function fromUV(u, v) {
  const speed = Math.hypot(u, v);
  let dir = (Math.atan2(-u, -v) * 180) / Math.PI;
  if (dir < 0) dir += 360;
  if (speed < 1e-9) dir = null;        // direction undefined at zero speed
  return { speed, dir };
}

/** Smallest absolute difference between two bearings, in degrees (0..180). */
function bearingDiff(a, b) {
  if (a == null || b == null) return null;
  const d = Math.abs(((a - b) % 360 + 360) % 360);
  return d > 180 ? 360 - d : d;
}

/** 16-point compass name for a bearing (English). */
const POINTS = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
function compassName(deg) {
  if (deg == null) return null;
  return POINTS[Math.round(((deg % 360) / 22.5)) % 16];
}

/** Beaufort force from a speed in km/h. */
function beaufort(kmh) {
  if (kmh == null) return null;
  const bounds = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
  for (let i = 0; i < bounds.length; i++) if (kmh < bounds[i]) return i;
  return 12;
}

const KT_TO_KMH = 1.852;
const KMH_TO_KT = 1 / KT_TO_KMH;
const KMH_TO_MS = 1 / 3.6;

module.exports = {
  COMPASS, POINTS, KT_TO_KMH, KMH_TO_KT, KMH_TO_MS,
  parseCompass, parseSpeed, parseWindCsv,
  toUV, fromUV, bearingDiff, compassName, beaufort,
};
