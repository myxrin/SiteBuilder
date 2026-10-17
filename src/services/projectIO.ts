import { Project } from '../types/document';
import { validateProject, PROJECT_SCHEMA_VERSION, ValidationResult } from '../utils/validation';

export const PROJECT_FILE_FORMAT = 'sitebuilder-project';
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXTENSION = '.sitebuilder.json';

export interface ProjectFileEnvelope {
  format: typeof PROJECT_FILE_FORMAT;
  version: number;
  app: 'SiteBuilder';
  exportedAt: number;
  project: Project;
}

export interface ParsedProjectFile {
  project: Project;
  /** Non-fatal issues that were repaired during import. */
  warnings: string[];
  /** Validation errors that were repaired (duplicate slugs, missing home page, ...). */
  repaired: string[];
  exportedAt: number | null;
  /** True when the payload did not use the envelope (raw project JSON). */
  isLegacyPayload: boolean;
}

export class ProjectImportError extends Error {
  readonly details: string[];

  constructor(message: string, details: string[] = []) {
    super(message);
    this.name = 'ProjectImportError';
    this.details = details;
  }
}

/** Serializes a project into a portable, versioned backup file. */
export function exportProjectToJson(project: Project): Blob {
  const envelope: ProjectFileEnvelope = {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    app: 'SiteBuilder',
    exportedAt: Date.now(),
    project: {
      ...project,
      // Stamp the current schema on the way out so old documents are upgraded.
      schemaVersion: PROJECT_SCHEMA_VERSION
    }
  };

  return new Blob([JSON.stringify(envelope, null, 2)], { type: 'application/json' });
}

export function projectFileName(projectName: string, taken: string[] = []): string {
  const base = (projectName || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'project';

  let candidate = `${base}${PROJECT_FILE_EXTENSION}`;
  let counter = 2;
  while (taken.includes(candidate)) {
    candidate = `${base}-${counter}${PROJECT_FILE_EXTENSION}`;
    counter += 1;
  }
  return candidate;
}

/**
 * Parses and validates a `.sitebuilder.json` backup.
 *
 * Accepts both the versioned envelope and a raw project object (legacy exports /
 * hand-edited files) and repairs safe issues while reporting every change.
 */
export function parseProjectFile(rawText: string): ParsedProjectFile {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new ProjectImportError('The selected file is empty.');
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawText);
  } catch (error) {
    throw new ProjectImportError('The file is not valid JSON.', [
      error instanceof Error ? error.message : String(error)
    ]);
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ProjectImportError('The file does not contain a SiteBuilder project.');
  }

  const record = payload as Record<string, unknown>;
  const isEnvelope = record.format === PROJECT_FILE_FORMAT || record.project !== undefined;

  let projectCandidate: unknown = payload;
  let exportedAt: number | null = null;

  if (isEnvelope) {
    if (record.format !== undefined && record.format !== PROJECT_FILE_FORMAT) {
      throw new ProjectImportError(
        `Unsupported file format "${String(record.format)}". Expected "${PROJECT_FILE_FORMAT}".`
      );
    }

    if (record.version !== undefined) {
      const version = Number(record.version);
      if (!Number.isFinite(version) || version < 1) {
        throw new ProjectImportError('The project file declares an invalid version.');
      }
      if (version > PROJECT_FILE_VERSION) {
        throw new ProjectImportError(
          `This project was exported by a newer SiteBuilder version (file version ${version}). Update the app before importing it.`
        );
      }
    }

    exportedAt = Number.isFinite(record.exportedAt) ? Number(record.exportedAt) : null;
    projectCandidate = record.project;
  }

  if (!projectCandidate || typeof projectCandidate !== 'object') {
    throw new ProjectImportError('The project file is missing project data.');
  }

  const nested = projectCandidate as Record<string, unknown>;
  const declaredSchema = Number(nested.schemaVersion);
  if (Number.isFinite(declaredSchema) && declaredSchema > PROJECT_SCHEMA_VERSION) {
    throw new ProjectImportError(
      `The project uses schema version ${declaredSchema}, which is newer than this app supports (${PROJECT_SCHEMA_VERSION}).`
    );
  }

  const validation: ValidationResult = validateProject(nested);
  if (!validation.repairedProject) {
    throw new ProjectImportError('The project could not be repaired.', validation.errors);
  }

  const pages = validation.repairedProject.pages;
  if (pages.length === 0) {
    throw new ProjectImportError('The project does not contain any page.', validation.errors);
  }
  if (!pages.some(page => page.rootElementId && page.elements[page.rootElementId])) {
    throw new ProjectImportError('The project has no usable page content.', validation.errors);
  }

  return {
    project: validation.repairedProject,
    warnings: validation.warnings,
    repaired: validation.errors,
    exportedAt,
    isLegacyPayload: !isEnvelope
  };
}

/** Reads a File coming from an <input type="file"> element. */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error || new Error('Unable to read the selected file.'));
    reader.readAsText(file);
  });
}

/** Ensures the imported project can be stored without clobbering another one. */
export function withUniqueName(name: string, existingNames: string[]): string {
  const trimmed = name.trim() || 'Imported Website';
  if (!existingNames.includes(trimmed)) return trimmed;

  const base = trimmed.replace(/\s*\(\d+\)$/, '');
  let counter = 2;
  let candidate = `${base} (${counter})`;
  while (existingNames.includes(candidate)) {
    counter += 1;
    candidate = `${base} (${counter})`;
  }
  return candidate;
}

export function summarizeProject(project: Project): { pages: number; elements: number; assets: number } {
  return {
    pages: project.pages.length,
    elements: project.pages.reduce((total, page) => total + Object.keys(page.elements).length, 0),
    assets: (project.assets || []).length
  };
}
