from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


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
