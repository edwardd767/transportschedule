'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownUp,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  DoorClosed,
  RotateCw,
  Search,
  SlidersHorizontal,
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

type AdvanceSelectOption = { value: string; label: string };

const BOOKING_SORT_OPTIONS = [
  { key: 'arrival-asc', label: 'Arrival Date (A-Z)' },
  { key: 'arrival-desc', label: 'Arrival Date (Z-A)' },
  { key: 'departure-asc', label: 'Departure Date (A-Z)' },
  { key: 'departure-desc', label: 'Departure Date (Z-A)' },
  { key: 'reference-asc', label: 'Booking No (A-Z)' },
  { key: 'reference-desc', label: 'Booking No (Z-A)' },
  { key: 'created-asc', label: 'Last Created Date (A-Z)' },
  { key: 'created-desc', label: 'Last Created Date (Z-A)' },
  { key: 'guest-asc', label: 'Guest Name (A-Z)' },
  { key: 'guest-desc', label: 'Guest Name (Z-A)' },
] as const;

function compareBookings(a: Booking, b: Booking, sortKey: string) {
  const [field, direction] = sortKey.split('-');
  const factor = direction === 'desc' ? -1 : 1;
  if (field === 'arrival') return a.arrival.localeCompare(b.arrival) * factor;
  if (field === 'departure') return a.departure.localeCompare(b.departure) * factor;
  if (field === 'guest') return a.guest.localeCompare(b.guest) * factor;
  return a.reference.localeCompare(b.reference, undefined, { numeric: true }) * factor;
}

const emptyAdvanceSearch = { arrivalStart: '', arrivalEnd: '', departureStart: '', departureEnd: '', bookingDate: '', status: '', roomType: '', bookingNo: '', guestName: '', accountName: '', referenceNo: '', groupName: '' };

const HOTELX_ROOM_ICON = 'https://hms1.hotelx.asia/static/media/room.7cce94dd.svg';

function RoomIcon({ size = 18 }: { size?: number }) {
  return <img src={HOTELX_ROOM_ICON} alt="" aria-hidden="true" width={size} height={size} style={{ width: size, height: size, display: 'inline-block', objectFit: 'contain', flex: '0 0 auto' }} />;
}

const HOTELX_PERSON_ICON = 'https://hms1.hotelx.asia/static/media/person.eed5ce8b.svg';

function PersonIcon({ size = 18 }: { size?: number }) {
  return <img src={HOTELX_PERSON_ICON} alt="" aria-hidden="true" width={size} height={size} style={{ width: size, height: size, display: 'inline-block', objectFit: 'contain', flex: '0 0 auto' }} />;
}


function AvailabilityIcon({ size = 23 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'block', fill: 'currentColor', flex: '0 0 auto' }}
    >
      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
    </svg>
  );
}

function HotelXSearchIcon({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: 'block', fill: 'currentColor', flex: '0 0 auto' }}>
      <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}

function HotelXAdvanceSearchIcon({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: 'block', fill: 'currentColor', flex: '0 0 auto' }}>
      <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" />
    </svg>
  );
}

function HotelXSortIcon({ size = 23 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" style={{ display: 'block', fill: 'currentColor', flex: '0 0 auto' }}>
      <path d="M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z" />
    </svg>
  );
}

function AdvanceSelect({
  label,
  value,
  placeholder,
  options,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  options: AdvanceSelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className="advance-search-field" ref={wrapperRef} style={{ position: 'relative' }}>
      <span>{label}</span>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        style={{
          width: '100%',
          minHeight: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          padding: '5px 0 7px',
          border: 0,
          borderBottom: '1px solid #aaa',
          borderRadius: 0,
          outline: 'none',
          boxShadow: 'none',
          background: 'transparent',
          color: '#222',
          textAlign: 'left',
          font: 'inherit',
        }}
      >
        <span style={{ color: selected ? '#222' : '#777' }}>{selected?.label ?? placeholder}</span>
        <ChevronDown size={16} color="#666" />
      </button>
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            zIndex: 120,
            top: 'calc(100% + 2px)',
            left: 0,
            right: 0,
            maxHeight: 230,
            overflowY: 'auto',
            border: '1px solid #ddd',
            borderRadius: 3,
            background: '#fff',
            boxShadow: '0 5px 16px rgba(0,0,0,.18)',
          }}
        >
          {[{ value: '', label: placeholder }, ...options].map((option) => {
            const active = option.value === value;
            return (
              <button
                key={option.value || '__empty'}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={{
                  width: '100%',
                  display: 'block',
                  padding: '9px 11px',
                  border: 0,
                  outline: 'none',
                  boxShadow: 'none',
                  background: active ? '#f0f0f0' : '#fff',
                  color: '#222',
                  textAlign: 'left',
                  font: 'inherit',
                }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BookingOccupancy({ booking }: { booking: Booking }) {
  const totalRooms = roomCount(booking);
  const inhouse = booking.status === 'Inhouse';
  const checkedInRooms = inhouse ? Math.min(booking.assignedRooms, totalRooms) : 0;
  const checkedInGuests = inhouse ? Math.min(booking.checkedInGuests, booking.guests) : 0;

  return (
    <span className="booking-occupancy">
      <span aria-label={`${checkedInRooms} of ${totalRooms} rooms checked in`}>
        <RoomIcon size={18} />
        <span className={checkedInRooms < totalRooms ? 'booking-incomplete' : ''}>
          {checkedInRooms}
        </span>
        / {totalRooms}
      </span>
      <span aria-label={`${checkedInGuests} of ${booking.guests} guests checked in`}>
        <PersonIcon size={18} />
        <span className={checkedInGuests < booking.guests ? 'booking-incomplete' : ''}>
          {checkedInGuests}
        </span>
        / {booking.guests}
      </span>
    </span>
  );
}

export function Bookings({
  paxCountPolicy = "",
  childRatesApplied = false,
  childAgePolicy = 0,
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
  childAgePolicy?: number;
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
  const [sortKey, setSortKey] = useState('created-desc');
  const [sortOpen, setSortOpen] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);
  const [advance, setAdvance] = useState(emptyAdvanceSearch);
  const [appliedAdvance, setAppliedAdvance] = useState(emptyAdvanceSearch);
  const [statusFilter, setStatusFilter] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previousScroll = useRef(0);
  const lastBooking = useRef<string | null>(null);
  const hasFilters = Boolean(query || Object.values(appliedAdvance).some(Boolean));
  const filtered = bookings.filter((item) => {
    if (query.trim() && !`${item.reference} ${item.guest}`.toLowerCase().includes(query.trim().toLowerCase())) return false;
    if (statusFilter && item.status !== statusFilter) return false;
    if (appliedAdvance.arrivalStart && item.arrival < appliedAdvance.arrivalStart) return false;
    if (appliedAdvance.arrivalEnd && item.arrival > appliedAdvance.arrivalEnd) return false;
    if (appliedAdvance.departureStart && item.departure < appliedAdvance.departureStart) return false;
    if (appliedAdvance.departureEnd && item.departure > appliedAdvance.departureEnd) return false;
    if (appliedAdvance.status && item.status !== appliedAdvance.status) return false;
    if (appliedAdvance.roomType && !item.rooms.some((room) => room.code === appliedAdvance.roomType)) return false;
    if (appliedAdvance.bookingNo && !item.reference.toLowerCase().includes(appliedAdvance.bookingNo.toLowerCase())) return false;
    if (appliedAdvance.guestName && !item.guest.toLowerCase().includes(appliedAdvance.guestName.toLowerCase())) return false;
    if (appliedAdvance.accountName && !(item.accountName ?? '').toLowerCase().includes(appliedAdvance.accountName.toLowerCase())) return false;
    if (appliedAdvance.referenceNo && !(item.referenceNo ?? '').toLowerCase().includes(appliedAdvance.referenceNo.toLowerCase())) return false;
    if (appliedAdvance.groupName && !(item.groupName ?? '').toLowerCase().includes(appliedAdvance.groupName.toLowerCase())) return false;
    return true;
  });
  const shown = [...filtered].sort((a, b) => compareBookings(a, b, sortKey));

  useEffect(() => {
    if (!sortOpen) return;
    const closeSort = (event: MouseEvent) => {
      if (!sortRef.current?.contains(event.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', closeSort);
    return () => document.removeEventListener('mousedown', closeSort);
  }, [sortOpen]);

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
    const handleBookingBack = (event: Event) => {
      if (createOpen) {
        event.preventDefault();
        setCreateOpen(false);
        return;
      }
      if (editing) {
        event.preventDefault();
        onEditingChange(false);
        return;
      }
      if (billingOpen) {
        event.preventDefault();
        setBillingOpen(false);
        return;
      }
      if (billingInstructionOpen) {
        event.preventDefault();
        setBillingInstructionOpen(false);
        return;
      }
      if (specialRequestOpen) {
        event.preventDefault();
        setSpecialRequestOpen(false);
        return;
      }
      if (attachmentsOpen) {
        event.preventDefault();
        setAttachmentsOpen(false);
        return;
      }
      if (roomingOpen) {
        event.preventDefault();
        setRoomingOpen(false);
      }
    };
    window.addEventListener('hotelx-booking-back', handleBookingBack);
    return () => window.removeEventListener('hotelx-booking-back', handleBookingBack);
  }, [attachmentsOpen, billingInstructionOpen, billingOpen, createOpen, editing, onEditingChange, roomingOpen, specialRequestOpen]);


  function openBooking(item: Booking) {
    previousScroll.current = listRef.current?.scrollTop ?? 0;
    lastBooking.current = item.reference;
    onSelect(item);
  }
  function resetFilters() {
    setQuery('');
    setStatusFilter('');
    setAdvance(emptyAdvanceSearch);
    setAppliedAdvance(emptyAdvanceSearch);
  }

  function resetAdvance() {
    setAdvance(emptyAdvanceSearch);
  }

  if (createOpen) {
    return (
      <BookingCreate
        childRatesApplied={childRatesApplied}
        childAgePolicy={childAgePolicy}
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
    if (roomingOpen) return <RoomingList paxCountPolicy={paxCountPolicy} childAgePolicy={childAgePolicy} rateSetup={rateSetup} booking={booking} profiles={guestProfiles} onProfilesSave={onGuestProfilesSave} onBookingSave={onUpdate} onBack={() => setRoomingOpen(false)} />;
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
          <BookingEdit childRatesApplied={childRatesApplied} childAgePolicy={childAgePolicy} rateSetup={rateSetup} bookings={bookings} booking={booking} roomTypes={roomTypes} salesChannels={salesChannels} onCancel={() => onEditingChange(false)} onNotice={onNotice} onUpdate={async (value) => { await onUpdate(value); onEditingChange(false); }} />
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
            <img src="https://hms1.hotelx.asia/static/media/audit.da3ff731.svg" alt="" aria-hidden="true" width={17} height={17} style={{ display: 'block', objectFit: 'contain' }} />
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
          <button className="icon-button" aria-label="Search bookings" title="Search bookings" aria-pressed={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><HotelXSearchIcon size={23} /></button>
          <button className="icon-button" aria-label="Advance search" title="Advance search" aria-pressed={advanceOpen} onClick={() => { setAdvance(appliedAdvance); setAdvanceOpen(true); }}><HotelXAdvanceSearchIcon size={23} /></button>
          <div className="booking-sort-wrap" ref={sortRef}>
            <button className="icon-button" aria-label="Sort by" title="Sort by" aria-expanded={sortOpen} aria-pressed={sortOpen} onClick={() => setSortOpen((current) => !current)}><HotelXSortIcon size={23} /></button>
            {sortOpen && (
              <div className="booking-sort-menu" role="radiogroup" aria-label="sortby">
                <span className="booking-sort-head">Sort By</span>
                {BOOKING_SORT_OPTIONS.map((option) => (
                  <label className="booking-sort-option" key={option.key}>
                    <input type="radio" name="booking-sort" checked={sortKey === option.key} onChange={() => { setSortKey(option.key); setSortOpen(false); }} />
                    <svg className="booking-sort-radio" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true" focusable="false">
                      {sortKey === option.key
                        ? <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                        : <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />}
                    </svg>
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <button className="icon-button" aria-label="View availability" title="View availability" onClick={() => setAvailabilityOpen(true)}><AvailabilityIcon size={23} /></button>
        </div>
      </div>
      {(searchOpen || query || hasFilters) && (
        <div className="booking-filters">
          {(searchOpen || query) && (
            <label className="search-field"><Search size={17} /><input autoFocus={searchOpen} aria-label="Search booking reference or guest" placeholder="Search reference or guest" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
          )}
        </div>
      )}
      {advanceOpen && (
        <div
          className="advance-search-layer"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '72px 16px 24px',
          }}
        >
          <button
            type="button"
            className="advance-search-scrim"
            aria-label="Close advance search"
            onClick={() => setAdvanceOpen(false)}
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          />
          <dialog
            open
            className="advance-search-panel"
            aria-label="Advance Search"
            style={{
              position: 'relative',
              inset: 'auto',
              margin: 0,
              width: 'min(520px, calc(100vw - 32px))',
              maxWidth: 520,
              maxHeight: 'calc(100dvh - 96px)',
              padding: 0,
              border: 0,
              borderRadius: 4,
              overflow: 'hidden',
              background: '#fff',
              boxShadow: '0 12px 38px rgba(0,0,0,.32)',
              zIndex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div className="advance-search-head" style={{ flex: '0 0 auto' }}>
              <strong>Advance Search</strong>
              <button type="button" className="advance-search-reset" onClick={resetAdvance}><RotateCw size={15} /> Reset</button>
            </div>
            <div className="advance-search-body" style={{ overflowY: 'auto', minHeight: 0, flex: '1 1 auto' }}>
              <div className="advance-search-group">
                <span className="advance-search-group-label">Arrival Date</span>
                <div className="advance-search-pair">
                  <div className="advance-search-field"><span>Start Date</span><HotelDatePicker value={advance.arrivalStart} onChange={(value) => setAdvance({ ...advance, arrivalStart: value })} ariaLabel="Arrival start date" editable /></div>
                  <div className="advance-search-field"><span>End Date</span><HotelDatePicker value={advance.arrivalEnd} onChange={(value) => setAdvance({ ...advance, arrivalEnd: value })} ariaLabel="Arrival end date" editable /></div>
                </div>
              </div>
              <div className="advance-search-group">
                <span className="advance-search-group-label">Departure Date</span>
                <div className="advance-search-pair">
                  <div className="advance-search-field"><span>Start Date</span><HotelDatePicker value={advance.departureStart} onChange={(value) => setAdvance({ ...advance, departureStart: value })} ariaLabel="Departure start date" editable /></div>
                  <div className="advance-search-field"><span>End Date</span><HotelDatePicker value={advance.departureEnd} onChange={(value) => setAdvance({ ...advance, departureEnd: value })} ariaLabel="Departure end date" editable /></div>
                </div>
              </div>
              <div className="advance-search-field"><span>Booking Date</span><HotelDatePicker value={advance.bookingDate} onChange={(value) => setAdvance({ ...advance, bookingDate: value })} ariaLabel="Booking date" editable /></div>
              <AdvanceSelect label="Status" value={advance.status} placeholder="Select status" options={advanceStatusOptions} onChange={(status) => setAdvance({ ...advance, status })} />
              <AdvanceSelect label="Room Type" value={advance.roomType} placeholder="Select room type" options={roomTypes.map((room) => ({ value: room.code, label: `${room.code} - ${room.description}` }))} onChange={(roomType) => setAdvance({ ...advance, roomType })} />
              <label className="advance-search-field"><span>Booking No</span><input placeholder=" " value={advance.bookingNo} onChange={(event) => setAdvance({ ...advance, bookingNo: event.target.value })} /></label>
              <label className="advance-search-field"><span>Guest Name</span><input placeholder=" " value={advance.guestName} onChange={(event) => setAdvance({ ...advance, guestName: event.target.value })} /></label>
              <label className="advance-search-field"><span>Account Name</span><input placeholder=" " value={advance.accountName} onChange={(event) => setAdvance({ ...advance, accountName: event.target.value })} /></label>
              <label className="advance-search-field"><span>Reference No</span><input placeholder=" " value={advance.referenceNo} onChange={(event) => setAdvance({ ...advance, referenceNo: event.target.value })} /></label>
              <label className="advance-search-field"><span>Group Name</span><input placeholder=" " value={advance.groupName} onChange={(event) => setAdvance({ ...advance, groupName: event.target.value })} /></label>
            </div>
            <div className="advance-search-actions" style={{ flex: '0 0 auto' }}>
              <button type="button" className="primary-button" onClick={() => { setAdvance(appliedAdvance); setAdvanceOpen(false); }}>Cancel</button>
              <button type="button" className="primary-button" onClick={() => { setAppliedAdvance(advance); setAdvanceOpen(false); }}>Confirm</button>
            </div>
          </dialog>
        </div>
      )}
      <div className="booking-legend" aria-label="Booking statuses">
        {bookingStatuses.map((item) => (
          <button type="button" key={item} className={statusFilter === item ? 'is-active' : ''} aria-pressed={statusFilter === item} title={`Filter ${item}`} onClick={() => setStatusFilter((current) => current === item ? '' : item)}><i className={bookingStatusClass(item)} />{item}</button>
        ))}
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
        <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor" aria-hidden="true" focusable="false"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>
      </button>
      {availabilityOpen && <AvailabilityDialog bookings={bookings} roomTypes={roomTypes} onClose={() => setAvailabilityOpen(false)} />}
    </section>
  );
}