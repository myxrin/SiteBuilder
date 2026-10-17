/**
 * Crash-recovery E2E: edits made inside the autosave debounce window must survive
 * a hard reload via the localStorage pending buffer.
 */
const WD = 'http://127.0.0.1:4444';
const APP = 'http://127.0.0.1:4173/';
const PROJECT_NAME = 'Crash Recovery Site';

const results = [];
const check = (name, ok, extra = '') => {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? '  (' + extra + ')' : ''}`);
};

async function req(method, url, body) {
  const res = await fetch(WD + url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${JSON.stringify(json)}`);
  return json;
}

const session = await req('POST', '/session', {
  capabilities: { alwaysMatch: { browserName: 'firefox', 'moz:firefoxOptions': { args: ['-headless'] } } }
});
const sid = session.value.sessionId;
const E = id => `/session/${sid}/element/${id}`;
const V = r => r.value;

async function find(css) {
  const r = await req('POST', `/session/${sid}/element`, { using: 'css selector', value: css });
  return V(r)['element-6066-11e4-a52e-4f735466cecf'];
}
async function click(css) {
  const el = await find(css);
  await req('POST', `${E(el)}/click`, {});
}
async function exec(script, args = []) {
  const r = await req('POST', `/session/${sid}/execute/sync`, { script, args });
  return V(r);
}
const count = css => exec(`return document.querySelectorAll(arguments[0]).length`, [css]);
const statusText = () => exec(`return document.querySelector('.save-status-indicator')?.textContent || ''`);

async function waitFor(fn, desc, timeout = 20000, interval = 200) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {
      /* retry */
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`Timeout waiting for: ${desc}`);
}

try {
  await req('POST', `/session/${sid}/timeouts`, { implicit: 0, pageLoad: 60000, script: 30000 });
  await req('POST', `/session/${sid}/url`, { url: APP });
  await waitFor(() => count('.dashboard-container'), 'dashboard');

  await click('.create-project-btn');
  await waitFor(() => count('.modal-input'), 'create modal');
  await exec(
    `const input = document.querySelector('.modal-input'); const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; setter.call(input, arguments[0]); input.dispatchEvent(new Event('input', { bubbles: true }));`,
    [PROJECT_NAME]
  );
  await click('.btn-modal-submit');
  await waitFor(() => count('.top-toolbar'), 'editor');
  await waitFor(async () => (await statusText()).includes('Saved'), 'initial save');

  const hash = await exec('return window.location.hash');
  const projectId = hash.replace('#project=', '');
  const editorUrl = `${APP}${hash}`;

  const before = await count('.canvas-el-wrapper');

  // Add an element and reload immediately: the 1200ms autosave debounce has not fired yet.
  await click('.element-card');
  await waitFor(async () => (await count('.canvas-el-wrapper')) === before + 1, 'palette add');

  await req('POST', `/session/${sid}/url`, { url: editorUrl });
  await waitFor(() => count('.top-toolbar'), 'editor after reload');

  const afterReload = await count('.canvas-el-wrapper');
  check(
    'Unsaved edits survive an immediate reload (crash buffer)',
    afterReload === before + 1,
    `expected ${before + 1}, got ${afterReload}`
  );

  // The recovered snapshot must be persisted by the autosave retry.
  await waitFor(async () => (await statusText()).includes('Saved'), 'recovered snapshot saved');
  const bufferCleared = await waitFor(
    () =>
      exec(`return localStorage.getItem('sitebuilder_pending_' + arguments[0]) === null`, [projectId]),
    'crash buffer cleared',
    10000
  );
  check('Crash buffer is cleared after the recovered snapshot is saved', Boolean(bufferCleared));

  // Second reload: now the element must come from IndexedDB, not the buffer.
  await req('POST', `/session/${sid}/url`, { url: editorUrl });
  await waitFor(() => count('.top-toolbar'), 'editor after second reload');
  const persisted = await count('.canvas-el-wrapper');
  check('Recovered edits are persisted in IndexedDB', persisted === before + 1, `got ${persisted}`);
} catch (error) {
  check('Crash recovery E2E completed without fatal error', false, error.message);
  console.error(error);
} finally {
  try {
    await req('DELETE', `/session/${sid}`);
  } catch {
    /* ignore */
  }
}

const passed = results.filter(r => r.ok).length;
console.log(`\nCRASH RECOVERY E2E: ${passed}/${results.length} checks passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
