'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  ArrowDownUp,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  DoorClosed,
  Plus,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';
import { Choice } from '@/components/hotel-choice';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  bookingAmount,
  bookingStatusClass,
  bookingStatuses,
  roomCount,
  stayDates,
  type Booking,
} from '@/lib/bookings';
import { nextBookingReference, type HotelRoomType } from '@/lib/hotel-masters';

function BookingOccupancy({ booking }: { booking: Booking }) {
  return (
    <span className="booking-occupancy">
      <span aria-label={`${booking.assignedRooms} of ${roomCount(booking)} rooms assigned`}>
        <DoorClosed size={18} aria-hidden="true" />
        <span className={booking.assignedRooms < roomCount(booking) ? 'booking-incomplete' : ''}>
          {booking.assignedRooms}
        </span>
        / {roomCount(booking)}
      </span>
      <span aria-label={`${booking.checkedInGuests} of ${booking.guests} guests checked in`}>
        <UserRound size={18} aria-hidden="true" />
        <span className={booking.checkedInGuests < booking.guests ? 'booking-incomplete' : ''}>
          {booking.checkedInGuests}
        </span>
        / {booking.guests}
      </span>
    </span>
  );
}

export function Bookings({
  bookings,
  roomTypes,
  booking,
  onSelect,
  onOpenTransport,
  onNotice,
  onCreate,
  transportSummary,
}: {
  bookings: Booking[];
  roomTypes: HotelRoomType[];
  booking: Booking | null;
  onSelect: (booking: Booking) => void;
  onOpenTransport: (booking: Booking) => void;
  onNotice: (message: string) => void;
  onCreate: (booking: Booking) => Promise<void>;
  transportSummary?: string;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createRoomType, setCreateRoomType] = useState(
    roomTypes.find((item) => item.active)?.code ?? '',
  );
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [arrivalDate, setArrivalDate] = useState('');
  const [oldestFirst, setOldestFirst] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousScroll = useRef(0);
  const lastBooking = useRef<string | null>(null);
  const hasFilters = Boolean(query || arrivalDate || status !== 'all');
  const filtered = bookings.filter(
    (item) =>
      (status === 'all' || item.status === status) &&
      (!arrivalDate || item.arrival === arrivalDate) &&
      `${item.reference} ${item.guest}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const shown = oldestFirst ? [...filtered].reverse() : filtered;

  useEffect(() => {
    if (booking) {
      headingRef.current?.focus({ preventScroll: true });
    } else if (listRef.current && lastBooking.current) {
      listRef.current.scrollTop = previousScroll.current;
      listRef.current
        .querySelector<HTMLButtonElement>(`[data-booking="${lastBooking.current}"]`)
        ?.focus({ preventScroll: true });
    }
  }, [booking]);

  useEffect(() => {
    if (!roomTypes.some((item) => item.code === createRoomType && item.active)) {
      setCreateRoomType(roomTypes.find((item) => item.active)?.code ?? '');
    }
  }, [roomTypes, createRoomType]);

  function openBooking(item: Booking) {
    previousScroll.current = listRef.current?.scrollTop ?? 0;
    lastBooking.current = item.reference;
    onSelect(item);
  }
  function resetFilters() {
    setQuery('');
    setStatus('all');
    setArrivalDate('');
  }
  async function createBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomCountValue = Number(form.get('roomCount'));
    const guests = Number(form.get('guests'));
    const amount = Number(form.get('amount'));
    try {
      setCreating(true);
      setCreateError('');
      const value: Booking = {
        reference: nextBookingReference(bookings),
        guest: String(form.get('guest') ?? ''),
        arrival: String(form.get('arrival') ?? ''),
        departure: String(form.get('departure') ?? ''),
        status: 'Booked',
        rooms: [{ code: createRoomType, count: roomCountValue }],
        assignedRooms: 0,
        checkedInGuests: 0,
        guests,
        amount,
      };
      await onCreate(value);
      setCreateOpen(false);
      onNotice(`Booking ${value.reference} created using Room Type ${createRoomType}.`);
    } catch (error) {
      setCreateError((error as Error).message);
    } finally {
      setCreating(false);
    }
  }

  if (booking) {
    const rooms = booking.rooms.map((room) => `${room.code} : ${room.count}`).join('   ');
    const assignments =
      booking.rooms.length === 1
        ? `${booking.rooms[0].code} : ${booking.assignedRooms}/${roomCount(booking)}`
        : `${booking.assignedRooms}/${roomCount(booking)} rooms assigned`;
    const sections = [
      { title: 'Clone Booking' },
      { title: 'Booking Info', description: 'Group: No   Source: Booking' },
      { title: 'Rooming List', description: rooms },
      { title: 'Room Assignment', description: assignments },
      { title: 'Room Upgrade', description: assignments },
      { title: 'Transport', description: transportSummary || 'Arrival and return transfers' },
      { title: 'Special Request' },
      { title: 'Remarks' },
    ];
    return (
      <section className="booking-workspace" aria-label="Booking details">
        <h1 className="sr-only" tabIndex={-1} ref={headingRef}>
          Booking {booking.reference} — {booking.guest}
        </h1>
        <div className="booking-detail-summary">
          <div className="booking-detail-top">
            <div className="booking-stay">
              <strong>{stayDates(booking)}</strong>
              <BookingOccupancy booking={booking} />
            </div>
            <strong className="booking-amount">{bookingAmount(booking)}</strong>
          </div>
          <div className="booking-detail-bottom">
            <span>{booking.reference} <span className="booking-divider">|</span> {booking.guest}</span>
            <ClipboardList size={20} aria-hidden="true" />
          </div>
        </div>
        <div className="booking-detail-scroll" key={booking.reference}>
          {sections.map((section) => (
            <button
              key={section.title}
              className={`booking-section-card${section.title === 'Transport' ? ' booking-transport-card' : ''}`}
              onClick={() =>
                section.title === 'Transport'
                  ? onOpenTransport(booking)
                  : onNotice(`${section.title} is shown for reference. Editing this booking section is not included yet.`)
              }
            >
              <span>
                <strong>{section.title}</strong>
                {section.description && <small>{section.description}</small>}
              </span>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="booking-workspace" aria-label="Booking listing">
      <div className="listing-title booking-listing-title">
        <h1>Booking Listing <span>({shown.length})</span></h1>
        <div className="booking-toolbar">
          <button className="icon-button" aria-label="Search bookings" title="Search bookings" aria-pressed={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><Search size={23} /></button>
          <button className="icon-button" aria-label="Filter bookings" title="Filter bookings" aria-pressed={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={23} /></button>
          <button className="icon-button" aria-label={oldestFirst ? 'Sort newest bookings first' : 'Sort oldest bookings first'} title={oldestFirst ? 'Oldest bookings first' : 'Newest bookings first'} aria-pressed={oldestFirst} onClick={() => setOldestFirst(!oldestFirst)}><ArrowDownUp size={23} /></button>
          <button className="icon-button" aria-label="Filter by arrival date" title="Filter by arrival date" aria-pressed={calendarOpen} onClick={() => setCalendarOpen(!calendarOpen)}><CalendarDays size={23} /></button>
        </div>
      </div>
      {(searchOpen || filtersOpen || calendarOpen || hasFilters) && (
        <div className="booking-filters">
          {(searchOpen || query) && (
            <label className="search-field"><Search size={17} /><input autoFocus={searchOpen} aria-label="Search booking reference or guest" placeholder="Search reference or guest" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          )}
          {(filtersOpen || status !== 'all') && (
            <Choice label="Booking status" value={status} onChange={setStatus} items={[{ value: 'all', label: 'All statuses' }, ...bookingStatuses.map((value) => ({ value, label: value }))]} />
          )}
          {(calendarOpen || arrivalDate) && (
            <label className="booking-date-filter">Arrival date<HotelDatePicker value={arrivalDate} onChange={setArrivalDate} ariaLabel="Arrival date" /></label>
          )}
          {hasFilters && <button className="secondary-button" onClick={resetFilters}><X size={15} /> Clear filters</button>}
        </div>
      )}
      <div className="booking-legend" aria-label="Booking statuses">
        {bookingStatuses.map((item) => <span key={item}><i className={bookingStatusClass(item)} />{item}</span>)}
      </div>
      <div className="booking-list-scroll" ref={listRef}>
        <div className="booking-list">
          {shown.map((item) => (
            <button className={`booking-row ${bookingStatusClass(item.status)}`} key={item.reference} data-booking={item.reference} onClick={() => openBooking(item)} aria-label={`Open booking ${item.reference} for ${item.guest}, ${item.status}`}>
              <div className="booking-copy">
                <div className="booking-stay"><strong className={item.highlightDates ? 'booking-highlight' : ''}>{stayDates(item)}</strong><BookingOccupancy booking={item} /></div>
                <span className="booking-guest">{item.reference} <span className="booking-divider">|</span> {item.guest}</span>
              </div>
              <div className="booking-price-room">
                <strong className="booking-amount">{bookingAmount(item)}</strong>
                <span>{item.rooms.map((room) => <span key={room.code}>{room.code}/<b>{room.count}</b></span>)}</span>
              </div>
              <ChevronRight size={22} aria-hidden="true" />
            </button>
          ))}
          {!shown.length && (
            <div className="empty-state"><CalendarDays size={32} /><h3>No bookings found</h3><p>Try another guest name, status or arrival date.</p><button className="secondary-button" onClick={resetFilters}>Clear filters</button></div>
          )}
        </div>
      </div>
      <button
        className="booking-add"
        aria-label="Add booking"
        title={roomTypes.some((item) => item.active) ? 'Add booking' : 'Set up an active Room Type first'}
        disabled={!roomTypes.some((item) => item.active)}
        onClick={() => {
          setCreateError('');
          setCreateRoomType(roomTypes.find((item) => item.active)?.code ?? '');
          setCreateOpen(true);
        }}
      >
        <Plus size={28} />
      </button>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="booking-create-dialog">
          <DialogHeader>
            <DialogTitle>Create booking</DialogTitle>
            <DialogDescription>Room Type is selected from Hotel Settings → Room Type master.</DialogDescription>
          </DialogHeader>
          <form className="dialog-form" onSubmit={createBooking}>
            <label>Guest name<input name="guest" required maxLength={120} /></label>
            <div className="two-col">
              <label>Arrival date<HotelDatePicker name="arrival" required defaultValue="2026-09-05" ariaLabel="Arrival date" /></label>
              <label>Departure date<HotelDatePicker name="departure" required defaultValue="2026-09-06" ariaLabel="Departure date" /></label>
            </div>
            <label>Room type<Choice label="Room type" value={createRoomType} onChange={setCreateRoomType} items={roomTypes.filter((item) => item.active).map((item) => ({ value: item.code, label: `${item.code} - ${item.description}` }))} /></label>
            <div className="two-col">
              <label>No. of rooms<input type="number" name="roomCount" min="1" defaultValue="1" required /></label>
              <label>No. of guests<input type="number" name="guests" min="1" defaultValue="1" required /></label>
            </div>
            <label>Booking amount (RM)<input type="number" name="amount" min="0" step="0.01" defaultValue="0" required /></label>
            {createError && <p className="form-error">{createError}</p>}
            <div className="dialog-actions">
              <button type="button" className="secondary-button" onClick={() => setCreateOpen(false)}>Cancel</button>
              <button type="submit" className="primary-button" disabled={creating || !createRoomType}>{creating ? 'Saving…' : 'Save booking'}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
