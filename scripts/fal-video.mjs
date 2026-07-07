/**
 * Genera el video del hero animando la imagen hero-andes.jpg (image-to-video).
 * Así el video y el resto de imágenes comparten exactamente la misma
 * dirección de arte: mismo camión, misma luz, misma paleta.
 *
 * Uso:  node scripts/fal-video.mjs
 * Salida: assets-src/hero.mp4  (luego `npm run media:optimize`)
 *
 * Costo aprox: Kling 2.1 standard ≈ $0.25 por 5 s.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'assets-src', 'hero-andes.jpg');
const DEST = path.join(ROOT, 'assets-src', 'hero.mp4');

const FAL_KEY = readFileSync(path.join(ROOT, '.env'), 'utf8').match(/^FAL_KEY=(.+)$/m)[1].trim();

if (existsSync(DEST)) {
  console.log('↷ hero.mp4 ya existe, se omite. Borra el archivo para regenerar.');
  process.exit(0);
}

const PROMPT =
  'Slow cinematic dolly forward following the cargo truck along the mountain highway, ' +
  'gentle continuous motion, headlights glowing, orange dusk haze drifting slowly over the Andes, ' +
  'subtle camera drift, photorealistic, smooth and steady, no cuts';

// Endpoints en orden de preferencia (si uno falla, prueba el siguiente)
const ENDPOINTS = [
  { id: 'fal-ai/kling-video/v2.1/standard/image-to-video', body: (img) => ({ prompt: PROMPT, image_url: img, duration: '5', cfg_scale: 0.5 }) },
  { id: 'fal-ai/kling-video/v2.5-turbo/standard/image-to-video', body: (img) => ({ prompt: PROMPT, image_url: img, duration: '5' }) },
  { id: 'fal-ai/wan/v2.6/image-to-video', body: (img) => ({ prompt: PROMPT, image_url: img, resolution: '1080p', num_frames: 81 }) },
];

const H = { Authorization: `Key ${FAL_KEY}`, 'Content-Type': 'application/json' };

async function poll(statusUrl, responseUrl, timeoutMs = 420_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const s = await (await fetch(statusUrl, { headers: H })).json();
    if (s.status === 'COMPLETED') return (await fetch(responseUrl, { headers: H })).json();
    if (s.status === 'FAILED' || s.error) throw new Error(`FAILED: ${JSON.stringify(s).slice(0, 300)}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('timeout');
}

const imgB64 = `data:image/jpeg;base64,${readFileSync(SRC).toString('base64')}`;
let done = false;

for (const ep of ENDPOINTS) {
  try {
    console.log(`→ Intentando ${ep.id}…`);
    const res = await fetch(`https://queue.fal.run/${ep.id}`, { method: 'POST', headers: H, body: JSON.stringify(ep.body(imgB64)) });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const q = await res.json();
    const out = await poll(q.status_url, q.response_url);
    const url = out?.video?.url ?? out?.video_url ?? out?.videos?.[0]?.url;
    if (!url) throw new Error(`sin video en respuesta: ${JSON.stringify(out).slice(0, 300)}`);
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    writeFileSync(DEST, buf);
    console.log(`✔ hero.mp4 (${(buf.length / 1024 / 1024).toFixed(1)} MB) vía ${ep.id}`);
    done = true;
    break;
  } catch (e) {
    console.error(`✘ ${ep.id}: ${e.message}`);
  }
}
process.exit(done ? 0 : 1);
