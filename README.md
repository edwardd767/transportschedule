# HotelX Transport Schedule

## Open the app

**[Open HotelX Transport Schedule](https://edwardd767.github.io/transportschedule/)**

The page includes **Booking → Booking Details**, **Transport → Schedule** and **Hotel Settings → Transport Setup**. This is a browser prototype with sample data; changes reset when the page is refreshed.

An interactive first UI prototype based on HotelX's existing Booking screen: white navigation, orange property banner, left sidebar and status-striped listing cards.

## Included

- Booking listing and booking details based on the supplied HotelX screens. The first five rows match the reference; the remaining rows are clearly labelled sample guests. Search, status and arrival-date filters, sorting, and the back button work in the preview.
- A Transport card immediately after Room Upgrade opens the existing schedule for the booking's arrival date. It does not assign passengers or create a transfer reservation. Other hotel booking actions are reference cards and show a notice when selected.
- Daily trip listing, date navigation, route and status filters, and guest/trip search.
- Hotel Settings → Transport Setup, with editable operators, directional routes and boarding locations, boats, seat capacities, operating hours, turnaround times, reporting lead times and notes.
- Setup drives new trip selectors, operator matching, capacity and timing. Existing departures retain a snapshot of the original configuration.
- Monthly calendar using the customer-supplied August 2026 departures.
- Trip details, sample reservation parties, capacity control, boarding and status updates.
- New departures with checks for overlapping boat assignments and daytime service.
- Downloadable CSV passenger lists grouped by reservation.
- Responsive layouts and keyboard-accessible dialogs and controls.

Departure times are transcribed from `Speedboat Schedule 2026 - AUG'26.pdf`. The source PDF and the reference screenshot are not included. Each direction is a separate departure; the time in the opposite column is not an arrival time.

Boat assignments, starting 16-seat capacities, reporting lead time, reservations, passenger names and operational statuses are sample data. Passenger activity is populated on 3 August 2026. Other dates have the source timetable with empty manifests. All edits, including setup, are held in memory and reset on refresh.

This is not connected to the live HotelX application, reservations, payments, notifications, tide forecasts or boat operators. Tide/operating notes require operator review before any real service. References entered in the passenger form are not verified against a hotel reservation database. Each adult or child occupies one seat in the prototype. Boarding is recorded for the entire reservation party.

## Development

Node 22.13 or newer is required. Install with `npm ci`, then run `npm run dev`. `npm run build` creates the deployable output. Source is in `app/page.tsx`, styles in `app/globals.css`, and sample schedule and validation in `lib/transport.ts`.

`npm run build:pages` exports and stages the app in `dist/pages`, with assets addressed under `/transportschedule/` for GitHub Pages. This single-page prototype switches screens using browser state, so the Pages build uses an asset prefix while retaining the root static route. The **Deploy to GitHub Pages** workflow builds and publishes this output on each push to `main`. Its status appears in the repository’s Actions tab.

The standard `npm run build` still produces the existing Sites version. Sites hosting metadata points to a separate private preview.

## Verification

Production compilation, TypeScript validation and transport-rule checks are run before handoff. Optional WebMCP tools (`list_transport_trips`, `open_transport_trip`) are feature-detected. Their runtime checks could not run because the browser tool failed to initialize its kernel assets on this host. UI interactions and those optional tools have not been browser-tested. UI review is required before production use.
