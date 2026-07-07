// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// TODO: cuando tengan dominio propio confirmado, verificar que coincida.
// El correo corporativo del documento CAN usa transitonacional.com.
const SITE = 'https://transitonacional.com';

export default defineConfig({
  site: SITE,
  trailingSlash: 'never',
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es-PE',
          en: 'en',
        },
      },
    }),
  ],
});
