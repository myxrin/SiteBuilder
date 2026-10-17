import React, { useState, useEffect } from 'react';
import {
  X,
  Monitor,
  Tablet,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { Viewport, SiteElement, ElementStyles } from '../../types/document';

interface PreviewElementProps {
  element: SiteElement;
  elementsMap: Record<string, SiteElement>;
  viewport: Viewport;
  onNavigatePage: (pageId: string) => void;
  pagesMap: Record<string, string>; // slug -> pageId
}

const PreviewElement: React.FC<PreviewElementProps> = ({
  element,
  elementsMap,
  viewport,
  onNavigatePage,
  pagesMap
}) => {
  const s = element.styles || {};
  const r = (viewport !== 'desktop' && element.responsiveStyles?.[viewport]) || {};
  const merged: ElementStyles = { ...s, ...r };

  const styleObj: React.CSSProperties = {};
  if (merged.display) styleObj.display = merged.display;
  if (merged.flexDirection) styleObj.flexDirection = merged.flexDirection;
  if (merged.justifyContent) styleObj.justifyContent = merged.justifyContent;
  if (merged.alignItems) styleObj.alignItems = merged.alignItems;
  if (merged.flexWrap) styleObj.flexWrap = merged.flexWrap;
  if (merged.gap) styleObj.gap = merged.gap;
  if (merged.gridTemplateColumns) styleObj.gridTemplateColumns = merged.gridTemplateColumns;

  if (merged.width) styleObj.width = merged.width;
  if (merged.maxWidth) styleObj.maxWidth = merged.maxWidth;
  if (merged.minWidth) styleObj.minWidth = merged.minWidth;
  if (merged.height) styleObj.height = merged.height;
  if (merged.maxHeight) styleObj.maxHeight = merged.maxHeight;
  if (merged.minHeight) styleObj.minHeight = merged.minHeight;

  if (merged.padding) {
    const p = merged.padding;
    styleObj.padding = `${p.top || '0'} ${p.right || '0'} ${p.bottom || '0'} ${p.left || '0'}`;
  }
  if (merged.margin) {
    const m = merged.margin;
    styleObj.margin = `${m.top || '0'} ${m.right || '0'} ${m.bottom || '0'} ${m.left || '0'}`;
  }

  if (merged.fontFamily) styleObj.fontFamily = merged.fontFamily;
  if (merged.fontSize) styleObj.fontSize = merged.fontSize;
  if (merged.fontWeight) styleObj.fontWeight = merged.fontWeight;
  if (merged.lineHeight) styleObj.lineHeight = merged.lineHeight;
  if (merged.letterSpacing) styleObj.letterSpacing = merged.letterSpacing;
  if (merged.textAlign) styleObj.textAlign = merged.textAlign;
  if (merged.color) styleObj.color = merged.color;
  if (merged.textTransform) styleObj.textTransform = merged.textTransform;
  if (merged.textDecoration) styleObj.textDecoration = merged.textDecoration;

  if (merged.backgroundColor) styleObj.backgroundColor = merged.backgroundColor;
  if (merged.backgroundImage) styleObj.backgroundImage = merged.backgroundImage;
  if (merged.backgroundSize) styleObj.backgroundSize = merged.backgroundSize;
  if (merged.backgroundPosition) styleObj.backgroundPosition = merged.backgroundPosition;
  if (typeof merged.opacity === 'number') styleObj.opacity = merged.opacity;
  if (merged.overflow) styleObj.overflow = merged.overflow;

  if (merged.borderWidth && merged.borderWidth !== '0') {
    styleObj.borderWidth = merged.borderWidth;
    styleObj.borderStyle = (merged.borderStyle as any) || 'solid';
    if (merged.borderColor) styleObj.borderColor = merged.borderColor;
  }
  if (merged.borderRadius) styleObj.borderRadius = merged.borderRadius;
  if (merged.boxShadow) styleObj.boxShadow = merged.boxShadow;

  const childrenElements = (element.children || [])
    .map(childId => elementsMap[childId])
    .filter(Boolean);

  const handleLinkClick = (e: React.MouseEvent, href?: string) => {
    if (!href) return;
    const clean = href.trim();
    if (pagesMap[clean]) {
      e.preventDefault();
      onNavigatePage(pagesMap[clean]);
    } else if (clean.startsWith('#')) {
      // Allow internal anchor jump
    } else if (clean.startsWith('http')) {
      // Allow external link
    }
  };

  switch (element.type) {
    case 'heading': {
      const Tag = (`h${element.props.headingLevel || 2}`) as any;
      return <Tag style={styleObj}>{element.props.text}</Tag>;
    }
    case 'paragraph':
      return <p style={styleObj}>{element.props.text}</p>;
    case 'button':
      return (
        <a
          href={element.props.href || '#'}
          target={element.props.target || '_self'}
          style={styleObj}
          onClick={(e) => handleLinkClick(e, element.props.href)}
        >
          {element.props.text || 'Button'}
        </a>
      );
    case 'link':
      return (
        <a
          href={element.props.href || '#'}
          target={element.props.target || '_self'}
          style={styleObj}
          onClick={(e) => handleLinkClick(e, element.props.href)}
        >
          {element.props.text || 'Link'}
        </a>
      );
    case 'image':
      return (
        <img
          src={element.props.src || ''}
          alt={element.props.alt || ''}
          style={{
            ...styleObj,
            objectFit: element.props.objectFit || 'cover',
            display: 'block'
          }}
          loading="lazy"
        />
      );
    case 'divider':
      return <hr style={styleObj} />;
    case 'spacer':
      return <div style={styleObj} />;
    case 'shape':
      return <div style={styleObj} />;
    case 'list': {
      const isOrdered = element.props.listType === 'ordered';
      const items = element.props.listItems || [];
      const ListTag = isOrdered ? 'ol' : 'ul';
      return (
        <ListTag style={{ ...styleObj, paddingLeft: '20px' }}>
          {items.map((it, idx) => (
            <li key={idx}>{it}</li>
          ))}
        </ListTag>
      );
    }
    case 'navbar': {
      const brand = element.props.brandText || 'Brand';
      const links = element.props.navLinks || [];
      return (
        <header style={styleObj}>
          <a
            href={element.props.brandLink || '/'}
            style={{ fontWeight: 700, fontSize: '1.25rem' }}
            onClick={(e) => handleLinkClick(e, element.props.brandLink)}
          >
            {brand}
          </a>
          <nav style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {links.map(l => (
              <a
                key={l.id}
                href={l.href}
                style={{ fontSize: '14px', fontWeight: 500 }}
                onClick={(e) => handleLinkClick(e, l.href)}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </header>
      );
    }
    case 'auth': {
      return (
        <div style={{ ...styleObj, boxSizing: 'border-box' }}>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{element.props.authTitle || 'Welcome Back'}</h3>
            <p style={{ fontSize: '13px', color: '#64748b' }}>{element.props.authSubtitle || 'Sign in to access your account'}</p>
          </div>
          <form onSubmit={(e) => e.preventDefault()} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Email address</label>
              <input type="email" placeholder="name@company.com" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>Password</label>
              <input type="password" placeholder="••••••••" style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" style={{ marginTop: '4px', padding: '10px', background: '#f59e0b', color: '#0f172a', border: 'none', fontWeight: 700, fontSize: '13.5px', borderRadius: '8px', cursor: 'pointer' }}>
              Sign In
            </button>
            {element.props.enableGoogleAuth && (
              <>
                <div style={{ textAlign: 'center', margin: '8px 0', color: '#94a3b8', fontSize: '11px' }}>or continue with</div>
                <button type="button" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '9px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#334155' }}>
                  <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
                  <span>Google Account</span>
                </button>
              </>
            )}
          </form>
        </div>
      );
    }
    default:
      return (
        <div style={styleObj}>
          {childrenElements.map(c => (
            <PreviewElement
              key={c.id}
              element={c}
              elementsMap={elementsMap}
              viewport={viewport}
              onNavigatePage={onNavigatePage}
              pagesMap={pagesMap}
            />
          ))}
        </div>
      );
  }
};

export const FullscreenPreview: React.FC = () => {
  const {
    project,
    activePage,
    setActivePage,
    setIsPreviewMode
  } = useEditor();

  const [previewViewport, setPreviewViewport] = useState<Viewport>('desktop');
  const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);

  // Escape leaves the preview. While the page dropdown is open it is the
  // topmost transient UI: consume that Escape during the capture phase so the
  // editor-wide shortcut (which exits preview mode) cannot close everything.
  useEffect(() => {
    if (!isPageDropdownOpen) return;
    const handleCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setIsPageDropdownOpen(false);
    };
    window.addEventListener('keydown', handleCapture, true);
    return () => window.removeEventListener('keydown', handleCapture, true);
  }, [isPageDropdownOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setIsPreviewMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsPreviewMode]);

  // Map slugs to page IDs for live preview navigation
  const pagesMap: Record<string, string> = {};
  project.pages.forEach(p => {
    pagesMap[p.slug] = p.id;
    if (p.slug.startsWith('/')) {
      pagesMap[p.slug.slice(1)] = p.id;
    }
    if (p.isHome) {
      pagesMap['/'] = p.id;
      pagesMap[''] = p.id;
    }
  });

  const rootElement = activePage?.elements[activePage.rootElementId];

  let frameWidth = '100%';
  let maxWidth = '1200px';

  if (previewViewport === 'tablet') {
    frameWidth = '768px';
    // Cap at the available width so narrow phones never get horizontal scroll.
    maxWidth = '100%';
  } else if (previewViewport === 'mobile') {
    frameWidth = '375px';
    maxWidth = '100%';
  }

  return (
    <div className="fullscreen-preview-overlay" role="dialog" aria-modal="true" aria-label="Fullscreen preview">
      {/* Floating Control Bar */}
      <div className="preview-topbar">
        <div className="preview-topbar-left">
          <span className="preview-badge">LIVE PREVIEW</span>

          {/* Page Selector */}
          <div className="preview-page-select">
            <button
              className="preview-page-trigger"
              onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
              aria-haspopup="menu"
              aria-expanded={isPageDropdownOpen}
              aria-label={`Preview page: ${activePage?.name || 'Page'}. Click to switch.`}
            >
              <span>{activePage?.name}</span>
              <ChevronDown size={13} />
            </button>
            {isPageDropdownOpen && (
              <>
                <div className="dropdown-backdrop" onClick={() => setIsPageDropdownOpen(false)} />
                <div className="preview-dropdown-menu" role="menu">
                  {project.pages.map(p => (
                    <button
                      key={p.id}
                      role="menuitem"
                      className={`preview-page-item ${p.id === activePage?.id ? 'active' : ''}`}
                      onClick={() => {
                        setActivePage(p.id);
                        setIsPageDropdownOpen(false);
                      }}
                    >
                      <span>{p.name}</span>
                      <span className="p-slug">{p.slug}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Viewport Switcher */}
        <div className="preview-viewport-controls" role="group" aria-label="Preview viewport">
          <button
            className={`pv-btn ${previewViewport === 'desktop' ? 'active' : ''}`}
            onClick={() => setPreviewViewport('desktop')}
            title="Desktop"
            aria-label="Desktop preview"
            aria-pressed={previewViewport === 'desktop'}
          >
            <Monitor size={14} />
          </button>
          <button
            className={`pv-btn ${previewViewport === 'tablet' ? 'active' : ''}`}
            onClick={() => setPreviewViewport('tablet')}
            title="Tablet"
            aria-label="Tablet preview"
            aria-pressed={previewViewport === 'tablet'}
          >
            <Tablet size={14} />
          </button>
          <button
            className={`pv-btn ${previewViewport === 'mobile' ? 'active' : ''}`}
            onClick={() => setPreviewViewport('mobile')}
            title="Mobile"
            aria-label="Mobile preview"
            aria-pressed={previewViewport === 'mobile'}
          >
            <Smartphone size={14} />
          </button>
        </div>

        {/* Exit Button */}
        <button
          className="exit-preview-btn"
          onClick={() => setIsPreviewMode(false)}
          title="Exit Preview (Esc)"
          aria-label="Exit preview"
        >
          <X size={15} />
          <span>Exit Preview</span>
        </button>
      </div>

      {/* Website Viewport Frame */}
      <div className="preview-canvas-area">
        <div
          className={`preview-frame ${previewViewport}`}
          style={{ width: frameWidth, maxWidth: maxWidth }}
        >
          {rootElement && activePage && (
            <PreviewElement
              element={rootElement}
              elementsMap={activePage.elements}
              viewport={previewViewport}
              onNavigatePage={setActivePage}
              pagesMap={pagesMap}
            />
          )}
        </div>
      </div>

      <style>{`
        .fullscreen-preview-overlay {
          position: fixed;
          inset: 0;
          background: #0f1013;
          z-index: 1000;
          display: flex;
          flex-direction: column;
        }

        .preview-topbar {
          height: 48px;
          background: #18191e;
          border-bottom: 1px solid #282a33;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          z-index: 10;
        }

        .preview-topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .preview-badge {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.5px;
          background: var(--accent);
          color: #000;
          padding: 2px 7px;
          border-radius: 4px;
        }

        .preview-page-select {
          position: relative;
        }

        .preview-page-trigger {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: #24262d;
          border: 1px solid #333642;
          border-radius: 4px;
          font-size: 12px;
          color: #fff;
        }

        .preview-page-select .dropdown-backdrop {
          position: fixed;
          inset: 0;
          z-index: 105;
        }

        .preview-dropdown-menu {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          width: 200px;
          background: #24262d;
          border: 1px solid #3e4252;
          border-radius: 6px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          z-index: 110;
          padding: 4px;
        }

        .preview-page-item {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 8px;
          border-radius: 4px;
          font-size: 12px;
          color: #ccc;
          text-align: left;
        }

        .preview-page-item:hover {
          background: #2e313a;
          color: #fff;
        }

        .preview-page-item.active {
          color: var(--accent);
          font-weight: 600;
        }

        .p-slug {
          font-size: 10px;
          color: #777;
          font-family: monospace;
        }

        .preview-viewport-controls {
          display: flex;
          gap: 2px;
          background: #24262d;
          border: 1px solid #333642;
          border-radius: 6px;
          padding: 2px;
        }

        .pv-btn {
          width: 32px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          color: #888;
        }

        .pv-btn:hover {
          color: #fff;
        }

        .pv-btn.active {
          background: #343742;
          color: var(--accent);
        }

        .exit-preview-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 6px;
          color: #fff;
          font-size: 12px;
          font-weight: 500;
          transition: background 0.15s;
        }

        .exit-preview-btn:hover {
          background: rgba(255, 255, 255, 0.16);
        }

        .preview-canvas-area {
          flex: 1;
          overflow-y: auto;
          overflow-x: auto;
          display: flex;
          justify-content: center;
          padding: 20px;
          padding-bottom: calc(20px + env(safe-area-inset-bottom));
          -webkit-overflow-scrolling: touch;
        }

        .preview-frame {
          background: #ffffff;
          min-height: 100%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          transition: width 0.2s ease, max-width 0.2s ease;
        }

        .preview-frame.tablet {
          border-radius: 12px;
          border: 6px solid #202228;
          height: fit-content;
        }

        .preview-frame.mobile {
          border-radius: 20px;
          border: 8px solid #202228;
          height: fit-content;
        }

        @media (max-width: 640px) {
          .preview-topbar {
            padding: 0 8px;
            padding-left: calc(8px + env(safe-area-inset-left));
            padding-right: calc(8px + env(safe-area-inset-right));
            gap: 6px;
          }

          .preview-topbar-left {
            gap: 6px;
            min-width: 0;
          }

          .preview-badge {
            display: none;
          }

          .preview-page-trigger {
            max-width: 130px;
          }

          .preview-page-trigger span {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .exit-preview-btn span {
            display: none;
          }

          .exit-preview-btn {
            padding: 8px;
          }

          .preview-canvas-area {
            padding: 10px;
            padding-bottom: calc(10px + env(safe-area-inset-bottom));
          }
        }

        @media (pointer: coarse) {
          .pv-btn {
            width: 44px;
            height: 40px;
          }

          .exit-preview-btn,
          .preview-page-trigger {
            min-height: 44px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .preview-frame {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
};
