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

/* ------------------------------------------------------------------ *
 * Wind stations
 * ------------------------------------------------------------------ *
 *
 * The wind feed is a different, larger network than the temperature feed:
 * 30 stations, including marine and exposed sites (Waglan Island, Sha Chau,
 * Tap Mun, Cheung Chau Beach) with no temperature counterpart. Names are the
 * English strings as they appear in latest_10min_wind.csv, which is the only
 * language that feed offers for direction/speed.
 */
const WIND_STATIONS = [
  { id: 'CP1', en: 'Central Pier',        tc: '中環碼頭',   lat: 22.2880, lon: 114.1620 },
  { id: 'HKA', en: 'Chek Lap Kok',        tc: '赤鱲角',     lat: 22.3090, lon: 113.9150 },
  { id: 'CCH', en: 'Cheung Chau',         tc: '長洲',       lat: 22.2010, lon: 114.0270 },
  { id: 'CCB', en: 'Cheung Chau Beach',   tc: '長洲泳灘',   lat: 22.2080, lon: 114.0280 },
  { id: 'GI1', en: 'Green Island',        tc: '青洲',       lat: 22.2850, lon: 114.1130 },
  { id: 'HSS', en: 'Hong Kong Sea School',tc: '香港航海學校', lat: 22.2220, lon: 114.2100 },
  { id: 'KAT', en: 'Kai Tak',             tc: '啟德',       lat: 22.3170, lon: 114.2130 },
  { id: 'HKP', en: "King's Park",         tc: '京士柏',     lat: 22.3100, lon: 114.1730 },
  { id: 'LAM', en: 'Lamma Island',        tc: '南丫島',     lat: 22.2100, lon: 114.1200 },
  { id: 'LFS', en: 'Lau Fau Shan',        tc: '流浮山',     lat: 22.4690, lon: 113.9840 },
  { id: 'NGP', en: 'Ngong Ping',          tc: '昂坪',       lat: 22.2560, lon: 113.9130 },
  { id: 'NP1', en: 'North Point',         tc: '北角',       lat: 22.2920, lon: 114.2000 },
  { id: 'PEN', en: 'Peng Chau',           tc: '坪洲',       lat: 22.2910, lon: 114.0430 },
  { id: 'SKG', en: 'Sai Kung',            tc: '西貢',       lat: 22.3820, lon: 114.2740 },
  { id: 'SC1', en: 'Sha Chau',            tc: '沙洲',       lat: 22.3520, lon: 113.8860 },
  { id: 'SHA', en: 'Sha Tin',             tc: '沙田',       lat: 22.4020, lon: 114.2100 },
  { id: 'SEK', en: 'Shek Kong',           tc: '石崗',       lat: 22.4270, lon: 114.0800 },
  { id: 'STY', en: 'Stanley',             tc: '赤柱',       lat: 22.2130, lon: 114.2170 },
  { id: 'SF1', en: 'Star Ferry',          tc: '天星碼頭',   lat: 22.2930, lon: 114.1680 },
  { id: 'TKL', en: 'Ta Kwu Ling',         tc: '打鼓嶺',     lat: 22.5280, lon: 114.1570 },
  { id: 'TMT', en: 'Tai Mei Tuk',         tc: '大美督',     lat: 22.4670, lon: 114.2370 },
  { id: 'TPK', en: 'Tai Po Kau',          tc: '大埔滘',     lat: 22.4400, lon: 114.1830 },
  { id: 'TAP', en: 'Tap Mun',             tc: '塔門',       lat: 22.4710, lon: 114.3600 },
  { id: 'TC1', en: "Tate's Cairn",        tc: '大老山',     lat: 22.3580, lon: 114.2180 },
  { id: 'JKB', en: 'Tseung Kwan O',       tc: '將軍澳',     lat: 22.3150, lon: 114.2560 },
  { id: 'TY1', en: 'Tsing Yi',            tc: '青衣',       lat: 22.3440, lon: 114.0990 },
  { id: 'TUN', en: 'Tuen Mun',            tc: '屯門',       lat: 22.3930, lon: 113.9760 },
  { id: 'WAG', en: 'Waglan Island',       tc: '橫瀾島',     lat: 22.1820, lon: 114.3030 },
  { id: 'WLP', en: 'Wetland Park',        tc: '濕地公園',   lat: 22.4670, lon: 114.0090 },
  { id: 'WCH', en: 'Wong Chuk Hang',      tc: '黃竹坑',     lat: 22.2480, lon: 114.1700 },
];

const WIND_BY_EN = Object.fromEntries(WIND_STATIONS.map((s) => [s.en, s]));

function windStationByName(en) { return WIND_BY_EN[en] || null; }

module.exports = { STATIONS, byName, WIND_STATIONS, windStationByName };

