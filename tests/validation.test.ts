import { describe, it, expect } from 'vitest';
import { validateProject } from '../src/utils/validation';
import { escapeHtml, sanitizeUrl, sanitizeSlug } from '../src/utils/sanitize';
import { createStarterProject } from '../src/utils/defaults';

describe('Document Validation & Sanitization', () => {
  it('validates a valid starter project successfully', () => {
    const project = createStarterProject('Test Site');
    const result = validateProject(project);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.repairedProject).toBeDefined();
    expect(result.repairedProject?.name).toBe('Test Site');
  });

  it('detects missing project fields and repairs gracefully', () => {
    const broken = {
      // Missing id, name, pages
    };
    const result = validateProject(broken);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.repairedProject).toBeDefined();
    expect(result.repairedProject?.name).toBe('Untitled Site');
  });

  it('detects duplicate page slugs', () => {
    const project = createStarterProject('Test Site');
    // Force duplicate slug
    project.pages[1].slug = project.pages[0].slug;

    const result = validateProject(project);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.includes('Duplicate slug'))).toBe(true);
  });

  it('escapes dangerous HTML characters', () => {
    const dangerous = '<script>alert("xss")</script>&"\'';
    const escaped = escapeHtml(dangerous);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;&amp;&quot;&#039;');
    expect(escaped).not.toContain('<script>');
  });

  it('sanitizes malicious URLs while preserving legitimate ones', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBe('#');
    expect(sanitizeUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')).toBe('#');
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
    expect(sanitizeUrl('/about.html')).toBe('/about.html');
    expect(sanitizeUrl('#features')).toBe('#features');
    expect(sanitizeUrl('mailto:contact@test.com')).toBe('mailto:contact@test.com');
  });

  it('normalizes and sanitizes slugs', () => {
    expect(sanitizeSlug('About Us')).toBe('/about-us');
    expect(sanitizeSlug('/Services/Web/')).toBe('/services/web');
    expect(sanitizeSlug('contact')).toBe('/contact');
    expect(sanitizeSlug('/')).toBe('/');
  });
});
