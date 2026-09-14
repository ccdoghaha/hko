'use strict';

/**
 * Static consistency checks between the SPA shell, the SPA script and the
 * translation dictionaries.
 *
 *   node scripts/check-ui.js
 *
 * Why this exists: the browser tests catch behaviour, but they only run when
 * someone drives a browser. This catches the cheaper class of mistake — markup
 * restructured while the script still references a removed id, a translation key
 * used in one place and never defined, a sidebar entry pointing nowhere. Those
 * all fail silently at runtime (an undefined label renders as its own key), so
 * they need a check that runs in a second with no browser.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'public', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; console.log(`   PASS  ${name.padEnd(52)} ${detail}`); }
  else { fail++; console.log(`   FAIL  ${name.padEnd(52)} ${detail}`); }
}
const uniq = (a) => [...new Set(a)];

/* ------------------------------------------------------------------ *
 * 1. ids referenced from app.js must exist in the shell
 * ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(76));
console.log('  1. DOM ids');
console.log('='.repeat(76));

const htmlIds = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));

// ids the script emits itself inside its own view templates (e.g. <canvas id="chart3d">)
// and mounts after rendering. Derived from the script rather than whitelisted, so
// adding a new dynamic id needs no change here.
const runtimeIds = new Set([
  ...[...js.matchAll(/\bid="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]),          // emitted in view templates
  ...[...js.matchAll(/\.id\s*=\s*'([A-Za-z0-9_-]+)'/g)].map((m) => m[1]),   // assigned after createElement
]);

const referenced = uniq([...js.matchAll(/\$\('#([A-Za-z0-9_-]+)'/g)].map((m) => m[1]));
const missing = referenced.filter((id) => !htmlIds.has(id) && !runtimeIds.has(id));

check('shell ids parsed', htmlIds.size > 10, `${htmlIds.size} ids in index.html`);
check('script id references parsed', referenced.length > 5, `${referenced.length} distinct $() lookups`);
check('runtime-emitted ids detected', runtimeIds.size > 0, `${runtimeIds.size} emitted by app.js templates`);
check('every referenced id exists', missing.length === 0,
  missing.length ? `MISSING: ${missing.join(', ')}` : `all ${referenced.length} resolve`);

/* ------------------------------------------------------------------ *
 * 2. i18n keys must be defined in all three dictionaries
 * ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(76));
console.log('  2. translation keys');
console.log('='.repeat(76));

// The dictionaries are the three `tc: {...}`, `sc: {...}`, `en: {...}` blocks.
// Parse keys per language by slicing between the language markers.
const langMarkers = [['tc', 'tc: {'], ['sc', 'sc: {'], ['en', 'en: {']];
const dicts = {};
for (let i = 0; i < langMarkers.length; i++) {
  const [lang, marker] = langMarkers[i];
  const start = js.indexOf(marker);
  if (start < 0) { dicts[lang] = new Set(); continue; }
  // the block ends at the next language marker, or at the closing of I18N
  const nexts = langMarkers.slice(i + 1).map(([, m]) => js.indexOf(m, start + 1)).filter((n) => n > 0);
  const end = nexts.length ? Math.min(...nexts) : js.indexOf('};', start);
  const body = js.slice(start, end);
  // keys look like `  keyName: '...'`
  dicts[lang] = new Set([...body.matchAll(/(?:^|[\s{])([A-Za-z][A-Za-z0-9_]*)\s*:/g)].map((m) => m[1]));
}

check('three dictionaries found', Object.values(dicts).every((d) => d.size > 50),
  Object.entries(dicts).map(([k, v]) => `${k}=${v.size}`).join(' '));

// keys used via t('key')
const used = uniq([...js.matchAll(/\bt\('([A-Za-z0-9_]+)'\)/g)].map((m) => m[1]));

// Keys passed to t() through a variable are invisible to the scan above, so the
// string literals that reach t() indirectly are collected too. Without this the
// closest-* labels and the card titles would go unchecked.
const indirect = uniq([
  ...[...js.matchAll(/label:\s*'([A-Za-z0-9_]+)'/g)].map((m) => m[1]),                       // CLOSEST_BLOCK labels
  ...[...js.matchAll(/productShell\('([A-Za-z0-9_]+)'/g)].map((m) => m[1]),                 // product card titles
  ...[...js.matchAll(/astroTable\('([A-Za-z0-9_]+)',/g)].map((m) => m[1]),                  // sun / moon card titles
  ...[...js.matchAll(/\bblock\('[a-z_]+',\s*'([A-Za-z0-9_]+)'\)/g)].map((m) => m[1]),       // news card titles
]);
const allUsed = uniq([...used, ...indirect]);

const missingKeys = {};
for (const lang of ['tc', 'sc', 'en']) {
  const miss = allUsed.filter((k) => !dicts[lang].has(k));
  if (miss.length) missingKeys[lang] = miss;
}
check('every t() key defined in all 3 languages', Object.keys(missingKeys).length === 0,
  Object.keys(missingKeys).length
    ? Object.entries(missingKeys).map(([l, m]) => `${l}: ${m.join(',')}`).join(' | ')
    : `${allUsed.length} keys used (${indirect.length} via variables), 0 missing`);

/* ------------------------------------------------------------------ *
 * 3. data-i18n attributes in the shell must resolve
 * ------------------------------------------------------------------ */

const htmlKeys = uniq([
  ...[...html.matchAll(/data-i18n="([^"]+)"/g)].map((m) => m[1]),
  ...[...html.matchAll(/data-i18n-ph="([^"]+)"/g)].map((m) => m[1]),
]);
const badHtmlKeys = htmlKeys.filter((k) => !dicts.tc.has(k) || !dicts.en.has(k));
check('shell data-i18n keys resolve', badHtmlKeys.length === 0,
  badHtmlKeys.length ? `MISSING: ${badHtmlKeys.join(', ')}` : `${htmlKeys.length} attributes resolve`);

/* ------------------------------------------------------------------ *
 * 4. sidebar tree integrity
 * ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(76));
console.log('  4. sidebar tree');
console.log('='.repeat(76));

const treeStart = js.indexOf('const SIDEBAR_TREE');
const treeEnd = js.indexOf('];', js.indexOf('本站分析', treeStart)) + 2;
const tree = js.slice(treeStart, treeEnd);

// Leaves are 4-element tuples [tc, sc, en, destination]. Labels are single- or
// double-quoted (English labels contain apostrophes) and destinations are either
// a quoted route (`#/x`, `#/product/x`, or a URL) or a template literal.
const destRe = /,\s*(?:'(#[a-z0-9/]+)'|'(https:\/\/[^']+)'|`\$\{(HKO|MAPS)\}([^`]*)`)/g;
const dests = [...tree.matchAll(destRe)].map((m) => (
  m[1] ? { kind: 'route', to: m[1] }
    : m[2] ? { kind: 'url', to: m[2] }
      : { kind: 'url', to: (m[3] === 'HKO' ? 'https://www.hko.gov.hk' : 'https://maps.weather.gov.hk') + m[4] }
));

const badDest = dests.filter((d) => d.kind === 'url' && !/^https:\/\/[a-z.]+\/\S+/.test(d.to));
check('sidebar leaves well-formed', dests.length > 30 && badDest.length === 0,
  `${dests.length} destinations` + (badDest.length ? `; BAD: ${badDest.map((d) => d.to).join(',')}` : ', all valid'));

// Every '#/product/<key>' must have an entry in PRODUCT_INFO, and every local
// route must be one the router knows. Both fail silently otherwise: the page
// renders an "unknown product" shell or silently falls back to home.
const ROUTES_SRC = (js.match(/const ROUTES = \[([\s\S]*?)\];/) || [])[1] || '';
const routes = [...ROUTES_SRC.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
const localDests = uniq(dests.filter((d) => d.kind === 'route').map((d) => d.to));
const badRoutes = localDests.filter((r) => !routes.includes(r.split('/')[1]));
check('every sidebar route is known', badRoutes.length === 0,
  badRoutes.length ? `UNKNOWN: ${badRoutes.join(',')}` : `${localDests.length} local routes, all known`);

const prodBlock = js.slice(js.indexOf('const PRODUCT_INFO'), js.indexOf('\n};', js.indexOf('const PRODUCT_INFO')));
const definedKeys = new Set([...prodBlock.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9_]*):\s*\{/gm)].map((m) => m[1]));
const usedKeys = uniq(localDests.filter((r) => r.startsWith('#/product/')).map((r) => r.split('/')[2]));
const missingProductKeys = usedKeys.filter((k) => !definedKeys.has(k));
check('every product key is defined', missingProductKeys.length === 0,
  missingProductKeys.length ? `MISSING: ${missingProductKeys.join(',')}` : `${usedKeys.length} product keys, all defined`);

/* ------------------------------------------------------------------ *
 * 5. picker wiring
 * ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(76));
console.log('  5. picker wiring');
console.log('='.repeat(76));

const pStart = js.indexOf('const PICKER_PARAMS');
const paramBlock = js.slice(pStart, js.indexOf('\n];', pStart));
const paramKeys = [...paramBlock.matchAll(/k:\s*'([a-z]+)'/g)].map((m) => m[1]);
const seriesFn = js.slice(js.indexOf('function pickerSeries'), js.indexOf('function singleStationRows'));
const noCase = paramKeys.filter((k) => !seriesFn.includes(`case '${k}'`));
check('every picker param has an accessor', noCase.length === 0,
  noCase.length ? `NO CASE: ${noCase.join(',')}` : `${paramKeys.length} params, all handled`);

// the default param must be a real one
const def = (js.match(/picker:\s*\{\s*param:\s*'([a-z]+)'/) || [])[1];
check('default picker param is valid', paramKeys.includes(def), `default='${def}'`);

/* ------------------------------------------------------------------ *
 * 6. the shell and the script agree on the layout structure
 * ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(76));
console.log('  6. layout structure');
console.log('='.repeat(76));

check('shell has the sidebar host', /id="sideNav"/.test(html), 'index.html #sideNav');
check('script renders into it', /\$\('#sideNav'\)/.test(js), 'app.js renderSidebar()');
check('shell has the two-column layout', /class="layout"[\s\S]{0,40}id="layout"/.test(html), 'div.layout#layout');
const css = fs.readFileSync(path.join(ROOT, 'public', 'styles.css'), 'utf8');
check('stylesheet defines the grid', /\.layout\s*\{[^}]*grid-template-columns/.test(css), '.layout grid-template-columns');
check('stylesheet has sidebar rules', /\.side__head--top/.test(css), '.side__head--top present');
check('stylesheet has carousel rules', /\.fcarousel__item/.test(css), '.fcarousel__item present');

/* ------------------------------------------------------------------ *
 * 7. every route has a handler
 * ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(76));
console.log('  7. route coverage');
console.log('='.repeat(76));

// A route listed in ROUTES but missing from the dispatch map falls back to the
// home view silently -- the URL is valid and the page renders, just the wrong one.
const ROUTES_ALL = (js.match(/const ROUTES = \[([\s\S]*?)\];/) || [])[1] || '';
const allRoutes = [...ROUTES_ALL.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
const mapBlock = (js.match(/const map = \{([\s\S]*?)\};/) || [])[1] || '';
const handled = [...mapBlock.matchAll(/([a-z]+):\s*view[A-Za-z]+/g)].map((m) => m[1]);
const unhandled = allRoutes.filter((r) => !handled.includes(r));
check('every route has a view', unhandled.length === 0,
  unhandled.length ? `NO HANDLER: ${unhandled.join(', ')}` : `${allRoutes.length} routes, all dispatched`);

const orphanViews = handled.filter((r) => !allRoutes.includes(r));
check('every dispatch entry is a declared route', orphanViews.length === 0,
  orphanViews.length ? `NOT IN ROUTES: ${orphanViews.join(', ')}` : `${handled.length} handlers, all declared`);

// Views must be defined functions, not just named.
const undefinedViews = uniq([...mapBlock.matchAll(/:\s*(view[A-Za-z]+)/g)].map((m) => m[1]))
  .filter((fn) => !new RegExp(`function\\s+${fn}\\s*\\(`).test(js));
check('every dispatched view is defined', undefinedViews.length === 0,
  undefinedViews.length ? `UNDEFINED: ${undefinedViews.join(', ')}` : 'all view functions exist');

/* ------------------------------------------------------------------ *
 * 8. provenance footnote and the component set
 * ------------------------------------------------------------------ */

console.log('\n' + '='.repeat(76));
console.log('  8. provenance and components');
console.log('='.repeat(76));

// Every source named in PAGE_SOURCES must have a label. A missing one is not an
// error the page reports: sourceLabel() falls back to the raw key, so the footer
// silently reads "LTMV" instead of "能見度" and nothing looks broken.
const PAGE_SRC_BLOCK = (js.match(/const PAGE_SOURCES = \{([\s\S]*?)\n\};/) || [])[1] || '';
const pageSrcKeys = uniq([...PAGE_SRC_BLOCK.matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]));
const LABEL_BLOCK = (js.match(/const SOURCE_LABEL = \{([\s\S]*?)\n\};/) || [])[1] || '';
const labelKeys = [...LABEL_BLOCK.matchAll(/^\s{2}([A-Za-z_][A-Za-z0-9_]*):\s*\[/gm)].map((m) => m[1]);
const unlabelled = pageSrcKeys.filter((k) => !labelKeys.includes(k));
check('every cited source has a label', unlabelled.length === 0,
  unlabelled.length ? `NO LABEL: ${unlabelled.join(', ')}` : `${pageSrcKeys.length} sources, all labelled`);

// Labels must be trilingual like every other string, or the English view leaks
// Chinese source names.
const labelArity = [...LABEL_BLOCK.matchAll(/^\s{2}([A-Za-z_][A-Za-z0-9_]*):\s*\[([^\]]*)\]/gm)]
  .map((m) => [m[1], m[2].split(',').length]);
const badArity = labelArity.filter(([, n]) => n !== 3);
check('source labels are trilingual', badArity.length === 0,
  badArity.length ? `WRONG ARITY: ${badArity.map(([k, n]) => `${k}=${n}`).join(', ')}` : `${labelArity.length} labels, all [tc, sc, en]`);

// Product sources are looked up in the /api/products payload, so they must be
// real HKO dataTypes -- a typo yields a footer row that can never be populated.
const HK_TYPES = ['rhrread', 'flw', 'fnd', 'warnsum', 'warningInfo', 'swt',
  'LTMV', 'SRS', 'MRS', 'HHOT', 'CLMTEMP', 'CLMMAXT', 'CLMMINT', 'RYES', 'qem'];
const PROD_KEYS = ((js.match(/const PRODUCT_SOURCE_KEYS = \[([^\]]*)\]/) || [])[1] || '')
  .split(',').map((s) => s.trim().replace(/'/g, '')).filter(Boolean);
const notReal = PROD_KEYS.filter((k) => !HK_TYPES.includes(k));
check('product sources are real dataTypes', PROD_KEYS.length > 0 && notReal.length === 0,
  notReal.length ? `NOT A HKO dataType: ${notReal.join(', ')}` : `${PROD_KEYS.length} product sources, all real`);

// The footnote only appears if the render path actually calls it.
check('render path appends the footnote', /\+ provenance\(state\.route\)/.test(js), 'renderAll calls provenance()');

check('shell has the back-to-top control', /id="backTop"/.test(html), 'index.html #backTop');
check('script binds the back-to-top control', /\$\('#backTop'\)/.test(js), 'app.js initBackTop()');
check('stylesheet styles the footnote', /\.prov__list/.test(css), '.prov__list present');
check('stylesheet styles the tabs', /\.tabs__btn--on/.test(css), '.tabs__btn--on present');
check('back-to-top is hidden when printing', /@media print \{[\s\S]*?\.backtop/.test(css), '.backtop in @media print');

// A tab group whose keys collide would show the wrong panel.
const tabGroups = [...js.matchAll(/tabsCard\('([a-z]+)',\s*'[a-zA-Z]+',\s*\[([\s\S]*?)\]\s*\)/g)];
const dupTabKeys = tabGroups.filter(([, , body]) => {
  const keys = [...body.matchAll(/key:\s*'([a-z]+)'/g)].map((m) => m[1]);
  return keys.length !== new Set(keys).size;
}).map(([, route]) => route);
check('tab groups have unique keys', dupTabKeys.length === 0,
  dupTabKeys.length ? `DUPLICATE KEYS: ${dupTabKeys.join(', ')}` : `${tabGroups.length} tab group(s), keys unique`);

console.log('\n' + '='.repeat(76));
/* ------------------------------------------------------------------ *
 * 9. homepage information architecture
 *
 * The home page mirrors HKO's module order. Order is the point: the same
 * modules in a different sequence is a different information architecture,
 * so this asserts the sequence rather than mere presence.
 * ------------------------------------------------------------------ */

const src = fs.readFileSync(path.join(ROOT, 'public', 'app.js'), 'utf8');

const homeReturn = src.match(/return bannerHtml\(\)[\s\S]{0,400}?;/);
check('home composes its modules in one line', !!homeReturn,
  homeReturn ? homeReturn[0].replace(/\s+/g, ' ').slice(0, 180) : 'not found');

if (homeReturn) {
  const seq = homeReturn[0];
  const order = ['ps0', 'ps2', 'wxForecast', 'worldWx', 'socialMedia', 'channels',
                 'ps6', 'ps7', 'wxArticle', 'hkoNews', 'hkoBlog', 'ps9'];
  const idx = order.map((n) => [n, seq.indexOf(n)]);
  const allPresent = idx.every(([, i]) => i >= 0);
  check('home includes every HKO homepage module', allPresent,
    allPresent ? order.join(' · ')
               : 'missing: ' + idx.filter(([, i]) => i < 0).map(([n]) => n).join(', '));
  const ascending = idx.every(([, i], k) => k === 0 || i > idx[k - 1][1]);
  check("home modules run in HKO's order", ascending, order.join(' -> '));
}

check('forecast group nests its four sub-modules',
  /wxSection[\s\S]{0,900}?generalSituation[\s\S]{0,600}?localForecastToday[\s\S]{0,600}?t\('outlook'\)[\s\S]{0,600}?t\('nineDay'\)/.test(src),
  '天氣概況 > 本港地區今晚及明日天氣預測 > 展望 > 九天天氣預報');

check('sub-module headings use .subhead', /class="subhead"/.test(src) && /\.subhead\b/.test(css),
  '.subhead in markup and stylesheet');

check('the picker sits after 分區天氣, not before it',
  !!homeReturn && homeReturn[0].indexOf('pickerCard()') > homeReturn[0].indexOf('ps2'),
  homeReturn ? homeReturn[0].match(/ps0 \+ ps2 \+ pickerCard\(\)/) ? 'ps0 + ps2 + pickerCard()' : homeReturn[0].replace(/\s+/g, ' ').slice(0, 90) : 'no composition line');

check('no dead module blocks left behind', !/const ps5\b/.test(src), 'ps5 removed after its carousel moved');

check('every module title key exists in all three dictionaries', (() => {
  const keys = ['worldWeather', 'socialMedia', 'hkoChannel', 'weatherBlog',
                'hkoUpdates', 'hkoBlog', 'hkClimate', 'wxSection', 'localForecastToday'];
  return keys.every((k) => (src.match(new RegExp('(^|[ ,{])' + k + ':', 'gm')) || []).length >= 3);
})(), 'module titles x3 languages');

console.log(`  RESULT: ${pass}/${pass + fail} passed`);
console.log('='.repeat(76) + '\n');

process.exit(fail ? 1 : 0);
