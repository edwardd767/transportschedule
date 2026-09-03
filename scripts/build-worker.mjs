import { build } from 'esbuild';
await build({
  entryPoints: ['worker/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/worker/hotelx-transport-api.js',
  minify: false,
  banner: {
    js: '// HotelX Transport API. Paste the whole file into the Cloudflare Worker editor.\n// Required secret: DATABASE_URL. Private-link verifier is included; TRANSPORT_PASSWORD supports legacy sessions only.',
  },
});
console.log('Worker ready: dist/worker/hotelx-transport-api.js');
