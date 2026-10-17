import { Project } from '../types/document';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

export interface SaveControllerOptions {
  /**
   * Persists one snapshot of the project. The controller guarantees that calls
   * never overlap and that snapshots are written in chronological order.
   */
  save: (project: Project) => Promise<void>;
  /** Debounce delay in milliseconds before a dirty snapshot is written. */
  delay?: number;
  /** Called whenever the derived save status changes. */
  onStatusChange?: (status: SaveStatus) => void;
  /** Called after a snapshot was successfully persisted. */
  onSaved?: (project: Project) => void;
  /** Injectable timer helpers (used by tests). */
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface SaveController {
  /** Marks the project as dirty and schedules a debounced save. */
  markDirty: (project: Project) => void;
  /** Persists the latest dirty snapshot immediately (no-op when clean). */
  flush: () => Promise<boolean>;
  /** Discards the pending timer without saving. */
  cancel: () => void;
  /** True when a newer snapshot still needs to be written. */
  hasPending: () => boolean;
  getStatus: () => SaveStatus;
  getLastError: () => unknown;
}

const DEFAULT_DELAY = 1500;

/**
 * Debounced, monotonic autosave controller.
 *
 * Guarantees:
 * - Rapid changes are coalesced into a single write of the newest snapshot.
 * - Writes are serialized, so an older snapshot can never overwrite a newer one.
 * - The status is derived from real state (`saved` only when nothing is pending).
 * - Failures are surfaced through the status callback instead of being swallowed.
 */
export function createSaveController(options: SaveControllerOptions): SaveController {
  const {
    save,
    delay = DEFAULT_DELAY,
    onStatusChange,
    onSaved,
    setTimer = (fn, ms) => setTimeout(fn, ms),
    clearTimer = handle => clearTimeout(handle as ReturnType<typeof setTimeout>)
  } = options;

  let pending: Project | null = null;
  let timer: unknown = null;
  let seq = 0;
  let pendingSeq = 0;
  let inFlightSeq = -1;
  let inFlight = false;
  let running: Promise<boolean> | null = null;
  let lastError: unknown = null;
  let status: SaveStatus = 'saved';

  const deriveStatus = (): SaveStatus => {
    if (inFlight && pending && pendingSeq === inFlightSeq) return 'saving';
    if (pending) return lastError ? 'error' : 'unsaved';
    if (lastError) return 'error';
    return 'saved';
  };

  const emitStatus = () => {
    const next = deriveStatus();
    if (next !== status) {
      status = next;
      onStatusChange?.(next);
    }
  };

  const clearPendingTimer = () => {
    if (timer !== null) {
      clearTimer(timer);
      timer = null;
    }
  };

  const run = (): Promise<boolean> => {
    // A running loop already re-checks `pending`, so callers can just await it.
    if (running) return running;

    running = (async () => {
      inFlight = true;

      while (pending) {
        const snapshot = pending;
        const targetSeq = pendingSeq;
        inFlightSeq = targetSeq;
        emitStatus();

        try {
          await save(snapshot);
        } catch (error) {
          // Keep the snapshot pending so the next flush retries it.
          lastError = error;
          break;
        }

        if (seq === targetSeq) {
          pending = null;
        }
        lastError = null;
        onSaved?.(snapshot);
      }

      inFlight = false;
      inFlightSeq = -1;
      emitStatus();
      return lastError === null;
    })().finally(() => {
      running = null;
      emitStatus();
    });

    return running;
  };

  return {
    markDirty(project: Project) {
      pending = project;
      seq += 1;
      pendingSeq = seq;
      clearPendingTimer();
      timer = setTimer(() => {
        timer = null;
        void run();
      }, delay);
      emitStatus();
    },

    async flush() {
      clearPendingTimer();
      if (!pending && !running) {
        emitStatus();
        return lastError === null;
      }
      return run();
    },

    cancel() {
      clearPendingTimer();
      pending = null;
      emitStatus();
    },

    hasPending() {
      return pending !== null;
    },

    getStatus() {
      return status;
    },

    getLastError() {
      return lastError;
    }
  };
}
