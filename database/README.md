# Separate prototype database

The Neon project `hotelx-transport-prototype` is separate from the customer's
HotelX database. The website calls a Cloudflare Worker; database credentials
never go into the website or GitHub.

## Deploy private access

1. Run `database/001_transport_state.sql` in Neon, production branch, `neondb`.
   Re-running it preserves existing rows.
2. Keep the existing Cloudflare Worker secret `DATABASE_URL`.
3. The private access verifier is in `worker/private-link-config.ts`. The
   generated private link is stored locally under the git-ignored
   `outputs/private-access/` directory. Open `HotelX Private Access.html` to
   access it. Never commit that directory or paste the private URL into an issue.
   On a fresh machine, obtain the existing link privately from the owner rather
   than generating another key.
4. Run `npm ci` and `npm run build:worker`. In the Cloudflare Worker
   `hotelx-transport-api`, click **Edit code**, replace the entire script with
   `dist/worker/hotelx-transport-api.js`, then **Deploy**. The bundle includes
   only a SHA-256 verifier, never the private access key.
5. [API health](https://hotelx-transport-api.edwardjacob721.workers.dev/health)
   should report `apiVersion: 2`, `storageConfigured: true` and
   `privateLinkConfigured: true`. These are configuration checks; they do
   not execute a database query.
6. Push the frontend to main for GitHub Pages deployment.
7. Open the private link and bookmark it. The top bar shows **Connected** after
   the shared data loads. The first successful load initializes sample transport
   data once; it never uploads unsaved demo edits.
8. Save a daily note, refresh the private link, and confirm it remains. On a
   second device, open the same private link to access the shared schedule.

Both deployments are needed. GitHub Actions publishes the frontend and builds
the Worker bundle, but does not automatically deploy the standalone Worker.
The normal [HotelX URL](https://edwardd767.github.io/transportschedule/) opens
sample demo data whose edits reset on refresh.

## Access and rotation

A private link contains a random 256-bit access key in the URL fragment. The
fragment is not sent to GitHub Pages. The app reads it and sends the key only
to the Transport API in its Authorization header. The key remains in the
bookmark, so no sign-in form or browser session storage is required.

Everyone with the link can view and edit this shared prototype. The link has
no automatic expiry. An incomplete, invalid, or revoked link blocks shared
saves; it does not silently switch to demo. **Return to demo** clears the
fragment from the current address and opens fresh sample data; it does not
invalidate the original bookmark.

To revoke a link, run `node scripts/create-private-link.mjs --rotate`, rebuild
and deploy the Worker, then privately give the new link to the intended users.
The old link stops working once the new verifier is deployed; saved data stays
unchanged. The plaintext key is generated locally, and only its SHA-256 verifier
is committed. Do not manually use the verifier as an access key.

The previous `/session` password endpoint remains for compatibility with open
older versions of the app. Private links do not require `TRANSPORT_PASSWORD`.
Removing that secret disables old password sessions without affecting private
links. Rotating a link does not revoke legacy sessions while that secret exists.

## What is saved

Operators, boats, routes, rules, departures, passenger parties, boarding/status,
booking transport assignments, schedule templates and daily calendar notes are
saved together in `public.hotelx_transport_state`, row `hotel-paradise`.
The sample booking listing remains a code fixture, not a connection to the
real HotelX reservation database.

The related records use one JSONB snapshot so assigning both transfer legs is
atomic. Actions are validated on the server, including seats and boat conflicts.
SQL statements are server-owned and parameterized. Each write checks the last
loaded revision and increments it in the same UPDATE. A competing save returns
HTTP 409; no data is silently overwritten.

The app waits for a successful write before closing the form. After a conflict
or uncertain network failure, use **Reload saved data** in the open dialog,
review retained form entries, then save again. Reload is deliberate; the app
does not poll or overwrite active form drafts automatically.

This integration uses no paid Cloudflare bindings and no background polling.
Usage must stay within the accounts' free allowances. Individual staff accounts,
permissions, audit history and mapping to existing HotelX PostgreSQL tables are
separate production-integration work.

## Verification

`npm run test:transport` covers planning rules, private-link parsing, invalid and
revoked keys, access without a password, legacy sessions, CORS, first-load races,
saved-state reloads, competing revision writes, invalid payloads, atomic
transfers and safe Neon redirects. These tests use a mock database.
`npx tsc --noEmit`, `npm run build:pages` and `npm run build:worker` check the
compiled frontend and Worker. Verify live persistence after both deployments.
