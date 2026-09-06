'use client';

import { useEffect, useRef, useState } from 'react';
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
  bookingAmount,
  bookingStatusClass,
  bookingStatuses,
  roomCount,
  stayDates,
  type Booking,
} from '@/lib/bookings';
import type { HotelRoomType } from '@/lib/hotel-masters';
import { BookingCreate } from '@/components/booking-create';
import { BookingEdit } from '@/components/booking-edit';
import { BillingSchedule } from '@/components/billing-schedule';
import type { BookingTransportLeg } from '@/lib/booking-transport';

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
  onUpdate,
  editing,
  onEditingChange,
  transportSummary,
  bookingLegs,
}: {
  bookings: Booking[];
  roomTypes: HotelRoomType[];
  booking: Booking | null;
  onSelect: (booking: Booking) => void;
  onOpenTransport: (booking: Booking) => void;
  onNotice: (message: string) => void;
  onCreate: (booking: Booking) => Promise<void>;
  onUpdate: (booking: Booking) => Promise<void>;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  transportSummary?: string;
  bookingLegs: BookingTransportLeg[];
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
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

  if (createOpen) {
    return (
      <BookingCreate
        bookings={bookings}
        roomTypes={roomTypes}
        onCancel={() => setCreateOpen(false)}
        onNotice={onNotice}
        onCreate={async (value) => {
          await onCreate(value);
          setCreateOpen(false);
        }}
      />
    );
  }

  if (booking) {
    if (billingOpen) return <BillingSchedule booking={booking} bookingLegs={bookingLegs} onBack={() => setBillingOpen(false)} />;
    const rooms = booking.rooms.map((room) => `${room.code} : ${room.count}`).join('   ');
    const assignments =
      booking.rooms.length === 1
        ? `${booking.rooms[0].code} : ${booking.assignedRooms}/${roomCount(booking)}`
        : `${booking.assignedRooms}/${roomCount(booking)} rooms assigned`;
    if (editing) {
      return (
        <section className="booking-workspace booking-edit-workspace" aria-label="Edit booking">
          <h1 className="sr-only" tabIndex={-1} ref={headingRef}>Edit booking {booking.reference} — {booking.guest}</h1>
          <div className="booking-detail-summary booking-edit-summary">
            <div className="booking-detail-top">
              <div className="booking-stay"><strong>{stayDates(booking)}</strong><BookingOccupancy booking={booking} /></div>
              <strong className="booking-amount">{bookingAmount(booking)}</strong>
            </div>
            <div className="booking-detail-bottom"><span>{booking.reference} <span className="booking-divider">|</span> {booking.guest}</span></div>
          </div>
          <BookingEdit booking={booking} roomTypes={roomTypes} onCancel={() => onEditingChange(false)} onNotice={onNotice} onUpdate={async (value) => { await onUpdate(value); onEditingChange(false); }} />
        </section>
      );
    }
    const sections = [
      { title: 'Clone Booking' },
      { title: 'Booking Info', description: 'Group: No   Source: Booking' },
      { title: 'Rooming List', description: rooms },
      { title: 'Room Assignment', description: assignments },
      { title: 'Room Upgrade', description: assignments },
      { title: 'Transport', description: transportSummary || 'Arrival and return transfers' },
      { title: 'Special Request' },
      { title: 'Remarks' },
      { title: 'Incidental Charges', description: '0.00' },
      { title: 'Advance Payment', description: 'Total Amt: 0.00' },
      { title: 'Billing Instruction', description: booking.accountName ? `Account: ${booking.accountName}` : 'No billing instruction' },
      { title: 'Confirmation Letter', description: 'Not sent' },
      { title: 'Proforma Invoice', description: 'Not sent' },
      { title: 'Attachments', description: 'No record' },
      { title: 'Billing Schedule', description: `${booking.rooms.length} Rate Code${booking.rooms.length === 1 ? '' : 's'}: ${booking.rooms.map((room) => room.rateCode || 'BAR').join(', ')}` },
      { title: 'House Limit', description: '0.00' },
      { title: 'Booking Cancellation | Reinstatement', description: booking.status === 'Cancelled' ? 'Booking cancelled' : 'Active booking' },
      { title: 'Room Cancellation | Reinstatement', description: 'All rooms active' },
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
                  : section.title === 'Booking Info'
                    ? onEditingChange(true)
                    : section.title === 'Billing Schedule'
                      ? setBillingOpen(true)
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
        onClick={() => setCreateOpen(true)}
      >
        <Plus size={28} />
      </button>
    </section>
  );
}
