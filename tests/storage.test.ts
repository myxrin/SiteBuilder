import { describe, it, expect, beforeEach } from 'vitest';
import { StorageService } from '../src/services/storage';
import { createStarterProject } from '../src/utils/defaults';
import { Asset } from '../src/types/document';

describe('Storage Service Persistence', () => {
  it('saves and retrieves a project', async () => {
    const project = createStarterProject('Persist Test');
    await StorageService.saveProject(project);

    const retrieved = await StorageService.getProject(project.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(project.id);
    expect(retrieved?.name).toBe('Persist Test');
    expect(retrieved?.pages.length).toBeGreaterThanOrEqual(1);
  });

  it('lists project summaries with correct counts', async () => {
    const project = createStarterProject('Summary Test');
    await StorageService.saveProject(project);

    const all = await StorageService.getAllProjects();
    const found = all.find(p => p.id === project.id);
    expect(found).toBeDefined();
    expect(found?.pagesCount).toBe(project.pages.length);
    expect(found?.elementsCount).toBeGreaterThan(0);
  });

  it('duplicates an existing project', async () => {
    const original = createStarterProject('Original');
    await StorageService.saveProject(original);

    const copy = await StorageService.duplicateProject(original.id);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe('Original (Copy)');

    const copyRetrieved = await StorageService.getProject(copy.id);
    expect(copyRetrieved).toBeDefined();
    expect(copyRetrieved?.pages.length).toBe(original.pages.length);
  });

  it('deletes a project cleanly', async () => {
    const project = createStarterProject('To Delete');
    await StorageService.saveProject(project);

    await StorageService.deleteProject(project.id);
    const retrieved = await StorageService.getProject(project.id);
    expect(retrieved).toBeNull();
  });

  it('saves, retrieves, and deletes assets', async () => {
    const asset: Asset = {
      id: 'asset_test_1',
      name: 'test-icon.png',
      type: 'image/png',
      size: 1024,
      dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      createdAt: Date.now()
    };

    await StorageService.saveAsset(asset);
    const assets = await StorageService.getAllAssets();
    const found = assets.find(a => a.id === asset.id);
    expect(found).toBeDefined();
    expect(found?.name).toBe('test-icon.png');

    await StorageService.deleteAsset(asset.id);
    const afterDelete = await StorageService.getAllAssets();
    expect(afterDelete.find(a => a.id === asset.id)).toBeUndefined();
  });

  it('imports a project copy without clobbering existing data', async () => {
    const original = createStarterProject('Shared Import Name');
    await StorageService.saveProject(original);

    // Same id and name as an existing project: must be stored as a new entry.
    const duplicatePayload = JSON.parse(JSON.stringify(original));
    const imported = await StorageService.importProject(duplicatePayload);

    expect(imported.id).not.toBe(original.id);
    expect(imported.name).toBe('Shared Import Name (2)');

    const originalStillThere = await StorageService.getProject(original.id);
    expect(originalStillThere?.name).toBe('Shared Import Name');

    const all = await StorageService.getAllProjects();
    expect(all.filter(p => p.name.startsWith('Shared Import Name')).length).toBe(2);
  });

  it('overwrite mode replaces the project with the same id only when requested', async () => {
    const original = createStarterProject('Overwrite Target');
    await StorageService.saveProject(original);

    const updated = { ...original, name: 'Overwritten Name' };
    const stored = await StorageService.importProject(updated, { mode: 'overwrite' });

    expect(stored.id).toBe(original.id);
    const fetched = await StorageService.getProject(original.id);
    expect(fetched?.name).toBe('Overwritten Name');
  });
});
