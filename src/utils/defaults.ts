import { ElementType, SiteElement, Page, Project } from '../types/document';
import { generateId } from './id';

export function createElement(
  type: ElementType,
  parentId: string | null = null,
  overrides?: Partial<SiteElement>
): SiteElement {
  const id = generateId('el');

  const base: SiteElement = {
    id,
    type,
    name: capitalize(type),
    parentId,
    children: [],
    props: {},
    styles: {},
    responsiveStyles: {}
  };

  switch (type) {
    case 'section':
      base.name = 'Section';
      base.styles = {
        padding: { top: '60px', right: '24px', bottom: '60px', left: '24px' },
        backgroundColor: 'transparent',
        display: 'block'
      };
      break;

    case 'container':
      base.name = 'Container';
      base.styles = {
        maxWidth: '1140px',
        width: '100%',
        margin: { top: '0px', right: 'auto', bottom: '0px', left: 'auto' },
        padding: { top: '0px', right: '16px', bottom: '0px', left: '16px' },
        display: 'block'
      };
      break;

    case 'grid':
      base.name = 'Grid (3 Col)';
      base.styles = {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        width: '100%',
        margin: { top: '24px', right: '0px', bottom: '24px', left: '0px' }
      };
      base.responsiveStyles = {
        tablet: { gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
        mobile: { gridTemplateColumns: '1fr', gap: '16px' }
      };
      break;

    case 'card':
      base.name = 'Card';
      base.styles = {
        backgroundColor: '#ffffff',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        borderRadius: '12px',
        padding: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      };
      break;

    case 'heading':
      base.name = 'Heading';
      base.props = {
        text: 'Build Something Incredible',
        headingLevel: 2
      };
      base.styles = {
        fontSize: '36px',
        fontWeight: '700',
        lineHeight: '1.2',
        color: '#0f172a',
        margin: { top: '0px', right: '0px', bottom: '16px', left: '0px' }
      };
      base.responsiveStyles = {
        tablet: { fontSize: '30px' },
        mobile: { fontSize: '24px' }
      };
      break;

    case 'paragraph':
      base.name = 'Paragraph';
      base.props = {
        text: 'SiteBuilder gives you the visual precision and creative control to craft modern websites without writing code from scratch.'
      };
      base.styles = {
        fontSize: '16px',
        lineHeight: '1.6',
        color: '#475569',
        margin: { top: '0px', right: '0px', bottom: '16px', left: '0px' }
      };
      break;

    case 'button':
      base.name = 'Button';
      base.props = {
        text: 'Get Started Free',
        href: '#',
        target: '_self'
      };
      base.styles = {
        display: 'inline-block',
        backgroundColor: '#f59e0b',
        color: '#0f172a',
        padding: { top: '12px', right: '24px', bottom: '12px', left: '24px' },
        borderRadius: '8px',
        fontWeight: '600',
        fontSize: '15px',
        textAlign: 'center',
        borderWidth: '0px'
      };
      break;

    case 'image':
      base.name = 'Image';
      base.props = {
        src: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=1200&q=80',
        alt: 'Website mockup dashboard',
        objectFit: 'cover'
      };
      base.styles = {
        width: '100%',
        maxHeight: '400px',
        borderRadius: '12px',
        margin: { top: '16px', right: '0px', bottom: '16px', left: '0px' }
      };
      break;

    case 'link':
      base.name = 'Link';
      base.props = {
        text: 'Learn more →',
        href: '#',
        target: '_self'
      };
      base.styles = {
        color: '#d97706',
        fontWeight: '600',
        fontSize: '15px',
        textDecoration: 'none'
      };
      break;

    case 'divider':
      base.name = 'Divider';
      base.styles = {
        width: '100%',
        height: '1px',
        backgroundColor: '#e2e8f0',
        margin: { top: '24px', right: '0px', bottom: '24px', left: '0px' }
      };
      break;

    case 'spacer':
      base.name = 'Spacer';
      base.styles = {
        width: '100%',
        height: '40px'
      };
      break;

    case 'shape':
      base.name = 'Shape';
      base.props = {
        shapeType: 'rectangle'
      };
      base.styles = {
        width: '80px',
        height: '80px',
        backgroundColor: '#f59e0b',
        borderRadius: '12px'
      };
      break;

    case 'list':
      base.name = 'List';
      base.props = {
        listType: 'unordered',
        listItems: [
          'Visual drag-and-drop workspace',
          'Responsive design for desktop, tablet, and mobile',
          'Export clean standalone HTML and CSS ZIP'
        ]
      };
      base.styles = {
        fontSize: '15px',
        lineHeight: '1.8',
        color: '#334155',
        padding: { top: '0px', right: '0px', bottom: '0px', left: '20px' },
        margin: { top: '8px', right: '0px', bottom: '16px', left: '0px' }
      };
      break;

    case 'navbar':
      base.name = 'Navbar';
      base.props = {
        brandText: 'SiteBuilder',
        brandLink: '/',
        navLinks: [
          { id: 'nl_1', label: 'Home', href: '/' },
          { id: 'nl_2', label: 'Features', href: '#features' },
          { id: 'nl_3', label: 'About', href: '/about' },
          { id: 'nl_4', label: 'Contact', href: '/contact' }
        ]
      };
      base.styles = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: { top: '16px', right: '24px', bottom: '16px', left: '24px' },
        backgroundColor: '#ffffff',
        borderWidth: '0 0 1px 0',
        borderStyle: 'solid',
        borderColor: '#e2e8f0'
      };
      break;

    case 'auth':
      base.name = 'Firebase Login';
      base.props = {
        authTitle: 'Welcome Back',
        authSubtitle: 'Sign in to access your dashboard',
        authMode: 'both',
        enableGoogleAuth: true,
        authRedirect: '/'
      };
      base.styles = {
        maxWidth: '420px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        padding: { top: '32px', right: '32px', bottom: '32px', left: '32px' },
        margin: { top: '32px', right: 'auto', bottom: '32px', left: 'auto' },
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        display: 'block'
      };
      break;
  }

  return {
    ...base,
    ...overrides,
    props: { ...base.props, ...overrides?.props },
    styles: { ...base.styles, ...overrides?.styles },
    responsiveStyles: { ...base.responsiveStyles, ...overrides?.responsiveStyles }
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function createBlankPage(name: string = 'New Page', slug: string = '/new-page', isHome: boolean = false): Page {
  const rootId = generateId('root');
  const rootEl: SiteElement = {
    id: rootId,
    type: 'container',
    name: 'Body Container',
    parentId: null,
    children: [],
    props: {},
    styles: {
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: { top: '0px', right: '0px', bottom: '0px', left: '0px' },
      display: 'block'
    },
    responsiveStyles: {}
  };

  return {
    id: generateId('page'),
    name,
    slug,
    isHome,
    title: name,
    description: `A page created with SiteBuilder.`,
    rootElementId: rootId,
    elements: {
      [rootId]: rootEl
    }
  };
}

export function createStarterProject(name: string = 'My Website'): Project {
  const projId = generateId('proj');

  // Helper to create and attach an element to parent and elements registry
  const add = (
    elementsMap: Record<string, SiteElement>,
    type: ElementType,
    parentId: string | null,
    overrides?: Partial<SiteElement>
  ): SiteElement => {
    const el = createElement(type, parentId, overrides);
    elementsMap[el.id] = el;
    if (parentId && elementsMap[parentId]) {
      elementsMap[parentId].children.push(el.id);
    }
    return el;
  };

  // ==========================================
  // 1. HOME PAGE
  // ==========================================
  const homeRootId = generateId('root');
  const homeElements: Record<string, SiteElement> = {};

  const homeRootEl: SiteElement = {
    id: homeRootId,
    type: 'container',
    name: 'Page Root',
    parentId: null,
    children: [],
    props: {},
    styles: {
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      display: 'block'
    },
    responsiveStyles: {}
  };
  homeElements[homeRootId] = homeRootEl;

  // 1.1 Navigation Bar
  add(homeElements, 'navbar', homeRootId, {
    props: {
      brandText: 'Prism',
      brandLink: '/',
      navLinks: [
        { id: 'nl_feat', label: 'Features', href: '#features' },
        { id: 'nl_bench', label: 'Benchmarks', href: '#benchmarks' },
        { id: 'nl_arch', label: 'Architecture', href: '#architecture' },
        { id: 'nl_docs', label: 'Docs', href: '/about' }
      ]
    },
    styles: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: { top: '16px', right: '32px', bottom: '16px', left: '32px' },
      backgroundColor: '#090d16',
      color: '#f8fafc',
      borderWidth: '0 0 1px 0',
      borderStyle: 'solid',
      borderColor: '#1e293b'
    },
    responsiveStyles: {
      mobile: {
        padding: { top: '14px', right: '16px', bottom: '14px', left: '16px' }
      }
    }
  });

  // 1.2 Hero Section (Dark Theme, High-Impact Developer Craft)
  const heroSection = add(homeElements, 'section', homeRootId, {
    name: 'Hero Section',
    styles: {
      padding: { top: '80px', right: '24px', bottom: '80px', left: '24px' },
      backgroundColor: '#090d16',
      color: '#f8fafc',
      display: 'block'
    },
    responsiveStyles: {
      mobile: {
        padding: { top: '48px', right: '16px', bottom: '56px', left: '16px' }
      }
    }
  });

  const heroContainer = add(homeElements, 'container', heroSection.id, {
    styles: {
      maxWidth: '920px',
      margin: { top: '0px', right: 'auto', bottom: '0px', left: 'auto' },
      textAlign: 'center',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }
  });

  // Release pill badge
  add(homeElements, 'paragraph', heroContainer.id, {
    name: 'Release Pill',
    props: {
      text: 'RELEASE 2.4 — Zero-runtime static HTML5 compiler is live →'
    },
    styles: {
      display: 'inline-block',
      backgroundColor: '#0f172a',
      color: '#38bdf8',
      fontSize: '13px',
      fontWeight: '600',
      letterSpacing: '0.04em',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#1e293b',
      borderRadius: '9999px',
      padding: { top: '6px', right: '16px', bottom: '6px', left: '16px' },
      margin: { top: '0px', right: '0px', bottom: '24px', left: '0px' }
    }
  });

  // Hero Heading (H1)
  add(homeElements, 'heading', heroContainer.id, {
    name: 'Hero Heading',
    props: {
      text: 'The Visual Workspace for High-Performance Web Apps',
      headingLevel: 1
    },
    styles: {
      fontSize: '52px',
      fontWeight: '800',
      lineHeight: '1.12',
      color: '#ffffff',
      textAlign: 'center',
      letterSpacing: '-0.02em',
      margin: { top: '0px', right: '0px', bottom: '20px', left: '0px' }
    },
    responsiveStyles: {
      tablet: { fontSize: '40px' },
      mobile: { fontSize: '28px', lineHeight: '1.2' }
    }
  });

  // Hero Subtitle
  add(homeElements, 'paragraph', heroContainer.id, {
    name: 'Hero Subtitle',
    props: {
      text: 'Build production layouts visually with deterministic CSS flexbox and grid rules. Zero proprietary runtimes, zero div soup, and zero lock-in. Compile directly to clean, semantic HTML5 and CSS.'
    },
    styles: {
      fontSize: '18px',
      lineHeight: '1.65',
      color: '#94a3b8',
      textAlign: 'center',
      maxWidth: '740px',
      margin: { top: '0px', right: 'auto', bottom: '36px', left: 'auto' }
    },
    responsiveStyles: {
      mobile: { fontSize: '15px', margin: { top: '0px', right: 'auto', bottom: '28px', left: 'auto' } }
    }
  });

  // Hero Action Buttons
  const heroActions = add(homeElements, 'container', heroContainer.id, {
    name: 'Hero Actions',
    styles: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '16px',
      flexWrap: 'wrap',
      margin: { top: '0px', right: '0px', bottom: '48px', left: '0px' }
    }
  });

  add(homeElements, 'button', heroActions.id, {
    name: 'Primary CTA Button',
    props: {
      text: 'Start Building — Free',
      href: '#features'
    },
    styles: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      padding: { top: '14px', right: '28px', bottom: '14px', left: '28px' },
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '15px',
      borderWidth: '0px'
    }
  });

  add(homeElements, 'button', heroActions.id, {
    name: 'Secondary CTA Button',
    props: {
      text: 'Architecture Specs →',
      href: '/about'
    },
    styles: {
      backgroundColor: 'rgba(255, 255, 255, 0.05)',
      color: '#e2e8f0',
      padding: { top: '14px', right: '28px', bottom: '14px', left: '28px' },
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '15px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#334155'
    }
  });

  // Hero Showcase Card (Inspector / Terminal Preview)
  const showcaseCard = add(homeElements, 'card', heroContainer.id, {
    name: 'Showcase Preview Card',
    styles: {
      backgroundColor: '#050811',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#1e293b',
      borderRadius: '12px',
      padding: { top: '20px', right: '24px', bottom: '20px', left: '24px' },
      width: '100%',
      maxWidth: '820px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      textAlign: 'left'
    }
  });

  const showcaseHeader = add(homeElements, 'container', showcaseCard.id, {
    name: 'Preview Top Bar',
    styles: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%'
    }
  });

  const dotGroup = add(homeElements, 'container', showcaseHeader.id, {
    name: 'Window Controls',
    styles: {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }
  });

  add(homeElements, 'shape', dotGroup.id, {
    props: { shapeType: 'circle' },
    styles: { width: '10px', height: '10px', backgroundColor: '#ef4444', borderRadius: '9999px' }
  });
  add(homeElements, 'shape', dotGroup.id, {
    props: { shapeType: 'circle' },
    styles: { width: '10px', height: '10px', backgroundColor: '#f59e0b', borderRadius: '9999px' }
  });
  add(homeElements, 'shape', dotGroup.id, {
    props: { shapeType: 'circle' },
    styles: { width: '10px', height: '10px', backgroundColor: '#10b981', borderRadius: '9999px' }
  });

  add(homeElements, 'paragraph', showcaseHeader.id, {
    name: 'Preview Filename',
    props: { text: 'dist/index.html — 100/100 Core Web Vitals' },
    styles: {
      color: '#64748b',
      fontSize: '12px',
      fontFamily: 'monospace',
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    }
  });

  add(homeElements, 'divider', showcaseCard.id, {
    styles: {
      width: '100%',
      height: '1px',
      backgroundColor: '#1e293b',
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    }
  });

  const showcaseGrid = add(homeElements, 'grid', showcaseCard.id, {
    name: 'Compiler Specs Grid',
    styles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
      width: '100%',
      margin: { top: '4px', right: '0px', bottom: '4px', left: '0px' }
    },
    responsiveStyles: {
      mobile: { gridTemplateColumns: '1fr', gap: '12px' }
    }
  });

  const previewStat1 = add(homeElements, 'card', showcaseGrid.id, {
    styles: {
      backgroundColor: '#0b1120',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#1e293b',
      borderRadius: '8px',
      padding: { top: '14px', right: '16px', bottom: '14px', left: '16px' }
    }
  });
  add(homeElements, 'heading', previewStat1.id, {
    props: { text: '0.00 KB Runtime', headingLevel: 4 },
    styles: { fontSize: '15px', color: '#10b981', fontWeight: '700', margin: { top: '0px', right: '0px', bottom: '4px', left: '0px' } }
  });
  add(homeElements, 'paragraph', previewStat1.id, {
    props: { text: 'Pure semantic HTML5 with zero client JavaScript bloat.' },
    styles: { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } }
  });

  const previewStat2 = add(homeElements, 'card', showcaseGrid.id, {
    styles: {
      backgroundColor: '#0b1120',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#1e293b',
      borderRadius: '8px',
      padding: { top: '14px', right: '16px', bottom: '14px', left: '16px' }
    }
  });
  add(homeElements, 'heading', previewStat2.id, {
    props: { text: '12ms Compile', headingLevel: 4 },
    styles: { fontSize: '15px', color: '#60a5fa', fontWeight: '700', margin: { top: '0px', right: '0px', bottom: '4px', left: '0px' } }
  });
  add(homeElements, 'paragraph', previewStat2.id, {
    props: { text: 'Instant client-side bundler and static ZIP packager.' },
    styles: { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } }
  });

  const previewStat3 = add(homeElements, 'card', showcaseGrid.id, {
    styles: {
      backgroundColor: '#0b1120',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#1e293b',
      borderRadius: '8px',
      padding: { top: '14px', right: '16px', bottom: '14px', left: '16px' }
    }
  });
  add(homeElements, 'heading', previewStat3.id, {
    props: { text: 'Deterministic CSS', headingLevel: 4 },
    styles: { fontSize: '15px', color: '#f59e0b', fontWeight: '700', margin: { top: '0px', right: '0px', bottom: '4px', left: '0px' } }
  });
  add(homeElements, 'paragraph', previewStat3.id, {
    props: { text: 'Standard CSS Grid & Flexbox rules with zero layout shift.' },
    styles: { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } }
  });

  // 1.3 Benchmarks & Proof Section
  const proofSection = add(homeElements, 'section', homeRootId, {
    name: 'Benchmarks Section',
    styles: {
      padding: { top: '64px', right: '24px', bottom: '64px', left: '24px' },
      backgroundColor: '#ffffff',
      borderWidth: '0 0 1px 0',
      borderStyle: 'solid',
      borderColor: '#e2e8f0'
    }
  });

  const proofContainer = add(homeElements, 'container', proofSection.id, {
    styles: { maxWidth: '1140px', margin: { top: '0px', right: 'auto', bottom: '0px', left: 'auto' } }
  });

  const proofGrid = add(homeElements, 'grid', proofContainer.id, {
    name: 'Benchmarks Grid',
    styles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '20px'
    },
    responsiveStyles: {
      tablet: { gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' },
      mobile: { gridTemplateColumns: '1fr', gap: '12px' }
    }
  });

  const metrics = [
    { value: '0 ms', color: '#0f172a', desc: 'Client runtime execution overhead. Zero blocking scripts.' },
    { value: '100 / 100', color: '#059669', desc: 'Target Lighthouse score for static production exports.' },
    { value: '100%', color: '#2563eb', desc: 'Code and asset ownership. Stored locally in your browser.' },
    { value: '1-Click', color: '#7c3aed', desc: 'Standalone ZIP archive generation ready for Git push.' }
  ];

  for (const m of metrics) {
    const mCard = add(homeElements, 'card', proofGrid.id, {
      styles: {
        backgroundColor: '#f8fafc',
        padding: { top: '24px', right: '20px', bottom: '24px', left: '20px' },
        borderRadius: '12px',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        textAlign: 'center'
      }
    });
    add(homeElements, 'heading', mCard.id, {
      props: { text: m.value, headingLevel: 3 },
      styles: { fontSize: '36px', fontWeight: '800', color: m.color, margin: { top: '0px', right: '0px', bottom: '6px', left: '0px' } }
    });
    add(homeElements, 'paragraph', mCard.id, {
      props: { text: m.desc },
      styles: { fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } }
    });
  }

  // 1.4 Bento Feature Grid Section
  const featSection = add(homeElements, 'section', homeRootId, {
    name: 'Features Section',
    styles: {
      padding: { top: '88px', right: '24px', bottom: '88px', left: '24px' },
      backgroundColor: '#f8fafc'
    },
    responsiveStyles: {
      mobile: { padding: { top: '56px', right: '16px', bottom: '56px', left: '16px' } }
    }
  });

  const featContainer = add(homeElements, 'container', featSection.id, {
    styles: { maxWidth: '1140px', margin: { top: '0px', right: 'auto', bottom: '0px', left: 'auto' } }
  });

  add(homeElements, 'heading', featContainer.id, {
    name: 'Features Heading',
    props: {
      text: 'Features Engineered for Code Quality and Control',
      headingLevel: 2
    },
    styles: {
      fontSize: '36px',
      fontWeight: '800',
      color: '#0f172a',
      textAlign: 'center',
      letterSpacing: '-0.02em',
      margin: { top: '0px', right: '0px', bottom: '14px', left: '0px' }
    },
    responsiveStyles: {
      mobile: { fontSize: '26px' }
    }
  });

  add(homeElements, 'paragraph', featContainer.id, {
    name: 'Features Subtitle',
    props: {
      text: 'Visual site building without the bloat. Every element you arrange compiles directly into clean, standards-compliant HTML5 and CSS.'
    },
    styles: {
      fontSize: '17px',
      lineHeight: '1.6',
      color: '#64748b',
      textAlign: 'center',
      maxWidth: '680px',
      margin: { top: '0px', right: 'auto', bottom: '52px', left: 'auto' }
    }
  });

  const featGrid = add(homeElements, 'grid', featContainer.id, {
    name: 'Bento Features Grid',
    styles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '24px'
    },
    responsiveStyles: {
      tablet: { gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px' },
      mobile: { gridTemplateColumns: '1fr', gap: '16px' }
    }
  });

  const featureCards = [
    {
      title: 'Deterministic CSS Layouts',
      desc: 'No absolute positioning spaghetti. Elements compile to native CSS Grid and Flexbox flow rules that adapt smoothly across all viewports.'
    },
    {
      title: 'Multi-Viewport Synchronization',
      desc: 'Seamlessly configure responsive overrides for Desktop (1200px), Tablet (768px), and Mobile (375px) with live visual verification.'
    },
    {
      title: 'Offline-First Engine',
      desc: 'All designs and changes auto-persist to LocalStorage with transactional recovery. Work without cloud lag or mandatory accounts.'
    },
    {
      title: 'Automated Asset Pipeline',
      desc: 'Embedded base64 graphics and background images are cleanly extracted to a dedicated assets/ folder during ZIP compilation.'
    },
    {
      title: 'Zero Vendor Lock-in',
      desc: 'Export a standalone ZIP containing vanilla HTML, CSS, and JS. Deploy anywhere from GitHub Pages and Netlify to an S3 bucket.'
    },
    {
      title: 'Accessible by Foundation',
      desc: 'Semantic headings, built-in ARIA landmarks, mobile touch targets (≥44px), and keyboard navigation support right out of the box.'
    }
  ];

  for (const f of featureCards) {
    const fCard = add(homeElements, 'card', featGrid.id, {
      styles: {
        backgroundColor: '#ffffff',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        borderRadius: '12px',
        padding: { top: '24px', right: '24px', bottom: '24px', left: '24px' },
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }
    });

    add(homeElements, 'heading', fCard.id, {
      props: { text: f.title, headingLevel: 3 },
      styles: { fontSize: '18px', fontWeight: '700', color: '#0f172a', margin: { top: '0px', right: '0px', bottom: '6px', left: '0px' } }
    });

    add(homeElements, 'paragraph', fCard.id, {
      props: { text: f.desc },
      styles: { fontSize: '14px', lineHeight: '1.6', color: '#64748b', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } }
    });
  }

  // 1.5 Architecture Philosophy Quote Section
  const quoteSection = add(homeElements, 'section', homeRootId, {
    name: 'Philosophy Section',
    styles: {
      padding: { top: '80px', right: '24px', bottom: '80px', left: '24px' },
      backgroundColor: '#ffffff',
      borderWidth: '1px 0 1px 0',
      borderStyle: 'solid',
      borderColor: '#e2e8f0'
    }
  });

  const quoteContainer = add(homeElements, 'container', quoteSection.id, {
    styles: { maxWidth: '820px', margin: { top: '0px', right: 'auto', bottom: '0px', left: 'auto' } }
  });

  const quoteCard = add(homeElements, 'card', quoteContainer.id, {
    name: 'Architecture Quote Card',
    styles: {
      backgroundColor: '#0f172a',
      color: '#ffffff',
      padding: { top: '40px', right: '36px', bottom: '40px', left: '36px' },
      borderRadius: '16px',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#1e293b',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)'
    }
  });

  add(homeElements, 'paragraph', quoteCard.id, {
    name: 'Philosophy Tag',
    props: { text: 'ARCHITECTURAL PRINCIPLE' },
    styles: { color: '#38bdf8', fontSize: '12px', fontWeight: '700', letterSpacing: '0.05em', margin: { top: '0px', right: '0px', bottom: '16px', left: '0px' } }
  });

  add(homeElements, 'heading', quoteCard.id, {
    name: 'Philosophy Statement',
    props: {
      text: '“Most modern visual builders ship megabytes of JavaScript before rendering a single word. Prism does the opposite: it compiles down to standard HTML and CSS that any engineer can maintain with pride.”',
      headingLevel: 3
    },
    styles: {
      fontSize: '22px',
      lineHeight: '1.55',
      fontWeight: '500',
      color: '#f8fafc',
      margin: { top: '0px', right: '0px', bottom: '24px', left: '0px' }
    },
    responsiveStyles: {
      mobile: { fontSize: '18px' }
    }
  });

  add(homeElements, 'divider', quoteCard.id, {
    styles: { width: '100%', height: '1px', backgroundColor: '#334155', margin: { top: '0px', right: '0px', bottom: '16px', left: '0px' } }
  });

  add(homeElements, 'paragraph', quoteCard.id, {
    props: { text: 'Elena Vance — Principal Frontend Architect, Edge Platform' },
    styles: { fontSize: '14px', color: '#94a3b8', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } }
  });

  // 1.6 Pre-Footer CTA Section
  const ctaSection = add(homeElements, 'section', homeRootId, {
    name: 'CTA Section',
    styles: {
      padding: { top: '80px', right: '24px', bottom: '80px', left: '24px' },
      backgroundColor: '#090d16',
      color: '#ffffff',
      textAlign: 'center',
      display: 'block'
    }
  });

  const ctaContainer = add(homeElements, 'container', ctaSection.id, {
    styles: {
      maxWidth: '680px',
      margin: { top: '0px', right: 'auto', bottom: '0px', left: 'auto' },
      textAlign: 'center'
    }
  });

  add(homeElements, 'heading', ctaContainer.id, {
    name: 'CTA Heading',
    props: { text: 'Craft and Ship With Precision', headingLevel: 2 },
    styles: { fontSize: '36px', fontWeight: '800', color: '#ffffff', margin: { top: '0px', right: '0px', bottom: '16px', left: '0px' } },
    responsiveStyles: { mobile: { fontSize: '26px' } }
  });

  add(homeElements, 'paragraph', ctaContainer.id, {
    name: 'CTA Subtitle',
    props: { text: 'Experience visual site construction without the typical framework bloat. Free, open source, and completely local.' },
    styles: { fontSize: '16px', lineHeight: '1.6', color: '#94a3b8', margin: { top: '0px', right: 'auto', bottom: '32px', left: 'auto' } }
  });

  add(homeElements, 'button', ctaContainer.id, {
    name: 'CTA Button',
    props: { text: 'Start Designing Now', href: '#features' },
    styles: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      padding: { top: '14px', right: '32px', bottom: '14px', left: '32px' },
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '600',
      borderWidth: '0px'
    }
  });

  // 1.7 Clean Multi-Column Footer
  const footerSection = add(homeElements, 'section', homeRootId, {
    name: 'Footer Section',
    styles: {
      padding: { top: '64px', right: '24px', bottom: '32px', left: '24px' },
      backgroundColor: '#050811',
      color: '#94a3b8',
      borderWidth: '1px 0 0 0',
      borderStyle: 'solid',
      borderColor: '#1e293b'
    }
  });

  const footerContainer = add(homeElements, 'container', footerSection.id, {
    styles: { maxWidth: '1140px', margin: { top: '0px', right: 'auto', bottom: '0px', left: 'auto' } }
  });

  const footerGrid = add(homeElements, 'grid', footerContainer.id, {
    name: 'Footer Links Grid',
    styles: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '32px',
      margin: { top: '0px', right: '0px', bottom: '40px', left: '0px' }
    },
    responsiveStyles: {
      tablet: { gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' },
      mobile: { gridTemplateColumns: '1fr', gap: '20px' }
    }
  });

  // Col 1: Brand info
  const footerCol1 = add(homeElements, 'container', footerGrid.id);
  add(homeElements, 'heading', footerCol1.id, {
    props: { text: 'Prism Engine', headingLevel: 4 },
    styles: { color: '#ffffff', fontSize: '16px', fontWeight: '700', margin: { top: '0px', right: '0px', bottom: '12px', left: '0px' } }
  });
  add(homeElements, 'paragraph', footerCol1.id, {
    props: { text: 'A visual workspace engineered for clean, semantic, and high-performance production exports.' },
    styles: { fontSize: '13px', lineHeight: '1.6', color: '#64748b', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } }
  });

  // Col 2: Product
  const footerCol2 = add(homeElements, 'container', footerGrid.id);
  add(homeElements, 'heading', footerCol2.id, {
    props: { text: 'Product', headingLevel: 4 },
    styles: { color: '#ffffff', fontSize: '14px', fontWeight: '600', margin: { top: '0px', right: '0px', bottom: '12px', left: '0px' } }
  });
  add(homeElements, 'list', footerCol2.id, {
    props: {
      listType: 'unordered',
      listItems: ['Visual Canvas', 'Multi-Viewport Sync', 'Asset Extractor', 'ZIP Packager']
    },
    styles: { fontSize: '13px', color: '#94a3b8', lineHeight: '2' }
  });

  // Col 3: Standards
  const footerCol3 = add(homeElements, 'container', footerGrid.id);
  add(homeElements, 'heading', footerCol3.id, {
    props: { text: 'Standards', headingLevel: 4 },
    styles: { color: '#ffffff', fontSize: '14px', fontWeight: '600', margin: { top: '0px', right: '0px', bottom: '12px', left: '0px' } }
  });
  add(homeElements, 'list', footerCol3.id, {
    props: {
      listType: 'unordered',
      listItems: ['Semantic HTML5', 'Vanilla CSS & Grid', 'WCAG 2.1 AA', 'Zero Runtime Overhead']
    },
    styles: { fontSize: '13px', color: '#94a3b8', lineHeight: '2' }
  });

  // Col 4: Documentation
  const footerCol4 = add(homeElements, 'container', footerGrid.id);
  add(homeElements, 'heading', footerCol4.id, {
    props: { text: 'Documentation', headingLevel: 4 },
    styles: { color: '#ffffff', fontSize: '14px', fontWeight: '600', margin: { top: '0px', right: '0px', bottom: '12px', left: '0px' } }
  });
  add(homeElements, 'list', footerCol4.id, {
    props: {
      listType: 'unordered',
      listItems: ['Architecture Manifesto', 'Local Storage Guide', 'Static Hosting Tips', 'MIT Open Source License']
    },
    styles: { fontSize: '13px', color: '#94a3b8', lineHeight: '2' }
  });

  add(homeElements, 'divider', footerContainer.id, {
    styles: { width: '100%', height: '1px', backgroundColor: '#1e293b', margin: { top: '0px', right: '0px', bottom: '24px', left: '0px' } }
  });

  add(homeElements, 'paragraph', footerContainer.id, {
    props: { text: '© 2026 Prism Engine. Distributed under the MIT License. Built with craftsmanship for the modern web.' },
    styles: { fontSize: '13px', color: '#475569', textAlign: 'center', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } }
  });

  // Assemble Home Page
  const homePage: Page = {
    id: generateId('page'),
    name: 'Home',
    slug: '/',
    isHome: true,
    title: 'Home — Prism Visual Web Engine',
    description: 'Prism is a precision visual web workspace engineered for clean, semantic, and high-performance production exports.',
    rootElementId: homeRootId,
    elements: homeElements
  };

  // ==========================================
  // 2. ABOUT / MANIFESTO PAGE
  // ==========================================
  const aboutPage = createBlankPage('About', '/about', false);
  const aboutRootId = aboutPage.rootElementId;
  const aboutElements = aboutPage.elements;

  // About Navbar
  add(aboutElements, 'navbar', aboutRootId, {
    props: {
      brandText: 'Prism',
      brandLink: '/',
      navLinks: [
        { id: 'an1', label: 'Home', href: '/' },
        { id: 'an2', label: 'Architecture', href: '/about' }
      ]
    },
    styles: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: { top: '16px', right: '32px', bottom: '16px', left: '32px' },
      backgroundColor: '#090d16',
      color: '#f8fafc',
      borderWidth: '0 0 1px 0',
      borderStyle: 'solid',
      borderColor: '#1e293b'
    }
  });

  // About Header Section
  const aboutHeaderSection = add(aboutElements, 'section', aboutRootId, {
    name: 'Manifesto Header',
    styles: {
      padding: { top: '72px', right: '24px', bottom: '72px', left: '24px' },
      backgroundColor: '#090d16',
      color: '#ffffff',
      textAlign: 'center'
    }
  });

  const aboutHeaderContainer = add(aboutElements, 'container', aboutHeaderSection.id, {
    styles: { maxWidth: '820px', margin: { top: '0px', right: 'auto', bottom: '0px', left: 'auto' } }
  });

  add(aboutElements, 'paragraph', aboutHeaderContainer.id, {
    name: 'Manifesto Badge',
    props: { text: 'CORE ARCHITECTURE SPECIFICATION' },
    styles: {
      display: 'inline-block',
      backgroundColor: '#0f172a',
      color: '#38bdf8',
      fontSize: '12px',
      fontWeight: '700',
      letterSpacing: '0.04em',
      borderWidth: '1px',
      borderStyle: 'solid',
      borderColor: '#1e293b',
      borderRadius: '9999px',
      padding: { top: '6px', right: '16px', bottom: '6px', left: '16px' },
      margin: { top: '0px', right: '0px', bottom: '20px', left: '0px' }
    }
  });

  add(aboutElements, 'heading', aboutHeaderContainer.id, {
    name: 'Manifesto Title',
    props: { text: 'The Architecture Manifesto', headingLevel: 1 },
    styles: {
      fontSize: '44px',
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: '-0.02em',
      margin: { top: '0px', right: '0px', bottom: '16px', left: '0px' }
    },
    responsiveStyles: {
      mobile: { fontSize: '30px' }
    }
  });

  add(aboutElements, 'paragraph', aboutHeaderContainer.id, {
    name: 'Manifesto Subtitle',
    props: {
      text: 'Why we created an offline-first visual editor that outputs pure, readable HTML5 and CSS with zero vendor lock-in.'
    },
    styles: {
      fontSize: '18px',
      color: '#94a3b8',
      lineHeight: '1.65',
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    }
  });

  // About Content Section
  const aboutContentSection = add(aboutElements, 'section', aboutRootId, {
    name: 'Principles Section',
    styles: {
      padding: { top: '72px', right: '24px', bottom: '80px', left: '24px' },
      backgroundColor: '#f8fafc'
    }
  });

  const aboutContentContainer = add(aboutElements, 'container', aboutContentSection.id, {
    styles: {
      maxWidth: '820px',
      margin: { top: '0px', right: 'auto', bottom: '0px', left: 'auto' },
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }
  });

  const principles = [
    {
      num: '1. Web Standards Over Proprietary Runtimes',
      desc: 'Most visual web builders lock your content into proprietary JSON trees that require heavy JavaScript runtimes to display. Prism does the opposite: the visual editor is simply a visual compiler for standard CSS Grid, Flexbox, and semantic HTML5 tags that any browser understands natively.'
    },
    {
      num: '2. Local-First & Zero Telemetry',
      desc: 'Your designs and project data live in your local browser storage. We do not require accounts, track your editing activity, or hold your project files hostage behind cloud subscription walls. You own 100% of your source code from day one.'
    },
    {
      num: '3. Deterministic Static Performance',
      desc: 'Websites exported with Prism achieve 100/100 Core Web Vitals scores because there is zero framework hydration cost, zero external tracking scripts, and zero render blocking. What you design compiles to deterministic, blazing fast static files.'
    }
  ];

  for (const p of principles) {
    const pCard = add(aboutElements, 'card', aboutContentContainer.id, {
      styles: {
        backgroundColor: '#ffffff',
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: '#e2e8f0',
        borderRadius: '12px',
        padding: { top: '28px', right: '28px', bottom: '28px', left: '28px' },
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.04)'
      }
    });

    add(aboutElements, 'heading', pCard.id, {
      props: { text: p.num, headingLevel: 3 },
      styles: { fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: { top: '0px', right: '0px', bottom: '10px', left: '0px' } }
    });

    add(aboutElements, 'paragraph', pCard.id, {
      props: { text: p.desc },
      styles: { fontSize: '15px', lineHeight: '1.65', color: '#475569', margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' } }
    });
  }

  add(aboutElements, 'spacer', aboutContentContainer.id, {
    styles: { width: '100%', height: '16px' }
  });

  add(aboutElements, 'button', aboutContentContainer.id, {
    name: 'Back to Canvas Button',
    props: { text: '← Back to Visual Canvas', href: '/' },
    styles: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      padding: { top: '14px', right: '28px', bottom: '14px', left: '28px' },
      borderRadius: '8px',
      fontWeight: '600',
      fontSize: '15px',
      display: 'inline-block'
    }
  });

  return {
    id: projId,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    schemaVersion: 1,
    settings: {
      siteTitle: 'Prism · Visual Web Engine',
      defaultFont: 'Inter, -apple-system, sans-serif',
      primaryColor: '#2563eb',
      customCss: ''
    },
    pages: [homePage, aboutPage],
    assets: []
  };
}
