import React, { useState, useRef, useEffect, useId } from 'react';
import { GripHorizontal } from 'lucide-react';

interface DraggableModalProps {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  className?: string;
  maxWidth?: string;
}

export const DraggableModal: React.FC<DraggableModalProps> = ({
  children,
  onClose,
  title,
  className = '',
  maxWidth = '480px'
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; posX: number; posY: number } | null>(null);
  const modalBoxRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Escape always closes the modal, matching the backdrop-click behaviour.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleStartDrag = (e: React.MouseEvent | React.TouchEvent) => {
    // Only drag from the drag header
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    const currentX = position ? position.x : 0;
    const currentY = position ? position.y : 0;

    dragRef.current = {
      startX: clientX,
      startY: clientY,
      posX: currentX,
      posY: currentY
    };

    const handleMove = (moveEv: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      if ('touches' in moveEv && moveEv.cancelable) {
        moveEv.preventDefault();
      }
      const moveX = 'touches' in moveEv ? moveEv.touches[0].clientX : moveEv.clientX;
      const moveY = 'touches' in moveEv ? moveEv.touches[0].clientY : moveEv.clientY;

      const dx = moveX - dragRef.current.startX;
      const dy = moveY - dragRef.current.startY;

      const maxDeltaX = Math.max(0, (window.innerWidth - 80) / 2);
      const maxDeltaY = Math.max(0, (window.innerHeight - 80) / 2);

      const nextX = Math.min(maxDeltaX, Math.max(-maxDeltaX, dragRef.current.posX + dx));
      const nextY = Math.min(maxDeltaY, Math.max(-maxDeltaY, dragRef.current.posY + dy));

      setPosition({
        x: nextX,
        y: nextY
      });
    };

    const handleEnd = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);
  };

  return (
    <div className="draggable-modal-backdrop" onClick={onClose}>
      <div
        ref={modalBoxRef}
        className={`draggable-modal-box ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{
          maxWidth,
          transform: position ? `translate(${position.x}px, ${position.y}px)` : undefined
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Draggable Title Header Handle */}
        <div
          className="modal-drag-header"
          onMouseDown={handleStartDrag}
          onTouchStart={handleStartDrag}
          title="Drag to move this modal anywhere"
        >
          <div className="drag-handle-grip">
            <GripHorizontal size={16} />
            <span className="modal-header-title" id={titleId}>{title}</span>
          </div>
          <button
            type="button"
            className="modal-close-icon-btn"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        <div className="modal-inner-content">
          {children}
        </div>
      </div>

      <style>{`
        .draggable-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 16px;
        }

        .draggable-modal-box {
          background: var(--bg-base);
          border: 1px solid var(--border-muted);
          border-radius: 12px;
          width: 100%;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
          overflow: hidden;
          display: flex;
          flex-direction: column;
          animation: modalAppear 0.15s ease-out;
        }

        @keyframes modalAppear {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-drag-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--bg-surface);
          border-bottom: 1px solid var(--border-subtle);
          cursor: grab;
          user-select: none;
        }

        .modal-drag-header:active {
          cursor: grabbing;
        }

        .drag-handle-grip {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-secondary);
        }

        .modal-header-title {
          font-size: 13.5px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .modal-close-icon-btn {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
          color: var(--text-muted);
          font-size: 12px;
          transition: all 0.12s;
        }

        .modal-close-icon-btn:hover {
          background: var(--bg-surface-hover);
          color: var(--text-primary);
        }

        .modal-inner-content {
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        @media (pointer: coarse) {
          .modal-close-icon-btn {
            width: 44px;
            height: 44px;
            font-size: 14px;
          }
          .modal-drag-header {
            padding: 6px 10px 6px 14px;
          }
        }
      `}</style>
    </div>
  );
};
