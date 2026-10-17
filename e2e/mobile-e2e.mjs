/**
 * Mobile / responsive E2E checks.
 *
 * Firefox headless refuses to render windows narrower than ~500 CSS px, so the
 * app is loaded inside a same-origin iframe whose width is set to each target
 * mobile width (320/360/375/390/414/430). Media queries and layout inside the
 * iframe see the iframe width, which makes real measurements possible.
 *
 * Verifies:
 *  - no horizontal overflow on the dashboard or editor at any mobile width
 *  - dashboard header actions stay reachable
 *  - the project list scrolls instead of being clipped
 *  - the editor toolbar actions stay reachable through the overflow menu
 *  - exporting a ZIP works from the mobile overflow menu
 *  - the mobile bottom bar / drawers work and Escape closes the drawer
 *  - bottom-bar touch targets are at least 44x44 CSS px
 *
 * Requires: `npm run build` (default base) + preview on 4173, geckodriver on 4444.
 */
import fs from 'fs';
import path from 'path';

const WD = 'http://127.0.0.1:4444';
const APP = 'http://127.0.0.1:4173/';
const DIST = new URL('../dist/', import.meta.url).pathname;
const HARNESS = path.join(DIST, '__mobile-harness.html');
const DOWNLOADS = new URL('./downloads-mobile', import.meta.url).pathname;
const WIDTHS = [320, 360, 375, 390, 414, 430];

fs.rmSync(DOWNLOADS, { recursive: true, force: true });
fs.mkdirSync(DOWNLOADS, { recursive: true });

// Same-origin harness: an iframe sized to the requested mobile width.
fs.writeFileSync(
  HARNESS,
  `<!doctype html>
<html><head><meta charset="utf-8"><title>Mobile harness</title>
<style>html,body{margin:0;padding:0}iframe{border:0;display:block}</style></head>
<body>
<iframe id="mb-frame" src="/" style="width:320px;height:900px"></iframe>
<script>
  var params = new URLSearchParams(location.search);
  var w = Number(params.get('w') || 320);
  var frame = document.getElementById('mb-frame');
  frame.style.width = w + 'px';
  frame.style.height = '900px';
  window.__harnessLoaded = false;
  frame.addEventListener('load', function () { window.__harnessLoaded = true; });
</script>
</body></html>`
);

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
      'moz:firefoxOptions': {
        // Firefox enforces a ~500px minimum window width; the iframe does the rest.
        args: ['-headless', '-width=560', '-height=1000'],
        prefs: {
          'browser.download.folderList': 2,
          'browser.download.dir': DOWNLOADS,
          'browser.download.useDownloadDir': true,
          'browser.helperApps.neverAsk.saveToDisk':
            'application/zip,application/json,application/octet-stream,application/x-zip-compressed',
          'browser.download.manager.showWhenStarting': false
        }
      }
    }
  }
});

const sid = session.value.sessionId;
const V = r => r.value;

async function exec(script, args = []) {
  const r = await req('POST', `/session/${sid}/execute/sync`, { script, args });
  return V(r);
}

async function waitFor(fn, desc, timeout = 20000, interval = 250) {
  const start = Date.now();
  let last;
  while (Date.now() - start < timeout) {
    try {
      last = await fn();
      if (last) return last;
    } catch {
      /* retry */
    }
    await new Promise(r => setTimeout(r, interval));
  }
  throw new Error(`Timeout waiting for: ${desc}`);
}

const frameDoc = 'var d = document.getElementById("mb-frame").contentDocument;';

const setWidth = w => exec(`${frameDoc} return true;`, []).then(() =>
  exec(`document.getElementById('mb-frame').style.width = arguments[0] + 'px'; return true;`, [w])
);

/** Runs a measure expression inside the iframe document. */
async function measure(expr) {
  return exec(`${frameDoc} ${expr}`, []);
}

const waitInFrame = (expr, desc, timeout = 15000) =>
  waitFor(() => measure(`return (${expr});`), `in-frame: ${desc}`, timeout);

const inFrameClick = sel =>
  exec(`${frameDoc} var el = d.querySelector(arguments[0]); if (!el) return false; el.click(); return true;`, [sel]);

const waitDownload = async ext =>
  waitFor(() => {
    const files = fs.readdirSync(DOWNLOADS).filter(f => f.endsWith(ext) && !f.endsWith('.part'));
    if (files.length === 0) return null;
    const full = path.join(DOWNLOADS, files[0]);
    return fs.statSync(full).size > 500 ? full : null;
  }, `download ${ext}`);

try {
  await req('POST', `/session/${sid}/timeouts`, { implicit: 0, pageLoad: 60000, script: 30000 });

  // ---------- Dashboard responsiveness ----------
  await req('POST', `/session/${sid}/url`, { url: APP + '__mobile-harness.html?w=320' });
  await waitFor(() => exec(`return window.__harnessLoaded === true;`), 'harness iframe loaded');
  await waitInFrame(`!!d.querySelector('.dashboard-container')`, 'dashboard inside frame');

  const dashboardOverflows = [];
  const headerClipped = [];
  for (const w of WIDTHS) {
    await setWidth(w);
    await new Promise(r => setTimeout(r, 150));
    const metrics = await measure(`return {
      innerWidth: d.defaultView.innerWidth,
      scrollWidth: d.documentElement.scrollWidth,
      importRight: (d.querySelector('.import-project-btn') || {}).getBoundingClientRect ? d.querySelector('.import-project-btn').getBoundingClientRect().right : -1,
      createRight: (d.querySelector('.create-project-btn') || {}).getBoundingClientRect ? d.querySelector('.create-project-btn').getBoundingClientRect().right : -1
    };`);
    if (metrics.scrollWidth > metrics.innerWidth + 2) dashboardOverflows.push(`${w}px(sw=${metrics.scrollWidth})`);
    if (metrics.importRight > metrics.innerWidth + 1 || metrics.createRight > metrics.innerWidth + 1) {
      headerClipped.push(`${w}px(import=${Math.round(metrics.importRight)},create=${Math.round(metrics.createRight)})`);
    }
  }
  check(
    'Dashboard has no horizontal overflow at 320-430px',
    dashboardOverflows.length === 0,
    dashboardOverflows.join(', ')
  );
  check(
    'Dashboard header actions stay inside the viewport',
    headerClipped.length === 0,
    headerClipped.join(', ')
  );

  // ---------- Dashboard scrolling with many projects ----------
  await setWidth(320);
  await waitInFrame(`!!d.querySelector('.create-project-btn')`, 'create button');
  for (let i = 0; i < 4; i++) {
    await inFrameClick('.create-project-btn');
    await waitInFrame(`!!d.querySelector('.modal-input')`, 'create modal');
    await exec(
      `${frameDoc} var input = d.querySelector('.modal-input');
       var setter = Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype, 'value').set;
       setter.call(input, 'Mobile Project ' + arguments[0]);
       input.dispatchEvent(new Event('input', { bubbles: true }));
       return true;`,
      [i + 1]
    );
    await inFrameClick('.btn-modal-submit');
    await waitInFrame(`!!d.querySelector('.top-toolbar')`, 'editor open');
    // Back to dashboard (hash navigation).
    await exec(`${frameDoc} d.defaultView.location.hash = ''; return true;`);
    await waitInFrame(`!!d.querySelector('.dashboard-container')`, 'dashboard again');
  }

  const scrollInfo = await measure(`var el = d.querySelector('.dashboard-container');
    var before = el.scrollTop; el.scrollTop = 100000; var after = el.scrollTop;
    var lastCard = d.querySelectorAll('.project-card'); var last = lastCard[lastCard.length - 1];
    var box = el.getBoundingClientRect(); var cardBox = last.getBoundingClientRect();
    return { before: before, after: after, cards: lastCard.length, lastVisible: cardBox.bottom <= box.bottom + 2 };`);
  check(
    'Project list scrolls (container is scrollable)',
    scrollInfo.after > scrollInfo.before && scrollInfo.after > 0,
    `scrollTop ${scrollInfo.before} -> ${scrollInfo.after}, cards=${scrollInfo.cards}`
  );
  check(
    'Last project card is reachable by scrolling',
    scrollInfo.lastVisible === true,
    `cards=${scrollInfo.cards}`
  );

  // ---------- Editor at mobile widths ----------
  await setWidth(375);
  await exec(`${frameDoc} var firstCard = d.querySelector('.project-card'); firstCard.click(); return true;`);
  await waitInFrame(`!!d.querySelector('.top-toolbar')`, 'editor toolbar at 375px');

  const editorOverflows = [];
  for (const w of WIDTHS) {
    await setWidth(w);
    await new Promise(r => setTimeout(r, 150));
    const metrics = await measure(`return {
      innerWidth: d.defaultView.innerWidth,
      scrollWidth: d.documentElement.scrollWidth
    };`);
    if (metrics.scrollWidth > metrics.innerWidth + 2) editorOverflows.push(`${w}px(sw=${metrics.scrollWidth})`);
  }
  check(
    'Editor has no horizontal overflow at 320-430px',
    editorOverflows.length === 0,
    editorOverflows.join(', ')
  );

  const toolbarInfo = await measure(`var right = d.querySelector('.toolbar-right');
    var trigger = d.querySelector('.overflow-trigger');
    var box = right.getBoundingClientRect();
    var tBox = trigger ? trigger.getBoundingClientRect() : null;
    return {
      innerWidth: d.defaultView.innerWidth,
      rightEdge: box.right,
      hasTrigger: Boolean(trigger && tBox),
      triggerVisible: Boolean(tBox && tBox.width > 0 && tBox.right <= d.defaultView.innerWidth + 1)
    };`);
  check(
    'Toolbar actions fit: overflow trigger is visible and inside the viewport',
    toolbarInfo.hasTrigger && toolbarInfo.triggerVisible,
    `rightEdge=${Math.round(toolbarInfo.rightEdge)} width=${toolbarInfo.innerWidth}`
  );

  // Open the overflow menu and verify the export actions are present + reachable.
  await inFrameClick('.overflow-trigger');
  await waitInFrame(`!!d.querySelector('.overflow-menu')`, 'overflow menu open');
  const menuInfo = await measure(`var menu = d.querySelector('.overflow-menu');
    var box = menu.getBoundingClientRect();
    var labels = [...menu.querySelectorAll('.overflow-item-label')].map(el => el.textContent.trim());
    return {
      labels: labels,
      insideRight: box.right <= d.defaultView.innerWidth + 1,
      insideLeft: box.left >= -1,
      width: box.width
    };`);
  check(
    'Overflow menu exposes Preview + both exports',
    menuInfo.labels.some(l => /preview/i.test(l)) &&
      menuInfo.labels.some(l => /project file/i.test(l)) &&
      menuInfo.labels.some(l => /zip/i.test(l)),
    menuInfo.labels.join(' | ')
  );
  check(
    'Overflow menu stays inside the viewport',
    menuInfo.insideRight && menuInfo.insideLeft,
    `width=${Math.round(menuInfo.width)}`
  );

  // Export ZIP from the mobile menu (the original clipping defect made this impossible).
  await exec(
    `${frameDoc} var items = [...d.querySelectorAll('.overflow-item')];
     var zip = items.find(el => /zip/i.test(el.textContent));
     if (!zip) return false;
     zip.click();
     return true;`
  );
  const mobileZip = await waitDownload('.zip');
  check('Export ZIP works from the mobile toolbar menu', Boolean(mobileZip), path.basename(mobileZip || ''));

  // ---------- Mobile bottom bar + drawers ----------
  await setWidth(375);
  await new Promise(r => setTimeout(r, 150));
  await waitInFrame(`getComputedStyle(d.querySelector('.mobile-bottom-bar')).display !== 'none'`, 'bottom bar visible');

  const tabMetrics = await measure(`var tabs = [...d.querySelectorAll('.mobile-tab-btn')];
    return tabs.map(el => { var b = el.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; });`);
  check(
    'Bottom-bar touch targets are at least 44x44',
    tabMetrics.length === 6 && tabMetrics.every(t => t.w >= 44 && t.h >= 44),
    tabMetrics.map(t => `${t.w}x${t.h}`).join(',')
  );

  await exec(
    `${frameDoc} var tabs = [...d.querySelectorAll('.mobile-tab-btn')];
     var pages = tabs.find(el => el.textContent.includes('Pages'));
     pages.click(); return true;`
  );
  await waitInFrame(`!!d.querySelector('.mobile-drawer-panel .pages-manager')`, 'pages drawer open');

  const drawerMetrics = await measure(`var panel = d.querySelector('.mobile-drawer-panel');
    return { width: Math.round(panel.getBoundingClientRect().width), inner: d.defaultView.innerWidth };`);
  check(
    'Drawer fits the mobile viewport',
    drawerMetrics.width <= drawerMetrics.inner + 1,
    `drawer=${drawerMetrics.width}px viewport=${drawerMetrics.inner}px`
  );

  // Duplicate-slug validation must surface inline (no native alert()).
  await inFrameClick('.add-page-btn');
  await waitInFrame(`!!d.querySelector('.add-page-card')`, 'add page form');
  await exec(
    `${frameDoc} var input = d.querySelector('.add-page-card input[placeholder^="Page Name"]');
     var setter = Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype, 'value').set;
     setter.call(input, 'Home');
     input.dispatchEvent(new Event('input', { bubbles: true }));
     return true;`
  );
  await exec(
    `${frameDoc} var slug = d.querySelector('.add-page-card input[placeholder^="Route Slug"]');
     var setter = Object.getOwnPropertyDescriptor(d.defaultView.HTMLInputElement.prototype, 'value').set;
     setter.call(slug, '/');
     slug.dispatchEvent(new Event('input', { bubbles: true }));
     d.querySelector('.add-page-card .btn-save').click();
     return true;`
  );
  await waitInFrame(`!!d.querySelector('.add-page-card .form-error')`, 'inline duplicate-slug error');
  const errorText = await measure(`return d.querySelector('.add-page-card .form-error').textContent.trim();`);
  check('Duplicate slug shows an inline error (no native alert)', errorText.includes('/'), errorText.slice(0, 60));

  // Escape closes the drawer (dispatched inside the frame; the app listens on its window).
  await exec(
    `${frameDoc}
     var evt = new d.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
     d.dispatchEvent(evt);
     return true;`
  );
  await new Promise(r => setTimeout(r, 300));
  const drawerClosed = await measure(`return !d.querySelector('.mobile-drawer-panel');`);
  check('Escape closes the mobile drawer', drawerClosed === true);

  // ---------- Canvas still usable ----------
  await setWidth(375);
  const canvasVisible = await measure(`var c = d.querySelector('.canvas-el-wrapper'); return Boolean(c && c.getBoundingClientRect().width > 0);`);
  check('Canvas remains visible and laid out at 375px', canvasVisible === true);

  // ---------- Mobile Element Selection & Quick Bar ----------
  await exec(
    `${frameDoc}
     var heading = d.querySelector('.canvas-el-wrapper[data-el-type="heading"]');
     if (heading) heading.click();
     return Boolean(heading);`
  );
  await waitInFrame(`!!d.querySelector('.mobile-selected-bar')`, 'mobile selected bar visible');
  const selBarInfo = await measure(`
    var bar = d.querySelector('.mobile-selected-bar');
    var box = bar.getBoundingClientRect();
    var inspectBtn = bar.querySelector('.mobile-act-btn.inspect');
    var delBtn = bar.querySelector('.mobile-act-btn.danger');
    return {
      visible: box.width > 0 && box.height > 0 && box.right <= d.defaultView.innerWidth + 2,
      hasInspect: Boolean(inspectBtn),
      hasDelete: Boolean(delBtn)
    };
  `);
  check('Mobile selected element bar appears and fits viewport', selBarInfo.visible && selBarInfo.hasInspect && selBarInfo.hasDelete);

  // Tapping Inspect in the selected bar opens the inspector drawer
  await inFrameClick('.mobile-selected-bar .mobile-act-btn.inspect');
  await waitInFrame(`!!d.querySelector('.mobile-drawer-panel .inspector-container')`, 'inspector drawer open via mobile-selected-bar');
  check('Tapping Inspect in mobile selected bar opens inspector drawer', true);

  // Close the drawer with Escape
  await exec(
    `${frameDoc}
     var evt = new d.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
     d.dispatchEvent(evt);
     return true;`
  );
  await new Promise(r => setTimeout(r, 200));

  // ---------- Palette Add Toast Feedback ----------
  await exec(
    `${frameDoc} var tabs = [...d.querySelectorAll('.mobile-tab-btn')];
     var addTab = tabs.find(el => el.textContent.includes('Add'));
     addTab.click(); return true;`
  );
  await waitInFrame(`!!d.querySelector('.elements-palette')`, 'palette open in drawer');
  await inFrameClick('.element-card');
  await waitInFrame(`!!d.querySelector('.palette-added-toast')`, 'added toast feedback');
  const toastText = await measure(`return d.querySelector('.palette-added-toast').textContent;`);
  check('Adding element in mobile palette shows instant confirmation toast', toastText.includes('Added'));

  // Close drawer
  await exec(
    `${frameDoc}
     var evt = new d.defaultView.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
     d.dispatchEvent(evt);
     return true;`
  );
} catch (error) {
  check('Mobile E2E completed without fatal error', false, error.message);
  console.error(error);
} finally {
  try {
    await req('DELETE', `/session/${sid}`);
  } catch {}
  fs.rmSync(HARNESS, { force: true });
}

const passed = results.filter(r => r.ok).length;
console.log(`\nMOBILE E2E: ${passed}/${results.length} checks passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
