import React, { useState } from 'react';
import {
  Plus,
  Layers,
  FileCode,
  Image as ImageIcon,
  Settings,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useEditor, SidebarTab } from '../../context/EditorContext';
import { ElementsPalette } from './ElementsPalette';
import { LayersTree } from './LayersTree';
import { PagesManager } from './PagesManager';
import { AssetsManager } from './AssetsManager';
import { ProjectSettings } from './ProjectSettings';

export const SidebarContainer: React.FC = () => {
  const { activeSidebarTab, setActiveSidebarTab } = useEditor();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const tabs: Array<{ id: SidebarTab; label: string; icon: React.ReactNode }> = [
    { id: 'elements', label: 'Add', icon: <Plus size={16} /> },
    { id: 'layers', label: 'Layers', icon: <Layers size={16} /> },
    { id: 'pages', label: 'Pages', icon: <FileCode size={16} /> },
    { id: 'assets', label: 'Assets', icon: <ImageIcon size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> }
  ];

  const handleTabClick = (tabId: SidebarTab) => {
    if (isCollapsed) {
      setIsCollapsed(false);
      setActiveSidebarTab(tabId);
    } else if (activeSidebarTab === tabId) {
      // Toggle collapse if clicking current active tab
      setIsCollapsed(true);
    } else {
      setActiveSidebarTab(tabId);
    }
  };

  return (
    <aside className={`sidebar-container ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Icon Rail */}
      <nav className="sidebar-rail" aria-label="Sidebar navigation">
        <div className="rail-top">
          {tabs.map(tab => {
            const isActive = !isCollapsed && activeSidebarTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`rail-tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => handleTabClick(tab.id)}
                title={tab.label}
                aria-label={tab.label}
              >
                {tab.icon}
                <span className="rail-label">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="rail-bottom">
          <button
            className="rail-tab-btn collapse-toggle"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>
      </nav>

      {/* Panel Content */}
      {!isCollapsed && (
        <div className="sidebar-panel">
          {activeSidebarTab === 'elements' && <ElementsPalette />}
          {activeSidebarTab === 'layers' && <LayersTree />}
          {activeSidebarTab === 'pages' && <PagesManager />}
          {activeSidebarTab === 'assets' && <AssetsManager />}
          {activeSidebarTab === 'settings' && <ProjectSettings />}
        </div>
      )}

      <style>{`
        .sidebar-container {
          display: flex;
          height: calc(100vh - var(--header-height));
          height: calc(100dvh - var(--header-height));
          background: var(--bg-base);
          border-right: 1px solid var(--border-subtle);
          user-select: none;
          z-index: 20;
          transition: width 0.15s ease;
        }

        .sidebar-rail {
          width: 52px;
          height: 100%;
          background: var(--bg-workspace);
          border-right: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          flex-shrink: 0;
        }

        .rail-top, .rail-bottom {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          width: 100%;
        }

        .rail-tab-btn {
          width: 40px;
          height: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          transition: all 0.12s;
          gap: 2px;
        }

        .rail-tab-btn:hover {
          background: var(--bg-surface);
          color: var(--text-primary);
        }

        .rail-tab-btn.active {
          background: var(--accent-subtle);
          color: var(--accent);
          border: 1px solid var(--accent-border);
        }

        .rail-label {
          font-size: 9px;
          font-weight: 500;
        }

        .collapse-toggle {
          color: var(--text-muted);
        }

        .sidebar-panel {
          width: calc(var(--sidebar-width) - 52px);
          height: 100%;
          background: var(--bg-base);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        @media (max-width: 768px) {
          .sidebar-panel {
            width: 220px;
          }
        }
      `}</style>
    </aside>
  );
};
