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

  // Create starter Home page
  const homeRootId = generateId('root');
  const elements: Record<string, SiteElement> = {};

  const rootEl: SiteElement = {
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
  elements[homeRootId] = rootEl;

  // 1. Navbar
  const navEl = createElement('navbar', homeRootId, {
    props: {
      brandText: 'Apex Studio',
      brandLink: '/',
      navLinks: [
        { id: 'n1', label: 'Home', href: '/' },
        { id: 'n2', label: 'About', href: '/about' },
        { id: 'n3', label: 'Services', href: '#services' }
      ]
    }
  });
  elements[navEl.id] = navEl;
  rootEl.children.push(navEl.id);

  // 2. Hero Section
  const heroSection = createElement('section', homeRootId, {
    name: 'Hero Section',
    styles: {
      padding: { top: '80px', right: '24px', bottom: '80px', left: '24px' },
      backgroundColor: '#0f172a',
      color: '#f8fafc'
    }
  });
  elements[heroSection.id] = heroSection;
  rootEl.children.push(heroSection.id);

  const heroContainer = createElement('container', heroSection.id, {
    styles: {
      maxWidth: '860px',
      margin: { top: '0', right: 'auto', bottom: '0', left: 'auto' },
      textAlign: 'center'
    }
  });
  elements[heroContainer.id] = heroContainer;
  heroSection.children.push(heroContainer.id);

  const heroHeading = createElement('heading', heroContainer.id, {
    props: {
      text: 'Create Stunning Websites Visually',
      headingLevel: 1
    },
    styles: {
      fontSize: '48px',
      fontWeight: '800',
      lineHeight: '1.15',
      color: '#ffffff',
      textAlign: 'center',
      margin: { top: '0', right: '0', bottom: '20px', left: '0' }
    },
    responsiveStyles: {
      mobile: { fontSize: '32px' }
    }
  });
  elements[heroHeading.id] = heroHeading;
  heroContainer.children.push(heroHeading.id);

  const heroParagraph = createElement('paragraph', heroContainer.id, {
    props: {
      text: 'Empower your creativity with a lightning-fast visual drag-and-drop editor. Design responsive layouts, manage multiple pages, and export clean standalone code instantly.'
    },
    styles: {
      fontSize: '18px',
      lineHeight: '1.6',
      color: '#94a3b8',
      textAlign: 'center',
      margin: { top: '0', right: '0', bottom: '32px', left: '0' }
    }
  });
  elements[heroParagraph.id] = heroParagraph;
  heroContainer.children.push(heroParagraph.id);

  const heroButton = createElement('button', heroContainer.id, {
    props: {
      text: 'Explore Features',
      href: '#services'
    },
    styles: {
      backgroundColor: '#f59e0b',
      color: '#0f172a',
      padding: { top: '14px', right: '32px', bottom: '14px', left: '32px' },
      fontSize: '16px',
      fontWeight: '700',
      borderRadius: '8px'
    }
  });
  elements[heroButton.id] = heroButton;
  heroContainer.children.push(heroButton.id);

  // 3. Features Section
  const featSection = createElement('section', homeRootId, {
    name: 'Features Section',
    styles: {
      padding: { top: '80px', right: '24px', bottom: '80px', left: '24px' },
      backgroundColor: '#f8fafc'
    }
  });
  elements[featSection.id] = featSection;
  rootEl.children.push(featSection.id);

  const featContainer = createElement('container', featSection.id);
  elements[featContainer.id] = featContainer;
  featSection.children.push(featContainer.id);

  const featHeading = createElement('heading', featContainer.id, {
    props: { text: 'Everything You Need to Ship Faster', headingLevel: 2 },
    styles: { textAlign: 'center', color: '#0f172a', fontSize: '32px', margin: { top: '0', right: '0', bottom: '12px', left: '0' } }
  });
  elements[featHeading.id] = featHeading;
  featContainer.children.push(featHeading.id);

  const featSub = createElement('paragraph', featContainer.id, {
    props: { text: 'No complex setup or lock-in. Designed for creators who value craftsmanship and speed.' },
    styles: { textAlign: 'center', color: '#64748b', fontSize: '16px', margin: { top: '0', right: '0', bottom: '48px', left: '0' } }
  });
  elements[featSub.id] = featSub;
  featContainer.children.push(featSub.id);

  const gridEl = createElement('grid', featContainer.id);
  elements[gridEl.id] = gridEl;
  featContainer.children.push(gridEl.id);

  const cardData = [
    { title: 'Visual Precision', desc: 'Direct manipulation of layout, typography, borders, and spacing with instant live feedback.' },
    { title: 'Responsive by Nature', desc: 'Seamlessly switch between Desktop, Tablet, and Mobile viewports with custom overrides.' },
    { title: 'Zero Lock-in Export', desc: 'Download a standalone production ZIP containing semantic HTML, CSS, assets, and clean code.' }
  ];

  for (const c of cardData) {
    const cardEl = createElement('card', gridEl.id);
    elements[cardEl.id] = cardEl;
    gridEl.children.push(cardEl.id);

    const cHead = createElement('heading', cardEl.id, {
      props: { text: c.title, headingLevel: 3 },
      styles: { fontSize: '20px', fontWeight: '700', color: '#0f172a', margin: { top: '0', right: '0', bottom: '8px', left: '0' } }
    });
    elements[cHead.id] = cHead;
    cardEl.children.push(cHead.id);

    const cPara = createElement('paragraph', cardEl.id, {
      props: { text: c.desc },
      styles: { fontSize: '14px', lineHeight: '1.6', color: '#64748b', margin: { top: '0', right: '0', bottom: '0', left: '0' } }
    });
    elements[cPara.id] = cPara;
    cardEl.children.push(cPara.id);
  }

  // Home Page
  const homePage: Page = {
    id: generateId('page'),
    name: 'Home',
    slug: '/',
    isHome: true,
    title: 'Home — Apex Studio',
    description: 'Welcome to Apex Studio modern visual experience.',
    rootElementId: homeRootId,
    elements
  };

  // Create starter About page
  const aboutPage = createBlankPage('About', '/about', false);
  const aboutRoot = aboutPage.elements[aboutPage.rootElementId];
  
  const aboutNav = createElement('navbar', aboutPage.rootElementId, {
    props: {
      brandText: 'Apex Studio',
      brandLink: '/',
      navLinks: [
        { id: 'an1', label: 'Home', href: '/' },
        { id: 'an2', label: 'About', href: '/about' }
      ]
    }
  });
  aboutPage.elements[aboutNav.id] = aboutNav;
  aboutRoot.children.push(aboutNav.id);

  const aboutSection = createElement('section', aboutPage.rootElementId, {
    styles: { padding: { top: '60px', right: '24px', bottom: '60px', left: '24px' } }
  });
  aboutPage.elements[aboutSection.id] = aboutSection;
  aboutRoot.children.push(aboutSection.id);

  const aboutContainer = createElement('container', aboutSection.id, {
    styles: { maxWidth: '800px', margin: { top: '0', right: 'auto', bottom: '0', left: 'auto' } }
  });
  aboutPage.elements[aboutContainer.id] = aboutContainer;
  aboutSection.children.push(aboutContainer.id);

  const aboutHead = createElement('heading', aboutContainer.id, {
    props: { text: 'About Our Vision', headingLevel: 1 },
    styles: { fontSize: '36px', color: '#0f172a' }
  });
  aboutPage.elements[aboutHead.id] = aboutHead;
  aboutContainer.children.push(aboutHead.id);

  const aboutPara = createElement('paragraph', aboutContainer.id, {
    props: {
      text: 'We believe modern web design tools should be transparent, lightning fast, and grant users 100% ownership of their generated code.'
    }
  });
  aboutPage.elements[aboutPara.id] = aboutPara;
  aboutContainer.children.push(aboutPara.id);

  return {
    id: projId,
    name,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    schemaVersion: 1,
    settings: {
      siteTitle: 'Apex Studio',
      defaultFont: 'Inter, sans-serif',
      primaryColor: '#f59e0b',
      customCss: ''
    },
    pages: [homePage, aboutPage],
    assets: []
  };
}
