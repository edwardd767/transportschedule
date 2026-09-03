import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(process.execPath, ['node_modules/vinext/dist/cli.js', 'build'], {
  cwd: root,
  env: { ...process.env, HOTELX_GITHUB_PAGES: 'true' },
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

const output = new URL('../dist/client/', import.meta.url);
const html = readFileSync(new URL('index.html', output), 'utf8');
if (!html.includes('Booking Listing') || !html.includes('/transportschedule/')) {
  throw new Error('GitHub Pages export is missing the app or its repository asset prefix.');
}
// Vinext emits assetPrefix directories physically. GitHub already mounts this
// artifact at /transportschedule, so stage those assets once at the artifact root.
const pages = new URL('../dist/pages/', import.meta.url);
mkdirSync(pages, { recursive: true });
cpSync(new URL('transportschedule/_next/', output), new URL('_next/', pages), { recursive: true });
for (const file of ['index.html', 'index.rsc', 'favicon.svg']) {
  cpSync(new URL(file, output), new URL(file, pages));
}
writeFileSync(new URL('.nojekyll', pages), '');
const assetUrls = [...html.matchAll(/(?:src|href)="(\/transportschedule\/[^"?#]+)"/g)];
for (const [, assetUrl] of assetUrls) {
  if (!existsSync(new URL(assetUrl.slice('/transportschedule/'.length), pages))) {
    throw new Error(`Missing GitHub Pages asset: ${assetUrl}`);
  }
}
console.log(`GitHub Pages export is ready in dist/pages (${assetUrls.length} asset references verified).`);
