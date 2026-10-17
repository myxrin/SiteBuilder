import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Project,
  Page,
  SiteElement,
  ElementType,
  Viewport,
  ElementStyles,
  ElementProps,
  Asset,
  ProjectSettings
} from '../types/document';
import { createHistory, pushHistory, undoHistory, redoHistory, HistoryState, HistoryPushOptions } from '../utils/history';
import { StorageService } from '../services/storage';
import { createElement, createBlankPage } from '../utils/defaults';
import { generateId } from '../utils/id';
import { exportProjectToZip, downloadBlob, collectExportWarnings } from '../services/exporter';
import { exportProjectToJson } from '../services/projectIO';
import { createSaveController, SaveStatus } from '../services/saveController';
import { writePendingBuffer, clearPendingBuffer } from '../services/pendingBuffer';
import { commitProjectEdit, addElementToProject, shallowEqualRecord } from '../utils/projectEdits';

export type SidebarTab = 'elements' | 'layers' | 'pages' | 'assets' | 'settings';
export type { SaveStatus };

export interface EditorContextType {
  project: Project;
  activePageId: string;
  activePage: Page;
  activeViewport: Viewport;
  selectedElementId: string | null;
  selectedElement: SiteElement | null;
  hoveredElementId: string | null;
  activeSidebarTab: SidebarTab;
  zoomLevel: number;
  isPreviewMode: boolean;
  saveStatus: SaveStatus;
  canUndo: boolean;
  canRedo: boolean;
  assets: Asset[];
  exportWarnings: string[];

  // Navigation & View
  setActivePage: (id: string) => void;
  setActiveViewport: (v: Viewport) => void;
  setSelectedElementId: (id: string | null) => void;
  setHoveredElementId: (id: string | null) => void;
  setActiveSidebarTab: (tab: SidebarTab) => void;
  setZoomLevel: (zoom: number) => void;
  setIsPreviewMode: (preview: boolean) => void;

  // History & Saving
  undo: () => void;
  redo: () => void;
  saveProject: () => Promise<void>;

  // Project Actions
  updateProjectName: (name: string) => void;
  updateProjectSettings: (settings: Partial<ProjectSettings>) => void;

  // Page Actions
  addPage: (name: string, slug: string) => void;
  updatePage: (pageId: string, updates: Partial<Page>) => void;
  deletePage: (pageId: string) => { ok: boolean; message: string };
  duplicatePage: (pageId: string) => string;

  // Element Actions
  addElement: (type: ElementType, targetParentId?: string, index?: number) => string;
  updateElementProps: (elementId: string, props: Partial<ElementProps>, isDebouncedText?: boolean) => void;
  updateElementStyles: (elementId: string, styles: Partial<ElementStyles>, viewport?: Viewport, isTransient?: boolean) => void;
  renameElement: (elementId: string, name: string) => void;
  resetViewportStyles: (elementId: string, viewport: Viewport) => void;
  moveElement: (elementId: string, targetParentId: string, targetIndex?: number, transient?: boolean) => void;
  duplicateElement: (elementId: string) => void;
  deleteElement: (elementId: string) => void;

  // Asset Actions
  uploadAsset: (file: File) => Promise<Asset>;
  deleteAsset: (assetId: string) => Promise<void>;
  insertAssetAsImage: (asset: Asset) => void;

  // Export
  exportZip: () => Promise<string[]>;
  exportProjectFile: () => void;
}

const EditorContext = createContext<EditorContextType | null>(null);

export function useEditor() {
  const ctx = useContext(EditorContext);
  if (!ctx) {
    throw new Error('useEditor must be used within an EditorProvider');
  }
  return ctx;
}

export function findPage(project: Project, pageId: string): Page | undefined {
  return project.pages.find(page => page.id === pageId);
}

/** Coalescing window used for continuous interactions such as typing or dragging. */
const CONTINUOUS_EDIT_WINDOW = 1200;

interface EditorProviderProps {
  initialProject: Project;
  /** True when `initialProject` came from the crash buffer and still needs persisting. */
  recoveredFromBuffer?: boolean;
  onClose?: () => void;
  children: React.ReactNode;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({
  initialProject,
  recoveredFromBuffer = false,
  children
}) => {
  const [history, setHistory] = useState<HistoryState>(() => createHistory(initialProject));
  // Mirror of the newest history state. Actions read from this ref so that several
  // updates performed inside one event handler always build on each other (React
  // state updates are asynchronous and would otherwise lose earlier changes).
  const historyRef = useRef<HistoryState>(history);

  const [activePageId, setActivePageId] = useState<string>(
    initialProject.pages.find(p => p.isHome)?.id || initialProject.pages[0]?.id || ''
  );
  const [activeViewport, setActiveViewport] = useState<Viewport>('desktop');
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<SidebarTab>('elements');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isPreviewMode, setIsPreviewMode] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [assets, setAssets] = useState<Asset[]>(initialProject.assets || []);
  const [exportWarnings, setExportWarnings] = useState<string[]>([]);

  // Autosave controller: debounced, serialized and failure-aware.
  const saveControllerRef = useRef<ReturnType<typeof createSaveController> | null>(null);
  if (!saveControllerRef.current) {
    saveControllerRef.current = createSaveController({
      save: project => StorageService.saveProject(project).then(() => undefined),
      delay: 1200,
      onStatusChange: status => setSaveStatus(status),
      onSaved: saved => clearPendingBuffer(saved.id)
    });
  }
  const saveController = saveControllerRef.current;

  // A snapshot recovered from the crash buffer is not yet in IndexedDB: schedule
  // a write so the recovered work becomes permanent (the buffer clears on save).
  useEffect(() => {
    if (recoveredFromBuffer) {
      saveController.markDirty(historyRef.current.present);
    }
    // Intentionally mount-only: the flag never changes for a given provider instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const project = history.present;
  const activePage = findPage(project, activePageId) || project.pages[0];
  const selectedElement =
    activePage && selectedElementId ? activePage.elements[selectedElementId] || null : null;

  // Keep the mirrored history in sync when React re-renders.
  historyRef.current = history;

  // Load all persistent assets
  useEffect(() => {
    StorageService.getAllAssets().then(loaded => {
      if (loaded && loaded.length > 0) {
        setAssets(loaded);
      }
    }).catch(() => {});
  }, []);

  /**
   * Applies a state transition and keeps the ref/state in sync.
   * Both the history entries and the element id tree are copy-on-write, so the
   * previous snapshots stay untouched for undo/redo.
   */
  const applyHistory = useCallback((nextHistory: HistoryState): HistoryState => {
    if (nextHistory !== historyRef.current) {
      historyRef.current = nextHistory;
      setHistory(nextHistory);
    }
    return nextHistory;
  }, []);

  /** Keeps the active page/selection pointing at something that still exists. */
  const reconcileView = useCallback((nextProject: Project) => {
    setActivePageId(prevPageId => {
      if (findPage(nextProject, prevPageId)) return prevPageId;
      return nextProject.pages.find(p => p.isHome)?.id || nextProject.pages[0]?.id || '';
    });
    setSelectedElementId(prevSelected => {
      if (!prevSelected) return prevSelected;
      const stillExists = nextProject.pages.some(page => Boolean(page.elements[prevSelected]));
      return stillExists ? prevSelected : null;
    });
  }, []);

  const commitProjectChange = useCallback(
    (updater: (latest: Project) => Project, options: HistoryPushOptions = {}) => {
      const current = historyRef.current;
      const updatedProject = updater(current.present);
      if (!updatedProject || updatedProject === current.present) {
        return current.present;
      }
      const next = pushHistory(current, updatedProject, options);
      applyHistory(next);
      // Every document change schedules an autosave (including undo/redo callers).
      saveController.markDirty(next.present);
      return next.present;
    },
    [applyHistory, saveController]
  );

  const saveProject = useCallback(async () => {
    await saveController.flush();
  }, [saveController]);

  const undo = useCallback(() => {
    const current = historyRef.current;
    const next = undoHistory(current);
    if (next === current) return;
    applyHistory(next);
    reconcileView(next.present);
    saveController.markDirty(next.present);
  }, [applyHistory, reconcileView, saveController]);

  const redo = useCallback(() => {
    const current = historyRef.current;
    const next = redoHistory(current);
    if (next === current) return;
    applyHistory(next);
    reconcileView(next.present);
    saveController.markDirty(next.present);
  }, [applyHistory, reconcileView, saveController]);

  // Project Actions
  const updateProjectName = useCallback((name: string) => {
    commitProjectChange(latest => ({ ...latest, name }));
  }, [commitProjectChange]);

  const updateProjectSettings = useCallback((settings: Partial<ProjectSettings>) => {
    commitProjectChange(latest => ({
      ...latest,
      settings: { ...latest.settings, ...settings }
    }));
  }, [commitProjectChange]);

  // Page Actions
  const addPage = useCallback((name: string, slug: string) => {
    const newPage = createBlankPage(name, slug, false);
    commitProjectChange(latest => ({ ...latest, pages: [...latest.pages, newPage] }));
    setActivePageId(newPage.id);
    setSelectedElementId(null);
  }, [commitProjectChange]);

  const updatePage = useCallback((pageId: string, updates: Partial<Page>) => {
    commitProjectChange(latest => {
      if (updates.isHome) {
        const pages = latest.pages.map(page => {
          if (page.id !== pageId) {
            const cleanSlug = page.slug === '/'
              ? `/${page.name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'page'}`
              : page.slug;
            return { ...page, isHome: false, slug: cleanSlug };
          }
          return { ...page, ...updates, isHome: true, id: page.id };
        });
        return { ...latest, pages };
      }

      const pages = latest.pages.map(page => {
        if (page.id !== pageId) return page;
        return { ...page, ...updates, id: page.id };
      });
      return { ...latest, pages };
    });
  }, [commitProjectChange]);

  const deletePage = useCallback((pageId: string) => {
    const currentProject = historyRef.current.present;
    if (currentProject.pages.length <= 1) {
      return { ok: false, message: 'A website project must have at least one page.' };
    }
    const updated = commitProjectChange(latest => {
      const filtered = latest.pages.filter(page => page.id !== pageId);
      const hasHome = filtered.some(page => page.isHome);
      // Immutable homepage promotion (no mutation of existing state objects).
      const pages = hasHome ? filtered : filtered.map((page, index) => index === 0 ? { ...page, isHome: true } : page);
      return { ...latest, pages };
    });
    const fallbackPage = updated.pages.find(p => p.isHome) || updated.pages[0];
    setActivePageId(prev => findPage(updated, prev) ? prev : fallbackPage.id);
    setSelectedElementId(prev => {
      if (!prev || !fallbackPage) return null;
      const stillExists = updated.pages.some(page => Boolean(page.elements[prev]));
      return stillExists ? prev : null;
    });
    return { ok: true, message: '' };
  }, [commitProjectChange]);

  const duplicatePage = useCallback((pageId: string): string => {
    let newPageId = '';
    commitProjectChange(latest => {
      const original = latest.pages.find(page => page.id === pageId);
      if (!original) return latest;

      // Deep clone original page with new IDs
      const cloned: Page = JSON.parse(JSON.stringify(original));
      cloned.id = generateId('page');
      cloned.name = `${original.name} (Copy)`;
      cloned.slug = original.isHome ? '/page-copy' : `${original.slug}-copy`;
      cloned.isHome = false;
      cloned.title = original.title ? `${original.title} (Copy)` : cloned.name;

      // Remap element IDs
      const idMap = new Map<string, string>();
      Object.keys(cloned.elements).forEach(oldId => {
        idMap.set(oldId, generateId('el'));
      });

      const newElements: Record<string, SiteElement> = {};
      Object.values(cloned.elements).forEach(oldEl => {
        const newId = idMap.get(oldEl.id)!;
        newElements[newId] = {
          ...oldEl,
          id: newId,
          parentId: oldEl.parentId ? idMap.get(oldEl.parentId) || null : null,
          children: oldEl.children.map(childId => idMap.get(childId)!).filter(Boolean)
        };
      });

      cloned.rootElementId = idMap.get(cloned.rootElementId)!;
      cloned.elements = newElements;

      let slug = cloned.slug;
      let counter = 2;
      while (latest.pages.some(page => page.slug === slug)) {
        slug = `${cloned.slug}-${counter}`;
        counter += 1;
      }
      cloned.slug = slug;

      newPageId = cloned.id;
      return { ...latest, pages: [...latest.pages, cloned] };
    });
    if (newPageId) {
      setActivePageId(newPageId);
      setSelectedElementId(null);
    }
    return newPageId;
  }, [commitProjectChange]);

  // Element Actions
  const addElement = useCallback((type: ElementType, targetParentId?: string, index?: number): string => {
    const latest = historyRef.current.present;
    const page = findPage(latest, activePageId) || latest.pages[0];
    if (!page) return '';

    let parentId = targetParentId;
    if (!parentId) {
      if (selectedElementId && page.elements[selectedElementId]) {
        const selected = page.elements[selectedElementId];
        const containerTypes: ElementType[] = ['section', 'container', 'grid', 'card'];
        parentId = containerTypes.includes(selected.type)
          ? selected.id
          : selected.parentId || page.rootElementId;
      } else {
        parentId = page.rootElementId;
      }
    }
    if (!page.elements[parentId]) {
      parentId = page.rootElementId;
    }

    const newElement = createElement(type, parentId);
    commitProjectChange(latestProject => addElementToProject(latestProject, page.id, newElement, parentId, index));
    setSelectedElementId(newElement.id);
    return newElement.id;
  }, [activePageId, selectedElementId, commitProjectChange]);

  const updateElementProps = useCallback((
    elementId: string,
    props: Partial<ElementProps>,
    isDebouncedText: boolean = false
  ) => {
    commitProjectChange(
      latest => commitProjectEdit(latest, elementId, element => {
        if (shallowEqualRecord(element.props, props)) return null;
        return { ...element, props: { ...element.props, ...props } };
      }),
      isDebouncedText
        ? { coalesce: true, windowMs: CONTINUOUS_EDIT_WINDOW }
        : {}
    );
  }, [commitProjectChange]);

  const updateElementStyles = useCallback((
    elementId: string,
    styles: Partial<ElementStyles>,
    viewport: Viewport = activeViewport,
    isTransient: boolean = false
  ) => {
    const applyStyles = (target: Partial<ElementStyles>): Partial<ElementStyles> => {
      const next: Record<string, unknown> = { ...target };
      (Object.keys(styles) as Array<keyof ElementStyles>).forEach(key => {
        const value = styles[key];
        // `undefined` clears the property so it falls back to the base/inherited value.
        if (value === undefined) delete next[key as string];
        else next[key as string] = value;
      });
      return next as Partial<ElementStyles>;
    };

    const isUnchanged = (target: Partial<ElementStyles>): boolean =>
      (Object.keys(styles) as Array<keyof ElementStyles>).every(key => {
        const value = styles[key];
        return value === undefined ? target[key] === undefined : target[key] === value;
      });

    commitProjectChange(
      latest => commitProjectEdit(latest, elementId, element => {
        if (viewport === 'desktop') {
          if (isUnchanged(element.styles)) return null;
          return { ...element, styles: applyStyles(element.styles) };
        }
        const overrides = element.responsiveStyles?.[viewport] || {};
        if (isUnchanged(overrides)) return null;
        return {
          ...element,
          responsiveStyles: {
            ...element.responsiveStyles,
            [viewport]: applyStyles(overrides)
          }
        };
      }),
      isTransient ? { coalesce: true, windowMs: CONTINUOUS_EDIT_WINDOW } : {}
    );
  }, [activeViewport, commitProjectChange]);

  const renameElement = useCallback((elementId: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    commitProjectChange(latest => commitProjectEdit(latest, elementId, element => {
      if (element.name === trimmed) return null;
      return { ...element, name: trimmed };
    }));
  }, [commitProjectChange]);

  const resetViewportStyles = useCallback((elementId: string, viewport: Viewport) => {
    if (viewport === 'desktop') return;
    commitProjectChange(latest => commitProjectEdit(latest, elementId, element => {
      if (!element.responsiveStyles?.[viewport]) return null;
      return {
        ...element,
        responsiveStyles: { ...element.responsiveStyles, [viewport]: {} }
      };
    }));
  }, [commitProjectChange]);

  /**
   * Moves an element to a new parent/index. When `transient` is set the change is
   * coalesced into the previous history entry, so drag interactions stay undoable
   * as a single step instead of flooding the stack.
   */
  const moveElement = useCallback((
    elementId: string,
    targetParentId: string,
    targetIndex?: number,
    transient: boolean = false
  ) => {
    const latest = historyRef.current.present;
    const page = findPage(latest, activePageId) || latest.pages[0];
    if (!page || !page.elements[elementId] || !page.elements[targetParentId]) return;
    if (elementId === targetParentId) return;
    if (elementId === page.rootElementId) return;
    // Prevent dropping a node into its own subtree (would corrupt the tree).
    let probe: SiteElement | undefined = page.elements[targetParentId];
    while (probe) {
      if (probe.id === elementId) return;
      probe = probe.parentId ? page.elements[probe.parentId] : undefined;
    }

    const element = page.elements[elementId];
    if (!element.parentId || !page.elements[element.parentId]) return;

    commitProjectChange(latestProject => {
      const targetPage = findPage(latestProject, page.id);
      if (!targetPage) return latestProject;
      const moved = targetPage.elements[elementId];
      const targetParent = targetPage.elements[targetParentId];
      if (!moved || !targetParent) return latestProject;

      const parentChildren = moved.parentId && targetPage.elements[moved.parentId]
        ? targetPage.elements[moved.parentId].children.filter(id => id !== elementId)
        : [];

      const children = [...targetParent.children.filter(id => id !== elementId)];
      const insertAt = typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= children.length
        ? targetIndex
        : children.length;
      children.splice(insertAt, 0, elementId);

      return {
        ...latestProject,
        pages: latestProject.pages.map(p => {
          if (p.id !== targetPage.id) return p;
          const elements = { ...p.elements };
          if (moved.parentId && elements[moved.parentId]) {
            elements[moved.parentId] = { ...elements[moved.parentId], children: parentChildren };
          }
          elements[targetParentId] = { ...targetParent, children };
          elements[elementId] = { ...moved, parentId: targetParentId };
          return { ...p, elements };
        })
      };
    }, transient ? { coalesce: true, windowMs: CONTINUOUS_EDIT_WINDOW } : {});
  }, [activePageId, commitProjectChange]);

  const duplicateElement = useCallback((elementId: string) => {
    const latest = historyRef.current.present;
    const page = findPage(latest, activePageId) || latest.pages[0];
    if (!page || !page.elements[elementId]) return;
    if (elementId === page.rootElementId) return;

    const target = page.elements[elementId];
    const parentId = target.parentId;
    if (!parentId || !page.elements[parentId]) return;

    const elementsToClone: SiteElement[] = [];
    const collectDescendants = (id: string) => {
      const item = page.elements[id];
      if (!item) return;
      elementsToClone.push(item);
      item.children.forEach(collectDescendants);
    };
    collectDescendants(elementId);

    const idMap = new Map<string, string>();
    elementsToClone.forEach(item => idMap.set(item.id, generateId('el')));
    const topNewId = idMap.get(elementId)!;

    commitProjectChange(latestProject => {
      const targetPage = findPage(latestProject, page.id);
      if (!targetPage) return latestProject;
      const parent = targetPage.elements[parentId];
      if (!parent) return latestProject;

      const elements = { ...targetPage.elements };
      elementsToClone.forEach(item => {
        const newId = idMap.get(item.id)!;
        const isTop = item.id === elementId;
        const clone: SiteElement = JSON.parse(JSON.stringify(item));
        elements[newId] = {
          ...clone,
          id: newId,
          name: `${clone.name} (Copy)`,
          parentId: isTop ? parentId : idMap.get(item.parentId || '') || parentId,
          children: item.children.map(childId => idMap.get(childId)!).filter(Boolean)
        };
      });

      const originalIndex = parent.children.indexOf(elementId);
      const children = [...parent.children];
      children.splice(originalIndex + 1, 0, topNewId);
      elements[parentId] = { ...parent, children };

      return {
        ...latestProject,
        pages: latestProject.pages.map(p => p.id === targetPage.id ? { ...p, elements } : p)
      };
    });

    setSelectedElementId(topNewId);
  }, [activePageId, commitProjectChange]);

  const deleteElement = useCallback((elementId: string) => {
    const latest = historyRef.current.present;
    const page = findPage(latest, activePageId) || latest.pages[0];
    if (!page || !page.elements[elementId]) return;
    if (elementId === page.rootElementId) return;

    commitProjectChange(latestProject => {
      const targetPage = findPage(latestProject, page.id);
      if (!targetPage) return latestProject;

      const removed = new Set<string>();
      const collect = (id: string) => {
        const item = targetPage.elements[id];
        if (!item) return;
        removed.add(id);
        item.children.forEach(collect);
      };
      collect(elementId);

      const elements: Record<string, SiteElement> = {};
      Object.keys(targetPage.elements).forEach(id => {
        if (!removed.has(id)) elements[id] = targetPage.elements[id];
      });

      // Rebuild the parent's child list immutably.
      Object.keys(elements).forEach(id => {
        const item = elements[id];
        const cleaned = item.children.filter(childId => !removed.has(childId));
        if (cleaned.length !== item.children.length) {
          elements[id] = { ...item, children: cleaned };
        }
      });

      return {
        ...latestProject,
        pages: latestProject.pages.map(p => p.id === targetPage.id ? { ...p, elements } : p)
      };
    });

    setSelectedElementId(null);
  }, [activePageId, commitProjectChange]);

  // Asset Actions
  const uploadAsset = useCallback(async (file: File): Promise<Asset> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const dataUrl = reader.result as string;
          const asset: Asset = {
            id: generateId('asset'),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
            createdAt: Date.now()
          };
          await StorageService.saveAsset(asset);
          setAssets(prev => [asset, ...prev]);

          commitProjectChange(latest => ({
            ...latest,
            assets: [asset, ...(latest.assets || []).filter(existing => existing.id !== asset.id)]
          }));

          resolve(asset);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }, [commitProjectChange]);

  const deleteAsset = useCallback(async (assetId: string) => {
    await StorageService.deleteAsset(assetId);
    setAssets(prev => prev.filter(asset => asset.id !== assetId));
    commitProjectChange(latest => ({
      ...latest,
      assets: (latest.assets || []).filter(asset => asset.id !== assetId)
    }));
  }, [commitProjectChange]);

  /** Inserts a new image element already bound to the given asset (single commit). */
  const insertAssetAsImage = useCallback((asset: Asset) => {
    const latest = historyRef.current.present;
    const page = findPage(latest, activePageId) || latest.pages[0];
    if (!page) return;

    let parentId = page.rootElementId;
    if (selectedElementId && page.elements[selectedElementId]) {
      const selected = page.elements[selectedElementId];
      const containerTypes: ElementType[] = ['section', 'container', 'grid', 'card'];
      parentId = containerTypes.includes(selected.type)
        ? selected.id
        : selected.parentId || page.rootElementId;
    }

    const newElement = createElement('image', parentId, {
      props: { src: asset.dataUrl, alt: asset.name }
    });

    commitProjectChange(latestProject => addElementToProject(latestProject, page.id, newElement, parentId));
    setSelectedElementId(newElement.id);
  }, [activePageId, selectedElementId, commitProjectChange]);

  // Export
  const exportZip = useCallback(async (): Promise<string[]> => {
    const latest = historyRef.current.present;
    // Flush first so the exported HTML always matches the persisted document.
    await saveController.flush();
    const warnings = collectExportWarnings(latest);
    setExportWarnings(warnings);
    const blob = await exportProjectToZip(latest);
    const safeName = (latest.name || 'site').toLowerCase().replace(/[^a-z0-9]/g, '-');
    downloadBlob(blob, `${safeName}-export.zip`);
    return warnings;
  }, [saveController]);

  const exportProjectFile = useCallback(() => {
    const latest = historyRef.current.present;
    const blob = exportProjectToJson(latest);
    const safeName = (latest.name || 'project').toLowerCase().replace(/[^a-z0-9]/g, '-');
    downloadBlob(blob, `${safeName}.sitebuilder.json`);
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isFormField = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
      // Content-editable text (inline canvas editing, layer rename) must never
      // trigger editor shortcuts such as Delete-element or undo.
      const isEditable = isFormField || Boolean(target?.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (!isEditable) {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y')) {
        if (!isEditable) {
          e.preventDefault();
          redo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        if (!isEditable && selectedElementId) {
          e.preventDefault();
          duplicateElement(selectedElementId);
        }
      } else if (e.key === 'Escape') {
        if (isPreviewMode) {
          setIsPreviewMode(false);
        } else if (!isEditable) {
          setSelectedElementId(null);
        }
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isEditable) {
        if (selectedElementId && selectedElementId !== activePage?.rootElementId) {
          e.preventDefault();
          deleteElement(selectedElementId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, activePage, isPreviewMode, undo, redo, saveProject, duplicateElement, deleteElement]);

  // Persist pending edits when the tab is hidden/closed so a reload cannot lose work.
  useEffect(() => {
    const flushPending = () => {
      if (!saveController.hasPending()) return;
      // Synchronous crash buffer first, then the asynchronous storage write.
      writePendingBuffer(historyRef.current.present);
      void saveController.flush();
    };

    /**
     * Last-chance guard: pending edits are already mirrored into localStorage,
     * so we only interrupt the user when the last write actually failed and the
     * work exists nowhere durable.
     */
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      flushPending();
      if (saveController.getStatus() === 'error') {
        event.preventDefault();
        event.returnValue = 'Your latest changes could not be saved. Leave anyway?';
        return event.returnValue;
      }
      return undefined;
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPending();
    };

    window.addEventListener('pagehide', flushPending);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flushPending);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveController]);

  // Leaving the editor (back to the dashboard) must not drop pending edits.
  useEffect(() => {
    return () => {
      if (saveController.hasPending()) {
        void saveController.flush();
      }
    };
  }, [saveController]);

  const value: EditorContextType = useMemo(() => ({
    project,
    activePageId,
    activePage,
    activeViewport,
    selectedElementId,
    selectedElement,
    hoveredElementId,
    activeSidebarTab,
    zoomLevel,
    isPreviewMode,
    saveStatus,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    assets,
    exportWarnings,

    setActivePage: setActivePageId,
    setActiveViewport,
    setSelectedElementId,
    setHoveredElementId,
    setActiveSidebarTab,
    setZoomLevel,
    setIsPreviewMode,

    undo,
    redo,
    saveProject,

    updateProjectName,
    updateProjectSettings,

    addPage,
    updatePage,
    deletePage,
    duplicatePage,

    addElement,
    updateElementProps,
    updateElementStyles,
    renameElement,
    resetViewportStyles,
    moveElement,
    duplicateElement,
    deleteElement,

    uploadAsset,
    deleteAsset,
    insertAssetAsImage,

    exportZip,
    exportProjectFile
  }), [
    project,
    activePageId,
    activePage,
    activeViewport,
    selectedElementId,
    selectedElement,
    hoveredElementId,
    activeSidebarTab,
    zoomLevel,
    isPreviewMode,
    saveStatus,
    history.past.length,
    history.future.length,
    assets,
    exportWarnings,
    setActivePageId,
    setActiveViewport,
    setSelectedElementId,
    setHoveredElementId,
    setActiveSidebarTab,
    setZoomLevel,
    setIsPreviewMode,
    undo,
    redo,
    saveProject,
    updateProjectName,
    updateProjectSettings,
    addPage,
    updatePage,
    deletePage,
    duplicatePage,
    addElement,
    updateElementProps,
    updateElementStyles,
    renameElement,
    resetViewportStyles,
    moveElement,
    duplicateElement,
    deleteElement,
    uploadAsset,
    deleteAsset,
    insertAssetAsImage,
    exportZip,
    exportProjectFile
  ]);

  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};
