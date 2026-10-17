import React, { useState, useEffect } from 'react';
import {
  Type,
  Layout,
  Maximize,
  Sliders,
  Palette,
  Square,
  Trash2,
  Copy,
  ChevronDown,
  ChevronRight,
  Info,
  Move,
  ShieldCheck,
  Plus,
  RotateCcw,
  Tag
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { ElementStyles, Viewport, ElementProps, ElementType } from '../../types/document';

const CONTAINER_TYPES: ElementType[] = ['section', 'container', 'grid', 'card'];

const SHADOW_PRESETS = [
  { label: 'None', value: '' },
  { label: 'Soft', value: '0 2px 8px rgba(15, 23, 42, 0.08)' },
  { label: 'Medium', value: '0 8px 20px rgba(15, 23, 42, 0.12)' },
  { label: 'Strong', value: '0 16px 40px rgba(15, 23, 42, 0.18)' }
];

function extractRawBgUrl(bg?: string): string {
  if (!bg) return '';
  const trimmed = bg.trim();
  const match = trimmed.match(/^url\((['"]?)(.*?)\1\)$/i);
  return match ? match[2].trim() : trimmed;
}

export const InspectorContainer: React.FC = () => {
  const {
    project,
    activePage,
    selectedElement,
    activeViewport,
    updateElementProps,
    updateElementStyles,
    renameElement,
    resetViewportStyles,
    deleteElement,
    duplicateElement,
    moveElement,
    setActiveSidebarTab,
    setSelectedElementId
  } = useEditor();

  const [openSections, setOpenSections] = useState({
    content: true,
    typography: true,
    layout: true,
    positioning: true,
    spacing: true,
    size: false,
    background: true,
    borders: false
  });

  const [nameDraft, setNameDraft] = useState('');
  const [classDraft, setClassDraft] = useState('');

  const selectedElementId = selectedElement?.id || null;
  const selectedName = selectedElement?.name || '';
  const selectedCustomClass = selectedElement?.props.customClass || '';

  useEffect(() => {
    setNameDraft(selectedName);
    setClassDraft(selectedCustomClass);
  }, [selectedElementId, selectedName, selectedCustomClass]);

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  if (!selectedElement) {
    return (
      <aside className="inspector-container empty">
        <div className="inspector-empty-message">
          <Info size={28} className="empty-info-icon" />
          <span className="empty-info-title">No Element Selected</span>
          <p className="empty-info-desc">
            Click any section, heading, button, or container on the canvas to configure its properties and styles.
          </p>
        </div>
        <style>{`
          .inspector-container {
            width: var(--inspector-width);
            height: calc(100vh - var(--header-height));
            height: calc(100dvh - var(--header-height));
            background: var(--bg-base);
            border-left: 1px solid var(--border-subtle);
            overflow-y: auto;
            user-select: none;
            display: flex;
            flex-direction: column;
          }
          .inspector-container.empty {
            align-items: center;
            justify-content: center;
            padding: 32px 20px;
            text-align: center;
          }
          .empty-info-icon {
            color: var(--text-muted);
            margin-bottom: 8px;
            opacity: 0.6;
          }
          .empty-info-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
            margin-bottom: 4px;
          }
          .empty-info-desc {
            font-size: 11.5px;
            color: var(--text-muted);
            line-height: 1.5;
          }
        `}</style>
      </aside>
    );
  }

  const isRoot = !selectedElement.parentId;
  const baseStyles = selectedElement.styles || {};
  const viewportOverrides = (activeViewport !== 'desktop' && selectedElement.responsiveStyles?.[activeViewport]) || {};
  const currentStyles: ElementStyles = { ...baseStyles, ...viewportOverrides };
  const hasViewportOverrides = activeViewport !== 'desktop' && Object.keys(viewportOverrides).length > 0;

  const handleStyleChange = (key: keyof ElementStyles, value: any) => {
    updateElementStyles(selectedElement.id, { [key]: value }, activeViewport);
  };

  /** Empty inputs clear the property so it falls back to the base value. */
  const handleStyleInput = (key: keyof ElementStyles, rawValue: string) => {
    const value = rawValue.trim();
    handleStyleChange(key, value === '' ? undefined : value);
  };

  const handlePaddingChange = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    const currentPadding = currentStyles.padding || {};
    updateElementStyles(selectedElement.id, {
      padding: { ...currentPadding, [side]: value }
    }, activeViewport);
  };

  const handleMarginChange = (side: 'top' | 'right' | 'bottom' | 'left', value: string) => {
    const currentMargin = currentStyles.margin || {};
    updateElementStyles(selectedElement.id, {
      margin: { ...currentMargin, [side]: value }
    }, activeViewport);
  };

  const handlePropChange = (key: keyof ElementProps, value: any, isDebounced: boolean = false) => {
    updateElementProps(selectedElement.id, { [key]: value }, isDebounced);
  };

  // --- Navbar link editing -------------------------------------------------
  const navLinks = selectedElement.props.navLinks || [];
  const updateNavLink = (index: number, patch: { label?: string; href?: string }) => {
    const next = navLinks.map((link, i) => i === index ? { ...link, ...patch } : link);
    handlePropChange('navLinks', next);
  };
  const addNavLink = () => {
    handlePropChange('navLinks', [
      ...navLinks,
      { id: `nav_${Date.now().toString(36)}`, label: 'New Link', href: '/' }
    ]);
  };
  const removeNavLink = (index: number) => {
    handlePropChange('navLinks', navLinks.filter((_, i) => i !== index));
  };

  // --- List item editing ---------------------------------------------------
  const listItems = selectedElement.props.listItems || [];
  const handleListItemsChange = (raw: string) => {
    handlePropChange('listItems', raw.split('\n'), true);
  };

  // --- Move-to-container target list --------------------------------------
  const containerOptions = activePage
    ? Object.values(activePage.elements).filter(el => {
        if (el.id === selectedElement.id) return false;
        // Cannot move an element into its own subtree.
        let probe: typeof el | undefined = el;
        while (probe) {
          if (probe.id === selectedElement.id) return false;
          probe = probe.parentId ? activePage.elements[probe.parentId] : undefined;
        }
        if (el.id === activePage.rootElementId) return true;
        return CONTAINER_TYPES.includes(el.type);
      })
    : [];

  return (
    <aside className="inspector-container">
      {/* Header with element name, viewport override indicator, and actions */}
      <div className="inspector-header">
        <div className="inspector-title-area">
          <span className="element-type-badge">{selectedElement.type}</span>
          <span className="element-selected-name truncate">{selectedElement.name}</span>
        </div>

        <div className="inspector-top-actions">
          <button
            className="top-action-btn"
            onClick={() => duplicateElement(selectedElement.id)}
            title="Duplicate element"
          >
            <Copy size={13} />
          </button>
          {!isRoot && (
            <button
              className="top-action-btn delete"
              onClick={() => deleteElement(selectedElement.id)}
              title="Delete element"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {activeViewport !== 'desktop' && (
        <div className="viewport-editing-banner">
          <span>Editing <strong>{activeViewport}</strong> overrides</span>
          {hasViewportOverrides && (
            <button
              type="button"
              className="banner-reset-btn"
              onClick={() => resetViewportStyles(selectedElement.id, activeViewport)}
              title={`Clear all ${activeViewport} overrides for this element`}
            >
              <RotateCcw size={11} />
              Reset
            </button>
          )}
        </div>
      )}

      {/* 1. Content & Properties Section */}
      <div className="inspector-section">
        <button className="section-header-btn" onClick={() => toggleSection('content')}>
          <div className="header-left">
            <Sliders size={13} className="section-icon" />
            <span>Content & Properties</span>
          </div>
          {openSections.content ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.content && (
          <div className="section-body">
            <div className="prop-col">
              <label>Layer Name</label>
              <input
                type="text"
                className="input-control"
                value={nameDraft}
                placeholder={selectedElement.type}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => {
                  const trimmed = nameDraft.trim();
                  if (trimmed && trimmed !== selectedElement.name) {
                    renameElement(selectedElement.id, trimmed);
                  } else if (!trimmed) {
                    setNameDraft(selectedElement.name);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
            </div>

            {/* Heading specific */}
            {selectedElement.type === 'heading' && (
              <>
                <div className="prop-row">
                  <label>Level</label>
                  <select
                    className="select-control"
                    value={selectedElement.props.headingLevel || 2}
                    onChange={(e) => handlePropChange('headingLevel', parseInt(e.target.value, 10))}
                  >
                    <option value={1}>H1 (Page Title)</option>
                    <option value={2}>H2 (Section Heading)</option>
                    <option value={3}>H3 (Sub-heading)</option>
                    <option value={4}>H4 (Minor Heading)</option>
                    <option value={5}>H5</option>
                    <option value={6}>H6</option>
                  </select>
                </div>
                <div className="prop-col">
                  <label>Heading Text</label>
                  <input
                    type="text"
                    className="input-control"
                    value={selectedElement.props.text || ''}
                    onChange={(e) => handlePropChange('text', e.target.value, true)}
                  />
                </div>
              </>
            )}

            {/* Paragraph specific */}
            {selectedElement.type === 'paragraph' && (
              <div className="prop-col">
                <label>Text Content</label>
                <textarea
                  className="textarea-control"
                  rows={4}
                  value={selectedElement.props.text || ''}
                  onChange={(e) => handlePropChange('text', e.target.value, true)}
                />
              </div>
            )}

            {/* Button & Link specific */}
            {(selectedElement.type === 'button' || selectedElement.type === 'link') && (
              <>
                <div className="prop-col">
                  <label>Label</label>
                  <input
                    type="text"
                    className="input-control"
                    value={selectedElement.props.text || ''}
                    onChange={(e) => handlePropChange('text', e.target.value, true)}
                  />
                </div>
                <div className="prop-col">
                  <label>Target URL / Page Slug</label>
                  <input
                    type="text"
                    className="input-control font-mono"
                    placeholder="https://... or /about"
                    list={`page-slugs-${selectedElement.id}`}
                    value={selectedElement.props.href || ''}
                    onChange={(e) => handlePropChange('href', e.target.value)}
                  />
                  <datalist id={`page-slugs-${selectedElement.id}`}>
                    {project.pages.map(page => (
                      <option key={page.id} value={page.slug}>{page.name}</option>
                    ))}
                  </datalist>
                </div>
                <div className="prop-row">
                  <label>Open In</label>
                  <select
                    className="select-control"
                    value={selectedElement.props.target || '_self'}
                    onChange={(e) => handlePropChange('target', e.target.value)}
                  >
                    <option value="_self">Same Tab (_self)</option>
                    <option value="_blank">New Tab (_blank)</option>
                  </select>
                </div>
              </>
            )}

            {/* Image specific */}
            {selectedElement.type === 'image' && (
              <>
                <div className="prop-col">
                  <label>Image Source (URL or Upload)</label>
                  <input
                    type="text"
                    className="input-control font-mono"
                    placeholder="https://..."
                    value={selectedElement.props.src || ''}
                    onChange={(e) => handlePropChange('src', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-inline-link"
                    onClick={() => setActiveSidebarTab('assets')}
                  >
                    Choose from Media Library
                  </button>
                </div>
                <div className="prop-col">
                  <label>Alternative Text (Alt)</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="Describe image..."
                    value={selectedElement.props.alt || ''}
                    onChange={(e) => handlePropChange('alt', e.target.value)}
                  />
                </div>
                <div className="prop-row">
                  <label>Fit</label>
                  <select
                    className="select-control"
                    value={selectedElement.props.objectFit || 'cover'}
                    onChange={(e) => handlePropChange('objectFit', e.target.value)}
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="fill">Fill</option>
                    <option value="none">None</option>
                  </select>
                </div>
              </>
            )}

            {/* Shape specific */}
            {selectedElement.type === 'shape' && (
              <div className="prop-row">
                <label>Shape</label>
                <select
                  className="select-control"
                  value={selectedElement.props.shapeType || 'rectangle'}
                  onChange={(e) => {
                    const val = e.target.value;
                    handlePropChange('shapeType', val);
                    if (val === 'circle' || val === 'pill') handleStyleChange('borderRadius', '9999px');
                    else handleStyleChange('borderRadius', '8px');
                  }}
                >
                  <option value="rectangle">Rectangle / Box</option>
                  <option value="circle">Circle</option>
                  <option value="pill">Pill</option>
                </select>
              </div>
            )}

            {/* List specific */}
            {selectedElement.type === 'list' && (
              <>
                <div className="prop-row">
                  <label>List Type</label>
                  <select
                    className="select-control"
                    value={selectedElement.props.listType || 'unordered'}
                    onChange={(e) => handlePropChange('listType', e.target.value)}
                  >
                    <option value="unordered">Bulleted</option>
                    <option value="ordered">Numbered</option>
                  </select>
                </div>
                <div className="prop-col">
                  <label>Items (one per line)</label>
                  <textarea
                    className="textarea-control"
                    rows={4}
                    value={listItems.join('\n')}
                    onChange={(e) => handleListItemsChange(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Navbar specific */}
            {selectedElement.type === 'navbar' && (
              <>
                <div className="prop-col">
                  <label>Brand / Logo Text</label>
                  <input
                    type="text"
                    className="input-control"
                    value={selectedElement.props.brandText || ''}
                    onChange={(e) => handlePropChange('brandText', e.target.value)}
                  />
                </div>
                <div className="prop-col">
                  <label>Brand Link</label>
                  <input
                    type="text"
                    className="input-control font-mono"
                    value={selectedElement.props.brandLink || '/'}
                    onChange={(e) => handlePropChange('brandLink', e.target.value)}
                  />
                </div>

                <div className="prop-col">
                  <label>Navigation Links</label>
                  <div className="nav-links-editor">
                    {navLinks.length === 0 && (
                      <span className="hint-text">No links yet. Add one below.</span>
                    )}
                    {navLinks.map((link, index) => (
                      <div className="nav-link-row" key={`${link.id}-${index}`}>
                        <input
                          type="text"
                          className="input-control"
                          value={link.label}
                          aria-label={`Link ${index + 1} label`}
                          onChange={(e) => updateNavLink(index, { label: e.target.value })}
                        />
                        <input
                          type="text"
                          className="input-control font-mono"
                          value={link.href}
                          aria-label={`Link ${index + 1} target`}
                          placeholder="/about"
                          list={`page-slugs-${selectedElement.id}`}
                          onChange={(e) => updateNavLink(index, { href: e.target.value })}
                        />
                        <button
                          type="button"
                          className="nav-link-remove"
                          onClick={() => removeNavLink(index)}
                          title="Remove link"
                          aria-label={`Remove link ${index + 1}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    ))}
                    <button type="button" className="btn-add-nav-link" onClick={addNavLink}>
                      <Plus size={11} />
                      Add Link
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Auth specific */}
            {selectedElement.type === 'auth' && (
              <>
                <div className="prop-col">
                  <label>Card Title</label>
                  <input
                    type="text"
                    className="input-control"
                    value={selectedElement.props.authTitle || ''}
                    onChange={(e) => handlePropChange('authTitle', e.target.value)}
                  />
                </div>
                <div className="prop-col">
                  <label>Card Subtitle</label>
                  <input
                    type="text"
                    className="input-control"
                    value={selectedElement.props.authSubtitle || ''}
                    onChange={(e) => handlePropChange('authSubtitle', e.target.value)}
                  />
                </div>
                <div className="prop-row">
                  <label>Form Mode</label>
                  <select
                    className="select-control"
                    value={selectedElement.props.authMode || 'both'}
                    onChange={(e) => handlePropChange('authMode', e.target.value)}
                  >
                    <option value="both">Sign In & Sign Up</option>
                    <option value="login">Sign In only</option>
                    <option value="signup">Sign Up only</option>
                  </select>
                </div>
                <div className="prop-row">
                  <label>Google Sign-In Button</label>
                  <input
                    type="checkbox"
                    checked={selectedElement.props.enableGoogleAuth ?? true}
                    onChange={(e) => handlePropChange('enableGoogleAuth', e.target.checked)}
                  />
                </div>
                <div className="prop-col">
                  <label>Redirect URL after Login</label>
                  <input
                    type="text"
                    className="input-control font-mono"
                    placeholder="/ or /dashboard"
                    value={selectedElement.props.authRedirect || '/'}
                    onChange={(e) => handlePropChange('authRedirect', e.target.value)}
                  />
                </div>
                {!project.settings?.firebaseConfig?.enabled && (
                  <p className="hint-text warn">
                    Firebase is not enabled yet — the exported form will be disabled until you add your keys.
                  </p>
                )}
                <button
                  type="button"
                  className="btn-settings-link"
                  onClick={() => setActiveSidebarTab('settings')}
                >
                  <ShieldCheck size={13} />
                  <span>Configure Firebase API Keys</span>
                </button>
              </>
            )}

            {/* Custom Class */}
            <div className="prop-col">
              <label>Custom CSS Class</label>
              <input
                type="text"
                className="input-control font-mono"
                placeholder="my-custom-class"
                value={classDraft}
                onChange={(e) => setClassDraft(e.target.value)}
                onBlur={() => {
                  if (classDraft !== selectedCustomClass) {
                    handlePropChange('customClass', classDraft);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Typography Section */}
      <div className="inspector-section">
        <button className="section-header-btn" onClick={() => toggleSection('typography')}>
          <div className="header-left">
            <Type size={13} className="section-icon" />
            <span>Typography</span>
          </div>
          {openSections.typography ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.typography && (
          <div className="section-body">
            <div className="prop-col">
              <label>Font Family</label>
              <select
                className="select-control"
                value={currentStyles.fontFamily || ''}
                onChange={(e) => handleStyleChange('fontFamily', e.target.value || undefined)}
              >
                <option value="">Default Project Font</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="system-ui, -apple-system, sans-serif">System Sans</option>
                <option value="'Playfair Display', serif">Playfair Display (Serif)</option>
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
              </select>
            </div>

            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Size</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 16px"
                  value={currentStyles.fontSize || ''}
                  onChange={(e) => handleStyleInput('fontSize', e.target.value)}
                />
              </div>
              <div className="prop-col">
                <label>Weight</label>
                <select
                  className="select-control"
                  value={currentStyles.fontWeight || '400'}
                  onChange={(e) => handleStyleChange('fontWeight', e.target.value)}
                >
                  <option value="300">Light (300)</option>
                  <option value="400">Regular (400)</option>
                  <option value="500">Medium (500)</option>
                  <option value="600">Semibold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="800">Extrabold (800)</option>
                </select>
              </div>
            </div>

            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Line Height</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 1.5"
                  value={currentStyles.lineHeight || ''}
                  onChange={(e) => handleStyleInput('lineHeight', e.target.value)}
                />
              </div>
              <div className="prop-col">
                <label>Letter Spacing</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 0.5px"
                  value={currentStyles.letterSpacing || ''}
                  onChange={(e) => handleStyleInput('letterSpacing', e.target.value)}
                />
              </div>
            </div>

            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Text Align</label>
                <select
                  className="select-control"
                  value={currentStyles.textAlign || 'left'}
                  onChange={(e) => handleStyleChange('textAlign', e.target.value)}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                  <option value="justify">Justify</option>
                </select>
              </div>
              <div className="prop-col">
                <label>Transform</label>
                <select
                  className="select-control"
                  value={currentStyles.textTransform || 'none'}
                  onChange={(e) => handleStyleChange('textTransform', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="uppercase">UPPERCASE</option>
                  <option value="lowercase">lowercase</option>
                  <option value="capitalize">Capitalize</option>
                </select>
              </div>
            </div>

            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Decoration</label>
                <select
                  className="select-control"
                  value={currentStyles.textDecoration || 'none'}
                  onChange={(e) => handleStyleChange('textDecoration', e.target.value)}
                >
                  <option value="none">None</option>
                  <option value="underline">Underline</option>
                  <option value="line-through">Line Through</option>
                </select>
              </div>
              <div className="prop-col">
                <label>Text Color</label>
                <div className="color-field">
                  <input
                    type="color"
                    className="color-picker-input"
                    value={currentStyles.color && currentStyles.color.startsWith('#') ? currentStyles.color : '#000000'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                  />
                  <input
                    type="text"
                    className="input-control font-mono"
                    value={currentStyles.color || ''}
                    placeholder="#000000"
                    onChange={(e) => handleStyleInput('color', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Layout Section */}
      <div className="inspector-section">
        <button className="section-header-btn" onClick={() => toggleSection('layout')}>
          <div className="header-left">
            <Layout size={13} className="section-icon" />
            <span>Layout & Flex / Grid</span>
          </div>
          {openSections.layout ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.layout && (
          <div className="section-body">
            <div className="prop-row">
              <label>Display</label>
              <select
                className="select-control"
                value={currentStyles.display || 'block'}
                onChange={(e) => handleStyleChange('display', e.target.value)}
              >
                <option value="block">Block</option>
                <option value="flex">Flex</option>
                <option value="grid">Grid</option>
                <option value="inline-block">Inline-Block</option>
                <option value="none">None (Hide)</option>
              </select>
            </div>

            {currentStyles.display === 'flex' && (
              <>
                <div className="prop-row">
                  <label>Direction</label>
                  <select
                    className="select-control"
                    value={currentStyles.flexDirection || 'row'}
                    onChange={(e) => handleStyleChange('flexDirection', e.target.value)}
                  >
                    <option value="row">Horizontal (Row)</option>
                    <option value="column">Vertical (Column)</option>
                    <option value="row-reverse">Row Reverse</option>
                    <option value="column-reverse">Column Reverse</option>
                  </select>
                </div>
                <div className="prop-row">
                  <label>Align</label>
                  <select
                    className="select-control"
                    value={currentStyles.alignItems || 'stretch'}
                    onChange={(e) => handleStyleChange('alignItems', e.target.value)}
                  >
                    <option value="stretch">Stretch</option>
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                    <option value="baseline">Baseline</option>
                  </select>
                </div>
                <div className="prop-row">
                  <label>Justify</label>
                  <select
                    className="select-control"
                    value={currentStyles.justifyContent || 'flex-start'}
                    onChange={(e) => handleStyleChange('justifyContent', e.target.value)}
                  >
                    <option value="flex-start">Start</option>
                    <option value="center">Center</option>
                    <option value="flex-end">End</option>
                    <option value="space-between">Space Between</option>
                    <option value="space-around">Space Around</option>
                  </select>
                </div>
                <div className="prop-row">
                  <label>Wrap</label>
                  <select
                    className="select-control"
                    value={currentStyles.flexWrap || 'nowrap'}
                    onChange={(e) => handleStyleChange('flexWrap', e.target.value)}
                  >
                    <option value="nowrap">No Wrap</option>
                    <option value="wrap">Wrap</option>
                  </select>
                </div>
              </>
            )}

            {currentStyles.display === 'grid' && (
              <div className="prop-col">
                <label>Grid Columns</label>
                <input
                  type="text"
                  className="input-control font-mono"
                  placeholder="repeat(3, 1fr) or 1fr 1fr"
                  value={currentStyles.gridTemplateColumns || ''}
                  onChange={(e) => handleStyleInput('gridTemplateColumns', e.target.value)}
                />
              </div>
            )}

            {(currentStyles.display === 'flex' || currentStyles.display === 'grid') && (
              <div className="prop-col">
                <label>Gap</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 16px"
                  value={currentStyles.gap || ''}
                  onChange={(e) => handleStyleInput('gap', e.target.value)}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Position & Placement Section (Move anywhere) */}
      <div className="inspector-section">
        <button className="section-header-btn" onClick={() => toggleSection('positioning')}>
          <div className="header-left">
            <Move size={13} className="section-icon" />
            <span>Position & Placement</span>
          </div>
          {openSections.positioning ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.positioning && (
          <div className="section-body">
            <div className="prop-row">
              <label>Positioning</label>
              <select
                className="select-control"
                value={currentStyles.position || 'static'}
                onChange={(e) => handleStyleChange('position', e.target.value)}
              >
                <option value="static">Static (Flow)</option>
                <option value="relative">Relative (Nudge)</option>
                <option value="absolute">Absolute (Free)</option>
                <option value="fixed">Fixed (Pinned)</option>
                <option value="sticky">Sticky</option>
              </select>
            </div>

            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Top</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="auto"
                  value={currentStyles.top || ''}
                  onChange={(e) => handleStyleInput('top', e.target.value)}
                />
              </div>
              <div className="prop-col">
                <label>Left</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="auto"
                  value={currentStyles.left || ''}
                  onChange={(e) => handleStyleInput('left', e.target.value)}
                />
              </div>
            </div>

            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Right</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="auto"
                  value={currentStyles.right || ''}
                  onChange={(e) => handleStyleInput('right', e.target.value)}
                />
              </div>
              <div className="prop-col">
                <label>Bottom</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="auto"
                  value={currentStyles.bottom || ''}
                  onChange={(e) => handleStyleInput('bottom', e.target.value)}
                />
              </div>
            </div>

            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Z-Index</label>
                <input
                  type="number"
                  className="input-control font-mono"
                  placeholder="0"
                  value={typeof currentStyles.zIndex === 'number' ? currentStyles.zIndex : ''}
                  onChange={(e) => handleStyleChange('zIndex', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                />
              </div>
              <div className="prop-col">
                <label>Transform</label>
                <input
                  type="text"
                  className="input-control font-mono"
                  placeholder="translate(-50%, -50%)"
                  value={currentStyles.transform || ''}
                  onChange={(e) => handleStyleInput('transform', e.target.value)}
                />
              </div>
            </div>

            <div className="prop-col">
              <label>Quick Alignment</label>
              <div className="quick-align-btns">
                <button
                  type="button"
                  className="align-preset-btn"
                  onClick={() => {
                    updateElementStyles(selectedElement.id, {
                      position: 'relative',
                      left: '50%',
                      right: undefined,
                      transform: 'translateX(-50%)'
                    }, activeViewport);
                  }}
                  title="Center Horizontally"
                >
                  Center X
                </button>
                <button
                  type="button"
                  className="align-preset-btn"
                  onClick={() => {
                    updateElementStyles(selectedElement.id, {
                      position: 'relative',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)'
                    }, activeViewport);
                  }}
                  title="Center Horizontally and Vertically"
                >
                  Center XY
                </button>
                <button
                  type="button"
                  className="align-preset-btn"
                  onClick={() => {
                    updateElementStyles(selectedElement.id, {
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      right: undefined,
                      bottom: undefined,
                      transform: undefined
                    }, activeViewport);
                  }}
                  title="Top Left"
                >
                  Top-Left
                </button>
                <button
                  type="button"
                  className="align-preset-btn"
                  onClick={() => {
                    updateElementStyles(selectedElement.id, {
                      position: 'absolute',
                      top: '16px',
                      right: '16px',
                      left: undefined,
                      bottom: undefined,
                      transform: undefined
                    }, activeViewport);
                  }}
                  title="Top Right"
                >
                  Top-Right
                </button>
                <button
                  type="button"
                  className="align-preset-btn"
                  onClick={() => {
                    updateElementStyles(selectedElement.id, {
                      position: 'static',
                      top: undefined,
                      left: undefined,
                      right: undefined,
                      bottom: undefined,
                      transform: undefined
                    }, activeViewport);
                  }}
                  title="Reset to default document flow"
                >
                  Reset Flow
                </button>
              </div>
            </div>

            {/* Move to another container */}
            {activePage && containerOptions.length > 0 && (
              <div className="prop-col" style={{ marginTop: '4px' }}>
                <label>Move to Container / Section</label>
                <select
                  className="select-control"
                  value={selectedElement.parentId || activePage.rootElementId}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    if (targetId && targetId !== selectedElement.parentId) {
                      moveElement(selectedElement.id, targetId);
                    }
                  }}
                >
                  {containerOptions.map(el => (
                    <option key={el.id} value={el.id}>
                      {el.name} ({el.type})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 4. Spacing (Box Model) Section */}
      <div className="inspector-section">
        <button className="section-header-btn" onClick={() => toggleSection('spacing')}>
          <div className="header-left">
            <Maximize size={13} className="section-icon" />
            <span>Spacing (Padding & Margin)</span>
          </div>
          {openSections.spacing ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.spacing && (
          <div className="section-body">
            <div className="box-model-label">Margin</div>
            <div className="box-model-grid">
              <input
                type="text"
                className="bm-input bm-top"
                placeholder="0"
                aria-label="Margin top"
                value={currentStyles.margin?.top || ''}
                onChange={(e) => handleMarginChange('top', e.target.value)}
              />
              <div className="bm-row">
                <input
                  type="text"
                  className="bm-input bm-left"
                  placeholder="0"
                  aria-label="Margin left"
                  value={currentStyles.margin?.left || ''}
                  onChange={(e) => handleMarginChange('left', e.target.value)}
                />
                <div className="bm-inner-padding-box">
                  <span className="inner-label">Padding</span>
                  <input
                    type="text"
                    className="bm-input bm-top"
                    placeholder="0"
                    aria-label="Padding top"
                    value={currentStyles.padding?.top || ''}
                    onChange={(e) => handlePaddingChange('top', e.target.value)}
                  />
                  <div className="bm-row">
                    <input
                      type="text"
                      className="bm-input bm-left"
                      placeholder="0"
                      aria-label="Padding left"
                      value={currentStyles.padding?.left || ''}
                      onChange={(e) => handlePaddingChange('left', e.target.value)}
                    />
                    <div className="bm-center-core" />
                    <input
                      type="text"
                      className="bm-input bm-right"
                      placeholder="0"
                      aria-label="Padding right"
                      value={currentStyles.padding?.right || ''}
                      onChange={(e) => handlePaddingChange('right', e.target.value)}
                    />
                  </div>
                  <input
                    type="text"
                    className="bm-input bm-bottom"
                    placeholder="0"
                    aria-label="Padding bottom"
                    value={currentStyles.padding?.bottom || ''}
                    onChange={(e) => handlePaddingChange('bottom', e.target.value)}
                  />
                </div>
                <input
                  type="text"
                  className="bm-input bm-right"
                  placeholder="0"
                  aria-label="Margin right"
                  value={currentStyles.margin?.right || ''}
                  onChange={(e) => handleMarginChange('right', e.target.value)}
                />
              </div>
              <input
                type="text"
                className="bm-input bm-bottom"
                placeholder="0"
                aria-label="Margin bottom"
                value={currentStyles.margin?.bottom || ''}
                onChange={(e) => handleMarginChange('bottom', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. Size Section */}
      <div className="inspector-section">
        <button className="section-header-btn" onClick={() => toggleSection('size')}>
          <div className="header-left">
            <Square size={13} className="section-icon" />
            <span>Size & Box Sizing</span>
          </div>
          {openSections.size ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.size && (
          <div className="section-body">
            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Width</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="auto or 100%"
                  value={currentStyles.width || ''}
                  onChange={(e) => handleStyleInput('width', e.target.value)}
                />
              </div>
              <div className="prop-col">
                <label>Min Width</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 200px"
                  value={currentStyles.minWidth || ''}
                  onChange={(e) => handleStyleInput('minWidth', e.target.value)}
                />
              </div>
            </div>

            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Max Width</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 1140px"
                  value={currentStyles.maxWidth || ''}
                  onChange={(e) => handleStyleInput('maxWidth', e.target.value)}
                />
              </div>
              <div className="prop-col">
                <label>Height</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="auto"
                  value={currentStyles.height || ''}
                  onChange={(e) => handleStyleInput('height', e.target.value)}
                />
              </div>
            </div>

            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Max Height</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 400px"
                  value={currentStyles.maxHeight || ''}
                  onChange={(e) => handleStyleInput('maxHeight', e.target.value)}
                />
              </div>
              <div className="prop-col">
                <label>Min Height</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 200px"
                  value={currentStyles.minHeight || ''}
                  onChange={(e) => handleStyleInput('minHeight', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. Background Section */}
      <div className="inspector-section">
        <button className="section-header-btn" onClick={() => toggleSection('background')}>
          <div className="header-left">
            <Palette size={13} className="section-icon" />
            <span>Background & Visuals</span>
          </div>
          {openSections.background ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.background && (
          <div className="section-body">
            <div className="prop-row">
              <label>Background Color</label>
              <div className="color-field">
                <input
                  type="color"
                  className="color-picker-input"
                  value={currentStyles.backgroundColor && currentStyles.backgroundColor.startsWith('#') ? currentStyles.backgroundColor : '#ffffff'}
                  onChange={(e) => handleStyleChange('backgroundColor', e.target.value)}
                />
                <input
                  type="text"
                  className="input-control font-mono"
                  placeholder="transparent or #fff"
                  value={currentStyles.backgroundColor || ''}
                  onChange={(e) => handleStyleInput('backgroundColor', e.target.value)}
                />
              </div>
            </div>

            <div className="prop-col">
              <label>Background Image URL</label>
              <input
                type="text"
                className="input-control font-mono"
                placeholder="https://... or /assets/img"
                value={extractRawBgUrl(currentStyles.backgroundImage)}
                onChange={(e) => {
                  const raw = extractRawBgUrl(e.target.value);
                  handleStyleInput('backgroundImage', raw ? `url('${raw}')` : '');
                }}
              />
            </div>

            {currentStyles.backgroundImage && (
              <div className="prop-grid-2">
                <div className="prop-col">
                  <label>Size</label>
                  <select
                    className="select-control"
                    value={currentStyles.backgroundSize || 'cover'}
                    onChange={(e) => handleStyleChange('backgroundSize', e.target.value)}
                  >
                    <option value="cover">Cover</option>
                    <option value="contain">Contain</option>
                    <option value="auto">Auto</option>
                  </select>
                </div>
                <div className="prop-col">
                  <label>Position</label>
                  <input
                    type="text"
                    className="input-control"
                    placeholder="center"
                    value={currentStyles.backgroundPosition || ''}
                    onChange={(e) => handleStyleInput('backgroundPosition', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="prop-col">
              <label>Opacity ({typeof currentStyles.opacity === 'number' ? Math.round(currentStyles.opacity * 100) : 100}%)</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={typeof currentStyles.opacity === 'number' ? currentStyles.opacity : 1}
                onChange={(e) => handleStyleChange('opacity', parseFloat(e.target.value))}
              />
            </div>

            <div className="prop-row">
              <label>Overflow</label>
              <select
                className="select-control"
                value={currentStyles.overflow || 'visible'}
                onChange={(e) => handleStyleChange('overflow', e.target.value === 'visible' ? undefined : e.target.value)}
              >
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
                <option value="scroll">Scroll</option>
                <option value="auto">Auto</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 7. Borders Section */}
      <div className="inspector-section">
        <button className="section-header-btn" onClick={() => toggleSection('borders')}>
          <div className="header-left">
            <Square size={13} className="section-icon" />
            <span>Borders, Radius & Shadow</span>
          </div>
          {openSections.borders ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        {openSections.borders && (
          <div className="section-body">
            <div className="prop-grid-2">
              <div className="prop-col">
                <label>Border Width</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 1px"
                  value={currentStyles.borderWidth || ''}
                  onChange={(e) => handleStyleInput('borderWidth', e.target.value)}
                />
              </div>
              <div className="prop-col">
                <label>Radius</label>
                <input
                  type="text"
                  className="input-control"
                  placeholder="e.g. 8px"
                  value={currentStyles.borderRadius || ''}
                  onChange={(e) => handleStyleInput('borderRadius', e.target.value)}
                />
              </div>
            </div>

            <div className="prop-row">
              <label>Border Style</label>
              <select
                className="select-control"
                value={currentStyles.borderStyle || 'solid'}
                onChange={(e) => handleStyleChange('borderStyle', e.target.value)}
              >
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="prop-row">
              <label>Border Color</label>
              <div className="color-field">
                <input
                  type="color"
                  className="color-picker-input"
                  value={currentStyles.borderColor && currentStyles.borderColor.startsWith('#') ? currentStyles.borderColor : '#e2e8f0'}
                  onChange={(e) => handleStyleChange('borderColor', e.target.value)}
                />
                <input
                  type="text"
                  className="input-control font-mono"
                  placeholder="#e2e8f0"
                  value={currentStyles.borderColor || ''}
                  onChange={(e) => handleStyleInput('borderColor', e.target.value)}
                />
              </div>
            </div>

            <div className="prop-col">
              <label>Box Shadow</label>
              <select
                className="select-control"
                value={currentStyles.boxShadow || ''}
                onChange={(e) => handleStyleChange('boxShadow', e.target.value || undefined)}
              >
                {SHADOW_PRESETS.map(preset => (
                  <option key={preset.label} value={preset.value}>
                    {preset.value ? preset.label : `${preset.label} (preset)`}
                  </option>
                ))}
                {currentStyles.boxShadow && !SHADOW_PRESETS.some(p => p.value === currentStyles.boxShadow) && (
                  <option value={currentStyles.boxShadow}>Custom</option>
                )}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="inspector-footer-hint">
        <Tag size={11} />
        <span>Changes are saved automatically. Use Ctrl/Cmd + Z to undo.</span>
      </div>

      <style>{`
        .inspector-container {
          width: var(--inspector-width);
          height: calc(100vh - var(--header-height));
          height: calc(100dvh - var(--header-height));
          background: var(--bg-base);
          border-left: 1px solid var(--border-subtle);
          overflow-y: auto;
          user-select: none;
          display: flex;
          flex-direction: column;
        }

        .inspector-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-surface);
        }

        .inspector-title-area {
          display: flex;
          align-items: center;
          gap: 6px;
          overflow: hidden;
        }

        .element-type-badge {
          background: var(--accent);
          color: var(--text-on-accent);
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 2px 5px;
          border-radius: 3px;
        }

        .element-selected-name {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .inspector-top-actions {
          display: flex;
          gap: 2px;
        }

        .top-action-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
        }

        .top-action-btn:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .top-action-btn.delete:hover {
          color: var(--danger);
        }

        .viewport-editing-banner {
          background: var(--accent-subtle);
          border-bottom: 1px solid var(--accent-border);
          padding: 6px 12px;
          font-size: 11px;
          color: var(--accent-light);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .banner-reset-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--accent);
          border: 1px solid var(--accent-border);
          border-radius: var(--radius-sm);
          padding: 2px 6px;
        }

        .banner-reset-btn:hover {
          background: var(--accent);
          color: var(--text-on-accent);
        }

        .inspector-section {
          border-bottom: 1px solid var(--border-subtle);
        }

        .section-header-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 9px 12px;
          background: transparent;
          color: var(--text-secondary);
          font-size: 11.5px;
          font-weight: 600;
          transition: background 0.12s;
        }

        .section-header-btn:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .section-icon {
          color: var(--accent);
        }

        .section-body {
          padding: 10px 12px 14px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .prop-col {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .prop-col label, .prop-row label {
          font-size: 10.5px;
          font-weight: 500;
          color: var(--text-muted);
        }

        .prop-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .prop-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .input-control, .select-control, .textarea-control {
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 5px 8px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          outline: none;
        }

        .input-control:focus, .select-control:focus, .textarea-control:focus {
          border-color: var(--border-focus);
        }

        .font-mono {
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .color-field {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .color-picker-input {
          -webkit-appearance: none;
          border: 1px solid var(--border-muted);
          width: 24px;
          height: 24px;
          border-radius: var(--radius-sm);
          background: transparent;
          cursor: pointer;
          padding: 0;
        }

        .color-picker-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        .color-picker-input::-webkit-color-swatch {
          border: none;
          border-radius: var(--radius-sm);
        }

        .hint-text {
          font-size: 10.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .hint-text.warn {
          color: var(--accent-light);
        }

        .btn-inline-link {
          align-self: flex-start;
          font-size: 10.5px;
          font-weight: 600;
          color: var(--accent);
        }

        .btn-inline-link:hover {
          text-decoration: underline;
        }

        .nav-links-editor {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .nav-link-row {
          display: grid;
          grid-template-columns: 1fr 1fr 22px;
          gap: 4px;
          align-items: center;
        }

        .nav-link-remove {
          width: 22px;
          height: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
          color: var(--text-muted);
        }

        .nav-link-remove:hover {
          background: var(--danger-bg);
          color: var(--danger);
        }

        .btn-add-nav-link {
          display: flex;
          align-items: center;
          gap: 4px;
          align-self: flex-start;
          padding: 4px 8px;
          border: 1px dashed var(--border-muted);
          border-radius: var(--radius-sm);
          font-size: 10.5px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .btn-add-nav-link:hover {
          border-color: var(--accent);
          color: var(--accent);
        }

        /* Box Model Visual Editor */
        .box-model-label {
          font-size: 10px;
          text-transform: uppercase;
          font-weight: 600;
          color: var(--text-muted);
          text-align: center;
        }

        .box-model-grid {
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-muted);
          border-radius: var(--radius-md);
          padding: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .bm-row {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          justify-content: center;
        }

        .bm-input {
          width: 42px;
          height: 22px;
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          border-radius: 3px;
          color: var(--text-primary);
          font-size: 11px;
          text-align: center;
          outline: none;
        }

        .bm-input:focus {
          border-color: var(--border-focus);
        }

        .bm-inner-padding-box {
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid var(--accent-border);
          border-radius: var(--radius-sm);
          padding: 6px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .inner-label {
          font-size: 9px;
          text-transform: uppercase;
          color: var(--accent);
          font-weight: 700;
        }

        .bm-center-core {
          width: 32px;
          height: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }

        .quick-align-btns {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 6px;
        }

        .align-preset-btn {
          padding: 5px 8px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 10.5px;
          font-weight: 500;
          color: var(--text-secondary);
          transition: all 0.12s;
        }

        .align-preset-btn:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
          border-color: var(--border-muted);
        }

        .btn-settings-link {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--accent-subtle);
          border: 1px solid var(--accent-border);
          border-radius: var(--radius-sm);
          color: var(--accent);
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 4px;
        }

        .btn-settings-link:hover {
          background: var(--accent);
          color: var(--text-on-accent);
        }

        .inspector-footer-hint {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 12px 20px 12px;
          font-size: 10.5px;
          color: var(--text-muted);
        }

        @media (max-width: 900px), (pointer: coarse) {
          .section-header-btn {
            min-height: 42px;
            padding: 10px 14px;
          }

          .top-action-btn {
            width: 36px;
            height: 36px;
          }

          .input-control,
          .select-control,
          .textarea-control,
          .color-hex-input,
          .color-picker-input {
            min-height: 38px;
          }

          .nav-link-remove {
            width: 40px;
            height: 40px;
          }

          .align-preset-btn,
          .btn-settings-link {
            min-height: 38px;
            padding: 8px 12px;
          }

          .inspector-container {
            padding-bottom: 90px;
          }
        }
      `}</style>
    </aside>
  );
};
