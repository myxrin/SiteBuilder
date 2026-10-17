import { Project, ProjectSummary, Asset } from '../types/document';
import { generateId } from '../utils/id';
import { validateProject, PROJECT_SCHEMA_VERSION } from '../utils/validation';
import { withUniqueName } from './projectIO';

const DB_NAME = 'sitebuilder_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_ASSETS = 'assets';

let dbPromise: Promise<IDBDatabase> | null = null;
let memoryFallbackActive = false;

function openDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB || memoryFallbackActive) {
    return Promise.reject(new Error('IndexedDB not supported'));
  }

  if (!dbPromise) {
    dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e: IDBVersionChangeEvent) => {
        const db = (req.result || (e.target as IDBOpenDBRequest).result);
        if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
          db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_ASSETS)) {
          db.createObjectStore(STORE_ASSETS, { keyPath: 'id' });
        }
      };

      req.onsuccess = () => {
        const db = req.result;
        // If another tab upgrades the schema, drop the cached connection.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };

      req.onerror = () => {
        memoryFallbackActive = true;
        dbPromise = null;
        reject(req.error);
      };
    });
  }

  return dbPromise.catch(error => {
    // IndexedDB is unavailable (private mode, blocked, older browser):
    // fall back to the in-memory/localStorage store for the rest of the session.
    memoryFallbackActive = true;
    throw error;
  });
}

function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(db => new Promise<T>((resolve, reject) => {
    let tx: IDBTransaction;
    try {
      tx = db.transaction(storeName, mode);
    } catch (error) {
      reject(error);
      return;
    }
    const store = tx.objectStore(storeName);
    const request = action(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onabort = () => reject(tx.error);
  }));
}

// Fallback Memory/LocalStorage storage when IndexedDB is not available (e.g. tests)
class MemoryStorage {
  private projects: Map<string, Project> = new Map();
  private assets: Map<string, Asset> = new Map();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      const stored = localStorage.getItem('sitebuilder_mem_projects');
      if (stored) {
        const list = JSON.parse(stored);
        list.forEach((p: Project) => this.projects.set(p.id, p));
      }
      const storedAssets = localStorage.getItem('sitebuilder_mem_assets');
      if (storedAssets) {
        const list = JSON.parse(storedAssets);
        list.forEach((a: Asset) => this.assets.set(a.id, a));
      }
    } catch {}
  }

  private syncToLocalStorage() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('sitebuilder_mem_projects', JSON.stringify(Array.from(this.projects.values())));
      localStorage.setItem('sitebuilder_mem_assets', JSON.stringify(Array.from(this.assets.values())));
    } catch {}
  }

  getProjects(): ProjectSummary[] {
    return Array.from(this.projects.values()).map(p => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      pagesCount: p.pages.length,
      elementsCount: p.pages.reduce((acc, pg) => acc + Object.keys(pg.elements).length, 0)
    }));
  }

  getProject(id: string): Project | null {
    return this.projects.get(id) || null;
  }

  saveProject(project: Project): Project {
    const stored = JSON.parse(JSON.stringify(project));
    this.projects.set(stored.id, stored);
    this.syncToLocalStorage();
    return stored;
  }

  deleteProject(id: string): void {
    this.projects.delete(id);
    this.syncToLocalStorage();
  }

  getAssets(): Asset[] {
    return Array.from(this.assets.values());
  }

  saveAsset(asset: Asset): void {
    this.assets.set(asset.id, asset);
    this.syncToLocalStorage();
  }

  deleteAsset(id: string): void {
    this.assets.delete(id);
    this.syncToLocalStorage();
  }
}

const memoryStorage = new MemoryStorage();

export interface ImportProjectOptions {
  /**
   * `copy` always creates a new entry (renaming on conflict),
   * `overwrite` replaces the project with the same id when it exists.
   */
  mode?: 'copy' | 'overwrite';
}

export const StorageService = {
  async getAllProjects(): Promise<ProjectSummary[]> {
    try {
      const projects = await withStore<Project[]>(STORE_PROJECTS, 'readonly', store => store.getAll());
      const summaries: ProjectSummary[] = (projects || []).map(p => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        pagesCount: p.pages?.length || 0,
        elementsCount: p.pages?.reduce((acc, pg) => acc + Object.keys(pg.elements || {}).length, 0) || 0
      }));
      return summaries.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return memoryStorage.getProjects().sort((a, b) => b.updatedAt - a.updatedAt);
    }
  },

  async getProject(id: string): Promise<Project | null> {
    let stored: Project | null = null;
    try {
      stored = (await withStore<Project | undefined>(STORE_PROJECTS, 'readonly', store => store.get(id))) || null;
    } catch {
      stored = memoryStorage.getProject(id);
    }
    if (!stored) return null;
    const check = validateProject(stored);
    return check.repairedProject || stored;
  },

  /** Returns the stored project (with the refreshed `updatedAt` timestamp). */
  async saveProject(project: Project): Promise<Project> {
    const updated: Project = {
      ...project,
      schemaVersion: PROJECT_SCHEMA_VERSION,
      updatedAt: Date.now()
    };

    try {
      await withStore(STORE_PROJECTS, 'readwrite', store => store.put(updated));
      return updated;
    } catch {
      return memoryStorage.saveProject(updated);
    }
  },

  async deleteProject(id: string): Promise<void> {
    try {
      await withStore(STORE_PROJECTS, 'readwrite', store => store.delete(id));
    } catch {
      memoryStorage.deleteProject(id);
    }
  },

  async duplicateProject(id: string): Promise<Project> {
    const original = await this.getProject(id);
    if (!original) {
      throw new Error('Project not found');
    }

    const existing = await this.getAllProjects();
    const cloned: Project = JSON.parse(JSON.stringify(original));
    cloned.id = generateId('proj');
    cloned.name = withUniqueName(`${original.name} (Copy)`, existing.map(p => p.name));
    cloned.createdAt = Date.now();
    cloned.updatedAt = Date.now();

    await this.saveProject(cloned);
    return cloned;
  },

  /**
   * Stores an imported project. Never destroys existing data: name conflicts are
   * resolved by renaming, and id conflicts only overwrite when explicitly asked.
   */
  async importProject(project: Project, options: ImportProjectOptions = {}): Promise<Project> {
    const mode = options.mode || 'copy';
    const existing = await this.getAllProjects();
    const withSameId = await this.getProject(project.id);

    if (mode === 'overwrite' && withSameId) {
      const stored = await this.saveProject({ ...project, id: withSameId.id, createdAt: withSameId.createdAt });
      return stored;
    }

    let id = project.id;
    if (withSameId || !id) {
      id = generateId('proj');
    }

    const names = existing.map(p => p.name);
    const imported: Project = {
      ...project,
      id,
      name: withUniqueName(project.name || 'Imported Website', names),
      schemaVersion: PROJECT_SCHEMA_VERSION,
      createdAt: project.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    const stored = await this.saveProject(imported);
    // Keep the media library aware of assets shipped with the backup.
    for (const asset of imported.assets || []) {
      try {
        await this.saveAsset(asset);
      } catch {
        // Assets are best-effort: the project itself is already stored.
      }
    }
    return stored;
  },

  async saveAsset(asset: Asset): Promise<void> {
    try {
      await withStore(STORE_ASSETS, 'readwrite', store => store.put(asset));
    } catch {
      memoryStorage.saveAsset(asset);
    }
  },

  async getAllAssets(): Promise<Asset[]> {
    try {
      const assets = await withStore<Asset[]>(STORE_ASSETS, 'readonly', store => store.getAll());
      return (assets || []).sort((a, b) => b.createdAt - a.createdAt);
    } catch {
      return memoryStorage.getAssets().sort((a, b) => b.createdAt - a.createdAt);
    }
  },

  async deleteAsset(id: string): Promise<void> {
    try {
      await withStore(STORE_ASSETS, 'readwrite', store => store.delete(id));
    } catch {
      memoryStorage.deleteAsset(id);
    }
  }
};
