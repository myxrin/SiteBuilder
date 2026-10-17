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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
    } else {
      // Add a new image element using this asset (single history entry)
      insertAssetAsImage(asset);
    }
  };

  const handleDelete = (e: React.MouseEvent, assetId: string) => {
    e.stopPropagation();
    if (confirm('Delete this asset? Elements referencing it will not be deleted, but image source will remain as embedded data.')) {
      deleteAsset(assetId);
    }
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
        >
          {isUploading ? <Loader2 size={13} className="spin" /> : <Upload size={13} />}
          <span>Upload</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {errorMsg && (
        <div className="upload-error-banner">
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
                onClick={() => handleUseAsset(asset)}
                title="Click to insert or apply"
              >
                <div className="asset-thumb-box">
                  <img src={asset.dataUrl} alt={asset.name} loading="lazy" />
                  <button
                    className="delete-asset-btn"
                    onClick={(e) => handleDelete(e, asset.id)}
                    title="Delete asset"
                  >
                    <Trash2 size={12} />
                  </button>
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
          display: none;
          align-items: center;
          justify-content: center;
        }

        .asset-item-card:hover .delete-asset-btn {
          display: flex;
        }

        .delete-asset-btn:hover {
          background: var(--danger);
          color: #fff;
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
