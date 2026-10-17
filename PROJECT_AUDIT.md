# SiteBuilder — Project Audit & Stabilization Report

Date: 2026-10-17
Project: `/home/myxrin/Downloads/SiteBuilder`
Scope: build health, undo/redo/autosave, project storage + import/export, editor audit,
export validation, Firebase/security, polish.

---

## 1. Executive Summary

| Mission | Status |
| --- | --- |
| 1. Build health (type-check, tests, production build, dev server) | **PASS** |
| 2. Undo / redo / autosave reliability | **PASS** |
| 3. Project storage + project-file import/export | **PASS** |
| 4. Editor audit (inspector rewrite, delete/rename/overrides) | **PASS** |
| 5. Export validation (ZIP structure, links, sanitization, serving) | **PASS** |
| 6. Firebase / security (no fabricated credentials, auth not weakened) | **PASS** (live Firebase login is NOT VERIFIED — requires external project) |
| 7. Polish (save status, export warnings, import error UX) | **PASS** |

Verification was performed by actually running: TypeScript type-check, Vitest
(51 tests / 9 files), production build, dev server, a real on-disk ZIP export served
over HTTP, and 34 browser checks in Firefox via WebDriver.

---

## 2. Bugs Found, Root Causes and Fixes

### 2.1 Autosave could lose or reorder writes
- **Cause**: the old autosave path saved on a timer with no serialization and no failure
  reporting; concurrent async IndexedDB writes could finish out of order, and failures
  were silently swallowed. Closing a tab inside the debounce window dropped edits.
- **Fix**: new `src/services/saveController.ts` — debounced (1200 ms), serialized,
  monotonic autosave with `saved / saving / unsaved / error` status, retry keeping the
  newest snapshot pending on failure. `src/services/pendingBuffer.ts` mirrors pending
  snapshots into `localStorage` on `pagehide` / `visibilitychange` / `beforeunload`,
  and `src/App.tsx` now **restores** that buffer when it is newer than the stored
  document, then re-persists it (previously the buffer was written but never read).

### 2.2 Undo/redo could drop edits made in the same event-handler chain
- **Cause**: actions read React state (`history.present`) which does not update
  synchronously; two updates in one handler chain overwrote each other.
- **Fix**: `historyRef` mirror in `EditorContext` + copy-on-write edit helpers
  (`src/utils/projectEdits.ts`). Continuous interactions (typing, drag-repositioning)
  coalesce into one history entry via `src/utils/history.ts` options; undo/redo now
  mark the project dirty so they autosave like any other change.

### 2.3 Project data could be destroyed on import
- **Cause**: no project-file format existed; duplicate ids/names could overwrite
  existing projects; malformed data was accepted.
- **Fix**: versioned envelope `{format:'sitebuilder-project', version:1, app, exportedAt,
  project}` in `src/services/projectIO.ts`, schema-version checks, full validation/repair
  (`src/utils/validation.ts`), and non-destructive `StorageService.importProject`
  (renames conflicts; `mode:'overwrite'` only on explicit request).

### 2.4 Exported HTML could contain unsafe CSS/URLs and broken internal links
- **Cause**: style values, class names and hrefs were interpolated into the export
  without sanitization; internal links were exported as raw slugs.
- **Fix**: every CSS value passes `sanitizeCssValue` (drops `</style>`, `}`, `expression()`,
  `javascript:` URLs, non-image `data:` URLs); class names pass `sanitizeClassName`;
  hrefs are mapped to exported filenames, absolute paths become relative (`./about`),
  plain relative targets are preserved (`./docs/guide`), and unknown/unsafe protocols
  become `#`. `collectExportWarnings` now also reports links/buttons pointing at
  non-existent pages. Data-URL images are extracted to `assets/img_N.<ext>`.

### 2.5 Inspector controls were broken/missing
- **Cause**: the previous inspector had non-functional or missing controls (delete,
  rename, custom class, nav links, list items, positioning presets, move-to-container,
  viewport override reset).
- **Fix**: full rewrite of `src/components/inspector/InspectorContainer.tsx` with working
  delete/duplicate, layer rename, custom class, navbar links, list items, position
  presets, move-to-container, and a mobile/tablet override banner with a Reset action.
  Verified in-browser (see §5).

### 2.6 Export Project vs Export Website
- **Cause**: only "Export ZIP" existed.
- **Fix**: kept **Export ZIP** (standalone website) and added a separate
  **Export Project** button downloading `<name>.sitebuilder.json`, plus an **Import
  Project** button on the dashboard with repair/conflict reporting.

### 2.7 Other fixes
- `PagesManager` now surfaces the `{ok, message}` result from `deletePage` and uses
  undo-friendly copy.
- `AssetsManager` inserts an image from an asset in one history step
  (`insertAssetAsImage`).
- Canvas drag-repositioning writes coalesced (transient) style updates instead of one
  history entry per mouse move.
- Export errors and warnings surface in the toolbar; save errors show a retry affordance.

---

## 3. Changed / Added Files

| File | Change |
| --- | --- |
| `src/utils/history.ts` | Coalescing history options (typing/drag merge) |
| `src/utils/sanitize.ts` | Text/CSS/class/custom-CSS sanitizers |
| `src/utils/validation.ts` | Full project validation + repair (elements graph, slugs, Firebase, assets, schemaVersion) |
| `src/utils/projectEdits.ts` | **New** — immutable edit helpers |
| `src/services/saveController.ts` | **New** — debounced serialized autosave |
| `src/services/pendingBuffer.ts` | **New** — localStorage crash buffer (+ read/clear) |
| `src/services/projectIO.ts` | **New** — project-file export/parse/repair |
| `src/services/storage.ts` | `importProject`, memory fallback, validation on read |
| `src/services/exporter.ts` | Rewrite: safe CSS/HTML, href→filename mapping, asset extraction, navbar toggle, Firebase auth runtime, warnings |
| `src/context/EditorContext.tsx` | Rewrite: race-free actions, autosave wiring, export actions, recovery flag |
| `src/App.tsx` | Restores newer pending-buffer snapshots on load |
| `src/components/inspector/InspectorContainer.tsx` | Rewrite (working controls + viewport overrides) |
| `src/components/header/TopToolbar.tsx` | Export Project button, save-error retry, export warning notice |
| `src/components/dashboard/ProjectDashboard.tsx` | Import Project UI, error/repair modals |
| `src/components/sidebar/PagesManager.tsx` | `deletePage` result handling |
| `src/components/sidebar/AssetsManager.tsx` | Single-step asset→image insert |
| `src/components/canvas/CanvasElement.tsx` | Coalesced drag updates |
| `tests/saveController.test.ts` | **New** — 5 autosave regression tests |
| `tests/pendingBuffer.test.ts` | **New** — 4 crash-buffer tests |
| `tests/projectIO.test.ts` | **New** — 10 import/export tests |
| `tests/exporter-hardening.test.ts` | **New** — 6 export-safety tests |
| `tests/storage.test.ts` | +2 non-destructive import tests |
| `tests/verify-disk-export.test.ts` | Comprehensive on-disk ZIP sample |
| `e2e/*.mjs`, `e2e/README.md`, `e2e/fixtures/*` | **New** — Firefox/WebDriver E2E checks |

No files or features were deleted; no data formats were removed (raw/legacy project JSON
still imports).

---

## 4. Test / Build Results (actually run)

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** — no errors |
| `npm test` | **PASS** — 9 files, **51/51 tests** |
| `npm run build` | **PASS** — `tsc && vite build`; only pre-existing chunk-size warning (564 kB JS) |
| `npm run dev -- --port 3000` | **PASS** — serves HTTP 200 |
| `npm run preview` (built app) | **PASS** — HTTP 200; dashboard screenshot rendered correctly |

New test coverage: autosave coalescing/ordering/failure-retry, crash-buffer round-trip,
project-file round-trip + rejection paths, non-destructive import, export sanitization,
href mapping, auth disabled/enabled states, navbar toggle.

---

## 5. Browser E2E Results (Firefox 146 + geckodriver, built app)

| Suite | Checks | Result |
| --- | --- | --- |
| `e2e/run-e2e.mjs` — create/edit/undo/redo/autosave/export/import/persistence | 16 | **16/16 PASS** |
| `e2e/crash-recovery.mjs` — immediate reload inside debounce window | 3 | **3/3 PASS** |
| `e2e/import-e2e.mjs` — broken JSON error + legacy import | 3 | **3/3 PASS** |
| `e2e/inspector-e2e.mjs` — rename/overrides/reset/persistence | 7 | **7/7 PASS** |
| `e2e/pages-e2e.mjs` — add/duplicate/delete pages | 5 | **5/5 PASS** |
| **Total** | **34** | **34/34 PASS** |

Notable verified behaviors: palette add → undo → redo; inspector delete → undo; autosave
reaches "Saved"; **unsaved edits survive an immediate reload** and are then persisted;
exported `.sitebuilder.json` re-imports; broken file shows "The file is not valid JSON.";
mobile width override applies and resets without touching desktop styles.

---

## 6. Export Validation

- `tests/verify-disk-export.test.ts` writes a real `sample-export/sample-site.zip`
  (pages, navbar, auth card, data-URL image).
- The ZIP was unpacked and served with `python3 -m http.server`:
  - all 7 files served **HTTP 200** (`index.html`, `about.html`, `contact.html`,
    `assets/img_1.png`, `css/styles.css`, `js/main.js`, `README.md`);
  - 31 href/src targets checked: **no broken links**, no `data:image` left in HTML,
    no `javascript:`/`expression()` in HTML or CSS;
  - auth card exported disabled (`data-auth-configured="false"`) and navbar toggle present.
- A ZIP exported by the live app (via the E2E download) unpacked cleanly with the same
  guarantees.

---

## 7. Firebase / Security Notes

- **No credentials were fabricated or hardcoded.** A repo-wide scan found only the
  placeholder `your-app.firebaseapp.com`.
- Exported auth cards render **disabled** unless `settings.firebaseConfig` has
  `enabled: true` **and** both `apiKey` and `projectId`. Forms show a clear
  "not configured" message; submit/Google buttons are disabled.
- When configured, the export embeds the Firebase **web config** (public by design for
  Firebase web apps) and honors `data-auth-redirect` (skips `''`, `'#'`, `'/'`).
- **External configuration required** (not verifiable here): create a Firebase project,
  enable Email/Password (+ Google) providers, paste the web config in
  Settings → Firebase Auth Integration, and configure authorized domains + security rules.
- Auth is not weakened anywhere; project files and exports are validated/sanitized.

---

## 8. Remaining Issues / Not Verified

1. **Live Firebase login** — NOT VERIFIED (needs a real Firebase project; no credentials
   exist here).
2. **Cross-browser** — verified in Firefox only; Chrome/Safari/Edge not run.
3. **Multi-tab concurrent editing** — last-write-wins across tabs (no cross-tab locking);
   not addressed, by design for now.
4. **Very large projects** — performance beyond the starter scale not benchmarked.
5. **Accessibility / visual polish** — not audited beyond functional rendering.
6. **Chunk size** — single 564 kB JS chunk (pre-existing; code-splitting suggested, not done).
7. `@types/jszip` is deprecated (harmless); dependency upgrades intentionally avoided.

---

## 9. How to Run

```bash
cd /home/myxrin/Downloads/SiteBuilder
npm install            # if needed
npm run dev            # dev server  (http://localhost:3000)
npm test               # 51 unit/integration tests
npm run build          # tsc + production build
npm run preview        # serve dist/ (http://localhost:4173)

# browser E2E (optional):
npx geckodriver --port 4444        # separate terminal
node e2e/run-e2e.mjs               # etc. — see e2e/README.md
```

Manual smoke: create a project → add/move/delete elements → check "Saved" →
Export ZIP → serve the ZIP → Export Project → re-import it from the dashboard.
