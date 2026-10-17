import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ShieldCheck,
  Flame,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Loader2,
  PlugZap,
  Info,
  RotateCcw
} from 'lucide-react';
import { useEditor } from '../../context/EditorContext';
import { FirebaseConfig, ProjectSettings as ProjectSettingsType } from '../../types/document';
import {
  FIREBASE_CONFIG_FIELDS,
  checkFirebaseApiKey,
  firebaseConfigsEqual,
  isFirebaseConfigured,
  normalizeFirebaseConfig,
  parseFirebaseConfigJson,
  validateFirebaseConfig
} from '../../utils/firebaseConfig';

const FONT_OPTIONS = [
  { label: 'Inter (Modern Sans)', value: "'Inter', sans-serif" },
  { label: 'System UI', value: "system-ui, -apple-system, sans-serif" },
  { label: 'Playfair Display (Serif)', value: "'Playfair Display', Georgia, serif" },
  { label: 'JetBrains Mono (Monospace)', value: "'JetBrains Mono', monospace" }
];

const COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

interface SettingsDraft {
  siteTitle: string;
  defaultFont: string;
  primaryColor: string;
  customCss: string;
  firebaseConfig: FirebaseConfig;
}

function draftFromSettings(settings: Partial<ProjectSettingsType> | undefined): SettingsDraft {
  const source = settings || {};
  return {
    siteTitle: source.siteTitle || '',
    defaultFont: source.defaultFont || FONT_OPTIONS[0].value,
    primaryColor: source.primaryColor || '#f59e0b',
    customCss: source.customCss || '',
    firebaseConfig: normalizeFirebaseConfig(source.firebaseConfig)
  };
}

/** Stable signature used to detect changes that came from outside this panel. */
function draftSignature(settings: Partial<ProjectSettingsType> | undefined): string {
  const draft = draftFromSettings(settings);
  return JSON.stringify(draft);
}

export const ProjectSettings: React.FC = () => {
  const { project, updateProjectSettings, setActiveSidebarTab } = useEditor();

  const [draft, setDraft] = useState<SettingsDraft>(() => draftFromSettings(project.settings));
  const [baseline, setBaseline] = useState<string>(() => draftSignature(project.settings));
  const [jsonPaste, setJsonPaste] = useState('');
  const [jsonFeedback, setJsonFeedback] = useState<{ kind: 'error' | 'success'; message: string } | null>(null);
  const [isFirebaseOpen, setIsFirebaseOpen] = useState(false);
  const [appliedFlash, setAppliedFlash] = useState(false);
  const [keyCheck, setKeyCheck] = useState<{ status: string; message: string } | null>(null);
  const [isCheckingKey, setIsCheckingKey] = useState(false);

  const draftRef = useRef(draft);
  draftRef.current = draft;
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;
  // The panel is unmounted when another sidebar tab is opened or the editor is
  // left, so pending drafts are applied on unmount instead of being thrown away.
  const applyRef = useRef<(options?: { silent?: boolean }) => boolean>(() => false);

  const projectSignature = draftSignature(project.settings);

  useEffect(() => {
    // Undo/redo, project import or another component changed the settings:
    // rebase the drafts so the panel never shows stale values.
    if (projectSignature !== baselineRef.current) {
      const next = draftFromSettings(project.settings);
      setDraft(next);
      setBaseline(projectSignature);
    }
  }, [projectSignature, project.settings]);

  const validation = useMemo(() => validateFirebaseConfig(draft.firebaseConfig), [draft.firebaseConfig]);
  const colorError = draft.primaryColor && !COLOR_PATTERN.test(draft.primaryColor.trim())
    ? 'Use a hex colour such as #f59e0b.'
    : '';
  const titleError = draft.siteTitle.trim() ? '' : 'A site title is required.';

  const isDirty = projectSignature !== JSON.stringify(draft);

  const applyDraft = useCallback(
    (options: { silent?: boolean } = {}): boolean => {
      const current = draftRef.current;
      const next: Partial<ProjectSettingsType> = {
        siteTitle: current.siteTitle.trim() || project.name,
        defaultFont: current.defaultFont,
        primaryColor: COLOR_PATTERN.test(current.primaryColor.trim()) ? current.primaryColor.trim() : '#f59e0b',
        customCss: current.customCss,
        firebaseConfig: {
          ...normalizeFirebaseConfig(current.firebaseConfig),
          // `enabled` is derived from the real requirement, never trusted blindly.
          enabled: isFirebaseConfigured(current.firebaseConfig)
        }
      };

      const nextSignature = draftSignature({ ...project.settings, ...next });
      if (nextSignature === baselineRef.current) return false;

      updateProjectSettings(next);
      setBaseline(nextSignature);
      if (!options.silent) {
        setAppliedFlash(true);
        window.setTimeout(() => setAppliedFlash(false), 2000);
      }
      return true;
    },
    [project.name, project.settings, updateProjectSettings]
  );

  applyRef.current = applyDraft;

  useEffect(() => {
    return () => {
      // Persist unsaved drafts when the panel closes.
      applyRef.current({ silent: true });
    };
  }, []);

  const updateField = <K extends keyof SettingsDraft>(key: K, value: SettingsDraft[K]) => {
    setDraft(prev => ({ ...prev, [key]: value }));
  };

  const updateFirebaseField = (key: keyof FirebaseConfig, value: string) => {
    setKeyCheck(null);
    setDraft(prev => ({
      ...prev,
      firebaseConfig: { ...normalizeFirebaseConfig(prev.firebaseConfig), [key]: value }
    }));
  };

  const handleJsonPaste = (val: string) => {
    setJsonPaste(val);
    setKeyCheck(null);
    if (!val.trim()) {
      setJsonFeedback(null);
      return;
    }

    const result = parseFirebaseConfigJson(val);
    if (!result.recognized || !result.config) {
      setJsonFeedback({ kind: 'error', message: result.error || 'No Firebase fields found in the pasted text.' });
      return;
    }

    // Fill only the fields that were part of the snippet and keep the rest, so
    // pasting a partial config never erases previously entered values.
    setDraft(prev => {
      const merged = normalizeFirebaseConfig(prev.firebaseConfig);
      const incoming = result.config!;
      (Object.keys(incoming) as Array<keyof FirebaseConfig>).forEach(key => {
        if (key === 'enabled') return;
        const value = incoming[key];
        if (typeof value === 'string' && value) {
          (merged as unknown as Record<string, unknown>)[key] = value;
        }
      });
      merged.enabled = prev.firebaseConfig.enabled;
      return { ...prev, firebaseConfig: merged };
    });

    const missingNote = result.missing.length
      ? ` Missing: ${result.missing.join(', ')}.`
      : '';
    setJsonFeedback({
      kind: 'success',
      message: `Configuration read from the pasted JSON.${missingNote} Press "Apply Global Settings" to store it.`
    });
  };

  const handleTestKey = async () => {
    setIsCheckingKey(true);
    setKeyCheck(null);
    const result = await checkFirebaseApiKey(draft.firebaseConfig.apiKey);
    setKeyCheck({ status: result.status, message: result.message });
    setIsCheckingKey(false);
  };

  const handleApply = () => {
    if (titleError || colorError || Object.keys(validation.errors).length > 0) return;
    applyDraft();
  };

  const blockedByErrors = Boolean(titleError || colorError) || Object.keys(validation.errors).length > 0;

  return (
    <div className="project-settings-panel">
      <div className="settings-header">
        <div className="settings-heading">
          <span className="settings-title">Site Settings</span>
          <span className="settings-subtitle">Global styling &amp; Firebase Auth</span>
        </div>
        {isDirty && <span className="settings-dirty-badge">Unsaved changes</span>}
      </div>

      <div className="settings-body">
        <div className="setting-group">
          <label htmlFor="sb-setting-title">Global Site Title</label>
          <input
            id="sb-setting-title"
            type="text"
            className="input-field"
            value={draft.siteTitle}
            onChange={(e) => updateField('siteTitle', e.target.value)}
          />
          {titleError && <span className="field-error">{titleError}</span>}
        </div>

        <div className="setting-group">
          <label htmlFor="sb-setting-font">Default Typography</label>
          <select
            id="sb-setting-font"
            className="select-field"
            value={draft.defaultFont}
            onChange={(e) => updateField('defaultFont', e.target.value)}
          >
            {FONT_OPTIONS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <label htmlFor="sb-setting-color">Brand Primary Color</label>
          <div className="color-picker-row">
            <input
              id="sb-setting-color"
              type="color"
              className="color-input"
              value={COLOR_PATTERN.test(draft.primaryColor) ? draft.primaryColor : '#f59e0b'}
              onChange={(e) => updateField('primaryColor', e.target.value)}
            />
            <input
              type="text"
              className="input-field font-mono"
              aria-label="Primary colour hex value"
              value={draft.primaryColor}
              onChange={(e) => updateField('primaryColor', e.target.value)}
            />
          </div>
          {colorError && <span className="field-error">{colorError}</span>}
        </div>

        {/* Firebase Authentication Integration */}
        <div className="firebase-settings-box">
          <button
            type="button"
            className="firebase-box-header"
            onClick={() => setIsFirebaseOpen(!isFirebaseOpen)}
            aria-expanded={isFirebaseOpen}
          >
            <div className="fb-header-left">
              <Flame size={15} className="firebase-flame-icon" />
              <span className="fb-title">Firebase Auth Integration</span>
            </div>
            <div className="fb-header-right">
              {isFirebaseConfigured(draft.firebaseConfig) ? (
                <span className="fb-state on">Enabled</span>
              ) : (
                <span className="fb-state off">Off</span>
              )}
              {isFirebaseOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          </button>

          {isFirebaseOpen && (
            <div className="firebase-box-body">
              <div className="fb-toggle-row">
                <label className="fb-toggle-label" htmlFor="sb-fb-enabled">Enable Firebase Auth</label>
                <input
                  id="sb-fb-enabled"
                  type="checkbox"
                  checked={draft.firebaseConfig.enabled}
                  onChange={(e) => {
                    setKeyCheck(null);
                    updateField('firebaseConfig', {
                      ...normalizeFirebaseConfig(draft.firebaseConfig),
                      enabled: e.target.checked
                    });
                  }}
                />
              </div>

              <div className="setting-group">
                <label htmlFor="sb-fb-json">Paste Firebase Config (JSON)</label>
                <textarea
                  id="sb-fb-json"
                  className="textarea-field font-mono"
                  rows={3}
                  placeholder='{ "apiKey": "...", "authDomain": "...", "projectId": "..." }'
                  value={jsonPaste}
                  onChange={(e) => handleJsonPaste(e.target.value)}
                />
                {jsonFeedback && (
                  <span className={jsonFeedback.kind === 'error' ? 'field-error' : 'field-note'}>
                    {jsonFeedback.message}
                  </span>
                )}
              </div>

              {FIREBASE_CONFIG_FIELDS.map(field => {
                const error = validation.errors[field.key as string];
                const warning = validation.warnings[field.key as string];
                const value = (draft.firebaseConfig[field.key] as string) || '';
                return (
                  <div className="setting-group" key={field.key}>
                    <label htmlFor={`sb-fb-${field.key}`}>
                      {field.label}
                      {field.required && <span className="req-mark"> *</span>}
                    </label>
                    <input
                      id={`sb-fb-${field.key}`}
                      type="text"
                      className="input-field font-mono"
                      placeholder={field.placeholder}
                      value={value}
                      onChange={(e) => updateFirebaseField(field.key, e.target.value)}
                    />
                    {error && <span className="field-error">{error}</span>}
                    {!error && warning && <span className="field-warning">{warning}</span>}
                  </div>
                );
              })}

              <div className="fb-actions-row">
                <button
                  type="button"
                  className="btn-fb-test"
                  onClick={handleTestKey}
                  disabled={isCheckingKey || !draft.firebaseConfig.apiKey.trim()}
                  title="Send an intentionally invalid login to Google to check whether this API key is accepted. No account is created and nobody is signed in."
                >
                  {isCheckingKey ? <Loader2 size={13} className="spin" /> : <PlugZap size={13} />}
                  <span>{isCheckingKey ? 'Checking…' : 'Test API key'}</span>
                </button>
                <button
                  type="button"
                  className="btn-fb-reset"
                  onClick={() => {
                    setDraft(prev => ({ ...prev, firebaseConfig: normalizeFirebaseConfig({ enabled: false }) }));
                    setJsonPaste('');
                    setJsonFeedback(null);
                    setKeyCheck(null);
                  }}
                  title="Clear the Firebase configuration fields"
                >
                  <RotateCcw size={13} />
                  <span>Clear</span>
                </button>
              </div>

              {keyCheck && (
                <div className={`fb-check-result ${keyCheck.status}`} role="status">
                  {keyCheck.status === 'valid' ? <Check size={13} /> : <AlertTriangle size={13} />}
                  <span>{keyCheck.message}</span>
                </div>
              )}

              <div className="fb-help">
                <div className="fb-help-title">
                  <Info size={12} /> Required setup in the Firebase console
                </div>
                <ol>
                  <li>Authentication → Sign-in method → enable <strong>Email/Password</strong> (and <strong>Google</strong> if you use the Google button).</li>
                  <li>Authentication → Settings → Authorized domains → add the domain that hosts your site (localhost is allowed for testing).</li>
                  <li>Project settings → Your apps → Web app → copy the <strong>firebaseConfig</strong> object and paste it above.</li>
                </ol>
                <p className="fb-help-note">
                  Only the public web config belongs here. Never paste service-account keys or Admin SDK secrets —
                  they must stay on a server.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="setting-group">
          <label htmlFor="sb-setting-css">Custom Global CSS</label>
          <textarea
            id="sb-setting-css"
            className="textarea-field font-mono"
            rows={5}
            placeholder="/* e.g. .custom-class { box-shadow: ... } */"
            value={draft.customCss}
            onChange={(e) => updateField('customCss', e.target.value)}
          />
        </div>

        <div className="export-hint-row">
          <button type="button" className="btn-inline-nav" onClick={() => setActiveSidebarTab('assets')}>
            Manage media
          </button>
          <button type="button" className="btn-inline-nav" onClick={() => setActiveSidebarTab('pages')}>
            Manage pages
          </button>
        </div>

        <button
          className="btn-save-settings"
          onClick={handleApply}
          disabled={blockedByErrors}
          title={blockedByErrors ? 'Fix the highlighted fields first' : 'Store these settings in the project'}
        >
          {appliedFlash ? (
            <>
              <Check size={14} />
              <span>Settings Applied</span>
            </>
          ) : (
            <>
              <ShieldCheck size={14} />
              <span>Apply Global Settings</span>
            </>
          )}
        </button>
        <p className="settings-footnote">
          {isDirty
            ? 'Changes are stored when you press the button or leave this panel.'
            : 'All settings are applied and autosaved.'}
        </p>
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
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
        }

        .settings-heading { display: flex; flex-direction: column; }

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

        .settings-dirty-badge {
          flex-shrink: 0;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 999px;
          background: var(--accent-subtle);
          border: 1px solid var(--accent-border);
          color: var(--accent-light);
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

        .req-mark { color: var(--accent); }

        .input-field, .select-field, .textarea-field {
          background: var(--bg-input);
          border: 1px solid var(--border-subtle);
          color: var(--text-primary);
          padding: 8px 10px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          outline: none;
          min-height: 34px;
        }

        .input-field:focus, .select-field:focus, .textarea-field:focus {
          border-color: var(--border-focus);
        }

        .font-mono {
          font-family: var(--font-mono);
          font-size: 11px;
        }

        .field-error {
          font-size: 10.5px;
          color: #fca5a5;
          line-height: 1.4;
        }

        .field-warning {
          font-size: 10.5px;
          color: var(--accent-light);
          line-height: 1.4;
        }

        .field-note {
          font-size: 10.5px;
          color: var(--text-muted);
          line-height: 1.4;
        }

        .color-picker-row {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .color-input {
          -webkit-appearance: none;
          border: 1px solid var(--border-muted);
          width: 40px;
          height: 36px;
          border-radius: var(--radius-sm);
          background: transparent;
          cursor: pointer;
          padding: 0;
          flex-shrink: 0;
        }

        .color-input::-webkit-color-swatch-wrapper { padding: 0; }
        .color-input::-webkit-color-swatch { border: none; border-radius: var(--radius-sm); }

        .firebase-settings-box {
          background: rgba(245, 158, 11, 0.04);
          border: 1px solid var(--accent-border);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .firebase-box-header {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: rgba(245, 158, 11, 0.08);
          cursor: pointer;
          min-height: 40px;
        }

        .fb-header-left { display: flex; align-items: center; gap: 6px; }
        .fb-header-right { display: flex; align-items: center; gap: 6px; }

        .firebase-flame-icon { color: #f59e0b; }

        .fb-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--accent-light);
        }

        .fb-state {
          font-size: 9.5px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 1px 5px;
          border-radius: 3px;
        }

        .fb-state.on { background: var(--success-bg); color: var(--success); }
        .fb-state.off { background: rgba(148, 163, 184, 0.12); color: var(--text-muted); }

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
          gap: 10px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .fb-toggle-label {
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-primary);
        }

        .fb-toggle-row input[type="checkbox"] {
          width: 18px;
          height: 18px;
          accent-color: var(--accent);
          flex-shrink: 0;
        }

        .fb-actions-row { display: flex; gap: 6px; }

        .btn-fb-test, .btn-fb-reset {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          padding: 7px 10px;
          border-radius: var(--radius-sm);
          font-size: 11px;
          font-weight: 600;
          min-height: 34px;
        }

        .btn-fb-test {
          flex: 1;
          background: var(--bg-surface);
          border: 1px solid var(--border-muted);
          color: var(--text-primary);
        }

        .btn-fb-test:hover:not(:disabled) { background: var(--bg-surface-hover); }
        .btn-fb-test:disabled { opacity: 0.5; cursor: not-allowed; }

        .btn-fb-reset {
          background: transparent;
          border: 1px solid var(--border-subtle);
          color: var(--text-muted);
        }

        .btn-fb-reset:hover { color: var(--text-primary); border-color: var(--border-muted); }

        .fb-check-result {
          display: flex;
          align-items: flex-start;
          gap: 6px;
          padding: 7px 9px;
          border-radius: var(--radius-sm);
          font-size: 10.5px;
          line-height: 1.45;
        }

        .fb-check-result.valid { background: var(--success-bg); color: var(--success); }
        .fb-check-result.invalid { background: var(--danger-bg); color: #fca5a5; }
        .fb-check-result.unreachable { background: rgba(148, 163, 184, 0.12); color: var(--text-secondary); }
        .fb-check-result.skipped { background: rgba(148, 163, 184, 0.12); color: var(--text-secondary); }

        .fb-help {
          background: rgba(255, 255, 255, 0.02);
          border: 1px dashed var(--border-muted);
          border-radius: var(--radius-sm);
          padding: 8px 10px;
          font-size: 10.5px;
          color: var(--text-muted);
          line-height: 1.5;
        }

        .fb-help-title {
          display: flex;
          align-items: center;
          gap: 5px;
          font-weight: 700;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }

        .fb-help ol { margin: 0; padding-left: 16px; display: flex; flex-direction: column; gap: 3px; }
        .fb-help strong { color: var(--text-primary); }
        .fb-help-note { margin-top: 6px; color: var(--accent-light); }

        .export-hint-row { display: flex; gap: 8px; }

        .btn-inline-nav {
          flex: 1;
          padding: 7px 8px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          font-size: 11px;
          color: var(--text-secondary);
          min-height: 34px;
        }

        .btn-inline-nav:hover { background: var(--bg-surface); color: var(--text-primary); }

        .btn-save-settings {
          margin-top: 2px;
          padding: 10px 14px;
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
          min-height: 40px;
        }

        .btn-save-settings:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-save-settings:disabled { opacity: 0.5; cursor: not-allowed; }

        .settings-footnote {
          font-size: 10px;
          color: var(--text-muted);
          text-align: center;
        }
      `}</style>
    </div>
  );
};
