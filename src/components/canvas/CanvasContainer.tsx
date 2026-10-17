import React from 'react';
import { useEditor } from '../../context/EditorContext';
import { CanvasElement } from './CanvasElement';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

export const CanvasContainer: React.FC = () => {
  const {
    activePage,
    activeViewport,
    zoomLevel,
    setSelectedElementId
  } = useEditor();

  if (!activePage) return null;

  const rootElement = activePage.elements[activePage.rootElementId];

  // Determine frame width and label
  let frameWidth = '100%';
  let maxWidth = '1200px';
  let deviceLabel = 'Desktop (1200px)';
  let DeviceIcon = Monitor;

  if (activeViewport === 'tablet') {
    frameWidth = '768px';
    maxWidth = '768px';
    deviceLabel = 'Tablet (768px)';
    DeviceIcon = Tablet;
  } else if (activeViewport === 'mobile') {
    frameWidth = '375px';
    maxWidth = '375px';
    deviceLabel = 'Mobile (375px)';
    DeviceIcon = Smartphone;
  }

  const handleWorkspaceClick = (e: React.MouseEvent) => {
    // If clicking directly on workspace background, deselect
    if ((e.target as HTMLElement).classList.contains('canvas-workspace-scroll') ||
        (e.target as HTMLElement).classList.contains('canvas-centering-wrapper')) {
      setSelectedElementId(null);
    }
  };

  const scale = zoomLevel / 100;

  return (
    <main
      className="canvas-workspace-scroll"
      onClick={handleWorkspaceClick}
      aria-label="Website canvas editor workspace"
    >
      <div className="canvas-centering-wrapper">
        {/* Device frame header */}
        <div className="viewport-info-bar">
          <div className="device-indicator-tag">
            <DeviceIcon size={12} />
            <span>{deviceLabel}</span>
          </div>
          <span className="page-indicator-tag">{activePage.name} — {activePage.slug}</span>
        </div>

        {/* Viewport Frame */}
        <div
          className={`viewport-frame ${activeViewport}`}
          style={{
            width: frameWidth,
            maxWidth: maxWidth,
            transform: scale !== 1 ? `scale(${scale})` : undefined,
            transformOrigin: 'top center'
          }}
        >
          {rootElement ? (
            <CanvasElement
              element={rootElement}
              elementsMap={activePage.elements}
              viewport={activeViewport}
            />
          ) : (
            <div className="no-root-warning">
              No root element found for this page.
            </div>
          )}
        </div>
      </div>

      <style>{`
        .canvas-workspace-scroll {
          flex: 1;
          height: calc(100vh - var(--header-height));
          background: var(--bg-workspace);
          overflow: auto;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 20px 80px 20px;
        }

        .canvas-centering-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          min-height: 100%;
        }

        .viewport-info-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 12px;
          user-select: none;
        }

        .device-indicator-tag {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          padding: 3px 10px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--text-secondary);
        }

        .page-indicator-tag {
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .viewport-frame {
          background: #ffffff;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-subtle);
          min-height: 800px;
          transition: width 0.2s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          border-radius: 4px;
          position: relative;
        }

        .viewport-frame.tablet {
          border-radius: 14px;
          border: 8px solid #1a1c22;
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-muted);
        }

        .viewport-frame.mobile {
          border-radius: 24px;
          border: 10px solid #1a1c22;
          box-shadow: 0 12px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px var(--border-muted);
        }

        .no-root-warning {
          padding: 40px;
          text-align: center;
          color: var(--danger);
        }
      `}</style>
    </main>
  );
};
