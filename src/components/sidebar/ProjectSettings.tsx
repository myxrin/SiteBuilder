import React, { useState } from 'react';
import { Sliders, Check, ShieldCheck, Flame, ChevronDown, ChevronRight } from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { FirebaseConfig } from '../../types/document';

const FONT_OPTIONS = [
  { label: 'Inter (Modern Sans)', value: "'Inter', sans-serif" },
  { label: 'System UI', value: "system-ui, -apple-system, sans-serif" },
  { label: 'Playfair Display (Serif)', value: "'Playfair Display', Georgia, serif" },
  { label: 'JetBrains Mono (Monospace)', value: "'JetBrains Mono', monospace" }
];

export const ProjectSettings: React.FC = () => {
  const { project, updateProjectSettings } = useEditor();

  const [siteTitle, setSiteTitle] = useState(project.settings?.siteTitle || project.name);
  const [defaultFont, setDefaultFont] = useState(project.settings?.defaultFont || FONT_OPTIONS[0].value);
  const [primaryColor, setPrimaryColor] = useState(project.settings?.primaryColor || '#f59e0b');
  const [customCss, setCustomCss] = useState(project.settings?.customCss || '');

  // Firebase state
  const fbConfig = project.settings?.firebaseConfig || {
    apiKey: '',
    authDomain: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
    enabled: false
  };

  const [fbEnabled, setFbEnabled] = useState(fbConfig.enabled);
  const [apiKey, setApiKey] = useState(fbConfig.apiKey || '');
  const [authDomain, setAuthDomain] = useState(fbConfig.authDomain || '');
  const [projectId, setProjectId] = useState(fbConfig.projectId || '');
  const [appId, setAppId] = useState(fbConfig.appId || '');
  const [jsonPaste, setJsonPaste] = useState('');
  const [isFirebaseOpen, setIsFirebaseOpen] = useState(true);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleJsonPasteChange = (val: string) => {
    setJsonPaste(val);
    try {
      // Find JSON object inside string
      const match = val.match(/\{[\s\S]*\}/);
      if (match) {
        // Standardize keys (e.g. apiKey, authDomain)
        const parsed = JSON.parse(match[0]);
        if (parsed.apiKey) setApiKey(parsed.apiKey);
        if (parsed.authDomain) setAuthDomain(parsed.authDomain);
        if (parsed.projectId) setProjectId(parsed.projectId);
        if (parsed.appId) setAppId(parsed.appId);
        setFbEnabled(true);
      }
    } catch {}
  };

  const handleSave = () => {
    const updatedFb: FirebaseConfig = {
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim(),
      projectId: projectId.trim(),
      appId: appId.trim(),
      enabled: fbEnabled && Boolean(apiKey.trim() && projectId.trim())
    };

    updateProjectSettings({
      siteTitle: siteTitle.trim(),
      defaultFont,
      primaryColor,
      customCss,
      firebaseConfig: updatedFb
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="project-settings-panel">
      <div className="settings-header">
        <span className="settings-title">Site Settings</span>
        <span className="settings-subtitle">Global styling & Firebase Auth</span>
      </div>

      <div className="settings-body">
        <div className="setting-group">
          <label>Global Site Title</label>
          <input
            type="text"
            className="input-field"
            value={siteTitle}
            onChange={(e) => setSiteTitle(e.target.value)}
          />
        </div>

        <div className="setting-group">
          <label>Default Typography</label>
          <select
            className="select-field"
            value={defaultFont}
            onChange={(e) => setDefaultFont(e.target.value)}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <label>Brand Primary Color</label>
          <div className="color-picker-row">
            <input
              type="color"
              className="color-input"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
            <input
              type="text"
              className="input-field font-mono"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
            />
          </div>
        </div>

        {/* Firebase Authentication Integration */}
        <div className="firebase-settings-box">
          <div
            className="firebase-box-header"
            onClick={() => setIsFirebaseOpen(!isFirebaseOpen)}
          >
            <div className="fb-header-left">
              <Flame size={15} className="firebase-flame-icon" />
              <span className="fb-title">Firebase Auth Integration</span>
            </div>
            {isFirebaseOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>

          {isFirebaseOpen && (
            <div className="firebase-box-body">
              <div className="fb-toggle-row">
                <label className="fb-toggle-label">Enable Firebase Auth</label>
                <input
                  type="checkbox"
                  checked={fbEnabled}
                  onChange={(e) => setFbEnabled(e.target.checked)}
                />
              </div>

              <div className="setting-group">
                <label>Paste Firebase Config (JSON)</label>
                <textarea
                  className="textarea-field font-mono"
                  rows={3}
                  placeholder='Paste { apiKey: "...", authDomain: "..." }'
                  value={jsonPaste}
                  onChange={(e) => handleJsonPasteChange(e.target.value)}
                />
              </div>

              <div className="setting-group">
                <label>API Key</label>
                <input
                  type="text"
                  className="input-field font-mono"
                  placeholder="AIzaSy..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>

              <div className="setting-group">
                <label>Auth Domain</label>
                <input
                  type="text"
                  className="input-field font-mono"
                  placeholder="your-app.firebaseapp.com"
                  value={authDomain}
                  onChange={(e) => setAuthDomain(e.target.value)}
                />
              </div>

              <div className="setting-group">
                <label>Project ID</label>
                <input
                  type="text"
                  className="input-field font-mono"
                  placeholder="your-project-id"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                />
              </div>

              <div className="setting-group">
                <label>App ID</label>
                <input
                  type="text"
                  className="input-field font-mono"
                  placeholder="1:123456789:web:abcdef"
                  value={appId}
                  onChange={(e) => setAppId(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        <div className="setting-group">
          <label>Custom Global CSS</label>
          <textarea
            className="textarea-field font-mono"
            rows={5}
            placeholder="/* e.g. .custom-class { box-shadow: ... } */"
            value={customCss}
            onChange={(e) => setCustomCss(e.target.value)}
          />
        </div>

        <button className="btn-save-settings" onClick={handleSave}>
          {savedSuccess ? (
            <>
              <Check size={14} />
              <span>Settings Saved!</span>
            </>
          ) : (
            <span>Apply Global Settings</span>
          )}
        </button>
      </div>

      <style>{`
        .project-settings-panel {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .settings-header {
          padding: 12px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .settings-title {
          display: block;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .settings-subtitle {
          font-size: 11px;
          color: var(--text-muted);
        }

        .settings-body {
          flex: 1;
          overflow-y: auto;
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .setting-group {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .setting-group label {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
        }

        .input-field, .select-field, .textarea-field {
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 7px 10px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          outline: none;
        }

        .input-field:focus, .select-field:focus, .textarea-field:focus {
          border-color: var(--border-focus);
        }

        .font-mono {
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .color-picker-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .color-input {
          -webkit-appearance: none;
          border: 1px solid var(--border-muted);
          width: 34px;
          height: 32px;
          border-radius: var(--radius-sm);
          background: transparent;
          cursor: pointer;
          padding: 0;
        }

        .color-input::-webkit-color-swatch-wrapper {
          padding: 0;
        }

        .color-input::-webkit-color-swatch {
          border: none;
          border-radius: var(--radius-sm);
        }

        .firebase-settings-box {
          background: rgba(245, 158, 11, 0.04);
          border: 1px solid var(--accent-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .firebase-box-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: rgba(245, 158, 11, 0.08);
          cursor: pointer;
        }

        .fb-header-left {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .firebase-flame-icon {
          color: #f59e0b;
        }

        .fb-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent-light);
        }

        .firebase-box-body {
          padding: 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fb-toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .fb-toggle-label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .btn-save-settings {
          margin-top: 8px;
          padding: 8px 14px;
          background: var(--accent);
          color: var(--text-on-accent);
          border-radius: var(--radius-sm);
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: background 0.15s;
        }

        .btn-save-settings:hover {
          background: var(--accent-hover);
        }
      `}</style>
    </div>
  );
};
