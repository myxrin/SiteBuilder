import { Project } from '../types/document';
import { validateProject } from '../utils/validation';

const KEY_PREFIX = 'sitebuilder_pending_';

export interface PendingBufferEntry {
  projectId: string;
  savedAt: number;
  project: Project;
}

function key(projectId: string): string {
  return `${KEY_PREFIX}${projectId}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Synchronously mirrors the newest unsaved snapshot into localStorage.
 *
 * IndexedDB writes are asynchronous and may be dropped when a tab is closed,
 * so this crash buffer is written during `pagehide`/`visibilitychange` to make
 * sure in-flight edits survive a reload or a browser crash.
 */
export function writePendingBuffer(project: Project): boolean {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const entry: PendingBufferEntry = {
      projectId: project.id,
      savedAt: Date.now(),
      project
    };
    storage.setItem(key(project.id), JSON.stringify(entry));
    return true;
  } catch {
    // Quota exceeded or storage disabled: autosave to IndexedDB still applies.
    return false;
  }
}

export function readPendingBuffer(projectId: string): PendingBufferEntry | null {
  const storage = getStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key(projectId));
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.project) return null;

    const check = validateProject(parsed.project);
    if (!check.repairedProject) return null;

    return {
      projectId,
      savedAt: Number(parsed.savedAt) || 0,
      project: check.repairedProject
    };
  } catch {
    return null;
  }
}

export function clearPendingBuffer(projectId: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key(projectId));
  } catch {
    // Ignore: nothing actionable for the user here.
  }
}
