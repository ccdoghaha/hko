'use strict';

/**
 * METAR / TAF decoding.
 *
 * These are the real aviation weather products for Hong Kong International
 * Airport (VHHH) and they carry exactly the quantities a low-altitude operation
 * is bounded by: surface wind and gusts, visibility, and cloud base. The
 * Observatory's district feeds have none of those (no visibility at all, and no
 * ceiling), so an LAE product needs this alongside them.
 *
 * Deliberately a decoder, not a validator: anything unrecognised is passed
 * through untouched rather than silently dropped, because an operational user
 * needs to see what the report actually said.
 */

/* ------------------------------------------------------------------ *
 * helpers
 * ------------------------------------------------------------------ */

const WEATHER_CODES = [
  // intensity / descriptor
  '-', '+', 'VC', 'MI', 'BC', 'PR', 'DR', 'BL', 'SH', 'TS', 'FZ',
  // precipitation
  'DZ', 'RA', 'SN', 'SG', 'IC', 'PL', 'GR', 'GS', 'UP',
  // obscuration
  'BR', 'FG', 'FU', 'VA', 'DU', 'SA', 'HZ', 'PY',
  // other
  'PO', 'SQ', 'FC', 'SS', 'DS', 'NSW',
];

const WEATHER_TEXT = {
  '-RA': 'light rain', 'RA': 'rain', '+RA': 'heavy rain',
  '-SHRA': 'light rain showers', 'SHRA': 'rain showers', '+SHRA': 'heavy rain showers',
  'TSRA': 'thunderstorm with rain', '+TSRA': 'heavy thunderstorm with rain',
  '-TSRA': 'thunderstorm with light rain',
  'TS': 'thunderstorm', 'VCTS': 'thunderstorm in the vicinity',
  'TSGR': 'thunderstorm with hail', 'TSGS': 'thunderstorm with small hail',
  'DZ': 'drizzle', '-DZ': 'light drizzle',
  'BR': 'mist', 'FG': 'fog', 'HZ': 'haze', 'FU': 'smoke',
  'SH': 'showers', 'FZRA': 'freezing rain',
};

function weatherText(code) {
  return WEATHER_TEXT[code] || code;
}

/** True for anything a low-altitude operation must treat as precipitation. */
function isPrecip(code) {
  return /(RA|DZ|SN|SG|GR|GS|PL|SH|TS)/.test(code);
}

function isThunder(code) {
  return /TS/.test(code);
}

/** Resolve a METAR day-of-month to a full date near a reference time. */
function resolveDay(ref, day, hh = 0, mm = 0) {
  const d = new Date(ref.getTime());
  d.setUTCHours(hh, mm, 0, 0);
  d.setUTCDate(day);
  // METAR days are 1..31 within the current month; if that lands far from the
  // reference, the report belongs to the adjacent month.
  const diff = d.getTime() - ref.getTime();
  if (diff > 15 * 86400000) d.setUTCMonth(d.getUTCMonth() - 1);
  else if (diff < -15 * 86400000) d.setUTCMonth(d.getUTCMonth() + 1);
  return d;
}

/** Parse `1406/1512` (or a FM group's `1406`) into {from, to} Dates. */
function parseValidityPeriod(token, ref) {
  const m = /^(\d{2})(\d{2})\/(\d{2})(\d{2})$/.exec(token);
  if (!m) return null;
  const from = resolveDay(ref, Number(m[1]), Number(m[2]));
  let to = resolveDay(ref, Number(m[3]), Number(m[4]));
  if (to < from) to = new Date(to.getTime() + 24 * 3600 * 1000);
  return { from, to };
}

/* ------------------------------------------------------------------ *
 * token decoders
 * ------------------------------------------------------------------ */

function decodeWind(tok) {
  const m = /^(\d{3}|VRB)(\d{2,3})(?:G(\d{2,3}))?(KT|MPS|KMH)$/.exec(tok.trim());
  if (!m) return null;
  const unit = m[4];
  const toKt = unit === 'MPS' ? (v) => v * 1.94384
             : unit === 'KMH' ? (v) => v / 1.852
             : (v) => v;
  return {
    raw: tok,
    variable: m[1] === 'VRB',
    dirDeg: m[1] === 'VRB' ? null : Number(m[1]),
    speedKt: toKt(Number(m[2])),
    gustKt: m[3] ? toKt(Number(m[3])) : null,
    unit,
  };
}

function decodeVisibility(tok) {
  const t = tok.trim();
  if (t === 'CAVOK') return { raw: t, cavok: true, metres: 10000, atLeast: true };
  const m = /^(\d{4})(NDV)?$/.exec(t);
  if (!m) return null;
  const v = Number(m[1]);
  // 9999 is the METAR encoding for "10 km or more". Reported as 10000 so that
  // downstream comparisons do not read it as slightly less than 10 km.
  const metres = v >= 9999 ? 10000 : v;
  return { raw: t, metres, atLeast: v >= 9999, cavok: false };
}

const CLOUD_AMOUNTS = { FEW: 'few', SCT: 'scattered', BKN: 'broken', OVC: 'overcast' };

function decodeCloud(tok) {
  const t = tok.trim();
  if (/^(NSC|NCD|SKC|CLR)$/.test(t)) {
    return { raw: t, clear: true, amount: null, baseFt: null };
  }
  const m = /^(FEW|SCT|BKN|OVC)(\d{3})(CB|TCU)?$/.exec(t);
  if (!m) return null;
  return {
    raw: t,
    clear: false,
    amount: CLOUD_AMOUNTS[m[1]],
    amountCode: m[1],
    baseFt: Number(m[2]) * 100,
    convective: m[3] || null,
  };
}

function decodeWeather(tok) {
  const t = tok.trim();
  if (!t) return null;
  // strip leading intensity/descriptor markers to test the shape
  const stripped = t.replace(/^[-+]?(VC)?/, '');
  if (!/^[A-Z]{2,6}$/.test(stripped)) return null;
  const parts = [];
  for (let i = 0; i < stripped.length; i += 2) {
    const p = stripped.slice(i, i + 2);
    if (!WEATHER_CODES.includes(p)) return null;
    parts.push(p);
  }
  if (!parts.length) return null;
  return { raw: t, codes: parts, precip: isPrecip(t), thunder: isThunder(t), text: weatherText(t) };
}

/* ------------------------------------------------------------------ *
 * METAR
 * ------------------------------------------------------------------ */

function parseMetar(text, ref = new Date()) {
  const clean = String(text).replace(/^\s*(METAR|SPECI)\s+/, '').trim();
  const tokens = clean.split(/\s+/);
  if (!tokens.length) return null;

  const out = {
    raw: String(text).trim(),
    station: tokens[0],
    type: /^SPECI/.test(String(text)) ? 'SPECI' : 'METAR',
    issuedAt: null,
    wind: null,
    visibility: null,
    clouds: [],
    weather: [],
    temperatureC: null,
    dewpointC: null,
    qnhHpa: null,
    cavok: false,
    trend: null,
    unparsed: [],
    ceilingFt: null,
    flightCategory: null,
  };

  for (let i = 1; i < tokens.length; i++) {
    const tk = tokens[i];

    const t = /^(\d{2})(\d{2})(\d{2})Z$/.exec(tk);
    if (t) { out.issuedAt = resolveDay(ref, Number(t[1]), Number(t[2]), Number(t[3])); continue; }

    if (!out.wind) { const w = decodeWind(tk); if (w) { out.wind = w; continue; } }

    if (tk === 'CAVOK') { out.cavok = true; out.visibility = decodeVisibility(tk); continue; }

    if (!out.visibility) { const v = decodeVisibility(tk); if (v) { out.visibility = v; continue; } }

    const c = decodeCloud(tk);
    if (c) { out.clouds.push(c); if (c.clear) out.cavok = out.cavok || false; continue; }

    const td = /^(M?\d{2})\/(M?\d{2})$/.exec(tk);
    if (td) {
      out.temperatureC = Number(td[1].replace('M', '-'));
      out.dewpointC = Number(td[2].replace('M', '-'));
      continue;
    }

    const q = /^Q(\d{3,4})$/.exec(tk);
    if (q) { out.qnhHpa = Number(q[1]); continue; }

    if (/^(NOSIG|BECMG|TEMPO)$/.test(tk)) { out.trend = tk; continue; }

    const wx = decodeWeather(tk);
    if (wx) { out.weather.push(wx); continue; }

    out.unparsed.push(tk);
  }

  // ceiling = lowest broken or overcast layer; FEW/SCT do not constitute a ceiling
  const ceilingLayers = out.clouds.filter((c) => c.amountCode === 'BKN' || c.amountCode === 'OVC');
  out.ceilingFt = ceilingLayers.length ? Math.min(...ceilingLayers.map((c) => c.baseFt)) : null;

  out.flightCategory = flightCategory(out);
  return out;
}

/** Standard VFR/MVFR/IFR/LIFR categorisation. */
function flightCategory(decoded) {
  const vis = decoded.visibility ? decoded.visibility.metres : null;
  const ceil = decoded.ceilingFt;
  const worstVis = vis == null ? 10000 : vis;
  const worstCeil = ceil == null ? 99999 : ceil;

  if (worstVis < 1600 || worstCeil < 500) return 'LIFR';
  if (worstVis < 5000 || worstCeil < 1000) return 'IFR';
  if (worstVis < 8000 || worstCeil < 3000) return 'MVFR';
  return 'VFR';
}

/* ------------------------------------------------------------------ *
 * TAF
 * ------------------------------------------------------------------ */

function parseTaf(text, ref = new Date()) {
  const clean = String(text).replace(/^\s*TAF\s+(AMD\s+|COR\s+)?/, '').trim();
  const tokens = clean.split(/\s+/);
  if (!tokens.length) return null;

  const out = {
    raw: String(text).trim(),
    station: tokens[0],
    issuedAt: null,
    validity: null,
    base: { wind: null, visibility: null, clouds: [], weather: [] },
    groups: [],
    unparsed: [],
  };

  let i = 1;
  const tm = /^(\d{2})(\d{2})(\d{2})Z$/.exec(tokens[i] || '');
  if (tm) { out.issuedAt = resolveDay(ref, Number(tm[1]), Number(tm[2]), Number(tm[3])); i++; }

  const vp = parseValidityPeriod(tokens[i] || '', ref);
  if (vp) { out.validity = vp; i++; }

  let current = out.base;
  for (; i < tokens.length; i++) {
    const tk = tokens[i];

    if (tk === 'TEMPO' || tk === 'BECMG' || /^FM\d{6}$/.test(tk) || tk === 'PROB30' || tk === 'PROB40') {
      let type = tk.startsWith('FM') ? 'FM' : tk;
      let prob = null;
      if (/^PROB\d{2}$/.test(tk)) { prob = Number(tk.slice(4)); i++; type = tokens[i] === 'TEMPO' ? 'TEMPO' : tokens[i]; }

      const period = /^FM(\d{2})(\d{2})(\d{2})$/.exec(tokens[i + 1] || '')
        ? (() => { const m = /^FM(\d{2})(\d{2})(\d{2})$/.exec(tokens[i + 1]); i++;
                   const from = resolveDay(ref, Number(m[1]), Number(m[2]), Number(m[3]));
                   return { from, to: out.validity ? out.validity.to : from }; })()
        : (() => { const p = parseValidityPeriod(tokens[i + 1] || '', ref); if (p) i++; return p; })();

      const g = { type, prob, from: period ? period.from : null, to: period ? period.to : null,
                  wind: null, visibility: null, clouds: [], weather: [] };
      out.groups.push(g);
      current = g;
      continue;
    }

    if (current.wind === null) { const w = decodeWind(tk); if (w) { current.wind = w; continue; } }
    if (current.visibility === null) { const v = decodeVisibility(tk); if (v) { current.visibility = v; continue; } }
    const c = decodeCloud(tk);
    if (c) { current.clouds.push(c); continue; }
    const wx = decodeWeather(tk);
    if (wx) { current.weather = current.weather.concat(wx); continue; }

    out.unparsed.push(tk);
  }

  return out;
}

/**
 * Merge the base forecast with any TEMPO/BECMG groups overlapping a window,
 * taking the WORST of each quantity. An operational decision has to be safe
 * against the most adverse forecast conditions in the period, not the average.
 */
function worstCase(taf, from = null, to = null) {
  if (!taf) return null;
  const lo = from || (taf.validity ? taf.validity.from : new Date(0));
  const hi = to || (taf.validity ? taf.validity.to : new Date(8640000000000000));

  const parts = [taf.base, ...taf.groups.filter((g) => {
    const a = g.from || lo, b = g.to || hi;
    return a <= hi && b >= lo;
  })];

  let wind = null, vis = null;
  const clouds = [];
  const weather = [];

  for (const p of parts) {
    if (p.wind) {
      if (!wind) wind = { ...p.wind };
      else {
        if (p.wind.speedKt > wind.speedKt) { wind.speedKt = p.wind.speedKt; wind.dirDeg = p.wind.dirDeg; }
        const g = p.wind.gustKt || 0, cg = wind.gustKt || 0;
        if (g > cg) wind.gustKt = p.wind.gustKt;
      }
    }
    if (p.visibility) {
      if (!vis || p.visibility.metres < vis.metres) vis = { ...p.visibility };
    }
    for (const c of p.clouds) clouds.push(c);
    for (const w of p.weather) if (!weather.some((x) => x.raw === w.raw)) weather.push(w);
  }

  const ceilingLayers = clouds.filter((c) => c.amountCode === 'BKN' || c.amountCode === 'OVC');
  const ceilingFt = ceilingLayers.length ? Math.min(...ceilingLayers.map((c) => c.baseFt)) : null;

  return {
    from: lo, to: hi,
    wind, visibility: vis, clouds, weather, ceilingFt,
    convective: clouds.some((c) => c.convective) || weather.some((w) => w.thunder),
    thunder: weather.some((w) => w.thunder),
    precip: weather.some((w) => w.precip),
    flightCategory: flightCategory({ visibility: vis, ceilingFt }),
  };
}

module.exports = {
  parseMetar, parseTaf, worstCase, decodeWind, decodeVisibility, decodeCloud,
  flightCategory, weatherText, isPrecip, isThunder, resolveDay,
};
