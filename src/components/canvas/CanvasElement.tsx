import React, { useState, useRef, useEffect } from 'react';
import {
  SiteElement,
  Viewport,
  ElementStyles
} from '../../types/document';
import { useEditor } from '../../context/EditorContext';
import { mergeStylesForViewport } from '../../utils/projectEdits';
import {
  Copy,
  Trash2,
  CornerLeftUp,
  Plus,
  Move,
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  ImageOff,
  Pencil
} from 'lucide-react';

interface CanvasElementProps {
  element: SiteElement;
  elementsMap: Record<string, SiteElement>;
  viewport: Viewport;
}

export const CanvasElement: React.FC<CanvasElementProps> = ({
  element,
  elementsMap,
  viewport
}) => {
  const {
    project,
    selectedElementId,
    hoveredElementId,
    zoomLevel,
    setSelectedElementId,
    setHoveredElementId,
    updateElementProps,
    updateElementStyles,
    duplicateElement,
    deleteElement,
    addElement
  } = useEditor();

  const isSelected = selectedElementId === element.id;
  const isHovered = hoveredElementId === element.id;
  const isRoot = !element.parentId;

  // Inline text editing state for headings and paragraphs
  const [isEditingInline, setIsEditingInline] = useState(false);
  const textRef = useRef<any>(null);
  const initialInlineTextRef = useRef<string>('');

  // Broken / missing image reporting (canvas only — the export never ships a
  // placeholder that could overwrite content).
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    setImageFailed(false);
  }, [element.props.src]);

  // Drag-to-reposition state
  const dragStartRef = useRef<{ startX: number; startY: number; origLeft: number; origTop: number } | null>(null);

  // Merge base styles with viewport-specific overrides
  const computedStyles: React.CSSProperties = React.useMemo(() => {
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

    // Positioning
    if (merged.position) styleObj.position = merged.position;
    if (merged.top) styleObj.top = merged.top;
    if (merged.right) styleObj.right = merged.right;
    if (merged.bottom) styleObj.bottom = merged.bottom;
    if (merged.left) styleObj.left = merged.left;
    if (typeof merged.zIndex === 'number') styleObj.zIndex = merged.zIndex;
    if (merged.transform) styleObj.transform = merged.transform;

    // Sizing
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

    return styleObj;
  }, [element.styles, element.responsiveStyles, viewport]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedElementId(element.id);
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setHoveredElementId(element.id);
  };

  const handleMouseLeave = () => {
    setHoveredElementId(null);
  };

  const startInlineEdit = () => {
    if (['heading', 'paragraph', 'button'].includes(element.type)) {
      initialInlineTextRef.current = element.props.text || (
        element.type === 'heading' ? 'Heading' : element.type === 'paragraph' ? 'Paragraph text goes here.' : 'Button'
      );
      setIsEditingInline(true);
    }
  };

  useEffect(() => {
    if (isEditingInline && textRef.current) {
      textRef.current.focus();
      try {
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      } catch {}
    }
  }, [isEditingInline]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (['heading', 'paragraph', 'button'].includes(element.type)) {
      e.stopPropagation();
      startInlineEdit();
    }
  };

  const handleInlineBlur = () => {
    setIsEditingInline(false);
    if (textRef.current) {
      updateElementProps(element.id, { text: textRef.current.innerText || '' });
    }
  };

  // Drag handle logic to freely position object anywhere
  const handleDragHandleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    // Read the *effective* values for the viewport being edited, so dragging in
    // tablet/mobile mode continues from the overridden position instead of the
    // desktop one.
    const effective = mergeStylesForViewport(element, viewport);
    const curPos = effective.position || 'static';
    const curLeft = Number.parseFloat(effective.left || '0') || 0;
    const curTop = Number.parseFloat(effective.top || '0') || 0;

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origLeft: curLeft,
      origTop: curTop
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      const scale = Math.max(0.1, (zoomLevel || 100) / 100);
      const dx = (moveEvent.clientX - dragStartRef.current.startX) / scale;
      const dy = (moveEvent.clientY - dragStartRef.current.startY) / scale;

      const newLeft = `${dragStartRef.current.origLeft + dx}px`;
      const newTop = `${dragStartRef.current.origTop + dy}px`;

      updateElementStyles(element.id, {
        position: curPos === 'static' ? 'relative' : curPos,
        left: newLeft,
        top: newTop
      }, viewport, true);
    };

    const handleMouseUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  /** Touch equivalent of dragging: allows repositioning elements on touchscreens. */
  const handleDragHandleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];

    const effective = mergeStylesForViewport(element, viewport);
    const curPos = effective.position || 'static';
    const curLeft = Number.parseFloat(effective.left || '0') || 0;
    const curTop = Number.parseFloat(effective.top || '0') || 0;

    dragStartRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      origLeft: curLeft,
      origTop: curTop
    };

    const handleTouchMove = (moveEv: TouchEvent) => {
      if (!dragStartRef.current || moveEv.touches.length !== 1) return;
      if (moveEv.cancelable) moveEv.preventDefault();
      const t = moveEv.touches[0];
      const scale = Math.max(0.1, (zoomLevel || 100) / 100);
      const dx = (t.clientX - dragStartRef.current.startX) / scale;
      const dy = (t.clientY - dragStartRef.current.startY) / scale;

      const newLeft = `${dragStartRef.current.origLeft + dx}px`;
      const newTop = `${dragStartRef.current.origTop + dy}px`;

      updateElementStyles(element.id, {
        position: curPos === 'static' ? 'relative' : curPos,
        left: newLeft,
        top: newTop
      }, viewport, true);
    };

    const handleTouchEnd = () => {
      dragStartRef.current = null;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
  };

  /** Keyboard equivalent of dragging: arrow keys nudge the element (Shift = 10px). */
  const handleNudgeKeyDown = (e: React.KeyboardEvent) => {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    e.stopPropagation();

    const step = e.shiftKey ? 10 : 1;
    const effective = mergeStylesForViewport(element, viewport);
    const basePosition = effective.position && effective.position !== 'static' ? effective.position : 'relative';
    const left = (Number.parseFloat(effective.left || '0') || 0) + delta[0] * step;
    const top = (Number.parseFloat(effective.top || '0') || 0) + delta[1] * step;

    updateElementStyles(element.id, {
      position: basePosition,
      left: `${left}px`,
      top: `${top}px`
    }, viewport, true);
  };

  // Render children
  const childrenElements = (element.children || [])
    .map(childId => elementsMap[childId])
    .filter(Boolean);
  const isContainerType = ['section', 'container', 'grid', 'card'].includes(element.type);
  const isEmptyContainer = isContainerType && childrenElements.length === 0;

  // Render internal component content
  const renderContent = () => {
    switch (element.type) {
      case 'heading': {
        const Tag = (`h${element.props.headingLevel || 2}`) as any;
        const defaultText = element.props.text || 'Heading';
        return (
          <Tag
            ref={textRef}
            contentEditable={isEditingInline}
            suppressContentEditableWarning
            onBlur={handleInlineBlur}
            style={{ outline: isEditingInline ? '1px dashed var(--accent)' : 'none' }}
            {...(isEditingInline
              ? { dangerouslySetInnerHTML: { __html: initialInlineTextRef.current } }
              : { children: defaultText }
            )}
          />
        );
      }

      case 'paragraph': {
        const defaultText = element.props.text || 'Paragraph text goes here.';
        return (
          <p
            ref={textRef}
            contentEditable={isEditingInline}
            suppressContentEditableWarning
            onBlur={handleInlineBlur}
            style={{ outline: isEditingInline ? '1px dashed var(--accent)' : 'none' }}
            {...(isEditingInline
              ? { dangerouslySetInnerHTML: { __html: initialInlineTextRef.current } }
              : { children: defaultText }
            )}
          />
        );
      }

      case 'button': {
        const defaultText = element.props.text || 'Button';
        return (
          <button
            ref={textRef}
            contentEditable={isEditingInline}
            suppressContentEditableWarning
            onBlur={handleInlineBlur}
            onClick={(e) => e.preventDefault()}
            style={{
              background: 'none',
              border: 'none',
              font: 'inherit',
              color: 'inherit',
              cursor: 'pointer',
              width: '100%',
              outline: isEditingInline ? '1px dashed var(--accent)' : 'none'
            }}
            {...(isEditingInline
              ? { dangerouslySetInnerHTML: { __html: initialInlineTextRef.current } }
              : { children: defaultText }
            )}
          />
        );
      }

      case 'image':
        if (!element.props.src || imageFailed) {
          return (
            <div
              className={`image-placeholder ${imageFailed ? 'error' : ''}`}
              role="img"
              aria-label={imageFailed ? 'Image failed to load' : element.props.alt || 'No image selected'}
            >
              <ImageOff size={18} />
              <span>
                {imageFailed
                  ? 'This image could not be loaded — check the URL or re-upload it.'
                  : 'No image selected — pick one in Media or paste a URL.'}
              </span>
            </div>
          );
        }
        return (
          <img
            src={element.props.src}
            alt={element.props.alt || 'Image'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: element.props.objectFit || 'cover',
              display: 'block',
              borderRadius: 'inherit'
            }}
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        );

      case 'link':
        return <span>{element.props.text || 'Link'}</span>;

      case 'divider':
        return <div style={{ width: '100%', height: '100%', minHeight: '1px' }} />;

      case 'spacer':
        return <div style={{ width: '100%', height: '100%' }} />;

      case 'shape':
        return <div style={{ width: '100%', height: '100%' }} />;

      case 'list': {
        const isOrdered = element.props.listType === 'ordered';
        const items = element.props.listItems || ['Item 1', 'Item 2', 'Item 3'];
        const ListTag = isOrdered ? 'ol' : 'ul';
        return (
          <ListTag style={{ paddingLeft: '20px' }}>
            {items.map((it, idx) => (
              <li key={idx}>{it}</li>
            ))}
          </ListTag>
        );
      }

      case 'navbar': {
        const brand = element.props.brandText || 'SiteBuilder';
        const links = element.props.navLinks || [];
        return (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div style={{ fontWeight: 700, fontSize: '1.2rem' }}>{brand}</div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              {links.map(l => (
                <span key={l.id} style={{ fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        );
      }

      case 'auth': {
        const isFirebaseConfigured = Boolean(project.settings?.firebaseConfig?.enabled);
        return (
          <div className="firebase-auth-card-preview" onClick={(e) => e.stopPropagation()}>
            <div className="auth-header">
              <div className="auth-icon-badge">
                <Lock size={18} />
              </div>
              <h3 className="auth-title">{element.props.authTitle || 'Welcome Back'}</h3>
              <p className="auth-subtitle">{element.props.authSubtitle || 'Enter your credentials to sign in'}</p>
            </div>

            <div className="auth-form-fields">
              <div className="auth-input-group">
                <label>Email address</label>
                <div className="auth-input-box">
                  <Mail size={14} className="auth-field-icon" />
                  <input type="email" placeholder="name@company.com" readOnly />
                </div>
              </div>

              <div className="auth-input-group">
                <label>Password</label>
                <div className="auth-input-box">
                  <KeyRound size={14} className="auth-field-icon" />
                  <input type="password" placeholder="••••••••" readOnly />
                </div>
              </div>

              <button className="auth-primary-submit-btn" type="button">
                Sign In
              </button>
            </div>

            {element.props.enableGoogleAuth && (
              <>
                <div className="auth-divider-line">
                  <span>or continue with</span>
                </div>
                <button className="auth-google-btn" type="button">
                  <svg width="15" height="15" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google Account</span>
                </button>
              </>
            )}

            <div className="auth-status-tag">
              {isFirebaseConfigured ? (
                <span className="cfg-ok"><CheckCircle2 size={12} /> Firebase Config Connected</span>
              ) : (
                <span className="cfg-pending"><ShieldCheck size={12} /> Ready for Firebase Setup</span>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div
      className={`canvas-el-wrapper ${isSelected ? 'selected' : ''} ${isHovered && !isSelected ? 'hovered' : ''} ${isRoot ? 'is-root' : ''}`}
      style={computedStyles}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      data-el-id={element.id}
      data-el-type={element.type}
    >
      {/* Selection outline and floating control bar */}
      {isSelected && !isRoot && (
        <div className="selection-badge">
          <button
            className="badge-btn drag-move-handle"
            onMouseDown={handleDragHandleMouseDown}
            onTouchStart={handleDragHandleTouchStart}
            onKeyDown={handleNudgeKeyDown}
            title={`Drag to reposition, or use the arrow keys to nudge (Shift = 10px). Currently: ${element.name}`}
            aria-label={`Reposition ${element.name}. Touch or drag to reposition, arrow keys to nudge.`}
          >
            <Move size={11} />
          </button>
          <span className="badge-name">{element.name || element.type}</span>
          <div className="badge-actions">
            {['heading', 'paragraph', 'button'].includes(element.type) && (
              <button
                className="badge-btn edit-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  startInlineEdit();
                }}
                title="Edit text inline"
                aria-label={`Edit text of ${element.name}`}
              >
                <Pencil size={11} />
              </button>
            )}
            {element.parentId && (
              <button
                className="badge-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElementId(element.parentId);
                }}
                title="Select parent element"
                aria-label="Select parent element"
              >
                <CornerLeftUp size={11} />
              </button>
            )}
            <button
              className="badge-btn"
              onClick={(e) => {
                e.stopPropagation();
                duplicateElement(element.id);
              }}
              title="Duplicate (Ctrl+D)"
              aria-label={`Duplicate ${element.name}`}
            >
              <Copy size={11} />
            </button>
            <button
              className="badge-btn delete"
              onClick={(e) => {
                e.stopPropagation();
                deleteElement(element.id);
              }}
              title="Delete (Del) — undo with Ctrl+Z"
              aria-label={`Delete ${element.name}`}
            >
              <Trash2 size={11} />
            </button>
          </div>
        </div>
      )}

      {/* Render element content */}
      {renderContent()}

      {/* Render children for containers */}
      {childrenElements.map(child => (
        <CanvasElement
          key={child.id}
          element={child}
          elementsMap={elementsMap}
          viewport={viewport}
        />
      ))}

      {/* Empty container placeholder */}
      {isEmptyContainer && !isRoot && (
        <div
          className="empty-container-dropzone"
          role="button"
          tabIndex={0}
          aria-label={`Add a heading inside empty ${element.name}`}
          onClick={(e) => {
            e.stopPropagation();
            setSelectedElementId(element.id);
            addElement('heading', element.id);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setSelectedElementId(element.id);
              addElement('heading', element.id);
            }
          }}
        >
          <Plus size={14} />
          <span>Empty {element.name} — click to add a heading here</span>
        </div>
      )}

      <style>{`
        .canvas-el-wrapper {
          position: relative;
          box-sizing: border-box;
          transition: outline 0.1s ease;
        }

        .canvas-el-wrapper.hovered:not(.is-root) {
          outline: 1px dashed rgba(56, 189, 248, 0.7);
          outline-offset: -1px;
        }

        .canvas-el-wrapper.selected:not(.is-root) {
          outline: 2px solid var(--accent) !important;
          outline-offset: -2px;
          z-index: 10;
        }

        .selection-badge {
          position: absolute;
          top: -24px;
          left: -2px;
          height: 22px;
          background: var(--accent);
          color: var(--text-on-accent);
          border-radius: 4px 4px 0 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 0 6px;
          font-size: 11px;
          font-weight: 700;
          z-index: 100;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          pointer-events: auto;
        }

        .drag-move-handle {
          cursor: grab;
        }

        .drag-move-handle:active {
          cursor: grabbing;
        }

        .badge-name {
          white-space: nowrap;
        }

        .badge-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          margin-left: 4px;
          border-left: 1px solid rgba(0, 0, 0, 0.15);
          padding-left: 4px;
        }

        .badge-btn {
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 2px;
          color: #0f172a;
          transition: background 0.1s;
        }

        .badge-btn:hover {
          background: rgba(0, 0, 0, 0.15);
        }

        .badge-btn.delete:hover {
          background: #ef4444;
          color: #fff;
        }

        .empty-container-dropzone {
          padding: 24px;
          margin: 8px;
          border: 1.5px dashed var(--border-muted);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: var(--text-muted);
          font-size: 12px;
          cursor: pointer;
          background: rgba(255, 255, 255, 0.02);
          transition: all 0.15s;
        }

        .empty-container-dropzone:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-subtle);
        }

        .empty-container-dropzone:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .image-placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 96px;
          height: 100%;
          padding: 16px;
          border: 1.5px dashed var(--accent);
          border-radius: 8px;
          background: var(--accent-subtle);
          color: var(--text-secondary, var(--accent));
          font-size: 12.5px;
          text-align: center;
          line-height: 1.4;
        }

        .image-placeholder.error {
          border-color: #f87171;
          background: rgba(248, 113, 113, 0.08);
          color: #fca5a5;
        }

        .image-placeholder svg {
          flex-shrink: 0;
        }

        /* Firebase Auth Card Styles */
        .firebase-auth-card-preview {
          display: flex;
          flex-direction: column;
          gap: 16px;
          user-select: none;
          color: #0f172a;
          font-family: inherit;
        }

        .auth-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .auth-icon-badge {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: #fff7ed;
          color: #f59e0b;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 6px;
          border: 1px solid #fde68a;
        }

        .auth-title {
          font-size: 20px;
          font-weight: 700;
          color: #0f172a;
        }

        .auth-subtitle {
          font-size: 13px;
          color: #64748b;
        }

        .auth-form-fields {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .auth-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: left;
        }

        .auth-input-group label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
        }

        .auth-input-box {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
        }

        .auth-field-icon {
          color: #94a3b8;
        }

        .auth-input-box input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          font-size: 13px;
          color: #0f172a;
        }

        .auth-primary-submit-btn {
          margin-top: 4px;
          padding: 10px;
          background: #f59e0b;
          color: #0f172a;
          font-weight: 700;
          font-size: 13.5px;
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.15s;
        }

        .auth-primary-submit-btn:hover {
          background: #d97706;
        }

        .auth-divider-line {
          display: flex;
          align-items: center;
          text-align: center;
          color: #94a3b8;
          font-size: 11px;
          gap: 10px;
        }

        .auth-divider-line::before, .auth-divider-line::after {
          content: '';
          flex: 1;
          border-bottom: 1px solid #e2e8f0;
        }

        .auth-google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 9px;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          color: #334155;
          cursor: pointer;
        }

        .auth-google-btn:hover {
          background: #f8fafc;
        }

        .auth-status-tag {
          font-size: 11px;
          text-align: center;
          margin-top: 4px;
        }

        .cfg-ok {
          color: #10b981;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
        }

        .cfg-pending {
          color: #f59e0b;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 500;
        }

        @media (max-width: 900px), (pointer: coarse) {
          .selection-badge {
            height: 32px;
            top: -34px;
            padding: 0 8px;
            gap: 6px;
            border-radius: 6px 6px 0 0;
            font-size: 11.5px;
          }

          .badge-btn {
            width: 26px;
            height: 26px;
            border-radius: 4px;
          }

          .badge-btn svg {
            width: 13px;
            height: 13px;
          }

          .empty-container-dropzone {
            min-height: 48px;
            padding: 16px 12px;
          }
        }
      `}</style>
    </div>
  );
};
