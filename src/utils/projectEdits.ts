import { Project, Page, SiteElement, ElementStyles, Viewport } from '../types/document';

/** Returns a new project with `pageId` replaced by the result of `updater`. */
export function updatePageInProject(
  project: Project,
  pageId: string,
  updater: (page: Page) => Page
): Project {
  let changed = false;
  const pages = project.pages.map(page => {
    if (page.id !== pageId) return page;
    const next = updater(page);
    if (next !== page) changed = true;
    return next;
  });
  if (!changed) return project;
  return { ...project, pages };
}

/**
 * Applies an element-level edit immutably.
 * `updater` receives the current element and returns the next element, or `null`
 * when nothing should change (avoids empty history entries).
 */
export function commitProjectEdit(
  project: Project,
  elementId: string,
  updater: (element: SiteElement, page: Page) => SiteElement | null
): Project {
  for (const page of project.pages) {
    const element = page.elements[elementId];
    if (!element) continue;

    const nextElement = updater(element, page);
    if (!nextElement || nextElement === element) return project;

    return updatePageInProject(project, page.id, currentPage => ({
      ...currentPage,
      elements: { ...currentPage.elements, [elementId]: nextElement }
    }));
  }
  return project;
}

/** Shallow comparison used to skip no-op edits. */
export function shallowEqualRecord<T extends object>(current: T, next: Partial<T>): boolean {
  const keys = Object.keys(next) as Array<keyof T>;
  return keys.every(key => current[key] === (next as T)[key]);
}

/** Inserts a new element under `parentId` at an optional index. */
export function addElementToProject(
  project: Project,
  pageId: string,
  element: SiteElement,
  parentId: string,
  index?: number
): Project {
  return updatePageInProject(project, pageId, page => {
    const parent = page.elements[parentId];
    if (!parent) return page;

    const children = [...parent.children];
    const uniqueChildren = children.filter(id => id !== element.id);
    const insertAt = typeof index === 'number' && index >= 0 && index <= uniqueChildren.length
      ? index
      : uniqueChildren.length;
    uniqueChildren.splice(insertAt, 0, element.id);

    return {
      ...page,
      elements: {
        ...page.elements,
        [element.id]: element,
        [parentId]: { ...parent, children: uniqueChildren }
      }
    };
  });
}

/** Merges styles into the base styles or into a responsive override set. */
export function applyResponsiveStyle(
  element: SiteElement,
  viewport: Viewport,
  styles: Partial<ElementStyles>
): SiteElement {
  if (viewport === 'desktop') {
    return { ...element, styles: { ...element.styles, ...styles } };
  }
  const overrides = element.responsiveStyles?.[viewport] || {};
  return {
    ...element,
    responsiveStyles: {
      ...element.responsiveStyles,
      [viewport]: { ...overrides, ...styles }
    }
  };
}

/** Reads the effective, merged style set for a viewport. */
export function mergeStylesForViewport(element: SiteElement, viewport: Viewport): ElementStyles {
  const base = element.styles || {};
  if (viewport === 'desktop') return base;
  const override = element.responsiveStyles?.[viewport] || {};
  return { ...base, ...override };
}

/** Depth-first count of the elements that precede `elementId` in document order. */
export function countElementsBefore(root: SiteElement, elementsMap: Record<string, SiteElement>, elementId: string): number {
  let count = 0;
  let found = false;

  const walk = (element: SiteElement) => {
    if (found) return;
    if (element.id === elementId) {
      found = true;
      return;
    }
    count += 1;
    element.children.forEach(childId => {
      const child = elementsMap[childId];
      if (child) walk(child);
    });
  };

  walk(root);
  return count;
}

/** Deep clone of a page with fresh element ids. */
export function clonePageWithNewIds(page: Page, idFactory: (kind: string) => string): Page {
  const clone: Page = JSON.parse(JSON.stringify(page));
  clone.id = idFactory('page');

  const idMap = new Map<string, string>();
  Object.keys(clone.elements).forEach(oldId => idMap.set(oldId, idFactory('el')));

  const elements: Record<string, SiteElement> = {};
  Object.values(clone.elements).forEach(oldEl => {
    const newId = idMap.get(oldEl.id)!;
    elements[newId] = {
      ...oldEl,
      id: newId,
      parentId: oldEl.parentId ? idMap.get(oldEl.parentId) || null : null,
      children: oldEl.children.map(childId => idMap.get(childId)!).filter(Boolean)
    };
  });

  clone.rootElementId = idMap.get(clone.rootElementId)!;
  clone.elements = elements;
  return clone;
}
