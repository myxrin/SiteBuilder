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
```

Each script prints `PASS`/`FAIL` per check and exits non-zero on failure.
`run-e2e.mjs` writes downloads into `e2e/downloads/` (safe to delete).

The scripts assume the app is served at `http://127.0.0.1:4173/` and geckodriver at
`http://127.0.0.1:4444`; both values are constants at the top of each file.
