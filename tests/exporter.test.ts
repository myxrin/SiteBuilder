import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  generateProjectCSS,
  generatePageHTML,
  exportProjectToZip,
  slugToFilename,
  cssRulesToString
} from '../src/services/exporter';
import { createStarterProject, createElement } from '../src/utils/defaults';

describe('Website Exporter Pipeline', () => {
  it('maps slugs to correct filenames', () => {
    expect(slugToFilename('/', true)).toBe('index.html');
    expect(slugToFilename('', true)).toBe('index.html');
    expect(slugToFilename('/about', false)).toBe('about.html');
    expect(slugToFilename('/contact-us', false)).toBe('contact-us.html');
  });

  it('generates free positioning and coordinate CSS rules', () => {
    const rules = cssRulesToString({
      position: 'absolute',
      top: '20px',
      left: '40px',
      zIndex: 50,
      transform: 'translate(-50%, -50%)'
    });

    expect(rules).toContain('position: absolute;');
    expect(rules).toContain('top: 20px;');
    expect(rules).toContain('left: 40px;');
    expect(rules).toContain('z-index: 50;');
    expect(rules).toContain('transform: translate(-50%, -50%);');
  });

  it('generates clean responsive CSS with breakpoints', () => {
    const project = createStarterProject('CSS Test');
    const css = generateProjectCSS(project);

    expect(css).toContain(':root');
    expect(css).toContain('@media (max-width: 1024px)');
    expect(css).toContain('@media (max-width: 768px)');
    expect(css).toContain('.sb-');
  });

  it('generates valid semantic HTML for a page', () => {
    const project = createStarterProject('HTML Test');
    const homePage = project.pages[0];
    const assetMap = new Map<string, string>();

    const html = generatePageHTML(homePage, project, assetMap);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en">');
    expect(html).toContain('<title>');
    expect(html).toContain('<link rel="stylesheet" href="css/styles.css">');
    expect(html).toContain('<section class="sb-');
    expect(html).toContain('<script src="js/main.js"></script>');
  });

  it('generates Firebase Auth element HTML and includes Firebase SDK', () => {
    const project = createStarterProject('Firebase Auth Test');
    project.settings.firebaseConfig = {
      apiKey: 'test-api-key',
      authDomain: 'test.firebaseapp.com',
      projectId: 'test-proj',
      enabled: true
    };

    const rootEl = project.pages[0].elements[project.pages[0].rootElementId];
    const authEl = createElement('auth', rootEl.id, {
      props: {
        authTitle: 'Member Login',
        enableGoogleAuth: true
      }
    });
    project.pages[0].elements[authEl.id] = authEl;
    rootEl.children.push(authEl.id);

    const assetMap = new Map<string, string>();
    const html = generatePageHTML(project.pages[0], project, assetMap);

    expect(html).toContain('firebase-app-compat.js');
    expect(html).toContain('firebase-auth-compat.js');
    expect(html).toContain('sb-firebase-auth-form');
    expect(html).toContain('Member Login');
    expect(html).toContain('Google Account');
  });

  it('generates a complete ZIP archive with all required files', async () => {
    const project = createStarterProject('Export ZIP Test');

    // Add an image element with base64 data to test asset extraction
    const rootEl = project.pages[0].elements[project.pages[0].rootElementId];
    const imgEl = createElement('image', rootEl.id, {
      props: {
        src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        alt: 'Extracted 1x1 pixel'
      }
    });
    project.pages[0].elements[imgEl.id] = imgEl;
    rootEl.children.push(imgEl.id);

    const zipBlob = await exportProjectToZip(project);
    expect(zipBlob).toBeDefined();
    expect(zipBlob.size).toBeGreaterThan(0);

    // Read ZIP back and inspect contents
    const zip = await JSZip.loadAsync(zipBlob);

    // Check index.html exists
    expect(zip.file('index.html')).not.toBeNull();
    const indexHtml = await zip.file('index.html')!.async('string');
    expect(indexHtml).toContain('<!DOCTYPE html>');

    // Check about.html exists (since starter project has Home and About)
    expect(zip.file('about.html')).not.toBeNull();

    // Check css/styles.css exists
    expect(zip.file('css/styles.css')).not.toBeNull();
    const stylesCss = await zip.file('css/styles.css')!.async('string');
    expect(stylesCss).toContain(':root');

    // Check js/main.js exists
    expect(zip.file('js/main.js')).not.toBeNull();

    // Check README.md exists
    expect(zip.file('README.md')).not.toBeNull();
    const readme = await zip.file('README.md')!.async('string');
    expect(readme).toContain('# Export ZIP Test');
    expect(readme).toContain('How to Run Locally');

    // Check extracted asset exists in assets/ folder
    expect(zip.file('assets/img_1.png')).not.toBeNull();

    // Verify index.html refers to the extracted asset path instead of base64
    expect(indexHtml).toContain('src="assets/img_1.png"');
    expect(indexHtml).not.toContain('src="data:image/png;base64');
  });
});
