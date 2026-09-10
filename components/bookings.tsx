'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  DoorClosed,
  Plus,
  RotateCw,
  Search,
  SlidersHorizontal,
  UserRound,
  X,
} from 'lucide-react';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import {
  bookingAmount,
  bookingStatusClass,
  bookingStatuses,
  roomCount,
  stayDates,
  type Booking,
} from '@/lib/bookings';
import type { HotelRoomType, HotelSegment } from '@/lib/hotel-masters';
import { BookingCreate } from '@/components/booking-create';
import { BookingEdit } from '@/components/booking-edit';
import { BillingSchedule } from '@/components/billing-schedule';
import { BillingInstruction } from '@/components/billing-instruction';
import { SpecialRequest } from '@/components/special-request';
import { BookingAttachments } from '@/components/booking-attachments';
import { AvailabilityDialog } from '@/components/availability-dialog';
import type { BookingTransportLeg } from '@/lib/booking-transport';
import type { RateSetupData } from '@/lib/rate-setup-data';
import type { GuestProfile } from '@/lib/transport-state';
import { RoomingList } from '@/components/rooming-list';

const advanceStatusOptions = [
  { value: 'Booked', label: 'Booked' },
  { value: 'Cancelled', label: 'Cancelled' },
  { value: 'No Show', label: 'NoShow' },
  { value: 'Inhouse', label: 'Inhouse' },
  { value: 'Checkout', label: 'CheckOut' },
  { value: 'Waitlist', label: 'Waitlist' },
];

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
  paxCountPolicy = "",
  childRatesApplied = false,
  bookings,
  roomTypes,
  rateSetup,
  segments,
  salesChannels,
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
  guestProfiles,
  onGuestProfilesSave,
  onRoomingOpen,
}: {
  paxCountPolicy?: string;
  childRatesApplied?: boolean;
  bookings: Booking[];
  roomTypes: HotelRoomType[];
  rateSetup: RateSetupData;
  segments: HotelSegment[];
  salesChannels: string[];
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
  guestProfiles: GuestProfile[];
  onGuestProfilesSave: (profiles: GuestProfile[]) => Promise<void>;
  onRoomingOpen: (reference: string) => Promise<void>;
}) {
  const totalWithTransport = (item: Booking) => {
    const transport = bookingLegs
      .filter((leg) => leg.bookingReference === item.reference && leg.incidentalCharge?.chargeId)
      .reduce((total, leg) => total + (leg.adults ?? leg.passengers) * (leg.incidentalCharge?.adultRate ?? 0) + (leg.children ?? 0) * (leg.incidentalCharge?.childRate ?? 0) + (leg.infants ?? 0) * (leg.incidentalCharge?.infantRate ?? 0), 0);
    return bookingAmount({ ...item, amount: item.amount + transport });
  };
  const [searchOpen, setSearchOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [billingInstructionOpen, setBillingInstructionOpen] = useState(false);
  const [specialRequestOpen, setSpecialRequestOpen] = useState(false);
  const [attachmentsOpen, setAttachmentsOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [roomingOpen, setRoomingOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [oldestFirst, setOldestFirst] = useState(false);
  const [advance, setAdvance] = useState({ arrivalStart: '', arrivalEnd: '', departureStart: '', departureEnd: '', bookingDate: '', status: '', roomType: '', bookingNo: '', guestName: '', accountName: '', referenceNo: '', groupName: '' });
  const listRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousScroll = useRef(0);
  const lastBooking = useRef<string | null>(null);
  const hasFilters = Boolean(query || Object.values(advance).some(Boolean));
  const filtered = bookings.filter((item) => {
    if (query.trim() && !`${item.reference} ${item.guest}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (advance.arrivalStart && item.arrival < advance.arrivalStart) return false;
    if (advance.arrivalEnd && item.arrival > advance.arrivalEnd) return false;
    if (advance.departureStart && item.departure < advance.departureStart) return false;
    if (advance.departureEnd && item.departure > advance.departureEnd) return false;
    if (advance.status && item.status !== advance.status) return false;
    if (advance.roomType && !item.rooms.some((room) => room.code === advance.roomType)) return false;
    if (advance.bookingNo && !item.reference.toLowerCase().includes(advance.bookingNo.toLowerCase())) return false;
    if (advance.guestName && !item.guest.toLowerCase().includes(advance.guestName.toLowerCase())) return false;
    if (advance.accountName && !(item.accountName ?? '').toLowerCase().includes(advance.accountName.toLowerCase())) return false;
    if (advance.referenceNo && !(item.referenceNo ?? '').toLowerCase().includes(advance.referenceNo.toLowerCase())) return false;
    if (advance.groupName && !(item.groupName ?? '').toLowerCase().includes(advance.groupName.toLowerCase())) return false;
    return true;
  });
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
    setAdvance({ arrivalStart: '', arrivalEnd: '', departureStart: '', departureEnd: '', bookingDate: '', status: '', roomType: '', bookingNo: '', guestName: '', accountName: '', referenceNo: '', groupName: '' });
  }

  if (createOpen) {
    return (
      <BookingCreate
        childRatesApplied={childRatesApplied}
        bookings={bookings}
        roomTypes={roomTypes}
        rateSetup={rateSetup}
        segments={segments}
        salesChannels={salesChannels}
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
    if (roomingOpen) return <RoomingList paxCountPolicy={paxCountPolicy} rateSetup={rateSetup} booking={booking} profiles={guestProfiles} onProfilesSave={onGuestProfilesSave} onBookingSave={onUpdate} onBack={() => setRoomingOpen(false)} />;
    if (billingInstructionOpen) return <BillingInstruction booking={booking} onSave={onUpdate} onBack={() => setBillingInstructionOpen(false)} />;
    if (specialRequestOpen) return <SpecialRequest booking={booking} onSave={onUpdate} onBack={() => setSpecialRequestOpen(false)} />;
    if (attachmentsOpen) return <BookingAttachments booking={booking} onSave={onUpdate} onBack={() => setAttachmentsOpen(false)} />;
    if (billingOpen) return <BillingSchedule booking={booking} bookingLegs={bookingLegs} rateSetup={rateSetup} onSave={onUpdate} onBack={() => setBillingOpen(false)} />;
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
              <strong className="booking-amount">{totalWithTransport(booking)}</strong>
            </div>
            <div className="booking-detail-bottom"><span>{booking.reference} <span className="booking-divider">|</span> {booking.guest}</span></div>
          </div>
          <BookingEdit childRatesApplied={childRatesApplied} rateSetup={rateSetup} bookings={bookings} booking={booking} roomTypes={roomTypes} salesChannels={salesChannels} onCancel={() => onEditingChange(false)} onNotice={onNotice} onUpdate={async (value) => { await onUpdate(value); onEditingChange(false); }} />
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
      { title: 'Billing Instruction', description: booking.cityAccount || booking.billingRemark ? `${booking.cityAccount ? 'City Account: Yes' : 'City Account: No'}${booking.billingRemark ? ` · ${booking.billingRemark}` : ''}` : 'No billing instruction' },
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
            <strong className="booking-amount">{totalWithTransport(booking)}</strong>
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
                    : section.title === 'Rooming List'
                      ? void onRoomingOpen(booking.reference).then(() => setRoomingOpen(true)).catch(error => onNotice(error.message))
                    : section.title === 'Special Request'
                      ? setSpecialRequestOpen(true)
                    : section.title === 'Billing Instruction'
                      ? setBillingInstructionOpen(true)
                    : section.title === 'Attachments'
                      ? setAttachmentsOpen(true)
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
          <button className="icon-button" aria-label="Advance search" title="Advance search" aria-pressed={advanceOpen} onClick={() => setAdvanceOpen(true)}><SlidersHorizontal size={23} /></button>
          <button className="icon-button" aria-label={oldestFirst ? 'Sort newest bookings first' : 'Sort oldest bookings first'} title={oldestFirst ? 'Oldest bookings first' : 'Newest bookings first'} aria-pressed={oldestFirst} onClick={() => setOldestFirst(!oldestFirst)}><ArrowDownUp size={23} /></button>
          <button className="icon-button" aria-label="View availability" title="View availability" onClick={() => setAvailabilityOpen(true)}><CalendarDays size={23} /></button>
        </div>
      </div>
      {(searchOpen || query || hasFilters) && (
        <div className="booking-filters">
          {(searchOpen || query) && (
            <label className="search-field"><Search size={17} /><input autoFocus={searchOpen} aria-label="Search booking reference or guest" placeholder="Search reference or guest" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          )}
          {hasFilters && <button className="secondary-button" onClick={resetFilters}><X size={15} /> Clear filters</button>}
        </div>
      )}
      {advanceOpen && (
        <div className="advance-search-layer">
          <button type="button" className="advance-search-scrim" aria-label="Close advance search" onClick={() => setAdvanceOpen(false)} />
          <dialog open className="advance-search-panel" aria-label="Advance Search">
            <div className="advance-search-head">
              <strong>Advance Search</strong>
              <button type="button" className="advance-search-reset" onClick={resetFilters}><RotateCw size={15} /> Reset</button>
            </div>
            <div className="advance-search-body">
              <div className="advance-search-group">
                <span className="advance-search-group-label">Arrival Date</span>
                <div className="advance-search-pair">
                  <div className="advance-search-field"><span>Start Date</span><HotelDatePicker value={advance.arrivalStart} onChange={(value) => setAdvance({ ...advance, arrivalStart: value })} ariaLabel="Arrival start date" /></div>
                  <div className="advance-search-field"><span>End Date</span><HotelDatePicker value={advance.arrivalEnd} onChange={(value) => setAdvance({ ...advance, arrivalEnd: value })} ariaLabel="Arrival end date" /></div>
                </div>
              </div>
              <div className="advance-search-group">
                <span className="advance-search-group-label">Departure Date</span>
                <div className="advance-search-pair">
                  <div className="advance-search-field"><span>Start Date</span><HotelDatePicker value={advance.departureStart} onChange={(value) => setAdvance({ ...advance, departureStart: value })} ariaLabel="Departure start date" /></div>
                  <div className="advance-search-field"><span>End Date</span><HotelDatePicker value={advance.departureEnd} onChange={(value) => setAdvance({ ...advance, departureEnd: value })} ariaLabel="Departure end date" /></div>
                </div>
              </div>
              <div className="advance-search-field"><span>Booking Date</span><HotelDatePicker value={advance.bookingDate} onChange={(value) => setAdvance({ ...advance, bookingDate: value })} ariaLabel="Booking date" /></div>
              <label className="advance-search-field"><span>Status</span><select value={advance.status} onChange={(event) => setAdvance({ ...advance, status: event.target.value })}><option value="">Select status</option>{advanceStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
              <label className="advance-search-field"><span>Room Type</span><select value={advance.roomType} onChange={(event) => setAdvance({ ...advance, roomType: event.target.value })}><option value="">Select room type</option>{roomTypes.map((room) => <option key={room.code} value={room.code}>{room.code} - {room.description}</option>)}</select></label>
              <label className="advance-search-field"><span>Booking No</span><input value={advance.bookingNo} onChange={(event) => setAdvance({ ...advance, bookingNo: event.target.value })} /></label>
              <label className="advance-search-field"><span>Guest Name</span><input value={advance.guestName} onChange={(event) => setAdvance({ ...advance, guestName: event.target.value })} /></label>
              <label className="advance-search-field"><span>Account Name</span><input value={advance.accountName} onChange={(event) => setAdvance({ ...advance, accountName: event.target.value })} /></label>
              <label className="advance-search-field"><span>Reference No</span><input value={advance.referenceNo} onChange={(event) => setAdvance({ ...advance, referenceNo: event.target.value })} /></label>
              <label className="advance-search-field"><span>Group Name</span><input value={advance.groupName} onChange={(event) => setAdvance({ ...advance, groupName: event.target.value })} /></label>
            </div>
            <div className="advance-search-actions">
              <button type="button" className="primary-button" onClick={() => setAdvanceOpen(false)}>Cancel</button>
              <button type="button" className="primary-button" onClick={() => setAdvanceOpen(false)}>Confirm</button>
            </div>
          </dialog>
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
                <strong className="booking-amount">{totalWithTransport(item)}</strong>
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
      {availabilityOpen && <AvailabilityDialog bookings={bookings} roomTypes={roomTypes} onClose={() => setAvailabilityOpen(false)} />}
    </section>
  );
}
