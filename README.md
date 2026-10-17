# SiteBuilder — Production Visual Website Builder

**SiteBuilder** is a functional visual website builder built with React, TypeScript, and Vite. Inspired by the usability of Webflow and Framer with its own distinctive dark charcoal aesthetic and amber accent, SiteBuilder allows users to design responsive, multi-page websites visually, position objects freely, integrate Firebase authentication, and export clean, standalone HTML/CSS/JS ZIP archives with zero vendor lock-in.

---

## ⚡ Quick Start

### Prerequisites
- Node.js (v18+ or v22+)
- npm (v9+ or v10+)

### 1. Installation
Navigate to the project directory:
```bash
cd ~/Downloads/SiteBuilder
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
The application will launch locally at `http://localhost:3000` (or the next available port). Open this URL in your web browser.

### 3. Build for Production
To typecheck and compile the optimized production bundle:
```bash
npm run build
```
The production bundle will be generated in `dist/`.

To preview the production build locally:
```bash
npm run preview
```

### 4. Run Automated Test Suite
To run all automated unit and integration tests:
```bash
npm test
```

---

## ✨ Features

### A. Project Dashboard & Draggable Modals
- **Draggable Modals**: All modal dialogs (Create Project, Rename Project, Delete Confirmation) can be clicked and dragged anywhere across the screen.
- **Create Projects**: Start with a pre-designed landing page template (Hero, Features grid, Cards, Navbar) or a completely blank canvas.
- **Project Persistence**: Uses IndexedDB (with automatic memory fallback) to persistently store projects and assets in the browser.
- **Project Management**: Rename, duplicate, and delete projects with confirmation dialogs.
- **Card Previews**: Displays real-time page count, element count, and last-modified timestamps.

### B. Free Positioning & Object Movement
- **Direct Canvas Drag**: Click and drag the move handle on any selected element's badge to freely position and nudge it anywhere.
- **Position & Placement Inspector**:
  - Full support for `static`, `relative`, `absolute`, `fixed`, and `sticky` positioning.
  - Coordinate controls: `top`, `bottom`, `left`, `right`, and `z-index`.
  - Quick Alignment Presets: **Center Horizontally**, **Center XY**, **Top-Left Pin**, **Top-Right Pin**, and **Reset to Flow**.
  - **Move to Container**: Re-parent any element into any container or section on the page with a single dropdown selection.

### C. Firebase Authentication Integration
- **Firebase Login Component**: Pre-built auth card with Email, Password, Sign In / Sign Up toggle, and Google Account OAuth sign-in button.
- **Site Settings Firebase Config**: Enter API Key, Auth Domain, Project ID, App ID, or paste the Firebase Web Config JSON directly (auto-parses).
- **Standalone Export Support**: When exported to ZIP, the standalone website includes the official Firebase v10 SDK and client-side authentication code in `js/main.js` for real user login, registration, and Google popup authentication.

### D. Dedicated Mobile UI & Responsive Touch Support
- **Mobile Bottom Navigation Bar**: On mobile screens and small viewports, a clean bottom navigation bar provides instant access to:
  - ➕ **Add** (Elements Palette)
  - 📑 **Layers** (DOM Hierarchy Tree)
  - 🛠️ **Inspect** (Property Inspector with active element indicator dot)
  - 📄 **Pages** (Page Routes & SEO)
  - 🖼️ **Media** (Asset Library)
  - ⚙️ **Settings** (Global & Firebase settings)
- **Slide-up Mobile Drawer Sheet**: Tapping any tab smoothly opens a touch-friendly bottom drawer with scrollable inspector and tool controls.

### E. Visual Workspace & Editor
- **Top Toolbar**: Inline project renaming, active page switcher, responsive viewport controls, undo/redo, auto-save status indicator, live preview toggle, and one-click ZIP export.
- **Left Sidebar**: 
  - **Add Elements**: Categorized palette for Layout, Typography, Media/UI, and Forms/Auth elements.
  - **Layers Tree**: Hierarchical DOM tree showing parent/child relationships with layer selection, up/down reordering, duplicate, and delete actions.
  - **Pages Manager**: Multi-page manager with custom URL slugs, SEO title and description, home page toggle, duplicate page, and delete confirmation.
  - **Asset Manager**: Persistent image upload to IndexedDB, thumbnail gallery, size validation, and one-click insertion.
  - **Global Settings**: Configure site-wide font family, brand accent color, custom CSS, and Firebase authentication.
- **Central Canvas**:
  - Live responsive viewport frame for **Desktop** (100% / 1200px), **Tablet** (768px), and **Mobile** (375px).
  - Canvas zoom controls (50% to 150%).
  - Selection outline with amber badge, parent selector, move handle, duplicate, and delete actions.
  - Double-click inline text editing for headings, paragraphs, and buttons.
  - Dropzone indicator for empty containers.

### F. Live Fullscreen Preview
- Toggleable preview mode completely removes editor outlines and toolbars.
- Working internal navigation between pages.
- Responsive switcher inside preview mode.

### G. Zero Lock-in ZIP Export
- Generates a standalone production ZIP containing:
  - `index.html` (Home page)
  - `[page-slug].html` (Additional pages with resolved internal links)
  - `css/styles.css` (Clean, responsive stylesheet with desktop base, positioning rules, and media queries)
  - `js/main.js` (Minimal vanilla script for mobile navigation and Firebase Auth logic)
  - `assets/` (Embedded and uploaded images automatically extracted to clean files)
  - `README.md` (Detailed usage instructions for hosting or running locally)
- Zero dependency on the SiteBuilder runtime or external proprietary APIs.

---

## 🏗️ Architecture & Technology Stack

```
SiteBuilder/
├── src/
│   ├── types/
│   │   └── document.ts          # Core document schemas, Page, SiteElement, ElementStyles, FirebaseConfig
│   ├── utils/
│   │   ├── id.ts                # Stable unique ID generator
│   │   ├── defaults.ts          # Element factories & starter project templates
│   │   ├── history.ts           # Undo/redo stack manager with debouncing
│   │   ├── sanitize.ts          # HTML entity escaping & URL sanitization
│   │   └── validation.ts        # Document schema validator and auto-repair
│   ├── services/
│   │   ├── storage.ts           # IndexedDB & memory fallback persistence
│   │   └── exporter.ts          # Semantic HTML/CSS generation, Firebase SDK & JSZip bundling
│   ├── context/
│   │   └── EditorContext.tsx    # React context, state machine, and keyboard shortcuts
│   ├── components/
│   │   ├── common/              # DraggableModal for movable dialogs
│   │   ├── dashboard/           # Project dashboard & modal dialogs
│   │   ├── header/              # Top toolbar & controls
│   │   ├── sidebar/             # Elements palette, layers, pages, assets, settings (with Firebase)
│   │   ├── canvas/              # Device viewport frame, free drag repositioning & recursive renderer
│   │   ├── inspector/           # Contextual controls, positioning, box model, and auth config
│   │   ├── editor/              # Workspace shell with mobile bottom bar & bottom drawer sheet
│   │   └── preview/             # Fullscreen live preview
│   ├── styles/
│   │   └── index.css            # Dark charcoal design tokens & utility styles
│   ├── App.tsx                  # App shell & router
│   └── main.tsx                 # Entry point
├── tests/                       # Automated Vitest test suites (24 tests passing)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Ctrl + Z` / `Cmd + Z` | Undo last operation |
| `Ctrl + Y` / `Cmd + Shift + Z` | Redo operation |
| `Ctrl + S` / `Cmd + S` | Save project |
| `Ctrl + D` / `Cmd + D` | Duplicate selected element |
| `Delete` / `Backspace` | Delete selected element |
| `Escape` | Deselect element or exit preview mode |

---

## 📄 License
MIT License.
