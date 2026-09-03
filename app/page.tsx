'use client';
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from 'react';
import { flushSync } from 'react-dom';
import {
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  ConciergeBell,
  Languages,
  List,
  LogOut,
  Plus,
  Search,
  Settings,
  Ship,
  Users,
  Waves,
} from 'lucide-react';
import hamburgerIcon from './Hamburger.png';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Choice } from '@/components/hotel-choice';
import { TransportSetup } from '@/components/transport-setup';
import { Bookings } from '@/components/bookings';
import { sampleBookings } from '@/lib/bookings';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  initialTrips,
  initialSetup,
  tripFromSetup,
  addMinutes,
  countPassengers,
  formatDate,
  moveDate,
  addGroupToTrip,
  addTrip,
  type Trip,
} from '@/lib/transport';

export default function Home() {
  const [date, setDate] = useState('2026-08-03');
  const [route, setRoute] = useState('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<'schedule' | 'setup' | 'booking'>(
    'schedule',
  );
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const activeBooking =
    sampleBookings.find((booking) => booking.reference === bookingReference) ??
    null;
  const [setup, setSetup] = useState(initialSetup);
  const [trips, setTrips] = useState(initialTrips);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = trips.find((t) => t.id === selectedId) ?? null;
  const [dialog, setDialog] = useState<
    'trip' | 'passengers' | 'calendar' | 'help' | null
  >(null);
  const [formRoute, setFormRoute] = useState('inbound');
  const [formBoat, setFormBoat] = useState('boat-3');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [month, setMonth] = useState('2026-08');
  const tripState = useRef(trips);
  tripState.current = trips;
  const activeRoutes = setup.routes.filter(
    (r) =>
      r.active &&
      setup.operators.some((o) => o.id === r.operatorId && o.active),
  );
  const activeBoats = setup.boats.filter(
    (b) =>
      b.status === 'Active' &&
      b.operatorId === activeRoutes.find((r) => r.id === formRoute)?.operatorId,
  );
  function openDialog(value: typeof dialog) {
    setError('');
    setDialog(value);
    if (value === 'calendar') setMonth(date.slice(0, 7));
    if (value === 'trip') {
      const selectedRoute =
        activeRoutes.find((r) => r.id === formRoute) ?? activeRoutes[0];
      setFormRoute(selectedRoute?.id ?? '');
      const boats = setup.boats.filter(
        (b) =>
          b.status === 'Active' && b.operatorId === selectedRoute?.operatorId,
      );
      setFormBoat(
        boats.find((b) => b.id === formBoat)?.id ?? boats[0]?.id ?? '',
      );
    }
  }
  function changeFormRoute(id: string) {
    setFormRoute(id);
    setFormBoat(
      setup.boats.find(
        (b) =>
          b.status === 'Active' &&
          b.operatorId === setup.routes.find((r) => r.id === id)?.operatorId,
      )?.id ?? '',
    );
  }
  function updateTrip(trip: Trip) {
    setTrips((previous) => previous.map((t) => (t.id === trip.id ? trip : t)));
  }
  function statusOf(t: Trip) {
    return t.status === 'Scheduled' && countPassengers(t) >= t.capacity
      ? 'Full'
      : t.status;
  }
  function saveTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const trip = tripFromSetup(setup, {
        id: `TR-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
        date: String(form.get('date')),
        time: String(form.get('time')),
        routeId: formRoute,
        boatId: formBoat,
      });
      setTrips(addTrip(trips, trip, setup.rules));
      setDate(trip.date);
      setRoute('all');
      setQuery('');
      setStatusFilter('all');
      setDialog(null);
      setNotice(
        `${trip.time} ${trip.origin} → ${trip.destination} trip added to the preview.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function savePassengers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    try {
      const next = addGroupToTrip(selected, {
        id: crypto.randomUUID(),
        name: String(form.get('name')),
        reference: String(form.get('reference')),
        adults: Number(form.get('adults')),
        children: Number(form.get('children')),
        boarded: false,
      });
      updateTrip(next);
      setDialog(null);
      setNotice('Passengers added. Seat availability has been updated.');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function changeStatus(value: string) {
    if (!selected) return;
    if (value === 'Completed' && selected.groups.some((g) => !g.boarded)) {
      setError('Board all assigned parties before completing this trip.');
      return;
    }
    updateTrip({ ...selected, status: value as Trip['status'] });
    setError('');
    setNotice(`Trip ${selected.id} is now ${value.toLowerCase()}.`);
  }
  function downloadManifest(trip: Trip) {
    const cell = (value: unknown) => {
      let text = String(value);
      if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const rows = [
      [
        'Trip',
        'Date',
        'Departure',
        'Route',
        'Boat',
        'Reservation',
        'Lead guest',
        'Adults',
        'Children',
        'Boarded',
      ],
      ...trip.groups.map((g) => [
        trip.id,
        trip.date,
        trip.time,
        `${trip.origin} to ${trip.destination}`,
        trip.boat,
        g.reference,
        g.name,
        g.adults,
        g.children,
        g.boarded ? 'Yes' : 'No',
      ]),
    ];
    const url = URL.createObjectURL(
      new Blob(
        ['\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')],
        { type: 'text/csv;charset=utf-8' },
      ),
    );
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${trip.id}-passengers.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice('Passenger list downloaded.');
  }
  useEffect(() => {
    type Registry = {
      registerTool: (
        tool: {
          name: string;
          description: string;
          inputSchema: object;
          annotations: object;
          execute: (input: unknown) => unknown;
        },
        options: { signal: AbortSignal },
      ) => void | Promise<void>;
    };
    const context = (document as Document & { modelContext?: Registry })
      .modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const tools = [
      {
        name: 'list_transport_trips',
        description:
          'Read prototype trips for a travel date, including route and available seats.',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          },
          required: ['date'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: true, untrustedContentHint: false },
        execute: (input: unknown) => {
          const value = input as { date?: unknown };
          if (
            typeof value?.date !== 'string' ||
            !/^\d{4}-\d{2}-\d{2}$/.test(value.date) ||
            Number.isNaN(new Date(`${value.date}T12:00:00`).getTime())
          )
            throw new Error('A valid date is required.');
          return tripState.current
            .filter((t) => t.date === value.date)
            .map((t) => ({
              id: t.id,
              time: t.time,
              route: t.direction,
              status: t.status,
              availableSeats: ['Cancelled', 'Completed'].includes(t.status)
                ? 0
                : t.capacity - countPassengers(t),
            }));
        },
      },
      {
        name: 'open_transport_trip',
        description:
          'Open an existing trip and its passenger list in the prototype. Does not book seats.',
        inputSchema: {
          type: 'object',
          properties: { tripId: { type: 'string' } },
          required: ['tripId'],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: (input: unknown) => {
          const value = input as { tripId?: unknown };
          const trip = tripState.current.find((t) => t.id === value?.tripId);
          if (!trip) throw new Error('Trip not found.');
          flushSync(() => {
            setView('schedule');
            setDate(trip.date);
            setSelectedId(trip.id);
            setError('');
          });
          return { openedTripId: trip.id };
        },
      },
    ];
    for (const tool of tools) {
      try {
        void Promise.resolve(
          context.registerTool(tool, { signal: lifecycle.signal }),
        ).catch(() => {});
      } catch {
        /* Optional browser API. */
      }
    }
    return () => lifecycle.abort();
  }, []);
  const daily = trips.filter((t) => t.date === date);
  const shown = daily.filter(
    (t) =>
      (route === 'all' || t.direction === route) &&
      (statusFilter === 'all' || statusOf(t) === statusFilter) &&
      `${t.id} ${t.boat} ${t.time} ${t.groups.map((g) => `${g.name} ${g.reference}`).join(' ')}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const pax = daily.reduce((n, t) => n + countPassengers(t), 0);
  const seats = daily
    .filter((t) => !['Cancelled', 'Completed'].includes(t.status))
    .reduce((n, t) => n + t.capacity - countPassengers(t), 0);
  return (
    <SidebarProvider
      style={{ '--sidebar-width': '232px' } as CSSProperties}
      className="hotel-shell"
    >
      <header className="topbar">
        <div className="brand">
          <SidebarTrigger className="menu-button">
            <img
              src={hamburgerIcon.src}
              alt="Menu"
              className="hamburger-icon"
            />
          </SidebarTrigger>
          <span>HotelX</span>
        </div>
        <div className="top-tools">
          <button
            className="icon-button help-button"
            aria-label="About this prototype"
            onClick={() => openDialog('help')}
          >
            <CircleHelp size={25} />
          </button>
          <span className="language">
            <Languages size={23} /> EN
          </span>
        </div>
      </header>
      <Sidebar className="hotel-sidebar">
        <SidebarContent>
          <div className="profile">
            <div className="avatar">ED</div>
            <div className="profile-name">Edward Durai</div>
            <div className="profile-role">Hotel administrator</div>
          </div>
          <nav className="main-nav" aria-label="Main navigation">
            <button
              className={view === 'booking' ? 'active' : ''}
              aria-current={view === 'booking' ? 'page' : undefined}
              onClick={() => {
                setBookingReference(null);
                setView('booking');
              }}
            >
              <CalendarDays />
              Booking
            </button>
            <button disabled title="Existing hotel module">
              <ConciergeBell />
              Front Desk
            </button>
            <button
              className={view === 'schedule' ? 'active' : ''}
              aria-current={view === 'schedule' ? 'page' : undefined}
              onClick={() => setView('schedule')}
            >
              <Ship />
              Transport<span className="new-label">NEW</span>
            </button>
            {view === 'schedule' && (
              <div className="subnav">
                <span>Schedule</span>
              </div>
            )}
            <button disabled title="Existing hotel module">
              <ChartNoAxesCombined />
              Digital Reporting
            </button>
            <button
              className={view === 'setup' ? 'active' : ''}
              aria-current={view === 'setup' ? 'page' : undefined}
              onClick={() => setView('setup')}
            >
              <Settings />
              Hotel Settings
            </button>
            {view === 'setup' && (
              <div className="subnav">
                <span>Transport Setup</span>
              </div>
            )}
            <button disabled title="Not connected to a hotel session">
              <LogOut />
              Sign Out
            </button>
          </nav>
          <div className="sidebar-foot">
            <span className="property-mark">H</span>
            <div>
              HOTEL PARADISE<small>Hotel Management System</small>
            </div>
          </div>
        </SidebarContent>
      </Sidebar>
      <main className="workspace">
        <div className="property-banner">
          <div className="property-identity">
            {view === 'booking' && activeBooking && (
              <button
                className="booking-back"
                aria-label="Back to booking listing"
                onClick={() => setBookingReference(null)}
              >
                <ChevronLeft size={24} />
              </button>
            )}
            <div>
              <small>HMS</small>
              <strong>HOTEL PARADISE</strong>
            </div>
          </div>
          {!(view === 'booking' && activeBooking) && (
            <span className="property-switch">
              <ArrowRightLeft size={18} />
            </span>
          )}
          <div className="breadcrumb">
            {view === 'booking' ? (
              <span>{activeBooking ? '... / Booking' : 'Booking'}</span>
            ) : (
              <>
                {view === 'setup' ? 'Hotel Settings' : 'Transport'}{' '}
                <ChevronRight size={14} />{' '}
                {view === 'setup' ? 'Transport Setup' : 'Schedule'}
              </>
            )}
          </div>
        </div>
        {view === 'booking' ? (
          <Bookings
            booking={activeBooking}
            onSelect={(booking) => setBookingReference(booking.reference)}
            onNotice={setNotice}
            onOpenTransport={(booking) => {
              setDate(booking.arrival);
              setRoute('all');
              setStatusFilter('all');
              setQuery('');
              setView('schedule');
            }}
          />
        ) : view === 'setup' ? (
          <div className="settings-scroll" key="setup">
            <TransportSetup
              config={setup}
              onChange={setSetup}
              onBack={() => setView('schedule')}
              onNotice={setNotice}
            />
          </div>
        ) : (
          <>
            <div className="listing-title">
              <div>
                <h1>
                  Transport Listing <span>({daily.length})</span>
                </h1>
                <span className="context-tag">
                  <Ship size={14} /> Speedboat
                </span>
              </div>
              <button
                className="primary-button"
                onClick={() => openDialog('trip')}
              >
                <Plus size={19} /> Add trip
              </button>
            </div>
            <div className="day-summary">
              <div>
                <span className="summary-icon">
                  <CalendarDays />
                </span>
                <div>
                  <small>Total trips</small>
                  <strong>{daily.length}</strong>
                </div>
              </div>
              <div>
                <span className="summary-icon blue">
                  <Users />
                </span>
                <div>
                  <small>Passengers booked</small>
                  <strong>{pax}</strong>
                </div>
              </div>
              <div>
                <span className="summary-icon green">
                  <Ship />
                </span>
                <div>
                  <small>Seats available</small>
                  <strong>{seats}</strong>
                </div>
              </div>
              <div className="summary-note">
                <Waves size={22} />
                <span>
                  August 2026 schedule<small>Source: customer timetable</small>
                </span>
              </div>
            </div>
            <section
              className="schedule-surface"
              aria-label="Transport schedule"
            >
              <div className="filterbar">
                <div className="date-picker">
                  <button
                    aria-label="Previous day"
                    onClick={() => setDate(moveDate(date, -1))}
                  >
                    <ChevronLeft size={19} />
                  </button>
                  <label>
                    <CalendarDays size={19} />
                    <input
                      type="date"
                      aria-label="Travel date"
                      value={date}
                      onChange={(e) =>
                        e.target.value && setDate(e.target.value)
                      }
                    />
                  </label>
                  <button
                    aria-label="Next day"
                    onClick={() => setDate(moveDate(date, 1))}
                  >
                    <ChevronRight size={19} />
                  </button>
                </div>
                <Choice
                  label="Route"
                  value={route}
                  onChange={setRoute}
                  items={[
                    { value: 'all', label: 'All routes' },
                    ...setup.routes.map((r) => ({
                      value: r.id,
                      label: `${r.origin} → ${r.destination}`,
                    })),
                  ]}
                />
                <label className="search-field">
                  <Search size={18} />
                  <input
                    aria-label="Search trips"
                    placeholder="Search trip, boat or guest"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </label>
                <button
                  className="calendar-button"
                  aria-label="Open monthly schedule"
                  onClick={() => openDialog('calendar')}
                >
                  <CalendarDays size={19} />
                  <span>Month</span>
                </button>
              </div>
              <div className="list-subhead">
                <h2>{formatDate(date)}</h2>
                <Choice
                  value={statusFilter}
                  onChange={setStatusFilter}
                  label="Trip status"
                  items={[
                    'all',
                    'Boarding',
                    'Scheduled',
                    'Full',
                    'Delayed',
                    'Cancelled',
                    'Completed',
                  ].map((s) => ({
                    value: s,
                    label: s === 'all' ? 'All statuses' : s,
                  }))}
                />
              </div>
              <div
                className="schedule-scroll"
                role="region"
                aria-label="Trip list"
                tabIndex={0}
                key={`${date}-${route}-${statusFilter}-${query}`}
              >
                <div className="trip-list">
                  {shown.length ? (
                    shown
                      .sort((a, b) => a.time.localeCompare(b.time))
                      .map((t) => {
                        const booked = countPassengers(t);
                        const status = statusOf(t);
                        const closed = ['Cancelled', 'Completed'].includes(
                          t.status,
                        );
                        return (
                          <button
                            className={`trip-card status-${status.toLowerCase()}`}
                            key={t.id}
                            onClick={() => {
                              setSelectedId(t.id);
                              setError('');
                            }}
                          >
                            <div className="departure">
                              <strong>{t.time}</strong>
                              <small>Departure</small>
                            </div>
                            <div className="trip-route">
                              <strong>
                                {t.origin}
                                <ArrowRight size={18} />
                                {t.destination}
                              </strong>
                              <span>
                                {t.id}
                                <b>·</b>
                                <Ship size={14} />
                                {t.boat}
                                <b>·</b>
                                {t.durationMinutes} min
                              </span>
                            </div>
                            <div className="capacity">
                              <span>
                                <Users size={16} />
                                <strong>{booked}</strong> / {t.capacity}{' '}
                                passengers
                              </span>
                              <div className="capacity-track">
                                <i
                                  style={{
                                    width: `${(booked / t.capacity) * 100}%`,
                                  }}
                                />
                              </div>
                              <small>
                                {closed
                                  ? 'Booking closed'
                                  : t.capacity - booked === 0
                                    ? 'All seats booked'
                                    : `${t.capacity - booked} seats available`}
                              </small>
                            </div>
                            <div className="trip-state">
                              <span
                                className={`status-pill ${status.toLowerCase()}`}
                              >
                                <i />
                                {status}
                              </span>
                              <small>
                                {t.toHotel ? 'To hotel' : 'From hotel'}
                              </small>
                            </div>
                            <ChevronRight className="card-chevron" size={22} />
                          </button>
                        );
                      })
                  ) : (
                    <div className="empty-state">
                      <Ship size={36} />
                      <h3>No trips found</h3>
                      <p>Choose another date or adjust your search.</p>
                      <button
                        className="secondary-button"
                        onClick={() => {
                          setQuery('');
                          setStatusFilter('all');
                          setRoute('all');
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
                <footer className="schedule-footer">
                  <span>
                    Showing {shown.length} of {daily.length} trips
                  </span>
                  <span>
                    <Clock3 size={14} /> All times are local · Malaysia (GMT+8)
                  </span>
                </footer>
                <div className="operating-note">
                  <Waves size={19} />
                  <p>
                    <strong>Operating notes</strong> Service hours for new
                    trips: {setup.rules.start}–{setup.rules.end}. Departures are
                    subject to operator confirmation and weather conditions.
                  </p>
                </div>
                <div className="demo-note">
                  Preview with sample passengers and capacities. Changes in this
                  prototype reset when the page is refreshed.
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <output
        className={`notice ${notice ? 'visible' : ''}`}
        aria-live="polite"
      >
        {notice}
        {notice && (
          <button
            onClick={() => setNotice('')}
            aria-label="Dismiss notification"
          >
            ×
          </button>
        )}
      </output>
      <Sheet
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setError('');
          }
        }}
      >
        <SheetContent className="trip-sheet">
          {selected && (
            <>
              <SheetHeader className="trip-sheet-header">
                <span className="eyebrow">TRIP DETAILS · {selected.id}</span>
                <SheetTitle>
                  {selected.origin} → {selected.destination}
                </SheetTitle>
                <SheetDescription>
                  {formatDate(selected.date)} · {selected.time}
                </SheetDescription>
              </SheetHeader>
              <div className="sheet-body">
                <div className="trip-facts">
                  <div>
                    <Ship size={20} />
                    <span>
                      Boat<strong>{selected.boat}</strong>
                    </span>
                  </div>
                  <div>
                    <Clock3 size={20} />
                    <span>
                      Journey<strong>{selected.durationMinutes} minutes</strong>
                    </span>
                  </div>
                </div>
                <div className="status-control">
                  <span>Trip status</span>
                  <Choice
                    label="Change trip status"
                    value={selected.status}
                    onChange={changeStatus}
                    items={[
                      'Scheduled',
                      'Boarding',
                      'Delayed',
                      'Cancelled',
                      'Completed',
                    ].map((s) => ({ value: s, label: s }))}
                  />
                </div>
                {error && !dialog && (
                  <p role="alert" className="form-error">
                    {error}
                  </p>
                )}
                {selected.status === 'Cancelled' && (
                  <p className="form-error">
                    {countPassengers(selected)} assigned passengers need an
                    alternative departure. Their records remain on this trip for
                    follow-up.
                  </p>
                )}
                <Tabs defaultValue="passengers" className="detail-tabs">
                  <TabsList variant="line">
                    <TabsTrigger value="passengers">
                      Passengers ({countPassengers(selected)})
                    </TabsTrigger>
                    <TabsTrigger value="information">
                      Trip information
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="passengers">
                    <div className="passenger-summary">
                      <div>
                        <strong>
                          {countPassengers(selected)}{' '}
                          <span>/ {selected.capacity}</span>
                        </strong>
                        <small>Seats booked</small>
                      </div>
                      <div>
                        <strong>
                          {selected.groups
                            .filter((g) => g.boarded)
                            .reduce((n, g) => n + g.adults + g.children, 0)}
                        </strong>
                        <small>Passengers boarded</small>
                      </div>
                    </div>
                    <div className="passenger-heading">
                      <h3>Reservations ({selected.groups.length})</h3>
                      <button
                        className="text-button"
                        disabled={
                          countPassengers(selected) >= selected.capacity ||
                          ['Cancelled', 'Completed'].includes(selected.status)
                        }
                        onClick={() => openDialog('passengers')}
                      >
                        <Plus size={16} /> Add passengers
                      </button>
                    </div>
                    <div className="passenger-groups">
                      {selected.groups.length ? (
                        selected.groups.map((g) => (
                          <div className="passenger-row" key={g.id}>
                            <div className="guest-initials">
                              {g.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')}
                            </div>
                            <div className="guest-name">
                              <strong>{g.name}</strong>
                              <span>{g.reference}</span>
                              <small>
                                {g.adults} adult{g.adults !== 1 ? 's' : ''}
                                {g.children
                                  ? ` · ${g.children} child${g.children !== 1 ? 'ren' : ''}`
                                  : ''}
                              </small>
                            </div>
                            <button
                              className={`board-button ${g.boarded ? 'is-boarded' : ''}`}
                              disabled={selected.status !== 'Boarding'}
                              onClick={() =>
                                updateTrip({
                                  ...selected,
                                  groups: selected.groups.map((group) =>
                                    group.id === g.id
                                      ? { ...group, boarded: !group.boarded }
                                      : group,
                                  ),
                                })
                              }
                            >
                              {g.boarded ? 'Boarded ✓' : 'Board party'}
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="empty-state small">
                          <Users size={28} />
                          <h3>No passengers assigned</h3>
                          <p>
                            Add a reservation to reserve seats on this trip.
                          </p>
                        </div>
                      )}
                    </div>
                    <p className="helper-text">
                      Boarding applies to everyone in a reservation party. Set
                      the trip to Boarding to update attendance.
                    </p>
                  </TabsContent>
                  <TabsContent value="information">
                    <dl className="information-list">
                      <div>
                        <dt>Boarding location</dt>
                        <dd>{selected.meetingPoint}</dd>
                      </div>
                      <div>
                        <dt>Destination</dt>
                        <dd>{selected.destination}</dd>
                      </div>
                      <div>
                        <dt>Transport type</dt>
                        <dd>Shared speedboat</dd>
                      </div>
                      <div>
                        <dt>Seat allocation</dt>
                        <dd>{selected.capacity} seats</dd>
                      </div>
                      <div>
                        <dt>Schedule source</dt>
                        <dd>
                          Customer’s August 2026 timetable; added trips are
                          manual preview entries.
                        </dd>
                      </div>
                      <div>
                        <dt>Operator</dt>
                        <dd>{selected.operator}</dd>
                      </div>
                      <div>
                        <dt>Reporting lead time</dt>
                        <dd>
                          {selected.boardingLeadMinutes} minutes before
                          departure
                        </dd>
                      </div>
                      <div>
                        <dt>Operating notes</dt>
                        <dd>
                          {selected.operatingNotes || 'No additional notes'}
                        </dd>
                      </div>
                      <div>
                        <dt>Travel duration</dt>
                        <dd>
                          {selected.durationMinutes} minutes reserved, including
                          loading and unloading luggage.
                        </dd>
                      </div>
                    </dl>
                  </TabsContent>
                </Tabs>
              </div>
              <div className="sheet-actions">
                <button
                  className="secondary-button"
                  onClick={() => downloadManifest(selected)}
                >
                  Download passenger list
                </button>
                <button
                  className="primary-button"
                  onClick={() => setSelectedId(null)}
                >
                  Done
                </button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDialog(null);
            setError('');
          }
        }}
      >
        <DialogContent
          className={`hotel-dialog ${dialog === 'calendar' ? 'calendar-dialog' : ''}`}
        >
          <DialogHeader>
            <DialogTitle>
              {dialog === 'trip'
                ? 'Add a speedboat trip'
                : dialog === 'passengers'
                  ? 'Add passengers'
                  : dialog === 'calendar'
                    ? 'Monthly schedule'
                    : 'HotelX Transport prototype'}
            </DialogTitle>
            <DialogDescription>
              {dialog === 'trip'
                ? 'Enter a departure confirmed by your transport operator.'
                : dialog === 'passengers'
                  ? `${selected?.time} · ${selected ? selected.capacity - countPassengers(selected) : 0} seats available`
                  : dialog === 'calendar'
                    ? 'Select a date to see its departures.'
                    : 'An initial transport workflow within the HotelX layout.'}
            </DialogDescription>
          </DialogHeader>
          {dialog === 'trip' && (
            <form onSubmit={saveTrip} className="hotel-form">
              <div className="form-grid">
                <label>
                  Travel date
                  <input type="date" name="date" required defaultValue={date} />
                </label>
                <label>
                  Departure time
                  <input
                    type="time"
                    name="time"
                    required
                    defaultValue="09:30"
                  />
                </label>
              </div>
              <label>
                Route
                <Choice
                  label="New trip route"
                  value={formRoute}
                  onChange={changeFormRoute}
                  items={activeRoutes.map((r) => ({
                    value: r.id,
                    label: `${r.origin} → ${r.destination}`,
                  }))}
                />
              </label>
              <label>
                Boat
                <Choice
                  label="Assigned boat"
                  value={formBoat}
                  onChange={setFormBoat}
                  items={activeBoats.map((b) => ({
                    value: b.id,
                    label: `${b.name} · ${b.capacity} seats`,
                  }))}
                />
              </label>
              <p className="helper-text">
                The selected route supplies the operator, journey time and
                boarding location. Boat capacity and operating rules come from
                Hotel Settings → Transport Setup.
              </p>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setDialog(null);
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button
                  className="primary-button"
                  type="submit"
                  disabled={!formRoute || !formBoat}
                >
                  Add trip
                </button>
              </div>
            </form>
          )}
          {dialog === 'passengers' && (
            <form onSubmit={savePassengers} className="hotel-form">
              <label>
                Reservation reference
                <input
                  name="reference"
                  required
                  placeholder="e.g. DEMO-250"
                  maxLength={40}
                />
              </label>
              <label>
                Lead guest
                <input
                  name="name"
                  required
                  placeholder="Full name"
                  maxLength={100}
                />
              </label>
              <div className="form-grid">
                <label>
                  Adults
                  <input
                    type="number"
                    name="adults"
                    required
                    min="1"
                    max={selected?.capacity}
                    step="1"
                    defaultValue="2"
                  />
                </label>
                <label>
                  Children
                  <input
                    type="number"
                    name="children"
                    required
                    min="0"
                    max={selected?.capacity}
                    step="1"
                    defaultValue="0"
                  />
                </label>
              </div>
              <p className="helper-text">
                Each passenger uses one seat in this prototype. Reservation
                references are sample records, not linked to the live hotel
                system.
              </p>
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setDialog(null);
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Confirm passengers
                </button>
              </div>
            </form>
          )}
          {dialog === 'calendar' && (
            <>
              <div className="month-heading">
                <button
                  className="icon-button"
                  aria-label="Previous month"
                  onClick={() =>
                    setMonth(moveDate(`${month}-01`, -1).slice(0, 7))
                  }
                >
                  <ChevronLeft />
                </button>
                <strong>
                  {new Date(`${month}-01T12:00:00`).toLocaleDateString(
                    'en-GB',
                    { month: 'long', year: 'numeric' },
                  )}
                </strong>
                <button
                  className="icon-button"
                  aria-label="Next month"
                  onClick={() =>
                    setMonth(moveDate(`${month}-01`, 32).slice(0, 7))
                  }
                >
                  <ChevronRight />
                </button>
              </div>
              <div className="month-grid">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <span className="weekday" key={d}>
                    {d}
                  </span>
                ))}
                {Array.from(
                  {
                    length: (new Date(`${month}-01T12:00:00`).getDay() + 6) % 7,
                  },
                  (_, i) => (
                    <span key={`blank-${i}`} />
                  ),
                )}
                {Array.from(
                  {
                    length: new Date(
                      Number(month.slice(0, 4)),
                      Number(month.slice(5, 7)),
                      0,
                    ).getDate(),
                  },
                  (_, i) => {
                    const d = `${month}-${String(i + 1).padStart(2, '0')}`;
                    const dayTrips = trips.filter((t) => t.date === d);
                    return (
                      <button
                        key={d}
                        aria-label={`${formatDate(d)}, ${dayTrips.length} trips`}
                        className={`month-day ${date === d ? 'selected' : ''}`}
                        onClick={() => {
                          setDate(d);
                          setQuery('');
                          setRoute('all');
                          setStatusFilter('all');
                          setDialog(null);
                        }}
                      >
                        <strong>{i + 1}</strong>
                        <span>
                          {dayTrips.length
                            ? `${dayTrips.length} trips`
                            : 'No trips'}
                        </span>
                        {dayTrips.length > 0 && <i />}
                      </button>
                    );
                  },
                )}
              </div>
              <p className="helper-text">
                August departures are from the supplied timetable. Passenger
                activity is demonstrated on 3 August.
              </p>
            </>
          )}
          {dialog === 'help' && (
            <div className="help-content">
              <p>
                Explore the August schedule, configure routes and boats in Hotel
                Settings, open a trip, add a sample reservation, and mark
                parties as boarded.
              </p>
              <p>
                Boats, capacities and guest records are demonstration data. All
                changes reset on refresh. Hotel reservations, payments,
                notifications and operator systems are not connected.
              </p>
              <p>
                Booking includes a sample listing and guest details, with a
                Transport card that opens the arrival-date schedule. Transport
                Setup is available under Hotel Settings. Other HotelX sections
                are included as visual context.
              </p>
              <button
                className="primary-button"
                onClick={() => setDialog(null)}
              >
                Got it
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
