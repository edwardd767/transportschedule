import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';

const output = 'dist/worker/hotelx-transport-api.js';
const deployCopy = 'worker/hotelx-transport-api.deploy.js';

await build({
  entryPoints: ['worker/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: output,
  minify: false,
  banner: {
    js: '// HotelX Transport API. Paste the whole file into the Cloudflare Worker editor.\n// Required secret: DATABASE_URL. Private-link verifier is included; TRANSPORT_PASSWORD supports legacy sessions only.',
  },
});

await mkdir('worker', { recursive: true });
await copyFile(output, deployCopy);
console.log(`Worker ready: ${output}`);
console.log(`Cloudflare paste bundle refreshed: ${deployCopy}`);
