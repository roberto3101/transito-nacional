/**
 * Genera las imágenes del sitio con fal.ai (FLUX dev).
 *
 * Dirección de arte unificada: toda pieza comparte la misma paleta
 * (naranja quemado + asfalto cálido + bruma andina al atardecer) para
 * que el sitio se sienta armónico en modo claro y oscuro.
 *
 * Uso:  node scripts/fal-images.mjs [--only=slug1,slug2]
 * Salida: assets-src/{slug}.jpg  (luego `npm run media:optimize`)
 *
 * Costo aprox: flux/dev ≈ $0.025 por megapíxel → ~8 imágenes ≈ $0.35.
 */
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const OUT = path.join(ROOT, 'assets-src');
mkdirSync(OUT, { recursive: true });

// ── FAL_KEY desde .env (sin dependencias) ──────────────────────────────
function loadKey() {
  const env = readFileSync(path.join(ROOT, '.env'), 'utf8');
  const m = env.match(/^FAL_KEY=(.+)$/m);
  if (!m) throw new Error('FAL_KEY no encontrada en .env');
  return m[1].trim();
}
const FAL_KEY = loadKey();

// ── Dirección de arte global ───────────────────────────────────────────
const STYLE =
  'cinematic editorial photography, dusk golden hour, burnt orange sky haze, ' +
  'warm charcoal asphalt tones, Andes mountains silhouette in background, ' +
  'volumetric light, subtle film grain, photorealistic, high detail, ' +
  'anamorphic wide composition, muted shadows, no text, no watermark, no logo';

const IMAGES = [
  {
    slug: 'hero-andes',
    w: 1920, h: 1088,
    prompt:
      'modern heavy cargo semi truck with loaded flatbed trailer driving along a winding Andean highway at dusk, ' +
      'headlights on, long empty asphalt road ahead curving through dark mountains, dramatic burnt-orange sunset haze, ' +
      STYLE,
  },
  {
    slug: 'svc-carga-pesada',
    w: 1472, h: 832,
    prompt:
      'low-boy lowbed trailer hauling a large yellow excavator up a mountain highway, heavy haul convoy, ' +
      'dusk light over the Andes, ' + STYLE,
  },
  {
    slug: 'svc-sobredimensionada',
    w: 1472, h: 832,
    prompt:
      'oversized industrial cargo secured on a multi-axle modular trailer with escort truck behind, wide load on ' +
      'a remote Andean road at dusk, scale and weight emphasized, ' + STYLE,
  },
  {
    slug: 'svc-refrigerada',
    w: 1472, h: 832,
    prompt:
      'white refrigerated cargo truck parked at a cold storage loading dock at night, cool blue light spilling from ' +
      'the open reefer doors contrasting with warm orange sodium lamps, light fog, ' + STYLE,
  },
  {
    slug: 'svc-almacen',
    w: 1472, h: 832,
    prompt:
      'vast modern logistics warehouse interior with tall loaded pallet racks, a forklift moving crates, warm shafts ' +
      'of dusk light entering through high windows, clean industrial atmosphere, ' + STYLE,
  },
  {
    slug: 'svc-aduanas',
    w: 1472, h: 832,
    prompt:
      'line of cargo trucks queued at a high-altitude Andean border checkpoint at dawn, mist over the valley, ' +
      'mountain pass, calm and orderly, ' + STYLE,
  },
  {
    slug: 'svc-monitoreo',
    w: 1472, h: 832,
    prompt:
      'aerial drone view of a serpentine mountain highway with cargo trucks tracing the curves, headlight trails, ' +
      'deep valleys, dusk orange horizon, ' + STYLE,
  },
  {
    slug: 'svc-verificacion',
    w: 1472, h: 832,
    prompt:
      'logistics inspector wearing hard hat and safety vest seen from behind, checking heavy strapped cargo on a ' +
      'flatbed trailer with a clipboard, warm industrial yard light at dusk, ' + STYLE,
  },
];

// ── Cliente de cola fal.run ────────────────────────────────────────────
async function submit(endpoint, body) {
  const res = await fetch(`https://queue.fal.run/${endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${endpoint} → HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function poll(statusUrl, responseUrl, timeoutMs = 180_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await (await fetch(statusUrl, { headers: { Authorization: `Key ${FAL_KEY}` } })).json();
    if (s.status === 'COMPLETED') {
      return (await fetch(responseUrl, { headers: { Authorization: `Key ${FAL_KEY}` } })).json();
    }
    if (s.status === 'FAILED' || s.error) throw new Error(`fal FAILED: ${JSON.stringify(s).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error('fal timeout');
}

async function generate(img) {
  const dest = path.join(OUT, `${img.slug}.jpg`);
  if (existsSync(dest)) {
    console.log(`↷ ${img.slug} ya existe, se omite`);
    return;
  }
  const body = {
    prompt: img.prompt,
    image_size: { width: img.w, height: img.h },
    num_inference_steps: 28,
    guidance_scale: 3.5,
    num_images: 1,
    enable_safety_checker: true,
    output_format: 'jpeg',
  };
  const q = await submit('fal-ai/flux/dev', body);
  const out = await poll(q.status_url, q.response_url);
  const url = out?.images?.[0]?.url;
  if (!url) throw new Error(`sin imagen para ${img.slug}: ${JSON.stringify(out).slice(0, 300)}`);
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`✔ ${img.slug} (${(buf.length / 1024).toFixed(0)} KB)`);
}

// ── Main: concurrencia limitada ────────────────────────────────────────
const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const queue = IMAGES.filter((i) => !only || only.includes(i.slug));
console.log(`Generando ${queue.length} imágenes con FLUX dev…`);

const CONCURRENCY = 3;
let failed = 0;
for (let i = 0; i < queue.length; i += CONCURRENCY) {
  const batch = queue.slice(i, i + CONCURRENCY);
  const results = await Promise.allSettled(batch.map(generate));
  for (const [j, r] of results.entries()) {
    if (r.status === 'rejected') {
      failed++;
      console.error(`✘ ${batch[j].slug}: ${r.reason.message}`);
    }
  }
}
console.log(failed ? `Terminado con ${failed} fallos.` : 'Todas las imágenes generadas.');
process.exit(failed ? 1 : 0);
