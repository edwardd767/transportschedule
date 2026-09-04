from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


# Switch the Worker from the single JSON row to normalized PostgreSQL storage.
p = Path('worker/index.ts')
s = p.read_text()
s = replace_once(
    s,
    "import { ApiError, queryNeon, type Query } from './neon';\n",
    "import { ApiError, queryNeon, type Query } from './neon';\nimport { createNormalizedTransportStorage } from './normalized-storage';\n",
    'normalized storage import',
)

old_sql = """const readSql =
  'SELECT revision::text, state::text FROM public.hotelx_transport_state WHERE id = $1';
const insertSql =
  'INSERT INTO public.hotelx_transport_state (id, state) VALUES ($1, $2::jsonb) ON CONFLICT (id) DO NOTHING RETURNING revision::text, state::text';
const updateSql =
  'UPDATE public.hotelx_transport_state SET state = $1::jsonb, revision = revision + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND revision = $3::integer RETURNING revision::text';
"""
s = replace_once(s, old_sql, '', 'legacy SQL constants')

s = replace_once(
    s,
    """export function createWorker(
  query: Query = queryNeon,
  verifier = privateLinkSha256,
) {
  return {
""",
    """export function createWorker(
  query: Query = queryNeon,
  verifier = privateLinkSha256,
) {
  const storage = createNormalizedTransportStorage(query);
  return {
""",
    'storage adapter creation',
)

s = replace_once(
    s,
    """            apiVersion: 2,
            diagnosticsVersion: 2,
            service: 'HotelX Transport API',
            status: 'ready',
            storageConfigured: Boolean(env.DATABASE_URL),
""",
    """            apiVersion: 3,
            diagnosticsVersion: 3,
            service: 'HotelX Transport API',
            status: 'ready',
            storageConfigured: Boolean(env.DATABASE_URL),
            storageModel: 'normalized-tables',
            storageSchemaVersion: 2,
""",
    'health storage model',
)

old_state = """        if (path === '/state' && request.method === 'GET') {
          const rows = await query(connection, readSql, [recordId]);
          if (rows.length) return reply(decode(rows[0]));
          const inserted = await query(connection, insertSql, [
            recordId,
            JSON.stringify(newTransportState()),
          ]);
          if (inserted.length) return reply(decode(inserted[0]));
          const existing = await query(connection, readSql, [recordId]);
          if (!existing.length)
            throw new ApiError(
              'STORAGE_INIT',
              'Could not initialize transport storage. Try again.',
            );
          return reply(decode(existing[0]));
        }
"""
new_state = """        if (path === '/state' && request.method === 'GET') {
          const row = await storage.readOrInitialize(
            connection,
            recordId,
            newTransportState(),
          );
          return reply(decode(row));
        }
"""
s = replace_once(s, old_state, new_state, 'state normalized read')

old_action_read = """          const rows = await query(connection, readSql, [recordId]);
          if (!rows.length)
            throw new ApiError(
              'RELOAD_REQUIRED',
              'Reload saved data before saving.',
              409,
            );
          const current = decode(rows[0]);
"""
new_action_read = """          const row = await storage.read(connection, recordId);
          if (!row)
            throw new ApiError(
              'RELOAD_REQUIRED',
              'Reload saved data before saving.',
              409,
            );
          const current = decode(row);
"""
s = replace_once(s, old_action_read, new_action_read, 'action normalized read')

old_save = """          const saved = await query(connection, updateSql, [
            encoded,
            recordId,
            String(current.revision),
          ]);
          if (!saved.length)
            throw new ApiError(
              'CONFLICT',
              'Someone else saved changes. Reload saved data, review your form, then save again.',
              409,
            );
          return reply({ revision: Number(saved[0][0]), state });
"""
new_save = """          const savedRevision = await storage.save(
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
"""
s = replace_once(s, old_save, new_save, 'normalized save')

if 'hotelx_transport_state WHERE id' in s:
    raise SystemExit('legacy state SQL still exists in worker/index.ts')
if "storageModel: 'normalized-tables'" not in s:
    raise SystemExit('normalized storage health marker missing')

p.write_text(s)


# Adapt the Worker test's in-memory database to the normalized storage markers.
p = Path('scripts/test-transport-worker.mjs')
s = p.read_text()
s = replace_once(
    s,
    """let stored,
  reads = 0,
  writes = 0,
  inserts = 0;
""",
    """let stored,
  legacyStored,
  reads = 0,
  writes = 0,
  inserts = 0;
""",
    'test legacy fixture',
)
old_query = """async function query(_connection, sql, params) {
  if (sql.startsWith('SELECT')) {
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
  if (sql.startsWith('INSERT')) {
    if (stored) return [];
    inserts++;
    stored = { revision: 1, state: JSON.parse(params[1]) };
    return [['1', JSON.stringify(stored.state)]];
  }
  assert.match(
    sql,
    /WHERE id = \\$2 AND revision = \\$3::integer RETURNING revision::text/,
  );
  if (stored.revision !== Number(params[2])) return [];
  writes++;
  stored = { revision: stored.revision + 1, state: JSON.parse(params[0]) };
  return [[String(stored.revision)]];
}
"""
new_query = """async function query(_connection, sql, params) {
  if (/^CREATE (?:TABLE|INDEX|OR REPLACE FUNCTION)/.test(sql)) return [];
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
"""
s = replace_once(s, old_query, new_query, 'normalized test query')
s = replace_once(
    s,
    "assert.equal((await call('/health')).data.apiVersion, 2);",
    "assert.equal((await call('/health')).data.apiVersion, 3);\nassert.equal((await call('/health')).data.storageModel, 'normalized-tables');\nassert.equal((await call('/health')).data.storageSchemaVersion, 2);",
    'test health version',
)
s = replace_once(
    s,
    "assert.equal(health.data.diagnosticsVersion, 2);",
    "assert.equal(health.data.diagnosticsVersion, 3);",
    'test diagnostics version',
)

# Verify an existing legacy JSON row migrates at the same revision into normalized storage.
migration_marker = """assert.equal(inserts, 1, 'racing initial loads seed only once');
"""
migration_test = """assert.equal(inserts, 1, 'racing initial loads seed only once');

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
"""
s = replace_once(s, migration_marker, migration_test, 'legacy migration test')

p.write_text(s)
