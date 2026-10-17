import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Square,
  Columns,
  Grid3X3,
  Heading,
  Type,
  MousePointerClick,
  Image as ImageIcon,
  Link,
  Minus,
  Maximize2,
  Circle,
  List,
  Menu,
  CreditCard,
  Lock
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { SiteElement, ElementType } from '../../types/document';

function getElementIcon(type: ElementType) {
  switch (type) {
    case 'section': return <Square size={13} />;
    case 'container': return <Columns size={13} />;
    case 'grid': return <Grid3X3 size={13} />;
    case 'card': return <CreditCard size={13} />;
    case 'heading': return <Heading size={13} />;
    case 'paragraph': return <Type size={13} />;
    case 'button': return <MousePointerClick size={13} />;
    case 'image': return <ImageIcon size={13} />;
    case 'link': return <Link size={13} />;
    case 'divider': return <Minus size={13} />;
    case 'spacer': return <Maximize2 size={13} />;
    case 'shape': return <Circle size={13} />;
    case 'list': return <List size={13} />;
    case 'navbar': return <Menu size={13} />;
    case 'auth': return <Lock size={13} />;
    default: return <Square size={13} />;
  }
}

interface LayerItemProps {
  element: SiteElement;
  depth: number;
  elementsMap: Record<string, SiteElement>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveUp: (element: SiteElement) => void;
  onMoveDown: (element: SiteElement) => void;
  isRoot: boolean;
}

const LayerNode: React.FC<LayerItemProps> = ({
  element,
  depth,
  elementsMap,
  selectedId,
  onSelect,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isRoot
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const isSelected = selectedId === element.id;
  const hasChildren = element.children && element.children.length > 0;

  return (
    <div className="layer-node-wrapper">
      <div
        className={`layer-item ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${depth * 14 + 8}px` }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(element.id);
        }}
      >
        <span
          className="layer-expand-toggle"
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />
          ) : (
            <span style={{ width: 12 }} />
          )}
        </span>

        <span className="layer-type-icon">{getElementIcon(element.type)}</span>
        <span className="layer-name truncate">{element.name || element.type}</span>

        {!isRoot && (
          <div className="layer-actions">
            <button
              className="layer-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onMoveUp(element);
              }}
              title="Move up"
              aria-label="Move up"
            >
              <ArrowUp size={11} />
            </button>
            <button
              className="layer-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown(element);
              }}
              title="Move down"
              aria-label="Move down"
            >
              <ArrowDown size={11} />
            </button>
            <button
              className="layer-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(element.id);
              }}
              title="Duplicate"
              aria-label="Duplicate"
            >
              <Copy size={11} />
            </button>
            <button
              className="layer-action-btn delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(element.id);
              }}
              title="Delete"
              aria-label="Delete"
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {hasChildren && isExpanded && (
        <div className="layer-children">
          {element.children.map(childId => {
            const childEl = elementsMap[childId];
            if (!childEl) return null;
            return (
              <LayerNode
                key={childId}
                element={childEl}
                depth={depth + 1}
                elementsMap={elementsMap}
                selectedId={selectedId}
                onSelect={onSelect}
                onDuplicate={onDuplicate}
                onDelete={onDelete}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                isRoot={false}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export const LayersTree: React.FC = () => {
  const {
    activePage,
    selectedElementId,
    setSelectedElementId,
    duplicateElement,
    deleteElement,
    moveElement
  } = useEditor();

  if (!activePage) return null;

  const rootEl = activePage.elements[activePage.rootElementId];

  const handleMoveUp = (el: SiteElement) => {
    if (!el.parentId || !activePage.elements[el.parentId]) return;
    const parent = activePage.elements[el.parentId];
    const idx = parent.children.indexOf(el.id);
    if (idx > 0) {
      moveElement(el.id, parent.id, idx - 1);
    }
  };

  const handleMoveDown = (el: SiteElement) => {
    if (!el.parentId || !activePage.elements[el.parentId]) return;
    const parent = activePage.elements[el.parentId];
    const idx = parent.children.indexOf(el.id);
    if (idx < parent.children.length - 1) {
      moveElement(el.id, parent.id, idx + 1);
    }
  };

  return (
    <div className="layers-tree-container">
      <div className="layers-header">
        <span className="layers-title">Layers / Tree</span>
        <span className="layers-subtitle">Page structure & hierarchy</span>
      </div>

      <div className="layers-content">
        {rootEl ? (
          <LayerNode
            element={rootEl}
            depth={0}
            elementsMap={activePage.elements}
            selectedId={selectedElementId}
            onSelect={setSelectedElementId}
            onDuplicate={duplicateElement}
            onDelete={deleteElement}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            isRoot={true}
          />
        ) : (
          <div className="empty-layers">No root element found.</div>
        )}
      </div>

      <style>{`
        .layers-tree-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .layers-header {
          padding: 12px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .layers-title {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .layers-subtitle {
          font-size: 11px;
          color: var(--text-muted);
        }

        .layers-content {
          flex: 1;
          overflow-y: auto;
          padding: 6px 0;
        }

        .layer-node-wrapper {
          display: flex;
          flex-direction: column;
        }

        .layer-item {
          display: flex;
          align-items: center;
          height: 30px;
          padding-right: 8px;
          cursor: pointer;
          user-select: none;
          gap: 6px;
          transition: background 0.12s;
        }

        .layer-item:hover {
          background: var(--bg-surface-hover);
        }

        .layer-item.selected {
          background: var(--accent-subtle);
          color: var(--accent);
          font-weight: 600;
        }

        .layer-expand-toggle {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          color: var(--text-muted);
        }

        .layer-type-icon {
          color: var(--text-secondary);
          display: flex;
          align-items: center;
        }

        .layer-item.selected .layer-type-icon {
          color: var(--accent);
        }

        .layer-name {
          flex: 1;
          font-size: 12px;
          color: inherit;
        }

        .layer-actions {
          display: none;
          align-items: center;
          gap: 2px;
        }

        .layer-item:hover .layer-actions,
        .layer-item.selected .layer-actions {
          display: flex;
        }

        .layer-action-btn {
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          color: var(--text-muted);
          transition: all 0.12s;
        }

        .layer-action-btn:hover {
          background: var(--bg-surface-active);
          color: var(--text-primary);
        }

        .layer-action-btn.delete-btn:hover {
          color: var(--danger);
        }

        .empty-layers {
          padding: 24px;
          text-align: center;
          color: var(--text-muted);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
