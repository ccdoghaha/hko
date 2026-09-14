#!/usr/bin/env node
/**
 * check-prov.js — provenance time extraction
 *
 * The footer has to date every source it names. HKO exposes that time in four
 * different shapes across the fifteen dataTypes, and two of them are booby
 * trapped:
 *
 *   RYES carries BulletinTime as a time of day ("0015") and BulletinDate as a
 *   YYYYMMDD string. new Date("0015") does not fail -- it parses as the year 15
 *   AD, so reading BulletinTime alone silently renders "15-01-01" instead of
 *   raising anything. A wrong date that looks like a date is worse than no date.
 *
 *   LTMV, HHOT, SRS and MRS carry no time field at all; the timestamp is the
 *   first column of each data row.
 *
 * The functions under test are extracted from public/app.js and executed, rather
 * than reimplemented here, so this cannot drift from what actually ships.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const APP = path.join(__dirname, '..', 'public', 'app.js');
const src = fs.readFileSync(APP, 'utf8');

let pass = 0, fail = 0;
const check = (name, ok, detail) => {
  if (ok) { pass++; console.log(`   PASS  ${name}${detail ? '   ' + detail : ''}`); }
  else { fail++; console.log(`   FAIL  ${name}   ${detail || ''}`); }
};

/** Pull a top-level `function name(...) {...}` out of app.js by brace matching. */
function extract(name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`function ${name} not found in app.js`);
  let i = src.indexOf('{', start), depth = 0;
  for (let j = i; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}') { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error(`unbalanced braces in ${name}`);
}

// The two functions only need `state` from their surroundings.
const ctx = { state: { products: null, bundle: null }, SOURCE_LABEL: {}, console };
vm.createContext(ctx);
for (const fn of ['sourceTime', 'productObsTime']) {
  vm.runInContext(extract(fn), ctx, { filename: 'app.js' });
}

console.log('\n' + '='.repeat(76));
console.log('  provenance time extraction');
console.log('='.repeat(76));

const products = (p) => { ctx.state.products = p; ctx.state.bundle = null; };

// ---- RYES: two fields that must be combined -------------------------------
products({ RYES: { BulletinDate: '20260914', BulletinTime: '0015', ReportTimeInfoDate: '20260913' } });
let t = ctx.productObsTime('RYES');
check('RYES combines date and time-of-day', t === '2026-09-14T00:15:00+08:00', String(t));

// the trap: BulletinTime alone parses as the year 15
check('RYES time-of-day alone would be wrong',
  new Date('0015').getFullYear() === 15,
  `new Date("0015") -> year ${new Date('0015').getFullYear()}`);

products({ RYES: { BulletinDate: '20261231', BulletinTime: '2359' } });
check('RYES handles end of year', ctx.productObsTime('RYES') === '2026-12-31T23:59:00+08:00');

// ---- fields/data products: timestamp is the first cell --------------------
products({ LTMV: { fields: ['日期時間', '自動氣象站', '十分鐘平均能見度'],
                   data: [['202609141710', '中環', '21 公里'], ['202609141710', '橫瀾島', '40 公里']] } });
check('LTMV reads the row timestamp', ctx.productObsTime('LTMV') === '2026-09-14T17:10:00+08:00',
  String(ctx.productObsTime('LTMV')));

// ---- date-only tables (SRS, MRS) ------------------------------------------
products({ SRS: { fields: ['YYYY-MM-DD', 'RISE', 'TRAN.', 'SET'],
                  data: [['2026-09-01', '06:06', '12:23', '18:40'], ['2026-09-30', '06:14', '12:13', '18:12']] } });
check('SRS reads a date-only first column', ctx.productObsTime('SRS') === '2026-09-01T00:00:00+08:00',
  String(ctx.productObsTime('SRS')));

// HHOT is a month x day grid with no year anywhere -- there is no honest
// timestamp to derive, so it must return null rather than invent one.
products({ HHOT: { fields: ['MM', 'DD', '01', '02', '03'],
                   data: [['09', '01', '1.92', '1.73', '1.42']] } });
check('HHOT grid with no year returns null', ctx.productObsTime('HHOT') === null,
  String(ctx.productObsTime('HHOT')));

// ---- qem carries a real ISO updateTime ------------------------------------
products({ qem: { mag: 2.1, updateTime: '2026-09-12T05:30:00+08:00' } });
check('qem uses its updateTime', ctx.productObsTime('qem') === '2026-09-12T05:30:00+08:00');

// ---- products with no time anywhere must return null, not a guess ---------
products({ CLMTEMP: { type: ['月', '日'], fields: ['月', '日', '值'], data: [['1', '1', '18.3']] } });
check('CLMTEMP with no time returns null', ctx.productObsTime('CLMTEMP') === null,
  String(ctx.productObsTime('CLMTEMP')));

products({ HHOT: { fields: ['x'], data: [['not-a-timestamp', '1']] } });
check('malformed row timestamp returns null', ctx.productObsTime('HHOT') === null);

products({ HHOT: { fields: ['x'], data: [] } });
check('empty data returns null', ctx.productObsTime('HHOT') === null);

products({ SRS: null });
check('absent product returns null', ctx.productObsTime('SRS') === null);

products(null);
check('no products loaded returns null', ctx.productObsTime('LTMV') === null);

// ---- the live bundle still wins over the product payload ------------------
ctx.state.products = { fnd: { updateTime: '1999-01-01T00:00:00+08:00' } };
ctx.state.bundle = { fnd: { updateTime: '2026-09-14T16:30:00+08:00' } };
check('live bundle takes priority', ctx.sourceTime('fnd') === '2026-09-14T16:30:00+08:00');

ctx.state.bundle = { rhrread: { iconUpdateTime: '2026-09-14T15:05:00+08:00' } };
check('rhrread uses iconUpdateTime', ctx.sourceTime('rhrread') === '2026-09-14T15:05:00+08:00',
  String(ctx.sourceTime('rhrread')));

console.log('\n' + '='.repeat(76));
console.log(`  RESULT: ${pass}/${pass + fail} passed`);
console.log('='.repeat(76) + '\n');

process.exit(fail ? 1 : 0);
