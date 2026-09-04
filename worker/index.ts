import {
  applyTransportAction,
  newTransportState,
  normalizeTransportState,
  type TransportRecord,
  type TransportState,
} from '../lib/transport-state';
import { ApiError, queryNeon, type Query } from './neon';
import { createNormalizedTransportStorage } from './normalized-storage';
import { privateLinkSha256 } from './private-link-config';
import { privateKeyPattern } from '../lib/private-link';

type Env = { DATABASE_URL?: string; TRANSPORT_PASSWORD?: string };
function passwordStatus(password: string | undefined) {
  if (!password) return 'missing';
  if (password.length < 16) return 'too_short';
  if (password.length > 256) return 'too_long';
  return 'ready';
}
const encoder = new TextEncoder();
const allowedOrigins = new Set([
  'https://edwardd767.github.io',
  'http://localhost:3000',
]);
const expirySeconds = 12 * 60 * 60;
const recordId = 'hotel-paradise';
const rate = new Map<string, { until: number; attempts: number }>();

async function key(secret: string) {
  return crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}
async function matches(provided: string, secret: string) {
  const k = await key(secret);
  const signature = await crypto.subtle.sign(
    'HMAC',
    k,
    encoder.encode('password:' + provided),
  );
  return crypto.subtle.verify(
    'HMAC',
    k,
    signature,
    encoder.encode('password:' + secret),
  );
}
async function session(secret: string) {
  const payload = `v1.${Math.floor(Date.now() / 1000) + expirySeconds}.${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign(
    'HMAC',
    await key(secret),
    encoder.encode(payload),
  );
  const hex = Array.from(new Uint8Array(signature), (b) =>
    b.toString(16).padStart(2, '0'),
  ).join('');
  return payload + '.' + hex;
}
async function authenticated(request: Request, secret: string) {
  const token =
    request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  if (!/^v1\.\d{10}\.[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(token)) return false;
  const parts = token.split('.');
  const now = Math.floor(Date.now() / 1000);
  if (Number(parts[1]) <= now || Number(parts[1]) > now + expirySeconds + 30)
    return false;
  const signature = Uint8Array.from(parts[3].match(/../g)!, (value) =>
    parseInt(value, 16),
  );
  return crypto.subtle.verify(
    'HMAC',
    await key(secret),
    signature,
    encoder.encode(parts.slice(0, 3).join('.')),
  );
}
async function privateAccess(request: Request, verifier: string) {
  const token =
    request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
  if (!privateKeyPattern.test(token) || !/^[a-f0-9]{64}$/.test(verifier))
    return false;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  const hash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  return hash === verifier;
}
async function jsonBody(
  request: Request,
  limit: number,
): Promise<Record<string, unknown>> {
  if (
    !request.headers
      .get('Content-Type')
      ?.toLowerCase()
      .startsWith('application/json')
  )
    throw new ApiError('CONTENT_TYPE', 'Send JSON form data.', 415);
  if (Number(request.headers.get('Content-Length')) > limit)
    throw new ApiError('BODY_SIZE', 'The submitted form is too large.', 413);
  const reader = request.body?.getReader();
  if (!reader)
    throw new ApiError('INVALID_FORM', 'No form data was supplied.', 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new ApiError(
          'BODY_SIZE',
          'The submitted form is too large.',
          413,
        );
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== 'object' || Array.isArray(data))
      throw new Error();
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('INVALID_FORM', 'The submitted form is invalid.', 400);
  } finally {
    reader.releaseLock();
  }
}
function decode(row: string[]): TransportRecord {
  const revision = Number(row[0]);
  const state = JSON.parse(row[1]) as TransportState;
  if (
    !Number.isSafeInteger(revision) ||
    revision < 1 ||
    !state.setup ||
    !Array.isArray(state.trips) ||
    !Array.isArray(state.templates) ||
    !state.dayNotes
  )
    throw new ApiError(
      'STORAGE_FORMAT',
      'The saved data needs administrator attention.',
      503,
    );
  return { revision, state: normalizeTransportState(state) };
}

export function createWorker(
  query: Query = queryNeon,
  verifier = privateLinkSha256,
) {
  const storage = createNormalizedTransportStorage(query);
  return {
    async fetch(request: Request, env: Env): Promise<Response> {
      const origin = request.headers.get('Origin');
      const cors: Record<string, string> = {
        'Cache-Control': 'no-store',
        Vary: 'Origin',
      };
      if (origin && allowedOrigins.has(origin)) {
        cors['Access-Control-Allow-Origin'] = origin;
        cors['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
        cors['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
      }
      const reply = (body: unknown, status = 200) =>
        Response.json(body, { status, headers: cors });
      try {
        if (origin && !allowedOrigins.has(origin))
          throw new ApiError(
            'ORIGIN',
            'This website is not allowed to use this API.',
            403,
          );
        if (request.method === 'OPTIONS')
          return new Response(null, { status: 204, headers: cors });
        const path = new URL(request.url).pathname;
        if (request.method === 'GET' && (path === '/health' || path === '/')) {
          return reply({
            apiVersion: 3,
            diagnosticsVersion: 3,
            service: 'HotelX Transport API',
            status: 'ready',
            storageConfigured: Boolean(env.DATABASE_URL),
            storageModel: 'normalized-tables',
            storageSchemaVersion: 2,
            privateLinkConfigured: /^[a-f0-9]{64}$/.test(verifier),
            signInConfigured:
              passwordStatus(env.TRANSPORT_PASSWORD) === 'ready',
            signInStatus: passwordStatus(env.TRANSPORT_PASSWORD),
          });
        }
        if (!['/session', '/state', '/action'].includes(path))
          throw new ApiError('NOT_FOUND', 'Not found.', 404);
        if (!env.DATABASE_URL)
          throw new ApiError(
            'DATABASE_CONFIGURATION',
            'Save the DATABASE_URL Worker secret first.',
            503,
          );
        const secret = env.TRANSPORT_PASSWORD;
        const hasPrivateAccess = await privateAccess(request, verifier);
        if (path === '/session' && request.method === 'POST') {
          if (!secret || passwordStatus(secret) !== 'ready')
            throw new ApiError(
              'SIGN_IN_CONFIGURATION',
              'Password access is not configured.',
              503,
            );
          // Per-isolate throttling supplements a strong shared prototype password.
          const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
          const now = Date.now();
          const previous = rate.get(ip);
          const bucket =
            previous && previous.until > now
              ? previous
              : { until: now + 60000, attempts: 0 };
          if (bucket.attempts >= 10)
            throw new ApiError(
              'SIGN_IN_LIMIT',
              'Too many sign-in attempts. Try again in a minute.',
              429,
            );
          bucket.attempts++;
          rate.set(ip, bucket);
          if (rate.size > 4096) rate.delete(rate.keys().next().value!);
          const body = await jsonBody(request, 4096);
          if (
            typeof body.password !== 'string' ||
            body.password.length > 256 ||
            !(await matches(body.password, secret))
          )
            throw new ApiError(
              'SIGN_IN_FAILED',
              'The prototype password is incorrect.',
              401,
            );
          return reply({
            token: await session(secret),
            expiresIn: expirySeconds,
          });
        }
        if (
          !hasPrivateAccess &&
          !(secret && (await authenticated(request, secret)))
        )
          throw new ApiError(
            'SIGN_IN_REQUIRED',
            'Open your private access link to use the shared transport data.',
            401,
          );
        const connection = env.DATABASE_URL.trim();
        if (path === '/state' && request.method === 'GET') {
          const row = await storage.readOrInitialize(
            connection,
            recordId,
            newTransportState(),
          );
          return reply(decode(row));
        }
        if (path === '/action' && request.method === 'POST') {
          const body = await jsonBody(request, 256 * 1024);
          if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1)
            throw new ApiError(
              'REVISION',
              'Reload saved data before saving.',
              400,
            );
          const row = await storage.read(connection, recordId);
          if (!row)
            throw new ApiError(
              'RELOAD_REQUIRED',
              'Reload saved data before saving.',
              409,
            );
          const current = decode(row);
          if (current.revision !== body.revision)
            throw new ApiError(
              'CONFLICT',
              'Someone else saved changes. Reload saved data, review your form, then save again.',
              409,
            );
          let state: TransportState;
          try {
            state = applyTransportAction(current.state, body.action);
          } catch (error) {
            throw new ApiError('VALIDATION', (error as Error).message, 400);
          }
          const encoded = JSON.stringify(state);
          if (encoder.encode(encoded).byteLength > 16 * 1024 * 1024)
            throw new ApiError(
              'STORAGE_SIZE',
              'The prototype data has reached its size limit.',
              413,
            );
          const savedRevision = await storage.save(
            connection,
            recordId,
            current.revision,
            state,
          );
          if (!savedRevision)
            throw new ApiError(
              'CONFLICT',
              'Someone else saved changes. Reload saved data, review your form, then save again.',
              409,
            );
          return reply({ revision: savedRevision, state });
        }
        throw new ApiError('METHOD', 'This method is not supported.', 405);
      } catch (error) {
        if (error instanceof ApiError)
          return reply(
            { code: error.code, error: error.message },
            error.status,
          );
        return reply(
          {
            code: 'SERVER_ERROR',
            error:
              'The request could not finish. Reload saved data before retrying a change.',
          },
          500,
        );
      }
    },
  };
}
export default createWorker();
