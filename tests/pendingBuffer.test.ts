import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  writePendingBuffer,
  readPendingBuffer,
  clearPendingBuffer
} from '../src/services/pendingBuffer';
import { createStarterProject } from '../src/utils/defaults';

function createFakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: key => (map.has(key) ? map.get(key)! : null),
    key: index => [...map.keys()][index] ?? null,
    removeItem: key => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, String(value));
    }
  };
}

describe('Pending Buffer (crash-safe autosave)', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createFakeStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a project snapshot through localStorage', () => {
    const project = createStarterProject('Buffered Project');
    const written = writePendingBuffer(project);

    expect(written).toBe(true);
    expect(storage.length).toBe(1);

    const entry = readPendingBuffer(project.id);
    expect(entry).not.toBeNull();
    expect(entry?.projectId).toBe(project.id);
    expect(entry?.project.name).toBe('Buffered Project');
    expect(entry?.project.pages.length).toBe(project.pages.length);
    expect(entry?.savedAt).toBeGreaterThan(0);
  });

  it('returns null for corrupt or incomplete entries instead of throwing', () => {
    storage.setItem('sitebuilder_pending_corrupt', '{not valid json');
    storage.setItem('sitebuilder_pending_missing', JSON.stringify({ savedAt: 123 }));

    expect(readPendingBuffer('corrupt')).toBeNull();
    expect(readPendingBuffer('missing')).toBeNull();
    expect(readPendingBuffer('absent')).toBeNull();
  });

  it('clears the buffer for a project', () => {
    const project = createStarterProject('Clear Me');
    writePendingBuffer(project);
    expect(readPendingBuffer(project.id)).not.toBeNull();

    clearPendingBuffer(project.id);
    expect(readPendingBuffer(project.id)).toBeNull();
    expect(storage.length).toBe(0);
  });

  it('fails safely when localStorage is unavailable', () => {
    vi.unstubAllGlobals();
    // Node has no localStorage: the buffer must degrade to a no-op.
    const project = createStarterProject('No Storage');
    expect(writePendingBuffer(project)).toBe(false);
    expect(readPendingBuffer(project.id)).toBeNull();
    expect(() => clearPendingBuffer(project.id)).not.toThrow();
  });
});
