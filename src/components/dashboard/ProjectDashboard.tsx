import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Copy,
  Trash2,
  Edit2,
  Clock,
  FileCode,
  Layout,
  ExternalLink,
  Sparkles,
  Loader2,
  Upload,
  AlertTriangle
} from 'lucide-react';
import { ProjectSummary, Project } from '../../types/document';
import { StorageService } from '../../services/storage';
import { createStarterProject, createBlankPage } from '../../utils/defaults';
import { generateId } from '../../utils/id';
import { DraggableModal } from '../common/DraggableModal';
import {
  parseProjectFile,
  readFileAsText,
  ProjectImportError,
  PROJECT_FILE_EXTENSION
} from '../../services/projectIO';

interface ProjectDashboardProps {
  onOpenProject: (projectId: string) => void;
}

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ onOpenProject }) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState('');
  const [templateType, setTemplateType] = useState<'starter' | 'blank'>('starter');

  const [renameModalProject, setRenameModalProject] = useState<ProjectSummary | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const [deleteConfirmProject, setDeleteConfirmProject] = useState<ProjectSummary | null>(null);

  // Import states
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importFailure, setImportFailure] = useState<{ message: string; details: string[] } | null>(null);
  const [importSuccess, setImportSuccess] = useState<{
    projectId: string;
    name: string;
    notes: string[];
  } | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const list = await StorageService.getAllProjects();
      setProjects(list);
    } catch (err) {
      console.error('Failed to load projects', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const handleCreate = async () => {
    const name = projectNameInput.trim() || 'Untitled Website';
    let newProject: Project;

    if (templateType === 'starter') {
      newProject = createStarterProject(name);
    } else {
      const blankPage = createBlankPage('Home', '/', true);
      newProject = {
        id: generateId('proj'),
        name,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        schemaVersion: 1,
        settings: {
          siteTitle: name,
          defaultFont: 'Inter, sans-serif',
          primaryColor: '#f59e0b',
          customCss: ''
        },
        pages: [blankPage],
        assets: []
      };
    }

    await StorageService.saveProject(newProject);
    setIsCreateModalOpen(false);
    onOpenProject(newProject.id);
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await StorageService.duplicateProject(id);
      loadProjects();
    } catch (err) {
      console.error('Failed to duplicate project', err);
    }
  };

  const handleStartRename = (e: React.MouseEvent, p: ProjectSummary) => {
    e.stopPropagation();
    setRenameModalProject(p);
    setRenameValue(p.name);
  };

  const handleConfirmRename = async () => {
    if (!renameModalProject || !renameValue.trim()) return;
    const fullProject = await StorageService.getProject(renameModalProject.id);
    if (fullProject) {
      fullProject.name = renameValue.trim();
      await StorageService.saveProject(fullProject);
      setRenameModalProject(null);
      loadProjects();
    }
  };

  const handleStartDelete = (e: React.MouseEvent, p: ProjectSummary) => {
    e.stopPropagation();
    setDeleteConfirmProject(p);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmProject) return;
    await StorageService.deleteProject(deleteConfirmProject.id);
    setDeleteConfirmProject(null);
    loadProjects();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Allow re-selecting the same file later.
    e.target.value = '';
    if (!file) return;
    if (isImporting) return;

    // Guard against loading huge files into memory (project JSON embeds assets
    // as base64, so legitimate files are well below this).
    const MAX_IMPORT_BYTES = 100 * 1024 * 1024;
    if (file.size > MAX_IMPORT_BYTES) {
      setImportFailure({
        message: 'This project file is too large to import.',
        details: [`The file is ${(file.size / (1024 * 1024)).toFixed(1)} MB — the limit is 100 MB.`]
      });
      return;
    }

    setIsImporting(true);
    setImportFailure(null);
    try {
      const text = await readFileAsText(file);
      const parsed = parseProjectFile(text);
      const stored = await StorageService.importProject(parsed.project, { mode: 'copy' });
      await loadProjects();

      const notes = [
        ...parsed.repaired.map(issue => `Fixed: ${issue}`),
        ...parsed.warnings.map(warning => `Note: ${warning}`)
      ];

      if (notes.length > 0) {
        setImportSuccess({ projectId: stored.id, name: stored.name, notes });
      } else {
        onOpenProject(stored.id);
      }
    } catch (err) {
      if (err instanceof ProjectImportError) {
        setImportFailure({ message: err.message, details: err.details });
      } else {
        setImportFailure({
          message: 'The project could not be imported.',
          details: [err instanceof Error ? err.message : String(err)]
        });
      }
    } finally {
      setIsImporting(false);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="dashboard-container">
      {/* Top Navbar */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="brand-logo-icon">
            <Layout size={18} />
          </div>
          <span className="brand-title">SiteBuilder</span>
          <span className="brand-badge">PRO</span>
        </div>

        <div className="dashboard-header-actions">
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportFileChange}
            aria-hidden="true"
            tabIndex={-1}
          />
          <button
            className="import-project-btn"
            onClick={() => importInputRef.current?.click()}
            disabled={isImporting}
            title={`Import a ${PROJECT_FILE_EXTENSION} backup or legacy project JSON`}
            aria-label="Import a project file"
          >
            {isImporting ? <Loader2 size={15} className="spin" /> : <Upload size={15} />}
            <span>Import Project</span>
          </button>

          <button
            className="create-project-btn"
            onClick={() => {
              setProjectNameInput('My New Website');
              setTemplateType('starter');
              setIsCreateModalOpen(true);
            }}
            aria-label="Create a new project"
          >
            <Plus size={15} />
            <span>New Project</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-content">
        <div className="dashboard-title-row">
          <div>
            <h1 className="dash-heading">Projects</h1>
            <p className="dash-sub">Design, manage, and export your responsive websites.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="dashboard-loading">
            <Loader2 size={32} className="spin" />
            <span>Loading projects...</span>
          </div>
        ) : projects.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="empty-graphic">
              <Layout size={40} />
            </div>
            <h2>No projects yet</h2>
            <p>Create your first visual website project with customizable pages, responsive layouts, and zero-code ZIP export.</p>
            <button
              className="create-project-btn large"
              onClick={() => {
                setProjectNameInput('My Website');
                setTemplateType('starter');
                setIsCreateModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Create New Project</span>
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(p => (
              <div
                key={p.id}
                className="project-card"
                role="button"
                tabIndex={0}
                aria-label={`Open project ${p.name}, ${p.pagesCount} ${p.pagesCount === 1 ? 'page' : 'pages'}, updated ${formatDate(p.updatedAt)}`}
                onClick={() => onOpenProject(p.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpenProject(p.id);
                  }
                }}
              >
                {/* Visual Thumbnail */}
                <div className="project-thumbnail">
                  <div className="thumbnail-mockup">
                    <div className="mockup-header">
                      <div className="mockup-dot red" />
                      <div className="mockup-dot yellow" />
                      <div className="mockup-dot green" />
                    </div>
                    <div className="mockup-body">
                      <div className="mockup-hero" />
                      <div className="mockup-cards">
                        <div className="mockup-mini-card" />
                        <div className="mockup-mini-card" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Meta */}
                <div className="project-meta">
                  <div className="project-name-line">
                    <span className="p-title truncate">{p.name}</span>
                  </div>

                  <div className="project-stats-row">
                    <span className="stat-pill">
                      <FileCode size={11} />
                      {p.pagesCount} {p.pagesCount === 1 ? 'page' : 'pages'}
                    </span>
                    <span className="stat-pill">
                      <Layout size={11} />
                      {p.elementsCount} elements
                    </span>
                  </div>

                  <div className="project-card-footer">
                    <span className="time-text">
                      <Clock size={11} />
                      {formatDate(p.updatedAt)}
                    </span>

                    <div className="card-actions">
                      <button
                        className="card-act-btn"
                        onClick={(e) => handleStartRename(e, p)}
                        title="Rename"
                        aria-label={`Rename ${p.name}`}
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        className="card-act-btn"
                        onClick={(e) => handleDuplicate(e, p.id)}
                        title="Duplicate"
                        aria-label={`Duplicate ${p.name}`}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        className="card-act-btn delete"
                        onClick={(e) => handleStartDelete(e, p)}
                        title="Delete"
                        aria-label={`Delete ${p.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <DraggableModal
          title="Create New Project"
          onClose={() => setIsCreateModalOpen(false)}
          maxWidth="480px"
        >
          <p className="modal-desc">Give your project a name and choose a starting template.</p>

          <div className="modal-form-group">
            <label>Project Name</label>
            <input
              type="text"
              className="modal-input"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              autoFocus
            />
          </div>

          <div className="modal-form-group">
            <label>Template</label>
            <div className="template-options" role="radiogroup" aria-label="Starting template">
              <div
                className={`template-option ${templateType === 'starter' ? 'active' : ''}`}
                role="radio"
                aria-checked={templateType === 'starter'}
                tabIndex={0}
                onClick={() => setTemplateType('starter')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTemplateType('starter');
                  }
                }}
              >
                <div className="tmpl-icon"><Sparkles size={18} /></div>
                <div className="tmpl-info">
                  <span className="tmpl-name">Starter Landing Page</span>
                  <span className="tmpl-desc">Hero section, features grid, cards, and multi-page setup.</span>
                </div>
              </div>
              <div
                className={`template-option ${templateType === 'blank' ? 'active' : ''}`}
                role="radio"
                aria-checked={templateType === 'blank'}
                tabIndex={0}
                onClick={() => setTemplateType('blank')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setTemplateType('blank');
                  }
                }}
              >
                <div className="tmpl-icon"><Layout size={18} /></div>
                <div className="tmpl-info">
                  <span className="tmpl-name">Blank Canvas</span>
                  <span className="tmpl-desc">Completely empty canvas to build from scratch.</span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button className="btn-modal-cancel" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </button>
            <button className="btn-modal-submit" onClick={handleCreate}>
              Create Project
            </button>
          </div>
        </DraggableModal>
      )}

      {/* Rename Modal */}
      {renameModalProject && (
        <DraggableModal
          title="Rename Project"
          onClose={() => setRenameModalProject(null)}
          maxWidth="380px"
        >
          <div className="modal-form-group">
            <label>New Name</label>
            <input
              type="text"
              className="modal-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="modal-actions">
            <button className="btn-modal-cancel" onClick={() => setRenameModalProject(null)}>
              Cancel
            </button>
            <button className="btn-modal-submit" onClick={handleConfirmRename}>
              Save Name
            </button>
          </div>
        </DraggableModal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmProject && (
        <DraggableModal
          title="Delete Project?"
          onClose={() => setDeleteConfirmProject(null)}
          maxWidth="380px"
        >
          <p className="modal-desc">
            Are you sure you want to permanently delete <strong>{deleteConfirmProject.name}</strong>? All pages and content will be removed.
          </p>
          <div className="modal-actions">
            <button className="btn-modal-cancel" onClick={() => setDeleteConfirmProject(null)}>
              Cancel
            </button>
            <button className="btn-modal-delete" onClick={handleConfirmDelete}>
              Delete Project
            </button>
          </div>
        </DraggableModal>
      )}

      {/* Import Failure Modal */}
      {importFailure && (
        <DraggableModal
          title="Import Failed"
          onClose={() => setImportFailure(null)}
          maxWidth="440px"
        >
          <p className="modal-desc">{importFailure.message}</p>
          {importFailure.details.length > 0 && (
            <ul className="import-detail-list">
              {importFailure.details.slice(0, 5).map((detail, i) => (
                <li key={i}>{detail}</li>
              ))}
            </ul>
          )}
          <div className="modal-actions">
            <button className="btn-modal-submit" onClick={() => setImportFailure(null)}>
              Close
            </button>
          </div>
        </DraggableModal>
      )}

      {/* Import Success (with repairs) Modal */}
      {importSuccess && (
        <DraggableModal
          title="Project Imported"
          onClose={() => {
            onOpenProject(importSuccess.projectId);
            setImportSuccess(null);
          }}
          maxWidth="460px"
        >
          <p className="modal-desc">
            <strong>{importSuccess.name}</strong> was imported successfully.
            Some data required automatic repair:
          </p>
          <ul className="import-detail-list">
            {importSuccess.notes.slice(0, 8).map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
          {importSuccess.notes.length > 8 && (
            <p className="import-more-notes">+{importSuccess.notes.length - 8} more adjustments</p>
          )}
          <div className="modal-actions">
            <button
              className="btn-modal-cancel"
              onClick={() => setImportSuccess(null)}
            >
              Stay Here
            </button>
            <button
              className="btn-modal-submit"
              onClick={() => {
                onOpenProject(importSuccess.projectId);
                setImportSuccess(null);
              }}
            >
              Open Project
            </button>
          </div>
        </DraggableModal>
      )}

      <style>{`
        .dashboard-container {
          height: 100%;
          background: var(--bg-workspace);
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          overflow-x: hidden;
          overscroll-behavior: contain;
        }

        .dashboard-header {
          height: 56px;
          background: var(--bg-base);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 28px;
          padding-left: calc(28px + env(safe-area-inset-left));
          padding-right: calc(28px + env(safe-area-inset-right));
          position: sticky;
          top: 0;
          z-index: 20;
          flex-shrink: 0;
          gap: 10px;
        }

        .dashboard-brand {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .brand-logo-icon {
          width: 30px;
          height: 30px;
          background: var(--accent);
          color: var(--text-on-accent);
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }

        .brand-title {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: -0.3px;
          color: var(--text-primary);
        }

        .brand-badge {
          font-size: 9px;
          background: var(--accent-subtle);
          border: 1px solid var(--accent-border);
          color: var(--accent);
          padding: 1px 5px;
          border-radius: 4px;
          font-weight: 700;
        }

        .create-project-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--accent);
          color: var(--text-on-accent);
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          transition: background 0.15s;
        }

        .create-project-btn:hover {
          background: var(--accent-hover);
        }

        .create-project-btn.large {
          padding: 10px 22px;
          font-size: 14px;
        }

        .dashboard-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .import-project-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-surface);
          border: 1px solid var(--border-muted);
          color: var(--text-primary);
          padding: 8px 14px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 600;
          transition: background 0.15s;
        }

        .import-project-btn:hover:not(:disabled) {
          background: var(--bg-surface-hover);
        }

        .import-project-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .import-detail-list {
          margin: 8px 0 0 0;
          padding-left: 18px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 180px;
          overflow-y: auto;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .import-more-notes {
          margin-top: 6px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .dashboard-content {
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          padding: 36px 24px calc(60px + env(safe-area-inset-bottom)) 24px;
          flex: 1;
          box-sizing: border-box;
        }

        .dashboard-title-row {
          margin-bottom: 28px;
        }

        .dash-heading {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .dash-sub {
          font-size: 13px;
          color: var(--text-muted);
        }

        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 0;
          gap: 12px;
          color: var(--text-muted);
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        .dashboard-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px;
          background: var(--bg-base);
          border: 1px dashed var(--border-muted);
          border-radius: 12px;
          text-align: center;
        }

        .empty-graphic {
          width: 64px;
          height: 64px;
          background: var(--bg-surface);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent);
          margin-bottom: 16px;
        }

        .dashboard-empty-state h2 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin-bottom: 8px;
        }

        .dashboard-empty-state p {
          font-size: 13px;
          color: var(--text-muted);
          max-width: 440px;
          line-height: 1.5;
          margin-bottom: 24px;
        }

        .projects-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr));
          gap: 20px;
        }

        .project-card {
          background: var(--bg-base);
          border: 1px solid var(--border-subtle);
          border-radius: 12px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.18s ease;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .project-card:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .project-card:hover {
          border-color: var(--border-muted);
          transform: translateY(-3px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
        }

        .project-thumbnail {
          height: 140px;
          background: #14151a;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .thumbnail-mockup {
          width: 100%;
          height: 100%;
          background: #1e2027;
          border: 1px solid #2e313c;
          border-radius: 6px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .mockup-header {
          height: 14px;
          background: #252831;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 0 6px;
        }

        .mockup-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .mockup-dot.red { background: #ef4444; }
        .mockup-dot.yellow { background: #f59e0b; }
        .mockup-dot.green { background: #10b981; }

        .mockup-body {
          padding: 8px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .mockup-hero {
          height: 28px;
          background: #2f333f;
          border-radius: 3px;
        }

        .mockup-cards {
          display: flex;
          gap: 6px;
        }

        .mockup-mini-card {
          flex: 1;
          height: 34px;
          background: #272a34;
          border-radius: 3px;
        }

        .project-meta {
          padding: 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .p-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .project-stats-row {
          display: flex;
          gap: 8px;
        }

        .stat-pill {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-secondary);
        }

        .project-card-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-top: 8px;
          border-top: 1px solid var(--border-subtle);
        }

        .time-text {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
        }

        .card-actions {
          display: flex;
          gap: 4px;
        }

        .card-act-btn {
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          color: var(--text-muted);
          transition: all 0.12s;
        }

        .card-act-btn:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .card-act-btn.delete:hover {
          color: var(--danger);
        }

        /* Modals */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .modal-box {
          background: var(--bg-base);
          border: 1px solid var(--border-muted);
          border-radius: 12px;
          width: 100%;
          max-width: 480px;
          padding: 24px;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .modal-box.small {
          max-width: 380px;
        }

        .modal-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .modal-title.text-danger {
          color: var(--danger);
        }

        .modal-desc {
          font-size: 12.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .modal-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .modal-form-group label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .modal-input {
          background: var(--bg-input);
          border: 1px solid var(--border-muted);
          color: var(--text-primary);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          outline: none;
        }

        .modal-input:focus {
          border-color: var(--border-focus);
        }

        .template-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .template-option {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.15s;
        }

        .template-option:hover {
          background: var(--bg-surface-hover);
        }

        .template-option.active {
          border-color: var(--accent);
          background: var(--accent-subtle);
        }

        .tmpl-icon {
          color: var(--accent);
        }

        .tmpl-info {
          display: flex;
          flex-direction: column;
        }

        .tmpl-name {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .tmpl-desc {
          font-size: 11px;
          color: var(--text-muted);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }

        .btn-modal-cancel {
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          font-size: 12.5px;
          color: var(--text-secondary);
        }

        .btn-modal-cancel:hover {
          background: var(--bg-surface);
        }

        .btn-modal-submit {
          padding: 8px 18px;
          background: var(--accent);
          color: var(--text-on-accent);
          border-radius: var(--radius-sm);
          font-size: 12.5px;
          font-weight: 600;
        }

        .btn-modal-delete {
          padding: 8px 18px;
          background: var(--danger);
          color: #fff;
          border-radius: var(--radius-sm);
          font-size: 12.5px;
          font-weight: 600;
        }

        @media (max-width: 640px) {
          .dashboard-header {
            padding-left: calc(14px + env(safe-area-inset-left));
            padding-right: calc(14px + env(safe-area-inset-right));
          }

          .brand-badge {
            display: none;
          }

          .dashboard-header-actions {
            gap: 6px;
          }

          .import-project-btn span,
          .create-project-btn span {
            display: none;
          }

          .import-project-btn,
          .create-project-btn {
            padding: 10px;
          }

          .dashboard-content {
            padding: 24px 14px calc(48px + env(safe-area-inset-bottom)) 14px;
          }

          .dashboard-title-row {
            margin-bottom: 18px;
          }

          .dash-heading {
            font-size: 20px;
          }

          .dashboard-empty-state {
            padding: 48px 18px;
          }

          .project-thumbnail {
            height: 124px;
          }

          .modal-box {
            padding: 18px;
          }
        }

        @media (pointer: coarse) {
          .card-act-btn {
            width: 40px;
            height: 40px;
          }

          .card-actions {
            gap: 8px;
          }

          .template-option {
            padding: 14px;
          }

          .btn-modal-cancel,
          .btn-modal-submit,
          .btn-modal-delete {
            min-height: 44px;
            padding-left: 18px;
            padding-right: 18px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .project-card:hover {
            transform: none;
          }

          .spin {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};
