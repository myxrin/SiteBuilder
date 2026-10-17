/**
 * Pages manager E2E: add, duplicate, delete pages (deletePage now returns {ok,message}).
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

async function waitFor(fn, desc, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error(`Timeout waiting for: ${desc}`);
}

const setReactInput = (selectorJs, value) => exec(
  `const input = ${selectorJs};
   const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
   setter.call(input, arguments[0]);
   input.dispatchEvent(new Event('input', { bubbles: true }));
   input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
   return true;`,
  [value]
);

try {
  await req('POST', `/session/${sid}/timeouts`, { implicit: 0, pageLoad: 60000, script: 30000 });
  await req('POST', `/session/${sid}/url`, { url: APP });
  await waitFor(() => count('.dashboard-container'), 'dashboard');

  await click('.create-project-btn');
  await waitFor(() => count('.modal-input'), 'modal');
  await click('.btn-modal-submit');
  await waitFor(() => count('.top-toolbar'), 'editor');

  // Open the Pages sidebar tab (rail button labelled "Pages").
  await exec(
    `const btn = [...document.querySelectorAll('.rail-tab-btn')].find(b => b.textContent.trim() === 'Pages');
     btn.click();`
  );
  await waitFor(() => count('.pages-manager'), 'pages manager');

  const initialPages = await count('.page-card');
  check('Pages manager lists starter pages', initialPages >= 2, `pages=${initialPages}`);

  // Add a page.
  await click('.add-page-btn');
  await waitFor(() => count('.add-page-card'), 'add page form');
  await setReactInput(`document.querySelector('.add-page-card input[placeholder^="Page Name"]')`, 'Services');
  await setReactInput(`document.querySelector('.add-page-card input[placeholder^="Route Slug"]')`, '/services');
  await exec(`document.querySelector('.add-page-card .btn-save').click()`);
  await waitFor(async () => (await count('.page-card')) === initialPages + 1, 'page added');
  check('Add page works', true);

  // Duplicate the new page.
  const duplicated = await exec(
    `const cards = [...document.querySelectorAll('.page-card')];
     const card = cards.find(c => c.textContent.includes('Services'));
     card.querySelector('button[title="Duplicate Page"]').click();
     return true;`
  );
  await waitFor(async () => (await count('.page-card')) === initialPages + 2, 'page duplicated');
  check('Duplicate page works', Boolean(duplicated));

  // Delete the duplicate (dialog auto-accepted below).
  const deleted = await exec(
    `window.confirm = () => true;
     const cards = [...document.querySelectorAll('.page-card')];
     const card = cards.find(c => c.textContent.includes('Services') && c.textContent.includes('Copy'));
     const btn = card?.querySelector('button[title="Delete Page"]');
     if (!btn) return false;
     btn.click();
     return true;`
  );
  await waitFor(async () => (await count('.page-card')) === initialPages + 1, 'page deleted');
  check('Delete page works and removes the card', Boolean(deleted));

  // The remaining pages must still render in the top toolbar switcher.
  const pageCountText = await textOf('.page-switcher-dropdown .page-select-trigger');
  check('Editor still functional after page delete', pageCountText.length > 0, pageCountText.trim());
} catch (error) {
  check('Pages E2E completed without fatal error', false, error.message);
  console.error(error);
} finally {
  try {
    await req('DELETE', `/session/${sid}`);
  } catch {}
}

const passed = results.filter(r => r.ok).length;
console.log(`\nPAGES E2E: ${passed}/${results.length} checks passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
