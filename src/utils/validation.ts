import {
  Project,
  Page,
  SiteElement,
  ElementType,
  ElementStyles,
  ElementProps,
  Spacing,
  Asset,
  FirebaseConfig
} from '../types/document';
import {
  sanitizeUrl,
  sanitizeSlug,
  sanitizePlainText,
  sanitizeCssValue,
  sanitizeClassName,
  sanitizeCustomCss
} from './sanitize';

export const PROJECT_SCHEMA_VERSION = 1;

export const ELEMENT_TYPES: ElementType[] = [
  'section',
  'container',
  'grid',
  'card',
  'heading',
  'paragraph',
  'button',
  'image',
  'link',
  'divider',
  'spacer',
  'shape',
  'list',
  'navbar',
  'auth'
];

const MAX_ELEMENT_DEPTH = 50;
const MAX_PAGES = 200;
const MAX_ELEMENTS_PER_PAGE = 2000;
const MAX_ASSETS = 500;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  /** Non-fatal issues that were repaired automatically. */
  warnings: string[];
  repairedProject?: Project;
}

type RawRecord = Record<string, any>;

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeSpacing(value: unknown): Partial<Spacing> | undefined {
  if (!isRecord(value)) return undefined;
  const out: Partial<Spacing> = {};
  (['top', 'right', 'bottom', 'left'] as const).forEach(side => {
    const sanitized = sanitizeCssValue(value[side]);
    if (sanitized !== undefined) out[side] = sanitized;
  });
  return Object.keys(out).length > 0 ? out : undefined;
}

const STYLE_STRING_KEYS: Array<keyof ElementStyles> = [
  'fontFamily',
  'fontSize',
  'fontWeight',
  'lineHeight',
  'letterSpacing',
  'textAlign',
  'color',
  'textTransform',
  'textDecoration',
  'display',
  'flexDirection',
  'justifyContent',
  'alignItems',
  'flexWrap',
  'gap',
  'gridTemplateColumns',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'transform',
  'width',
  'maxWidth',
  'minWidth',
  'height',
  'maxHeight',
  'minHeight',
  'backgroundColor',
  'backgroundImage',
  'backgroundSize',
  'backgroundPosition',
  'overflow',
  'borderWidth',
  'borderStyle',
  'borderColor',
  'borderRadius',
  'boxShadow'
];

export function sanitizeElementStyles(value: unknown, warnings?: string[]): ElementStyles {
  if (!isRecord(value)) return {};

  const out: ElementStyles = {};

  for (const key of STYLE_STRING_KEYS) {
    if (value[key] === undefined || value[key] === null) continue;
    const sanitized = sanitizeCssValue(value[key]);
    if (sanitized === undefined) {
      warnings?.push(`Dropped unsafe CSS value for "${String(key)}".`);
      continue;
    }
    (out as RawRecord)[key] = sanitized;
  }

  if (typeof value.opacity === 'number' && Number.isFinite(value.opacity)) {
    out.opacity = Math.min(1, Math.max(0, value.opacity));
  }
  if (typeof value.zIndex === 'number' && Number.isFinite(value.zIndex)) {
    out.zIndex = Math.trunc(value.zIndex);
  } else if (typeof value.zIndex === 'string' && /^-?\d+$/.test(value.zIndex.trim())) {
    out.zIndex = parseInt(value.zIndex.trim(), 10);
  }

  const padding = sanitizeSpacing(value.padding);
  if (padding) out.padding = padding;
  const margin = sanitizeSpacing(value.margin);
  if (margin) out.margin = margin;

  return out;
}

function sanitizeProps(value: unknown, warnings?: string[]): ElementProps {
  if (!isRecord(value)) return {};
  const out: ElementProps = {};

  if (value.text !== undefined) out.text = sanitizePlainText(value.text);

  if (value.headingLevel !== undefined) {
    const level = Number(value.headingLevel);
    if (Number.isInteger(level) && level >= 1 && level <= 6) {
      out.headingLevel = level as ElementProps['headingLevel'];
    } else {
      warnings?.push(`Invalid heading level "${String(value.headingLevel)}" was reset to H2.`);
      out.headingLevel = 2;
    }
  }

  if (value.href !== undefined) out.href = sanitizeUrl(String(value.href));
  if (value.src !== undefined) out.src = sanitizeUrl(String(value.src));
  if (value.alt !== undefined) out.alt = sanitizePlainText(value.alt, 500);
  if (value.brandText !== undefined) out.brandText = sanitizePlainText(value.brandText, 200);
  if (value.brandLink !== undefined) out.brandLink = sanitizeUrl(String(value.brandLink));
  if (value.customClass !== undefined) out.customClass = sanitizeClassName(value.customClass);
  if (value.authTitle !== undefined) out.authTitle = sanitizePlainText(value.authTitle, 200);
  if (value.authSubtitle !== undefined) out.authSubtitle = sanitizePlainText(value.authSubtitle, 400);
  if (value.authRedirect !== undefined) out.authRedirect = sanitizeUrl(String(value.authRedirect));

  if (value.target !== undefined) {
    out.target = value.target === '_blank' ? '_blank' : '_self';
  }
  if (value.objectFit !== undefined) {
    out.objectFit = ['cover', 'contain', 'fill', 'none'].includes(value.objectFit)
      ? value.objectFit
      : 'cover';
  }
  if (value.shapeType !== undefined) {
    out.shapeType = ['rectangle', 'circle', 'pill'].includes(value.shapeType)
      ? value.shapeType
      : 'rectangle';
  }
  if (value.listType !== undefined) {
    out.listType = value.listType === 'ordered' ? 'ordered' : 'unordered';
  }
  if (value.listItems !== undefined) {
    if (Array.isArray(value.listItems)) {
      out.listItems = value.listItems
        .slice(0, 100)
        .map(item => sanitizePlainText(item, 500))
        .filter(item => item.length > 0);
    } else {
      warnings?.push('List items were not an array and were reset.');
      out.listItems = [];
    }
  }
  if (value.navLinks !== undefined) {
    if (Array.isArray(value.navLinks)) {
      out.navLinks = value.navLinks
        .slice(0, 40)
        .map((link: unknown, index: number) => {
          const rec = isRecord(link) ? link : {};
          return {
            id: sanitizeClassName(rec.id) || `nav_${index + 1}`,
            label: sanitizePlainText(rec.label, 120),
            href: sanitizeUrl(String(rec.href ?? '#'))
          };
        });
    } else {
      warnings?.push('Navbar links were not an array and were reset.');
      out.navLinks = [];
    }
  }
  if (value.enableGoogleAuth !== undefined) {
    out.enableGoogleAuth = Boolean(value.enableGoogleAuth);
  }
  if (value.authMode !== undefined) {
    out.authMode = ['login', 'signup', 'both'].includes(value.authMode)
      ? value.authMode
      : 'both';
  }

  return out;
}

function sanitizeElement(raw: unknown, key: string, warnings: string[]): SiteElement | null {
  if (!isRecord(raw)) {
    warnings.push(`Dropped invalid element entry "${key}".`);
    return null;
  }

  let type: ElementType = 'container';
  if (typeof raw.type === 'string' && (ELEMENT_TYPES as string[]).includes(raw.type)) {
    type = raw.type as ElementType;
  } else {
    warnings.push(`Unknown element type "${String(raw.type)}" was rendered as a container.`);
  }

  if (raw.id !== undefined && raw.id !== key) {
    warnings.push(`Element id "${String(raw.id)}" did not match its key and was normalized.`);
  }

  const responsive = isRecord(raw.responsiveStyles) ? raw.responsiveStyles : {};

  return {
    id: key,
    type,
    name: sanitizePlainText(raw.name, 120) || type,
    parentId: typeof raw.parentId === 'string' ? raw.parentId : null,
    children: Array.isArray(raw.children)
      ? raw.children.filter((child: unknown): child is string => typeof child === 'string')
      : [],
    props: sanitizeProps(raw.props, warnings),
    styles: sanitizeElementStyles(raw.styles, warnings),
    responsiveStyles: {
      tablet: sanitizeElementStyles(responsive.tablet, warnings),
      mobile: sanitizeElementStyles(responsive.mobile, warnings)
    }
  };
}

/** Repairs a page element graph so it is a valid, acyclic tree rooted at `rootId`. */
function sanitizePageElements(
  input: unknown,
  rawRootId: unknown,
  pageId: string,
  errors: string[],
  warnings: string[]
): { rootElementId: string; elements: Record<string, SiteElement> } {
  const source = isRecord(input) ? input : {};
  const elements: Record<string, SiteElement> = {};

  const sourceKeys = Object.keys(source);
  if (sourceKeys.length > MAX_ELEMENTS_PER_PAGE) {
    warnings.push(`Page "${pageId}" had too many elements; extras were dropped.`);
  }

  for (const key of sourceKeys.slice(0, MAX_ELEMENTS_PER_PAGE)) {
    const element = sanitizeElement(source[key], key, warnings);
    if (element) elements[key] = element;
  }

  // Resolve the root element, falling back to a sensible candidate.
  let rootId = typeof rawRootId === 'string' ? rawRootId : '';
  if (!rootId || !elements[rootId]) {
    const candidate =
      Object.values(elements).find(el => !el.parentId) ||
      Object.values(elements)[0];
    if (!candidate) {
      errors.push(`Page "${pageId}" has no usable elements.`);
      const generatedRootId = 'root_recovered';
      elements[generatedRootId] = {
        id: generatedRootId,
        type: 'container',
        name: 'Page Root',
        parentId: null,
        children: [],
        props: {},
        styles: { width: '100%', minHeight: '100vh' },
        responsiveStyles: {}
      };
      return { rootElementId: generatedRootId, elements };
    }
    errors.push(
      `Page "${pageId}" rootElementId "${String(rawRootId)}" does not exist in elements map.`
    );
    rootId = candidate.id;
  }

  const rootElement = elements[rootId];
  const attachToRoot = (childId: string) => {
    const child = elements[childId];
    if (!child) return;
    child.parentId = rootId;
    if (!rootElement.children.includes(childId)) {
      rootElement.children.push(childId);
    }
  };

  // 1. Clean child references: drop dangling, duplicated and self references.
  for (const element of Object.values(elements)) {
    const seen = new Set<string>();
    element.children = element.children.filter(childId => {
      if (childId === element.id || childId === rootId) {
        warnings.push(`Removed an invalid child reference on "${element.name}".`);
        return false;
      }
      if (!elements[childId]) {
        warnings.push(`Removed a dangling child reference on "${element.name}".`);
        return false;
      }
      if (seen.has(childId)) return false;
      seen.add(childId);
      return true;
    });
  }

  // 2. Walk the tree from the root: detects cycles and caps nesting depth.
  const visited = new Set<string>([rootId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    const element = elements[id];
    if (!element) continue;

    element.children = element.children.filter(childId => {
      if (visited.has(childId)) {
        // Cycle or shared node: keep the content but detach the duplicate edge.
        attachToRoot(childId);
        return false;
      }
      if (depth + 1 > MAX_ELEMENT_DEPTH) {
        warnings.push(
          `Element nesting exceeded ${MAX_ELEMENT_DEPTH} levels; deep children were re-parented to the page root.`
        );
        visited.add(childId);
        attachToRoot(childId);
        queue.push({ id: childId, depth: 0 });
        return false;
      }
      visited.add(childId);
      queue.push({ id: childId, depth: depth + 1 });
      return true;
    });
  }

  // 3. Re-attach anything unreachable from the root (orphans / cycle victims).
  const reattachQueue: string[] = [];
  for (const element of Object.values(elements)) {
    if (visited.has(element.id)) continue;
    warnings.push(`Element "${element.name}" was not reachable from the page root and was re-attached.`);
    visited.add(element.id);
    attachToRoot(element.id);
    reattachQueue.push(element.id);
  }
  // Walk re-attached sub-trees so no nested cycles can survive.
  const walkQueue: Array<{ id: string; depth: number }> = reattachQueue.map(id => ({ id, depth: 0 }));
  while (walkQueue.length > 0) {
    const { id, depth } = walkQueue.shift()!;
    const element = elements[id];
    if (!element) continue;
    element.children = element.children.filter(childId => {
      if (visited.has(childId) && childId !== id) {
        attachToRoot(childId);
        return false;
      }
      if (depth + 1 > MAX_ELEMENT_DEPTH) {
        visited.add(childId);
        attachToRoot(childId);
        walkQueue.push({ id: childId, depth: 0 });
        return false;
      }
      visited.add(childId);
      walkQueue.push({ id: childId, depth: depth + 1 });
      return true;
    });
  }

  // 4. Enforce a single owner per element and rebuild parentId references.
  const ownerOf = new Map<string, string>();
  // The root claims its children first for deterministic ordering.
  for (const element of [rootElement, ...Object.values(elements).filter(el => el.id !== rootId)]) {
    element.children = element.children.filter(childId => {
      if (!elements[childId] || childId === rootId || childId === element.id) return false;
      if (ownerOf.has(childId)) {
        warnings.push(`Removed a duplicate child reference on "${element.name}".`);
        return false;
      }
      ownerOf.set(childId, element.id);
      return true;
    });
  }

  for (const element of Object.values(elements)) {
    if (element.id === rootId) {
      element.parentId = null;
      continue;
    }
    const expectedParent = ownerOf.get(element.id) || rootId;
    if (element.parentId !== expectedParent) {
      warnings.push(`Fixed an inconsistent parent reference on "${element.name}".`);
      element.parentId = expectedParent;
    }
    if (expectedParent === rootId && !rootElement.children.includes(element.id)) {
      rootElement.children.push(element.id);
    }
  }

  return { rootElementId: rootId, elements };
}

function sanitizeFirebaseConfig(value: unknown): FirebaseConfig | undefined {
  if (!isRecord(value)) return undefined;

  const rawOpts = isRecord(value.options) ? (value.options as Record<string, unknown>) : {};
  const options = {
    enableAuth: rawOpts.enableAuth !== undefined ? Boolean(rawOpts.enableAuth) : true,
    enableGoogleAuth: rawOpts.enableGoogleAuth !== undefined ? Boolean(rawOpts.enableGoogleAuth) : true,
    enableEmailAuth: rawOpts.enableEmailAuth !== undefined ? Boolean(rawOpts.enableEmailAuth) : true,
    enableAnonymousAuth: Boolean(rawOpts.enableAnonymousAuth),
    enableAnalytics: rawOpts.enableAnalytics !== undefined ? Boolean(rawOpts.enableAnalytics) : Boolean(value.measurementId),
    enableFirestore: Boolean(rawOpts.enableFirestore),
    enableRealtimeDb: rawOpts.enableRealtimeDb !== undefined ? Boolean(rawOpts.enableRealtimeDb) : Boolean(value.databaseURL),
    enableStorage: rawOpts.enableStorage !== undefined ? Boolean(rawOpts.enableStorage) : Boolean(value.storageBucket),
    persistence: (rawOpts.persistence === 'SESSION' || rawOpts.persistence === 'NONE' ? rawOpts.persistence : 'LOCAL') as 'LOCAL' | 'SESSION' | 'NONE',
    defaultRedirect: sanitizePlainText(rawOpts.defaultRedirect, 200).trim() || '/'
  };

  const config: FirebaseConfig = {
    apiKey: sanitizePlainText(value.apiKey, 300).trim(),
    authDomain: sanitizePlainText(value.authDomain, 300).trim(),
    projectId: sanitizePlainText(value.projectId, 300).trim(),
    storageBucket: sanitizePlainText(value.storageBucket, 300).trim() || undefined,
    messagingSenderId: sanitizePlainText(value.messagingSenderId, 100).trim() || undefined,
    appId: sanitizePlainText(value.appId, 300).trim() || undefined,
    measurementId: sanitizePlainText(value.measurementId, 100).trim() || undefined,
    databaseURL: sanitizePlainText(value.databaseURL, 300).trim() || undefined,
    enabled: false,
    options
  };

  config.enabled = Boolean(value.enabled) && Boolean(config.apiKey && config.projectId);
  return config;
}

function sanitizeAssets(value: unknown, warnings: string[]): Asset[] {
  if (!Array.isArray(value)) return [];

  const assets: Asset[] = [];
  for (const raw of value.slice(0, MAX_ASSETS)) {
    if (!isRecord(raw) || typeof raw.dataUrl !== 'string') {
      warnings.push('Dropped an invalid media asset entry.');
      continue;
    }
    const dataUrl = sanitizeUrl(raw.dataUrl);
    if (dataUrl === '#' && raw.dataUrl.trim() !== '#') {
      warnings.push(`Dropped asset "${String(raw.name || 'unnamed')}" because its source is not a supported image.`);
      continue;
    }
    assets.push({
      id: sanitizePlainText(raw.id, 120) || `asset_${assets.length + 1}`,
      name: sanitizePlainText(raw.name, 200) || 'asset',
      type: sanitizePlainText(raw.type, 120) || 'image/png',
      size: Number.isFinite(raw.size) ? Math.max(0, Number(raw.size)) : 0,
      dataUrl,
      createdAt: Number.isFinite(raw.createdAt) ? Number(raw.createdAt) : Date.now()
    });
  }
  return assets;
}

function uniqueSlug(base: string, used: Set<string>): string {
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}-${index}`)) index += 1;
  return `${base}-${index}`;
}

export function validateProject(project: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    return { isValid: false, errors: ['Project must be a valid object'], warnings };
  }

  const source = project as RawRecord;

  if (typeof source.id !== 'string' || !source.id.trim()) {
    errors.push('Project missing or invalid id');
  }

  if (typeof source.name !== 'string' || !source.name.trim()) {
    errors.push('Project missing or invalid name');
  }

  const rawPages = Array.isArray(source.pages) ? source.pages : [];
  if (!Array.isArray(source.pages) || rawPages.length === 0) {
    errors.push('Project must have at least one page');
  }
  if (rawPages.length > MAX_PAGES) {
    warnings.push(`Project had more than ${MAX_PAGES} pages; extras were dropped.`);
  }

  const pages: Page[] = [];
  const usedSlugs = new Set<string>();
  const pageIds = new Set<string>();

  // Home pages are processed first so "/" always belongs to the homepage.
  const orderedRawPages = [...rawPages]
    .slice(0, MAX_PAGES)
    .sort((a, b) => Number(Boolean(isRecord(b) && b.isHome)) - Number(Boolean(isRecord(a) && a.isHome)));

  let homeAssigned = false;

  for (const rawPage of orderedRawPages) {
    if (!isRecord(rawPage)) {
      warnings.push('Dropped an invalid page entry.');
      continue;
    }

    let pageId = sanitizePlainText(rawPage.id, 120);
    if (!pageId) {
      errors.push('Page missing valid id');
      continue;
    }
    if (pageIds.has(pageId)) {
      errors.push(`Duplicate page id detected: ${pageId}`);
      pageId = `${pageId}-${pageIds.size + 1}`;
    }
    pageIds.add(pageId);

    const wantsHome = Boolean(rawPage.isHome) && !homeAssigned;
    if (wantsHome) homeAssigned = true;

    const { rootElementId, elements } = sanitizePageElements(
      rawPage.elements,
      rawPage.rootElementId,
      pageId,
      errors,
      warnings
    );

    let slug = sanitizeSlug(
      sanitizePlainText(rawPage.slug, 200) || (wantsHome ? '/' : `/${sanitizePlainText(rawPage.name, 80) || 'page'}`)
    );
    if (wantsHome) {
      slug = '/';
    } else if (slug === '/') {
      // The homepage owns "/", so any other page claiming it is a duplicate.
      errors.push('Duplicate slug detected: / (renamed to /page)');
      slug = uniqueSlug('/page', usedSlugs);
    }

    if (usedSlugs.has(slug)) {
      const repaired = uniqueSlug(slug, usedSlugs);
      errors.push(`Duplicate slug detected: ${slug} (renamed to ${repaired})`);
      slug = repaired;
    }
    usedSlugs.add(slug);

    pages.push({
      id: pageId,
      name: sanitizePlainText(rawPage.name, 200) || (wantsHome ? 'Home' : 'Page'),
      slug,
      isHome: wantsHome,
      title: sanitizePlainText(rawPage.title, 300),
      description: sanitizePlainText(rawPage.description, 500),
      rootElementId,
      elements
    });
  }

  // Guarantee a homepage exists.
  const hasHome = pages.some(page => page.isHome);
  if (!hasHome && pages.length > 0) {
    errors.push('Project has no homepage; the first page was promoted to home.');
    pages[0].isHome = true;
    pages[0].slug = '/';
  }

  const settings = isRecord(source.settings) ? source.settings : {};

  const repairedProject: Project = {
    id: sanitizePlainText(source.id, 120) || 'proj_repaired',
    name: sanitizePlainText(source.name, 200) || 'Untitled Site',
    createdAt: Number(source.createdAt) || Date.now(),
    updatedAt: Number(source.updatedAt) || Date.now(),
    schemaVersion: Number.isFinite(source.schemaVersion)
      ? Math.max(1, Math.trunc(source.schemaVersion))
      : PROJECT_SCHEMA_VERSION,
    settings: {
      siteTitle:
        sanitizePlainText(settings.siteTitle, 200) ||
        sanitizePlainText(source.name, 200) ||
        'My Website',
      favicon:
        settings.favicon !== undefined && settings.favicon !== ''
          ? sanitizeUrl(String(settings.favicon))
          : '',
      defaultFont: sanitizePlainText(settings.defaultFont, 200) || 'Inter, sans-serif',
      primaryColor: sanitizePlainText(settings.primaryColor, 60) || '#f59e0b',
      customCss: sanitizeCustomCss(settings.customCss),
      firebaseConfig: sanitizeFirebaseConfig(settings.firebaseConfig)
    },
    pages,
    assets: sanitizeAssets(source.assets, warnings)
  };

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    repairedProject
  };
}
