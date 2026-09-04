# HotelX Transport Schedule

## Open the app

**[Open HotelX Transport Schedule](https://edwardd767.github.io/transportschedule/)**

The page includes **Booking → Booking Details**, **Front Desk → Transport** and **Hotel Settings → Transport Setup**. This is a browser prototype with sample data; changes reset when the page is refreshed.

An interactive first UI prototype based on HotelX's existing Booking screen: white navigation, orange property banner, left sidebar and status-striped listing cards.

## Included

- Booking listing and booking details based on the supplied HotelX screens, using demonstration guest records. Search, status and arrival-date filters, sorting, and the back button work in the preview.
- Booking → Transport supports multiple arrival and departure legs. Scheduled services reserve an existing departure and update its passenger manifest, while on-demand services such as taxi pickup/drop-off capture date, time, pickup, drop-off, vehicle/driver and remarks directly in the booking.
- Daily trip listing, date navigation, boat, route and status filters, and guest/trip search.
- Hotel Settings → Transport Setup, with editable operators, directional routes and boarding locations, transport services, service types, booking methods and passenger capacities, operating hours, turnaround times, reporting lead times and notes.
- Setup drives new trip selectors, operator matching, capacity and timing. Existing departures retain a snapshot of the original configuration.
- The monthly calendar defaults to a full-month overview fitted to the available screen, with direction counts and first-departure details when space allows. Select a date for all trips or enable **Expanded timetable** for every departure, boat, passenger count, status and tide note. The daily-note editor remains available for tide windows, restricted windows and operating notes in the compact view.
- Schedule Templates in Transport Setup: date ranges, weekdays, times, boat/route selection, excluded dates, and a preview before generation. Existing departures are skipped and manual changes to generated trips are preserved. The whole generation is rejected if any new departure conflicts.
- Individual departure editing preserves passengers and checks capacity, overlap, operating hours, and linked arrival/return order. Daily calendar notes are editable separately from departures.
- Trip details, sample reservation parties, capacity control, boarding and status updates.
- New departures with checks for overlapping boat assignments and daytime service.
- Downloadable CSV passenger lists grouped by reservation.
- Responsive layouts and keyboard-accessible dialogs and controls.

Departure times are transcribed from `Speedboat Schedule 2026 - AUG'26.pdf`. The source PDF and the reference screenshot are not included. Each direction is a separate departure; the time in the opposite column is not an arrival time.

Boat assignments, starting 16-seat capacities, reporting lead time, reservations, passenger names and operational statuses are sample data. Passenger activity is initially populated on 3 August 2026. Other August dates start with the source timetable and empty manifests. September begins without departures; create trips or generate a template before assigning a September transfer. In demo mode, edits reset on refresh. A **private access link** opens shared transport data automatically through the separately deployed Cloudflare Worker and Neon PostgreSQL. Keep that link private: anyone with it can view and edit the shared prototype. See [database setup and deployment](database/README.md).

PDF tide windows are reference text, not automatic sailing authorization or a departure generator. Ambiguous source text is retained: 14 August lists 17:30–15:00 and is flagged for operator confirmation.

This is not connected to the live HotelX application, reservations, payments, notifications, tide forecasts or boat operators. Tide/operating notes require operator review before any real service. References entered in the passenger form are not verified against a hotel reservation database. Each adult or child occupies one seat in the prototype. Boarding is recorded for the entire reservation party.

## Development

Node 22.13 or newer is required. Install with `npm ci`, then run `npm run dev`. `npm run build` creates the deployable output. Source is in `app/page.tsx`, styles in `app/globals.css`, and sample schedule and validation in `lib/transport.ts`.

`npm run build:pages` exports and stages the app in `dist/pages`, with assets addressed under `/transportschedule/` for GitHub Pages. This single-page prototype switches screens using browser state, so the Pages build uses an asset prefix while retaining the root static route. The **Deploy to GitHub Pages** workflow builds and publishes this output on each push to `main`. Its status appears in the repository’s Actions tab.

The standard `npm run build` still produces the existing Sites version. Sites hosting metadata points to a separate private preview.

## Verification

Run `npm run test:transport` for planning rules and authenticated API tests, including competing saves, refresh reloads, atomic transfers and safe database redirects. API tests use a mock database; live persistence must be checked after Worker deployment. These checks also run in the Pages workflow. `npm run build:worker` creates a standalone JavaScript file for the Cloudflare dashboard.

Production compilation, TypeScript validation and transport-rule checks are run before handoff. Optional WebMCP tools (`list_transport_trips`, `open_transport_trip`) are feature-detected. Their runtime checks could not run because the browser tool failed to initialize its kernel assets on this host. UI interactions and those optional tools have not been browser-tested. UI review is required before production use.
