'use strict';

/**
 * The automatic weather stations reported by the Observatory's rhrread feed,
 * with approximate coordinates. Elevation is NOT stored here — it is sampled
 * from the terrain mosaic at runtime, so it always agrees with the DEM actually
 * in use rather than drifting against a hand-typed number.
 *
 * NOTE: public/app.js holds its own copy of the station coordinates for the
 * browser-side station map. scripts/check-interp.js asserts the two agree; if
 * you edit one, the check will fail until you edit the other.
 */

const STATIONS = [
  { id: 'HKO',  tc: '香港天文台',   en: 'Hong Kong Observatory',      lat: 22.3020, lon: 114.1740 },
  { id: 'HKP',  tc: '香港公園',     en: 'Hong Kong Park',             lat: 22.2780, lon: 114.1600 },
  { id: 'KSC',  tc: '京士柏',       en: "King's Park",                lat: 22.3100, lon: 114.1730 },
  { id: 'WCH',  tc: '黃竹坑',       en: 'Wong Chuk Hang',             lat: 22.2480, lon: 114.1700 },
  { id: 'TKL',  tc: '打鼓嶺',       en: 'Ta Kwu Ling',                lat: 22.5280, lon: 114.1570 },
  { id: 'LFS',  tc: '流浮山',       en: 'Lau Fau Shan',               lat: 22.4690, lon: 113.9840 },
  { id: 'TPO',  tc: '大埔',         en: 'Tai Po',                     lat: 22.4490, lon: 114.1690 },
  { id: 'SHA',  tc: '沙田',         en: 'Sha Tin',                    lat: 22.4020, lon: 114.2100 },
  { id: 'TUN',  tc: '屯門',         en: 'Tuen Mun',                   lat: 22.3930, lon: 113.9760 },
  { id: 'JKB',  tc: '將軍澳',       en: 'Tseung Kwan O',              lat: 22.3150, lon: 114.2560 },
  { id: 'SKG',  tc: '西貢',         en: 'Sai Kung',                   lat: 22.3820, lon: 114.2740 },
  { id: 'CCH',  tc: '長洲',         en: 'Cheung Chau',                lat: 22.2010, lon: 114.0270 },
  { id: 'HKA',  tc: '赤鱲角',       en: 'Chek Lap Kok',               lat: 22.3090, lon: 113.9150 },
  { id: 'TY1',  tc: '青衣',         en: 'Tsing Yi',                   lat: 22.3440, lon: 114.0990 },
  { id: 'SEK',  tc: '石崗',         en: 'Shek Kong',                  lat: 22.4270, lon: 114.0800 },
  { id: 'TWN',  tc: '荃灣可觀',     en: 'Tsuen Wan Ho Koon',          lat: 22.3710, lon: 114.1080 },
  { id: 'TW',   tc: '荃灣城門谷',   en: 'Tsuen Wan Shing Mun Valley', lat: 22.3770, lon: 114.1400 },
  { id: 'SKW',  tc: '筲箕灣',       en: 'Shau Kei Wan',               lat: 22.2820, lon: 114.2360 },
  { id: 'KLT',  tc: '九龍城',       en: 'Kowloon City',               lat: 22.3320, lon: 114.1900 },
  { id: 'HPV',  tc: '跑馬地',       en: 'Happy Valley',               lat: 22.2700, lon: 114.1830 },
  { id: 'WTS',  tc: '黃大仙',       en: 'Wong Tai Sin',               lat: 22.3420, lon: 114.1960 },
  { id: 'KTG',  tc: '觀塘',         en: 'Kwun Tong',                  lat: 22.3180, lon: 114.2230 },
  { id: 'SSP',  tc: '深水埗',       en: 'Sham Shui Po',               lat: 22.3350, lon: 114.1370 },
  { id: 'KTR',  tc: '啟德跑道公園', en: 'Kai Tak Runway Park',        lat: 22.3050, lon: 114.2130 },
  { id: 'YLP',  tc: '元朗公園',     en: 'Yuen Long Park',             lat: 22.4420, lon: 114.0180 },
  { id: 'PLK',  tc: '大美督',       en: 'Tai Mei Tuk',                lat: 22.4670, lon: 114.2370 },
];

/** Look up a station by its name in any of the three languages. */
function byName(name, lang = 'tc') {
  return STATIONS.find((s) => s[lang] === name)
      || STATIONS.find((s) => s.tc === name || s.sc === name || s.en === name)
      || null;
}

module.exports = { STATIONS, byName };
