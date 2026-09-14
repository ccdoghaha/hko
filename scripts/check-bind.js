'use strict';

/**
 * Verifies the HOST binding behaviour.
 *
 *   node scripts/check-bind.js
 *
 * The service defaults to loopback because it has no authentication. HOST
 * overrides that for container/reverse-proxy deployments. This asserts both
 * paths actually bind where they claim to, and that the warning prints when the
 * service is exposed.
 */

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(env, port) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['server.js', String(port)], {
      cwd: ROOT, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let out = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });

    (async () => {
      let up = false;
      for (let i = 0; i < 40; i++) {
        await sleep(150);
        try { const r = await fetch(`http://127.0.0.1:${port}/api/status`); if (r.ok) { up = true; break; } } catch {}
      }
      child.kill();
      await sleep(300);
      resolve({ up, out, banner: (out.match(/Listening http:[^\s]+/) || [''])[0], warned: /not loopback/.test(out) });
    })();
  });
}

const results = [];
const check = (name, ok, detail) => {
  results.push(ok);
  console.log(`   ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(42)} ${detail}`);
};

(async () => {
  console.log('='.repeat(74));
  console.log('  HOST binding');
  console.log('='.repeat(74));

  const a = await run({}, 8891);
  console.log(`   default  banner: ${a.banner}`);
  check('default binds loopback', a.up && /Listening http:\/\/127\.0\.0\.1:8891/.test(a.out), a.banner || 'did not start');
  check('default does not warn about exposure', a.up && !a.warned, a.warned ? 'warned' : 'no warning (correct)');

  const b = await run({ HOST: '0.0.0.0' }, 8892);
  console.log(`   HOST=0.0.0.0 banner: ${b.banner}`);
  check('HOST override binds 0.0.0.0', b.up && /Listening http:\/\/0\.0\.0\.0:8892/.test(b.out), b.banner || 'did not start');
  check('HOST override prints the exposure warning', b.up && b.warned,
    b.warned ? 'warned (correct)' : 'no warning');
  check('reachable on loopback when bound to 0.0.0.0', b.up, b.up ? 'yes' : 'no');

  const failed = results.filter((r) => !r).length;
  console.log('\n' + '='.repeat(74));
  console.log(`  RESULT: ${results.length - failed}/${results.length} passed`);
  console.log('='.repeat(74));
  process.exit(failed ? 1 : 0);
})();
