/**
 * Constructores de JSON-LD (schema.org) para el SEO estructurado del sitio.
 * Cada página emite un grafo con Organization + WebSite y sus nodos propios
 * (Service, FAQPage, BreadcrumbList, BlogPosting) según corresponda.
 */
import type { Dict, Lang } from './i18n';

export const SITE = 'https://transitonacional.com';

const ORG_ID = `${SITE}/#organization`;
const SITE_ID = `${SITE}/#website`;

export function orgNode(d: Dict) {
  return {
    '@type': ['Organization', 'LocalBusiness'],
    '@id': ORG_ID,
    name: d.brand.name,
    legalName: d.brand.legalName,
    url: SITE,
    logo: `${SITE}/media/brand/logo-512.png`,
    image: `${SITE}/media/og/og-home.jpg`,
    email: d.brand.email,
    telephone: d.brand.phone,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Lima',
      addressCountry: 'PE',
    },
    areaServed: [
      { '@type': 'Country', name: 'Peru' },
      { '@type': 'Country', name: 'Ecuador' },
      { '@type': 'Country', name: 'Colombia' },
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'sales',
      telephone: d.brand.phone,
      email: d.brand.email,
      availableLanguage: ['es', 'en'],
    },
    slogan: d.brand.tagline,
  };
}

export function websiteNode(d: Dict, lang: Lang) {
  return {
    '@type': 'WebSite',
    '@id': SITE_ID,
    url: SITE,
    name: d.brand.name,
    inLanguage: lang === 'es' ? 'es-PE' : 'en',
    publisher: { '@id': ORG_ID },
  };
}

export function serviceNode(opts: { name: string; description: string; url: string }) {
  return {
    '@type': 'Service',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    provider: { '@id': ORG_ID },
    areaServed: [
      { '@type': 'Country', name: 'Peru' },
      { '@type': 'Country', name: 'Ecuador' },
      { '@type': 'Country', name: 'Colombia' },
    ],
  };
}

export function faqNode(items: { q: string; a: string }[]) {
  return {
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

export function breadcrumbNode(items: { name: string; url: string }[]) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function blogPostingNode(opts: {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  image?: string;
}) {
  return {
    '@type': 'BlogPosting',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    datePublished: opts.datePublished,
    dateModified: opts.datePublished,
    image: opts.image ?? `${SITE}/media/og/og-home.jpg`,
    author: { '@id': ORG_ID },
    publisher: { '@id': ORG_ID },
    mainEntityOfPage: opts.url,
  };
}

/** Envuelve nodos en un grafo JSON-LD listo para <script type="application/ld+json"> */
export function graph(...nodes: object[]) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': nodes });
}
