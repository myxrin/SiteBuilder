import React, { useEffect, useState } from 'react';
import { TopToolbar } from '../header/TopToolbar';
import { SidebarContainer } from '../sidebar/SidebarContainer';
import { CanvasContainer } from '../canvas/CanvasContainer';
import { InspectorContainer } from '../inspector/InspectorContainer';
import { FullscreenPreview } from '../preview/FullscreenPreview';
import { ElementsPalette } from '../sidebar/ElementsPalette';
import { LayersTree } from '../sidebar/LayersTree';
import { PagesManager } from '../sidebar/PagesManager';
import { AssetsManager } from '../sidebar/AssetsManager';
import { ProjectSettings } from '../sidebar/ProjectSettings';
import { useEditor } from '../../context/EditorContext';
import {
  Plus,
  Layers,
  FileCode,
  Sliders,
  Image as ImageIcon,
  Settings,
  X,
  GripHorizontal,
  Eye,
  CornerLeftUp,
  Copy,
  Trash2
} from 'lucide-react';

interface EditorWorkspaceProps {
  onBackToDashboard: () => void;
}

type MobileDrawerType = 'elements' | 'layers' | 'pages' | 'assets' | 'settings' | 'inspector' | null;

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({ onBackToDashboard }) => {
  const {
    isPreviewMode,
    setIsPreviewMode,
    selectedElementId,
    selectedElement,
    setSelectedElementId,
    duplicateElement,
    deleteElement
  } = useEditor();
  const [mobileDrawerTab, setMobileDrawerTab] = useState<MobileDrawerType>(null);

  const handleMobileTabToggle = (tab: MobileDrawerType) => {
    if (mobileDrawerTab === tab) {
      setMobileDrawerTab(null);
    } else {
      setMobileDrawerTab(tab);
    }
  };

  // Escape closes the mobile drawer.
  useEffect(() => {
    if (!mobileDrawerTab) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileDrawerTab(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileDrawerTab]);

  const getDrawerTitle = (tab: MobileDrawerType): string => {
    switch (tab) {
      case 'elements': return 'Add Elements';
      case 'layers': return 'Layers Tree';
      case 'pages': return 'Page Routes & SEO';
      case 'assets': return 'Media Library';
      case 'settings': return 'Site & Firebase Settings';
      case 'inspector': return 'Element Inspector';
      default: return '';
    }
  };

  return (
    <div className="editor-workspace-root">
      <TopToolbar onBackToDashboard={onBackToDashboard} />

      <div className="editor-main-layout">
        <SidebarContainer />
        <CanvasContainer />
        <InspectorContainer />
      </div>

      {/* Floating Selected Element Quick Bar for Mobile */}
      {selectedElement && !mobileDrawerTab && (
        <aside className="mobile-selected-bar" role="toolbar" aria-label="Selected element actions">
          <div className="mobile-selected-info">
            <span className="mobile-selected-badge">{selectedElement.type}</span>
            <span className="mobile-selected-name truncate">{selectedElement.name || selectedElement.type}</span>
          </div>

          <div className="mobile-selected-actions">
            <button
              className="mobile-act-btn inspect"
              onClick={() => setMobileDrawerTab('inspector')}
              title="Open Inspector"
              aria-label="Inspect element properties and styles"
            >
              <Sliders size={14} />
              <span>Inspect</span>
            </button>

            {selectedElement.parentId && (
              <button
                className="mobile-act-btn icon-only"
                onClick={() => setSelectedElementId(selectedElement.parentId)}
                title="Select parent"
                aria-label="Select parent container"
              >
                <CornerLeftUp size={15} />
              </button>
            )}

            <button
              className="mobile-act-btn icon-only"
              onClick={() => duplicateElement(selectedElement.id)}
              title="Duplicate"
              aria-label={`Duplicate ${selectedElement.name}`}
            >
              <Copy size={14} />
            </button>

            <button
              className="mobile-act-btn icon-only danger"
              onClick={() => deleteElement(selectedElement.id)}
              title="Delete"
              aria-label={`Delete ${selectedElement.name}`}
            >
              <Trash2 size={14} />
            </button>

            <button
              className="mobile-act-btn icon-only deselect"
              onClick={() => setSelectedElementId(null)}
              title="Deselect"
              aria-label="Deselect"
            >
              <X size={14} />
            </button>
          </div>
        </aside>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-bar" aria-label="Mobile editor navigation">
        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'elements' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('elements')}
          aria-pressed={mobileDrawerTab === 'elements'}
        >
          <Plus size={18} />
          <span>Add</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'layers' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('layers')}
          aria-pressed={mobileDrawerTab === 'layers'}
        >
          <Layers size={18} />
          <span>Layers</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'inspector' ? 'active' : ''} ${selectedElementId ? 'has-selection' : ''}`}
          onClick={() => handleMobileTabToggle('inspector')}
          aria-pressed={mobileDrawerTab === 'inspector'}
          aria-label={selectedElementId ? 'Inspect selected element' : 'Inspect'}
        >
          <Sliders size={18} />
          <span>Inspect</span>
          {selectedElementId && <span className="selection-dot" aria-hidden="true" />}
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'pages' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('pages')}
          aria-pressed={mobileDrawerTab === 'pages'}
        >
          <FileCode size={18} />
          <span>Pages</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'assets' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('assets')}
          aria-pressed={mobileDrawerTab === 'assets'}
        >
          <ImageIcon size={18} />
          <span>Media</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('settings')}
          aria-pressed={mobileDrawerTab === 'settings'}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Mobile Drawer / Bottom Sheet */}
      {mobileDrawerTab && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileDrawerTab(null)}>
          <div
            className="mobile-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={getDrawerTitle(mobileDrawerTab)}
          >
            <div className="mobile-drawer-header">
              <div className="drawer-handle-bar">
                <GripHorizontal size={18} />
              </div>
              <div className="drawer-title-row">
                <span className="drawer-title">{getDrawerTitle(mobileDrawerTab)}</span>
                <button
                  className="drawer-close-btn"
                  onClick={() => setMobileDrawerTab(null)}
                  aria-label="Close panel"
                  autoFocus
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="mobile-drawer-content">
              {mobileDrawerTab === 'elements' && <ElementsPalette />}
              {mobileDrawerTab === 'layers' && <LayersTree />}
              {mobileDrawerTab === 'pages' && <PagesManager />}
              {mobileDrawerTab === 'assets' && <AssetsManager />}
              {mobileDrawerTab === 'settings' && <ProjectSettings />}
              {mobileDrawerTab === 'inspector' && <InspectorContainer />}
            </div>
          </div>
        </div>
      )}

      {isPreviewMode && <FullscreenPreview />}

      <style>{`
        .editor-workspace-root {
          width: 100vw;
          height: 100vh;
          height: 100dvh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-workspace);
        }

        .editor-main-layout {
          display: flex;
          flex: 1;
          min-height: 0;
          height: calc(100vh - var(--header-height));
          height: calc(100dvh - var(--header-height));
          overflow: hidden;
          position: relative;
        }

        /* Mobile Bottom Bar - Hidden on Desktop */
        .mobile-bottom-bar {
          display: none;
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(56px + env(safe-area-inset-bottom));
          background: var(--bg-base);
          border-top: 1px solid var(--border-subtle);
          align-items: center;
          justify-content: space-around;
          padding: 0 4px;
          padding-bottom: env(safe-area-inset-bottom);
          z-index: 120;
          box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.4);
        }

        .mobile-tab-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          color: var(--text-secondary);
          font-size: 10px;
          font-weight: 500;
          padding: 6px 10px;
          min-width: 44px;
          min-height: 44px;
          border-radius: var(--radius-sm);
          position: relative;
          transition: all 0.12s;
        }

        .mobile-tab-btn:hover {
          color: var(--text-primary);
        }

        .mobile-tab-btn.active {
          color: var(--accent);
          background: var(--accent-subtle);
        }

        .selection-dot {
          position: absolute;
          top: 4px;
          right: 12px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
        }

        /* Floating Selected Element Quick Bar for Mobile */
        .mobile-selected-bar {
          display: none;
          position: fixed;
          bottom: calc(56px + env(safe-area-inset-bottom) + 8px);
          left: 8px;
          right: 8px;
          background: rgba(28, 30, 36, 0.96);
          backdrop-filter: blur(10px);
          border: 1px solid var(--border-muted);
          border-radius: 10px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
          padding: 6px 10px;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
          z-index: 100;
          animation: slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .mobile-selected-info {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
          flex: 1;
        }

        .mobile-selected-badge {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          background: var(--accent);
          color: var(--text-on-accent);
          padding: 2px 5px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .mobile-selected-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .mobile-selected-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }

        .mobile-act-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 9px;
          background: var(--bg-surface-hover);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: 11px;
          font-weight: 600;
          min-height: 36px;
          transition: background 0.12s;
        }

        .mobile-act-btn.inspect {
          background: var(--accent-subtle);
          border-color: var(--accent-border);
          color: var(--accent);
        }

        .mobile-act-btn.icon-only {
          padding: 5px 8px;
          min-width: 36px;
          justify-content: center;
        }

        .mobile-act-btn.danger:hover,
        .mobile-act-btn.danger:active {
          background: var(--danger-bg);
          color: var(--danger);
          border-color: var(--danger-border);
        }

        .mobile-act-btn.deselect {
          color: var(--text-muted);
        }

        /* Mobile Drawer / Bottom Sheet */
        .mobile-drawer-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: calc(56px + env(safe-area-inset-bottom));
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(3px);
          z-index: 110;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          animation: fadeIn 0.15s ease-out;
        }

        .mobile-drawer-panel {
          background: var(--bg-base);
          border-top: 1px solid var(--border-muted);
          border-radius: 16px 16px 0 0;
          height: calc(75vh - 56px);
          height: calc(75dvh - 56px);
          max-height: calc(85vh - 56px);
          max-height: calc(85dvh - 56px);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.5);
          animation: slideUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }

        .mobile-drawer-header {
          padding: 8px 16px 12px 16px;
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          background: var(--bg-surface);
        }

        .drawer-handle-bar {
          color: var(--text-muted);
          opacity: 0.6;
        }

        .drawer-title-row {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .drawer-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .drawer-close-btn {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          color: var(--text-muted);
        }

        .drawer-close-btn:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .mobile-drawer-content {
          flex: 1;
          overflow-y: auto;
        }

        .mobile-drawer-content .inspector-container,
        .mobile-drawer-content .sidebar-panel {
          width: 100% !important;
          height: 100% !important;
          border: none !important;
        }

        @media (max-width: 900px) {
          .editor-main-layout .sidebar-container {
            display: none !important;
          }

          .editor-main-layout .inspector-container {
            display: none !important;
          }

          .mobile-bottom-bar {
            display: flex;
          }

          .mobile-selected-bar {
            display: flex;
          }

          .editor-main-layout {
            height: calc(100vh - var(--header-height) - 56px);
            height: calc(100dvh - var(--header-height) - 56px - env(safe-area-inset-bottom));
          }
        }

        @media (pointer: coarse) {
          .drawer-close-btn {
            width: 40px;
            height: 40px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .mobile-drawer-backdrop,
          .mobile-drawer-panel {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
};
