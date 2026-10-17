import React, { useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  Loader2,
  Check
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { Asset } from '../../types/document';

export const AssetsManager: React.FC = () => {
  const {
    assets,
    uploadAsset,
    deleteAsset,
    selectedElement,
    updateElementProps,
    insertAssetAsImage
  } = useEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size exceeds 5MB limit. Please choose a smaller image.');
      return;
    }

    // Check type
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Only image files (PNG, JPEG, WebP, SVG, GIF) are supported.');
      return;
    }

    setErrorMsg(null);
    setIsUploading(true);
    try {
      await uploadAsset(file);
      setLiveMessage(`Uploaded ${file.name}.`);
    } catch (err) {
      console.error('Upload error', err);
      setErrorMsg('Failed to process image.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUseAsset = (asset: Asset) => {
    if (selectedElement && selectedElement.type === 'image') {
      updateElementProps(selectedElement.id, {
        src: asset.dataUrl,
        alt: asset.name
      });
      setLiveMessage(`Applied ${asset.name} to the selected image.`);
    } else {
      // Add a new image element using this asset (single history entry)
      insertAssetAsImage(asset);
      setLiveMessage(`Inserted ${asset.name} on the page.`);
    }
  };

  const handleConfirmDelete = (assetId: string, name: string) => {
    deleteAsset(assetId);
    setConfirmingDeleteId(null);
    setLiveMessage(`Deleted ${name} from the media library.`);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="assets-manager">
      <div className="assets-header">
        <div>
          <span className="assets-title">Media Library ({assets.length})</span>
          <span className="assets-subtitle">Stored persistently in IndexedDB</span>
        </div>
        <button
          className="upload-trigger-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="Upload new image"
          aria-label="Upload a new image from your device"
        >
          {isUploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
          <span>{isUploading ? 'Processing…' : 'Upload'}</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      <span className="visually-hidden" aria-live="polite">{liveMessage}</span>

      {errorMsg && (
        <div className="upload-error-banner" role="alert">
          {errorMsg}
        </div>
      )}

      {selectedElement?.type === 'image' && (
        <div className="active-target-hint">
          <span>Click any image below to apply it to selected <strong>Image</strong> element.</span>
        </div>
      )}

      <div className="assets-grid-container">
        {assets.length === 0 ? (
          <div className="assets-empty-state">
            <ImageIcon size={32} className="empty-icon" />
            <p className="empty-title">No assets uploaded</p>
            <p className="empty-desc">Upload PNG, JPG, or SVG images to reuse them in your website.</p>
            <button
              className="btn-upload-empty"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload an image"
            >
              Upload Image
            </button>
          </div>
        ) : (
          <div className="assets-grid">
            {assets.map(asset => (
              <div
                key={asset.id}
                className="asset-item-card"
                role="button"
                tabIndex={0}
                onClick={() => handleUseAsset(asset)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleUseAsset(asset);
                  }
                }}
                title="Click to insert or apply"
                aria-label={`Use ${asset.name} (${formatFileSize(asset.size)})`}
              >
                <div className="asset-thumb-box">
                  <img src={asset.dataUrl} alt="" loading="lazy" />
                  {confirmingDeleteId === asset.id ? (
                    <div className="delete-asset-confirm" onClick={(e) => e.stopPropagation()}>
                      <span>Delete this asset? Images already placed on the page keep working.</span>
                      <div className="delete-asset-confirm-actions">
                        <button
                          className="asset-mini-btn"
                          onClick={() => setConfirmingDeleteId(null)}
                          aria-label={`Keep ${asset.name}`}
                        >
                          Keep
                        </button>
                        <button
                          className="asset-mini-btn danger"
                          onClick={() => handleConfirmDelete(asset.id, asset.name)}
                          aria-label={`Confirm deleting ${asset.name}`}
                          autoFocus
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="delete-asset-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingDeleteId(asset.id);
                      }}
                      onKeyDown={(e) => e.stopPropagation()}
                      title="Delete asset"
                      aria-label={`Delete ${asset.name}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <div className="asset-info">
                  <span className="asset-name truncate">{asset.name}</span>
                  <span className="asset-size">{formatFileSize(asset.size)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .assets-manager {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .assets-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .assets-title {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .assets-subtitle {
          font-size: 11px;
          color: var(--text-muted);
        }

        .upload-trigger-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          background: var(--accent-subtle);
          color: var(--accent);
          border: 1px solid var(--accent-border);
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
        }

        .upload-trigger-btn:hover:not(:disabled) {
          background: var(--accent);
          color: var(--text-on-accent);
        }

        .upload-error-banner {
          margin: 8px 12px;
          padding: 8px;
          border-radius: var(--radius-sm);
          background: var(--danger-bg);
          border: 1px solid var(--danger-border);
          color: var(--danger);
          font-size: 11px;
        }

        .active-target-hint {
          margin: 8px 12px 0 12px;
          padding: 6px 10px;
          background: var(--accent-subtle);
          border: 1px solid var(--accent-border);
          border-radius: var(--radius-sm);
          color: var(--accent-light);
          font-size: 11px;
        }

        .assets-grid-container {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
        }

        .assets-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          text-align: center;
          gap: 8px;
        }

        .empty-icon {
          color: var(--text-muted);
          opacity: 0.5;
        }

        .empty-title {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .empty-desc {
          font-size: 11px;
          color: var(--text-muted);
          max-width: 200px;
          line-height: 1.4;
        }

        .btn-upload-empty {
          margin-top: 6px;
          padding: 6px 14px;
          background: var(--bg-surface);
          border: 1px solid var(--border-muted);
          border-radius: var(--radius-sm);
          font-size: 11.5px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .btn-upload-empty:hover {
          background: var(--bg-surface-hover);
        }

        .assets-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
        }

        .asset-item-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          overflow: hidden;
          cursor: pointer;
          transition: all 0.15s;
          display: flex;
          flex-direction: column;
        }

        .asset-item-card:hover {
          border-color: var(--accent-border);
          transform: translateY(-2px);
        }

        .asset-item-card:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: 2px;
        }

        .asset-thumb-box {
          position: relative;
          aspect-ratio: 16 / 10;
          background: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .asset-thumb-box img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .delete-asset-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 22px;
          height: 22px;
          background: rgba(0, 0, 0, 0.75);
          color: #ef4444;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.12s;
        }

        .asset-item-card:hover .delete-asset-btn,
        .asset-item-card:focus-within .delete-asset-btn,
        .delete-asset-btn:focus-visible {
          opacity: 1;
          pointer-events: auto;
        }

        .delete-asset-btn:hover {
          background: var(--danger);
          color: #fff;
        }

        .delete-asset-confirm {
          position: absolute;
          inset: 0;
          background: rgba(2, 6, 23, 0.92);
          color: #e2e8f0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px;
          text-align: center;
          font-size: 10.5px;
          line-height: 1.35;
        }

        .delete-asset-confirm-actions {
          display: flex;
          gap: 6px;
        }

        .asset-mini-btn {
          padding: 3px 10px;
          border-radius: 4px;
          font-size: 10.5px;
          font-weight: 600;
          background: var(--bg-surface);
          color: var(--text-primary);
          border: 1px solid var(--border-muted);
        }

        .asset-mini-btn.danger {
          background: var(--danger);
          color: #fff;
          border-color: var(--danger);
        }

        @media (max-width: 900px), (pointer: coarse) {
          .delete-asset-btn {
            opacity: 1;
            pointer-events: auto;
            width: 34px;
            height: 34px;
          }

          .asset-mini-btn,
          .upload-trigger-btn,
          .btn-upload-empty {
            min-height: 40px;
          }
        }

        .asset-info {
          padding: 6px 8px;
          display: flex;
          flex-direction: column;
        }

        .asset-name {
          font-size: 11px;
          font-weight: 500;
          color: var(--text-primary);
        }

        .asset-size {
          font-size: 9.5px;
          color: var(--text-muted);
        }
      `}</style>
    </div>
  );
};
