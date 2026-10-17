# SiteBuilder — Project Audit & Stabilization Report

Date: 2026-10-17 (updated after the release-candidate hardening pass)
Project: `/home/myxrin/Downloads/SiteBuilder`
Scope: build health, undo/redo/autosave, project storage + import/export, editor audit,
export validation, mobile-first UI, accessibility, Firebase settings, security,
browser E2E, GitHub Pages build configuration.

---

## 1. Executive Summary

| Mission | Status |
| --- | --- |
| 1. Build health (type-check, tests, production build) | **PASS** |
| 2. Undo / redo / autosave reliability | **PASS** |
| 3. Project storage + project-file import/export | **PASS** |
| 4. Editor audit (inspector, delete/rename/overrides) | **PASS** |
| 5. Export validation (ZIP structure, links, sanitization, serving) | **PASS** |
| 6. Firebase / security (no fabricated credentials, auth not weakened) | **PASS** — settings UX + honest key probe tested; live login **NOT VERIFIED** (needs a real Firebase project) |
| 7. Polish (save status, export warnings, import error UX) | **PASS** |
| 8. Mobile-first UI (320–430 px, touch targets, safe areas) | **PASS** — 17/17 browser checks |
| 9. Accessibility (names, dialogs, keyboard, runtime errors) | **PASS** — 16/16 browser checks (automated, not a full WCAG audit) |
| 10. GitHub Pages build/deploy config | **PASS locally** (`build:pages` + subpath spot check); the workflow change itself is **NOT VERIFIED** until pushed |

Verification was performed by actually running: TypeScript type-check, Vitest
(**80 tests / 10 files**), production build (code-split), `build:pages`, a local
`/SiteBuilder/`-subpath server check, `npm audit --omit=dev`, and **80 browser
checks across 8 suites** in Firefox via WebDriver (geckodriver 0.36.0/0.37.1).

Historical note: sections 2–4 document the first stabilization round; sections
5–12 cover the release-candidate hardening pass (mobile UI, accessibility,
Firebase settings, exporter hardening, Pages configuration).

---

## 2. Bugs Found in the First Round, Root Causes and Fixes

### 2.1 Autosave could lose or reorder writes
- **Cause**: the old autosave path saved on a timer with no serialization and no failure
  reporting; concurrent async IndexedDB writes could finish out of order, and failures
  were silently swallowed. Closing a tab inside the debounce window dropped edits.
- **Fix**: `src/services/saveController.ts` — debounced (1200 ms), serialized,
  monotonic autosave with `saved / saving / unsaved / error` status, retry keeping the
  newest snapshot pending on failure. `src/services/pendingBuffer.ts` mirrors pending
  snapshots into `localStorage` on `pagehide` / `visibilitychange` / `beforeunload`,
  and `src/App.tsx` restores that buffer when it is newer than the stored document.

### 2.2 Undo/redo could drop edits made in the same event-handler chain
- **Fix**: `historyRef` mirror in `EditorContext` + copy-on-write edit helpers
  (`src/utils/projectEdits.ts`); continuous interactions coalesce into one history
  entry; undo/redo mark the project dirty so they autosave.

### 2.3 Project data could be destroyed on import
- **Fix**: versioned envelope `{format:'sitebuilder-project', version:1, app, exportedAt,
  project}`, schema-version checks, validation/repair, and non-destructive
  `StorageService.importProject` (renames conflicts; overwrite only on request).

### 2.4 Exported HTML could contain unsafe CSS/URLs and broken internal links
- **Fix**: `sanitizeCssValue` / `sanitizeClassName` on every value; hrefs mapped to
  exported filenames; unknown/unsafe protocols become `#`; `collectExportWarnings`
  reports links pointing at non-existent pages; data-URL images are extracted to
  `assets/img_N.<ext>`.

### 2.5 Inspector controls were broken/missing
- **Fix**: full rewrite of `InspectorContainer.tsx` (delete/duplicate, rename, custom
  class, navbar links, list items, position presets, move-to-container, override reset).

### 2.6 Export Project vs Export Website
- **Fix**: kept **Export ZIP** and added **Export Project** (`<name>.sitebuilder.json`)
  plus dashboard **Import Project** with repair/conflict reporting.

### 2.7 Other first-round fixes
- `PagesManager` surfaces `{ok, message}` from `deletePage`; `AssetsManager` inserts an
  image in one history step; canvas drag writes are coalesced; export errors/warnings
  surface in the toolbar; save errors show a retry affordance.

---

## 3. Release-Candidate Hardening Pass

### 3.1 Interaction defects fixed (all browser-verified)

- **Settings panel data loss**: drafts (site title, font, colour, custom CSS, Firebase
  config) were only written on "Apply Global Settings"; leaving the tab silently threw
  them away. Now: drafts auto-apply on panel unmount, an **"Unsaved changes" badge**
  shows dirty state, and Apply gives visual confirmation.
- **Firebase box started expanded** with ~10 fields pushing the rest of the panel down;
  it now starts collapsed with an explicit Enabled/Off state badge.
- **API-key classifier gap** (found by the live E2E): Google answers an invalid key with
  the literal message `"API key not valid. Please pass a valid API key."`, which the
  checker mis-reported as "Unexpected Firebase response: API". The classifier now
  recognises that wording (plus the machine codes) and returns a friendly "Firebase
  rejected this API key" message. Unit test added.
- **Modals** (`DraggableModal`, used for create/rename/delete/import dialogs) had no
  dialog semantics and no Escape handling. Now `role="dialog"` + `aria-modal` +
  labelled by title, Escape closes, close button 44 px on touch devices.
- **Dashboard template options** were click-only `<div>`s; now `role="radio"` inside a
  labelled `role="radiogroup"` with Enter/Space support.
- **Fullscreen preview** had no Escape exit and no dialog semantics. Now
  `role="dialog"` + `aria-modal` + label; Escape exits; while the page dropdown is
  open, a capture-phase handler consumes Escape so only the dropdown closes (the
  editor-wide shortcut would otherwise exit the whole preview).
- **Layer tree** supports `Enter`/`Space` select and `ArrowLeft`/`ArrowRight`
  collapse/expand with `role="tree"`/`"treeitem"`, `aria-selected`, `aria-expanded`
  (browser-verified).
- **PagesManager**: no more `alert`/`confirm`; inline field errors, inline
  Keep/Delete confirmation, auto-derived slugs, unique-slug checks inline.
- **AssetsManager**: inline delete confirmation, `aria-live` upload feedback,
  keyboard-operable cards, hover/focus-visible actions instead of `display:none`.
- **TopToolbar**: save status is a real button with `aria-live`; compact overflow menu
  below 900 px (Preview, exports, zoom, rename); per-action export cooldowns; Escape
  closes menus; `aria-pressed` on toggles; 40 px targets on touch devices.
- **Canvas**: empty/broken images render a placeholder (never an external URL), broken
  images show an error tile; dropzone is keyboard-operable; empty images export as
  `.sb-image-placeholder` divs, never `<img src="#">`.
- **Dashboard**: real scroll container, sticky header, safe-area padding,
  keyboard-operable project cards, 100 MB import guard, reduced-motion support.

### 3.2 Mobile-first UI

- `dvh` units + safe-area insets across the app shell, bottom bar, drawers, dashboards.
- ≤560 px: bottom-bar buttons are ≥44×44 px; the sidebar becomes a 72 dvh bottom
  drawer with `role="dialog"`, `aria-modal`, Escape close and auto-focused close button.
- No unintended horizontal overflow measured at 320 / 360 / 375 / 390 / 414 / 430 CSS px
  (iframe harness — headless Firefox enforces ~500 px minimum window width).
- Fullscreen preview tablet/mobile frames cap at `maxWidth:100%`; top bar becomes
  icon-first on small screens.
- Global `prefers-reduced-motion` support (also inside component style blocks).
- Contrast: `--text-muted` raised to `#8b98ab` (4.5:1 on the app background);
  `:focus-visible` ring applied element-qualified.

### 3.3 Bundle / load behaviour

- Editor workspace is `React.lazy`-loaded; `jszip` is a dynamic import inside
  `exportProjectToZip`. Main chunk went **564 kB → ~325 kB**; the editor chunk
  (~187 kB) and jszip (~96 kB) load on demand. (Chunk-size build warning resolved.)

### 3.4 GitHub Pages

- `package.json`: added `build:pages` = `tsc && vite build --base=/SiteBuilder/`.
- `.github/workflows/deploy.yml`: uses `npm ci && npm run build:pages`, uploads
  `dist/`, deploys with the default `GITHUB_TOKEN` (custom `PAGES_TOKEN` removed),
  actions pinned (checkout/setup-node/upload-pages-artifact/deploy-pages).
- Verified locally: subpath build served with a `/SiteBuilder/` mount returns 200 for
  `index.html`, runtime, CSS, main JS, the lazy EditorWorkspace chunk and the lazy
  jszip chunk.
- The workflow file itself can only be proven by pushing — **NOT VERIFIED** here by
  instruction (no pushes were made).

---

## 4. Changed / Added Files (both rounds)

| File | Change |
| --- | --- |
| `src/utils/history.ts` | Coalescing history options |
| `src/utils/sanitize.ts` | Text/CSS/class/custom-CSS sanitizers |
| `src/utils/validation.ts` | Full project validation + repair |
| `src/utils/projectEdits.ts` | Immutable edit helpers |
| `src/services/saveController.ts` | Debounced serialized autosave |
| `src/services/pendingBuffer.ts` | localStorage crash buffer |
| `src/services/projectIO.ts` | Project-file export/parse/repair |
| `src/services/storage.ts` | Non-destructive `importProject`, memory fallback |
| `src/services/exporter.ts` | Safe export, href mapping, image placeholder, hardened auth runtime, lazy jszip |
| `src/context/EditorContext.tsx` | Race-free actions, autosave, exports |
| `src/App.tsx` | Crash-buffer restore; `LoadingScreen` for suspense/isLoading; dvh root |
| `src/utils/firebaseConfig.ts` | **New** — normalize/validate/parse/check Firebase web config (no lookbehind for Safari) |
| `src/hooks/useMediaQuery.ts` | **New** — responsive hook for the compact toolbar |
| `src/components/sidebar/ProjectSettings.tsx` | Firebase UX rewrite (paste JSON, inline errors/warnings, test key, dirty badge, auto-apply) |
| `src/components/sidebar/PagesManager.tsx` | Inline confirm/errors, slug handling |
| `src/components/sidebar/AssetsManager.tsx` | Inline delete confirm, upload feedback, a11y |
| `src/components/sidebar/LayersTree.tsx` | `role="tree"`, keyboard nav, named controls |
| `src/components/sidebar/ElementsPalette.tsx` | a11y + touch targets |
| `src/components/sidebar/SidebarContainer.tsx` | dvh, touch targets |
| `src/components/header/TopToolbar.tsx` | Compact overflow menu, save-status button, per-action cooldowns |
| `src/components/dashboard/ProjectDashboard.tsx` | Scroll/grid/safe-area, import guard, keyboard cards, radio templates |
| `src/components/common/DraggableModal.tsx` | Dialog semantics, Escape, touch-sized close |
| `src/components/preview/FullscreenPreview.tsx` | Dialog semantics, Escape (dropdown-aware), mobile frame fixes |
| `src/components/canvas/CanvasElement.tsx` | Placeholder/error image, keyboard dropzone |
| `src/components/canvas/CanvasContainer.tsx` | dvh, safe-area |
| `src/components/editor/EditorWorkspace.tsx` | dvh drawer dialog, 44 px tabs, safe areas |
| `src/components/inspector/InspectorContainer.tsx` | Rewrite (round 1) + dvh (round 2) |
| `src/styles/index.css` | Contrast token, focus ring, `.visually-hidden`, spin, reduced motion |
| `tests/saveController.test.ts`, `pendingBuffer.test.ts`, `projectIO.test.ts`, `exporter-hardening.test.ts`, `storage.test.ts`, `firebaseConfig.test.ts` | Unit/integration coverage (see §6) |
| `tests/verify-disk-export.test.ts` | On-disk ZIP sample |
| `e2e/*.mjs` (8 suites), `e2e/README.md`, `e2e/fixtures/*` | Firefox/WebDriver E2E checks |
| `package.json` | `build:pages` script |
| `.github/workflows/deploy.yml` | Pages build with `GITHUB_TOKEN`, pinned actions |
| `.gitignore` | E2E download artifacts ignored |
| `WORK_IN_PROGRESS.md` | **New** — running status log for this hardening pass |

No files or features were deleted; no data formats were removed (raw/legacy project
JSON still imports).

---

## 5. Export Validation (first round, still passing)

- `tests/verify-disk-export.test.ts` writes a real `sample-export/sample-site.zip`
  (pages, navbar, auth card, data-URL image).
- Unpacked and served with `python3 -m http.server`: all 7 files HTTP 200; 31 href/src
  targets checked, no broken links, no `data:image` left in HTML, no
  `javascript:`/`expression()` in HTML or CSS; auth card exports disabled unless
  configured; navbar toggle present.
- Hardening pass: empty/unsafe image sources no longer export as `<img src="#">`; they
  become `.sb-image-placeholder` divs.

---

## 6. Test / Build Results (actually run — current code)

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | **PASS** — no errors |
| `npm test` | **PASS** — 10 files, **80/80 tests** |
| `npm run build` | **PASS** — main 325 kB, EditorWorkspace 187 kB (lazy), jszip 96 kB (lazy), CSS 2.46 kB |
| `npm run build:pages` | **PASS** — assets under `/SiteBuilder/`; subpath server spot check all 200 |
| `npm audit --omit=dev` | **PASS** — 0 vulnerabilities |
| `npm run dev` / `npm run preview` | **PASS** (HTTP 200; used by the E2E suites) |

Unit/integration coverage includes: autosave coalescing/ordering/failure-retry,
crash-buffer round-trip, project-file round-trip + rejection paths, non-destructive
import, export sanitization, href mapping, auth disabled/enabled states, navbar toggle,
Firebase config normalize/validate/parse/classify (25 tests), exporter image-placeholder
and hardening regressions.

---

## 7. Browser E2E Results (Firefox + geckodriver, built app)

| Suite | Checks | Result |
| --- | --- | --- |
| `e2e/run-e2e.mjs` — create/edit/undo/redo/autosave/export/import/persistence | 16 | **16/16 PASS** |
| `e2e/crash-recovery.mjs` — immediate reload inside the debounce window | 3 | **3/3 PASS** |
| `e2e/import-e2e.mjs` — broken JSON error + legacy import | 3 | **3/3 PASS** |
| `e2e/inspector-e2e.mjs` — rename/overrides/reset/persistence | 7 | **7/7 PASS** |
| `e2e/pages-e2e.mjs` — add/duplicate/delete pages | 5 | **5/5 PASS** |
| `e2e/mobile-e2e.mjs` — 320–430 px: no overflow, 44 px targets, mobile ZIP export, drawer, floating quick bar, feedback toast | 17 | **17/17 PASS** |
| `e2e/settings-e2e.mjs` — Firebase panel: paste JSON, validation, persistence, export, live key probe | 13 | **13/13 PASS** |
| `e2e/a11y-e2e.mjs` — accessible names, dialogs + Escape, keyboard layers, zero runtime errors | 16 | **16/16 PASS** |
| **Total** | **80** | **80/80 PASS** |

Notable verified behaviours: palette add → undo → redo; inspector delete → undo;
autosave "Saved"; **unsaved edits survive an immediate reload**; exported
`.sitebuilder.json` re-imports bit-for-bit (full Firebase config included); broken
imports show readable errors; mobile ZIP export downloads inside the drawer workflow;
layer tree keyboard selection/expansion; modal and preview Escape handling; **zero**
window errors / unhandled rejections / `console.error` output during the a11y flow.

---

## 8. Firebase / Security Notes

- **No credentials were fabricated or hardcoded.** Repo scans found only placeholder
  values; project files and exports never contain secret-like fields (asserted in
  `settings-e2e.mjs`).
- Only the **public Firebase web config** is handled (apiKey, authDomain, projectId,
  storageBucket, messagingSenderId, appId). The settings UI states explicitly that
  service-account keys must never be pasted.
- Settings panel: paste the Firebase console JSON → fields are filled (including the
  previously dropped `storageBucket`/`messagingSenderId`), inline errors/warnings,
  "Test API key" performs a **real read-only call** to Google's Identity Toolkit using
  an intentionally invalid credential; it reports whether the key is rejected or
  accepted — it does **not** verify providers, authorized domains or sign-in.
- Exported auth cards stay disabled unless `enabled` is true with `apiKey` **and**
  `projectId`; when configured, the export embeds the public web config and honors
  `data-auth-redirect`; the runtime maps Firebase error codes to friendly messages and
  falls back to `signInWithRedirect` when popups are blocked.

### 8.1 Settings the user must configure manually (outside this repo)

1. Create a Firebase project; add a **Web app**.
2. Authentication → Sign-in method → enable **Email/Password** (and **Google** if the
   Google button is used).
3. Authentication → Settings → Authorized domains → add the site domain
   (`myxrin.github.io` for the Pages URL; `localhost` is pre-allowed for testing).
4. Project settings → Your apps → copy the **firebaseConfig** object → paste into
   SiteBuilder → Settings → Firebase Auth Integration → Apply.
5. For each deployed site: keep Firestore/Storage security rules restrictive (auth UI
   is client-side only; no server component is generated).

---

## 9. Remaining Issues / Not Verified

1. **Live Firebase login** — NOT VERIFIED (needs a real Firebase project + test
   accounts; none exist here).
2. **Deploy workflow change** — NOT VERIFIED without pushing (by instruction, nothing
   was pushed). Local `build:pages` output is verified.
3. **Cross-browser** — verified in Firefox only; Chrome/Safari/Edge not run. (Code
   avoids lookbehind regex and uses widely-supported APIs.)
4. **Multi-tab concurrent editing** — last-write-wins across tabs; not addressed.
5. **Very large projects** — performance beyond the starter scale not benchmarked.
6. **Accessibility** — automated checks pass (names, dialogs, keyboard, no runtime
   errors) but this is not a full WCAG 2.1 audit with assistive technology.
7. `@types/jszip` is deprecated (harmless); dependency upgrades intentionally avoided.

---

## 10. How to Run

```bash
cd /home/myxrin/Downloads/SiteBuilder
npm install            # if needed
npm run dev            # dev server (http://localhost:3000)
npm test               # 80 unit/integration tests
npm run build          # tsc + production build (default base)
npm run build:pages    # build for https://myxrin.github.io/SiteBuilder/
npm run preview        # serve dist/ (http://localhost:4173)

# browser E2E (headless Firefox):
/tmp/geckodriver-0.37.1 --port 4444 &
npx vite preview --port 4173 --strictPort &
for s in run crash-recovery import inspector pages mobile settings a11y; do
  node e2e/$s-e2e.mjs || echo "FAILED: $s"
done
fuser -k 4173/tcp 2>/dev/null   # stop preview (pkill -f "vite preview" kills this shell too)
```

Manual smoke: create a project → add/move/delete elements → check "Saved" → Export
ZIP → serve the ZIP → Export Project → re-import it from the dashboard.

---

## 11. Committing These Changes Locally (no push)

```bash
cd /home/myxrin/Downloads/SiteBuilder
git status                                   # review
git add -A                                   # or add specific paths
git -c user.name="..." -c user.email="..." commit -m "Harden editor interactions, mobile UI, accessibility, Firebase settings and Pages build"
# inspect before any push:
git log --oneline -5
git show --stat HEAD
# when you decide to publish:
# git push origin main
```
