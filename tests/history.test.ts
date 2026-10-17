import { describe, it, expect } from 'vitest';
import { createHistory, pushHistory, undoHistory, redoHistory } from '../src/utils/history';
import { createStarterProject } from '../src/utils/defaults';

describe('Undo / Redo History Stack', () => {
  it('initializes with clean past and future', () => {
    const project = createStarterProject('Base');
    const history = createHistory(project);
    expect(history.past).toHaveLength(0);
    expect(history.future).toHaveLength(0);
    expect(history.present.name).toBe('Base');
  });

  it('pushes new project state to history', () => {
    const p1 = createStarterProject('V1');
    let history = createHistory(p1);

    const p2 = { ...p1, name: 'V2' };
    history = pushHistory(history, p2);

    expect(history.past).toHaveLength(1);
    expect(history.past[0].name).toBe('V1');
    expect(history.present.name).toBe('V2');
    expect(history.future).toHaveLength(0);
  });

  it('handles undo correctly', () => {
    const p1 = createStarterProject('V1');
    let history = createHistory(p1);

    const p2 = { ...p1, name: 'V2' };
    history = pushHistory(history, p2);

    // Undo back to V1
    history = undoHistory(history);
    expect(history.past).toHaveLength(0);
    expect(history.present.name).toBe('V1');
    expect(history.future).toHaveLength(1);
    expect(history.future[0].name).toBe('V2');
  });

  it('handles redo correctly', () => {
    const p1 = createStarterProject('V1');
    let history = createHistory(p1);

    const p2 = { ...p1, name: 'V2' };
    history = pushHistory(history, p2);

    history = undoHistory(history);
    history = redoHistory(history);

    expect(history.present.name).toBe('V2');
    expect(history.past).toHaveLength(1);
    expect(history.future).toHaveLength(0);
  });

  it('clears redo stack upon new action', () => {
    const p1 = createStarterProject('V1');
    let history = createHistory(p1);

    const p2 = { ...p1, name: 'V2' };
    history = pushHistory(history, p2);

    history = undoHistory(history);
    expect(history.future).toHaveLength(1);

    // Perform fresh action V3
    const p3 = { ...p1, name: 'V3' };
    history = pushHistory(history, p3);

    expect(history.future).toHaveLength(0);
    expect(history.present.name).toBe('V3');
  });

  it('debounces rapid continuous text edits into single history entry', () => {
    const p1 = createStarterProject('V1');
    let history = createHistory(p1);

    // First text input stroke
    const t1 = { ...p1, name: 'H' };
    history = pushHistory(history, t1, true);
    expect(history.past).toHaveLength(1);

    // Second rapid stroke within debounce threshold
    const t2 = { ...p1, name: 'He' };
    history = pushHistory(history, t2, true);
    // Should still have only 1 past entry because it was replaced
    expect(history.past).toHaveLength(1);
    expect(history.present.name).toBe('He');
  });
});
