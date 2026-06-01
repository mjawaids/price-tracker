// Generates all favicon / PWA icon raster assets from the SVG sources in public/.
// Run with: node scripts/generate-icons.mjs
import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pub = join(root, 'public');

const standard = readFileSync(join(pub, 'favicon.svg'));
const maskable = readFileSync(join(pub, 'icon-maskable.svg'));

const render = (svg, size, out) =>
  sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(join(pub, out));

const jobs = [
  [standard, 16, 'favicon-16x16.png'],
  [standard, 32, 'favicon-32x32.png'],
  [standard, 48, 'favicon-48x48.png'],
  [standard, 180, 'apple-touch-icon.png'],
  [standard, 192, 'pwa-192x192.png'],
  [standard, 512, 'pwa-512x512.png'],
  [maskable, 192, 'maskable-192x192.png'],
  [maskable, 512, 'maskable-512x512.png'],
];

await Promise.all(jobs.map(([svg, size, out]) => render(svg, size, out)));

// Multi-resolution .ico (16/32/48) for legacy browsers.
const ico = await pngToIco([
  join(pub, 'favicon-16x16.png'),
  join(pub, 'favicon-32x32.png'),
  join(pub, 'favicon-48x48.png'),
]);
writeFileSync(join(pub, 'favicon.ico'), ico);

console.log('Icons generated in public/');
