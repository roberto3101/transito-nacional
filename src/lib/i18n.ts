import es from '../i18n/es.json';
import en from '../i18n/en.json';

export type Lang = 'es' | 'en';
export type Dict = typeof es;

const dicts: Record<Lang, Dict> = {
  es,
  en: en as unknown as Dict,
};

export function useDict(lang: Lang): Dict {
  return dicts[lang];
}

/** Prefijo de ruta según idioma: ES vive en la raíz, EN bajo /en */
export function langBase(lang: Lang): string {
  return lang === 'es' ? '' : '/en';
}

/** Ruta localizada, ej. p('es','/contacto') → '/contacto'; p('en','/contact') → '/en/contact' */
export function p(lang: Lang, path: string): string {
  const base = langBase(lang);
  if (path === '/') return base || '/';
  return `${base}${path}`;
}

export interface ServiceItem {
  slug: string;
  name: string;
  card: string;
  image: string;
  imageAlt: string;
  meta: { title: string; description: string };
  h1: string;
  lead: string;
  includesTitle: string;
  includes: string[];
  body: string[];
  faq: { q: string; a: string }[];
  /** slug del idioma alterno (enSlug en es.json, esSlug en en.json) */
  enSlug?: string;
  esSlug?: string;
}

export function services(lang: Lang): ServiceItem[] {
  return useDict(lang).services.items as unknown as ServiceItem[];
}

/** Slug equivalente del servicio en el otro idioma (para hreflang). */
export function altServiceSlug(item: ServiceItem, lang: Lang): string {
  return (lang === 'es' ? item.enSlug : item.esSlug) ?? item.slug;
}

/** Rutas de páginas estáticas equivalentes entre idiomas (para hreflang y el switcher). */
export const pageMap: Record<string, { es: string; en: string }> = {
  home: { es: '/', en: '/en' },
  services: { es: '/servicios', en: '/en/services' },
  about: { es: '/nosotros', en: '/en/about' },
  contact: { es: '/contacto', en: '/en/contact' },
  blog: { es: '/blog', en: '/en' }, // blog solo en ES por ahora: EN apunta al home
};

export function whatsappHref(lang: Lang, custom?: string): string {
  const d = useDict(lang);
  const msg = encodeURIComponent(custom ?? d.brand.whatsappMsg);
  return `https://wa.me/${d.brand.whatsapp}?text=${msg}`;
}
