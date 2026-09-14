/* ==========================================================================
   hko-local — SPA front end (original implementation)
   Data: Hong Kong Observatory Open Data API, proxied by ./server.js
   ========================================================================== */
'use strict';

/* ------------------------------------------------------------------ *
 * i18n — UI chrome only; all weather text comes from the API itself.
 * ------------------------------------------------------------------ */

const I18N = {
  tc: {
    siteTitle: '本地天氣站', siteSub: '資料來源：香港天文台開放數據',
    tabOverview: '總覽', tabRegional: '分區天氣', tabForecast: '九天預報', tabAlerts: '警告及提示',
    loading: '載入中…', refresh: '即時更新', refreshing: '更新中…',
    footNote: '本機示範應用。天氣資料由香港天文台開放數據 API 提供，版權屬香港天文台所有。此介面為獨立實作，並非天文台官方網站。',
    live: '已連線 · 資料時間', stale: '離線快取 · 資料時間', err: '無法連線',
    justNow: '剛剛更新', minsAgo: '分鐘前',
    currentWx: '本港天氣', flwTitle: '本港地區天氣預報', nineDay: '九天預報',
    regionalTemp: '分區氣溫', regionalRain: '分區雨量', alertsTitle: '天氣警告及提示',
    specialTips: '特別天氣提示', fireDanger: '火災危險警告',
    humidity: '相對濕度', uvindex: '紫外線指數', rainfall: '雨量', lightning: '閃電',
    updated: '更新時間', recordTime: '錄得時間', station: '地點', temp: '氣溫',
    maxRain: '最高雨量', minRain: '最低雨量', district: '地區',
    chartTemp: '氣溫', chartRain: '雨量', chartTitle: '分區氣溫立體圖',
    chartTitleRain: '分區雨量立體圖', chartHint: '滑鼠移至柱頂可看數值',
    noWarning: '現時沒有天氣警告。', noTip: '現時沒有特別天氣提示。',
    generalSituation: '天氣概況', outlook: '展望', forecastPeriod: '預報時段',
    seaTemp: '海水溫度', soilTemp: '土壤溫度', maxTemp: '最高氣溫', minTemp: '最低氣溫',
    maxRH: '最高濕度', minRH: '最低濕度', wind: '風', rainProb: '顯著降雨概率',
    today: '今日', errorTitle: '連線失敗', retry: '重試',
    records: '個站點', unitC: '°C', unitMm: '毫米', unitPct: '%',
  },
  sc: {
    siteTitle: '本地气象站', siteSub: '数据来源：香港天文台开放数据',
    tabOverview: '总览', tabRegional: '分区天气', tabForecast: '九天预报', tabAlerts: '警告及提示',
    loading: '加载中…', refresh: '即时更新', refreshing: '更新中…',
    footNote: '本机示范应用。天气数据由香港天文台开放数据 API 提供，版权属香港天文台所有。此界面为独立实现，并非天文台官方网站。',
    live: '已连线 · 数据时间', stale: '离线缓存 · 数据时间', err: '无法连线',
    justNow: '刚刚更新', minsAgo: '分钟前',
    currentWx: '本港天气', flwTitle: '本港地区天气预报', nineDay: '九天预报',
    regionalTemp: '分区气温', regionalRain: '分区雨量', alertsTitle: '天气警告及提示',
    specialTips: '特别天气提示', fireDanger: '火灾危险警告',
    humidity: '相对湿度', uvindex: '紫外线指数', rainfall: '雨量', lightning: '闪电',
    updated: '更新时间', recordTime: '录得时间', station: '地点', temp: '气温',
    maxRain: '最高雨量', minRain: '最低雨量', district: '地区',
    chartTemp: '气温', chartRain: '雨量', chartTitle: '分区气温立体图',
    chartTitleRain: '分区雨量立体图', chartHint: '鼠标移至柱顶可看数值',
    noWarning: '现时没有天气警告。', noTip: '现时没有特别天气提示。',
    generalSituation: '天气概况', outlook: '展望', forecastPeriod: '预报时段',
    seaTemp: '海水温度', soilTemp: '土壤温度', maxTemp: '最高气温', minTemp: '最低气温',
    maxRH: '最高湿度', minRH: '最低湿度', wind: '风', rainProb: '显著降雨概率',
    today: '今日', errorTitle: '连线失败', retry: '重试',
    records: '个站点', unitC: '°C', unitMm: '毫米', unitPct: '%',
  },
  en: {
    siteTitle: 'Local Weather Station', siteSub: 'Source: Hong Kong Observatory Open Data',
    tabOverview: 'Overview', tabRegional: 'Regional', tabForecast: '9-Day', tabAlerts: 'Warnings',
    loading: 'Loading…', refresh: 'Refresh', refreshing: 'Refreshing…',
    footNote: 'Local demonstration app. Weather data is provided by the Hong Kong Observatory Open Data API and remains the copyright of the Hong Kong Observatory. This interface is an independent implementation, not the official HKO website.',
    live: 'Connected · data time', stale: 'Offline cache · data time', err: 'Connection failed',
    justNow: 'updated just now', minsAgo: 'min ago',
    currentWx: 'Current Weather', flwTitle: 'Local Weather Forecast', nineDay: '9-Day Forecast',
    regionalTemp: 'Regional Temperature', regionalRain: 'Regional Rainfall', alertsTitle: 'Warnings & Tips',
    specialTips: 'Special Weather Tips', fireDanger: 'Fire Danger Warning',
    humidity: 'Relative Humidity', uvindex: 'UV Index', rainfall: 'Rainfall', lightning: 'Lightning',
    updated: 'Updated', recordTime: 'Recorded', station: 'Station', temp: 'Temp',
    maxRain: 'Max rainfall', minRain: 'Min rainfall', district: 'District',
    chartTemp: 'Temperature', chartRain: 'Rainfall', chartTitle: 'Regional temperature, 3-D view',
    chartTitleRain: 'Regional rainfall, 3-D view', chartHint: 'Hover a bar for its value',
    noWarning: 'No weather warnings in force.', noTip: 'No special weather tips at present.',
    generalSituation: 'General Situation', outlook: 'Outlook', forecastPeriod: 'Forecast Period',
    seaTemp: 'Sea Temperature', soilTemp: 'Soil Temperature', maxTemp: 'Max', minTemp: 'Min',
    maxRH: 'Max RH', minRH: 'Min RH', wind: 'Wind', rainProb: 'Prob. of significant rain',
    today: 'Today', errorTitle: 'Connection failed', retry: 'Retry',
    records: 'stations', unitC: '°C', unitMm: 'mm', unitPct: '%',
  },
};

/* ------------------------------------------------------------------ *
 * state
 * ------------------------------------------------------------------ */

const state = {
  lang: 'tc',
  route: 'overview',
  bundle: null,
  fetchedAt: null,
  stale: false,
  loading: false,
  error: null,
  regional: { sortKey: 'value', sortDir: 'desc', dataset: 'temp', sortDirRain: 'desc' },
  chart: { items: [], hover: null, box: null, canvas: null },
  autoTimer: null,
};

const AUTO_REFRESH_MS = 5 * 60 * 1000;

const $  = (sel, root = document) => root.querySelector(sel);
const t  = (key) => (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;

/* ------------------------------------------------------------------ *
 * small utilities
 * ------------------------------------------------------------------ */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fmtTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return String(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** "20260915" -> Date (HKO 9-day forecast date format) */
function parseCompactDate(s) {
  const m = String(s || '').match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fmtDM(s) {
  const d = parseCompactDate(s);
  if (!d) return '—';
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function relTime(ts) {
  if (!ts) return '—';
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins <= 0) return t('justNow');
  return `${mins} ${t('minsAgo')}`;
}

/** Blue -> red ramp for a temperature in Celsius. */
function tempColor(v) {
  if (v == null || isNaN(v)) return '#8aa0b4';
  const stops = [
    [8,   '#2f6fb5'], [14, '#3f9ad1'], [20, '#4fb3a5'],
    [25, '#8ec24a'],  [29, '#e8b230'], [32, '#e07b2c'], [35, '#c0392b'],
  ];
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [v0, c0] = stops[i - 1];
      const [v1, c1] = stops[i];
      return mixHex(c0, c1, (v - v0) / (v1 - v0 || 1));
    }
  }
  return stops[stops.length - 1][1];
}

function hexToRgb(h) {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
}

function rgbToHex(r, g, b) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mixHex(a, b, f) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * f, g1 + (g2 - g1) * f, b1 + (b2 - b1) * f);
}

/** Lighten (f>0) or darken (f<0) a hex colour by fraction f. */
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  if (f >= 0) return rgbToHex(r + (255 - r) * f, g + (255 - g) * f, b + (255 - b) * f);
  const k = 1 + f;
  return rgbToHex(r * k, g * k, b * k);
}

/* ------------------------------------------------------------------ *
 * data loading
 * ------------------------------------------------------------------ */

async function loadBundle(force = false) {
  state.loading = true;
  renderStatus();
  try {
    const res = await fetch(`/api/bundle?lang=${encodeURIComponent(state.lang)}${force ? '&force=1' : ''}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    state.bundle = json;
    state.fetchedAt = Date.now();
    state.stale = !!json.stale;
    state.error = null;
    renderAll();
  } catch (err) {
    state.error = err.message || String(err);
    renderStatus();
    if (!state.bundle) renderAll();
  } finally {
    state.loading = false;
    renderStatus();
  }
}

function scheduleAutoRefresh() {
  if (state.autoTimer) clearInterval(state.autoTimer);
  state.autoTimer = setInterval(() => {
    if (!document.hidden) loadBundle(true);
  }, AUTO_REFRESH_MS);
}

/* ------------------------------------------------------------------ *
 * derived data
 * ------------------------------------------------------------------ */

function rhr()      { return state.bundle && state.bundle.rhrread || {}; }
function warnings() { return (state.bundle && state.bundle.warnsum) || {}; }
function warningList() {
  const w = warnings();
  if (!w || Array.isArray(w)) return [];
  return Object.values(w).filter((x) => x && typeof x === 'object');
}
function specialTips() {
  const s = state.bundle && state.bundle.swt;
  return (s && Array.isArray(s.swt)) ? s.swt : [];
}
function nineDays() {
  const f = state.bundle && state.bundle.fnd;
  return (f && Array.isArray(f.weatherForecast)) ? f.weatherForecast : [];
}

function heroStation() {
  const data = (rhr().temperature && rhr().temperature.data) || [];
  return data.find((s) => /天文台|Observatory/i.test(s.place)) || data[0] || null;
}

function humidityValue() {
  const h = rhr().humidity;
  return (h && h.data && h.data[0] && h.data[0].value) ?? null;
}

function uvValue() {
  const u = rhr().uvindex;
  const d = u && u.data && u.data[0];
  if (!d) return null;
  return { value: d.value ?? null, desc: d.desc || '' };
}

function totalRainfall() {
  const r = rhr().rainfall;
  const d = (r && r.data) || [];
  if (!d.length) return null;
  const maxes = d.map((x) => Number(x.max) || 0);
  return { max: Math.max(...maxes), mean: maxes.reduce((a, b) => a + b, 0) / maxes.length };
}

function lightningActive() {
  const l = rhr().lightning;
  const d = (l && l.data) || [];
  return d.some((x) => String(x.occur).toLowerCase() === 'true');
}

function currentIcon() {
  const ic = rhr().icon;
  const n = Array.isArray(ic) ? ic[0] : ic;
  return Number(n) || null;
}

function currentDesc() {
  const m = rhr().tcmessage;
  if (Array.isArray(m) && m.length) return m.filter(Boolean).join(' ');
  if (typeof m === 'string' && m.trim()) return m.trim();
  const flw = (state.bundle && state.bundle.flw) || {};
  return flw.forecastDesc || '';
}

function iconUrl(n) { return n ? `/icons/pic${n}.png` : ''; }

/* ------------------------------------------------------------------ *
 * view: overview
 * ------------------------------------------------------------------ */

function viewOverview() {
  const st = heroStation();
  const uv = uvValue();
  const rain = totalRainfall();
  const icon = currentIcon();
  const flw = (state.bundle && state.bundle.flw) || {};
  const hum = humidityValue();
  const recTime = (rhr().temperature && rhr().temperature.recordTime) || rhr().updateTime;

  const heroCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('currentWx'))}</h2>
      <div class="hero">
        ${icon ? `<img class="hero__icon" src="${esc(iconUrl(icon))}" alt="" width="104" height="104">` : ''}
        <div>
          <div class="hero__temp">${st && st.value != null ? esc(st.value) : '—'}<sup>${esc(t('unitC'))}</sup></div>
          <div class="hero__desc">${esc(st ? st.place : '—')}</div>
          <div class="hero__meta">${esc(t('recordTime'))}: ${esc(fmtTime(recTime))}</div>
        </div>
      </div>
      <p class="prose prose--muted" style="margin-top:14px">${esc(currentDesc()) || '&nbsp;'}</p>
    </section>`;

  const metric = (k, v, unit, sub) => `
    <div class="metric">
      <div class="metric__k">${esc(k)}</div>
      <div class="metric__v">${v == null ? '—' : esc(v)}${unit ? `<small>${esc(unit)}</small>` : ''}</div>
      ${sub ? `<div class="metric__sub">${esc(sub)}</div>` : ''}
    </div>`;

  const metricsCard = `
    <section class="card">
      <h2 class="card__title">${esc(t('flwTitle'))}</h2>
      <p class="prose"><strong>${esc(t('generalSituation'))}:</strong> ${esc(flw.generalSituation || '—')}</p>
      <p class="prose"><strong>${esc(flw.forecastPeriod || t('forecastPeriod'))}:</strong> ${esc(flw.forecastDesc || '—')}</p>
      <p class="prose"><strong>${esc(t('outlook'))}:</strong> ${esc(flw.outlook || '—')}</p>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(flw.updateTime))}</p>
    </section>`;

  const metrics = `
    <section class="card">
      <h2 class="card__title">${esc(t('currentWx'))}</h2>
      <div class="metrics">
        ${metric(t('humidity'), hum, t('unitPct'))}
        ${metric(t('uvindex'), uv ? uv.value : null, '', uv ? uv.desc : '')}
        ${metric(t('rainfall'), rain ? rain.max : null, t('unitMm'), rain ? `max · ${t('unitMm')}` : '')}
        ${metric(t('lightning'), lightningActive() ? '⚡' : '—', '', '')}
      </div>
    </section>`;

  return heroCard + `<div class="grid grid--2">${metricsCard}${metrics}</div>`;
}

/* ------------------------------------------------------------------ *
 * view: regional (table + 3-D chart)
 * ------------------------------------------------------------------ */

function regionalRows() {
  const s = state.regional;
  const r = rhr();

  if (s.dataset === 'rain') {
    const rows = ((r.rainfall && r.rainfall.data) || []).map((d) => ({
      place: d.place,
      value: Number(d.max) || 0,
      min: d.min == null ? null : Number(d.min),
      unit: 'mm',
    }));
    const dir = s.sortDirRain === 'asc' ? 1 : -1;
    rows.sort((a, b) => (a.value - b.value) * dir || a.place.localeCompare(b.place));
    return { rows, label: t('maxRain'), unit: t('unitMm'), kind: 'rain' };
  }

  const rows = ((r.temperature && r.temperature.data) || []).map((d) => ({
    place: d.place, value: Number(d.value), unit: 'C',
  }));
  const dir = s.sortDir === 'asc' ? 1 : -1;
  rows.sort((a, b) => (a.value - b.value) * dir || a.place.localeCompare(b.place));
  return { rows, label: t('temp'), unit: t('unitC'), kind: 'temp' };
}

function viewRegional() {
  const { rows, unit, kind } = regionalRows();
  const isRain = kind === 'rain';
  const arrow = (key, dir) => `<span class="arrow">${dir === 'asc' ? '▲' : '▼'}</span>`;

  const body = rows.map((r) => {
    const chip = isRain
      ? `<span class="tempchip" style="background:${mixHex('#cfe3f5', '#1c5f9e', Math.min(1, r.value / 40))}">${esc(r.value)}</span>`
      : `<span class="tempchip" style="background:${tempColor(r.value)}">${esc(r.value)}</span>`;
    return `<tr>
      <td>${esc(r.place)}</td>
      <td class="num">${chip} <small style="color:#7b8a9c">${esc(unit)}</small></td>
      ${isRain ? `<td class="num">${r.min == null ? '—' : esc(r.min)}</td>` : ''}
    </tr>`;
  }).join('');

  return `
    <section class="card">
      <h2 class="card__title">${esc(isRain ? t('regionalRain') : t('regionalTemp'))}
        <span style="margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0">
          <button class="btn" data-dataset="temp" ${!isRain ? 'disabled' : ''}>${esc(t('chartTemp'))}</button>
          <button class="btn" data-dataset="rain" ${isRain ? 'disabled' : ''}>${esc(t('chartRain'))}</button>
        </span>
      </h2>

      <div class="chartbox"><canvas id="chart3d"></canvas></div>
      <div class="chartlegend">
        <span>${esc(isRain ? t('chartTitleRain') : t('chartTitle'))}</span>
        <span>${esc(t('chartHint'))}</span>
      </div>
    </section>

    <section class="card">
      <h2 class="card__title">${esc(t('station'))} · ${rows.length} ${esc(t('records'))}</h2>
      <div class="tablewrap">
        <table class="tbl">
          <thead><tr>
            <th class="sortable" data-sort="place">${esc(t('station'))}</th>
            <th class="sortable" data-sort="value" style="text-align:right">${esc(t('temp'))} ${arrow('value', isRain ? state.regional.sortDirRain : state.regional.sortDir)}</th>
            ${isRain ? `<th class="num" style="text-align:right">${esc(t('minRain'))}</th>` : ''}
          </tr></thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      <p class="card__note">${esc(t('recordTime'))}: ${esc(fmtTime((rhr().temperature || {}).recordTime))}</p>
    </section>`;
}

/* ------------------------------------------------------------------ *
 * 3-D isometric bar chart (original renderer)
 * ------------------------------------------------------------------ */

const ISO = { cos: 0.98, kx: 0.16, kz: 0.5 };
const isoProject = (x, y, z) => [(x - z) * ISO.cos, x * ISO.kx + z * ISO.kz - y];

function draw3DChart(canvas, items) {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.clientWidth || 900;
  const H = canvas.clientHeight || 380;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, W, H);

  if (!items.length) {
    g.fillStyle = '#7b8a9c';
    g.font = '14px system-ui, sans-serif';
    g.textAlign = 'center';
    g.fillText('—', W / 2, H / 2);
    state.chart.box = null;
    return;
  }

  const maxV = Math.max(...items.map((d) => d.value), 1);
  const minV = Math.min(...items.map((d) => d.value), 0);

  const BAR_W = 30, BAR_D = 30, GAP = 26, MAX_H = 210;
  const step = BAR_W + GAP;

  // Build every face in raw isometric space first, so we can fit-to-canvas.
  const bars = items.map((d, i) => {
    const norm = maxV === minV ? 1 : (d.value - minV) / (maxV - minV);
    const h = Math.max(6, norm * MAX_H + 6);
    const x0 = i * step, x1 = x0 + BAR_W;
    const z0 = 0, z1 = z0 + BAR_D;
    const base = d.color || '#3b7cba';
    const P = isoProject;
    return {
      item: d,
      faces: [
        // top
        { pts: [P(x0, h, z0), P(x1, h, z0), P(x1, h, z1), P(x0, h, z1)], fill: shade(base, 0.30), kind: 'top' },
        // right  (x = x1)
        { pts: [P(x1, 0, z0), P(x1, h, z0), P(x1, h, z1), P(x1, 0, z1)], fill: shade(base, -0.16), kind: 'side' },
        // front  (z = z1)
        { pts: [P(x0, 0, z1), P(x0, h, z1), P(x1, h, z1), P(x1, 0, z1)], fill: shade(base, -0.34), kind: 'front' },
      ],
      top: P((x0 + x1) / 2, h, (z0 + z1) / 2),
      base: P((x0 + x1) / 2, 0, (z0 + z1) / 2),
      centre: [(x0 + x1) / 2, (z0 + z1) / 2],
    };
  });

  // bounding box over all raw points
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const b of bars) {
    for (const f of b.faces) for (const [px, py] of f.pts) {
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
    for (const [px, py] of [b.top, b.base]) {
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
    }
  }

  const PAD_L = 20, PAD_R = 20, PAD_T = 34, PAD_B = 62;
  const s = Math.min((W - PAD_L - PAD_R) / (maxX - minX || 1), (H - PAD_T - PAD_B) / (maxY - minY || 1));
  const ox = PAD_L - minX * s;
  const oy = PAD_T - minY * s;
  const toScreen = ([px, py]) => [ox + px * s, oy + py * s];

  // baseline grid
  g.save();
  g.strokeStyle = 'rgba(120,140,165,.28)';
  g.lineWidth = 1;
  g.beginPath();
  const first = toScreen(isoProject(0, 0, 0));
  const lastBar = bars[bars.length - 1];
  const last = toScreen(isoProject(lastBar.centre[0] * 2, 0, 0));
  g.moveTo(first[0], first[1]);
  g.lineTo(last[0], last[1]);
  g.stroke();
  g.restore();

  // bars
  const hitboxes = [];
  for (const b of bars) {
    for (const f of b.faces) {
      const pts = f.pts.map(toScreen);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) g.lineTo(pts[i][0], pts[i][1]);
      g.closePath();
      g.fillStyle = f.fill;
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,.45)';
      g.lineWidth = 1;
      g.stroke();
    }

    const [tX, tY] = toScreen(b.top);
    const [bX, bY] = toScreen(b.base);
    hitboxes.push({ topX: tX, topY: tY, baseX: bX, baseY: bY, item: b.item });

    // value label on top
    g.fillStyle = '#16202c';
    g.font = '600 11.5px system-ui, "Segoe UI", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText(String(b.item.value), tX, tY - 6);

    // station label below baseline, rotated
    g.save();
    g.translate(bX, bY + 8);
    g.rotate(-Math.PI / 5);
    g.fillStyle = '#5a6b7e';
    g.font = '11px system-ui, "Microsoft JhengHei", sans-serif';
    g.textAlign = 'right';
    g.textBaseline = 'top';
    const lbl = String(b.item.label);
    g.fillText(lbl.length > 8 ? lbl.slice(0, 8) + '…' : lbl, 0, 0);
    g.restore();
  }

  state.chart.box = { hitboxes, scale: s, toScreen };
  state.chart.items = items;
  drawHover(g);
}

/** Redraw just the hover read-out on top of the existing chart. */
function drawHover(g) {
  const h = state.chart.hover;
  if (!h) return;
  g.save();
  g.beginPath();
  g.arc(h.x, h.y, 7, 0, Math.PI * 2);
  g.fillStyle = 'rgba(11,107,203,.95)';
  g.fill();
  g.strokeStyle = '#fff';
  g.lineWidth = 2;
  g.stroke();

  const text = `${h.item.label}  ${h.item.value}${h.suffix || ''}`;
  g.font = '600 12.5px system-ui, "Segoe UI", sans-serif';
  const w = g.measureText(text).width + 18;
  let x = h.x + 12, y = h.y - 14;
  if (x + w > (state.chart.canvas || {}).clientWidth - 6) x = h.x - w - 12;
  g.fillStyle = 'rgba(22,32,44,.94)';
  g.beginPath();
  const r = 6;
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + 26, r);
  g.arcTo(x + w, y + 26, x, y + 26, r);
  g.arcTo(x, y + 26, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
  g.fillStyle = '#fff';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(text, x + 9, y + 13);
  g.restore();
}

/** Redraw the whole canvas (bars) then the hover layer. */
function redrawChart() {
  const canvas = state.chart.canvas;
  if (!canvas || !document.body.contains(canvas)) return;
  const items = state.chart.items;
  draw3DChart(canvas, items);
}

function bindChart(canvas, items) {
  state.chart.canvas = canvas;
  const g = canvas.getContext('2d');

  const onMove = (ev) => {
    const box = state.chart.box;
    if (!box) return;
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;

    let best = null, bestD = Infinity;
    for (const hb of box.hitboxes) {
      const d = Math.hypot(hb.topX - mx, hb.topY - my);
      if (d < bestD) { bestD = d; best = hb; }
    }
    if (best && bestD < 42) {
      const suffix = best.item.unitSuffix || '';
      if (state.chart.hover && state.chart.hover.item === best.item) return;
      state.chart.hover = { x: best.topX, y: best.topY, item: best.item, suffix };
    } else {
      if (!state.chart.hover) return;
      state.chart.hover = null;
    }
    redrawChart();
  };

  const onLeave = () => {
    if (!state.chart.hover) return;
    state.chart.hover = null;
    redrawChart();
  };

  canvas.addEventListener('mousemove', onMove);
  canvas.addEventListener('mouseleave', onLeave);
  window.addEventListener('resize', onResizeDebounced);
}

let resizeTimer = null;
function onResizeDebounced() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => redrawChart(), 160);
}

/* ------------------------------------------------------------------ *
 * view: 9-day forecast
 * ------------------------------------------------------------------ */

function viewForecast() {
  const days = nineDays();
  const fnd = (state.bundle && state.bundle.fnd) || {};
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const cards = days.map((d) => {
    const dt = parseCompactDate(d.forecastDate);
    const isToday = dt && dt.getTime() === today.getTime();
    const maxt = d.forecastMaxtemp ? d.forecastMaxtemp.value : null;
    const mint = d.forecastMintemp ? d.forecastMintemp.value : null;
    const maxrh = d.forecastMaxrh ? d.forecastMaxrh.value : null;
    const minrh = d.forecastMinrh ? d.forecastMinrh.value : null;
    const pic = d.ForecastIcon;
    return `
      <div class="day ${isToday ? 'day--today' : ''}">
        <div class="day__dow">${esc(isToday ? t('today') : d.week || '')}</div>
        <div class="day__date">${esc(fmtDM(d.forecastDate))}</div>
        ${pic ? `<img class="day__icon" src="${esc(iconUrl(pic))}" alt="" width="56" height="56" loading="lazy">` : ''}
        <div class="day__temp">${mint != null ? esc(mint) : '—'} <span>– ${maxt != null ? esc(maxt) : '—'}${esc(t('unitC'))}</span></div>
        <div class="day__wx">${esc(d.forecastWeather || '')}</div>
        <div class="day__extra">
          <div>${esc(t('maxRH'))} ${maxrh != null ? esc(maxrh) : '—'}${esc(t('unitPct'))} · ${esc(t('minRH'))} ${minrh != null ? esc(minrh) : '—'}${esc(t('unitPct'))}</div>
          ${d.PSR ? `<div>${esc(t('rainProb'))}: ${esc(d.PSR)}</div>` : ''}
          ${d.forecastWind ? `<div>${esc(t('wind'))}: ${esc(d.forecastWind)}</div>` : ''}
        </div>
      </div>`;
  }).join('');

  const sea = fnd.seaTemp;
  const soil = Array.isArray(fnd.soilTemp) ? fnd.soilTemp : [];

  return `
    <section class="card">
      <h2 class="card__title">${esc(t('generalSituation'))}</h2>
      <p class="prose">${esc(fnd.generalSituation || '—')}</p>
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(fnd.updateTime))}</p>
    </section>

    <section class="card">
      <h2 class="card__title">${esc(t('nineDay'))}</h2>
      <div class="days">${cards || `<p class="empty">—</p>`}</div>
    </section>

    <div class="grid grid--2">
      <section class="card">
        <h2 class="card__title">${esc(t('seaTemp'))}</h2>
        ${sea ? `<p class="prose">${esc(sea.place)}: <strong>${esc(sea.value)}${esc(t('unitC'))}</strong><br>
          <span class="card__note">${esc(t('recordTime'))}: ${esc(fmtTime(sea.recordTime))}</span></p>` : `<p class="empty">—</p>`}
      </section>
      <section class="card">
        <h2 class="card__title">${esc(t('soilTemp'))}</h2>
        ${soil.length ? soil.map((s) => `<p class="prose" style="margin-bottom:4px">${esc(s.place)}: <strong>${esc(s.value)}${esc(t('unitC'))}</strong>
          <span class="card__note">· ${esc(t('recordTime'))}: ${esc(fmtTime(s.recordTime))}</span></p>`).join('') : `<p class="empty">—</p>`}
      </section>
    </div>`;
}

/* ------------------------------------------------------------------ *
 * view: warnings & tips
 * ------------------------------------------------------------------ */

function severityOf(code) {
  const c = String(code || '').toUpperCase();
  // Exact match only — substring tests misclassify codes like WTS (thunderstorm) as WT (tsunami).
  if (/^(WRB|WRC|TC9|TC10|WT)$/.test(c)) return 'severe';
  if (/^(WRA|TC1|TC3|TC8[A-Z]{0,2}|WMS|WSS|WL|WLS)$/.test(c)) return 'warn';
  return 'info';
}

function viewAlerts() {
  const list = warningList();
  const tips = specialTips();
  const info = Array.isArray(state.bundle && state.bundle.warningInfo) ? state.bundle.warningInfo : [];
  const flw = (state.bundle && state.bundle.flw) || {};

  const warnHtml = list.length
    ? list.map((w) => `
      <div class="alert ${severityOf(w.code || w.warningStatementCode) === 'severe' ? 'alert--severe' : ''}">
        <p class="alert__h">${esc(w.name || w.code || '—')}</p>
        <p class="alert__b">${esc(w.actionCode ? `${w.code || ''} · ${w.actionCode}` : (w.code || ''))}</p>
        <p class="alert__t">${esc(t('updated'))}: ${esc(fmtTime(w.updateTime || w.issueTime))}</p>
      </div>`).join('')
    : `<p class="empty">${esc(t('noWarning'))}</p>`;

  const infoHtml = info.length
    ? info.map((w) => `
      <div class="alert alert--info">
        <p class="alert__h">${esc(w.warningStatementCode || '—')}</p>
        <p class="alert__b">${(w.contents || []).map((c) => esc(c)).join('<br>')}</p>
        <p class="alert__t">${esc(t('updated'))}: ${esc(fmtTime(w.updateTime))}</p>
      </div>`).join('')
    : '';

  const tipsHtml = tips.length
    ? tips.map((s) => `
      <div class="alert">
        <p class="alert__b">${esc(s.desc || '')}</p>
        <p class="alert__t">${esc(t('updated'))}: ${esc(fmtTime(s.updateTime || s.updateTime2))}</p>
      </div>`).join('')
    : `<p class="empty">${esc(t('noTip'))}</p>`;

  return `
    <section class="card">
      <h2 class="card__title">${esc(t('alertsTitle'))}</h2>
      ${warnHtml}
      ${infoHtml}
    </section>
    <section class="card">
      <h2 class="card__title">${esc(t('specialTips'))}</h2>
      ${tipsHtml}
    </section>
    <section class="card">
      <h2 class="card__title">${esc(t('fireDanger'))}</h2>
      <p class="prose">${esc(flw.fireDangerWarning || t('noWarning'))}</p>
      ${flw.tcInfo ? `<p class="prose"><strong>熱帶氣旋資訊:</strong> ${esc(flw.tcInfo)}</p>` : ''}
      <p class="card__note">${esc(t('updated'))}: ${esc(fmtTime(flw.updateTime))}</p>
    </section>`;
}

/* ------------------------------------------------------------------ *
 * chrome: warning bar, status strip
 * ------------------------------------------------------------------ */

function renderWarningBar() {
  const bar = $('#warningBar');
  const list = warningList();
  if (!list.length) { bar.hidden = true; bar.innerHTML = ''; return; }

  const severe = list.some((w) => severityOf(w.code) === 'severe');
  bar.hidden = false;
  bar.className = `warnbar ${severe ? 'warnbar--severe' : ''}`;
  bar.innerHTML = list.map((w) =>
    `<span class="warnbar__pill"><span>${esc(w.code || '')}</span></span><strong>${esc(w.name || '')}</strong>`
  ).join('');
}

function renderStatus() {
  const dot = $('#statusDot');
  const txt = $('#statusText');
  const btn = $('#refreshBtn');

  dot.className = 'dot ' + (
    state.error ? 'dot--err' :
    state.loading ? 'dot--idle' :
    state.stale ? 'dot--stale' : 'dot--live'
  );

  if (state.loading && !state.fetchedAt) {
    txt.textContent = t('loading');
  } else if (state.error && !state.bundle) {
    txt.textContent = `${t('err')} — ${state.error}`;
  } else {
    const key = state.stale ? 'stale' : 'live';
    const when = state.fetchedAt ? new Date(state.fetchedAt) : new Date();
    const p = (n) => String(n).padStart(2, '0');
    txt.textContent = `${t(key)} ${p(when.getHours())}:${p(when.getMinutes())} (${relTime(state.fetchedAt)})`;
  }

  btn.disabled = state.loading;
  btn.textContent = state.loading ? t('refreshing') : t('refresh');

  const meta = $('#footMeta');
  if (meta && state.bundle) {
    const m = state.bundle.meta && state.bundle.meta.rhrread;
    const errs = (state.bundle.errors || []).map((e) => e.type).join(',');
    meta.textContent =
      `lang=${state.lang} · rhrread=${m && m.ok ? 'ok' : 'fail'} · fetchedAt=${m ? m.fetchedAt : '—'}` +
      (errs ? ` · failed=[${errs}]` : '') + (state.stale ? ' · STALE' : '');
  }
}

function renderI18nChrome() {
  document.documentElement.lang = state.lang === 'en' ? 'en' : (state.lang === 'sc' ? 'zh-Hans-HK' : 'zh-Hant-HK');
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const k = el.getAttribute('data-i18n');
    el.textContent = t(k);
  });
  document.querySelectorAll('.lang').forEach((b) => {
    b.classList.toggle('is-active', b.dataset.lang === state.lang);
  });
  document.querySelectorAll('.tab').forEach((a) => {
    a.classList.toggle('is-active', a.dataset.route === state.route);
  });
}

/* ------------------------------------------------------------------ *
 * router + render loop
 * ------------------------------------------------------------------ */

function parseHash() {
  const m = String(location.hash || '').match(/^#\/([a-z]+)/i);
  const r = m ? m[1].toLowerCase() : 'overview';
  return ['overview', 'regional', 'forecast', 'alerts'].includes(r) ? r : 'overview';
}

function renderAll() {
  state.route = parseHash();
  renderI18nChrome();
  renderWarningBar();

  const view = $('#view');

  if (!state.bundle) {
    view.innerHTML = `
      <section class="card">
        <h2 class="card__title">${esc(state.error ? t('errorTitle') : t('loading'))}</h2>
        ${state.error ? `<p class="empty">${esc(state.error)}</p>` : ''}
        <div class="skeleton" style="width:70%"></div>
        <div class="skeleton" style="width:45%"></div>
        <div class="skeleton" style="width:55%"></div>
      </section>`;
    return;
  }

  let html = '';
  if (state.route === 'overview')      html = viewOverview();
  else if (state.route === 'regional') html = viewRegional();
  else if (state.route === 'forecast') html = viewForecast();
  else                                 html = viewAlerts();
  view.innerHTML = html;

  if (state.route === 'regional') {
    const canvas = $('#chart3d');
    if (canvas) {
      const { rows, kind } = regionalRows();
      const isRain = kind === 'rain';
      const items = rows.map((r) => ({
        label: r.place,
        value: r.value,
        color: isRain ? mixHex('#cfe3f5', '#1c5f9e', Math.min(1, r.value / 40)) : tempColor(r.value),
        unitSuffix: isRain ? ` ${t('unitMm')}` : t('unitC'),
      }));
      state.chart.hover = null;
      canvas.style.cursor = 'crosshair';
      draw3DChart(canvas, items);
      bindChart(canvas, items);
    }
  }
}

function bindGlobalOnce() {
  window.addEventListener('hashchange', () => {
    state.route = parseHash();
    state.chart.hover = null;
    renderAll();
  });

  document.body.addEventListener('click', (ev) => {
    const langBtn = ev.target.closest('.lang');
    if (langBtn) {
      const l = langBtn.dataset.lang;
      if (l && l !== state.lang) {
        state.lang = l;
        try { localStorage.setItem('hko-local-lang', l); } catch { /* ignore */ }
        loadBundle(true);
      }
      return;
    }

    if (ev.target.closest('#refreshBtn')) { loadBundle(true); return; }

    const ds = ev.target.closest('[data-dataset]');
    if (ds) {
      state.regional.dataset = ds.dataset.dataset;
      state.chart.hover = null;
      renderAll();
      return;
    }

    const th = ev.target.closest('th.sortable');
    if (th) {
      const key = th.dataset.sort;
      const isRain = state.regional.dataset === 'rain';
      if (key === 'value') {
        if (isRain) state.regional.sortDirRain = state.regional.sortDirRain === 'desc' ? 'asc' : 'desc';
        else state.regional.sortDir = state.regional.sortDir === 'desc' ? 'asc' : 'desc';
      } else {
        state.regional.sortKey = key;
      }
      state.chart.hover = null;
      renderAll();
      return;
    }

    if (ev.target.closest('[data-retry]')) { loadBundle(true); }
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && state.fetchedAt && Date.now() - state.fetchedAt > AUTO_REFRESH_MS) {
      loadBundle(true);
    }
  });
}

/* ------------------------------------------------------------------ *
 * boot
 * ------------------------------------------------------------------ */

(function boot() {
  try {
    const saved = localStorage.getItem('hko-local-lang');
    if (saved && I18N[saved]) state.lang = saved;
  } catch { /* ignore */ }

  state.route = parseHash();
  bindGlobalOnce();
  renderI18nChrome();
  renderStatus();
  loadBundle(false);
  scheduleAutoRefresh();
})();
