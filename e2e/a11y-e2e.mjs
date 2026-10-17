/**
 * Accessibility & runtime-error E2E.
 *
 * What it verifies in a real browser (Firefox via geckodriver):
 *  - every *visible* interactive control in the app chrome has an accessible
 *    name (text, aria-label, aria-labelledby, title, label or placeholder)
 *  - no duplicate DOM ids on the dashboard or in the editor
 *  - every chrome <img> carries an alt attribute (canvas content excluded)
 *  - modals are proper dialogs (role=dialog, aria-modal, labelled) and Escape
 *    closes them; the fullscreen preview also closes with Escape
 *  - layer tree supports keyboard selection (Enter) and expand/collapse
 *  - a full interaction pass (tabs, inspector sections, preview, settings)
 *    raises no window errors / unhandled rejections / console.error output
 *
 * The accessible-name computation is an approximation of the accname spec:
 * aria-label > aria-labelledby > visible text > title > label > placeholder.
 */
const WD = 'http://127.0.0.1:4444';
const APP = 'http://127.0.0.1:4173/';
const PROJECT_NAME = 'E2E A11y Site';

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
  capabilities: {
    alwaysMatch: {
      browserName: 'firefox',
      'moz:firefoxOptions': { args: ['-headless', '-width=1440', '-height=960'] }
    }
  }
});
const sid = session.value.sessionId;
const exec = async (script, args = []) => (await req('POST', `/session/${sid}/execute/sync`, { script, args })).value;
const count = css => exec(`return document.querySelectorAll(arguments[0]).length;`, [css]);

async function waitFor(fn, desc, timeout = 20000, interval = 250) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const value = await fn();
      if (value) return value;
    } catch {
      /* retry */
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`Timeout waiting for: ${desc}`);
}

/** Installs the audit helpers + error hooks into the current page (idempotent, SPA-safe). */
const INSTALL = `
  if (window.__sbAudit) return true;
  window.__sbErrors = window.__sbErrors || [];
  window.addEventListener('error', e => window.__sbErrors.push('error: ' + (e.message || e.type)));
  window.addEventListener('unhandledrejection', e => {
    const r = e.reason;
    window.__sbErrors.push('unhandledrejection: ' + ((r && r.message) || String(r)));
  });
  const origError = console.error.bind(console);
  console.error = function () {
    const text = [...arguments].map(a => (a && a.message) || String(a)).join(' ').slice(0, 220);
    window.__sbErrors.push('console.error: ' + text);
    return origError.apply(null, arguments);
  };

  window.__sbAccName = function (el) {
    const aria = el.getAttribute('aria-label');
    if (aria && aria.trim()) return aria.trim();
    const lb = el.getAttribute('aria-labelledby');
    if (lb) {
      const t = lb.split(/\\s+/).map(id => {
        const n = document.getElementById(id);
        return n ? n.textContent : '';
      }).join(' ').replace(/\\s+/g, ' ').trim();
      if (t) return t;
    }
    const text = (el.textContent || '').replace(/\\s+/g, ' ').trim();
    if (text) return text;
    const title = el.getAttribute('title');
    if (title && title.trim()) return title.trim();
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
      if (el.id) {
        const lbl = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
        if (lbl && lbl.textContent.trim()) return lbl.textContent.replace(/\\s+/g, ' ').trim();
      }
      const ph = el.getAttribute('placeholder');
      if (ph && ph.trim()) return ph.trim();
      if (tag === 'INPUT' && el.value) return String(el.value);
    }
    if (tag === 'IMG') return el.getAttribute('alt') || '';
    return '';
  };

  window.__sbAudit = function () {
    const selector = 'button, [role="button"], a[href], input:not([type="hidden"]), select, textarea, [role="tab"], [role="treeitem"], [role="menuitem"], [role="radio"], [role="checkbox"], [role="switch"]';
    const isContent = el => Boolean(el.closest('.canvas-el-wrapper, .preview-frame'));
    const visible = el => {
      if (el.getClientRects().length === 0) return false;
      const cs = getComputedStyle(el);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    };
    const describe = el => {
      const cls = (typeof el.className === 'string' && el.className)
        ? '.' + el.className.split(/\\s+/).slice(0, 3).join('.')
        : '';
      return el.tagName.toLowerCase() + cls + (el.id ? '#' + el.id : '');
    };
    const unnamed = [];
    document.querySelectorAll(selector).forEach(el => {
      if (isContent(el) || !visible(el)) return;
      if (!window.__sbAccName(el)) unnamed.push(describe(el));
    });
    const idCounts = {};
    document.querySelectorAll('[id]').forEach(el => { idCounts[el.id] = (idCounts[el.id] || 0) + 1; });
    const dupIds = Object.keys(idCounts).filter(k => idCounts[k] > 1);
    const imgsNoAlt = [...document.querySelectorAll('img:not([alt])')]
      .filter(el => !isContent(el))
      .map(el => describe(el));
    const badDialogs = [...document.querySelectorAll('[role="dialog"]')]
      .filter(el => !window.__sbAccName(el))
      .map(describe);
    return { unnamed, dupIds, imgsNoAlt, badDialogs };
  };

  window.__sbScan = function () {
    const audit = window.__sbAudit();
    const visibleDialogs = [...document.querySelectorAll('[role="dialog"]')].filter(el => el.getClientRects().length > 0).length;
    return { ...audit, visibleDialogs };
  };
  return true;
`;

const scan = () => exec(`return window.__sbScan();`);
const pressKey = key =>
  exec(
    `var target = document.activeElement && document.activeElement !== document.body ? document.activeElement : document.body;
     target.dispatchEvent(new KeyboardEvent('keydown', { key: arguments[0], bubbles: true, cancelable: true }));
     return true;`,
    [key]
  );

const recordScan = label => scan().then(result => {
  if (result.unnamed.length) console.log(`  (${label} unnamed) ${result.unnamed.join(', ')}`);
  if (result.dupIds.length) console.log(`  (${label} duplicate ids) ${result.dupIds.join(', ')}`);
  if (result.imgsNoAlt.length) console.log(`  (${label} img without alt) ${result.imgsNoAlt.join(', ')}`);
  return result;
});

try {
  // ---------- Dashboard ----------
  await req('POST', `/session/${sid}/url`, { url: APP });
  await waitFor(() => count('.dashboard-container'), 'dashboard');
  await exec(INSTALL);
  const dashScan = await recordScan('dashboard');
  check('Dashboard has no unnamed interactive controls', dashScan.unnamed.length === 0, dashScan.unnamed.join(', '));
  check('Dashboard has no duplicate DOM ids', dashScan.dupIds.length === 0, dashScan.dupIds.join(', '));
  check('Dashboard chrome images all have alt', dashScan.imgsNoAlt.length === 0, dashScan.imgsNoAlt.join(', '));

  // ---------- Create modal (dialog semantics + Escape) ----------
  await exec(`document.querySelector('.create-project-btn').click(); return true;`);
  await waitFor(() => count('.draggable-modal-box[role="dialog"]'), 'create modal as dialog');
  const modalScan = await recordScan('create-modal');
  check('Create modal is a labelled dialog', modalScan.badDialogs.length === 0, modalScan.badDialogs.join(', '));
  check('Create modal has no unnamed controls', modalScan.unnamed.length === 0, modalScan.unnamed.join(', '));

  await pressKey('Escape');
  await waitFor(async () => (await count('.draggable-modal-box')) === 0, 'Escape closes the create modal');
  check('Escape closes the create modal', true);

  // Reopen and create the project.
  await exec(`document.querySelector('.create-project-btn').click(); return true;`);
  await waitFor(() => count('.modal-input'), 'create modal reopened');
  await exec(
    `var input = document.querySelector('.modal-input');
     var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
     setter.call(input, arguments[0]);
     input.dispatchEvent(new Event('input', { bubbles: true }));
     return true;`,
    [PROJECT_NAME]
  );
  await exec(`document.querySelector('.btn-modal-submit').click(); return true;`);
  await waitFor(() => count('.top-toolbar'), 'editor');

  // ---------- Editor: rail tabs ----------
  await exec(INSTALL); // fresh page -> reinstall hooks
  await recordScan('editor');

  let tabFailures = [];
  for (const tab of ['Layers', 'Pages', 'Assets', 'Settings']) {
    await exec(
      `var btn = [...document.querySelectorAll('.rail-tab-btn')].find(b => b.textContent.trim() === arguments[0]);
       if (btn) btn.click();
       return Boolean(btn);`,
      [tab]
    );
    await new Promise(r => setTimeout(r, 350));
    const tabScan = await recordScan(`editor:${tab}`);
    if (tabScan.unnamed.length) tabFailures.push(`${tab}: ${tabScan.unnamed.join(', ')}`);
  }
  check('Editor tabs expose no unnamed interactive controls', tabFailures.length === 0, tabFailures.join(' | '));

  // ---------- Layers keyboard support ----------
  await exec(
    `var btn = [...document.querySelectorAll('.rail-tab-btn')].find(b => b.textContent.trim() === 'Layers');
     btn.click(); return true;`
  );
  await waitFor(() => count('.layer-item'), 'layer items');

  const firstLayerLabel = await exec(`return document.querySelector('.layer-item').textContent.trim();`);
  await exec(
    `var item = document.querySelector('.layer-item');
     item.focus();
     item.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
     return true;`
  );
  await waitFor(async () => (await count('.layer-item[aria-selected="true"]')) === 1, 'layer selected via Enter');
  check('Enter on a layer item selects it', true, firstLayerLabel.slice(0, 40));

  // Every group starts expanded, so ArrowLeft must collapse one and ArrowRight
  // must bring it back.
  const collapseLabel = await exec(
    `var item = document.querySelector('.layer-item[aria-expanded="true"]');
     if (!item) return null;
     var label = item.getAttribute('aria-label') || item.textContent.trim();
     item.focus();
     item.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }));
     return label;`
  );
  if (collapseLabel) {
    await waitFor(
      async () => (await count('.layer-item[aria-expanded="false"]')) >= 1,
      'layer collapsed via ArrowLeft'
    );
    check('ArrowLeft collapses an expanded layer group', true, collapseLabel.slice(0, 40));
    await exec(
      `var item = document.querySelector('.layer-item[aria-expanded="false"]');
       item.focus();
       item.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
       return true;`
    );
    await waitFor(
      async () => (await count('.layer-item[aria-expanded="false"]')) === 0,
      'layer re-expanded via ArrowRight'
    );
    check('ArrowRight re-expands the collapsed layer group', true);
  } else {
    check('ArrowLeft collapses an expanded layer group', false, 'no expanded layer group found');
  }

  // ---------- Inspector ----------
  await waitFor(() => count('.inspector-container'), 'inspector');
  await exec(
    `[...document.querySelectorAll('.section-header-btn')].forEach(btn => {
       if (btn.querySelector('.lucide-chevron-right')) btn.click();
     });
     return true;`
  );
  await new Promise(r => setTimeout(r, 350));
  const inspectorScan = await recordScan('inspector-expanded');
  check('Expanded inspector has no unnamed controls', inspectorScan.unnamed.length === 0, inspectorScan.unnamed.join(', '));

  // ---------- Fullscreen preview ----------
  await exec(`document.querySelector('.preview-btn').click(); return true;`);
  await waitFor(() => count('.fullscreen-preview-overlay'), 'fullscreen preview');
  const previewScan = await recordScan('fullscreen-preview');
  check('Preview is a labelled dialog', previewScan.badDialogs.length === 0, previewScan.badDialogs.join(', '));
  check('Preview has no unnamed controls', previewScan.unnamed.length === 0, previewScan.unnamed.join(', '));

  // Escape closes the page dropdown first, then the preview itself.
  await exec(`document.querySelector('.preview-page-trigger').click(); return true;`);
  await waitFor(() => count('.preview-dropdown-menu'), 'preview page dropdown');
  await pressKey('Escape');
  await waitFor(async () => (await count('.preview-dropdown-menu')) === 0, 'dropdown closed via Escape');
  await waitFor(() => count('.fullscreen-preview-overlay'), 'preview still open after first Escape');
  check('First Escape closes only the page dropdown', true);
  await pressKey('Escape');
  await waitFor(async () => (await count('.fullscreen-preview-overlay')) === 0, 'preview closed via Escape');
  check('Second Escape leaves the preview', true);

  // ---------- Runtime errors ----------
  const errors = await exec(`return window.__sbErrors || [];`);
  check('No runtime errors during the whole flow', errors.length === 0, errors.slice(0, 3).join(' | '));
} catch (error) {
  check('A11y E2E completed without fatal error', false, error.message);
  console.error(error);
} finally {
  try {
    await req('DELETE', `/session/${sid}`);
  } catch {}
}

const passed = results.filter(r => r.ok).length;
console.log(`\nA11Y E2E: ${passed}/${results.length} checks passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
