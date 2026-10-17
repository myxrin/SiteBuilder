import React, { useState } from 'react';
import {
  FileCode,
  Plus,
  Home,
  Trash2,
  Copy,
  Settings,
  Check,
  X,
  AlertTriangle
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
  // Tracks whether the user typed their own slug. While false the slug keeps
  // following the page name (previously it froze after the first keystroke).
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  // Form states for editing page
  const [editTitle, setEditTitle] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const deriveSlug = (name: string) => sanitizeSlug(name.toLowerCase().replace(/\s+/g, '-'));

  const handleStartAdd = () => {
    setIsAdding(true);
    setNewPageName('');
    setNewPageSlug('');
    setSlugManuallyEdited(false);
    setAddError(null);
  };

  const handleConfirmAdd = () => {
    const name = newPageName.trim();
    if (!name) {
      setAddError('Enter a page name first.');
      return;
    }
    const slug = newPageSlug.trim() ? sanitizeSlug(newPageSlug) : deriveSlug(name);

    if (project.pages.some(p => p.slug === slug)) {
      setAddError(`The slug "${slug}" is already in use by another page.`);
      return;
    }

    addPage(name, slug);
    setIsAdding(false);
    setAddError(null);
  };

  const handleStartEdit = (page: Page) => {
    setEditingPageId(page.id);
    setEditError(null);
    setEditTitle(page.title || page.name);
    setEditSlug(page.slug);
    setEditDesc(page.description || '');
  };

  const handleSaveEdit = (pageId: string) => {
    const title = editTitle.trim();
    if (!title) {
      setEditError('Page title cannot be empty.');
      return;
    }
    const slug = sanitizeSlug(editSlug);
    // Verify unique slug
    if (project.pages.some(p => p.id !== pageId && p.slug === slug)) {
      setEditError(`The slug "${slug}" is already used by another page.`);
      return;
    }

    updatePage(pageId, {
      title,
      slug,
      description: editDesc.trim()
    });
    setEditingPageId(null);
    setEditError(null);
  };

  const handleDelete = (page: Page) => {
    if (project.pages.length <= 1) {
      // The delete button is hidden in this case; guard anyway.
      setConfirmingDeleteId(null);
      return;
    }
    const result = deletePage(page.id);
    if (!result.ok && result.message) {
      setAddError(result.message);
    }
    setConfirmingDeleteId(null);
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
            aria-label="New page name"
            onChange={(e) => {
              const value = e.target.value;
              setNewPageName(value);
              setAddError(null);
              if (!slugManuallyEdited) {
                setNewPageSlug(value.trim() ? deriveSlug(value) : '');
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmAdd();
              if (e.key === 'Escape') setIsAdding(false);
            }}
            autoFocus
          />
          <input
            type="text"
            className="input-field font-mono"
            placeholder="Route Slug (e.g. /services)"
            value={newPageSlug}
            aria-label="New page URL slug"
            onChange={(e) => {
              setNewPageSlug(e.target.value);
              setSlugManuallyEdited(true);
              setAddError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleConfirmAdd();
              if (e.key === 'Escape') setIsAdding(false);
            }}
          />
          {addError && (
            <div className="form-error" role="alert">
              <AlertTriangle size={12} />
              <span>{addError}</span>
            </div>
          )}
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
          const isConfirmingDelete = page.id === confirmingDeleteId;

          return (
            <div key={page.id} className={`page-card ${isActive ? 'active' : ''}`}>
              {isEditing ? (
                <div className="page-edit-form">
                  <div className="form-group">
                    <label htmlFor={`page-title-${page.id}`}>Page Title</label>
                    <input
                      id={`page-title-${page.id}`}
                      type="text"
                      className="input-field"
                      value={editTitle}
                      onChange={(e) => {
                        setEditTitle(e.target.value);
                        setEditError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(page.id);
                        if (e.key === 'Escape') setEditingPageId(null);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`page-slug-${page.id}`}>URL Slug</label>
                    <input
                      id={`page-slug-${page.id}`}
                      type="text"
                      className="input-field font-mono"
                      value={editSlug}
                      onChange={(e) => {
                        setEditSlug(e.target.value);
                        setEditError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit(page.id);
                        if (e.key === 'Escape') setEditingPageId(null);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor={`page-desc-${page.id}`}>SEO Description</label>
                    <textarea
                      id={`page-desc-${page.id}`}
                      className="textarea-field"
                      rows={2}
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                  </div>
                  {editError && (
                    <div className="form-error" role="alert">
                      <AlertTriangle size={12} />
                      <span>{editError}</span>
                    </div>
                  )}
                  <div className="form-buttons">
                    <button className="btn-cancel" onClick={() => setEditingPageId(null)}>
                      <X size={13} /> Cancel
                    </button>
                    <button className="btn-save" onClick={() => handleSaveEdit(page.id)}>
                      <Check size={13} /> Save
                    </button>
                  </div>
                </div>
              ) : isConfirmingDelete ? (
                <div className="inline-confirm" role="alertdialog" aria-label={`Confirm deleting ${page.name}`}>
                  <span className="inline-confirm-text">
                    Delete “{page.name}”? It can be restored with Ctrl+Z.
                  </span>
                  <div className="form-buttons">
                    <button className="btn-cancel" onClick={() => setConfirmingDeleteId(null)}>
                      Keep
                    </button>
                    <button className="btn-danger" onClick={() => handleDelete(page)} autoFocus>
                      Delete
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
                        aria-label={`Set ${page.name} as homepage`}
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
                      aria-label={`Edit settings for ${page.name}`}
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
                      aria-label={`Duplicate ${page.name}`}
                    >
                      <Copy size={13} />
                    </button>
                    {project.pages.length > 1 && (
                      <button
                        className="action-icon-btn delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingDeleteId(page.id);
                        }}
                        title="Delete Page"
                        aria-label={`Delete ${page.name}`}
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

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-danger {
          padding: 4px 12px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          background: var(--danger);
          color: #fff;
        }

        .form-error {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 6px 8px;
          border-radius: var(--radius-sm);
          background: rgba(239, 68, 68, 0.12);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #fca5a5;
          font-size: 11px;
          line-height: 1.35;
        }

        .form-error svg {
          flex-shrink: 0;
          margin-top: 1px;
        }

        .inline-confirm {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 10px;
          border-left: 3px solid var(--danger);
          background: rgba(239, 68, 68, 0.06);
        }

        .inline-confirm-text {
          font-size: 11.5px;
          color: var(--text-primary);
          line-height: 1.4;
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
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .page-row-actions {
          display: flex;
          gap: 4px;
          flex-shrink: 0;
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

        @media (max-width: 900px), (pointer: coarse) {
          .action-icon-btn {
            width: 40px;
            height: 40px;
          }

          .add-page-btn, .btn-cancel, .btn-save, .btn-danger {
            min-height: 40px;
            padding-left: 12px;
            padding-right: 12px;
          }
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
