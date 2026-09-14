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
const missingKeys = {};
for (const lang of ['tc', 'sc', 'en']) {
  const miss = used.filter((k) => !dicts[lang].has(k));
  if (miss.length) missingKeys[lang] = miss;
}
check('every t() key defined in all 3 languages', Object.keys(missingKeys).length === 0,
  Object.keys(missingKeys).length
    ? Object.entries(missingKeys).map(([l, m]) => `${l}: ${m.join(',')}`).join(' | ')
    : `${used.length} keys used, 0 missing`);

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
// a quoted route/URL or a template literal built from the HKO/MAPS base.
const destRe = /,\s*(?:'(#\/[a-z]+)'|'(https:\/\/[^']+)'|`\$\{(HKO|MAPS)\}([^`]*)`)/g;
const dests = [...tree.matchAll(destRe)].map((m) => (
  m[1] ? { kind: 'route', to: m[1] }
    : m[2] ? { kind: 'url', to: m[2] }
      : { kind: 'url', to: (m[3] === 'HKO' ? 'https://www.hko.gov.hk' : 'https://maps.weather.gov.hk') + m[4] }
));

const badDest = dests.filter((d) => d.kind === 'url' && !/^https:\/\/[a-z.]+\/\S+/.test(d.to));
check('sidebar leaves well-formed', dests.length > 30 && badDest.length === 0,
  `${dests.length} destinations` + (badDest.length ? `; BAD: ${badDest.map((d) => d.to).join(',')}` : ', all valid'));

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

console.log('\n' + '='.repeat(76));
console.log(`  RESULT: ${pass}/${pass + fail} passed`);
console.log('='.repeat(76) + '\n');

process.exit(fail ? 1 : 0);
