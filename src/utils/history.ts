import { Project } from '../types/document';

const MAX_HISTORY = 40;
const DEFAULT_COALESCE_WINDOW = 800;

export interface HistoryState {
  past: Project[];
  present: Project;
  future: Project[];
  lastActionTime?: number;
  isDebouncedText?: boolean;
}

export interface HistoryPushOptions {
  /**
   * Merges this change into the current history entry when it happens shortly
   * after another coalesced change (used for keystrokes and drag-repositioning).
   */
  coalesce?: boolean;
  /** Milliseconds within which consecutive coalesced changes are merged. */
  windowMs?: number;
}

export function createHistory(initial: Project): HistoryState {
  return {
    past: [],
    present: JSON.parse(JSON.stringify(initial)),
    future: []
  };
}

export function pushHistory(
  state: HistoryState,
  newProject: Project,
  options: boolean | HistoryPushOptions = false
): HistoryState {
  const normalized: HistoryPushOptions =
    typeof options === 'boolean' ? { coalesce: options } : options;
  const coalesce = Boolean(normalized.coalesce);
  const windowMs = normalized.windowMs ?? DEFAULT_COALESCE_WINDOW;

  const now = Date.now();
  const timeSinceLast = now - (state.lastActionTime || 0);

  // Rapid continuous edits (typing, dragging) replace the current present state
  // instead of polluting the undo stack with every intermediate step.
  if (coalesce && state.isDebouncedText && timeSinceLast < windowMs) {
    return {
      ...state,
      present: JSON.parse(JSON.stringify(newProject)),
      future: [], // Clear redo on new action
      lastActionTime: now,
      isDebouncedText: true
    };
  }

  const past = [...state.past, JSON.parse(JSON.stringify(state.present))];
  if (past.length > MAX_HISTORY) {
    past.shift();
  }

  return {
    past,
    present: JSON.parse(JSON.stringify(newProject)),
    future: [], // New action clears redo stack
    lastActionTime: now,
    isDebouncedText: coalesce
  };
}

export function undoHistory(state: HistoryState): HistoryState {
  if (state.past.length === 0) return state;

  const previous = state.past[state.past.length - 1];
  const newPast = state.past.slice(0, state.past.length - 1);

  return {
    past: newPast,
    present: previous,
    future: [state.present, ...state.future],
    lastActionTime: Date.now(),
    isDebouncedText: false
  };
}

export function redoHistory(state: HistoryState): HistoryState {
  if (state.future.length === 0) return state;

  const next = state.future[0];
  const newFuture = state.future.slice(1);

  return {
    past: [...state.past, state.present],
    present: next,
    future: newFuture,
    lastActionTime: Date.now(),
    isDebouncedText: false
  };
}
