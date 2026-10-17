/**
 * Import E2E: broken files surface a clear error, legacy raw project JSON imports.
 */
const WD = 'http://127.0.0.1:4444';
const APP = 'http://127.0.0.1:4173/';

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
async function exec(script, args = []) {
  const r = await req('POST', `/session/${sid}/execute/sync`, { script, args });
  return V(r);
}
const count = css => exec(`return document.querySelectorAll(arguments[0]).length`, [css]);
const textOf = css => exec(`return document.querySelector(arguments[0])?.textContent || ''`, [css]);

async function waitFor(fn, desc, timeout = 15000, interval = 200) {
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

async function sendFile(filePath) {
  await exec(`document.querySelector('.dashboard-header-actions input[type="file"]').style.display = 'block'`);
  const input = await find('.dashboard-header-actions input[type="file"]');
  await req('POST', `${E(input)}/value`, { text: filePath });
}

try {
  await req('POST', `/session/${sid}/timeouts`, { implicit: 0, pageLoad: 60000, script: 30000 });
  await req('POST', `/session/${sid}/url`, { url: APP });
  await waitFor(() => count('.dashboard-container'), 'dashboard');

  // 1. Broken file -> error modal with a clear message.
  await sendFile(new URL('./fixtures/broken.sitebuilder.json', import.meta.url).pathname);
  await waitFor(() => count('.import-detail-list'), 'import failure modal');
  const failureText = await textOf('.modal-desc');
  check('Broken JSON shows an import error', /not valid JSON/i.test(failureText), failureText.trim());
  await exec(`document.querySelector('.btn-modal-submit').click()`);
  await waitFor(async () => (await count('.import-detail-list')) === 0, 'error modal closed');

  // 2. Legacy raw project JSON -> opens directly in the editor.
  await sendFile(new URL('./fixtures/legacy-project.json', import.meta.url).pathname);
  await waitFor(() => count('.top-toolbar'), 'editor after legacy import');
  const name = await textOf('.project-name-btn');
  check('Legacy raw project JSON imports and opens', name.includes('Legacy Import Site'), name.trim());

  const headingText = await exec(
    `return [...document.querySelectorAll('.canvas-el-wrapper[data-el-type="heading"]')].map(e => e.textContent).join('|')`
  );
  check('Legacy page content is present', headingText.includes('Legacy Heading'), headingText.slice(0, 60));
} catch (error) {
  check('Import E2E completed without fatal error', false, error.message);
  console.error(error);
} finally {
  try {
    await req('DELETE', `/session/${sid}`);
  } catch {
    /* ignore */
  }
}

const passed = results.filter(r => r.ok).length;
console.log(`\nIMPORT E2E: ${passed}/${results.length} checks passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
