import React, { useState } from 'react';
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
  Eye
} from 'lucide-react';

interface EditorWorkspaceProps {
  onBackToDashboard: () => void;
}

type MobileDrawerType = 'elements' | 'layers' | 'pages' | 'assets' | 'settings' | 'inspector' | null;

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({ onBackToDashboard }) => {
  const { isPreviewMode, setIsPreviewMode, selectedElementId } = useEditor();
  const [mobileDrawerTab, setMobileDrawerTab] = useState<MobileDrawerType>(null);

  const handleMobileTabToggle = (tab: MobileDrawerType) => {
    if (mobileDrawerTab === tab) {
      setMobileDrawerTab(null);
    } else {
      setMobileDrawerTab(tab);
    }
  };

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

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-bar" aria-label="Mobile editor navigation">
        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'elements' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('elements')}
        >
          <Plus size={18} />
          <span>Add</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'layers' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('layers')}
        >
          <Layers size={18} />
          <span>Layers</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'inspector' ? 'active' : ''} ${selectedElementId ? 'has-selection' : ''}`}
          onClick={() => handleMobileTabToggle('inspector')}
        >
          <Sliders size={18} />
          <span>Inspect</span>
          {selectedElementId && <span className="selection-dot" />}
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'pages' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('pages')}
        >
          <FileCode size={18} />
          <span>Pages</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'assets' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('assets')}
        >
          <ImageIcon size={18} />
          <span>Media</span>
        </button>

        <button
          className={`mobile-tab-btn ${mobileDrawerTab === 'settings' ? 'active' : ''}`}
          onClick={() => handleMobileTabToggle('settings')}
        >
          <Settings size={18} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Mobile Drawer / Bottom Sheet */}
      {mobileDrawerTab && (
        <div className="mobile-drawer-backdrop" onClick={() => setMobileDrawerTab(null)}>
          <div className="mobile-drawer-panel" onClick={(e) => e.stopPropagation()}>
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
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-workspace);
        }

        .editor-main-layout {
          display: flex;
          flex: 1;
          height: calc(100vh - var(--header-height));
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
          height: 56px;
          background: var(--bg-base);
          border-top: 1px solid var(--border-subtle);
          align-items: center;
          justify-content: space-around;
          padding: 0 4px;
          z-index: 90;
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

        /* Mobile Drawer / Bottom Sheet */
        .mobile-drawer-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(3px);
          z-index: 100;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          animation: fadeIn 0.15s ease-out;
        }

        .mobile-drawer-panel {
          background: var(--bg-base);
          border-top: 1px solid var(--border-muted);
          border-radius: 16px 16px 0 0;
          height: 72vh;
          max-height: 85vh;
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

          .editor-main-layout {
            height: calc(100vh - var(--header-height) - 56px);
          }
        }
      `}</style>
    </div>
  );
};
