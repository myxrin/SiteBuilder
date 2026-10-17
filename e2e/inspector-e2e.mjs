/**
 * Inspector E2E: rename, mobile viewport overrides, reset overrides, persistence.
 */
const WD = 'http://127.0.0.1:4444';
const APP = 'http://127.0.0.1:4173/';
const PROJECT_NAME = 'Inspector Audit Site';
const NEW_NAME = 'Hero Heading Renamed';

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

const setReactInput = (selectorJs, value) => exec(
  `const input = ${selectorJs};
   if (!input) return false;
   const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
   setter.call(input, arguments[0]);
   input.dispatchEvent(new Event('input', { bubbles: true }));
   input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
   return true;`,
  [value]
);

const headingWidth = () =>
  exec(`return document.querySelector('.canvas-el-wrapper[data-el-type="heading"]')?.style.width || ''`);

try {
  await req('POST', `/session/${sid}/timeouts`, { implicit: 0, pageLoad: 60000, script: 30000 });
  await req('POST', `/session/${sid}/url`, { url: APP });
  await waitFor(() => count('.dashboard-container'), 'dashboard');

  await click('.create-project-btn');
  await waitFor(() => count('.modal-input'), 'create modal');
  await setReactInput(`document.querySelector('.modal-input')`, PROJECT_NAME);
  await click('.btn-modal-submit');
  await waitFor(() => count('.top-toolbar'), 'editor');
  await waitFor(
    async () => (await textOf('.save-status-indicator')).includes('Saved'),
    'initial save'
  );

  // Select the heading and rename it through the inspector.
  const heading = await find('.canvas-el-wrapper[data-el-type="heading"]');
  await req('POST', `${E(heading)}/click`, {});
  await waitFor(() => count('input[placeholder="heading"]'), 'inspector content section');

  await setReactInput(`document.querySelector('input[placeholder="heading"]')`, NEW_NAME);
  await waitFor(async () => (await textOf('.element-selected-name')).includes(NEW_NAME), 'renamed badge');
  check('Inspector renames an element', true, NEW_NAME);

  // Switch to the mobile viewport and add an override.
  await click('button[title^="Mobile Viewport"]');
  await waitFor(async () => (await textOf('.viewport-editing-banner')).includes('mobile'), 'mobile banner');
  check('Mobile viewport override banner appears', true);

  await exec(
    `const header = [...document.querySelectorAll('.section-header-btn')].find(b => b.textContent.includes('Size & Box Sizing'));
     if (header && !header.parentElement.querySelector('.section-body')) header.click();
     return Boolean(header);`
  );
  await waitFor(
    () => exec(`return [...document.querySelectorAll('.inspector-container .prop-col label')].some(l => l.textContent.trim() === 'Width')`),
    'size section to open'
  );

  const widthSet = await exec(
    `const cols = [...document.querySelectorAll('.inspector-container .prop-col')];
     const col = cols.find(c => c.querySelector('label')?.textContent.trim() === 'Width');
     if (!col) return false;
     const input = col.querySelector('input');
     if (!input) return false;
     const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
     setter.call(input, arguments[0]);
     input.dispatchEvent(new Event('input', { bubbles: true }));
     input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
     return true;`,
    ['300px']
  );
  check('Width override input found in mobile viewport', Boolean(widthSet));

  await waitFor(async () => (await headingWidth()) === '300px', 'mobile width override applied');
  check('Mobile width override applies to the canvas element', true);

  // Reset overrides via the banner button.
  await waitFor(() => count('.banner-reset-btn'), 'reset overrides button');
  await click('.banner-reset-btn');
  await waitFor(async () => (await headingWidth()) !== '300px', 'override reset');
  check('Reset viewport overrides clears the mobile width', true);

  // Back to desktop: the desktop styles were never touched.
  await click('button[title^="Desktop Viewport"]');
  await waitFor(async () => (await headingWidth()) === '', 'desktop width clean');
  check('Desktop styles remain untouched by mobile overrides', true);

  // Rename + no pending overrides must persist across a reload.
  await waitFor(
    async () => (await textOf('.save-status-indicator')).includes('Saved'),
    'autosave after inspector edits'
  );
  await req('POST', `/session/${sid}/url`, { url: `${APP}${await exec('return window.location.hash')}` });
  await waitFor(() => count('.top-toolbar'), 'editor after reload');
  const headingEl = await find('.canvas-el-wrapper[data-el-type="heading"]');
  await req('POST', `${E(headingEl)}/click`, {});
  await waitFor(async () => (await textOf('.element-selected-name')).includes(NEW_NAME), 'rename persisted');
  check('Inspector rename persists across reload', true);
} catch (error) {
  check('Inspector E2E completed without fatal error', false, error.message);
  console.error(error);
} finally {
  try {
    await req('DELETE', `/session/${sid}`);
  } catch {
    /* ignore */
  }
}

const passed = results.filter(r => r.ok).length;
console.log(`\nINSPECTOR E2E: ${passed}/${results.length} checks passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
