import { describe, it, expect, vi } from 'vitest';
import { createSaveController, SaveStatus } from '../src/services/saveController';
import { createStarterProject } from '../src/utils/defaults';
import { Project } from '../src/types/document';

/**
 * Deterministic timer harness: replaces setTimeout/clearTimeout so the tests
 * control exactly when a debounced save fires.
 */
function createTimerHarness() {
  let nextId = 1;
  const timers = new Map<number, () => void>();
  return {
    setTimer: (fn: () => void) => {
      const id = nextId++;
      timers.set(id, fn);
      return id;
    },
    clearTimer: (handle: unknown) => {
      timers.delete(handle as number);
    },
    fireAll: () => {
      const callbacks = [...timers.values()];
      timers.clear();
      callbacks.forEach(fn => fn());
    },
    pendingCount: () => timers.size
  };
}

function rename(project: Project, name: string): Project {
  return { ...project, name };
}

describe('Save Controller (autosave)', () => {
  it('coalesces rapid edits into a single write of the newest snapshot', async () => {
    const timers = createTimerHarness();
    const saved: string[] = [];
    const controller = createSaveController({
      save: async project => {
        saved.push(project.name);
      },
      ...timers
    });

    const base = createStarterProject('v0');
    controller.markDirty(rename(base, 'v1'));
    controller.markDirty(rename(base, 'v2'));
    controller.markDirty(rename(base, 'v3'));

    // Only one debounce timer may be pending at any time.
    expect(timers.pendingCount()).toBe(1);
    expect(controller.getStatus()).toBe('unsaved');

    timers.fireAll();
    await controller.flush();

    expect(saved).toEqual(['v3']);
    expect(controller.hasPending()).toBe(false);
    expect(controller.getStatus()).toBe('saved');
  });

  it('flush writes the pending snapshot immediately without waiting for the timer', async () => {
    const timers = createTimerHarness();
    const saved: string[] = [];
    const controller = createSaveController({
      save: async project => {
        saved.push(project.name);
      },
      ...timers
    });

    controller.markDirty(rename(createStarterProject('base'), 'immediate'));
    expect(timers.pendingCount()).toBe(1);

    await controller.flush();

    expect(saved).toEqual(['immediate']);
    expect(timers.pendingCount()).toBe(0);
    expect(controller.getStatus()).toBe('saved');
  });

  it('serializes writes and never persists snapshots out of order', async () => {
    const timers = createTimerHarness();
    const saved: string[] = [];
    let concurrent = 0;
    let maxConcurrent = 0;
    let releaseFirstSave: (() => void) | null = null;

    const controller = createSaveController({
      save: async project => {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        saved.push(project.name);
        if (project.name === 'A') {
          await new Promise<void>(resolve => {
            releaseFirstSave = resolve;
          });
        }
        concurrent -= 1;
      },
      ...timers
    });

    const base = createStarterProject('base');
    controller.markDirty(rename(base, 'A'));
    const firstFlush = controller.flush();

    // A newer edit arrives while "A" is still being written.
    controller.markDirty(rename(base, 'B'));
    const secondFlush = controller.flush();

    expect(releaseFirstSave).not.toBeNull();
    releaseFirstSave!();
    await Promise.all([firstFlush, secondFlush]);

    expect(saved).toEqual(['A', 'B']);
    expect(maxConcurrent).toBe(1);
    expect(controller.hasPending()).toBe(false);
  });

  it('reports an error status, keeps the snapshot pending and retries on the next flush', async () => {
    const timers = createTimerHarness();
    const statuses: SaveStatus[] = [];
    let attempts = 0;

    const controller = createSaveController({
      save: async () => {
        attempts += 1;
        if (attempts === 1) {
          throw new Error('IndexedDB unavailable');
        }
      },
      onStatusChange: status => statuses.push(status),
      ...timers
    });

    controller.markDirty(createStarterProject('failure test'));
    expect(controller.getStatus()).toBe('unsaved');

    timers.fireAll();
    await controller.flush();

    expect(attempts).toBe(1);
    expect(controller.getStatus()).toBe('error');
    expect(controller.hasPending()).toBe(true);
    expect(controller.getLastError()).toBeInstanceOf(Error);

    // A retry writes the same pending snapshot and clears the error.
    await controller.flush();
    expect(attempts).toBe(2);
    expect(controller.getStatus()).toBe('saved');
    expect(controller.hasPending()).toBe(false);
    expect(controller.getLastError()).toBeNull();

    expect(statuses).toEqual(['unsaved', 'saving', 'error', 'saving', 'saved']);
  });

  it('cancel drops pending changes without writing', async () => {
    const timers = createTimerHarness();
    const save = vi.fn(async () => {});
    const controller = createSaveController({ save, ...timers });

    controller.markDirty(createStarterProject('discarded'));
    controller.cancel();

    timers.fireAll();
    await controller.flush();

    expect(save).not.toHaveBeenCalled();
    expect(controller.hasPending()).toBe(false);
    expect(controller.getStatus()).toBe('saved');
  });
});
