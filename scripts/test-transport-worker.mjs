import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

async function bundle(entry) {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'es2022',
    write: false,
  });
  return import(
    'data:text/javascript;base64,' +
      Buffer.from(result.outputFiles[0].text).toString('base64')
  );
}
const { createWorker } = await bundle('worker/index.ts');
const { queryNeon } = await bundle('worker/neon.ts');
const { privateAccessFromHash } = await bundle('lib/private-link.ts');
const privateToken = 'hx_link_v1_' + 'A'.repeat(43);
const verifier = createHash('sha256').update(privateToken).digest('hex');
assert.deepEqual(privateAccessFromHash(''), { present: false, token: '' });
assert.deepEqual(privateAccessFromHash('#schedule'), {
  present: false,
  token: '',
});
assert.deepEqual(privateAccessFromHash('#access=' + privateToken), {
  present: true,
  token: privateToken,
});
for (const hash of [
  '#access=',
  '#access=bad',
  '#access=' + privateToken + '&access=' + privateToken,
  '#access=' + privateToken + 'A',
]) {
  assert.deepEqual(privateAccessFromHash(hash), { present: true, token: '' });
}
const secret = 'test-only-prototype-password-9238';
const env = {
  DATABASE_URL:
    'postgresql://test:fixture@ep-fixture.ap-southeast-1.aws.neon.tech/neondb',
  TRANSPORT_PASSWORD: secret,
};
let stored,
  legacyStored,
  reads = 0,
  writes = 0,
  inserts = 0;
let synchronizeReads = false,
  waiting = [];
async function query(_connection, sql, params) {
  if (sql.startsWith('DO $hotelx_schema$')) {
    assert.ok(sql.includes('ALTER TABLE public.hotelx_bookings'));
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.hotelx_transport_save'));
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.hotelx_transport_replace_rows'));
    assert.ok(sql.includes('CREATE OR REPLACE FUNCTION public.hotelx_transport_read'));
    return [];
  }
  if (/^(?:CREATE (?:TABLE|INDEX|OR REPLACE FUNCTION)|ALTER TABLE)/.test(sql)) return [];
  if (sql.includes('/* normalized-booking-extras-read */')) return [];
  if (sql.includes('/* normalized-read */')) {
    reads++;
    const result = stored
      ? [[String(stored.revision), JSON.stringify(stored.state)]]
      : [];
    if (synchronizeReads)
      await new Promise((resolve) => {
        waiting.push(resolve);
        if (waiting.length === 2) {
          synchronizeReads = false;
          waiting.splice(0).forEach((done) => done());
        }
      });
    return result;
  }
  if (sql.includes('/* normalized-legacy-exists */'))
    return [[legacyStored ? 'public.hotelx_transport_state' : '']];
  if (sql.includes('/* normalized-legacy-read */'))
    return legacyStored
      ? [[String(legacyStored.revision), JSON.stringify(legacyStored.state)]]
      : [];
  if (sql.includes('/* normalized-initialize */')) {
    if (stored) return [[null]];
    inserts++;
    stored = { revision: Number(params[1]), state: JSON.parse(params[2]) };
    return [[String(stored.revision)]];
  }
  if (sql.includes('/* normalized-save */')) {
    assert.match(
      sql,
      /^\/\* normalized-save \*\/ SELECT/,
      'save must use one database routine without updating rewritten rows again',
    );
    if (!stored || stored.revision !== Number(params[1])) return [[null]];
    writes++;
    stored = {
      revision: stored.revision + 1,
      state: JSON.parse(params[2]),
    };
    return [[String(stored.revision)]];
  }
  throw new Error('Unexpected mock SQL: ' + sql.slice(0, 80));
}
const worker = createWorker(query, verifier);
let ip = 1;
async function call(
  path,
  {
    body,
    token,
    origin = 'https://edwardd767.github.io',
    method = body === undefined ? 'GET' : 'POST',
    environment = env,
    service = worker,
  } = {},
) {
  const response = await service.fetch(
    new Request('https://worker.example' + path, {
      method,
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '192.0.2.' + ip++,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    environment,
  );
  return {
    response,
    status: response.status,
    data: response.status === 204 ? null : await response.json(),
  };
}
assert.equal((await call('/health')).data.apiVersion, 4);
assert.equal((await call('/health')).data.storageModel, 'normalized-tables');
assert.equal((await call('/health')).data.storageSchemaVersion, 2);
assert.equal((await call('/health')).data.hotelMasterSchemaVersion, 1);
assert.equal((await call('/health')).data.rateSetupSchemaVersion, 1);
assert.equal((await call('/health')).data.privateLinkConfigured, true);
for (const [password, status] of [
  [undefined, 'missing'],
  ['', 'missing'],
  ['a'.repeat(15), 'too_short'],
  ['a'.repeat(16), 'ready'],
  ['a'.repeat(256), 'ready'],
  ['a'.repeat(257), 'too_long'],
]) {
  const environment = { ...env, TRANSPORT_PASSWORD: password };
  const health = await call('/health', { environment });
  assert.equal(health.data.diagnosticsVersion, 4);
  assert.equal(health.data.signInStatus, status);
  assert.equal(health.data.signInConfigured, status === 'ready');
  if (password)
    assert.ok(
      !JSON.stringify(health.data).includes(password),
      'health must not reveal the password',
    );
  const session = await call('/session', { environment, body: { password } });
  assert.equal(
    session.status,
    status === 'ready' ? 200 : 503,
    'health and sign-in use the same configuration rules',
  );
}
assert.equal(reads, 0, 'health does not wake the database');
assert.equal((await call('/state')).status, 401);
assert.equal((await call('/action', { body: {} })).status, 401);
assert.equal(reads, 0, 'unauthenticated requests never touch the database');
assert.equal(
  (await call('/session', { body: { password: 'incorrect' } })).status,
  401,
);
const login = await call('/session', { body: { password: secret } });
assert.equal(login.status, 200);
let token = login.data.token;
assert.equal(
  (
    await call('/state', {
      token: token.slice(0, -1) + (token.endsWith('0') ? '1' : '0'),
    })
  ).status,
  401,
);
const expired = token.split('.');
expired[1] = '1000000000';
assert.equal((await call('/state', { token: expired.join('.') })).status, 401);
assert.equal(
  (
    await call('/state', {
      token,
      environment: {
        ...env,
        TRANSPORT_PASSWORD: 'rotated-prototype-password-23',
      },
    })
  ).status,
  401,
);
assert.equal(
  (await call('/state', { token, origin: 'https://untrusted.example' })).status,
  403,
);
const preflight = await call('/state', { method: 'OPTIONS' });
assert.equal(preflight.status, 204);
assert.equal(
  preflight.response.headers.get('Access-Control-Allow-Origin'),
  'https://edwardd767.github.io',
);
// A public hash cannot be used as the access key; malformed/revoked links fail closed.
for (const invalid of [
  verifier,
  privateToken + 'A',
  'hx_link_v1_' + 'B'.repeat(43),
]) {
  assert.equal(
    (
      await call('/state', {
        token: invalid,
        environment: { DATABASE_URL: env.DATABASE_URL },
      })
    ).status,
    401,
  );
}
assert.equal(
  (
    await call('/state', {
      token: privateToken,
      service: createWorker(query, '0'.repeat(64)),
    })
  ).status,
  401,
);
assert.equal(
  (
    await call('/state', {
      token: privateToken,
      service: createWorker(query, ''),
    })
  ).status,
  401,
);
assert.equal(reads, 0, 'invalid private links never query the database');
// Exercise all subsequent persistence and concurrent-write tests with private-link access only.
token = privateToken;
delete env.TRANSPORT_PASSWORD;
const initial = await Promise.all([
  call('/state', { token }),
  call('/state', { token }),
]);
assert.ok(
  initial.every(
    (result) => result.status === 200 && [1, 2].includes(result.data.revision),
  ),
);
assert.equal(inserts, 1, 'racing initial loads seed only once');

const migratedState = structuredClone(stored.state);
const migratedRevision = stored.revision + 7;
stored = undefined;
legacyStored = { revision: migratedRevision, state: migratedState };
const migrated = await call('/state', {
  token,
  service: createWorker(query, verifier),
});
assert.equal(migrated.status, 200);
assert.equal(migrated.data.revision, migratedRevision);
assert.deepEqual(migrated.data.state, migratedState);
assert.equal(stored.revision, migratedRevision);
legacyStored = undefined;
const noteAction = (notes) => ({
  type: 'dayNote',
  date: '2026-09-04',
  note: { tide: '', restricted: '', holiday: '', notes },
});
const save = (action) =>
  call('/action', { token, body: { revision: stored.revision, action } });
assert.equal((await save(noteAction('Saved test note'))).status, 200);
const reloaded = await call('/state', {
  token,
  service: createWorker(query, verifier),
});
assert.equal(
  reloaded.data.state.dayNotes['2026-09-04'].notes,
  'Saved test note',
);
assert.equal(inserts, 2, 'new Worker instance does not reset saved data');
assert.equal(
  (
    await call('/action', {
      token,
      body: { revision: 1, action: noteAction('stale') },
    })
  ).status,
  409,
);
const beforeInvalid = writes;
const full = stored.state.trips.find(
  (trip) =>
    trip.groups.reduce((n, g) => n + g.adults + g.children, 0) ===
    trip.capacity,
);
assert.ok(full);
assert.equal(
  (
    await save({
      type: 'passengers',
      tripId: full.id,
      group: {
        id: 'over',
        name: 'Test',
        reference: 'TEST',
        adults: 1,
        children: 0,
        boarded: false,
      },
    })
  ).status,
  400,
);
assert.equal(
  (
    await save({
      type: 'setup',
      value: {
        ...stored.state.setup,
        boats: [{ ...stored.state.setup.boats[0], capacity: 0 }],
      },
    })
  ).status,
  400,
);
assert.equal(
  (await save({ type: 'sql', query: 'DROP TABLE example' })).status,
  400,
);
assert.equal((await save(noteAction('x'.repeat(300000)))).status, 413);
assert.equal(writes, beforeInvalid, 'invalid operations cannot write');

// Two clients read the same revision before either updates; only one may win.
const revision = stored.revision;
synchronizeReads = true;
const concurrent = await Promise.all(
  ['A', 'B'].map((notes) =>
    call('/action', { token, body: { revision, action: noteAction(notes) } }),
  ),
);
assert.deepEqual(concurrent.map((result) => result.status).sort(), [200, 409]);
assert.equal(stored.revision, revision + 1);

// A booking's two legs are saved together, or neither leg changes.
for (const values of [
  {
    id: 'test-arrival',
    date: '2026-09-01',
    time: '09:30',
    routeId: 'inbound',
    boatId: 'boat-3',
  },
  {
    id: 'test-return',
    date: '2026-09-04',
    time: '10:30',
    routeId: 'outbound',
    boatId: 'boat-3',
  },
])
  assert.equal((await save({ type: 'addTrip', values })).status, 200);
assert.equal(
  (
    await save({
      type: 'passengers',
      tripId: 'test-return',
      group: {
        id: 'fill',
        name: 'Test party',
        reference: 'TEST-FILL',
        adults: 16,
        children: 0,
        boarded: false,
      },
    })
  ).status,
  200,
);
const beforeTransfer = JSON.stringify(stored);
assert.equal(
  (
    await save({
      type: 'transfers',
      bookingReference: 'P003496',
      selection: {
        arrivalId: 'test-arrival',
        returnId: 'test-return',
        adults: 2,
        children: 0,
      },
    })
  ).status,
  400,
);
assert.equal(
  JSON.stringify(stored),
  beforeTransfer,
  'failed return allocation leaves arrival untouched',
);
assert.equal(
  (
    await save({
      type: 'transfers',
      bookingReference: 'P003496',
      selection: {
        arrivalId: 'test-arrival',
        returnId: '',
        adults: 2,
        children: 0,
      },
    })
  ).status,
  200,
);
assert.ok(
  stored.state.trips
    .find((t) => t.id === 'test-arrival')
    .groups.some((g) => g.bookingId === 'P003496'),
);
const broken = createWorker(async () => {
  throw new Error(env.DATABASE_URL);
}, verifier);
const failed = await call('/state', { token, service: broken });
assert.equal(failed.status, 500);
assert.ok(!JSON.stringify(failed.data).includes('postgresql'));

// Retain the working Neon redirect fix without forwarding credentials elsewhere.
const originalFetch = globalThis.fetch;
try {
  // A cold /state request must fit Workers Free's 50-subrequest budget,
  // including the extra HTTP hop when Neon redirects to a regional endpoint.
  let subrequests = 0;
  globalThis.fetch = async (url, options) => {
    if (++subrequests > 50) throw new Error('Too many subrequests.');
    if (new URL(url).hostname.startsWith('ep-'))
      return new Response(null, {
        status: 307,
        headers: { Location: 'https://api.c-1.ap-southeast-1.aws.neon.tech/sql' },
      });
    const body = JSON.parse(options.body);
    return Response.json({ rows: await query(env.DATABASE_URL, body.query, body.params) });
  };
  const coldWorker = createWorker(undefined, verifier);
  const coldLoad = await call('/state', { token: privateToken, service: coldWorker });
  assert.equal(coldLoad.status, 200, JSON.stringify(coldLoad.data));
  assert.deepEqual(coldLoad.data, stored, 'cold load preserves saved data');
  assert.ok(subrequests < 50, 'leave room for normal reads and redirects');

  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    return requests.length === 1
      ? new Response(null, {
          status: 307,
          headers: {
            Location: 'https://api.c-1.ap-southeast-1.aws.neon.tech/sql',
          },
        })
      : Response.json({ rows: [['1']] });
  };
  assert.deepEqual(await queryNeon(env.DATABASE_URL, 'SELECT $1', ['1']), [
    ['1'],
  ]);
  assert.equal(requests.length, 2);
  assert.equal(requests[1].options.redirect, 'manual');
  assert.deepEqual(JSON.parse(requests[1].options.body), {
    query: 'SELECT $1',
    params: ['1'],
  });
  let requestsOutside = 0;
  globalThis.fetch = async () => {
    requestsOutside++;
    return new Response(null, {
      status: 307,
      headers: { Location: 'https://example.org/sql' },
    });
  };
  await assert.rejects(
    () => queryNeon(env.DATABASE_URL, 'SELECT 1', []),
    /unsupported redirect/,
  );
  assert.equal(requestsOutside, 1);
  globalThis.fetch = async () =>
    Response.json(
      { code: '42P01', message: env.DATABASE_URL },
      { status: 400 },
    );
  await assert.rejects(
    () => queryNeon(env.DATABASE_URL, 'SELECT 1', []),
    (error) =>
      error.code === 'STORAGE_MISSING' && !error.message.includes('postgresql'),
  );
} finally {
  globalThis.fetch = originalFetch;
}
console.log(
  'Transport Worker checks passed: authentication, CORS, one-time seed, reload, validation, concurrent writes, transfer atomicity and safe Neon redirects (mock database).',
);
