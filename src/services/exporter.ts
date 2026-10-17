import { Project, Page, SiteElement, ElementStyles, FirebaseConfig } from '../types/document';
import {
  escapeHtml,
  sanitizeUrl,
  sanitizeCssValue,
  sanitizeClassName,
  sanitizeCustomCss
} from '../utils/sanitize';

interface ExportOptions {
  minify?: boolean;
}

export function slugToFilename(slug: string, isHome: boolean): string {
  if (isHome || slug === '/' || !slug) {
    return 'index.html';
  }
  let clean = slug.replace(/^\/+/, '').replace(/\/+$/, '');
  clean = clean.replace(/[^a-z0-9\-_]/gi, '-').replace(/^-+|-+$/g, '');
  return clean ? `${clean}.html` : 'index.html';
}

/** Maps pages to unique output file names (duplicate slugs cannot overwrite each other). */
export function generatePageFilenames(project: Project): Map<string, string> {
  const used = new Set<string>();
  const result = new Map<string, string>();

  project.pages.forEach((page) => {
    let filename = slugToFilename(page.slug, page.isHome);
    if (used.has(filename)) {
      const base = filename.replace(/\.html$/, '');
      let counter = 2;
      while (used.has(`${base}-${counter}.html`)) counter += 1;
      filename = `${base}-${counter}.html`;
    }
    used.add(filename);
    result.set(page.id, filename);
  });

  return result;
}

export function cssRulesToString(styles?: Partial<ElementStyles>, assetMap?: Map<string, string>): string {
  if (!styles) return '';
  const rules: string[] = [];

  const pushString = (property: string, value: unknown) => {
    const safe = sanitizeCssValue(value);
    if (safe !== undefined && safe !== '') rules.push(`${property}: ${safe};`);
  };

  // Typography
  pushString('font-family', styles.fontFamily);
  pushString('font-size', styles.fontSize);
  pushString('font-weight', styles.fontWeight);
  pushString('line-height', styles.lineHeight);
  pushString('letter-spacing', styles.letterSpacing);
  pushString('text-align', styles.textAlign);
  pushString('color', styles.color);
  if (styles.textTransform && styles.textTransform !== 'none') pushString('text-transform', styles.textTransform);
  if (styles.textDecoration && styles.textDecoration !== 'none') pushString('text-decoration', styles.textDecoration);

  // Layout & Display
  pushString('display', styles.display);
  pushString('flex-direction', styles.flexDirection);
  pushString('justify-content', styles.justifyContent);
  pushString('align-items', styles.alignItems);
  pushString('flex-wrap', styles.flexWrap);
  pushString('gap', styles.gap);
  pushString('grid-template-columns', styles.gridTemplateColumns);

  // Positioning & Movement
  pushString('position', styles.position);
  pushString('top', styles.top);
  pushString('right', styles.right);
  pushString('bottom', styles.bottom);
  pushString('left', styles.left);
  if (typeof styles.zIndex === 'number' && Number.isFinite(styles.zIndex)) {
    rules.push(`z-index: ${Math.trunc(styles.zIndex)};`);
  }
  pushString('transform', styles.transform);

  // Box Model
  pushString('width', styles.width);
  pushString('max-width', styles.maxWidth);
  pushString('min-width', styles.minWidth);
  pushString('height', styles.height);
  pushString('max-height', styles.maxHeight);
  pushString('min-height', styles.minHeight);

  // Spacing
  if (styles.padding) {
    const top = sanitizeCssValue(styles.padding.top) ?? '0';
    const right = sanitizeCssValue(styles.padding.right) ?? '0';
    const bottom = sanitizeCssValue(styles.padding.bottom) ?? '0';
    const left = sanitizeCssValue(styles.padding.left) ?? '0';
    const hasValue = ['top', 'right', 'bottom', 'left'].some(side => Boolean((styles.padding as Record<string, unknown>)[side]));
    if (hasValue) rules.push(`padding: ${top} ${right} ${bottom} ${left};`);
  }
  if (styles.margin) {
    const top = sanitizeCssValue(styles.margin.top) ?? '0';
    const right = sanitizeCssValue(styles.margin.right) ?? '0';
    const bottom = sanitizeCssValue(styles.margin.bottom) ?? '0';
    const left = sanitizeCssValue(styles.margin.left) ?? '0';
    const hasValue = ['top', 'right', 'bottom', 'left'].some(side => Boolean((styles.margin as Record<string, unknown>)[side]));
    if (hasValue) rules.push(`margin: ${top} ${right} ${bottom} ${left};`);
  }

  // Visuals & Backgrounds
  pushString('background-color', styles.backgroundColor);

  if (styles.backgroundImage) {
    let bg = styles.backgroundImage;
    if (assetMap && assetMap.size > 0) {
      for (const [dataUrl, relativePath] of assetMap.entries()) {
        if (bg.includes(dataUrl)) {
          bg = bg.replace(dataUrl, `../${relativePath}`);
        }
      }
    }
    pushString('background-image', bg);
  }

  pushString('background-size', styles.backgroundSize);
  pushString('background-position', styles.backgroundPosition);
  if (typeof styles.opacity === 'number' && Number.isFinite(styles.opacity)) {
    rules.push(`opacity: ${Math.min(1, Math.max(0, styles.opacity))};`);
  }
  pushString('overflow', styles.overflow);

  // Borders
  const borderWidth = sanitizeCssValue(styles.borderWidth);
  if (borderWidth && borderWidth !== '0' && borderWidth !== '0px') {
    rules.push(`border-width: ${borderWidth};`);
    rules.push(`border-style: ${sanitizeCssValue(styles.borderStyle) || 'solid'};`);
    const borderColor = sanitizeCssValue(styles.borderColor);
    if (borderColor) rules.push(`border-color: ${borderColor};`);
  }
  pushString('border-radius', styles.borderRadius);
  pushString('box-shadow', styles.boxShadow);

  return rules.join('\n  ');
}

export function generateProjectCSS(project: Project, assetMap?: Map<string, string>): string {
  const desktopRules: string[] = [];
  const tabletRules: string[] = [];
  const mobileRules: string[] = [];

  const processed = new Set<string>();

  for (const page of project.pages) {
    for (const el of Object.values(page.elements)) {
      if (processed.has(el.id)) continue;
      processed.add(el.id);

      const dRule = cssRulesToString(el.styles, assetMap);
      if (dRule) {
        desktopRules.push(`.sb-${el.id} {\n  ${dRule}\n}`);
      }

      if (el.responsiveStyles?.tablet) {
        const tRule = cssRulesToString(el.responsiveStyles.tablet, assetMap);
        if (tRule) {
          tabletRules.push(`.sb-${el.id} {\n  ${tRule}\n}`);
        }
      }

      if (el.responsiveStyles?.mobile) {
        const mRule = cssRulesToString(el.responsiveStyles.mobile, assetMap);
        if (mRule) {
          mobileRules.push(`.sb-${el.id} {\n  ${mRule}\n}`);
        }
      }
    }
  }

  return `/* SiteBuilder Generated Stylesheet */
:root {
  --primary-color: ${sanitizeCssValue(project.settings?.primaryColor) || '#f59e0b'};
  --font-family: ${sanitizeCssValue(project.settings?.defaultFont) || 'Inter, -apple-system, sans-serif'};
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-family: var(--font-family);
  -webkit-font-smoothing: antialiased;
  scroll-behavior: smooth;
}

body {
  width: 100%;
  min-height: 100vh;
  line-height: 1.5;
  color: #1e293b;
  background-color: #ffffff;
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

/* Neutral placeholder shown when no image source is set or the source is unsafe */
.sb-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  background: #e2e8f0;
  border: 1px dashed #94a3b8;
  border-radius: 8px;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  padding: 16px;
}

a {
  color: inherit;
  text-decoration: none;
}

/* Navbar */
.sb-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.sb-nav-brand {
  font-weight: 700;
  font-size: 1.25rem;
}

.sb-nav-menu {
  display: flex;
  gap: 16px;
  align-items: center;
}

.sb-nav-link {
  font-size: 14px;
  font-weight: 500;
}

.sb-nav-toggle {
  display: none;
  background: none;
  border: none;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  padding: 4px 8px;
  color: inherit;
}

@media (max-width: 768px) {
  .sb-nav {
    flex-wrap: wrap;
  }

  .sb-nav-toggle {
    display: block;
  }

  .sb-nav-menu {
    display: none;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    margin-top: 12px;
  }

  .sb-nav-menu.open {
    display: flex;
  }
}

/* Firebase Auth card */
.sb-auth-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sb-auth-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.sb-auth-label {
  font-size: 12px;
  font-weight: 600;
  color: #334155;
}

.sb-auth-input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 13px;
  outline: none;
}

.sb-auth-msg {
  display: none;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  text-align: center;
}

.sb-auth-msg.visible {
  display: block;
}

.sb-auth-msg.error {
  background: #fee2e2;
  color: #b91c1c;
}

.sb-auth-msg.success {
  background: #dcfce7;
  color: #15803d;
}

.sb-auth-msg.info {
  background: #e0f2fe;
  color: #075985;
}

.sb-auth-submit {
  margin-top: 4px;
  padding: 10px;
  background: var(--primary-color);
  color: #0f172a;
  border: none;
  font-weight: 700;
  font-size: 13.5px;
  border-radius: 8px;
  cursor: pointer;
}

.sb-auth-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.sb-auth-divider {
  text-align: center;
  margin: 12px 0;
  color: #94a3b8;
  font-size: 11px;
}

.sb-auth-google {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  color: #334155;
}

.sb-auth-toggle-row {
  text-align: center;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.sb-auth-mode-toggle {
  background: none;
  border: none;
  color: var(--primary-color);
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
}

/* Base Desktop Styles */
${desktopRules.join('\n\n')}

/* Tablet Overrides */
@media (max-width: 1024px) {
${tabletRules.map(r => `  ${r.replace(/\n/g, '\n  ')}`).join('\n\n')}
}

/* Mobile Overrides */
@media (max-width: 768px) {
${mobileRules.map(r => `  ${r.replace(/\n/g, '\n  ')}`).join('\n\n')}
}

/* Project Custom CSS */
${sanitizeCustomCss(project.settings?.customCss)}
`;
}

/** Builds a page lookup so links can point at the exported file names. */
function buildHrefIndex(project: Project, filenames: Map<string, string>): Map<string, string> {
  const index = new Map<string, string>();
  for (const page of project.pages) {
    const filename = filenames.get(page.id) || slugToFilename(page.slug, page.isHome);
    index.set(page.slug, filename);
    index.set(page.slug.replace(/^\//, ''), filename);
    if (page.isHome) {
      index.set('/', filename);
      index.set('', filename);
      index.set('index.html', filename);
    }
  }
  return index;
}

function resolveHref(href: string | undefined, hrefIndex: Map<string, string>): string {
  if (!href) return '#';
  const trimmed = href.trim();
  if (!trimmed) return '#';

  const direct = hrefIndex.get(trimmed) || hrefIndex.get(trimmed.replace(/^\//, ''));
  if (direct) return direct;

  // Absolute "/about" made relative so the export also works from file:// or a subfolder.
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return `.${trimmed}`;
  }

  // Plain relative targets ("pricing", "docs/page.html") are kept relative so the
  // author's intent survives the export; protocol-like hrefs are sanitized strictly.
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && !trimmed.startsWith('#') && !trimmed.startsWith('?')) {
    return `./${trimmed}`;
  }

  return sanitizeUrl(trimmed);
}

function classAttribute(element: SiteElement): string {
  const custom = sanitizeClassName(element.props.customClass);
  return custom ? `sb-${element.id} ${custom}` : `sb-${element.id}`;
}

function renderAuthElement(element: SiteElement, className: string, firebaseEnabled: boolean): string {
  const title = escapeHtml(element.props.authTitle || 'Welcome Back');
  const subtitle = escapeHtml(element.props.authSubtitle || 'Sign in to access your account');
  const mode = element.props.authMode || 'both';
  const redirect = element.props.authRedirect && element.props.authRedirect !== '#'
    ? escapeHtml(element.props.authRedirect)
    : '';
  const configured = firebaseEnabled;
  const showToggle = mode === 'both';
  const initialSignUp = mode === 'signup';

  const googleBtn = element.props.enableGoogleAuth
    ? `
    <div class="sb-auth-divider">or continue with</div>
    <button type="button" class="sb-auth-google sb-firebase-google-btn"${configured ? '' : ' disabled'}>
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
      <span>Google Account</span>
    </button>`
    : '';

  const toggleRow = showToggle
    ? `
    <div class="sb-auth-toggle-row">
      <span class="sb-auth-toggle-label">${initialSignUp ? 'Already have an account?' : "Don't have an account?"}</span>
      <button type="button" class="sb-auth-mode-toggle">${initialSignUp ? 'Sign In' : 'Sign Up'}</button>
    </div>`
    : '';

  return `<div class="${className}" data-auth-root="true">
  <div style="text-align: center; margin-bottom: 20px;">
    <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 4px;">${title}</h3>
    <p style="font-size: 13px; color: #64748b;">${subtitle}</p>
  </div>
  <form class="sb-auth-form sb-firebase-auth-form" onsubmit="return false;"
        data-auth-mode="${escapeHtml(mode)}"
        data-auth-redirect="${redirect}"
        data-auth-configured="${configured ? 'true' : 'false'}">
    <div class="sb-auth-field">
      <label class="sb-auth-label" for="sb-email-${element.id}">Email address</label>
      <input id="sb-email-${element.id}" type="email" autocomplete="email" class="sb-auth-input sb-auth-email" required placeholder="name@company.com" />
    </div>
    <div class="sb-auth-field">
      <label class="sb-auth-label" for="sb-pass-${element.id}">Password</label>
      <input id="sb-pass-${element.id}" type="password" autocomplete="current-password" class="sb-auth-input sb-auth-password" required placeholder="••••••••" />
    </div>
    <div class="sb-auth-msg" role="status" aria-live="polite"></div>
    <button type="submit" class="sb-auth-submit sb-firebase-submit-btn">${initialSignUp ? 'Create Account' : 'Sign In'}</button>${googleBtn}${toggleRow}
  </form>
</div>`;
}

function renderElementToHTML(
  element: SiteElement,
  elementsMap: Record<string, SiteElement>,
  hrefIndex: Map<string, string>,
  assetMap: Map<string, string>,
  firebaseEnabled: boolean
): string {
  const className = classAttribute(element);
  const childrenHTML = (element.children || [])
    .map(childId => elementsMap[childId])
    .filter(Boolean)
    .map(child => renderElementToHTML(child, elementsMap, hrefIndex, assetMap, firebaseEnabled))
    .join('\n');

  switch (element.type) {
    case 'section':
      return `<section class="${className}">\n${childrenHTML}\n</section>`;

    case 'container':
    case 'card':
      return `<div class="${className}">\n${childrenHTML}\n</div>`;

    case 'grid':
      return `<div class="${className}">\n${childrenHTML}\n</div>`;

    case 'heading': {
      const lvl = element.props.headingLevel || 2;
      const tag = `h${lvl}`;
      return `<${tag} class="${className}">${escapeHtml(element.props.text || '')}</${tag}>`;
    }

    case 'paragraph':
      return `<p class="${className}">${escapeHtml(element.props.text || '')}</p>`;

    case 'button': {
      const href = escapeHtml(resolveHref(element.props.href, hrefIndex));
      const target = element.props.target === '_blank' ? '_blank' : '_self';
      const rel = target === '_blank' ? ' rel="noopener noreferrer"' : '';
      return `<a href="${href}" target="${target}"${rel} class="${className}">${escapeHtml(element.props.text || 'Button')}</a>`;
    }

    case 'link': {
      const href = escapeHtml(resolveHref(element.props.href, hrefIndex));
      const target = element.props.target === '_blank' ? '_blank' : '_self';
      const rel = target === '_blank' ? ' rel="noopener noreferrer"' : '';
      return `<a href="${href}" target="${target}"${rel} class="${className}">${escapeHtml(element.props.text || 'Link')}</a>`;
    }

    case 'image': {
      let src = element.props.src || '';
      if (src && assetMap.has(src)) {
        src = assetMap.get(src)!;
      } else if (src) {
        src = sanitizeUrl(src);
        // Unsafe/unknown protocols resolve to '#' — fall through to the
        // neutral placeholder instead of shipping a broken image.
        if (src === '#') src = '';
      }
      const alt = escapeHtml(element.props.alt || '');
      const fit = element.props.objectFit || 'cover';
      if (!src) {
        const label = element.props.alt ? alt : 'Image';
        return `<div class="${className} sb-image-placeholder" role="img" aria-label="${label}"><span aria-hidden="true">${label}</span></div>`;
      }
      return `<img src="${escapeHtml(src)}" alt="${alt}" class="${className}" loading="lazy" style="object-fit: ${fit};" />`;
    }

    case 'divider':
      return `<hr class="${className}" />`;

    case 'spacer':
      return `<div class="${className}" aria-hidden="true"></div>`;

    case 'shape':
      return `<div class="${className}"></div>`;

    case 'list': {
      const isOrdered = element.props.listType === 'ordered';
      const tag = isOrdered ? 'ol' : 'ul';
      const items = (element.props.listItems || [])
        .map(item => `  <li>${escapeHtml(item)}</li>`)
        .join('\n');
      return `<${tag} class="${className}">\n${items}\n</${tag}>`;
    }

    case 'navbar': {
      const brandText = escapeHtml(element.props.brandText || 'Brand');
      const brandHref = escapeHtml(resolveHref(element.props.brandLink || '/', hrefIndex));
      const links = (element.props.navLinks || [])
        .map(link => {
          const href = escapeHtml(resolveHref(link.href, hrefIndex));
          return `<a href="${href}" class="sb-nav-link">${escapeHtml(link.label)}</a>`;
        })
        .join('\n      ');

      return `<header class="${className} sb-nav">
  <a href="${brandHref}" class="sb-nav-brand">${brandText}</a>
  <button type="button" class="sb-nav-toggle" aria-label="Toggle navigation menu" aria-expanded="false">☰</button>
  <nav class="sb-nav-menu" aria-label="Main navigation">
      ${links}
  </nav>
</header>`;
    }

    case 'auth':
      return renderAuthElement(element, className, firebaseEnabled);

    default:
      return `<div class="${className}">\n${childrenHTML}\n</div>`;
  }
}

function faviconMarkup(project: Project): string {
  const favicon = project.settings?.favicon;
  if (!favicon) return '';
  const safe = sanitizeUrl(favicon);
  if (safe === '#') return '';
  return `\n  <link rel="icon" href="${escapeHtml(safe)}">`;
}

function hasFirebaseConfig(project: Project): boolean {
  const config = project.settings?.firebaseConfig;
  return Boolean(config?.enabled && config.apiKey && config.projectId);
}

export function generatePageHTML(
  page: Page,
  project: Project,
  assetMap: Map<string, string>,
  filenames: Map<string, string> = generatePageFilenames(project)
): string {
  const rootEl = page.elements[page.rootElementId];
  const firebaseEnabled = hasFirebaseConfig(project);
  const hrefIndex = buildHrefIndex(project, filenames);
  const bodyContent = rootEl
    ? renderElementToHTML(rootEl, page.elements, hrefIndex, assetMap, firebaseEnabled)
    : '';

  const config = project.settings?.firebaseConfig;
  let firebaseScripts = '';
  if (firebaseEnabled && config) {
    const opts = config.options || {};
    const tags: string[] = [
      '<!-- Firebase SDK (v10 compat build) -->',
      '<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js"></script>'
    ];
    if (opts.enableAuth !== false) {
      tags.push('<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-auth-compat.js"></script>');
    }
    if (opts.enableAnalytics && config.measurementId) {
      tags.push('<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics-compat.js"></script>');
    }
    if (opts.enableFirestore) {
      tags.push('<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore-compat.js"></script>');
    }
    if (opts.enableRealtimeDb && config.databaseURL) {
      tags.push('<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-database-compat.js"></script>');
    }
    if (opts.enableStorage && config.storageBucket) {
      tags.push('<script src="https://www.gstatic.com/firebasejs/10.8.0/firebase-storage-compat.js"></script>');
    }
    firebaseScripts = '\n  ' + tags.join('\n  ');
  }

  const title = page.title || project.settings?.siteTitle || project.name || 'Website';
  const description = page.description || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="generator" content="SiteBuilder">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">${faviconMarkup(project)}
  <link rel="stylesheet" href="css/styles.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">${firebaseScripts}
</head>
<body>
${bodyContent}
  <script src="js/main.js"></script>
</body>
</html>`;
}

export function generateClientJS(project: Project): string {
  const config = project.settings?.firebaseConfig;
  const firebaseEnabled = hasFirebaseConfig(project);

  const firebaseConfigPayload: Partial<FirebaseConfig> | null = firebaseEnabled && config
    ? {
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        appId: config.appId,
        ...(config.measurementId ? { measurementId: config.measurementId } : {}),
        ...(config.databaseURL ? { databaseURL: config.databaseURL } : {})
      }
    : null;

  const fbConfigJson = firebaseConfigPayload
    ? JSON.stringify(firebaseConfigPayload, null, 2)
    : 'null';

  const persistenceMode = config?.options?.persistence || 'LOCAL';

  return `/* SiteBuilder Vanilla Client Runtime — no editor dependencies required. */
(function () {
  'use strict';

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function setupMobileNavigation() {
    var toggles = document.querySelectorAll('.sb-nav-toggle');
    Array.prototype.forEach.call(toggles, function (toggle) {
      toggle.addEventListener('click', function () {
        var header = toggle.closest('header');
        if (!header) return;
        var menu = header.querySelector('.sb-nav-menu');
        if (!menu) return;
        var isOpen = menu.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      });
    });
  }

  function setupAuth() {
    var forms = document.querySelectorAll('.sb-firebase-auth-form');
    var fbConfig = ${fbConfigJson};
    var auth = null;
    var initError = null;

    if (fbConfig && typeof firebase !== 'undefined') {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(fbConfig);
        }
        if (typeof firebase.analytics === 'function' && fbConfig.measurementId) {
          try { firebase.analytics(); } catch (e) { /* analytics init */ }
        }
        if (typeof firebase.auth === 'function') {
          auth = firebase.auth();
          if (firebase.auth.Auth && firebase.auth.Auth.Persistence) {
            var persistMode = '${persistenceMode}';
            var pType = firebase.auth.Auth.Persistence[persistMode] || firebase.auth.Auth.Persistence.LOCAL;
            auth.setPersistence(pType).catch(function () {});
          }
        }
      } catch (error) {
        initError = error;
      }
    }

    if (!forms.length) return;

    // Maps Firebase error codes to plain-language messages.
    function friendlyAuthError(error) {
      var code = (error && error.code) || '';
      var messages = {
        'auth/invalid-email': 'That email address looks invalid.',
        'auth/missing-password': 'Please enter your password.',
        'auth/user-disabled': 'This account has been disabled.',
        'auth/user-not-found': 'No account was found with that email address.',
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/invalid-credential': 'Incorrect email or password.',
        'auth/invalid-login-credentials': 'Incorrect email or password.',
        'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
        'auth/weak-password': 'Please choose a stronger password (at least 6 characters).',
        'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
        'auth/network-request-failed': 'Network error - check your connection and try again.',
        'auth/operation-not-allowed': 'This sign-in method is not enabled for this website yet.',
        'auth/unauthorized-domain': 'This website domain is not authorized in the Firebase console.',
        'auth/popup-blocked': 'Your browser blocked the sign-in popup. Redirecting instead...',
        'auth/popup-closed-by-user': 'The sign-in window was closed before finishing.',
        'auth/cancelled-popup-request': 'Another sign-in attempt is already in progress.',
        'auth/account-exists-with-different-credential': 'An account already exists for this email with a different sign-in method.',
        'auth/missing-email': 'Please enter your email address.'
      };
      if (messages[code]) return messages[code];
      return (error && error.message) || 'Authentication failed. Please try again.';
    }

    Array.prototype.forEach.call(forms, function (form) {
      var configured = form.getAttribute('data-auth-configured') === 'true' && Boolean(auth);
      var redirectUrl = form.getAttribute('data-auth-redirect') || '';
      var mode = form.getAttribute('data-auth-mode') || 'both';
      var isSignUp = mode === 'signup';

      var submitBtn = form.querySelector('.sb-firebase-submit-btn');
      var toggleBtn = form.querySelector('.sb-auth-mode-toggle');
      var toggleLabel = form.querySelector('.sb-auth-toggle-label');
      var emailInput = form.querySelector('.sb-auth-email');
      var passInput = form.querySelector('.sb-auth-password');
      var msgBox = form.querySelector('.sb-auth-msg');
      var googleBtn = form.querySelector('.sb-firebase-google-btn');

      function showMessage(message, kind) {
        if (!msgBox) return;
        msgBox.textContent = message;
        msgBox.className = 'sb-auth-msg visible ' + (kind || 'info');
      }

      function goToRedirect() {
        if (!redirectUrl || redirectUrl === '#' || redirectUrl === '/') return;
        window.location.href = redirectUrl;
      }

      if (!configured) {
        showMessage(
          initError
            ? 'Authentication is unavailable: ' + initError.message
            : 'Authentication is not configured for this website yet. Add your Firebase keys in SiteBuilder settings.',
          'info'
        );
        if (submitBtn) submitBtn.disabled = true;
        if (googleBtn) googleBtn.disabled = true;
        return;
      }

      // Already signed in? Send the visitor to the configured redirect target.
      auth.onAuthStateChanged(function (user) {
        if (user) {
          showMessage('Signed in as ' + (user.email || 'user') + '.', 'success');
          goToRedirect();
        }
      });

      if (toggleBtn) {
        toggleBtn.addEventListener('click', function () {
          isSignUp = !isSignUp;
          if (submitBtn) submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
          if (toggleLabel) toggleLabel.textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
          toggleBtn.textContent = isSignUp ? 'Sign In' : 'Sign Up';
          if (passInput) passInput.setAttribute('autocomplete', isSignUp ? 'new-password' : 'current-password');
          if (msgBox) msgBox.className = 'sb-auth-msg';
        });
      }

      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var email = emailInput ? emailInput.value.trim() : '';
        var password = passInput ? passInput.value : '';
        if (!email || !password) {
          showMessage('Please fill in both your email and password.', 'error');
          return;
        }
        if (submitBtn && submitBtn.disabled) return;

        if (submitBtn) submitBtn.disabled = true;
        var action = isSignUp
          ? auth.createUserWithEmailAndPassword(email, password)
          : auth.signInWithEmailAndPassword(email, password);

        action.then(function () {
          showMessage(isSignUp ? 'Account created successfully!' : 'Signed in successfully!', 'success');
          goToRedirect();
        }).catch(function (error) {
          showMessage(friendlyAuthError(error), 'error');
        }).then(function () {
          if (submitBtn) submitBtn.disabled = false;
        });
      });

      if (googleBtn) {
        googleBtn.addEventListener('click', function () {
          if (googleBtn.disabled) return;
          googleBtn.disabled = true;
          var provider = new firebase.auth.GoogleAuthProvider();

          function finish() {
            googleBtn.disabled = false;
          }

          auth.signInWithPopup(provider).then(function () {
            showMessage('Signed in with Google!', 'success');
            goToRedirect();
            finish();
          }).catch(function (error) {
            var code = (error && error.code) || '';
            // Popups blocked (common on mobile browsers) — fall back to the
            // redirect flow so the visitor can still sign in.
            if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/web-storage-unsupported') {
              showMessage(friendlyAuthError(error), 'info');
              return auth.signInWithRedirect(provider).catch(function (redirectError) {
                showMessage(friendlyAuthError(redirectError), 'error');
                finish();
              });
            }
            showMessage(friendlyAuthError(error), 'error');
            finish();
          });
        });
      }
    });
  }

  ready(function () {
    setupMobileNavigation();
    setupAuth();
  });
})();
`;
}

export function generateReadme(project: Project): string {
  const filenames = generatePageFilenames(project);
  const pagesList = project.pages
    .map(p => `- **${p.name}**: \`${filenames.get(p.id) || slugToFilename(p.slug, p.isHome)}\` (Slug: \`${p.slug}\`)`)
    .join('\n');

  const firebaseConfigured = hasFirebaseConfig(project);
  const hasAuthElement = project.pages.some(page =>
    Object.values(page.elements).some(element => element.type === 'auth')
  );

  const fbNote = firebaseConfigured
    ? `
### ⚡ Firebase Authentication
This website includes a configured Firebase client SDK (project \`${project.settings.firebaseConfig?.projectId}\`).

Before going live:
1. Add every domain that serves this site to **Firebase Console → Authentication → Settings → Authorized domains**.
2. Enable the **Email/Password** provider (and **Google** if the Google button is shown).
3. Keep the redirect URL of each login card pointing at a page of this site.

The Firebase web config shipped in \`js/main.js\` is a public client identifier — it is safe to expose. Never add server-side secrets or service-account keys here.
`
    : hasAuthElement
      ? `
### ⚠️ Authentication not configured
A login card was added but no Firebase configuration is enabled, so the form is rendered in a
disabled state. Add your Firebase keys in **SiteBuilder → Settings → Firebase Auth Integration**
and export again.
`
      : '';

  return `# ${project.name}

Exported website created with **SiteBuilder**.

## 📂 File Structure

\`\`\`
├── index.html        # Main landing page
├── [pages].html      # Additional site pages
├── css/
│   └── styles.css    # Clean, responsive CSS with mobile breakpoints
├── js/
│   └── main.js       # Minimal vanilla JavaScript: mobile navigation + Firebase Auth
├── assets/           # Images uploaded in the builder (embedded data URLs are extracted)
└── README.md         # This document
\`\`\`

The export is fully standalone: it has no dependency on the SiteBuilder editor runtime.
${fbNote}
## 📄 Pages Included
${pagesList}

## 🚀 How to Run Locally

You can open \`index.html\` directly in any web browser, or serve it using any standard HTTP server:

\`\`\`bash
# Using Python
python3 -m http.server 8000

# Using Node.js (npx)
npx serve .
\`\`\`

> Serve over HTTP (not \`file://\`) when using Firebase Authentication or Google Fonts.

---
*Generated by SiteBuilder — Zero Lock-in Visual Website Builder.*
`;
}

/** Human readable issues that would make the export incomplete. */
export function collectExportWarnings(project: Project): string[] {
  const warnings: string[] = [];

  if (project.pages.length === 0) {
    warnings.push('This project has no pages, so the export would be empty.');
  }

  const config = project.settings?.firebaseConfig;
  const authElementCount = project.pages.reduce(
    (total, page) => total + Object.values(page.elements).filter(el => el.type === 'auth').length,
    0
  );

  if (authElementCount > 0 && !hasFirebaseConfig(project)) {
    warnings.push(
      'Login cards are exported in a disabled state: add and enable your Firebase web config in Settings → Firebase Auth Integration.'
    );
    if (config?.enabled && (!config.apiKey || !config.projectId)) {
      warnings.push('Firebase Auth is enabled but the API key or project id is missing.');
    }
  }

  const seenSlugs = new Map<string, number>();
  project.pages.forEach(page => {
    const filename = slugToFilename(page.slug, page.isHome);
    seenSlugs.set(filename, (seenSlugs.get(filename) || 0) + 1);
  });
  seenSlugs.forEach((count, filename) => {
    if (count > 1) {
      warnings.push(`Several pages map to "${filename}"; the extra pages were exported with a numbered file name.`);
    }
  });

  const pageSlugs = new Set<string>();
  project.pages.forEach(page => {
    pageSlugs.add(page.slug);
    pageSlugs.add(page.slug.replace(/^\//, ''));
  });

  project.pages.forEach(page => {
    Object.values(page.elements).forEach(element => {
      if (element.type === 'image' && !element.props.src) {
        warnings.push(`An image on "${page.name}" has no source and will render empty.`);
      }
      if (element.props.customClass && sanitizeClassName(element.props.customClass) !== element.props.customClass.trim()) {
        warnings.push(`Unsafe characters were removed from a custom class on "${page.name}".`);
      }
      if ((element.type === 'link' || element.type === 'button') && element.props.href) {
        const href = element.props.href.trim();
        const isExternal =
          /^(https?:)?\/\//i.test(href) ||
          href.startsWith('#') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('data:');
        if (!isExternal && !pageSlugs.has(href) && !pageSlugs.has(href.replace(/^\//, ''))) {
          warnings.push(
            `A ${element.type} on "${page.name}" points to "${href}", which is not a page in this project.`
          );
        }
      }
      if (element.props.src && element.props.src.startsWith('data:image/') && element.props.src.length > 2_000_000) {
        warnings.push('A very large embedded image was included; consider hosting it externally for better performance.');
      }
      (element.props.navLinks || []).forEach(link => {
        const href = (link.href || '').trim();
        const isExternal = /^(https?:)?\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:');
        if (!isExternal && href && !pageSlugs.has(href) && !pageSlugs.has(href.replace(/^\//, ''))) {
          warnings.push(`The navbar link "${link.label}" points to "${href}", which is not a page in this project.`);
        }
      });
    });
  });

  return Array.from(new Set(warnings));
}

export function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}:;,])\s*/g, '$1')
    .replace(/;}/g, '}')
    .trim();
}

export function minifyHTML(html: string): string {
  return html
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .trim();
}

export function minifyJS(js: string): string {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\n)\s*\/\/[^\n]*/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

export async function exportProjectToZip(project: Project, options: ExportOptions = {}): Promise<Blob> {
  // JSZip is ~100 kB of the bundle and is only needed when a ZIP export is
  // actually requested, so it is loaded on demand.
  const { default: JSZip } = await import('jszip');
  const zip = new JSZip();

  // Asset mapping: Base64/DataURL -> assets/img_1.png
  const assetMap = new Map<string, string>();
  const assetsFolder = zip.folder('assets');

  let assetCount = 1;
  const processAsset = (dataUrl: string): string => {
    if (!dataUrl.startsWith('data:image/')) return dataUrl;
    if (assetMap.has(dataUrl)) return assetMap.get(dataUrl)!;

    const match = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (!match) return dataUrl;

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1].replace('+xml', '');
    const filename = `assets/img_${assetCount}.${ext}`;
    const base64Data = match[2];

    if (assetsFolder) {
      assetsFolder.file(`img_${assetCount}.${ext}`, base64Data, { base64: true });
    }
    assetMap.set(dataUrl, filename);
    assetCount++;
    return filename;
  };

  const extractDataUrl = (val?: string): string | null => {
    if (!val) return null;
    const match = val.match(/data:image\/[a-zA-Z+]+;base64,[^'")\s]+/);
    return match ? match[0] : null;
  };

  // Pre-scan for assets (element sources + project media library + background images)
  for (const page of project.pages) {
    for (const el of Object.values(page.elements)) {
      if (el.props.src && el.props.src.startsWith('data:image/')) {
        processAsset(el.props.src);
      }
      const baseBg = extractDataUrl(el.styles?.backgroundImage);
      if (baseBg) processAsset(baseBg);
      const tabBg = extractDataUrl(el.responsiveStyles?.tablet?.backgroundImage);
      if (tabBg) processAsset(tabBg);
      const mobBg = extractDataUrl(el.responsiveStyles?.mobile?.backgroundImage);
      if (mobBg) processAsset(mobBg);
    }
  }
  for (const asset of project.assets || []) {
    if (asset.dataUrl && asset.dataUrl.startsWith('data:image/')) {
      processAsset(asset.dataUrl);
    }
  }

  const filenames = generatePageFilenames(project);

  // Generate CSS
  let cssContent = generateProjectCSS(project, assetMap);
  if (options.minify) {
    cssContent = minifyCSS(cssContent);
  }
  zip.file('css/styles.css', cssContent);

  // Generate JS
  let jsContent = generateClientJS(project);
  if (options.minify) {
    jsContent = minifyJS(jsContent);
  }
  zip.file('js/main.js', jsContent);

  // Generate HTML for each page
  for (const page of project.pages) {
    const filename = filenames.get(page.id) || slugToFilename(page.slug, page.isHome);
    let html = generatePageHTML(page, project, assetMap, filenames);
    if (options.minify) {
      html = minifyHTML(html);
    }
    zip.file(filename, html);
  }

  // Generate README
  zip.file('README.md', generateReadme(project));

  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
