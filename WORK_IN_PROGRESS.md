# WORK IN PROGRESS — SiteBuilder hardening & mobile-first overhaul

Last updated: 2026-10-17 (completed and verified)
Branch: `main`

This file tracks the release-candidate hardening work: bug fixes, mobile UI,
accessibility, touch interaction, Firebase integration honesty and automated coverage.

---

## Final verification snapshot (all commands were actually run)

| Area | Evidence | Status |
| --- | --- | --- |
| Type safety | `npx tsc --noEmit` | PASS |
| Unit/integration tests | `npm test` → **10 files, 82/82 tests** | PASS |
| Production build | `npm run build` — main 326 kB; EditorWorkspace 200 kB + jszip 96 kB lazy | PASS |
| Editor E2E | `node e2e/run-e2e.mjs` → 16/16 | PASS |
| Crash recovery E2E | `node e2e/crash-recovery.mjs` → 3/3 | PASS |
| Import E2E | `node e2e/import-e2e.mjs` → 3/3 | PASS |
| Inspector E2E | `node e2e/inspector-e2e.mjs` → 7/7 | PASS |
| Pages E2E | `node e2e/pages-e2e.mjs` → 5/5 | PASS |
| Mobile E2E | `node e2e/mobile-e2e.mjs` → **17/17** (320–430 px, touch targets, drawer, floating quick bar, mobile ZIP export, palette feedback) | PASS |
| Firebase settings E2E | `node e2e/settings-e2e.mjs` → 13/13 (paste, validation, persistence, export, live key probe) | PASS |
| Accessibility & runtime errors E2E | `node e2e/a11y-e2e.mjs` → 16/16 (names, dialogs, Escape, keyboard layers, zero console errors) | PASS |
| Pages subpath build | `npm run build:pages` + local `/SiteBuilder/` mount: index/CSS/main/lazy chunks all HTTP 200 | PASS |
| Dependency audit | `npm audit --omit=dev` → 0 vulnerabilities | PASS |
| Firebase live login/sign-in | needs a real Firebase project + accounts | NOT VERIFIED |

Totals: **82 unit tests, 80 browser E2E checks across 8 suites.**

---

## Done in this session (newest first)

1. **Audit Defect Fixes & Exporter Hardening (82 unit tests, 80 E2E checks)**:
   - **Inline Edit Protection**: Isolated `contentEditable` text reconciliation with `dangerouslySetInnerHTML` on initial render so background re-renders never clobber text being typed.
   - **Zoom-scaled Dragging**: Canvas element repositioning now divides mouse/touch deltas by `scale = zoomLevel / 100`, eliminating drag drift when zoomed.
   - **Background Image Asset Extraction & Mapping**: Exporter now extracts `url('data:image/...')` from styles and responsive overrides into the ZIP's `assets/` folder, and replaces occurrences in `styles.css` with `../assets/img_X.ext`.
   - **HTML/CSS/JS Minification**: Added `minifyCSS`, `minifyHTML`, and `minifyJS` when `options.minify: true` is passed to `exportProjectToZip`.
   - **Homepage Promotion Integrity**: Setting a new homepage cleanly clears `isHome` on other pages and re-slugs old root pages to avoid duplicate `/` routing conflicts.
   - **Background Image Inspector Double-Wrap Fix**: Created `extractRawBgUrl` helper to prevent nested `url('url(...)')` corruption.
   - **SaveController Recovery**: Resets `lastError = null` when a new edit is queued or save run begins, preventing sticky error badges.
   - **DraggableModal Safety**: Added viewport boundary clamping to prevent dragging off-screen, `{ passive: false }` touch listeners, and removed animation transform conflicts.
   - **FullscreenPreview Dropdown Fix**: Raised `.preview-dropdown-menu` to `z-index: 110` above the `z-index: 105` backdrop.
   - **Context Memoization**: Wrapped `EditorContext.value` in `useMemo` to eliminate unnecessary app-wide re-renders.
   - **Dashboard & Inspector Usability**: Added Enter key submission to dashboard modals, error handling for rename/delete, and enlarged `.nav-link-remove` touch targets.

1. **Mobile UX Overhaul & Complete Touch Parity (17/17 checks)**:
   - **Floating Selected Element Bar**: When any element is selected on mobile, a floating quick action bar docks above the bottom bar, providing 1-tap access to Inspect, Parent selection, Duplicate, Delete, and Deselect with comfortable touch targets.
   - **Touch Drag Repositioning**: Added `handleDragHandleTouchStart` with active touch listeners to `.drag-move-handle` in `CanvasElement.tsx` so repositioning elements works smoothly on mobile touchscreens without page-scroll jitter.
   - **Inline Edit & Badge Touch Sizing**: Selection badge enlarged to 32px height on mobile with 28px buttons and an inline "Edit text" button (`Pencil`).
   - **Persistent Bottom Navigation with Drawer**: Bottom bar remains interactive (`z-index: 120`) above the drawer backdrop (`z-index: 110`), allowing instant 1-tap switching between Add, Layers, Inspect, Pages, Media, and Settings without closing/reopening the drawer.
   - **TopToolbar Mobile Fit**: Added viewport switcher row and 100% reset zoom inside the overflow menu; compact segmented control and page switcher truncation down to 320px screen width.
   - **Canvas Mobile Frame Fit**: Mobile viewport frame adapts cleanly on phones <= 480px (`max-width: calc(100% - 4px)` with 3px border instead of 20px redundant faux border) eliminating horizontal scroll clipping on phones.
   - **Palette Feedback Toast**: Adding elements from the mobile palette gives an instant confirmation toast banner.
   - **iOS Safari Auto-zoom Prevention**: Global `font-size: 16px` rule on mobile inputs.

1. **Full verification sweep re-run on the frozen code** — all commands in the
   table above; nothing left failing. `e2e/README.md` documents the three new
   suites and their artifacts/preconditions; `.gitignore` ignores
   `e2e/downloads*`; default-base `dist/` rebuilt at the end.
2. **Firebase settings panel E2E green (13/13)** — `e2e/settings-e2e.mjs`.
   - Panel: Firebase box now starts collapsed (matches the toggle UX).
   - Test: three waits compared a Promise (`count(...) >= 2`); fixed by awaiting.
   - Found via the live probe: Google answers an invalid key with
     `"API key not valid. Please pass a valid API key."`; the classifier can't
     rely on machine codes there, so it now matches the wording too (unit test
     added). The E2E proves the real network call and correct classification.
3. **Accessibility & runtime-error E2E (16/16)** — `e2e/a11y-e2e.mjs`.
   - `DraggableModal`: `role="dialog"` + `aria-modal` + labelled title, Escape
     closes, close button 44 px on touch devices.
   - Dashboard template options: `role="radio"` in a labelled `radiogroup`,
     Enter/Space support.
   - `FullscreenPreview`: dialog semantics + label; Escape exits; when the page
     dropdown is open a capture-phase handler consumes Escape so only the
     dropdown closes (editor-wide Escape would otherwise exit the preview).
   - Verified: 0 unnamed visible interactive controls (dashboard, editor tabs,
     modals, preview), no duplicate DOM ids, chrome images all have alt,
     layer-tree Enter/ArrowLeft/ArrowRight, and zero `error` /
     `unhandledrejection` / `console.error` during the whole flow.

## Done earlier in this hardening pass (verified previously)

- Editor: canvas image placeholder + error fallback, keyboard dropzone, empty or
  unsafe image sources never export as `<img>`.
- Pages/Assets managers rewritten (inline confirm/errors, a11y, touch targets),
  LayersTree ARIA + keyboard, TopToolbar compact overflow menu + per-action
  export cooldowns, dashboard scroll/keyboard cards/100 MB import guard.
- Mobile: dvh + safe-area everywhere, 44×44 targets, drawer dialog + Escape, no
  horizontal overflow at 320–430 px.
- CSS: `--text-muted` contrast fix, global `:focus-visible` ring,
  `.visually-hidden`, global spin keyframes, reduced-motion support.
- Exporter: lazy `jszip`, `.sb-image-placeholder`, friendly auth errors,
  popup-blocked → redirect fallback, duplicate-submit guard.
- `src/utils/firebaseConfig.ts` + 25 unit tests; settings panel auto-apply on
  unmount + unsaved-changes badge.
- Bundle split (564 → ~325 kB main); `build:pages` + Pages workflow updated to
  `GITHUB_TOKEN` with pinned actions (workflow itself not verified unpushed).

## Follow-ups for the user

1. Live Firebase verification (manual): create a project, enable providers, add
   authorized domains, paste the web config, then test a real sign-up/sign-in on
   a deployed export. Details in `PROJECT_AUDIT.md` §8.1.
2. Push and watch the Pages workflow (local build already verified).
3. Cross-browser pass (Chrome/Safari) — only Firefox was available here.

---

## How to run everything locally

```bash
# unit + type + build
npx tsc --noEmit
npm test
npm run build

# E2E (headless Firefox)
/tmp/geckodriver-0.37.1 --port 4444 &        # geckodriver
npx vite preview --port 4173 --strictPort &  # serves ./dist (default base)
for s in run crash-recovery import inspector pages mobile settings a11y; do
  node e2e/$s-e2e.mjs || echo "FAILED: $s"
done

# stop preview afterwards (pkill -f "vite preview" also kills the calling shell)
fuser -k 4173/tcp 2>/dev/null
```

Environment notes:
- Mobile-viewport checks run inside a same-origin iframe harness
  (`dist/__mobile-harness.html`) because headless Firefox enforces a ~500 px
  minimum window width; the file is removed after the run.
- `settings-e2e.mjs` makes one real network call to Google's Identity Toolkit
  with a deliberately invalid key; it verifies classification only.
