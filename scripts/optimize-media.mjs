/**
 * Optimiza los medios generados (assets-src/) hacia public/media/:
 *  - Imágenes → AVIF + WebP + JPEG en anchos [768, 1280, 1920] (sharp)
 *  - Video hero → MP4 (H.264) + WebM (VP9) 1080p sin audio (ffmpeg)
 *  - OG image 1200x630, favicons PNG y logo raster para schema.org
 *
 * Calidad primero: compresión perceptualmente transparente, nada de
 * degradar el material; solo códecs modernos y tamaños correctos.
 */
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'assets-src');
const IMG_OUT = path.join(ROOT, 'public', 'media', 'img');
const VID_OUT = path.join(ROOT, 'public', 'media', 'video');
const OG_OUT = path.join(ROOT, 'public', 'media', 'og');
const BRAND_OUT = path.join(ROOT, 'public', 'media', 'brand');

for (const d of [IMG_OUT, VID_OUT, OG_OUT, BRAND_OUT]) mkdirSync(d, { recursive: true });

const WIDTHS = [768, 1280, 1920];

async function processImage(file) {
  const name = path.basename(file, path.extname(file));
  const input = sharp(path.join(SRC, file)).rotate();

  for (const w of WIDTHS) {
    const base = path.join(IMG_OUT, `${name}-${w}`);
    const resized = input.clone().resize({ width: w, withoutEnlargement: true });
    await resized.clone().avif({ quality: 60, effort: 5 }).toFile(`${base}.avif`);
    await resized.clone().webp({ quality: 80 }).toFile(`${base}.webp`);
    await resized.clone().jpeg({ quality: 82, mozjpeg: true }).toFile(`${base}.jpg`);
  }
  console.log(`✔ img ${name} → 3 formatos × ${WIDTHS.length} anchos`);
}

async function makeOg() {
  // OG 1200x630: recorte cinematográfico del hero + barra de marca + pin.
  const hero = await sharp(path.join(SRC, 'hero-andes.jpg'))
    .resize(1200, 630, { fit: 'cover', position: 'attention' })
    .toBuffer();

  const overlay = Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="546" width="1200" height="84" fill="#ee7a18"/>
      <g transform="translate(48, 560) scale(0.95)">
        <path d="M24 2C12.4 2 3 11.4 3 23c0 8.7 5 16 11.9 22.7L24 58l9.1-12.3C40 39 45 31.7 45 23 45 11.4 35.6 2 24 2Z" fill="#1d130a"/>
        <circle cx="24" cy="22.5" r="8.5" fill="#ee7a18"/>
      </g>
    </svg>
  `);

  await sharp(hero).composite([{ input: overlay }]).jpeg({ quality: 85, mozjpeg: true }).toFile(path.join(OG_OUT, 'og-home.jpg'));
  console.log('✔ og-home.jpg (1200x630)');
}

async function makeBrand() {
  // Favicons y logo raster (pin) desde SVG con fondo transparente.
  const pin = (px, pad = 0) =>
    Buffer.from(`
    <svg width="${px}" height="${px}" viewBox="${-pad} ${-pad} ${48 + pad * 2} ${60 + pad * 2}" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 2C12.4 2 3 11.4 3 23c0 8.7 5 16 11.9 22.7L24 58l9.1-12.3C40 39 45 31.7 45 23 45 11.4 35.6 2 24 2Z" fill="#ee7a18"/>
      <circle cx="24" cy="22.5" r="8.5" fill="#1d130a"/>
    </svg>
  `);

  await sharp(pin(64)).resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(BRAND_OUT, 'favicon-32.png'));
  await sharp(pin(360, 6)).resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(BRAND_OUT, 'apple-touch-icon.png'));
  await sharp(pin(1024, 8)).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(path.join(BRAND_OUT, 'logo-512.png'));
  console.log('✔ favicons + logo raster');
}

function processVideo() {
  const src = path.join(SRC, 'hero.mp4');
  if (!existsSync(src)) {
    console.warn('⚠ assets-src/hero.mp4 no existe; se omite el video');
    return;
  }
  const mp4 = path.join(VID_OUT, 'hero-1080.mp4');
  const webm = path.join(VID_OUT, 'hero-1080.webm');

  // H.264: compatibilidad universal. CRF 21 = visualmente transparente.
  execFileSync('ffmpeg', [
    '-y', '-i', src,
    '-vf', "scale=1920:-2:flags=lanczos",
    '-c:v', 'libx264', '-crf', '21', '-preset', 'slow', '-profile:v', 'high',
    '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    mp4,
  ], { stdio: 'pipe' });
  console.log('✔ hero-1080.mp4');

  // VP9: mejor compresión para navegadores modernos.
  execFileSync('ffmpeg', [
    '-y', '-i', src,
    '-vf', "scale=1920:-2:flags=lanczos",
    '-c:v', 'libvpx-vp9', '-crf', '33', '-b:v', '0', '-row-mt', '1', '-an',
    webm,
  ], { stdio: 'pipe' });
  console.log('✔ hero-1080.webm');
}

const images = readdirSync(SRC).filter((f) => /\.(jpe?g|png)$/i.test(f));
for (const f of images) await processImage(f);
await makeOg();
await makeBrand();
processVideo();
console.log('Medios optimizados en public/media/.');
