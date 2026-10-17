import { describe, it, expect, vi } from 'vitest';
import {
  normalizeFirebaseConfig,
  isFirebaseConfigured,
  firebaseConfigsEqual,
  validateFirebaseConfig,
  parseFirebaseConfigJson,
  checkFirebaseApiKey
} from '../src/utils/firebaseConfig';

describe('normalizeFirebaseConfig', () => {
  it('keeps every known field and drops unknown ones', () => {
    const config = normalizeFirebaseConfig({
      apiKey: '  AIzaSyTESTKEY123456789  ',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo-project',
      storageBucket: 'demo.appspot.com',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abcdef',
      enabled: true,
      // Unknown extra keys must not survive normalization.
      secretAdminKey: 'must-not-survive'
    } as never);

    expect(config.apiKey).toBe('AIzaSyTESTKEY123456789');
    expect(config.authDomain).toBe('demo.firebaseapp.com');
    expect(config.projectId).toBe('demo-project');
    expect(config.storageBucket).toBe('demo.appspot.com');
    expect(config.messagingSenderId).toBe('123456789');
    expect(config.appId).toBe('1:123456789:web:abcdef');
    expect(config.enabled).toBe(true);
    expect(Object.keys(config)).not.toContain('secretAdminKey');
  });

  it('returns empty strings for missing fields and coerces enabled to boolean', () => {
    const config = normalizeFirebaseConfig({ enabled: 1 as unknown as boolean });
    expect(config.apiKey).toBe('');
    expect(config.projectId).toBe('');
    expect(config.enabled).toBe(true);
  });

  it('handles null/undefined input', () => {
    expect(normalizeFirebaseConfig(null).apiKey).toBe('');
    expect(normalizeFirebaseConfig(undefined).enabled).toBe(false);
  });
});

describe('isFirebaseConfigured', () => {
  it('requires enabled + apiKey + projectId', () => {
    expect(isFirebaseConfigured({ enabled: true, apiKey: 'AIza1234567890', projectId: 'my-project' })).toBe(true);
    expect(isFirebaseConfigured({ enabled: false, apiKey: 'AIza1234567890', projectId: 'my-project' })).toBe(false);
    expect(isFirebaseConfigured({ enabled: true, apiKey: '', projectId: 'my-project' })).toBe(false);
    expect(isFirebaseConfigured({ enabled: true, apiKey: 'AIza1234567890' })).toBe(false);
    expect(isFirebaseConfigured(null)).toBe(false);
  });
});

describe('firebaseConfigsEqual', () => {
  it('compares normalized values', () => {
    expect(
      firebaseConfigsEqual(
        { apiKey: ' AIza1234567890 ', projectId: 'p1', enabled: true },
        { apiKey: 'AIza1234567890', projectId: 'p1', enabled: true }
      )
    ).toBe(true);

    expect(
      firebaseConfigsEqual(
        { apiKey: 'AIza1234567890', projectId: 'p1', enabled: true },
        { apiKey: 'AIza1234567890', projectId: 'p2', enabled: true }
      )
    ).toBe(false);
  });

  it('treats storageBucket/messagingSenderId differences as changes', () => {
    expect(
      firebaseConfigsEqual(
        { enabled: true, apiKey: 'AIza1234567890', projectId: 'p', storageBucket: 'a.appspot.com' },
        { enabled: true, apiKey: 'AIza1234567890', projectId: 'p', storageBucket: 'b.appspot.com' }
      )
    ).toBe(false);
  });
});

describe('validateFirebaseConfig', () => {
  it('only reports warnings when Firebase is disabled', () => {
    const result = validateFirebaseConfig({ enabled: false, apiKey: 'not-a-real-key' });
    expect(result.errors).toEqual({});
    expect(result.warnings.apiKey).toBeTruthy();
  });

  it('requires apiKey and projectId when enabled', () => {
    const result = validateFirebaseConfig({ enabled: true });
    expect(result.errors.apiKey).toBeTruthy();
    expect(result.errors.projectId).toBeTruthy();
  });

  it('accepts a well-formed config with no errors', () => {
    const result = validateFirebaseConfig({
      enabled: true,
      apiKey: 'AIzaSyA1234567890abcdefghijklmnopq',
      projectId: 'my-project-123',
      authDomain: 'my-project-123.firebaseapp.com',
      appId: '1:123456789:web:abc123',
      storageBucket: 'my-project-123.appspot.com',
      messagingSenderId: '123456789'
    });
    expect(result.errors).toEqual({});
    expect(result.warnings).toEqual({});
  });

  it('rejects authDomain that includes a protocol or path', () => {
    const result = validateFirebaseConfig({
      enabled: true,
      apiKey: 'AIzaSyA1234567890abcdefghijklmnopq',
      projectId: 'my-project-123',
      authDomain: 'https://my-project.firebaseapp.com/login'
    });
    expect(result.errors.authDomain).toBeTruthy();
  });

  it('warns about missing authDomain (Google sign-in limitation)', () => {
    const result = validateFirebaseConfig({
      enabled: true,
      apiKey: 'AIzaSyA1234567890abcdefghijklmnopq',
      projectId: 'my-project-123'
    });
    expect(result.warnings.authDomain).toBeTruthy();
  });
});

describe('parseFirebaseConfigJson', () => {
  it('parses a standard Firebase console snippet', () => {
    const snippet = `{
      "apiKey": "AIzaSyA1234567890abcdefghijklmnopq",
      "authDomain": "demo.firebaseapp.com",
      "projectId": "demo-123",
      "storageBucket": "demo-123.appspot.com",
      "messagingSenderId": "123456789",
      "appId": "1:123456789:web:abc123"
    }`;

    const result = parseFirebaseConfigJson(snippet);
    expect(result.recognized).toBe(true);
    expect(result.config?.projectId).toBe('demo-123');
    expect(result.missing).toEqual([]);
  });

  it('parses a nested firebaseConfig object (with surrounding code)', () => {
    const snippet = `const firebaseConfig = {
  firebaseConfig: {
    apiKey: 'AIzaSyA1234567890abcdefghijklmnopq',
    projectId: 'nested-123'
  }
};`;

    const result = parseFirebaseConfigJson(snippet);
    expect(result.recognized).toBe(true);
    expect(result.config?.apiKey).toBe('AIzaSyA1234567890abcdefghijklmnopq');
    expect(result.config?.projectId).toBe('nested-123');
    // Missing fields are reported so the UI can explain them.
    expect(result.missing.length).toBeGreaterThan(0);
  });

  it('reports an error for text that contains no JSON object', () => {
    const result = parseFirebaseConfigJson('hello world');
    expect(result.recognized).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('reports an error for invalid JSON', () => {
    const result = parseFirebaseConfigJson('{ not valid json ]]');
    expect(result.recognized).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('reports an error when the object has no Firebase fields', () => {
    const result = parseFirebaseConfigJson('{ "foo": "bar" }');
    expect(result.recognized).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('parses a full 8-key Firebase snippet with measurementId and databaseURL', () => {
    const snippet = `{
      "apiKey": "AIzaSyA1234567890abcdefghijklmnopq",
      "authDomain": "demo.firebaseapp.com",
      "databaseURL": "https://demo-123-default-rtdb.firebaseio.com",
      "projectId": "demo-123",
      "storageBucket": "demo-123.firebasestorage.app",
      "messagingSenderId": "123456789",
      "appId": "1:123456789:web:abc123",
      "measurementId": "G-ABC123XYZ"
    }`;

    const result = parseFirebaseConfigJson(snippet);
    expect(result.recognized).toBe(true);
    expect(result.config?.measurementId).toBe('G-ABC123XYZ');
    expect(result.config?.databaseURL).toBe('https://demo-123-default-rtdb.firebaseio.com');
    expect(result.config?.storageBucket).toBe('demo-123.firebasestorage.app');
    expect(result.missing).toEqual([]);
  });
});

describe('checkFirebaseApiKey', () => {
  const makeResponse = (body: unknown, status = 400) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => body
    }) as Response;

  it('skips when the key is empty', async () => {
    const fetchImpl = vi.fn();
    const result = await checkFirebaseApiKey('', fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe('skipped');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports an invalid key when Firebase rejects the API key', async () => {
    const fetchImpl = vi.fn(async () =>
      makeResponse({ error: { message: 'API_KEY_INVALID' } })
    );
    const result = await checkFirebaseApiKey('AIzaInvalid', fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe('invalid');
  });

  it('recognises the human "API key not valid" message that Google actually returns', async () => {
    const fetchImpl = vi.fn(async () =>
      makeResponse({
        error: { code: 400, message: 'API key not valid. Please pass a valid API key.', status: 'INVALID_ARGUMENT' }
      })
    );
    const result = await checkFirebaseApiKey('AIzaBadKey1234567890', fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe('invalid');
    expect(result.message).toMatch(/rejected this API key/i);
  });

  it('reports a valid key when Firebase accepts it but the account is unknown', async () => {
    const fetchImpl = vi.fn(async () =>
      makeResponse({ error: { message: 'EMAIL_NOT_FOUND' } })
    );
    const result = await checkFirebaseApiKey('AIzaSyA1234567890', fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe('valid');
    expect(result.message).toMatch(/does not create an account/i);
  });

  it('treats INVALID_LOGIN_CREDENTIALS as a valid key', async () => {
    const fetchImpl = vi.fn(async () =>
      makeResponse({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } })
    );
    const result = await checkFirebaseApiKey('AIzaSyA1234567890', fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe('valid');
  });

  it('explains when the email/password provider is disabled', async () => {
    const fetchImpl = vi.fn(async () =>
      makeResponse({ error: { message: 'OPERATION_NOT_ALLOWED' } })
    );
    const result = await checkFirebaseApiKey('AIzaSyA1234567890', fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe('invalid');
    expect(result.message).toMatch(/Email\/Password/);
  });

  it('reports unreachable on network failure', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('network down');
    });
    const result = await checkFirebaseApiKey('AIzaSyA1234567890', fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe('unreachable');
  });

  it('reports unreachable when Firebase returns a server error', async () => {
    const fetchImpl = vi.fn(async () =>
      makeResponse({ error: { message: 'INTERNAL' } }, 503)
    );
    const result = await checkFirebaseApiKey('AIzaSyA1234567890', fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe('unreachable');
  });

  it('encodes the key into the request URL', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('key=AIza%2Fweird%2Bkey');
      return makeResponse({ error: { message: 'EMAIL_NOT_FOUND' } });
    });
    const result = await checkFirebaseApiKey('AIza/weird+key', fetchImpl as unknown as typeof fetch);
    expect(result.status).toBe('valid');
  });
});
