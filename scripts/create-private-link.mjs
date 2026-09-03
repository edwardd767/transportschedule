import { randomBytes, createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const folder = new URL('../outputs/private-access/', import.meta.url);
await mkdir(folder, { recursive: true });
const privateFile = new URL('hotelx-private-access.json', folder);
let existing;
try {
  existing = JSON.parse(await readFile(privateFile, 'utf8'));
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
if (existing && !process.argv.includes('--rotate')) {
  console.log(
    'A private link already exists in outputs/private-access. Use --rotate only to deliberately replace it.',
  );
  process.exit(0);
}
const token = 'hx_link_v1_' + randomBytes(32).toString('base64url');
const url = 'https://edwardd767.github.io/transportschedule/#access=' + token;
const sha256 = createHash('sha256').update(token).digest('hex');
await writeFile(
  privateFile,
  JSON.stringify({ url, token, createdAt: new Date().toISOString() }, null, 2) +
    '\n',
  { mode: 0o600 },
);
await writeFile(
  new URL('HotelX Private Access.html', folder),
  '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><title>HotelX private access</title><style>body{font:16px system-ui;max-width:620px;margin:12vh auto;padding:24px;line-height:1.6;color:#252525}a{display:inline-block;background:#f39800;color:#111;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600}</style><h1>HotelX Transport Schedule</h1><p>Your private link opens the shared schedule automatically.</p><p><a href="' +
    url +
    '" rel="noreferrer">Open HotelX</a></p><p>Bookmark the page after opening it. Anyone with this link can view and edit the shared transport data.</p></html>',
  { mode: 0o600 },
);
await writeFile(
  new URL('../worker/private-link-config.ts', import.meta.url),
  '// Public verifier only. The private access key is never committed.\n// Rotate with node scripts/create-private-link.mjs --rotate, then rebuild and deploy the Worker.\nexport const privateLinkSha256 = ' +
    JSON.stringify(sha256) +
    ';\n',
);
console.log(
  'Private link saved locally in outputs/private-access/HotelX Private Access.html. Only its SHA-256 verifier was written to worker/private-link-config.ts.',
);
