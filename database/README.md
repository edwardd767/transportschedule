# HotelX transport prototype database

The Neon project `hotelx-transport-prototype` is separate from the customer's
HotelX database. The website calls a Cloudflare Worker; database credentials
never go into the website or GitHub.

## Storage model

The private Transport API now uses normalized PostgreSQL tables instead of
saving the complete application state in one JSONB column.

The live tables are:

- `public.hotelx_transport_meta` - schema version, revision and last update
- `public.hotelx_transport_rules` - transport operating settings retained for compatibility
- `public.hotelx_transport_operators` - transport operators
- `public.hotelx_transport_services` - speedboat, taxi, van and other services
- `public.hotelx_transport_routes` - routes and locations
- `public.hotelx_transport_templates` - saved schedule templates
- `public.hotelx_transport_trips` - scheduled departures
- `public.hotelx_transport_trip_groups` - passengers / booking groups assigned to departures
- `public.hotelx_transport_booking_legs` - booking arrival/departure transport legs
- `public.hotelx_transport_day_notes` - retained legacy calendar-note data

The old `public.hotelx_transport_state` table is not dropped automatically. It
is retained as a migration backup and is no longer the live write target after
the normalized Worker has migrated the property.

## Automatic migration of existing data

No manual re-entry of the current app data is required.

On the first authenticated/private-link `/state` request after deploying the
normalized Worker, the API:

1. Creates the normalized tables and database functions with `IF NOT EXISTS` /
   `CREATE OR REPLACE`.
2. Checks `public.hotelx_transport_meta` for property `hotel-paradise`.
3. If normalized data does not exist yet, reads the existing
   `public.hotelx_transport_state` row.
4. Copies the existing revision and state into the new normalized tables in one
   PostgreSQL transaction through `hotelx_transport_initialize`.
5. Reconstructs the same application state from the normalized tables and
   returns it to the app.
6. Uses only the normalized tables for subsequent application saves.

If the legacy table does not exist on a fresh database, the first load seeds the
normal demo state instead.

The migration is idempotent. Multiple first-load requests cannot seed the
property twice because `hotelx_transport_meta.id` is the primary key.

## Atomic saves and revision control

The frontend API contract is unchanged: the browser still receives
`{ revision, state }`, so no frontend migration is required.

For each accepted action, the Worker validates the complete change first. It
then calls `public.hotelx_transport_save(...)`. The PostgreSQL function checks
the expected revision, increments it, and replaces the normalized rows inside
the same database transaction. A stale client receives HTTP 409 and cannot
silently overwrite a newer save.

This keeps seat assignments, booking transport legs, trip groups, setup and
schedule-template changes consistent even though they are stored in separate
tables.

## Deploy private access

1. Keep the existing Cloudflare Worker secret `DATABASE_URL`. Do not change it.
2. Keep the existing private-link verifier in `worker/private-link-config.ts`.
   Do not rotate the private access link for this database migration.
3. Run `npm ci` and `npm run build:worker`.
4. In Cloudflare Worker `hotelx-transport-api`, click **Edit code**, replace the
   complete script with `dist/worker/hotelx-transport-api.js` (or the committed
   `worker/hotelx-transport-api.deploy.js`), then click **Deploy**.
5. Open the existing private link once. This first load performs the automatic
   migration from the old JSON row into the normalized tables.
6. Refresh the private link and confirm the top bar shows **Connected** and the
   existing operators, services, trips, templates and booking transport remain.

The API health endpoint should report:

- `apiVersion: 3`
- `storageConfigured: true`
- `privateLinkConfigured: true`
- `storageModel: normalized-tables`
- `storageSchemaVersion: 2`

Health is a configuration check and does not wake or migrate the database. The
migration occurs only after an authenticated `/state` request.

Both deployments are still relevant: GitHub Pages publishes the frontend, while
the standalone Cloudflare Worker controls the persistent Neon data. GitHub
Actions builds the Worker but does not automatically deploy it to Cloudflare.

## Verification queries

After opening the private link with the new Worker, these queries should return
records for `hotel-paradise`:

```sql
select * from public.hotelx_transport_meta;
select * from public.hotelx_transport_operators order by sort_order;
select * from public.hotelx_transport_services order by sort_order;
select * from public.hotelx_transport_routes order by sort_order;
select * from public.hotelx_transport_templates order by sort_order;
select * from public.hotelx_transport_trips order by trip_date, trip_time;
select * from public.hotelx_transport_trip_groups order by trip_id, sort_order;
select * from public.hotelx_transport_booking_legs order by sort_order;
```

To compare row counts:

```sql
select 'operators' as table_name, count(*) from public.hotelx_transport_operators
union all
select 'services', count(*) from public.hotelx_transport_services
union all
select 'routes', count(*) from public.hotelx_transport_routes
union all
select 'templates', count(*) from public.hotelx_transport_templates
union all
select 'trips', count(*) from public.hotelx_transport_trips
union all
select 'trip groups', count(*) from public.hotelx_transport_trip_groups
union all
select 'booking legs', count(*) from public.hotelx_transport_booking_legs;
```

Do not drop `hotelx_transport_state` immediately. Keep it as a backup until the
normalized tables have been verified after several saves and refreshes. It can
be archived or removed later as a separate controlled cleanup.

## Access and security

A private link contains a random 256-bit access key in the URL fragment. The
fragment is not sent to GitHub Pages. The app sends the key only to the Transport
API in its Authorization header. The database URL and password remain Worker
secrets and are never exposed to the frontend.

The previous `/session` password endpoint remains for compatibility with older
app versions. Private links do not require `TRANSPORT_PASSWORD`.

## Verification suite

`npm run test:transport` covers planning rules, private-link access, validation,
concurrent revision writes, transfer atomicity, persistence and legacy JSON to
normalized-table migration using a mock database.

`npm run build:pages` verifies the frontend and `npm run build:worker` verifies
the standalone Worker bundle. Live Neon migration should be verified after the
new Worker is deployed and the existing private link is opened once.
