import React from 'react';
import {
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
  Lock,
  ShieldCheck
} from 'lucide-react';
import { ElementType } from '../../types/document';
import { useEditor } from '../../context/EditorContext';

interface ElementCategory {
  title: string;
  items: Array<{
    type: ElementType;
    label: string;
    description: string;
    icon: React.ReactNode;
  }>;
}

const CATEGORIES: ElementCategory[] = [
  {
    title: 'Layout & Structure',
    items: [
      {
        type: 'section',
        label: 'Section',
        description: 'Full-width semantic section wrapper',
        icon: <Square size={16} />
      },
      {
        type: 'container',
        label: 'Container',
        description: 'Centered content wrapper (max-width)',
        icon: <Columns size={16} />
      },
      {
        type: 'grid',
        label: 'Grid (3 Col)',
        description: 'Responsive multi-column grid layout',
        icon: <Grid3X3 size={16} />
      },
      {
        type: 'card',
        label: 'Card',
        description: 'Padded container with subtle border',
        icon: <CreditCard size={16} />
      }
    ]
  },
  {
    title: 'Typography',
    items: [
      {
        type: 'heading',
        label: 'Heading',
        description: 'Title from H1 to H6',
        icon: <Heading size={16} />
      },
      {
        type: 'paragraph',
        label: 'Paragraph',
        description: 'Body text and descriptions',
        icon: <Type size={16} />
      },
      {
        type: 'link',
        label: 'Link',
        description: 'Text hyperlink',
        icon: <Link size={16} />
      },
      {
        type: 'list',
        label: 'List',
        description: 'Bulleted or numbered list',
        icon: <List size={16} />
      }
    ]
  },
  {
    title: 'Components & Media',
    items: [
      {
        type: 'button',
        label: 'Button',
        description: 'Call-to-action button',
        icon: <MousePointerClick size={16} />
      },
      {
        type: 'image',
        label: 'Image',
        description: 'Responsive picture or graphic',
        icon: <ImageIcon size={16} />
      },
      {
        type: 'navbar',
        label: 'Navbar',
        description: 'Header with brand & links',
        icon: <Menu size={16} />
      },
      {
        type: 'divider',
        label: 'Divider',
        description: 'Horizontal separator line',
        icon: <Minus size={16} />
      },
      {
        type: 'spacer',
        label: 'Spacer',
        description: 'Adjustable vertical space',
        icon: <Maximize2 size={16} />
      },
      {
        type: 'shape',
        label: 'Shape',
        description: 'Geometric colored shape',
        icon: <Circle size={16} />
      }
    ]
  },
  {
    title: 'Forms & Authentication',
    items: [
      {
        type: 'auth',
        label: 'Firebase Login',
        description: 'Email, Password & Google Sign-in Card',
        icon: <Lock size={16} />
      }
    ]
  }
];

export const ElementsPalette: React.FC = () => {
  const { addElement } = useEditor();

  const handleAdd = (type: ElementType) => {
    addElement(type);
  };

  return (
    <div className="elements-palette">
      <div className="palette-header">
        <span className="palette-title">Add Elements</span>
        <span className="palette-subtitle">Click to add to canvas or container</span>
      </div>

      <div className="categories-list">
        {CATEGORIES.map((cat, idx) => (
          <div key={idx} className="category-group">
            <div className="category-title">{cat.title}</div>
            <div className="elements-grid">
              {cat.items.map(item => (
                <button
                  key={item.type}
                  className="element-card"
                  onClick={() => handleAdd(item.type)}
                  title={`Add ${item.label} to active section`}
                >
                  <div className="element-icon-box">{item.icon}</div>
                  <div className="element-meta">
                    <span className="element-label">{item.label}</span>
                    <span className="element-desc">{item.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        .elements-palette {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow-y: auto;
          padding: 12px;
        }

        .palette-header {
          margin-bottom: 14px;
        }

        .palette-title {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .palette-subtitle {
          font-size: 11px;
          color: var(--text-muted);
        }

        .category-group {
          margin-bottom: 18px;
        }

        .category-title {
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--text-muted);
          margin-bottom: 8px;
          padding-left: 2px;
        }

        .elements-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .element-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          text-align: left;
          transition: all 0.15s ease;
        }

        .element-card:hover {
          background: var(--bg-surface-hover);
          border-color: var(--border-muted);
          transform: translateX(2px);
        }

        .element-card:active {
          transform: translateX(0);
        }

        .element-icon-box {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-workspace);
          border-radius: var(--radius-sm);
          color: var(--accent);
          flex-shrink: 0;
        }

        .element-meta {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .element-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .element-desc {
          font-size: 10.5px;
          color: var(--text-muted);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
    </div>
  );
};
