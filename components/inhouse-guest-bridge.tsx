'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRightLeft,
  ArrowUpDown,
  ChevronRight,
  RotateCw,
  Search,
} from 'lucide-react';

const HOTELX_MEDIA = 'https://hms1.hotelx.asia/static/media';
const CHECKIN_CANCEL_ICON = `${HOTELX_MEDIA}/checkin.d4105e6c.svg`;
const ROOM_ICON = `${HOTELX_MEDIA}/room.7cce94dd.svg`;
const AUDIT_ICON = `${HOTELX_MEDIA}/audit.da3ff731.svg`;
const PERSON_ICON = `${HOTELX_MEDIA}/person.eed5ce8b.svg`;

function HotelxIcon({ src, size }: { src: string; size: number }) {
  return <img src={src} alt="" aria-hidden="true" width={size} height={size} style={{ width: size, height: size, display: 'inline-block', objectFit: 'contain', flex: '0 0 auto' }} />;
}

function CalendarIcon({ size = 12 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" /></svg>;
}

function QrIcon({ size = 17 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm12-2h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm-4-4h2v2h-2v-2zm0 4h2v2h-2v-2z" /></svg>;
}

function MenuDivider() {
  return <span className="inhouse-menu-divider" aria-hidden="true" />;
}
import type { TransportData } from '@/lib/use-transport-data';
import { salesChannelsFromDepartments } from '@/lib/hotel-masters';
import { HotelxBackButton } from '@/components/hotelx-back-button';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { RoomingList } from '@/components/rooming-list';
import { SpecialRequest } from '@/components/special-request';
import { BillingInstruction } from '@/components/billing-instruction';
import { BookingAttachments } from '@/components/booking-attachments';
import { BillingSchedule } from '@/components/billing-schedule';
import type { Booking } from '@/lib/bookings';
import './inhouse-guest-bridge.css';

const SOURCE_OPTIONS = ['Walk In', 'Booking', 'OTA', 'Corporate', 'Channel Manager', 'Travel Agent'];

function MalaysiaFlag({ size = 16 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 16" width={size} height={(size * 16) / 24} aria-hidden="true" focusable="false">
      <rect width="24" height="16" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((row) => <rect key={row} y={row} width="24" height="1" fill="#cc0001" />)}
      {[1, 3, 5, 7, 9, 11, 13, 15].map((row) => <rect key={row} y={row} width="24" height="1" fill="#cc0001" />)}
      <rect width="12" height="9" fill="#010066" />
      <circle cx="5.6" cy="4.5" r="2.7" fill="#ffcc00" />
      <circle cx="6.7" cy="4.5" r="2.4" fill="#010066" />
      <path d="M8.6 2.6l.5 1.4 1.5.1-1.2.9.4 1.4-1.2-.9-1.2.9.4-1.4-1.2-.9 1.5-.1z" fill="#ffcc00" />
    </svg>
  );
}

function formatStayDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

type InhouseRow = {
  key: string;
  roomNo: string;
  roomType: string;
  guest: string;
  accountName: string;
  arrival: string;
  departure: string;
  reference: string;
  referenceNo: string;
  groupName: string;
  location: string;
  pax: number;
  roomCount: number;
  rateCode: string;
  source: string;
  isGroup: boolean;
  cityAccount: boolean;
  houseLimit: number;
  amount: number;
  attachmentCount: number;
};

const SORT_OPTIONS = [
  { key: 'arrival-asc', label: 'Arrival Date (A-Z)' },
  { key: 'arrival-desc', label: 'Arrival Date (Z-A)' },
  { key: 'departure-asc', label: 'Departure Date (A-Z)' },
  { key: 'departure-desc', label: 'Departure Date (Z-A)' },
  { key: 'reference-asc', label: 'Booking No (A-Z)' },
  { key: 'reference-desc', label: 'Booking No (Z-A)' },
  { key: 'room-asc', label: 'Room No (Low-High)' },
  { key: 'room-desc', label: 'Room No (High-Low)' },
  { key: 'guest-asc', label: 'Guest Name (A-Z)' },
  { key: 'guest-desc', label: 'Guest Name (Z-A)' },
  { key: 'location-asc', label: 'Location (Low-High)' },
  { key: 'location-desc', label: 'Location (High-Low)' },
] as const;

const emptyAdvance = {
  arrivalStart: '',
  arrivalEnd: '',
  departureStart: '',
  departureEnd: '',
  bookingNo: '',
  roomNo: '',
  guestName: '',
  accountName: '',
  referenceNo: '',
  groupName: '',
};

function compareRows(a: InhouseRow, b: InhouseRow, sortKey: string) {
  const [field, direction] = sortKey.split('-');
  const factor = direction === 'desc' ? -1 : 1;
  if (field === 'arrival') return a.arrival.localeCompare(b.arrival) * factor;
  if (field === 'departure') return a.departure.localeCompare(b.departure) * factor;
  if (field === 'reference') return a.reference.localeCompare(b.reference, undefined, { numeric: true }) * factor;
  if (field === 'guest') return a.guest.localeCompare(b.guest) * factor;
  if (field === 'location') return a.location.localeCompare(b.location, undefined, { numeric: true }) * factor;
  return a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }) * factor;
}

export function InhouseGuestBridge({ store }: { store: TransportData }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sortOpen, setSortOpen] = useState(false);
  const [sortKey, setSortKey] = useState('room-asc');
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [advance, setAdvance] = useState(emptyAdvance);
  const [appliedAdvance, setAppliedAdvance] = useState(emptyAdvance);
  const [selected, setSelected] = useState<InhouseRow | null>(null);
  const resetAdvance = () => setAdvance(emptyAdvance);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const { bookings, hotelMasters } = store.state;

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const frontDeskItem = target?.closest<HTMLButtonElement>('.frontdesk-item');
      if (frontDeskItem && frontDeskItem.textContent?.includes('Inhouse Guest')) {
        event.preventDefault();
        event.stopPropagation();
        setOpen(true);
        return;
      }

      if (open && target?.closest('.main-nav > button, .subnav button')) {
        setOpen(false);
      }
    };

    document.addEventListener('click', onDocumentClick, true);
    return () => document.removeEventListener('click', onDocumentClick, true);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setPortalTarget(null);
      setAdvanceOpen(false);
      setSortOpen(false);
      setSelected(null);
      return;
    }

    const workspace = document.querySelector<HTMLElement>('.workspace');
    if (!workspace) return;
    const previousPosition = workspace.style.position;
    if (getComputedStyle(workspace).position === 'static') workspace.style.position = 'relative';
    setPortalTarget(workspace);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSelected((current) => {
        if (!current) setOpen(false);
        return null;
      });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      workspace.style.position = previousPosition;
    };
  }, [open]);

  const rows = useMemo<InhouseRow[]>(() => {
    const roomCursor = new Map<string, number>();
    const activeRoomsByType = new Map<string, typeof hotelMasters.rooms>();

    hotelMasters.roomTypes
      .filter((type) => type.active)
      .forEach((type) => {
        activeRoomsByType.set(
          type.code,
          hotelMasters.rooms
            .filter((room) => room.active && room.roomTypeCode === type.code)
            .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true })),
        );
      });

    return bookings
      .filter((booking) => booking.status === 'Inhouse')
      .flatMap((booking) =>
        booking.rooms.flatMap((room) =>
          Array.from({ length: Math.max(1, room.count) }, (_, index) => {
            const availableRooms = activeRoomsByType.get(room.code) ?? [];
            const cursor = roomCursor.get(room.code) ?? 0;
            const assigned = availableRooms[cursor];
            roomCursor.set(room.code, cursor + 1);
            return {
              key: `${booking.reference}-${room.code}-${index}`,
              roomNo: assigned?.roomNo ?? '-',
              roomType: room.code,
              guest: booking.guest,
              accountName: booking.accountName?.trim() || booking.guest,
              arrival: booking.arrival,
              departure: booking.departure,
              reference: booking.reference,
              referenceNo: booking.referenceNo ?? '',
              groupName: booking.groupName ?? '',
              location: assigned?.locationCode ?? '',
              pax: Math.max(0, (room.adults ?? booking.guests ?? 1) + (room.children ?? 0)),
              roomCount: Math.max(1, room.count),
              rateCode: room.rateCode?.trim() || 'BAR',
              source: (booking.source || booking.salesChannel || 'Walk In').replace(/_/g, ' '),
              isGroup: Boolean(booking.groupName?.trim()),
              cityAccount: Boolean(booking.cityAccount),
              houseLimit: booking.creditLimit ?? 100,
              amount: booking.amount,
              attachmentCount: booking.attachments?.length ?? 0,
            };
          }),
        ),
      );
  }, [bookings, hotelMasters]);

  const shownRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows
      .filter((row) => {
        if (!search) return true;
        return [row.roomNo, row.roomType, row.guest, row.accountName, row.reference]
          .join(' ')
          .toLowerCase()
          .includes(search);
      })
      .filter((row) => {
        if (appliedAdvance.arrivalStart && row.arrival < appliedAdvance.arrivalStart) return false;
        if (appliedAdvance.arrivalEnd && row.arrival > appliedAdvance.arrivalEnd) return false;
        if (appliedAdvance.departureStart && row.departure < appliedAdvance.departureStart) return false;
        if (appliedAdvance.departureEnd && row.departure > appliedAdvance.departureEnd) return false;
        if (appliedAdvance.bookingNo && !row.reference.toLowerCase().includes(appliedAdvance.bookingNo.toLowerCase())) return false;
        if (appliedAdvance.roomNo && !row.roomNo.toLowerCase().includes(appliedAdvance.roomNo.toLowerCase())) return false;
        if (appliedAdvance.guestName && !row.guest.toLowerCase().includes(appliedAdvance.guestName.toLowerCase())) return false;
        if (appliedAdvance.accountName && !row.accountName.toLowerCase().includes(appliedAdvance.accountName.toLowerCase())) return false;
        if (appliedAdvance.referenceNo && !row.referenceNo.toLowerCase().includes(appliedAdvance.referenceNo.toLowerCase())) return false;
        if (appliedAdvance.groupName && !row.groupName.toLowerCase().includes(appliedAdvance.groupName.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => compareRows(a, b, sortKey));
  }, [appliedAdvance, query, rows, sortKey]);

  if (!open || !portalTarget) return null;

  if (selected)
    return createPortal(
      <InhouseDetail row={selected} hotelName={hotelMasters.profile.hotelName} store={store} onBack={() => setSelected(null)} />,
      portalTarget,
    );

  return createPortal(
    <section className="inhouse-screen" aria-label="In House Listing">
      <header className="inhouse-property">
        <div className="inhouse-property-main">
          <HotelxBackButton onClick={() => setOpen(false)} label="Back to Front Desk" />
          <div className="inhouse-property-copy">
            <small>HMS</small>
            <strong>{hotelMasters.profile.hotelName}</strong>
          </div>
          <span className="inhouse-switch" aria-hidden="true">
            <ArrowRightLeft size={14} />
          </span>
        </div>
        <div className="inhouse-crumb">
          <span>Front Desk</span>
          <strong>In House</strong>
        </div>
      </header>

      <div className="inhouse-toolbar">
        <strong>
          In House Listing <em>({rows.length})</em>
        </strong>
        <div className="inhouse-tools">
          <label className="inhouse-search">
            <Search size={20} />
            <input
              aria-label="Search in-house guests"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search"
            />
          </label>
          <button
            type="button"
            aria-label="Advance search"
            aria-pressed={advanceOpen}
            className={Object.values(appliedAdvance).some(Boolean) ? 'active' : ''}
            onClick={() => {
              setAdvance(appliedAdvance);
              setAdvanceOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor" aria-hidden="true" focusable="false"><path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z" /></svg>
          </button>
          <div className="inhouse-filter-wrap">
            <button
              type="button"
              aria-label="Sort listing"
              aria-expanded={sortOpen}
              className={sortKey !== 'room-asc' ? 'active' : ''}
              onClick={() => setSortOpen((value) => !value)}
            >
              <ArrowUpDown size={20} />
            </button>
            {sortOpen && (
              <div className="inhouse-filter-menu inhouse-sort-menu">
                <span className="inhouse-sort-head">Sort By</span>
                {SORT_OPTIONS.map((option) => (
                  <label className="inhouse-sort-option" key={option.key}>
                    <input
                      type="radio"
                      name="inhouse-sort"
                      checked={sortKey === option.key}
                      onChange={() => {
                        setSortKey(option.key);
                        setSortOpen(false);
                      }}
                    />
                    <svg className="inhouse-sort-radio" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true" focusable="false">
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
        </div>
      </div>

      <div className="inhouse-list">
        {shownRows.length ? (
          shownRows.map((row) => (
            <button type="button" className="inhouse-card" key={row.key} onClick={() => setSelected(row)}>
              <div className="inhouse-card-copy">
                <div className="inhouse-room-line">
                  <b>{row.roomNo}</b>
                  <strong>{row.roomType}</strong>
                  <span className="inhouse-divider" />
                  <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" aria-hidden="true" focusable="false"><path d="M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z" /></svg>
                  <span>
                    {formatStayDate(row.arrival)} - {formatStayDate(row.departure)}
                  </span>
                </div>
                <div className="inhouse-guest-line">
                  <svg viewBox="0 0 24 24" width={12} height={12} fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                  <span>{row.accountName}</span>
                </div>
              </div>
              <span className="inhouse-ref">{row.reference}</span>
              <ChevronRight size={18} className="inhouse-chevron" />
            </button>
          ))
        ) : (
          <div className="inhouse-empty">No in-house guest found.</div>
        )}
      </div>

      {advanceOpen && (
        <div className="advance-search-layer" style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--sidebar-width, 206px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <button type="button" className="advance-search-scrim" aria-label="Close advance search" onClick={() => setAdvanceOpen(false)} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
          <dialog open className="advance-search-panel" aria-label="Advance Search" style={{ position: 'relative', inset: 'auto', margin: 0, width: 'min(500px, calc(100vw - 32px))', maxWidth: 500, maxHeight: 'calc(100dvh - 48px)', padding: 0, border: 0, borderRadius: 4, overflow: 'hidden', background: '#fff', boxShadow: '0 12px 38px rgba(0,0,0,.32)', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
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
              <label className="advance-search-field"><span>Booking No</span><input placeholder=" " value={advance.bookingNo} onChange={(event) => setAdvance({ ...advance, bookingNo: event.target.value })} /></label>
              <label className="advance-search-field"><span>Room No</span><input placeholder=" " value={advance.roomNo} onChange={(event) => setAdvance({ ...advance, roomNo: event.target.value })} /></label>
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
    </section>,
    portalTarget,
  );
}

type InhouseMenuRow = { label: string; info: ReactNode; badge?: ReactNode; disabled?: boolean };

function InhouseDetail({ row: sourceRow, hotelName, store, onBack }: { row: InhouseRow; hotelName: string; store: TransportData; onBack: () => void }) {
  const [panel, setPanel] = useState<'menu' | 'bookingInfo' | 'roomingList' | 'specialRequest' | 'billingInstruction' | 'attachments' | 'billingSchedule'>('menu');
  const booking = store.state.bookings.find((item) => item.reference === sourceRow.reference);
  const row: InhouseRow = booking
    ? {
        ...sourceRow,
        guest: booking.guest,
        accountName: booking.accountName?.trim() || booking.guest,
        isGroup: Boolean(booking.groupName?.trim()),
        cityAccount: Boolean(booking.cityAccount),
        source: booking.source?.replace(/_/g, ' ') || sourceRow.source,
        attachmentCount: booking.attachments?.length ?? 0,
      }
    : sourceRow;
  const money = (value: number) => value.toFixed(2);

  if (panel === 'bookingInfo')
    return <InhouseBookingInfo row={row} hotelName={hotelName} store={store} onBack={() => setPanel('menu')} />;

  if (panel === 'roomingList' && booking)
    return (
      <div className="inhouse-screen">
        <RoomingList
          paxCountPolicy={store.state.hotelMasters.profile.paxCount}
          rateSetup={store.state.rateSetup}
          booking={booking}
          profiles={store.state.guestProfiles}
          onProfilesSave={async (value) => {
            await store.run({ type: 'guestProfilesSave', value });
          }}
          onBookingSave={async (value) => {
            await store.run({ type: 'bookingUpdate', value });
          }}
          onBack={() => setPanel('menu')}
        />
      </div>
    );

  const saveBooking = async (value: Booking) => {
    await store.run({ type: 'bookingUpdate', value });
  };

  if (panel === 'attachments' && booking)
    return (
      <div className="inhouse-screen">
        <InhousePropertyHeader hotelName={hotelName} segments={['Front Desk', 'In House', 'Attachments']} reference={row.reference} onBack={() => setPanel('menu')} />
        <div className="inhouse-subpage-scroll">
          <BookingAttachments booking={booking} onSave={saveBooking} onBack={() => setPanel('menu')} />
        </div>
      </div>
    );

  if (panel === 'billingSchedule' && booking)
    return (
      <div className="inhouse-screen">
        <InhousePropertyHeader hotelName={hotelName} segments={['Front Desk', 'In House', 'Billing Schedule']} reference={row.reference} onBack={() => setPanel('menu')} />
        <div className="inhouse-subpage-scroll">
          <BillingSchedule booking={booking} bookingLegs={store.state.bookingLegs} rateSetup={store.state.rateSetup} onSave={saveBooking} onBack={() => setPanel('menu')} />
        </div>
      </div>
    );

  const rows: InhouseMenuRow[] = [
    { label: 'Booking Info', info: <><span className="inhouse-menu-desc">Group: {row.isGroup ? 'Yes' : 'No'}</span><span className="inhouse-menu-desc" style={{ paddingLeft: 4 }}>Source: {row.source}</span></> },
    { label: 'Check In Cancellation', disabled: true, info: <span className="inhouse-menu-desc"><HotelxIcon src={CHECKIN_CANCEL_ICON} size={10} /> -</span> },
    { label: 'Rooming List', info: <span className="inhouse-menu-desc">No. of Pax: {row.pax}</span> },
    { label: 'Service Requests', info: <span className="inhouse-menu-desc">Request: 0</span> },
    { label: 'Incidental Charges', info: <><span className="inhouse-menu-desc inhouse-menu-desc-fill">0.00</span><span className="inhouse-menu-desc">Credit Balance: 100.00</span></> },
    { label: 'Deposit', info: <span className="inhouse-menu-desc">0.00</span> },
    { label: 'Special Request', info: null },
    { label: 'Advance payment', info: <span className="inhouse-menu-desc">0.00</span> },
    { label: 'Remarks', info: null },
    { label: 'Billing Instruction', info: <span className="inhouse-menu-desc">City Account: {row.cityAccount ? 'Yes' : 'No'}<MenuDivider /></span> },
    { label: 'Folio', info: <span className="inhouse-menu-desc">0.00</span> },
    { label: 'Early Checkout', disabled: true, info: <span className="inhouse-menu-desc"><CalendarIcon /> N/A</span> },
    { label: 'Late Checkout', info: <span className="inhouse-menu-desc"><CalendarIcon /> N/A</span> },
    { label: 'Extend / Shorten Stay', info: <span className="inhouse-menu-desc"><CalendarIcon /> {formatStayDate(row.arrival)} - {formatStayDate(row.departure)}</span> },
    { label: 'Room Transfer', info: <span className="inhouse-menu-desc"><HotelxIcon src={ROOM_ICON} size={15} /> {row.roomNo} <MenuDivider /> {row.roomType}</span> },
    { label: 'Room Upgrade', info: <span className="inhouse-menu-desc"><HotelxIcon src={ROOM_ICON} size={15} /> {row.roomType}</span> },
    { label: 'House Limit', info: <span className="inhouse-menu-desc">{money(row.houseLimit)}</span> },
    { label: 'Folio History', info: <span className="inhouse-menu-desc">Total: 0</span> },
    { label: 'Attachments', badge: <span className="inhouse-menu-count">{row.attachmentCount}</span>, info: <span className="inhouse-menu-desc">No Record</span> },
    { label: 'Billing Schedule', info: <><span className="inhouse-menu-desc">{money(row.amount)} | <HotelxIcon src={ROOM_ICON} size={15} /> {row.roomCount}</span><span className="inhouse-menu-desc">Rate Code: {row.rateCode}</span></> },
    { label: 'Key Card', info: <span className="inhouse-menu-desc">-</span> },
    { label: 'Unsplit', info: <span className="inhouse-menu-desc">-</span> },
  ];

  return (
    <section className="inhouse-screen" aria-label="In House Guest">
      <InhousePropertyHeader hotelName={hotelName} segments={['Front Desk', 'In House']} reference={row.reference} onBack={onBack} />
      <InhouseSummary row={row} />

      <div className="inhouse-list inhouse-menu-list">
        {rows.map((item) => (
          <button
            key={item.label}
            type="button"
            className="inhouse-menu-card"
            disabled={item.disabled}
            onClick={() => {
              if (item.label === 'Booking Info') setPanel('bookingInfo');
              else if (item.label === 'Rooming List') setPanel('roomingList');
              else if (item.label === 'Special Request') setPanel('specialRequest');
              else if (item.label === 'Billing Instruction') setPanel('billingInstruction');
              else if (item.label === 'Attachments') setPanel('attachments');
              else if (item.label === 'Billing Schedule') setPanel('billingSchedule');
              else if (item.label === 'House Limit') window.dispatchEvent(new CustomEvent('hotelx-house-limit-open', { detail: { reference: row.reference } }));
              else if (item.label === 'Remarks') window.dispatchEvent(new CustomEvent('hotelx-remarks-open', { detail: { reference: row.reference } }));
            }}
          >
            <span className="inhouse-menu-text">
              <span className="inhouse-menu-head">
                <span className="inhouse-menu-title">{item.label}</span>
                {item.badge}
              </span>
              {item.info && <span className="inhouse-menu-line">{item.info}</span>}
            </span>
            <ChevronRight size={20} className="inhouse-menu-chevron" />
          </button>
        ))}
      </div>

      {panel === 'specialRequest' && booking && (
        <SpecialRequest booking={booking} onSave={saveBooking} onBack={() => setPanel('menu')} />
      )}
      {panel === 'billingInstruction' && booking && (
        <BillingInstruction booking={booking} onSave={saveBooking} onBack={() => setPanel('menu')} />
      )}
    </section>
  );
}

function InhousePropertyHeader({ hotelName, segments, reference, onBack }: { hotelName: string; segments: string[]; reference: string; onBack: () => void }) {
  return (
    <header className="inhouse-property">
      <div className="inhouse-property-main">
        <HotelxBackButton onClick={onBack} label="Back" />
        <div className="inhouse-property-copy">
          <small>HMS</small>
          <strong>{hotelName}</strong>
        </div>
        <span className="inhouse-switch" aria-hidden="true">
          <ArrowRightLeft size={14} />
        </span>
      </div>
      <div className="inhouse-crumb">
        <span className="inhouse-crumb-path">
          <span className="inhouse-crumb-full">{segments[0]}</span>
          <span className="inhouse-crumb-more">…</span>
          {segments.slice(1).map((name, index) => (
            <span className="inhouse-crumb-segment" key={name}>
              <span className="inhouse-crumb-slash">/</span>
              {index === segments.length - 2 ? <strong className="inhouse-crumb-current">{name}</strong> : <span>{name}</span>}
            </span>
          ))}
        </span>
        <strong>{reference}</strong>
      </div>
    </header>
  );
}

function InhouseSummary({ row, showActions = true }: { row: InhouseRow; showActions?: boolean }) {
  return (
    <div className="inhouse-detail-summary">
      <div className="inhouse-detail-top">
        <span className="inhouse-detail-roomline">
          <b>{row.roomNo}</b>
          <strong>{row.roomType}</strong>
          <MenuDivider />
          <span className="inhouse-detail-dates"><CalendarIcon /> {formatStayDate(row.arrival)} - {formatStayDate(row.departure)}</span>
        </span>
        {showActions && <span className="inhouse-detail-action"><QrIcon /></span>}
      </div>
      <div className="inhouse-detail-bottom">
        <span className="inhouse-detail-guest"><HotelxIcon src={PERSON_ICON} size={13} /> <strong>{row.accountName}</strong></span>
        {showActions && <span className="inhouse-detail-action"><HotelxIcon src={AUDIT_ICON} size={15} /></span>}
      </div>
    </div>
  );
}

function formatNumericDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function InhouseBookingInfo({ row, hotelName, store, onBack }: { row: InhouseRow; hotelName: string; store: TransportData; onBack: () => void }) {
  const booking = store.state.bookings.find((item) => item.reference === row.reference);
  const [draft, setDraft] = useState(() => ({
    bookBy: booking?.guest ?? row.guest,
    mobileNo: booking?.phone ?? '',
    email: booking?.email ?? '',
    salesChannel: booking?.salesChannel ?? '',
    source: booking?.source?.replace(/_/g, ' ') || row.source,
    segment: booking?.segment ?? '',
    referenceNo: booking?.referenceNo ?? '',
  }));
  const [exitOpen, setExitOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const salesChannels = salesChannelsFromDepartments(store.state.hotelMasters.departments);
  const segments = store.state.hotelMasters.segments
    .filter((item) => item.active)
    .sort((a, b) => a.displaySequence - b.displaySequence);
  const nights = Math.max(1, Math.round((new Date(`${row.departure}T00:00:00Z`).getTime() - new Date(`${row.arrival}T00:00:00Z`).getTime()) / 86400000));
  const update = (key: keyof typeof draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const dirty = Boolean(booking) && (
    draft.bookBy !== (booking?.guest ?? '') ||
    draft.mobileNo !== (booking?.phone ?? '') ||
    draft.email !== (booking?.email ?? '') ||
    draft.salesChannel !== (booking?.salesChannel ?? '') ||
    draft.source !== (booking?.source?.replace(/_/g, ' ') || row.source) ||
    draft.segment !== (booking?.segment ?? '') ||
    draft.referenceNo !== (booking?.referenceNo ?? '')
  );
  const valid = Boolean(draft.source && draft.segment && draft.bookBy.trim());

  const confirm = async () => {
    if (!booking) return;
    setBusy(true);
    setError('');
    try {
      await store.run({
        type: 'bookingUpdate',
        value: {
          ...booking,
          guest: draft.bookBy.trim(),
          phone: draft.mobileNo,
          email: draft.email,
          salesChannel: draft.salesChannel,
          source: draft.source,
          segment: draft.segment,
          referenceNo: draft.referenceNo,
        },
      });
      onBack();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save the booking contact.');
    } finally {
      setBusy(false);
    }
  };

  const back = () => {
    if (dirty) setExitOpen(true);
    else onBack();
  };

  return (
    <section className="inhouse-screen" aria-label="Edit Booking Contact">
      <InhousePropertyHeader hotelName={hotelName} segments={['Front Desk', 'In house', 'Edit Booking Contact']} reference={row.reference} onBack={back} />
      <InhouseSummary row={row} showActions={false} />

      <form
        className="inhouse-form"
        onSubmit={(event) => {
          event.preventDefault();
          void confirm();
        }}
      >
        <div className="inhouse-form-scroll">
        <section className="inhouse-form-section">
          <h2 className="inhouse-form-head">Stay Information</h2>
          <div className="inhouse-form-body">
            <div className="inhouse-form-grid">
              <span className="inhouse-form-field">
                <span>Arrival Date</span>
                <span className="inhouse-form-readonly inhouse-form-date"><b>{formatNumericDate(row.arrival)}</b><CalendarIcon size={18} /></span>
              </span>
              <span className="inhouse-form-field">
                <span>Departure Date</span>
                <span className="inhouse-form-readonly inhouse-form-date"><b>{formatNumericDate(row.departure)}</b><CalendarIcon size={18} /></span>
              </span>
              <span className="inhouse-form-field">
                <span>Night(s)</span>
                <span className="inhouse-form-readonly"><b>{nights}</b></span>
              </span>
              <span className="inhouse-form-field inhouse-form-group">
                <span>Group Booking</span>
                <label className="inhouse-form-check">
                  <input type="checkbox" checked={row.isGroup} disabled readOnly />
                  <i aria-hidden="true" />
                  Yes
                </label>
              </span>
            </div>
          </div>
        </section>

        <section className="inhouse-form-section">
          <h2 className="inhouse-form-head">Contact Information</h2>
          <div className="inhouse-form-body">
            <div className="inhouse-form-grid">
              <label className="inhouse-form-field inhouse-form-wide">
                <span>Book by</span>
                <input value={draft.bookBy} onChange={(event) => update('bookBy', event.target.value)} />
              </label>
              <label className="inhouse-form-field inhouse-form-wide">
                <span>Phone No. (Optional)</span>
                <span className="inhouse-form-phone">
                  <MalaysiaFlag />
                  <svg viewBox="0 0 12 8" width={11} height={8} aria-hidden="true" focusable="false"><path d="m1 1 5 5 5-5" fill="none" stroke="#555" strokeWidth="1.6" /></svg>
                  <input value={draft.mobileNo} onChange={(event) => update('mobileNo', event.target.value)} />
                </span>
              </label>
              <span className="inhouse-form-field inhouse-form-wide">
                <span>Account Name (If applicable)</span>
                <span className="inhouse-form-readonly is-disabled"><b>{booking?.accountName ?? row.accountName}</b></span>
              </span>
              <label className="inhouse-form-field inhouse-form-wide">
                <span>Email Address</span>
                <input type="email" value={draft.email} onChange={(event) => update('email', event.target.value)} />
              </label>
              <label className="inhouse-form-field">
                <span>Sales Channel</span>
                <select value={draft.salesChannel} onChange={(event) => update('salesChannel', event.target.value)}>
                  <option value="">Select</option>
                  {salesChannels.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="inhouse-form-field">
                <span>Source *</span>
                <select value={draft.source} onChange={(event) => update('source', event.target.value)} required>
                  {Array.from(new Set([draft.source, ...SOURCE_OPTIONS])).filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label className="inhouse-form-field">
                <span>Segment *</span>
                <select value={draft.segment} onChange={(event) => update('segment', event.target.value)} required>
                  <option value="">Select</option>
                  {segments.map((item) => <option key={item.id} value={item.description}>{item.description}</option>)}
                </select>
              </label>
              <label className="inhouse-form-field">
                <span>Reference No</span>
                <input value={draft.referenceNo} onChange={(event) => update('referenceNo', event.target.value)} />
              </label>
            </div>
          </div>
        </section>

        {error && <p className="inhouse-form-error" role="alert">{error}</p>}
        </div>

        <footer className="inhouse-form-footer">
          <button type="submit" className="inhouse-form-confirm" disabled={busy || !valid || !dirty}>Confirm</button>
        </footer>
      </form>

      {exitOpen && (
        <ConfirmDialog
          title="Exit Confirmation"
          message="Are you sure to exit? Your changes will be not saved"
          onCancel={() => setExitOpen(false)}
          onConfirm={onBack}
        />
      )}
    </section>
  );
}
