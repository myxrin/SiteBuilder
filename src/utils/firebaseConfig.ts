import { FirebaseConfig } from '../types/document';

/**
 * Firebase web-config helpers shared by the Settings panel, project validation
 * and the exporter.
 *
 * IMPORTANT: a Firebase *web* config (apiKey/authDomain/projectId/appId) is a
 * public client identifier by design — it is not a secret. Server-side
 * credentials (service accounts, Admin SDK private keys, CI tokens) must never
 * be stored in a project or exported. Only the public web config is handled here.
 */

export const FIREBASE_CORE_FIELDS: Array<{
  key: keyof Omit<FirebaseConfig, 'enabled' | 'options'>;
  label: string;
  placeholder: string;
  required: boolean;
  description: string;
}> = [
  { key: 'apiKey', label: 'API Key', placeholder: 'AIza...', required: true, description: 'Client Web API key from Firebase Console' },
  { key: 'authDomain', label: 'Auth Domain', placeholder: 'your-app.firebaseapp.com', required: false, description: 'Domain for Auth redirects and OAuth popups' },
  { key: 'projectId', label: 'Project ID', placeholder: 'your-project-id', required: true, description: 'Unique Firebase project identifier' },
  { key: 'appId', label: 'App ID', placeholder: '1:123456789:web:abcdef', required: false, description: 'Firebase web application registration ID' },
  { key: 'storageBucket', label: 'Storage Bucket', placeholder: 'your-app.appspot.com', required: false, description: 'Cloud Storage default bucket' },
  {
    key: 'messagingSenderId',
    label: 'Messaging Sender ID',
    placeholder: '123456789',
    required: false,
    description: 'Cloud Messaging numeric sender ID'
  }
];

export const FIREBASE_EXTENDED_FIELDS: Array<{
  key: keyof Omit<FirebaseConfig, 'enabled' | 'options'>;
  label: string;
  placeholder: string;
  required: boolean;
  description: string;
}> = [
  {
    key: 'measurementId',
    label: 'Measurement ID (Analytics)',
    placeholder: 'G-XXXXXXXXXX',
    required: false,
    description: 'Google Analytics 4 Measurement ID for web traffic'
  },
  {
    key: 'databaseURL',
    label: 'Database URL (Realtime DB)',
    placeholder: 'https://your-project-default-rtdb.firebaseio.com',
    required: false,
    description: 'Endpoint URL for Firebase Realtime Database'
  }
];

export const FIREBASE_CONFIG_FIELDS: Array<{
  key: keyof Omit<FirebaseConfig, 'enabled' | 'options'>;
  label: string;
  placeholder: string;
  required: boolean;
  description?: string;
}> = [
  ...FIREBASE_CORE_FIELDS,
  ...FIREBASE_EXTENDED_FIELDS
];

// NOTE: no lookbehind/lookahead here — older Safari versions throw on those.
const PROJECT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/;
const API_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{10,}$/;
const APP_ID_PATTERN = /^\d+:\d+:(web|android|ios):[0-9a-fA-F]+$/;
const HOST_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i;
const BUCKET_PATTERN = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*$/i;
const MEASUREMENT_ID_PATTERN = /^G-[0-9A-Za-z_-]+$/;

function asTrimmedString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
}

/** Normalizes a (possibly partial / imported) Firebase config without dropping fields. */
export function normalizeFirebaseConfig(value?: Partial<FirebaseConfig> | null): FirebaseConfig {
  const source = (value || {}) as Record<string, unknown>;
  const rawOpts = (source.options || {}) as Record<string, unknown>;

  const options = {
    enableAuth: rawOpts.enableAuth !== undefined ? Boolean(rawOpts.enableAuth) : true,
    enableGoogleAuth: rawOpts.enableGoogleAuth !== undefined ? Boolean(rawOpts.enableGoogleAuth) : true,
    enableEmailAuth: rawOpts.enableEmailAuth !== undefined ? Boolean(rawOpts.enableEmailAuth) : true,
    enableAnonymousAuth: Boolean(rawOpts.enableAnonymousAuth),
    enableAnalytics: rawOpts.enableAnalytics !== undefined ? Boolean(rawOpts.enableAnalytics) : Boolean(source.measurementId),
    enableFirestore: Boolean(rawOpts.enableFirestore),
    enableRealtimeDb: rawOpts.enableRealtimeDb !== undefined ? Boolean(rawOpts.enableRealtimeDb) : Boolean(source.databaseURL),
    enableStorage: rawOpts.enableStorage !== undefined ? Boolean(rawOpts.enableStorage) : Boolean(source.storageBucket),
    persistence: (rawOpts.persistence as 'LOCAL' | 'SESSION' | 'NONE') || 'LOCAL',
    defaultRedirect: asTrimmedString(rawOpts.defaultRedirect, 200) || '/'
  };

  const config: FirebaseConfig = {
    apiKey: asTrimmedString(source.apiKey, 300),
    authDomain: asTrimmedString(source.authDomain, 300),
    projectId: asTrimmedString(source.projectId, 300),
    storageBucket: asTrimmedString(source.storageBucket, 300),
    messagingSenderId: asTrimmedString(source.messagingSenderId, 100),
    appId: asTrimmedString(source.appId, 300),
    measurementId: asTrimmedString(source.measurementId, 100),
    databaseURL: asTrimmedString(source.databaseURL, 300),
    enabled: Boolean(source.enabled),
    options
  };
  return config;
}

/** A config is usable only when it is enabled and has the two mandatory keys. */
export function isFirebaseConfigured(config?: Partial<FirebaseConfig> | null): boolean {
  if (!config || !config.enabled) return false;
  return Boolean(config.apiKey && config.projectId);
}

export function firebaseConfigsEqual(
  a?: Partial<FirebaseConfig> | null,
  b?: Partial<FirebaseConfig> | null
): boolean {
  const left = normalizeFirebaseConfig(a);
  const right = normalizeFirebaseConfig(b);
  return (
    left.apiKey === right.apiKey &&
    left.authDomain === right.authDomain &&
    left.projectId === right.projectId &&
    left.storageBucket === right.storageBucket &&
    left.messagingSenderId === right.messagingSenderId &&
    left.appId === right.appId &&
    left.measurementId === right.measurementId &&
    left.databaseURL === right.databaseURL &&
    left.enabled === right.enabled &&
    JSON.stringify(left.options) === JSON.stringify(right.options)
  );
}

export interface FirebaseConfigValidation {
  /** Fatal problems: the config cannot be used until they are fixed. */
  errors: Record<string, string>;
  /** Non-fatal problems that still allow a working configuration. */
  warnings: Record<string, string>;
}

/**
 * Field-level validation of a *draft* config. When the draft is disabled only
 * obviously-malformed values are reported, so a half-filled form never blocks
 * saving unrelated site settings.
 */
export function validateFirebaseConfig(draft: Partial<FirebaseConfig>): FirebaseConfigValidation {
  const config = normalizeFirebaseConfig(draft);
  const errors: Record<string, string> = {};
  const warnings: Record<string, string> = {};

  if (!config.enabled) {
    if (config.apiKey && !API_KEY_PATTERN.test(config.apiKey)) {
      warnings.apiKey = 'This does not look like a Firebase web API key (it usually starts with "AIza").';
    }
    return { errors, warnings };
  }

  if (!config.apiKey) {
    errors.apiKey = 'An API key is required to enable Firebase Auth.';
  } else if (!API_KEY_PATTERN.test(config.apiKey)) {
    warnings.apiKey = 'This does not look like a Firebase web API key (it usually starts with "AIza").';
  }

  if (!config.projectId) {
    errors.projectId = 'A project id is required to enable Firebase Auth.';
  } else if (!PROJECT_ID_PATTERN.test(config.projectId)) {
    warnings.projectId = 'Project ids are lowercase letters, digits and dashes (2-63 characters).';
  }

  if (config.authDomain) {
    if (/^https?:\/\//i.test(config.authDomain) || config.authDomain.includes('/')) {
      errors.authDomain = 'Enter only the domain, without "https://" or a path (e.g. your-app.firebaseapp.com).';
    } else if (!HOST_PATTERN.test(config.authDomain)) {
      warnings.authDomain = 'This does not look like a valid domain name.';
    }
  } else {
    warnings.authDomain = 'Without an auth domain, Google sign-in popups cannot return to your site.';
  }

  if (config.appId && !APP_ID_PATTERN.test(config.appId)) {
    warnings.appId = 'App ids look like "1:123456789:web:abcdef".';
  }

  if (config.storageBucket && !BUCKET_PATTERN.test(config.storageBucket)) {
    warnings.storageBucket = 'This does not look like a valid bucket name.';
  }

  if (config.messagingSenderId && !/^\d{5,20}$/.test(config.messagingSenderId)) {
    warnings.messagingSenderId = 'Sender ids are numeric.';
  }

  if (config.measurementId && !MEASUREMENT_ID_PATTERN.test(config.measurementId)) {
    warnings.measurementId = 'Measurement IDs look like "G-XXXXXXXXXX".';
  }

  if (config.databaseURL) {
    if (!/^https:\/\//i.test(config.databaseURL)) {
      warnings.databaseURL = 'Database URLs must start with "https://" (e.g. https://your-project.firebaseio.com).';
    } else if (!HOST_PATTERN.test(config.databaseURL.replace(/^https:\/\//i, '').split('/')[0])) {
      warnings.databaseURL = 'This does not look like a valid database host.';
    }
  }

  return { errors, warnings };
}

export interface ParsedFirebaseConfigJson {
  config?: FirebaseConfig;
  /** True when at least one recognisable field was found. */
  recognized: boolean;
  error?: string;
  /** Field labels that were missing from the pasted snippet. */
  missing: string[];
}

function quoteUnquotedKeys(input: string): string {
  // Firebase console snippets are valid JSON today, but older ones use single
  // quotes or unquoted keys. Normalize both before parsing.
  return input
    .replace(/([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g, '$1"$2":')
    .replace(/'/g, '"');
}

export function parseFirebaseConfigJson(raw: string): ParsedFirebaseConfigJson {
  const text = (raw || '').trim();
  if (!text) return { recognized: false, missing: [] };

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return { recognized: false, missing: [], error: 'No JSON object found in the pasted text.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    try {
      parsed = JSON.parse(quoteUnquotedKeys(match[0]));
    } catch {
      return {
        recognized: false,
        missing: [],
        error: 'The pasted text is not valid JSON. Copy the whole firebaseConfig object from the Firebase console.'
      };
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { recognized: false, missing: [], error: 'The pasted value is not a configuration object.' };
  }

  const record = parsed as Record<string, unknown>;
  const nested =
    record.firebaseConfig && typeof record.firebaseConfig === 'object'
      ? (record.firebaseConfig as Record<string, unknown>)
      : record;

  const ALL_KEYS = [
    'apiKey',
    'authDomain',
    'projectId',
    'appId',
    'storageBucket',
    'messagingSenderId',
    'measurementId',
    'databaseURL'
  ];

  const recognizedKeys = ALL_KEYS.filter(
    key => typeof nested[key] === 'string' && String(nested[key]).trim()
  );

  if (recognizedKeys.length === 0) {
    return {
      recognized: false,
      missing: FIREBASE_CORE_FIELDS.map(field => field.label),
      error: 'No Firebase fields were found (expected apiKey, authDomain, projectId, ...).'
    };
  }

  return {
    recognized: true,
    config: normalizeFirebaseConfig(nested as Partial<FirebaseConfig>),
    missing: FIREBASE_CORE_FIELDS.filter(
      field => !recognizedKeys.includes(field.key as string)
    ).map(field => field.label)
  };
}

/**
 * Checks a configured API key against Google's Identity Toolkit endpoint.
 *
 * This performs a real (read-only) call that never creates an account and never
 * signs anyone in: an intentionally invalid credential is submitted and the
 * error *code* tells us whether the API key itself is accepted by the project.
 * It cannot prove that a provider is enabled or that a domain is authorized —
 * those checks require a real account in the Firebase console.
 */
export interface FirebaseKeyCheckResult {
  status: 'valid' | 'invalid' | 'unreachable' | 'skipped';
  message: string;
}

export async function checkFirebaseApiKey(
  apiKey: string,
  fetchImpl: typeof fetch = fetch
): Promise<FirebaseKeyCheckResult> {
  const key = (apiKey || '').trim();
  if (!key) {
    return { status: 'skipped', message: 'Add an API key first.' };
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`;

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'not-a-real-password' })
    });
  } catch {
    return {
      status: 'unreachable',
      message: 'Could not reach Firebase. Check your internet connection and try again.'
    };
  }

  let payload: { error?: { message?: string } } = {};
  try {
    payload = (await response.json()) as { error?: { message?: string } };
  } catch {
    /* handled below */
  }

  const message = String(payload?.error?.message || '');
  const code = message.split(' ')[0];

  // The Identity Toolkit endpoint usually answers an invalid key with the human
  // message "API key not valid. Please pass a valid API key." (no error code
  // token), so match the wording as well as the machine codes.
  if (/API key not valid/i.test(message) || code === 'API_KEY_INVALID' || code === 'INVALID_API_KEY' || code === 'CONFIGURATION_NOT_FOUND') {
    return { status: 'invalid', message: 'Firebase rejected this API key. Re-copy it from the Firebase console.' };
  }
  if (code === 'PERMISSION_DENIED' || code === 'REQUEST_DENIED' || code === 'OPERATION_NOT_ALLOWED') {
    return {
      status: 'invalid',
      message: `Firebase returned ${code}. Enable the Email/Password provider in Authentication → Sign-in method and retry.`
    };
  }
  if (code === 'EMAIL_NOT_FOUND' || code === 'INVALID_LOGIN_CREDENTIALS' || code === 'INVALID_PASSWORD' ||
      code === 'INVALID_EMAIL' || code === 'MISSING_PASSWORD' || code === 'MISSING_EMAIL' || code === 'INVALID_ARGUMENT') {
    return {
      status: 'valid',
      message: 'The API key was accepted by Firebase (this test does not create an account or sign in).'
    };
  }

  if (response.status >= 500) {
    return { status: 'unreachable', message: 'Firebase is temporarily unavailable. Try again shortly.' };
  }

  return {
    status: 'unreachable',
    message: code ? `Unexpected Firebase response: ${code}` : 'Unexpected Firebase response.'
  };
}
