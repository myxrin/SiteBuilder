import React, { useState } from 'react';
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
  Layers,
  FileCode,
  Save,
  X
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { Viewport } from '../../types/document';

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

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportNotice, setExportNotice] = useState<string[] | null>(null);

  const handleNameSubmit = () => {
    setIsEditingName(false);
    if (nameValue.trim()) {
      updateProjectName(nameValue.trim());
    } else {
      setNameValue(project.name);
    }
  };

  const handleExport = async () => {
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
    setExportNotice(null);
    try {
      exportProjectFile();
    } catch (err) {
      setExportNotice([`Project export failed: ${err instanceof Error ? err.message : String(err)}`]);
    }
  };

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
            className="project-name-btn"
            onClick={() => {
              setNameValue(project.name);
              setIsEditingName(true);
            }}
            title="Click to rename project"
          >
            <span>{project.name}</span>
          </button>
        )}

        {/* Page Switcher */}
        <div className="page-switcher-dropdown">
          <button
            className="page-select-trigger"
            onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
          >
            <FileCode size={14} className="text-secondary" />
            <span className="truncate" style={{ maxWidth: 110 }}>{activePage?.name || 'Page'}</span>
            <ChevronDown size={13} className="text-muted" />
          </button>

          {isPageDropdownOpen && (
            <>
              <div className="dropdown-backdrop" onClick={() => setIsPageDropdownOpen(false)} />
              <div className="dropdown-menu">
                <div className="dropdown-header">Pages ({project.pages.length})</div>
                {project.pages.map(p => (
                  <button
                    key={p.id}
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
        <div className="segmented-control">
          <button
            className={`seg-btn ${activeViewport === 'desktop' ? 'active' : ''}`}
            onClick={() => setActiveViewport('desktop')}
            title="Desktop Viewport (100% / 1200px)"
            aria-label="Desktop view"
          >
            <Monitor size={15} />
            <span className="seg-label">Desktop</span>
          </button>
          <button
            className={`seg-btn ${activeViewport === 'tablet' ? 'active' : ''}`}
            onClick={() => setActiveViewport('tablet')}
            title="Tablet Viewport (768px)"
            aria-label="Tablet view"
          >
            <Tablet size={15} />
            <span className="seg-label">Tablet</span>
          </button>
          <button
            className={`seg-btn ${activeViewport === 'mobile' ? 'active' : ''}`}
            onClick={() => setActiveViewport('mobile')}
            title="Mobile Viewport (375px)"
            aria-label="Mobile view"
          >
            <Smartphone size={15} />
            <span className="seg-label">Mobile</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="zoom-controls">
          <button
            className="icon-action-btn"
            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
            title="Zoom out"
            aria-label="Zoom out"
          >
            <ZoomOut size={14} />
          </button>
          <span className="zoom-value">{zoomLevel}%</span>
          <button
            className="icon-action-btn"
            onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
            title="Zoom in"
            aria-label="Zoom in"
          >
            <ZoomIn size={14} />
          </button>
        </div>
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
        <div
          className={`save-status-indicator ${saveStatus === 'error' ? 'save-status-error' : ''}`}
          onClick={saveProject}
          title={
            saveStatus === 'error'
              ? 'Autosave failed — click to retry saving'
              : 'Click to save now (autosave is on)'
          }
        >
          {saveStatus === 'saved' && (
            <span className="status-saved">
              <Check size={13} />
              <span>Saved</span>
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="status-saving">
              <Loader2 size={13} className="spin" />
              <span>Saving</span>
            </span>
          )}
          {saveStatus === 'unsaved' && (
            <span className="status-unsaved">
              <span className="unsaved-dot" />
              <span>Unsaved</span>
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="status-error">
              <AlertCircle size={13} />
              <span>Save error — retry</span>
            </span>
          )}
        </div>

        {/* Preview Toggle */}
        <button
          className={`preview-btn ${isPreviewMode ? 'active' : ''}`}
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          title="Preview Website"
        >
          <Eye size={15} />
          <span>Preview</span>
        </button>

        {/* Export Project File (backup / re-import) */}
        <button
          className="project-export-btn"
          onClick={handleExportProject}
          title="Export Project File (.sitebuilder.json) — backup that can be re-imported"
        >
          <Save size={15} />
          <span>Project</span>
        </button>

        {/* Export ZIP */}
        <button
          className="export-btn"
          onClick={handleExport}
          disabled={isExporting}
          title="Export Standalone Website as ZIP"
        >
          {isExporting ? <Loader2 size={15} className="spin" /> : <Download size={15} />}
          <span>Export ZIP</span>
        </button>
      </div>

      {exportNotice && exportNotice.length > 0 && (
        <div className="export-notice" role="alert">
          <div className="export-notice-head">
            <AlertCircle size={14} />
            <span>Export completed with {exportNotice.length} warning{exportNotice.length > 1 ? 's' : ''}</span>
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
          user-select: none;
          z-index: 50;
        }

        .toolbar-left, .toolbar-center, .toolbar-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .divider-v {
          width: 1px;
          height: 18px;
          background: var(--border-subtle);
          margin: 0 4px;
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
        }

        .project-name-btn:hover {
          background: var(--bg-surface);
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
          font-size: 12px;
          padding: 4px 8px;
          cursor: pointer;
          border-radius: var(--radius-sm);
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

        .project-export-btn:hover {
          background: var(--bg-surface-hover);
        }

        .export-notice {
          position: fixed;
          top: calc(var(--header-height) + 8px);
          right: 12px;
          width: 340px;
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

        .export-notice-head {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 600;
          color: var(--accent);
          margin-bottom: 6px;
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
          .seg-label, .zoom-controls {
            display: none;
          }
        }
      `}</style>
    </header>
  );
};
