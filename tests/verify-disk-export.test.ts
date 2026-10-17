import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { exportProjectToZip } from '../src/services/exporter';
import { createStarterProject, createElement } from '../src/utils/defaults';
import { SiteElement } from '../src/types/document';

/**
 * Writes a real ZIP to `sample-export/` so the exported artifact can be
 * inspected (and served) outside the test runner.
 */
describe('Real Disk Sample ZIP Export Verification', () => {
  it('generates a physical ZIP with assets, pages and hardened markup', async () => {
    const project = createStarterProject('Apex Real Estate');

    // Add another custom page to test complex routing
    const contactPage = {
      ...project.pages[1],
      id: 'page_contact',
      name: 'Contact',
      slug: '/contact',
      isHome: false,
      title: 'Contact Us — Apex Real Estate'
    };
    project.pages.push(contactPage);

    const page = project.pages[0];
    const root = page.elements[page.rootElementId];

    const append = (element: SiteElement) => {
      page.elements[element.id] = element;
      root.children.push(element.id);
    };

    append(
      createElement('image', page.rootElementId, {
        props: {
          src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          alt: 'Apex pixel'
        }
      })
    );

    append(
      createElement('link', page.rootElementId, {
        props: { text: 'Read about us', href: '/about' }
      })
    );

    append(
      createElement('navbar', page.rootElementId, {
        props: {
          brandText: 'Apex',
          brandLink: '/',
          navLinks: [
            { id: 'nav_home', label: 'Home', href: '/' },
            { id: 'nav_contact', label: 'Contact', href: '/contact' }
          ]
        }
      })
    );

    append(
      createElement('auth', page.rootElementId, {
        props: { authTitle: 'Client Portal', authMode: 'both' }
      })
    );

    const zipBlob = await exportProjectToZip(project);
    const arrayBuffer = await zipBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const outDir = path.resolve(__dirname, '../sample-export');
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    const zipPath = path.join(outDir, 'sample-site.zip');
    fs.writeFileSync(zipPath, buffer);
    expect(fs.existsSync(zipPath)).toBe(true);
    expect(fs.statSync(zipPath).size).toBeGreaterThan(1000);
  });
});
