# SiteBuilder Browser E2E Checks

Real-browser verification scripts driven through Firefox + geckodriver using the
raw WebDriver protocol. They exercise the built app (`npm run build` + `npm run preview`).

## Prerequisites

- Firefox installed (`firefox --version`)
- geckodriver available on `PATH` (e.g. `npx geckodriver --port 4444` from any folder
  that has the `geckodriver` npm package installed)
- The production build being served:

```bash
npm run build
npm run preview -- --port 4173 --strictPort
```

## Running

```bash
# in a separate terminal, once:
npx geckodriver --port 4444

# then, from the repository root:
node e2e/run-e2e.mjs          # core flows: create, edit, undo/redo, autosave, export, import, persistence
node e2e/crash-recovery.mjs   # unsaved edits survive an immediate reload (localStorage buffer)
node e2e/import-e2e.mjs       # broken file error handling + legacy raw project import
node e2e/inspector-e2e.mjs    # rename, mobile viewport overrides, reset overrides
node e2e/pages-e2e.mjs        # add / duplicate / delete pages
node e2e/mobile-e2e.mjs       # 320–430 px viewports: no overflow, 44 px targets, mobile ZIP export, drawer
node e2e/settings-e2e.mjs     # Firebase settings: paste JSON, validation, persistence, export, live key probe
node e2e/a11y-e2e.mjs         # accessible names, dialogs + Escape, keyboard layers, zero runtime errors
```

Each script prints `PASS`/`FAIL` per check and exits non-zero on failure.
`run-e2e.mjs`, `mobile-e2e.mjs` and `settings-e2e.mjs` write downloads into
`e2e/downloads/`, `e2e/downloads-mobile/` and `e2e/downloads-settings/`
respectively (all safe to delete).

Notes:

- `mobile-e2e.mjs` measures narrow viewports inside a same-origin iframe harness
  because headless Firefox enforces a ~500 px minimum window width. It writes
  `dist/__mobile-harness.html` for the run and deletes it afterwards, so run it
  against a fresh `npm run build`.
- `settings-e2e.mjs` performs one real network call to Google's Identity Toolkit
  with an intentionally invalid API key. It verifies the *classifier* (invalid /
  unreachable); it cannot verify that providers or domains are enabled — that
  needs a real Firebase project.

The scripts assume the app is served at `http://127.0.0.1:4173/` and geckodriver at
`http://127.0.0.1:4444`; both values are constants at the top of each file.
