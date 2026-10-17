import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';
import {
  cssRulesToString,
  generatePageHTML,
  generateProjectCSS,
  generateClientJS,
  exportProjectToZip,
  collectExportWarnings
} from '../src/services/exporter';
import { createStarterProject, createElement, createBlankPage } from '../src/utils/defaults';
import { SiteElement } from '../src/types/document';

function appendElement(project: ReturnType<typeof createStarterProject>, element: SiteElement) {
  const page = project.pages[0];
  const root = page.elements[page.rootElementId];
  page.elements[element.id] = element;
  root.children.push(element.id);
}

describe('Exporter Hardening', () => {
  it('drops unsafe CSS values but keeps safe ones', () => {
    const rules = cssRulesToString({
      backgroundImage: 'url(javascript:alert(1))',
      color: '#ff0000',
      width: '50%',
      boxShadow: 'expression(alert(1))',
      transform: 'translate(-50%, -50%)'
    });

    expect(rules).not.toMatch(/javascript/i);
    expect(rules).not.toMatch(/expression/i);
    expect(rules).toContain('color: #ff0000;');
    expect(rules).toContain('width: 50%;');
    expect(rules).toContain('transform: translate(-50%, -50%);');
  });

  it('maps internal links to exported filenames and neutralizes unsafe hrefs', () => {
    const project = createStarterProject('Link Mapping');
    project.pages.push(createBlankPage('Contact', '/contact', false));

    appendElement(
      project,
      createElement('link', project.pages[0].rootElementId, {
        props: { text: 'About', href: '/about' }
      })
    );
    appendElement(
      project,
      createElement('link', project.pages[0].rootElementId, {
        props: { text: 'Contact', href: 'contact' }
      })
    );
    appendElement(
      project,
      createElement('link', project.pages[0].rootElementId, {
        props: { text: 'Docs', href: 'docs/guide' }
      })
    );
    appendElement(
      project,
      createElement('link', project.pages[0].rootElementId, {
        props: { text: 'External', href: 'https://example.com' }
      })
    );
    appendElement(
      project,
      createElement('link', project.pages[0].rootElementId, {
        props: { text: 'Evil', href: 'javascript:alert(1)' }
      })
    );

    const html = generatePageHTML(project.pages[0], project, new Map());

    expect(html).toContain('href="about.html"');
    expect(html).toContain('href="contact.html"');
    expect(html).toContain('href="./docs/guide"');
    expect(html).toContain('href="https://example.com"');
    expect(html).not.toMatch(/href="javascript:/i);
  });

  it('exports auth cards disabled when Firebase is not configured', () => {
    const project = createStarterProject('Auth Disabled');
    appendElement(
      project,
      createElement('auth', project.pages[0].rootElementId, {
        props: { authTitle: 'Members Only', authMode: 'both' }
      })
    );

    const html = generatePageHTML(project.pages[0], project, new Map());

    expect(html).toContain('data-auth-configured="false"');
    expect(html).toContain('Members Only');
    expect(html).not.toContain('firebase-app-compat.js');

    const warnings = collectExportWarnings(project);
    expect(warnings.some(w => /disabled state/i.test(w))).toBe(true);
  });

  it('enables auth cards and redirect metadata when Firebase is configured', () => {
    const project = createStarterProject('Auth Enabled');
    project.settings.firebaseConfig = {
      apiKey: 'demo-key',
      authDomain: 'demo.firebaseapp.com',
      projectId: 'demo-project',
      enabled: true
    };
    appendElement(
      project,
      createElement('auth', project.pages[0].rootElementId, {
        props: {
          authTitle: 'Members Only',
          enableGoogleAuth: true,
          authRedirect: '/dashboard'
        }
      })
    );

    const html = generatePageHTML(project.pages[0], project, new Map());

    expect(html).toContain('data-auth-configured="true"');
    expect(html).toContain('data-auth-redirect="/dashboard"');
    expect(html).toContain('firebase-app-compat.js');
    expect(html).toContain('firebase-auth-compat.js');
  });

  it('exports a mobile navigation toggle for navbar elements', () => {
    const project = createStarterProject('Navbar Toggle');
    appendElement(
      project,
      createElement('navbar', project.pages[0].rootElementId, {
        props: {
          brandText: 'Brand',
          navLinks: [
            { id: 'nav_home', label: 'Home', href: '/' },
            { id: 'nav_about', label: 'About', href: '/about' }
          ]
        }
      })
    );

    const html = generatePageHTML(project.pages[0], project, new Map());

    expect(html).toContain('sb-nav-toggle');
    expect(html).toContain('sb-nav-menu');
    expect(html).toContain('href="index.html"');
    expect(html).toContain('href="about.html"');
  });

  it('keeps the exported ZIP free of embedded data URLs and drops unsafe CSS from styles.css', async () => {
    const project = createStarterProject('ZIP Hardening');
    const page = project.pages[0];

    appendElement(
      project,
      createElement('image', page.rootElementId, {
        props: {
          src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          alt: 'pixel'
        },
        styles: { backgroundImage: 'url(javascript:alert(1))', color: '#00ff00' }
      })
    );

    const blob = await exportProjectToZip(project);
    const zip = await JSZip.loadAsync(blob);

    const stylesCss = await zip.file('css/styles.css')!.async('string');
    expect(stylesCss).not.toMatch(/javascript:/i);
    expect(stylesCss).not.toMatch(/expression\(/i);

    const indexHtml = await zip.file('index.html')!.async('string');
    expect(indexHtml).not.toContain('data:image/png;base64');
    expect(indexHtml).toContain('src="assets/img_1.png"');
  });

  it('exports a neutral placeholder instead of a broken image when no src is set', () => {
    const project = createStarterProject('Empty Image');
    const page = project.pages[0];

    appendElement(
      project,
      createElement('image', page.rootElementId, {
        props: { src: '', alt: 'Team photo' }
      })
    );

    const html = generatePageHTML(page, project, new Map());

    expect(html).not.toContain('src="#"');
    expect(html).toContain('sb-image-placeholder');
    expect(html).toContain('Team photo');
  });

  it('falls back to the placeholder when an image src uses an unsafe protocol', () => {
    const project = createStarterProject('Unsafe Image');
    const page = project.pages[0];

    appendElement(
      project,
      createElement('image', page.rootElementId, {
        props: { src: 'javascript:alert(1)', alt: 'Bad' }
      })
    );

    const html = generatePageHTML(page, project, new Map());

    expect(html).not.toMatch(/javascript:/i);
    expect(html).toContain('sb-image-placeholder');
  });

  it('ships the image placeholder styling in the exported stylesheet', () => {
    const project = createStarterProject('Placeholder CSS');
    expect(generateProjectCSS(project)).toContain('.sb-image-placeholder');
  });

  it('exports an auth runtime with friendly errors and a popup-blocked redirect fallback', () => {
    const project = createStarterProject('Auth Runtime');

    appendElement(
      project,
      createElement('auth', project.pages[0].rootElementId, {
        props: { authTitle: 'Welcome' }
      })
    );

    const js = generateClientJS(project);

    expect(js).toContain('friendlyAuthError');
    expect(js).toContain('auth/invalid-credential');
    expect(js).toContain('signInWithRedirect');
    expect(js).toContain('auth/popup-blocked');
  });
});
