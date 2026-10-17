import { describe, it, expect } from 'vitest';
import {
  exportProjectToJson,
  parseProjectFile,
  projectFileName,
  withUniqueName,
  ProjectImportError,
  PROJECT_FILE_FORMAT,
  PROJECT_FILE_VERSION,
  PROJECT_FILE_EXTENSION
} from '../src/services/projectIO';
import { createStarterProject } from '../src/utils/defaults';
import { Project } from '../src/types/document';

async function blobToText(blob: Blob): Promise<string> {
  return await blob.text();
}

describe('Project File Import / Export', () => {
  it('round-trips a project through the versioned envelope', async () => {
    const project = createStarterProject('Round Trip');
    const blob = exportProjectToJson(project);

    const parsed = parseProjectFile(await blobToText(blob));

    expect(parsed.isLegacyPayload).toBe(false);
    expect(parsed.exportedAt).not.toBeNull();
    expect(parsed.project.name).toBe('Round Trip');
    expect(parsed.project.pages.length).toBe(project.pages.length);
    expect(parsed.project.id).toBe(project.id);
  });

  it('accepts legacy raw project JSON without the envelope', async () => {
    const project = createStarterProject('Legacy Payload');
    const parsed = parseProjectFile(JSON.stringify(project));

    expect(parsed.isLegacyPayload).toBe(true);
    expect(parsed.project.name).toBe('Legacy Payload');
  });

  it('rejects empty, non-JSON and non-project payloads with a clear message', () => {
    expect(() => parseProjectFile('')).toThrow(ProjectImportError);
    expect(() => parseProjectFile('   ')).toThrow(/empty/i);
    expect(() => parseProjectFile('{broken json')).toThrow(/not valid JSON/i);
    expect(() => parseProjectFile('"just a string"')).toThrow(ProjectImportError);
    expect(() => parseProjectFile('[]')).toThrow(ProjectImportError);
  });

  it('refuses project files from a newer app version', () => {
    const envelope = JSON.stringify({
      format: PROJECT_FILE_FORMAT,
      version: PROJECT_FILE_VERSION + 1,
      app: 'SiteBuilder',
      exportedAt: Date.now(),
      project: createStarterProject('Future')
    });

    expect(() => parseProjectFile(envelope)).toThrow(/newer SiteBuilder version/i);
  });

  it('refuses projects that declare a newer schema version', () => {
    const project = createStarterProject('New Schema') as Project & { schemaVersion: number };
    project.schemaVersion = 999;

    expect(() => parseProjectFile(JSON.stringify(project))).toThrow(/schema version 999/i);
  });

  it('rejects envelopes with an unknown format marker', () => {
    const envelope = JSON.stringify({
      format: 'some-other-tool',
      version: 1,
      project: createStarterProject('Alien')
    });

    expect(() => parseProjectFile(envelope)).toThrow(/Unsupported file format/i);
  });

  it('repairs importable problems and reports them', () => {
    const project = createStarterProject('Repair Me');
    // Introduce duplicate slugs, an unreachable element and a bogus style value.
    project.pages[1].slug = project.pages[0].slug;
    const orphan = {
      id: 'orphan_el',
      type: 'paragraph' as const,
      name: 'Orphan',
      parentId: 'missing_parent',
      children: [],
      props: { text: 'Detached' },
      styles: { backgroundImage: 'url(javascript:alert(1))' },
      responsiveStyles: {}
    };
    project.pages[0].elements[orphan.id] = orphan;

    const parsed = parseProjectFile(JSON.stringify(project));
    const slugs = parsed.project.pages.map(page => page.slug);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(parsed.repaired.length).toBeGreaterThan(0);
    expect(parsed.project.pages[0].elements[orphan.id]).toBeDefined();
    expect(parsed.project.pages[0].elements[orphan.id].styles.backgroundImage).toBeUndefined();
  });

  it('rejects files that contain no usable page content', () => {
    const broken = {
      id: 'proj_empty',
      name: 'Empty',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      schemaVersion: 1,
      settings: {},
      pages: []
    };

    expect(() => parseProjectFile(JSON.stringify(broken))).toThrow(ProjectImportError);
  });

  it('generates unique, filesystem-safe project file names', () => {
    expect(projectFileName('My Website')).toBe(`my-website${PROJECT_FILE_EXTENSION}`);
    expect(projectFileName('My Website', [`my-website${PROJECT_FILE_EXTENSION}`])).toBe(
      `my-website-2${PROJECT_FILE_EXTENSION}`
    );
    expect(projectFileName('!!!')).toBe(`project${PROJECT_FILE_EXTENSION}`);
  });

  it('resolves duplicate project names when importing', () => {
    expect(withUniqueName('Landing', [])).toBe('Landing');
    expect(withUniqueName('Landing', ['Landing'])).toBe('Landing (2)');
    expect(withUniqueName('Landing', ['Landing', 'Landing (2)'])).toBe('Landing (3)');
    expect(withUniqueName('Landing (2)', ['Landing (2)'])).toBe('Landing (3)');
    expect(withUniqueName('   ', [])).toBe('Imported Website');
  });
});
