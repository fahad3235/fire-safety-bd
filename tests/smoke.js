// fire-safety-bd -- headless-Chrome smoke test via raw CDP (no puppeteer).
// Usage: node tests/smoke.js
// Exits non-zero on any failed assertion; fails on page console errors.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const PORT = 9363;
const BASE = 'file://' + path.resolve(__dirname, '..', 'index.html');
let failures = 0;
let count = 0;
const pageErrors = [];
function check(name, cond, extra) {
  count++;
  console.log((cond ? 'ok - ' : 'FAIL - ') + name + (cond ? '' : ' :: ' + (extra || '')));
  if (!cond) failures++;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const CHROME_BIN = process.env.CHROME_BIN ||
    require('os').homedir() + '/.cache/ms-playwright/chromium_headless_shell-1187/chrome-linux/headless_shell';
  const chrome = spawn(CHROME_BIN, [
    '--headless=new', '--no-sandbox', '--disable-gpu',
    '--remote-debugging-port=' + PORT, '--user-data-dir=/tmp/fsb-smoke-' + process.pid,
    'about:blank',
  ], { stdio: 'ignore' });
  let targets = [];
  for (let i = 0; i < 50 && targets.length === 0; i++) {
    await wait(200);
    try {
      targets = JSON.parse(await new Promise((res, rej) => {
        http.get('http://127.0.0.1:' + PORT + '/json/list', (r) => {
          let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(d));
        }).on('error', rej);
      }));
    } catch (e) { /* retry */ }
  }
  if (!targets.length) { console.log('FAIL - chrome did not start'); process.exit(2); }
  const wsUrl = targets[0].webSocketDebuggerUrl;
  const ws = new WebSocket(wsUrl);
  await new Promise((res) => { ws.onopen = res; });
  let seq = 0; const pending = new Map();
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    if (msg.method === 'Runtime.exceptionThrown') {
      pageErrors.push('exception: ' + JSON.stringify(msg.params.exceptionDetails).slice(0, 300));
    }
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      pageErrors.push('console.error: ' + JSON.stringify(msg.params.args).slice(0, 300));
    }
  };
  function send(method, params) {
    return new Promise((res) => {
      const id = ++seq;
      pending.set(id, res);
      ws.send(JSON.stringify({ id, method, params: params || {} }));
    });
  }
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  const nav = async (url) => { await send('Page.navigate', { url }); await wait(1200); };
  const ev = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.result && r.result.exceptionDetails) return { error: JSON.stringify(r.result.exceptionDetails).slice(0, 300) };
    return r.result ? r.result.result.value : undefined;
  };
  const click = async (id) => ev(`document.getElementById('${id}').click()`);

  // ---- Load: defaults ----
  await nav(BASE);
  check('page title mentions Fire Safety', (await ev('document.title')).includes('Fire Safety'));
  check('7 tabs', (await ev(`document.querySelectorAll('.tab').length`)) === 7);
  check('risk panel active on load', (await ev(`document.getElementById('panel-risk').classList.contains('active')`)) === true);
  check('first risk question asks about wiring',
    (await ev(`document.querySelector('#panel-risk .qtext').textContent`)).includes('wiring'));
  check('next disabled before answering', (await ev(`document.getElementById('risk-next').disabled`)) === true);

  // ---- Risk flow: all-safe answers -> 100 / Low risk ----
  const safe = ['no', 'no', 'no', 'no', 'yes', 'no', 'no', 'no', 'yes', 'yes'];
  for (let i = 0; i < 10; i++) {
    await ev(`document.querySelector('#panel-risk [data-ans="${safe[i]}"]').click()`);
    await click('risk-next');
    await wait(120);
  }
  check('all-safe result shows 100', (await ev(`document.querySelector('#panel-risk .score').textContent`)).includes('100'));
  check('all-safe band is Low risk', (await ev(`document.querySelector('#panel-risk .band').textContent`)).includes('Low risk'));
  check('all-safe shows no-fix praise', (await ev(`document.querySelector('#panel-risk .good')`)) !== null);

  // ---- Risk flow again: one risky answer (wiring) -> 88 / Moderate, fix listed ----
  await click('risk-restart');
  await ev(`document.querySelector('#panel-risk [data-ans="yes"]').click()`);
  await click('risk-next');
  for (let i = 1; i < 10; i++) {
    await ev(`document.querySelector('#panel-risk [data-ans="${safe[i]}"]').click()`);
    await click('risk-next');
    await wait(120);
  }
  check('one-risky result shows 88', (await ev(`document.querySelector('#panel-risk .score').textContent`)).includes('88'));
  check('one-risky band is Moderate risk', (await ev(`document.querySelector('#panel-risk .band').textContent`)).includes('Moderate risk'));
  check('fix list mentions electrician', (await ev(`document.querySelector('#panel-risk .fixes').textContent`)).includes('electrician'));

  // ---- Extinguisher finder ----
  await click('tab-ext');
  check('extinguisher panel active', (await ev(`document.getElementById('panel-ext').classList.contains('active')`)) === true);
  check('5 fire-type chips', (await ev(`document.querySelectorAll('#panel-ext .chip').length`)) === 5);
  check('PASS steps listed', (await ev(`document.querySelector('#panel-ext .passlist').textContent`)).includes('Pull'));
  await ev(`document.querySelector('#panel-ext [data-ext="oil"]').click()`);
  check('oil fire -> Class F', (await ev(`document.querySelector('#panel-ext .extcard').textContent`)).includes('Class F'));
  check('oil fire warns never water', (await ev(`document.querySelector('#panel-ext .extcard').textContent`)).includes('NEVER use water'));
  await ev(`document.querySelector('#panel-ext [data-ext="electrical"]').click()`);
  check('electrical fire -> CO2 in use line', (await ev(`document.querySelector('#panel-ext .extcard').textContent`)).includes('CO₂'));

  // ---- Emergency numbers ----
  await click('tab-emergency');
  check('3 emergency number cards', (await ev(`document.querySelectorAll('#panel-emergency .numcard').length`)) === 3);
  check('999 card present', (await ev(`document.querySelector('#panel-emergency').textContent`)).includes('999'));
  check('102 card present', (await ev(`document.querySelector('#panel-emergency').textContent`)).includes('102'));
  check('tel:102 link present', (await ev(`document.querySelector('#panel-emergency a[href="tel:102"]')`)) !== null);
  check('operator tips list 4 items', (await ev(`document.querySelectorAll('#panel-emergency ol li').length`)) === 4);

  // ---- Checklist: tick, progress, persistence ----
  await click('tab-checklist');
  check('22 checklist boxes', (await ev(`document.querySelectorAll('#panel-checklist [data-item]').length`)) === 22);
  await ev(`document.querySelector('#panel-checklist [data-item="k1"]').click()`);
  await ev(`document.querySelector('#panel-checklist [data-item="e2"]').click()`);
  check('progress reads 2 / 22', (await ev(`document.querySelector('#panel-checklist .muted').textContent`)).includes('2 / 22'));
  await nav(BASE);
  await click('tab-checklist');
  check('checklist persists after reload (k1 still checked)',
    (await ev(`document.querySelector('#panel-checklist [data-item="k1"]').checked`)) === true);
  await ev(`window.confirm = () => true`);
  await click('cl-reset');
  check('reset clears ticks', (await ev(`document.querySelectorAll('#panel-checklist [data-item]:checked').length`)) === 0);

  // ---- Escape plan: validation then save + persistence ----
  await click('tab-escape');
  await ev(`document.querySelector('#escape-form button[type="submit"]').click()`);
  check('empty plan shows error', (await ev(`document.getElementById('es-err').hidden`)) === false);
  await ev(`document.getElementById('es-members').value='4'`);
  await ev(`document.getElementById('es-meeting').value='big tree by the gate'`);
  await ev(`document.getElementById('es-exit1').value='main stairs'`);
  await ev(`document.getElementById('es-exit2').value='back stairs'`);
  await ev(`document.querySelector('#escape-form button[type="submit"]').click()`);
  check('saved message appears', (await ev(`document.getElementById('es-saved').hidden`)) === false);
  check('summary shows meeting point', (await ev(`document.getElementById('es-summary').textContent`)).includes('big tree by the gate'));
  await nav(BASE);
  await click('tab-escape');
  check('escape plan persists after reload', (await ev(`document.getElementById('es-summary').textContent`)).includes('big tree by the gate'));

  // ---- Quiz: answer all 10 correctly -> 10 / 10 ----
  await click('tab-quiz');
  for (let i = 0; i < 10; i++) {
    const a = await ev(`window.DATA.QUIZ[${i}].a`);
    await ev(`document.querySelector('#panel-quiz [data-opt="${a}"]').click()`);
    await wait(120);
    check('quiz Q' + (i + 1) + ' feedback shows Correct!', (await ev(`document.querySelector('#panel-quiz .feedback').textContent`)).includes('Correct!'));
    await click('quiz-next');
    await wait(120);
  }
  check('quiz result shows 10', (await ev(`document.querySelector('#panel-quiz .score').textContent`)).includes('10'));
  await click('quiz-retry');
  check('quiz retry restarts at Q1', (await ev(`document.querySelector('#panel-quiz .qtext').textContent`)).includes('wastebasket'));

  // ---- Facts ----
  await click('tab-facts');
  check('6 stat cards', (await ev(`document.querySelectorAll('#panel-facts .stat').length`)) === 6);
  check('facts show 27,059 total', (await ev(`document.querySelector('#panel-facts').textContent`)).includes('27,059'));
  check('facts show electrical 34.7%', (await ev(`document.querySelector('#panel-facts').textContent`)).includes('34.7%'));
  check('facts cite FSCD source', (await ev(`document.querySelector('#panel-facts').textContent`)).includes('FSCD'));

  // ---- Language toggle: Bengali title + digits, persists after reload ----
  await click('lang-btn');
  check('BN toggle: title in Bengali', (await ev(`document.querySelector('.topbar h1').textContent`)) === 'ফায়ার সেফটি বিডি');
  check('BN toggle: risk question in Bengali', (await ev(`document.querySelector('#panel-risk .qtext') ? document.querySelector('#panel-risk .qtext').textContent : ''`)).includes('ময়লার') || (await ev(`document.getElementById('tab-risk').textContent`)).includes('ঝুঁকি'));
  await nav(BASE);
  check('BN toggle persists after reload', (await ev(`localStorage.getItem('fsbd-lang')`)) === 'bn');
  await click('lang-btn');
  check('back to EN', (await ev(`localStorage.getItem('fsbd-lang')`)) === 'en');

  // ---- Footer disclaimer ----
  check('footer mentions emergency 999', (await ev(`document.querySelector('footer').textContent`)).includes('999'));

  // ---- Mobile 390px: no horizontal overflow on any tab ----
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await nav(BASE);
  for (const tab of ['risk', 'ext', 'emergency', 'checklist', 'escape', 'quiz', 'facts']) {
    await click('tab-' + tab);
    await wait(300);
    const overflow = await ev(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
    check('390px no overflow on ' + tab + ' tab', overflow <= 0, 'overflow=' + overflow);
  }

  // ---- Zero network requests: app is fully offline (only file:// loads) ----
  const reqs = await ev(`performance.getEntriesByType('resource').map(r => r.name).filter(n => !n.startsWith('file://')).length`);
  check('zero non-file network requests', reqs === 0, 'non-file=' + reqs);

  check('no console/page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));

  chrome.kill();
  console.log('\n' + count + ' checks, ' + failures + ' failed');
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.log('FAIL - harness error: ' + e.message); try { chrome.kill(); } catch (_) {} process.exit(2); });
