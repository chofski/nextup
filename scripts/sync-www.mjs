import { cpSync, mkdirSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const www = join(root, 'www');

const files = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'css/fonts.css',
  'css/styles.css',
  'js/app.js',
  'js/scheduler.js',
  'js/storage.js',
  'assets/icons/icon.svg',
  'assets/icons/icon-192.png',
  'assets/icons/icon-512.png',
  'assets/icons/apple-touch-icon.png',
  'assets/fonts/figtree-latin-400-normal.woff2',
  'assets/fonts/figtree-latin-500-normal.woff2',
  'assets/fonts/figtree-latin-600-normal.woff2',
  'assets/fonts/figtree-latin-700-normal.woff2',
  'assets/fonts/syne-latin-600-normal.woff2',
  'assets/fonts/syne-latin-700-normal.woff2',
  'assets/fonts/syne-latin-800-normal.woff2',
];

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });

for (const rel of files) {
  const from = join(root, rel);
  const to = join(www, rel);
  if (!existsSync(from)) {
    console.warn(`skip missing ${rel}`);
    continue;
  }
  mkdirSync(join(to, '..'), { recursive: true });
  cpSync(from, to);
}

// Capacitor apps don't need the service worker register noise, but keeping it is fine.
// Add a tiny marker so it's obvious www is generated.
writeFileSync(
  join(www, '.generated'),
  `Synced from repo root at ${new Date().toISOString()}\n`
);

console.log(`Synced ${files.length} assets → www/`);
