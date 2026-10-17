import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  Home,
  Trash2,
  Copy,
  Settings,
  Check,
  X
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { Page } from '../../types/document';
import { sanitizeSlug } from '../../utils/sanitize';

export const PagesManager: React.FC = () => {
  const {
    project,
    activePageId,
    setActivePage,
    addPage,
    updatePage,
    deletePage,
    duplicatePage
  } = useEditor();

  const [isAdding, setIsAdding] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageSlug, setNewPageSlug] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);

  // Form states for editing page
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewPageName('');
    setNewPageSlug('');
  };

  const handleConfirmAdd = () => {
    if (!newPageName.trim()) return;
    const slug = sanitizeSlug(newPageSlug || newPageName.toLowerCase().replace(/\s+/g, '-'));
    
    // Check duplicate slug
    if (project.pages.some(p => p.slug === slug)) {
      alert(`The slug "${slug}" is already in use by another page.`);
      return;
    }

    addPage(newPageName.trim(), slug);
    setIsAdding(false);
  };

  const handleStartEdit = (page: Page) => {
    setEditingPageId(page.id);
    setEditTitle(page.title || page.name);
    setEditSlug(page.slug);
    setEditDesc(page.description || '');
  };

  const handleSaveEdit = (pageId: string) => {
    const slug = sanitizeSlug(editSlug);
    // Verify unique slug
    if (project.pages.some(p => p.id !== pageId && p.slug === slug)) {
      alert(`The slug "${slug}" is already used by another page.`);
      return;
    }

    updatePage(pageId, {
      title: editTitle.trim(),
      slug,
      description: editDesc.trim()
    });
    setEditingPageId(null);
  };

  const handleDelete = (page: Page) => {
    if (project.pages.length <= 1) {
      alert('Cannot delete the only page in the project.');
      return;
    }
    if (confirm(`Are you sure you want to delete "${page.name}"? You can undo this change.`)) {
      const result = deletePage(page.id);
      if (!result.ok && result.message) {
        alert(result.message);
      }
    }
  };

  return (
    <div className="pages-manager">
      <div className="pages-header">
        <div>
          <span className="pages-title">Pages ({project.pages.length})</span>
          <span className="pages-subtitle">Manage site routes & metadata</span>
        </div>
        <button
          className="add-page-btn"
          onClick={handleStartAdd}
          title="Add New Page"
          aria-label="Add New Page"
        >
          <Plus size={14} />
          <span>New Page</span>
        </button>
      </div>

      {isAdding && (
        <div className="add-page-card">
          <span className="card-title">Create Page</span>
          <input
            type="text"
            className="input-field"
            placeholder="Page Name (e.g. Services)"
            value={newPageName}
            onChange={(e) => {
              setNewPageName(e.target.value);
              if (!newPageSlug) {
                setNewPageSlug('/' + e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }
            }}
            autoFocus
          />
          <input
            type="text"
            className="input-field font-mono"
            placeholder="Route Slug (e.g. /services)"
            value={newPageSlug}
            onChange={(e) => setNewPageSlug(e.target.value)}
          />
          <div className="form-buttons">
            <button className="btn-cancel" onClick={() => setIsAdding(false)}>Cancel</button>
            <button className="btn-save" onClick={handleConfirmAdd} disabled={!newPageName.trim()}>Create</button>
          </div>
        </div>
      )}

      <div className="pages-list">
        {project.pages.map(page => {
          const isActive = page.id === activePageId;
          const isEditing = page.id === editingPageId;

          return (
            <div key={page.id} className={`page-card ${isActive ? 'active' : ''}`}>
              {isEditing ? (
                <div className="page-edit-form">
                  <div className="form-group">
                    <label>Page Title</label>
                    <input
                      type="text"
                      className="input-field"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>URL Slug</label>
                    <input
                      type="text"
                      className="input-field font-mono"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>SEO Description</label>
                    <textarea
                      className="textarea-field"
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                  </div>
                  <div className="form-buttons">
                    <button className="btn-cancel" onClick={() => setEditingPageId(null)}>
                      <X size={13} /> Cancel
                    </button>
                    <button className="btn-save" onClick={() => handleSaveEdit(page.id)}>
                      <Check size={13} /> Save
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="page-row"
                  onClick={() => setActivePage(page.id)}
                >
                  <div className="page-main-info">
                    <div className="page-title-line">
                      <FileCode size={14} className={isActive ? 'text-accent' : 'text-secondary'} />
                      <span className="page-name">{page.name}</span>
                      {page.isHome && <span className="home-badge">Home</span>}
                    </div>
                    <span className="page-slug font-mono">{page.slug}</span>
                  </div>

                  <div className="page-row-actions">
                    {!page.isHome && (
                      <button
                        className="action-icon-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          updatePage(page.id, { isHome: true });
                        }}
                        title="Set as Homepage"
                      >
                        <Home size={13} />
                      </button>
                    )}
                    <button
                      className="action-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEdit(page);
                      }}
                      title="Page Settings & SEO"
                    >
                      <Settings size={13} />
                    </button>
                    <button
                      className="action-icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicatePage(page.id);
                      }}
                      title="Duplicate Page"
                    >
                      <Copy size={13} />
                    </button>
                    {project.pages.length > 1 && (
                      <button
                        className="action-icon-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(page);
                        }}
                        title="Delete Page"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .pages-manager {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .pages-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .pages-title {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .pages-subtitle {
          font-size: 11px;
          color: var(--text-muted);
        }

        .add-page-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--accent-subtle);
          color: var(--accent);
          border: 1px solid var(--accent-border);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          transition: background 0.15s;
        }

        .add-page-btn:hover {
          background: var(--accent);
          color: var(--text-on-accent);
        }

        .add-page-card {
          margin: 10px 12px;
          padding: 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-muted);
          border-radius: var(--radius-md);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .card-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--text-muted);
        }

        .input-field, .textarea-field {
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          outline: none;
        }

        .input-field:focus, .textarea-field:focus {
          border-color: var(--border-focus);
        }

        .font-mono {
          font-family: var(--font-mono);
        }

        .form-buttons {
          display: flex;
          justify-content: flex-end;
          gap: 6px;
          margin-top: 4px;
        }

        .btn-cancel {
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--text-secondary);
        }

        .btn-cancel:hover {
          background: var(--bg-surface-hover);
        }

        .btn-save {
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          background: var(--accent);
          color: var(--text-on-accent);
        }

        .pages-list {
          flex: 1;
          overflow-y: auto;
          padding: 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .page-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: all 0.12s;
        }

        .page-card:hover {
          border-color: var(--border-muted);
        }

        .page-card.active {
          border-color: var(--accent-border);
          background: rgba(245, 158, 11, 0.04);
        }

        .page-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px;
          cursor: pointer;
        }

        .page-main-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .page-title-line {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .page-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .text-accent {
          color: var(--accent);
        }

        .home-badge {
          font-size: 9px;
          background: var(--accent);
          color: var(--text-on-accent);
          padding: 1px 4px;
          border-radius: 3px;
          font-weight: 700;
        }

        .page-slug {
          font-size: 11px;
          color: var(--text-muted);
        }

        .page-row-actions {
          display: flex;
          gap: 4px;
        }

        .action-icon-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          color: var(--text-secondary);
        }

        .action-icon-btn:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .action-icon-btn.delete:hover {
          color: var(--danger);
        }

        .page-edit-form {
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .form-group label {
          font-size: 10.5px;
          color: var(--text-muted);
          font-weight: 500;
        }
      `}</style>
    </div>
  );
};
