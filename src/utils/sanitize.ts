export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function sanitizeUrl(url?: string): string {
  if (!url) return '#';
  const trimmed = url.trim();
  // Safe link protocols or relative links
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../') ||
    /^https?:\/\//i.test(trimmed) ||
    /^mailto:/i.test(trimmed) ||
    /^tel:/i.test(trimmed)
  ) {
    return trimmed;
  }
  // If it's a data URL for images, allow only image/
  if (/^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,/i.test(trimmed)) {
    return trimmed;
  }
  // Otherwise default to # for safety against javascript: etc.
  return '#';
}

export function sanitizeSlug(input: string): string {
  let slug = input.trim().toLowerCase();
  if (!slug.startsWith('/')) {
    slug = '/' + slug;
  }
  slug = slug.replace(/[^a-z0-9\-_/]/g, '-').replace(/\/+/g, '/');
  if (slug.length > 1 && slug.endsWith('/')) {
    slug = slug.slice(0, -1);
  }
  return slug || '/';
}

const MAX_TEXT_LENGTH = 20000;
const MAX_CSS_LENGTH = 200000;

/**
 * Normalizes user/imported text: enforces a string, strips control characters
 * and clamps the length so a single field cannot bloat a project.
 */
export function sanitizePlainText(value: unknown, maxLength: number = MAX_TEXT_LENGTH): string {
  if (typeof value !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const cleaned = value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  return cleaned.length > maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

/**
 * Validates a CSS value before it is written into the exported stylesheet.
 * Prevents breaking out of the declaration block (`</style>`, `}`) or injecting
 * legacy script vectors (`expression()`).
 */
export function sanitizeCssValue(value: unknown): string | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : undefined;
  }
  if (typeof value !== 'string') return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > 500) return undefined;

  // Reject characters that could terminate the declaration or the style block.
  if (/[<>{}]/.test(trimmed)) return undefined;
  if (/expression\s*\(/i.test(trimmed)) return undefined;
  if (/javascript:/i.test(trimmed)) return undefined;

  // url() is allowed only for http(s) and image data URLs.
  const urlMatches = trimmed.match(/url\s*\(\s*(['"]?)(.*?)\1\s*\)/gi);
  if (urlMatches) {
    for (const match of urlMatches) {
      const inner = match.replace(/^url\s*\(\s*(['"]?)/i, '').replace(/['"]?\s*\)$/, '');
      const allowed = /^https?:\/\//i.test(inner) || /^data:image\//i.test(inner) || inner.startsWith('/') || inner.startsWith('./') || inner.startsWith('../');
      if (!allowed) return undefined;
    }
  }

  return trimmed;
}

/**
 * Keeps only safe CSS class tokens. Used for the "custom class" element field,
 * which is interpolated into the `class` attribute of the exported HTML.
 */
export function sanitizeClassName(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .split(/\s+/)
    .filter(token => /^[A-Za-z_][A-Za-z0-9_-]*$/.test(token))
    .join(' ');
}

/** Clamps custom CSS blocks without throwing away their content. */
export function sanitizeCustomCss(value: unknown): string {
  if (typeof value !== 'string') return '';
  const withoutScript = value.replace(/<\/?script[^>]*>/gi, '');
  return withoutScript.length > MAX_CSS_LENGTH ? withoutScript.slice(0, MAX_CSS_LENGTH) : withoutScript;
}
