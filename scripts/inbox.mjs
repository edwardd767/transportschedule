import { readdir, readFile } from 'node:fs/promises';
import { statSync, existsSync, mkdirSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const INBOX = fileURLToPath(new URL('../inbox/', import.meta.url));

const TEXT_EXT = new Set([
  '.txt', '.md', '.markdown', '.svg', '.css', '.html', '.htm', '.json',
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.csv', '.xml', '.yml',
  '.yaml', '.sh', '.ps1', '.env', '.toml',
]);

const IMAGE_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif', '.ico',
]);

const DOC_EXT = new Set(['.pdf', '.docx', '.doc']);

const MAX_TEXT_BYTES = 256 * 1024;

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.isFile()) {
      files.push(full);
    }
  }
  return files;
}

function readImageMeta(buf) {
  if (buf.length < 24) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return {
      format: 'PNG',
      width: buf.readUInt32BE(16),
      height: buf.readUInt32BE(20),
    };
  }
  const sig = buf.toString('ascii', 0, 6);
  if (sig === 'GIF87a' || sig === 'GIF89a') {
    return { format: 'GIF', width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  }
  if (buf[0] === 0x42 && buf[1] === 0x4d) {
    return { format: 'BMP', width: buf.readInt32LE(18), height: Math.abs(buf.readInt32LE(22)) };
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = buf.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { format: 'JPEG', height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      }
      i += 2 + len;
    }
    return { format: 'JPEG', width: null, height: null };
  }
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    const kind = buf.toString('ascii', 12, 16);
    if (kind === 'VP8X' && buf.length >= 30) {
      return { format: 'WebP', width: buf.readUIntLE(24, 3) + 1, height: buf.readUIntLE(27, 3) + 1 };
    }
    if (kind === 'VP8 ' && buf.length >= 30) {
      return { format: 'WebP', width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
    }
    if (kind === 'VP8L' && buf.length >= 25) {
      const bits = buf.readUInt32LE(21);
      return { format: 'WebP', width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
    return { format: 'WebP', width: null, height: null };
  }
  return null;
}

function looksBinary(buf) {
  const limit = Math.min(buf.length, 8000);
  for (let i = 0; i < limit; i += 1) {
    if (buf[i] === 0) return true;
  }
  return false;
}

function fmtBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

async function loadOcr() {
  try {
    const mod = await import('tesseract.js');
    return mod.createWorker;
  } catch {
    return null;
  }
}

async function extractDocText(file) {
  try {
    const { extractText } = await import('mammoth');
    const result = await extractText({ path: file });
    return result.value;
  } catch {
    return null;
  }
}

async function main() {
  if (!existsSync(INBOX)) {
    console.log(`No inbox folder yet. Create it at: ${INBOX}`);
    process.exit(0);
  }
  const files = (await walk(INBOX)).sort();
  if (files.length === 0) {
    console.log('INBOX_EMPTY');
    return;
  }
  console.log(`INBOX: ${INBOX}`);
  console.log(`FILES: ${files.length}`);

  const createWorker = await loadOcr();
  let worker = null;
  if (createWorker) {
    try {
      const cachePath = join(tmpdir(), 'tesseract.js-cache');
      mkdirSync(cachePath, { recursive: true });
      worker = await createWorker('eng', 1, { logger: () => {}, cachePath });
    } catch {
      worker = null;
    }
  }

  console.log('='.repeat(80));
  for (const file of files) {
    const rel = relative(INBOX, file).split('\\').join('/');
    const size = statSync(file).size;
    const ext = extname(file).toLowerCase();
    console.log(`\n### ${rel}  [${fmtBytes(size)}]`);

    if (IMAGE_EXT.has(ext)) {
      const buf = await readFile(file);
      const meta = readImageMeta(buf);
      if (meta) {
        console.log(`  type: ${meta.format}  ${meta.width ?? '?'}x${meta.height ?? '?'}`);
      } else {
        console.log(`  type: image/${ext.slice(1)}  (dimensions unknown)`);
      }
      if (worker) {
        try {
          const { data } = await worker.recognize(file);
          const text = (data.text || '').trim();
          console.log('  OCR TEXT:');
          if (text) {
            for (const line of text.split('\n')) console.log(`    ${line}`);
          } else {
            console.log('    (no text detected)');
          }
        } catch (err) {
          console.log(`  (OCR failed: ${err.message})`);
        }
      } else {
        console.log('  (OCR not available: install tesseract.js)');
      }
      console.log('  NOTE: OCR reads only text; colors, layout and spacing still need a written description or SVG.');
      continue;
    }

    if (DOC_EXT.has(ext)) {
      const text = await extractDocText(file);
      if (text != null) {
        console.log(text.trim());
      } else {
        console.log(`  (cannot extract text from ${ext} — install "mammoth" for .docx or provide a text file)`);
      }
      continue;
    }

    if (!TEXT_EXT.has(ext)) {
      const buf = await readFile(file);
      if (looksBinary(buf)) {
        console.log('  (binary file, not shown)');
      } else {
        console.log('  (text file, unrecognized extension)');
        console.log(buf.toString('utf8'));
      }
      continue;
    }

    const buf = await readFile(file);
    if (buf.length > MAX_TEXT_BYTES) {
      console.log(`  (content truncated: ${fmtBytes(buf.length)} exceeds limit)`);
      console.log(buf.toString('utf8').slice(0, MAX_TEXT_BYTES));
      console.log('  ... TRUNCATED ...');
    } else {
      console.log(buf.toString('utf8'));
    }
  }

  if (worker) {
    try { await worker.terminate(); } catch {}
  }
  console.log('\n' + '='.repeat(80));
  console.log('END');
}

main().catch((err) => {
  console.error('inbox error:', err);
  process.exit(1);
});
