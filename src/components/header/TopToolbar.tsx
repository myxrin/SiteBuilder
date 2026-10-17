import React, { useEffect, useRef, useState } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Undo2,
  Redo2,
  Eye,
  Download,
  FolderOpen,
  Check,
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  FileCode,
  Save,
  X,
  MoreHorizontal,
  Pencil
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { useMediaQuery } from '../../hooks/useMediaQuery';

interface TopToolbarProps {
  onBackToDashboard: () => void;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ onBackToDashboard }) => {
  const {
    project,
    activePage,
    activePageId,
    setActivePage,
    activeViewport,
    setActiveViewport,
    canUndo,
    canRedo,
    undo,
    redo,
    saveStatus,
    saveProject,
    isPreviewMode,
    setIsPreviewMode,
    exportZip,
    exportProjectFile,
    zoomLevel,
    setZoomLevel,
    updateProjectName
  } = useEditor();

  const isCompact = useMediaQuery('(max-width: 900px)');
  const hideProjectName = useMediaQuery('(max-width: 560px)');

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportingProject, setIsExportingProject] = useState(false);
  const [exportNotice, setExportNotice] = useState<string[] | null>(null);

  // Blocks accidental double-activation (double click / double tap) of the
  // *same* export action. Tracking each action separately keeps a rapid
  // "Export ZIP, then Export Project" sequence working.
  const zipCooldownRef = useRef(0);
  const projectCooldownRef = useRef(0);
  const canRunZipExport = () => {
    const now = Date.now();
    if (now - zipCooldownRef.current < 800) return false;
    zipCooldownRef.current = now;
    return true;
  };
  const canRunProjectExport = () => {
    const now = Date.now();
    if (now - projectCooldownRef.current < 800) return false;
    projectCooldownRef.current = now;
    return true;
  };

  // Keep the local name draft in sync when the project is renamed elsewhere
  // (e.g. undo) and the field is not being edited.
  useEffect(() => {
    if (!isEditingName) setNameValue(project.name);
  }, [project.name, isEditingName]);

  // Escape closes any open toolbar popup.
  useEffect(() => {
    if (!isPageDropdownOpen && !isOverflowOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPageDropdownOpen(false);
        setIsOverflowOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPageDropdownOpen, isOverflowOpen]);

  const handleNameSubmit = () => {
    setIsEditingName(false);
    if (nameValue.trim()) {
      updateProjectName(nameValue.trim());
    } else {
      setNameValue(project.name);
    }
  };

  const handleExport = async () => {
    if (isExporting) return;
    if (!canRunZipExport()) return;
    setIsExporting(true);
    setExportNotice(null);
    try {
      const warnings = await exportZip();
      if (warnings.length > 0) setExportNotice(warnings);
    } catch (err) {
      setExportNotice([`Export failed: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportProject = () => {
    if (isExportingProject) return;
    if (!canRunProjectExport()) return;
    setIsExportingProject(true);
    setExportNotice(null);
    try {
      exportProjectFile();
    } catch (err) {
      setExportNotice([`Project export failed: ${err instanceof Error ? err.message : String(err)}`]);
    } finally {
      // Re-enable on the next tick so a same-frame double click cannot fire twice.
      window.setTimeout(() => setIsExportingProject(false), 250);
    }
  };

  const closeOverflow = () => setIsOverflowOpen(false);

  const saveStatusText =
    saveStatus === 'saved' ? 'Saved'
    : saveStatus === 'saving' ? 'Saving'
    : saveStatus === 'error' ? 'Save error — retry'
    : 'Unsaved';

  const renderSaveStatus = () => (
    <button
      type="button"
      className={`save-status-indicator ${saveStatus === 'error' ? 'save-status-error' : ''}`}
      onClick={() => saveProject()}
      disabled={saveStatus === 'saving'}
      title={
        saveStatus === 'error'
          ? 'Autosave failed — click to retry saving'
          : 'Click to save now (autosave is on)'
      }
      aria-label={`Save status: ${saveStatusText}. Click to save now.`}
    >
      <span aria-live="polite">
        {saveStatus === 'saved' && (
          <span className="status-saved">
            <Check size={13} />
            <span className="status-label">Saved</span>
          </span>
        )}
        {saveStatus === 'saving' && (
          <span className="status-saving">
            <Loader2 size={13} className="spin" />
            <span className="status-label">Saving</span>
          </span>
        )}
        {saveStatus === 'unsaved' && (
          <span className="status-unsaved">
            <span className="unsaved-dot" />
            <span className="status-label">Unsaved</span>
          </span>
        )}
        {saveStatus === 'error' && (
          <span className="status-error">
            <AlertCircle size={13} />
            <span className="status-label">Save error — retry</span>
          </span>
        )}
      </span>
    </button>
  );

  const renderPreviewToggle = () => (
    <button
      className={`preview-btn ${isPreviewMode ? 'active' : ''}`}
      onClick={() => setIsPreviewMode(!isPreviewMode)}
      title="Preview Website"
      aria-pressed={isPreviewMode}
      aria-label={isPreviewMode ? 'Exit preview' : 'Preview website'}
    >
      <Eye size={15} />
      <span>Preview</span>
    </button>
  );

  const renderProjectExport = () => (
    <button
      className="project-export-btn"
      onClick={handleExportProject}
      disabled={isExportingProject}
      title="Export Project File (.sitebuilder.json) — backup that can be re-imported"
      aria-label="Export project file for backup"
    >
      <Save size={15} />
      <span>Project</span>
    </button>
  );

  const renderZipExport = () => (
    <button
      className="export-btn"
      onClick={handleExport}
      disabled={isExporting}
      title="Export Standalone Website as ZIP"
      aria-label="Export standalone website as ZIP"
    >
      {isExporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
      <span>Export ZIP</span>
    </button>
  );

  const renderZoomControls = () => (
    <div className="zoom-controls">
      <button
        className="icon-action-btn"
        onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
        title="Zoom out"
        aria-label="Zoom out"
        disabled={zoomLevel <= 50}
      >
        <ZoomOut size={14} />
      </button>
      <span className="zoom-value">{zoomLevel}%</span>
      <button
        className="icon-action-btn"
        onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
        title="Zoom in"
        aria-label="Zoom in"
        disabled={zoomLevel >= 150}
      >
        <ZoomIn size={14} />
      </button>
    </div>
  );

  return (
    <header className="top-toolbar">
      {/* Left: Dashboard link & Project Name */}
      <div className="toolbar-left">
        <button
          className="icon-action-btn"
          onClick={onBackToDashboard}
          title="Back to Projects Dashboard"
          aria-label="Back to Projects"
        >
          <FolderOpen size={16} />
        </button>

        <div className="divider-v" />

        {isEditingName ? (
          <input
            type="text"
            className="project-name-input"
            value={nameValue}
            aria-label="Project name"
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleNameSubmit();
              if (e.key === 'Escape') {
                setNameValue(project.name);
                setIsEditingName(false);
              }
            }}
            autoFocus
          />
        ) : (
          <button
            className={`project-name-btn ${hideProjectName ? 'name-collapsed' : ''}`}
            onClick={() => {
              setNameValue(project.name);
              setIsEditingName(true);
            }}
            title="Click to rename project"
            aria-label={`Project name: ${project.name}. Click to rename.`}
          >
            <span>{project.name}</span>
          </button>
        )}

        {/* Page Switcher */}
        <div className="page-switcher-dropdown">
          <button
            className="page-select-trigger"
            onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
            aria-haspopup="menu"
            aria-expanded={isPageDropdownOpen}
            aria-label={`Switch page. Current page: ${activePage?.name || 'Page'}`}
            title="Switch page"
          >
            <FileCode size={14} className="text-secondary" />
            <span className="truncate" style={{ maxWidth: 110 }}>{activePage?.name || 'Page'}</span>
            <ChevronDown size={13} className="text-muted" />
          </button>

          {isPageDropdownOpen && (
            <>
              <div className="dropdown-backdrop" onClick={() => setIsPageDropdownOpen(false)} />
              <div className="dropdown-menu" role="menu">
                <div className="dropdown-header">Pages ({project.pages.length})</div>
                {project.pages.map(p => (
                  <button
                    key={p.id}
                    role="menuitem"
                    className={`dropdown-item ${p.id === activePageId ? 'active' : ''}`}
                    onClick={() => {
                      setActivePage(p.id);
                      setIsPageDropdownOpen(false);
                    }}
                  >
                    <span>{p.name}</span>
                    <span className="dropdown-slug">{p.slug}</span>
                    {p.isHome && <span className="home-tag">Home</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Center: Viewport Switcher */}
      <div className="toolbar-center">
        <div className="segmented-control" role="group" aria-label="Editing viewport">
          <button
            className={`seg-btn ${activeViewport === 'desktop' ? 'active' : ''}`}
            onClick={() => setActiveViewport('desktop')}
            title="Desktop Viewport (100% / 1200px)"
            aria-label="Desktop view"
            aria-pressed={activeViewport === 'desktop'}
          >
            <Monitor size={15} />
            <span className="seg-label">Desktop</span>
          </button>
          <button
            className={`seg-btn ${activeViewport === 'tablet' ? 'active' : ''}`}
            onClick={() => setActiveViewport('tablet')}
            title="Tablet Viewport (768px)"
            aria-label="Tablet view"
            aria-pressed={activeViewport === 'tablet'}
          >
            <Tablet size={15} />
            <span className="seg-label">Tablet</span>
          </button>
          <button
            className={`seg-btn ${activeViewport === 'mobile' ? 'active' : ''}`}
            onClick={() => setActiveViewport('mobile')}
            title="Mobile Viewport (375px)"
            aria-label="Mobile view"
            aria-pressed={activeViewport === 'mobile'}
          >
            <Smartphone size={15} />
            <span className="seg-label">Mobile</span>
          </button>
        </div>

        {/* Zoom Controls (desktop only — compact mode moves them into the menu) */}
        {!isCompact && renderZoomControls()}
      </div>

      {/* Right: History, Save status, Preview, Export */}
      <div className="toolbar-right">
        {/* Undo / Redo */}
        <div className="btn-group">
          <button
            className="icon-action-btn"
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo"
          >
            <Undo2 size={15} />
          </button>
          <button
            className="icon-action-btn"
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo"
          >
            <Redo2 size={15} />
          </button>
        </div>

        <div className="divider-v" />

        {/* Save Status */}
        {renderSaveStatus()}

        {!isCompact ? (
          <>
            {renderPreviewToggle()}
            {renderProjectExport()}
            {renderZipExport()}
          </>
        ) : (
          <div className="toolbar-overflow">
            <button
              className="icon-action-btn overflow-trigger"
              onClick={() => setIsOverflowOpen(!isOverflowOpen)}
              title="More actions"
              aria-label="More actions"
              aria-haspopup="menu"
              aria-expanded={isOverflowOpen}
            >
              <MoreHorizontal size={16} />
            </button>

            {isOverflowOpen && (
              <>
                <div className="dropdown-backdrop" onClick={closeOverflow} />
                <div className="overflow-menu" role="menu" aria-label="More toolbar actions">
                  {hideProjectName && (
                    <button
                      role="menuitem"
                      className="overflow-item"
                      onClick={() => {
                        closeOverflow();
                        setNameValue(project.name);
                        setIsEditingName(true);
                      }}
                    >
                      <Pencil size={14} />
                      <span className="overflow-item-label">Rename project</span>
                    </button>
                  )}
                  <button
                    role="menuitem"
                    className="overflow-item"
                    onClick={() => {
                      setIsPreviewMode(!isPreviewMode);
                      closeOverflow();
                    }}
                    aria-pressed={isPreviewMode}
                  >
                    <Eye size={14} />
                    <span className="overflow-item-label">
                      {isPreviewMode ? 'Exit preview' : 'Preview website'}
                    </span>
                  </button>
                  <button
                    role="menuitem"
                    className="overflow-item"
                    onClick={() => {
                      handleExportProject();
                      closeOverflow();
                    }}
                    disabled={isExportingProject}
                  >
                    <Save size={14} />
                    <span className="overflow-item-label">Export project file</span>
                  </button>
                  <button
                    role="menuitem"
                    className="overflow-item accent"
                    onClick={() => {
                      handleExport();
                      closeOverflow();
                    }}
                    disabled={isExporting}
                  >
                    {isExporting ? <Loader2 size={14} className="spin" /> : <Download size={14} />}
                    <span className="overflow-item-label">Export website ZIP</span>
                  </button>

                  <div className="overflow-divider" />

                  <div className="overflow-section-label">Device Viewport</div>
                  <div className="overflow-viewport-row" role="group" aria-label="Device viewport">
                    <button
                      className={`overflow-vp-btn ${activeViewport === 'desktop' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveViewport('desktop');
                        closeOverflow();
                      }}
                      aria-label="Desktop viewport"
                      title="Desktop view (1200px)"
                    >
                      <Monitor size={14} />
                      <span>Desktop</span>
                    </button>
                    <button
                      className={`overflow-vp-btn ${activeViewport === 'tablet' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveViewport('tablet');
                        closeOverflow();
                      }}
                      aria-label="Tablet viewport"
                      title="Tablet view (768px)"
                    >
                      <Tablet size={14} />
                      <span>Tablet</span>
                    </button>
                    <button
                      className={`overflow-vp-btn ${activeViewport === 'mobile' ? 'active' : ''}`}
                      onClick={() => {
                        setActiveViewport('mobile');
                        closeOverflow();
                      }}
                      aria-label="Mobile viewport"
                      title="Mobile view (375px)"
                    >
                      <Smartphone size={14} />
                      <span>Mobile</span>
                    </button>
                  </div>

                  <div className="overflow-divider" />

                  <div className="overflow-zoom" role="group" aria-label="Zoom">
                    <span className="overflow-zoom-label">Zoom</span>
                    <button
                      className="icon-action-btn"
                      onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                      title="Zoom out"
                      aria-label="Zoom out"
                      disabled={zoomLevel <= 50}
                    >
                      <ZoomOut size={14} />
                    </button>
                    <button
                      className="zoom-reset-btn"
                      onClick={() => setZoomLevel(100)}
                      title="Reset zoom to 100%"
                      aria-label="Reset zoom to 100%"
                    >
                      <span className="zoom-value">{zoomLevel}%</span>
                    </button>
                    <button
                      className="icon-action-btn"
                      onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                      title="Zoom in"
                      aria-label="Zoom in"
                      disabled={zoomLevel >= 150}
                    >
                      <ZoomIn size={14} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {exportNotice && exportNotice.length > 0 && (
        <div
          className={`export-notice ${exportNotice.some(m => m.toLowerCase().includes('failed')) ? 'error' : ''}`}
          role="alert"
        >
          <div className="export-notice-head">
            <AlertCircle size={14} />
            <span>
              {exportNotice.some(m => m.toLowerCase().includes('failed'))
                ? 'Export failed'
                : `Export completed with ${exportNotice.length} warning${exportNotice.length > 1 ? 's' : ''}`}
            </span>
            <button
              className="export-notice-close"
              onClick={() => setExportNotice(null)}
              title="Dismiss"
              aria-label="Dismiss export notice"
            >
              <X size={13} />
            </button>
          </div>
          <ul>
            {exportNotice.slice(0, 6).map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
          {exportNotice.length > 6 && <span className="export-notice-more">+{exportNotice.length - 6} more…</span>}
        </div>
      )}

      <style>{`
        .top-toolbar {
          height: var(--header-height);
          background: var(--bg-base);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 12px;
          gap: 8px;
          user-select: none;
          z-index: 50;
          flex-shrink: 0;
        }

        .toolbar-left, .toolbar-center, .toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .divider-v {
          width: 1px;
          height: 18px;
          background: var(--border-subtle);
          margin: 0 4px;
          flex-shrink: 0;
        }

        .icon-action-btn {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }

        .icon-action-btn:hover:not(:disabled) {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .icon-action-btn:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }

        .project-name-btn {
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: 13px;
          color: var(--text-primary);
          max-width: 160px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }

        .project-name-btn:hover {
          background: var(--bg-surface);
        }

        .project-name-btn.name-collapsed {
          display: none;
        }

        .project-name-input {
          background: var(--bg-input);
          border: 1px solid var(--border-focus);
          color: var(--text-primary);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          outline: none;
          width: 160px;
          max-width: 40vw;
        }

        .page-switcher-dropdown {
          position: relative;
        }

        .page-select-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 8px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 12px;
          color: var(--text-primary);
          min-width: 0;
        }

        .page-select-trigger:hover {
          background: var(--bg-surface-hover);
        }

        .dropdown-backdrop {
          position: fixed;
          inset: 0;
          z-index: 100;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          width: 220px;
          max-width: calc(100vw - 24px);
          background: var(--bg-surface);
          border: 1px solid var(--border-muted);
          border-radius: var(--radius-md);
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
          z-index: 101;
          padding: 4px;
        }

        .dropdown-header {
          padding: 6px 10px;
          font-size: 11px;
          color: var(--text-muted);
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }

        .dropdown-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px 10px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 12px;
          text-align: left;
        }

        .dropdown-item:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .dropdown-item.active {
          background: var(--accent-subtle);
          color: var(--accent);
          font-weight: 600;
        }

        .dropdown-slug {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .home-tag {
          font-size: 9px;
          background: var(--accent);
          color: var(--text-on-accent);
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: bold;
        }

        .toolbar-overflow {
          position: relative;
        }

        .overflow-menu {
          position: absolute;
          top: calc(100% + 6px);
          right: 0;
          width: 232px;
          max-width: calc(100vw - 16px);
          background: var(--bg-surface);
          border: 1px solid var(--border-muted);
          border-radius: var(--radius-md);
          box-shadow: 0 12px 28px rgba(0, 0, 0, 0.45);
          z-index: 101;
          padding: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .overflow-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 10px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 13px;
          text-align: left;
        }

        .overflow-item:hover:not(:disabled) {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .overflow-item:disabled {
          opacity: 0.5;
        }

        .overflow-item.accent {
          color: var(--accent);
          font-weight: 600;
        }

        .overflow-item-label {
          flex: 1;
        }

        .overflow-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 4px 2px;
        }

        .overflow-zoom {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 6px;
        }

        .overflow-section-label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          padding: 4px 6px 2px 6px;
        }

        .overflow-viewport-row {
          display: flex;
          gap: 4px;
          padding: 2px 4px;
        }

        .overflow-vp-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 6px 4px;
          background: var(--bg-surface-hover);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 11px;
          font-weight: 500;
          transition: all 0.12s;
        }

        .overflow-vp-btn:hover {
          color: var(--text-primary);
          background: var(--bg-surface-active);
        }

        .overflow-vp-btn.active {
          background: var(--accent-subtle);
          border-color: var(--accent-border);
          color: var(--accent);
          font-weight: 600;
        }

        .zoom-reset-btn {
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .zoom-reset-btn:hover .zoom-value {
          color: var(--accent);
          text-decoration: underline;
        }

        .segmented-control {
          display: flex;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 2px;
          gap: 2px;
        }

        .seg-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 12px;
          font-weight: 500;
          transition: all 0.15s;
        }

        .seg-btn:hover {
          color: var(--text-primary);
        }

        .seg-btn.active {
          background: var(--bg-surface-active);
          color: var(--accent);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }

        .zoom-controls {
          display: flex;
          align-items: center;
          gap: 2px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 2px 4px;
        }

        .zoom-value {
          font-size: 11px;
          font-family: var(--font-mono);
          color: var(--text-secondary);
          width: 38px;
          text-align: center;
        }

        .btn-group {
          display: flex;
          gap: 2px;
        }

        .save-status-indicator {
          display: flex;
          align-items: center;
          font-size: 12px;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .save-status-indicator:hover:not(:disabled) {
          background: var(--bg-surface-hover);
        }

        .save-status-indicator:disabled {
          cursor: default;
        }

        .save-status-indicator > span {
          display: inline-flex;
        }

        .status-saved {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-muted);
        }

        .status-saving {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--accent);
        }

        .status-unsaved {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--text-muted);
        }

        .unsaved-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
        }

        .status-error {
          display: flex;
          align-items: center;
          gap: 4px;
          color: var(--danger);
        }

        .save-status-error {
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.35);
        }

        .project-export-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 500;
          transition: background 0.15s;
        }

        .project-export-btn:hover:not(:disabled) {
          background: var(--bg-surface-hover);
        }

        .project-export-btn:disabled {
          opacity: 0.6;
        }

        .export-notice {
          position: fixed;
          top: calc(var(--header-height) + 8px);
          right: 12px;
          width: 340px;
          max-width: calc(100vw - 24px);
          max-height: 240px;
          overflow-y: auto;
          background: var(--bg-surface);
          border: 1px solid var(--accent-border);
          border-radius: var(--radius-md);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
          padding: 10px 12px;
          z-index: 200;
          font-size: 12px;
          color: var(--text-primary);
        }

        .export-notice.error {
          border-color: rgba(239, 68, 68, 0.45);
          background: rgba(239, 68, 68, 0.08);
        }

        .export-notice-head {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 6px;
        }

        .export-notice.error .export-notice-head {
          color: var(--danger);
        }

        .export-notice-head span {
          flex: 1;
        }

        .export-notice-close {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          color: var(--text-muted);
        }

        .export-notice-close:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .export-notice ul {
          margin: 0;
          padding-left: 16px;
          display: flex;
          flex-direction: column;
          gap: 3px;
          color: var(--text-secondary);
        }

        .export-notice-more {
          display: block;
          margin-top: 4px;
          color: var(--text-muted);
          font-size: 11px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .preview-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 12px;
          font-weight: 500;
          transition: background 0.15s;
        }

        .preview-btn:hover {
          background: var(--bg-surface-hover);
        }

        .preview-btn.active {
          background: var(--accent-subtle);
          border-color: var(--accent-border);
          color: var(--accent);
        }

        .export-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          background: var(--accent);
          color: var(--text-on-accent);
          border-radius: var(--radius-md);
          font-size: 12px;
          font-weight: 600;
          transition: background 0.15s;
        }

        .export-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }

        .export-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        @media (max-width: 900px) {
          .seg-label {
            display: none;
          }

          .seg-btn {
            padding: 5px 8px;
          }

          .top-toolbar {
            padding: 0 8px;
            gap: 6px;
          }

          .toolbar-left, .toolbar-center, .toolbar-right {
            gap: 4px;
          }

          .save-status-indicator .status-label {
            display: none;
          }

          .status-saved, .status-saving, .status-unsaved, .status-error {
            padding: 2px;
          }
        }

        @media (max-width: 480px) {
          .top-toolbar {
            padding: 0 4px;
            gap: 3px;
          }

          .toolbar-left, .toolbar-center, .toolbar-right {
            gap: 2px;
          }

          .page-select-trigger {
            padding: 4px 6px;
            font-size: 11px;
            gap: 4px;
          }

          .seg-btn {
            padding: 4px 5px;
          }

          .divider-v {
            margin: 0 2px;
          }
        }

        @media (pointer: coarse) {
          .icon-action-btn,
          .seg-btn,
          .overflow-item,
          .dropdown-item,
          .save-status-indicator {
            min-height: 38px;
          }

          .icon-action-btn {
            width: 36px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .spin {
            animation: none;
          }
        }
      `}</style>
    </header>
  );
};
