# Tránsito Nacional — Sitio web

Transporte de carga pesada y logística integral en la Comunidad Andina (Perú → Ecuador → Colombia).
Sitio estático **SEO-first** construido con [Astro](https://astro.build), bilingüe ES/EN, modo claro/oscuro y medios generados con fal.ai.

## Comandos

| Comando | Acción |
| --- | --- |
| `npm install` | Instala dependencias (Node ≥ 18.17, probado en Node 20) |
| `npm run dev` | Servidor de desarrollo en `http://localhost:4321` |
| `npm run build` | Build de producción en `dist/` (29 páginas + sitemap) |
| `npm run preview` | Sirve el build localmente |
| `npm run media:images` | Regenera las imágenes con fal.ai (FLUX) → `assets-src/` |
| `npm run media:video` | Regenera el video del hero (Kling i2v) → `assets-src/` |
| `npm run media:optimize` | Optimiza medios → `public/media/` (AVIF/WebP/JPEG + MP4/WebM) |

Para los scripts de medios se necesita `.env` con `FAL_KEY` (ver `.env.example`). **Nunca subir `.env` al repo.**

## Estructura

```
src/
├── i18n/            es.json / en.json — TODO el texto del sitio
├── lib/             i18n.ts (helpers idioma) · seo.ts (JSON-LD)
├── styles/          global.css — design tokens (temas claro/oscuro)
├── layouts/         Base.astro — head SEO completo (canonical, hreflang, OG, JSON-LD)
├── components/      Header, Footer, Logo, Picture, WhatsAppFab + home/ + services/
├── content/blog/    artículos en Markdown (colección `blog`)
└── pages/           ES en raíz, EN bajo /en/
scripts/             fal-images · fal-video · optimize-media
public/media/        imágenes y video ya optimizados (generados por los scripts)
```

## SEO

- 1 landing por servicio (8 servicios × 2 idiomas) + blog + FAQ con schema.
- JSON-LD: Organization/LocalBusiness, WebSite, Service, FAQPage, BreadcrumbList, BlogPosting.
- `hreflang` es-PE/es/en/x-default; páginas solo-ES (blog) omiten `en` correctamente.
- Sitemap: `/sitemap-index.xml` (@astrojs/sitemap) + `robots.txt`.
- El dominio canónico vive en `astro.config.mjs` (`site`) y `src/lib/seo.ts` (`SITE`).
  **Actualizar ambos si cambia el dominio.**

## Deploy en Vercel

1. Subir el repo a GitHub (sin `.env`, ya está en `.gitignore`).
2. En Vercel: **Add New Project** → importar el repo. Framework: Astro (auto-detectado).
3. Build command `npm run build`, output `dist/` (defaults).
4. Al conectar el dominio propio, actualizar `site` en `astro.config.mjs` y `SITE` en `src/lib/seo.ts`, y redeploy.
5. Post-deploy: dar de alta el dominio en **Google Search Console** y enviar el sitemap.

## Pendientes de contenido (editar en `src/i18n/*.json`)

- `stats.items`: la cifra "+20 años de experiencia" es editable; ajustar al dato real.
- Dirección física y RUC cuando quieran mostrarse (footer + `orgNode` en `src/lib/seo.ts`).
- Añadir `sameAs` (redes sociales) en `src/lib/seo.ts` cuando existan perfiles.
