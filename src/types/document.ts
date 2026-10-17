export type ElementType =
  | 'section'
  | 'container'
  | 'grid'
  | 'card'
  | 'heading'
  | 'paragraph'
  | 'button'
  | 'image'
  | 'link'
  | 'divider'
  | 'spacer'
  | 'shape'
  | 'list'
  | 'navbar'
  | 'auth';

export type Viewport = 'desktop' | 'tablet' | 'mobile';

export interface Spacing {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface ElementStyles {
  // Typography
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
  lineHeight?: string;
  letterSpacing?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  textDecoration?: 'none' | 'underline' | 'line-through';

  // Layout & Display
  display?: 'block' | 'flex' | 'grid' | 'inline-block' | 'none';
  flexDirection?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
  flexWrap?: 'nowrap' | 'wrap';
  gap?: string;
  gridTemplateColumns?: string;

  // Free Positioning & Movement
  position?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  zIndex?: number;
  transform?: string;

  // Box Sizing
  width?: string;
  maxWidth?: string;
  minWidth?: string;
  height?: string;
  maxHeight?: string;
  minHeight?: string;

  // Spacing
  padding?: Partial<Spacing>;
  margin?: Partial<Spacing>;

  // Backgrounds & Visuals
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: 'cover' | 'contain' | 'auto';
  backgroundPosition?: string;
  opacity?: number;
  overflow?: 'visible' | 'hidden' | 'scroll' | 'auto';

  // Borders
  borderWidth?: string;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderColor?: string;
  borderRadius?: string;

  // Shadow
  boxShadow?: string;
}

export interface ElementProps {
  text?: string;
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  href?: string;
  target?: '_self' | '_blank';
  src?: string;
  alt?: string;
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  shapeType?: 'rectangle' | 'circle' | 'pill';
  listType?: 'unordered' | 'ordered';
  listItems?: string[];
  brandText?: string;
  brandLink?: string;
  navLinks?: Array<{ id: string; label: string; href: string }>;
  customClass?: string;

  // Firebase Auth Form props
  authMode?: 'login' | 'signup' | 'both';
  enableGoogleAuth?: boolean;
  authTitle?: string;
  authSubtitle?: string;
  authRedirect?: string;
}

export interface SiteElement {
  id: string;
  type: ElementType;
  name: string;
  parentId: string | null;
  children: string[];
  props: ElementProps;
  styles: ElementStyles;
  responsiveStyles: {
    tablet?: Partial<ElementStyles>;
    mobile?: Partial<ElementStyles>;
  };
}

export interface Page {
  id: string;
  name: string;
  slug: string; // e.g. "/" or "/about" or "/contact"
  isHome: boolean;
  title: string;
  description: string;
  rootElementId: string;
  elements: Record<string, SiteElement>;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  enabled: boolean;
}

export interface ProjectSettings {
  siteTitle: string;
  favicon?: string;
  defaultFont: string;
  primaryColor: string;
  customCss?: string;
  firebaseConfig?: FirebaseConfig;
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  createdAt: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  schemaVersion: number;
  settings: ProjectSettings;
  pages: Page[];
  assets: Asset[];
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pagesCount: number;
  elementsCount: number;
}
