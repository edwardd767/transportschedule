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
  checkinSvg,
  groupCheckinSvg,
  checkoutSvg,
  roomAssignmentSvg,
  stayViewSvg,
  inhouseGuestSvg,
  serviceRequestSvg,
} from './frontdesk-icons';
import {
  SidebarProvider,
  Sidebar,
  SidebarContent,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Choice } from '@/components/hotel-choice';
import { TransportSetup } from '@/components/transport-setup';
import { Bookings } from '@/components/bookings';
import { sampleBookings, type Booking } from '@/lib/bookings';
import { MonthTimetable } from '@/components/month-timetable';
import { ScheduleTemplates } from '@/components/schedule-templates';
import { BookingTransfers } from '@/components/booking-transfers';
import { EditTransportTrip } from '@/components/edit-transport-trip';
import {
  TransportConnection,
  TransportDataContext,
  TransportRecovery,
} from '@/components/transport-connection';
import { useTransportData, type TransportData } from '@/lib/use-transport-data';
import { generateTemplate } from '@/lib/transport-planning';
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
  tripFromSetup,
  countPassengers,
  formatDate,
  moveDate,
  type Trip,
} from '@/lib/transport';

function SvgIcon({ size = 24, markup }: { size?: number; markup: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 30 30"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

const frontDeskMenu = [
  {
    key: 'check-in',
    label: 'Check-in',
    detail: 'Check-in: 1 out of 1',
    svg: checkinSvg,
  },
  {
    key: 'group-check-in',
    label: 'Group Check In',
    detail: 'Check-in: 0 out of 0',
    svg: groupCheckinSvg,
  },
  {
    key: 'check-out',
    label: 'Check Out',
    detail: 'Check-Out: 1 out of 8',
    svg: checkoutSvg,
  },
  {
    key: 'room-assignment',
    label: 'Room Assignment',
    detail: 'Assign Room: 0',
    svg: roomAssignmentSvg,
  },
  {
    key: 'stay-view',
    label: 'Stay View',
    detail: 'Guest Room Location',
    svg: stayViewSvg,
  },
  {
    key: 'inhouse-guest',
    label: 'Inhouse Guest',
    detail: 'In House: 82 Room(s) | 91 Guest(s)',
    svg: inhouseGuestSvg,
  },
  {
    key: 'transport',
    label: 'Transport',
    detail: 'Speedboat schedule & passengers',
    icon: Ship,
    view: 'schedule' as const,
  },
  {
    key: 'service-request',
    label: 'Service Request',
    detail: 'Task To Complete: 0',
    svg: serviceRequestSvg,
  },
];

export default function Home() {
  const store = useTransportData();
  return (
    <TransportDataContext.Provider value={store}>
      <HomeContent store={store} />
    </TransportDataContext.Provider>
  );
}

function HomeContent({ store }: { store: TransportData }) {
  const [date, setDate] = useState('2026-08-03');
  const [route, setRoute] = useState('all');
  const [query, setQuery] = useState('');
  const [view, setView] = useState<
    'schedule' | 'setup' | 'booking' | 'frontdesk'
  >('booking');
  const [bookingReference, setBookingReference] = useState<string | null>(null);
  const activeBooking =
    sampleBookings.find((booking) => booking.reference === bookingReference) ??
    null;
  const { setup, trips, templates, dayNotes } = store.state;
  const [scheduleView, setScheduleView] = useState<'day' | 'month'>('day');
  const [boatFilter, setBoatFilter] = useState('all');
  const [transferBooking, setTransferBooking] = useState<Booking | null>(null);
  const [editingTrip, setEditingTrip] = useState<Trip | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = trips.find((t) => t.id === selectedId) ?? null;
  const [dialog, setDialog] = useState<'trip' | 'passengers' | 'help' | null>(
    null,
  );
  const [formRoute, setFormRoute] = useState('inbound');
  const [formBoat, setFormBoat] = useState('boat-3');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [month, setMonth] = useState('2026-08');
  const tripState = useRef(trips);
  useEffect(() => {
    tripState.current = trips;
  }, [trips]);
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
  function statusOf(t: Trip) {
    return t.status === 'Scheduled' && countPassengers(t) >= t.capacity
      ? 'Full'
      : t.status;
  }
  async function saveTrip(event: FormEvent<HTMLFormElement>) {
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
      await store.run({
        type: 'addTrip',
        values: {
          id: trip.id,
          date: trip.date,
          time: trip.time,
          routeId: formRoute,
          boatId: formBoat,
        },
      });
      setDate(trip.date);
      setMonth(trip.date.slice(0, 7));
      setBoatFilter('all');
      setRoute('all');
      setQuery('');
      setStatusFilter('all');
      setDialog(null);
      setNotice(
        `${trip.time} ${trip.origin} → ${trip.destination} trip added.`,
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function savePassengers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const form = new FormData(event.currentTarget);
    try {
      await store.run({
        type: 'passengers',
        tripId: selected.id,
        group: {
          id: crypto.randomUUID(),
          name: String(form.get('name')),
          reference: String(form.get('reference')),
          adults: Number(form.get('adults')),
          children: Number(form.get('children')),
          boarded: false,
        },
      });
      setDialog(null);
      setNotice('Passengers added. Seat availability has been updated.');
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function changeStatus(value: string) {
    if (!selected) return;
    if (value === 'Completed' && selected.groups.some((g) => !g.boarded)) {
      setError('Board all assigned parties before completing this trip.');
      return;
    }
    try {
      await store.run({
        type: 'status',
        tripId: selected.id,
        status: value as Trip['status'],
      });
      setError('');
      setNotice(`Trip ${selected.id} is now ${value.toLowerCase()}.`);
    } catch (e) {
      setError((e as Error).message);
    }
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
      (boatFilter === 'all' || t.boatId === boatFilter) &&
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
          <TransportConnection store={store} />
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
            <button
              className={
                view === 'frontdesk' || view === 'schedule' ? 'active' : ''
              }
              aria-current={
                view === 'frontdesk' || view === 'schedule' ? 'page' : undefined
              }
              onClick={() => setView('frontdesk')}
            >
              <ConciergeBell />
              Front Desk
            </button>
            {(view === 'frontdesk' || view === 'schedule') && (
              <div className="subnav">
                <button
                  className={view === 'schedule' ? 'active' : ''}
                  onClick={() => setView('schedule')}
                >
                  Transport
                </button>
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
            ) : view === 'frontdesk' ? (
              <span>Front Desk</span>
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
            transportSummary={
              activeBooking
                ? trips
                    .filter((trip) =>
                      trip.groups.some(
                        (group) => group.bookingId === activeBooking.reference,
                      ),
                    )
                    .map(
                      (trip) =>
                        `${trip.toHotel ? 'Arrival' : 'Return'}: ${trip.date} ${trip.time} · ${trip.boat}${trip.status === 'Cancelled' ? ' (Cancelled — reassign)' : ''}`,
                    )
                    .join(' | ')
                : undefined
            }
            onOpenTransport={setTransferBooking}
          />
        ) : view === 'setup' ? (
          <div className="settings-scroll" key="setup">
            <TransportSetup
              key={store.mode}
              config={setup}
              onChange={async (value) => {
                await store.run({ type: 'setup', value });
              }}
              onBack={() => setView('schedule')}
              onNotice={setNotice}
              scheduleTemplates={
                <ScheduleTemplates
                  setup={setup}
                  templates={templates}
                  trips={trips}
                  onChange={async (value) => {
                    await store.run({ type: 'templates', value });
                  }}
                  onGenerate={async (template) => {
                    const result = generateTemplate(trips, setup, template);
                    await store.run({ type: 'generate', template });
                    setDate(template.startDate);
                    setMonth(template.startDate.slice(0, 7));
                    setScheduleView('month');
                    setBoatFilter('all');
                    setRoute('all');
                    setNotice(
                      `${result.added.length} departures generated. ${result.skipped} existing departures skipped.`,
                    );
                  }}
                />
              }
            />
          </div>
        ) : view === 'frontdesk' ? (
          <div className="frontdesk-scroll" key="frontdesk">
            <div className="listing-title">
              <div>
                <h1>Front Desk</h1>
                <span className="context-tag">
                  <ConciergeBell size={14} /> Operations
                </span>
              </div>
            </div>
            <div className="frontdesk-menu">
              {frontDeskMenu.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    className="frontdesk-item"
                    onClick={() => {
                      if (item.view) {
                        setView(item.view);
                      } else {
                        setNotice(
                          `${item.label} is a preview entry and is not connected to live hotel data.`,
                        );
                      }
                    }}
                  >
                    <span className="frontdesk-icon">
                      {item.svg ? (
                        <SvgIcon size={30} markup={item.svg} />
                      ) : Icon ? (
                        <Icon size={30} />
                      ) : null}
                    </span>
                    <span className="frontdesk-body">
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </span>
                    <ChevronRight size={18} className="frontdesk-chevron" />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            <div className="listing-title">
              <div>
                <h1>
                  {scheduleView === 'month'
                    ? 'Transport Calendar'
                    : 'Transport Listing'}{' '}
                  <span>
                    (
                    {scheduleView === 'month'
                      ? trips.filter((trip) => trip.date.startsWith(month))
                          .length
                      : daily.length}
                    )
                  </span>
                </h1>
                <span className="context-tag">
                  <Ship size={14} /> Speedboat
                </span>
              </div>
              <div className="schedule-view-actions">
                <div
                  className="schedule-view-switch"
                  aria-label="Schedule view"
                >
                  <button
                    aria-pressed={scheduleView === 'day'}
                    onClick={() => setScheduleView('day')}
                  >
                    <List size={16} /> Day list
                  </button>
                  <button
                    aria-pressed={scheduleView === 'month'}
                    onClick={() => {
                      setMonth(date.slice(0, 7));
                      setScheduleView('month');
                    }}
                  >
                    <CalendarDays size={16} /> Month calendar
                  </button>
                </div>
                <button
                  className="primary-button"
                  onClick={() => {
                    if (scheduleView === 'month' && !date.startsWith(month))
                      setDate(`${month}-01`);
                    openDialog('trip');
                  }}
                >
                  <Plus size={19} /> Add trip
                </button>
              </div>
            </div>
            {scheduleView === 'month' ? (
              <MonthTimetable
                month={month}
                onMonth={setMonth}
                trips={trips}
                setup={setup}
                boat={boatFilter}
                route={route}
                onBoat={setBoatFilter}
                onRoute={setRoute}
                notes={dayNotes}
                onNote={async (date, note) => {
                  await store.run({ type: 'dayNote', date, note });
                  setNotice('Daily notes saved.');
                }}
                onDay={(date) => {
                  setDate(date);
                  setStatusFilter('all');
                  setQuery('');
                  setScheduleView('day');
                }}
                onTrip={(trip) => {
                  setSelectedId(trip.id);
                  setError('');
                }}
                onAdd={(date) => {
                  setDate(date);
                  openDialog('trip');
                }}
              />
            ) : (
              <>
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
                      {new Date(`${date}T12:00:00`).toLocaleDateString(
                        'en-GB',
                        { month: 'long', year: 'numeric' },
                      )}{' '}
                      schedule
                      <small>
                        {date.startsWith('2026-08')
                          ? 'Customer timetable + added trips'
                          : 'Scheduled departures'}
                      </small>
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
                    <Choice
                      label="Filter trips by boat"
                      value={boatFilter}
                      onChange={setBoatFilter}
                      items={[
                        { value: 'all', label: 'All boats' },
                        ...setup.boats.map((boat) => ({
                          value: boat.id,
                          label: boat.name,
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
                      onClick={() => {
                        setMonth(date.slice(0, 7));
                        setScheduleView('month');
                      }}
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
                    key={`${date}-${route}-${boatFilter}-${statusFilter}-${query}`}
                  >
                    {dayNotes[date] && (
                      <div className="day-tide-notes">
                        <strong>
                          {dayNotes[date].holiday || 'Daily tide notes'}
                        </strong>
                        {dayNotes[date].tide && (
                          <span>Tide window: {dayNotes[date].tide}</span>
                        )}
                        {dayNotes[date].restricted && (
                          <span>Restricted: {dayNotes[date].restricted}</span>
                        )}
                        {dayNotes[date].notes && (
                          <span>{dayNotes[date].notes}</span>
                        )}
                      </div>
                    )}
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
                                <ChevronRight
                                  className="card-chevron"
                                  size={22}
                                />
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
                              setBoatFilter('all');
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
                        <Clock3 size={14} /> All times are local · Malaysia
                        (GMT+8)
                      </span>
                    </footer>
                    <div className="operating-note">
                      <Waves size={19} />
                      <p>
                        <strong>Operating notes</strong> Service hours for new
                        trips: {setup.rules.start}–{setup.rules.end}. Departures
                        are subject to operator confirmation and weather
                        conditions.
                      </p>
                    </div>
                    <div className="demo-note">
                      {store.mode === 'cloud'
                        ? 'Shared transport data. Changes are saved after confirmation from the database.'
                        : 'Demo mode: changes reset on refresh. Open your private link to save transport changes.'}
                    </div>
                  </div>
                </section>
              </>
            )}
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
              <TransportRecovery />
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
                <button
                  className="secondary-button edit-departure-button"
                  disabled={
                    selected.status === 'Completed' ||
                    selected.status === 'Cancelled' ||
                    selected.groups.some((group) => group.boarded)
                  }
                  onClick={() => setEditingTrip(selected)}
                >
                  Edit departure
                </button>
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
                              disabled={
                                selected.status !== 'Boarding' ||
                                Boolean(store.pending)
                              }
                              onClick={async () => {
                                try {
                                  await store.run({
                                    type: 'board',
                                    tripId: selected.id,
                                    groupId: g.id,
                                    boarded: !g.boarded,
                                  });
                                  setError('');
                                } catch (e) {
                                  setError((e as Error).message);
                                }
                              }}
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
                          manual or template-generated preview entries.
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
        <DialogContent className="hotel-dialog">
          <DialogHeader>
            <DialogTitle>
              {dialog === 'trip'
                ? 'Add a speedboat trip'
                : dialog === 'passengers'
                  ? 'Add passengers'
                  : 'HotelX Transport prototype'}
            </DialogTitle>
            <DialogDescription>
              {dialog === 'trip'
                ? 'Enter a departure confirmed by your transport operator.'
                : dialog === 'passengers'
                  ? `${selected?.time} · ${selected ? selected.capacity - countPassengers(selected) : 0} seats available`
                  : 'An initial transport workflow within the HotelX layout.'}
            </DialogDescription>
          </DialogHeader>
          <TransportRecovery />
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
                  disabled={Boolean(store.pending) || !formRoute || !formBoat}
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
                <button
                  className="primary-button"
                  type="submit"
                  disabled={Boolean(store.pending)}
                >
                  Confirm passengers
                </button>
              </div>
            </form>
          )}
          {dialog === 'help' && (
            <div className="help-content">
              <p>
                Explore the August schedule, configure routes and boats in Hotel
                Settings, open a trip, add a sample reservation, and mark
                parties as boarded.
              </p>
              <p>
                Boats, capacities and guest records start as demonstration data.
                Open your private link to keep transport changes across
                refreshes. Hotel reservations, payments, notifications and
                operator systems are not connected.
              </p>
              <p>
                Booking includes a sample listing and guest details, with a
                Transport card for assigning arrival and return departures.
                Transport Setup is available under Hotel Settings. Other HotelX
                sections are included as visual context.
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
      {transferBooking && (
        <BookingTransfers
          key={transferBooking.reference}
          booking={transferBooking}
          trips={trips}
          onClose={() => setTransferBooking(null)}
          onSave={async (selection) => {
            await store.run({
              type: 'transfers',
              bookingReference: transferBooking.reference,
              selection,
            });
            setNotice('Booking transfers saved. Seat availability updated.');
          }}
          onCalendar={(date) => {
            setTransferBooking(null);
            setDate(date);
            setMonth(date.slice(0, 7));
            setRoute('all');
            setBoatFilter('all');
            setView('schedule');
            setScheduleView('month');
          }}
        />
      )}
      {editingTrip && (
        <EditTransportTrip
          key={editingTrip.id}
          trip={editingTrip}
          setup={setup}
          onClose={() => setEditingTrip(null)}
          onSave={async (values) => {
            const current = trips.find((trip) => trip.id === editingTrip.id);
            if (!current)
              throw new Error('This departure is no longer available.');
            await store.run({
              type: 'editTrip',
              values: { ...values, id: current.id },
            });
            setDate(values.date);
            setMonth(values.date.slice(0, 7));
            setNotice('Departure updated. Existing passengers have been kept.');
          }}
        />
      )}
    </SidebarProvider>
  );
}
