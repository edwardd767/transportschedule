# Separate prototype database

The Neon project `hotelx-transport-prototype` is separate from the customer's
HotelX database. The website calls a Cloudflare Worker; database credentials
never go into the website or GitHub.

## Deploy the saved-data feature

1. In Neon, select the prototype project, production branch and `neondb`.
   Run `database/001_transport_state.sql`. Its last result is
   `Transport storage ready`. Re-running this script preserves existing rows.
2. Open Cloudflare → Workers & Pages → `hotelx-transport-api` → Settings →
   Runtime variables and secrets. Keep the existing `DATABASE_URL` secret.
3. Add a second **Secret** named `TRANSPORT_PASSWORD`. Set its value to a
   unique password of 16–256 characters. Save/deploy the variable. This is the
   prototype password, not your Neon or Cloudflare account password.
   Do not put either secret in chat or source control.
4. Locally run `npm ci`, then `npm run build:worker`.
   Open `dist/worker/hotelx-transport-api.js` and copy the entire file.
5. In the Worker, click **Edit code**, replace the previous connection-check
   script with that file, then **Deploy**. No npm imports remain in this bundle.
   Keep the Worker name and URL unchanged.
6. Open [API health](https://hotelx-transport-api.edwardjacob721.workers.dev/health).
   Expect `apiVersion: 1`, `storageConfigured: true` and
   `signInConfigured: true`. This checks deployment configuration; it does not
   execute a database query. A response with `checkVersion: 3` is the older
   connection check, and still needs replacing.
7. Open [HotelX](https://edwardd767.github.io/transportschedule/), click
   **Sign in to saved data** in the top bar, and enter the prototype password.
   The first successful load initializes the shared schedule once from sample
   data. It does not upload edits from the unsigned-in demo.
8. In Transport → Month, edit a daily note and save. Refresh the page and confirm
   that the note remains. Sign in from a second tab/device, use **Saved data →
   Reload saved data**, and confirm that the same note appears.

Both deployments are needed: pushing the repository publishes the frontend
through GitHub Actions; it does not automatically deploy the standalone Worker.
The existing GitHub Pages URL remains unchanged.

If sign-in configuration is false, health diagnostics version 2 reports
`signInStatus` as `missing`, `too_short`, or `too_long`. Correct the secret in
Cloudflare and deploy it. The accepted length is 16–256 characters. `ready`
means the deployed secret passes this check; no password value or exact length
is returned by health diagnostics.

## What is saved

Operators, boats, routes, rules, departures, passenger parties, boarding/status,
booking transport assignments, schedule templates and daily calendar notes are
saved together in `public.hotelx_transport_state`, row `hotel-paradise`.
The sample booking listing itself is still a code fixture, not a connection to
the real HotelX reservation database.

The related records use one JSONB snapshot so assigning both transfer legs is
atomic. All actions are validated on the server, including seats and boat
conflicts. SQL statements are server-owned and parameterized. Each write checks
the last loaded revision and increments it in the same UPDATE. A competing save
returns HTTP 409; no data is silently overwritten.

The app waits for a successful write before closing the form. If a conflicting
save or an uncertain network failure occurs, use **Reload saved data** in the
open dialog, review the retained form entries, then save again. Reload is
deliberate; the app does not poll or overwrite active form drafts automatically.
For edits from other users, reload before starting a new change.

## Access and limits

The prototype uses a shared password and signed 12-hour sessions. Only the
session token is kept in sessionStorage; the password is not stored. Signing out
clears the token and returns to fresh demo data. Changing TRANSPORT_PASSWORD
invalidates existing sessions. Everyone with that password can read and edit
the prototype's transport data. Per-isolate login throttling supplements the
password; it is not a distributed rate limiter.

This integration uses no paid Cloudflare bindings and no background polling.
Usage must stay within the accounts' free allowances. Authentication with
individual staff accounts, permissions and audit history belongs in the real
HotelX integration. Mapping to existing PostgreSQL tables is a separate step.

## Verification

`npm run test:transport` covers existing planning rules plus API authentication,
CORS, first-load races, saved-state reloads, competing revision writes, invalid
payloads, atomic transfer failures and safe Neon redirects. The API tests use an
in-memory database double and mocked HTTPS, not the live Neon database.
`npx tsc --noEmit`, `npm run build:pages` and `npm run build:worker` check the
compiled frontend and Worker. Complete step 8 after deploying to verify live
persistence. The current transport UI changes have not been browser-tested.
