/**
 * Firebase settings panel E2E.
 *
 * Verifies the settings UX end to end in a real browser:
 *  - Firebase box opens, validates required fields
 *  - pasting the Firebase console JSON fills every field, including the ones
 *    that used to be dropped (storageBucket / messagingSenderId)
 *  - invalid values surface inline (no native alerts)
 *  - config persists across a reload and is stored in the exported project file
 *  - the "Test API key" action really performs a network call and reports a result
 *
 * The live "is the provider enabled / is the domain authorized" part cannot be
 * verified here; that requires a real Firebase project in the user's account.
 */
import fs from 'fs';
import path from 'path';

const WD = 'http://127.0.0.1:4444';
const APP = 'http://127.0.0.1:4173/';
const DOWNLOADS = new URL('./downloads-settings', import.meta.url).pathname;
const PROJECT_NAME = 'E2E Settings Site';

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
        args: ['-headless', '-width=1400', '-height=950'],
        prefs: {
          'browser.download.folderList': 2,
          'browser.download.dir': DOWNLOADS,
          'browser.download.useDownloadDir': true,
          'browser.helperApps.neverAsk.saveToDisk': 'application/zip,application/json,application/octet-stream',
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

/** Sets a React-controlled input/textarea through the native value setter. */
const setReactField = (css, value) =>
  exec(
    `var el = document.querySelector(arguments[0]);
     if (!el) return false;
     var proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
     var setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
     setter.call(el, arguments[1]);
     el.dispatchEvent(new Event('input', { bubbles: true }));
     return true;`,
    [css, value]
  );

const waitDownload = async ext =>
  waitFor(() => {
    const files = fs.readdirSync(DOWNLOADS).filter(f => f.endsWith(ext) && !f.endsWith('.part'));
    if (files.length === 0) return null;
    const full = path.join(DOWNLOADS, files[0]);
    return fs.statSync(full).size > 500 ? full : null;
  }, `download ${ext}`);

const FIREBASE_SNIPPET = `{
  "apiKey": "AIzaSyE2ETESTKEY1234567890abcdefg",
  "authDomain": "e2e-settings.firebaseapp.com",
  "projectId": "e2e-settings-project",
  "storageBucket": "e2e-settings-project.appspot.com",
  "messagingSenderId": "123456789012",
  "appId": "1:123456789012:web:abcdef123456"
}`;

try {
  await req('POST', `/session/${sid}/timeouts`, { implicit: 0, pageLoad: 60000, script: 30000 });
  await req('POST', `/session/${sid}/url`, { url: APP });
  await waitFor(() => count('.dashboard-container'), 'dashboard');

  // Create a project and open the editor.
  await click('.create-project-btn');
  await waitFor(() => count('.modal-input'), 'create modal');
  await exec(
    `var input = document.querySelector('.modal-input');
     var setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
     setter.call(input, arguments[0]);
     input.dispatchEvent(new Event('input', { bubbles: true }));
     return true;`,
    [PROJECT_NAME]
  );
  await click('.btn-modal-submit');
  await waitFor(() => count('.top-toolbar'), 'editor');

  // Open Settings in the sidebar rail.
  await exec(
    `var btn = [...document.querySelectorAll('.rail-tab-btn')].find(b => b.textContent.trim() === 'Settings');
     if (!btn) return false;
     btn.click();
     return true;`
  );
  await waitFor(() => count('.project-settings-panel'), 'settings panel');

  // Firebase box starts collapsed and reports "Off".
  const initialState = await exec(`return document.querySelector('.firebase-box-header .fb-state').textContent.trim();`);
  check('Firebase box starts disabled', initialState === 'Off', initialState);

  await click('.firebase-box-header');
  await waitFor(() => count('#sb-fb-apiKey'), 'firebase fields');

  // Enabling without keys must show inline errors (no native alert / no crash).
  await exec(`document.querySelector('#sb-fb-enabled').click(); return true;`);
  await waitFor(async () => (await count('.firebase-box-body .field-error')) >= 2, 'required-field errors');
  const requiredErrors = await exec(
    `return [...document.querySelectorAll('.firebase-box-body .field-error')].map(el => el.textContent.trim());`
  );
  check(
    'Missing apiKey/projectId produce inline errors',
    requiredErrors.some(t => /API key is required/i.test(t)) &&
      requiredErrors.some(t => /project id is required/i.test(t)),
    requiredErrors.join(' | ')
  );

  // Paste the Firebase console snippet.
  await setReactField('#sb-fb-json', FIREBASE_SNIPPET);
  await waitFor(
    () => exec(`return document.querySelector('#sb-fb-projectId').value === arguments[0];`, ['e2e-settings-project']),
    'paste applied'
  );

  const pastedValues = await exec(`return {
    apiKey: document.querySelector('#sb-fb-apiKey').value,
    authDomain: document.querySelector('#sb-fb-authDomain').value,
    projectId: document.querySelector('#sb-fb-projectId').value,
    appId: document.querySelector('#sb-fb-appId').value,
    storageBucket: document.querySelector('#sb-fb-storageBucket').value,
    messagingSenderId: document.querySelector('#sb-fb-messagingSenderId').value
  };`);
  check(
    'Pasted JSON fills every field (incl. storageBucket/messagingSenderId)',
    pastedValues.storageBucket === 'e2e-settings-project.appspot.com' &&
      pastedValues.messagingSenderId === '123456789012' &&
      pastedValues.appId === '1:123456789012:web:abcdef123456' &&
      pastedValues.authDomain === 'e2e-settings.firebaseapp.com',
    Object.keys(pastedValues).map(k => `${k}=${pastedValues[k] ? 'ok' : 'EMPTY'}`).join(',')
  );

  await waitFor(async () => (await count('.firebase-box-body .field-error')) === 0, 'errors cleared after paste');
  check('Field errors clear once valid values are present', true);
  check(
    'Firebase box reports Enabled',
    (await textOf('.firebase-box-header .fb-state')).trim() === 'Enabled'
  );

  // Unsaved-changes badge appears, then clears after saving.
  const badgeShown = await waitFor(() => count('.settings-dirty-badge'), 'unsaved badge');
  check('Unsaved-changes badge appears while editing', Boolean(badgeShown));

  await click('.btn-save-settings');
  await waitFor(async () => (await count('.settings-dirty-badge')) === 0, 'badge cleared after save');
  check('Saving settings clears the unsaved-changes badge', true);

  // "Test API key" performs a real call. The key above is fake, so the expected
  // outcomes are "invalid" (Firebase answered) or "unreachable" (no network).
  await click('.btn-fb-test');
  await waitFor(() => count('.fb-check-result'), 'api key check result', 30000);
  const keyCheckText = await textOf('.fb-check-result');
  const keyCheckClass = await exec(`return document.querySelector('.fb-check-result').className;`);
  check(
    'Test API key shows a result without crashing',
    /fb-check-result (invalid|valid|unreachable|skipped)/.test(keyCheckClass) &&
      keyCheckText.length > 10 &&
      !/Unexpected Firebase response/i.test(keyCheckText),
    keyCheckText.trim().slice(0, 90)
  );

  // Persist across reload.
  await req('POST', `/session/${sid}/url`, { url: APP });
  await waitFor(() => count('.dashboard-container'), 'dashboard after reload');
  await exec(
    `var cards = [...document.querySelectorAll('.project-card')];
     var card = cards.find(c => c.textContent.includes(arguments[0]));
     if (!card) return false;
     card.click();
     return true;`,
    [PROJECT_NAME]
  );
  await waitFor(() => count('.top-toolbar'), 'editor after reload');
  await exec(
    `var btn = [...document.querySelectorAll('.rail-tab-btn')].find(b => b.textContent.trim() === 'Settings');
     btn.click(); return true;`
  );
  await waitFor(() => count('.project-settings-panel'), 'settings panel after reload');
  await click('.firebase-box-header');
  await waitFor(() => count('#sb-fb-projectId'), 'firebase fields after reload');
  const persistedProjectId = await exec(`return document.querySelector('#sb-fb-projectId').value;`);
  const persistedBucket = await exec(`return document.querySelector('#sb-fb-storageBucket').value;`);
  check(
    'Firebase config persists across reload',
    persistedProjectId === 'e2e-settings-project' && persistedBucket === 'e2e-settings-project.appspot.com',
    `${persistedProjectId} / ${persistedBucket}`
  );

  // Export the project file and confirm the settings are in the backup.
  await click('.project-export-btn');
  const projectFile = await waitDownload('.json');
  check('Project file exports after configuring Firebase', Boolean(projectFile), path.basename(projectFile || ''));
  if (projectFile) {
    const payload = JSON.parse(fs.readFileSync(projectFile, 'utf8'));
    const fb = payload.project?.settings?.firebaseConfig || {};
    check(
      'Exported project file keeps the full Firebase config',
      fb.projectId === 'e2e-settings-project' &&
        fb.storageBucket === 'e2e-settings-project.appspot.com' &&
        fb.messagingSenderId === '123456789012' &&
        fb.enabled === true,
      `projectId=${fb.projectId} bucket=${fb.storageBucket} enabled=${fb.enabled}`
    );
    check(
      'Exported project file never contains secret-like fields',
      !JSON.stringify(payload).match(/private_key|serviceAccount|BEGIN PRIVATE KEY/i)
    );
  }

  // Clear resets the fields.
  await click('.btn-fb-reset');
  await waitFor(() => exec(`return document.querySelector('#sb-fb-projectId').value === '';`), 'fields cleared');
  check('Clear empties the Firebase fields', (await textOf('.firebase-box-header .fb-state')).trim() === 'Off');
} catch (error) {
  check('Settings E2E completed without fatal error', false, error.message);
  console.error(error);
} finally {
  try {
    await req('DELETE', `/session/${sid}`);
  } catch {}
}

const passed = results.filter(r => r.ok).length;
console.log(`\nSETTINGS E2E: ${passed}/${results.length} checks passed`);
process.exit(results.every(r => r.ok) ? 0 : 1);
