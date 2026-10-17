/**
 * End-to-end smoke test for SiteBuilder using Firefox + geckodriver (raw WebDriver).
 *
 * Verifies the real app in a real browser:
 *  - dashboard renders, project creation
 *  - editor loads, palette add, undo/redo, inspector delete
 *  - autosave reaches "Saved"
 *  - Export ZIP downloads a real file
 *  - Export Project downloads a .sitebuilder.json
 *  - project persists across reload
 *  - project file re-import opens the editor
 */
import fs from 'fs';
import path from 'path';

const WD = 'http://127.0.0.1:4444';
const APP = 'http://127.0.0.1:4173/';
const DOWNLOADS = (new URL('./downloads', import.meta.url).pathname);
const PROJECT_NAME = 'E2E Audit Site';

fs.rmSync(DOWNLOADS, { recursive: true, force: true });
fs.mkdirSync(DOWNLOADS, { recursive: true });

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
        args: ['-headless'],
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
async function type(css, text) {
  const el = await find(css);
  await req('POST', `${E(el)}/value`, { text });
}
async function exec(script, args = []) {
  const r = await req('POST', `/session/${sid}/execute/sync`, { script, args });
  return V(r);
}
const count = css => exec(`return document.querySelectorAll(arguments[0]).length`, [css]);
const textOf = css => exec(`return document.querySelector(arguments[0])?.textContent || ''`, [css]);

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

const waitStatus = async expected =>
  waitFor(async () => (await textOf('.save-status-indicator')).includes(expected), `save status "${expected}"`);

const waitDownload = async ext =>
  waitFor(() => {
    const files = fs.readdirSync(DOWNLOADS).filter(f => f.endsWith(ext) && !f.endsWith('.part'));
    if (files.length === 0) return null;
    const file = files[0];
    const full = path.join(DOWNLOADS, file);
    const size = fs.statSync(full).size;
    return size > 500 ? full : null;
  }, `download ${ext}`);

try {
  await req('POST', `/session/${sid}/timeouts`, { implicit: 0, pageLoad: 60000, script: 30000 });
  await req('POST', `/session/${sid}/url`, { url: APP });
  await waitFor(() => count('.dashboard-container'), 'dashboard to render');
  check('Dashboard renders', true);

  check('Import Project button present', (await count('.import-project-btn')) === 1);

  // --- Create a project ---
  await click('.create-project-btn');
  await waitFor(() => count('.modal-input'), 'create modal');
  await type('.modal-input', PROJECT_NAME);
  await click('.btn-modal-submit');
  await waitFor(() => count('.top-toolbar'), 'editor toolbar');
  check('Project created and editor opens', true);

  const initialElements = await count('.canvas-el-wrapper');
  check('Canvas renders starter elements', initialElements > 0, `elements=${initialElements}`);

  await waitStatus('Saved');

  // --- Add element from palette ---
  await click('.element-card');
  await waitFor(async () => (await count('.canvas-el-wrapper')) > initialElements, 'palette add');
  const afterAdd = await count('.canvas-el-wrapper');
  check('Palette adds an element', afterAdd === initialElements + 1, `${initialElements} -> ${afterAdd}`);

  // --- Undo / redo ---
  await click('button[title^="Undo"]');
  await waitFor(async () => (await count('.canvas-el-wrapper')) === initialElements, 'undo');
  check('Undo removes the added element', true);

  await click('button[title^="Redo"]');
  await waitFor(async () => (await count('.canvas-el-wrapper')) === afterAdd, 'redo');
  check('Redo restores the added element', true);

  // --- Autosave after edits ---
  await waitStatus('Saved');
  check('Autosave reaches "Saved" after edits', true);

  // --- Inspector delete + undo ---
  const headingCount = await count('.canvas-el-wrapper[data-el-type="heading"]');
  if (headingCount > 0) {
    const headingEl = await find('.canvas-el-wrapper[data-el-type="heading"]');
    await req('POST', `${E(headingEl)}/click`, {});
    await waitFor(async () => !(await exec(`return document.querySelector('.inspector-container')?.classList.contains('empty')`)), 'inspector');
    await click('button[title="Delete element"]');
    await waitFor(async () => (await count('.canvas-el-wrapper[data-el-type="heading"]')) === headingCount - 1, 'inspector delete');
    check('Inspector delete removes element', true);

    await click('button[title^="Undo"]');
    await waitFor(async () => (await count('.canvas-el-wrapper[data-el-type="heading"]')) === headingCount, 'delete undo');
    check('Undo restores deleted element', true);
  } else {
    check('Inspector delete removes element', false, 'no heading found');
  }

  // --- Export ZIP ---
  await click('.export-btn');
  const zipPath = await waitDownload('.zip');
  check('Export ZIP downloads a file', Boolean(zipPath), path.basename(zipPath || ''));

  // --- Export Project file ---
  await click('.project-export-btn');
  const projectFilePath = await waitDownload('.json');
  check('Export Project downloads a file', Boolean(projectFilePath), path.basename(projectFilePath || ''));

  if (projectFilePath) {
    const payload = JSON.parse(fs.readFileSync(projectFilePath, 'utf8'));
    check(
      'Project file uses the versioned envelope',
      payload.format === 'sitebuilder-project' && payload.version === 1 && Boolean(payload.project),
      `format=${payload.format} version=${payload.version}`
    );
  }

  // --- Persistence across reload ---
  await req('POST', `/session/${sid}/url`, { url: APP });
  await waitFor(() => count('.dashboard-container'), 'dashboard after reload');
  const projectVisible = await waitFor(
    () =>
      exec(
        `return [...document.querySelectorAll('.p-title')].some(el => el.textContent.includes(arguments[0]))`,
        [PROJECT_NAME]
      ),
    'project card after reload',
    10000
  );
  check('Project persists across reload (autosave)', Boolean(projectVisible));

  // --- Import the exported project file ---
  await exec(
    `document.querySelector('.dashboard-header-actions input[type="file"]').style.display = 'block'`
  );
  const fileInput = await find('.dashboard-header-actions input[type="file"]');
  await req('POST', `${E(fileInput)}/value`, { text: projectFilePath });
  const opened = await waitFor(async () => {
    if (await count('.top-toolbar')) return 'direct';
    if (await count('.import-detail-list, .modal-desc')) return 'modal';
    return null;
  }, 'import result', 15000);
  if (opened === 'modal') {
    await click('.btn-modal-submit');
    await waitFor(() => count('.top-toolbar'), 'editor after import');
  }
  check('Exported project file can be re-imported', true, opened);

  const importedName = await textOf('.project-name-btn');
  check('Imported project is opened in the editor', importedName.includes(PROJECT_NAME), importedName.trim());
} catch (error) {
  check('E2E run completed without fatal error', false, error.message);
  console.error(error);
} finally {
  try {
    await req('DELETE', `/session/${sid}`);
  } catch {
    /* ignore */
  }
}

const passed = results.filter(r => r.ok).length;
console.log(`\nE2E RESULT: ${passed}/${results.length} checks passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
