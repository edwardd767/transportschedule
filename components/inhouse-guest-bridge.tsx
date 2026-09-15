'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRightLeft,
  ArrowUpDown,
  ChevronRight,
  RotateCw,
  Search,
} from 'lucide-react';
import type { TransportData } from '@/lib/use-transport-data';
import { HotelxBackButton } from '@/components/hotelx-back-button';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import './inhouse-guest-bridge.css';

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
  const [advance, setAdvance] = useState({ arrivalStart: '', arrivalEnd: '', departureStart: '', departureEnd: '', bookingNo: '', roomNo: '', guestName: '', accountName: '', referenceNo: '', groupName: '' });
  const resetAdvance = () => setAdvance({ arrivalStart: '', arrivalEnd: '', departureStart: '', departureEnd: '', bookingNo: '', roomNo: '', guestName: '', accountName: '', referenceNo: '', groupName: '' });
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
      return;
    }

    const workspace = document.querySelector<HTMLElement>('.workspace');
    if (!workspace) return;
    const previousPosition = workspace.style.position;
    if (getComputedStyle(workspace).position === 'static') workspace.style.position = 'relative';
    setPortalTarget(workspace);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
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
        if (advance.arrivalStart && row.arrival < advance.arrivalStart) return false;
        if (advance.arrivalEnd && row.arrival > advance.arrivalEnd) return false;
        if (advance.departureStart && row.departure < advance.departureStart) return false;
        if (advance.departureEnd && row.departure > advance.departureEnd) return false;
        if (advance.bookingNo && !row.reference.toLowerCase().includes(advance.bookingNo.toLowerCase())) return false;
        if (advance.roomNo && !row.roomNo.toLowerCase().includes(advance.roomNo.toLowerCase())) return false;
        if (advance.guestName && !row.guest.toLowerCase().includes(advance.guestName.toLowerCase())) return false;
        if (advance.accountName && !row.accountName.toLowerCase().includes(advance.accountName.toLowerCase())) return false;
        if (advance.referenceNo && !row.referenceNo.toLowerCase().includes(advance.referenceNo.toLowerCase())) return false;
        if (advance.groupName && !row.groupName.toLowerCase().includes(advance.groupName.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => compareRows(a, b, sortKey));
  }, [advance, query, rows, sortKey]);

  if (!open || !portalTarget) return null;

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
            className={Object.values(advance).some(Boolean) ? 'active' : ''}
            onClick={() => setAdvanceOpen(true)}
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
            <button type="button" className="inhouse-card" key={row.key}>
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
          <dialog open className="advance-search-panel" aria-label="Advance Search" style={{ position: 'relative', inset: 'auto', margin: 0, width: 'min(600px, calc(100vw - 32px))', maxWidth: 600, maxHeight: 'calc(100dvh - 32px)', padding: 0, border: 0, borderRadius: 4, overflow: 'hidden', background: '#fff', boxShadow: '0 12px 38px rgba(0,0,0,.32)', zIndex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="advance-search-head" style={{ flex: '0 0 auto' }}>
              <strong>Advance Search</strong>
              <button type="button" className="advance-search-reset" onClick={resetAdvance}><RotateCw size={15} /> Reset</button>
            </div>
            <div className="advance-search-body" style={{ overflowY: 'auto', minHeight: 0, flex: '1 1 auto' }}>
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
              <label className="advance-search-field"><span>Booking No</span><input value={advance.bookingNo} onChange={(event) => setAdvance({ ...advance, bookingNo: event.target.value })} /></label>
              <label className="advance-search-field"><span>Room No</span><input value={advance.roomNo} onChange={(event) => setAdvance({ ...advance, roomNo: event.target.value })} /></label>
              <label className="advance-search-field"><span>Guest Name</span><input value={advance.guestName} onChange={(event) => setAdvance({ ...advance, guestName: event.target.value })} /></label>
              <label className="advance-search-field"><span>Account Name</span><input value={advance.accountName} onChange={(event) => setAdvance({ ...advance, accountName: event.target.value })} /></label>
              <label className="advance-search-field"><span>Reference No</span><input value={advance.referenceNo} onChange={(event) => setAdvance({ ...advance, referenceNo: event.target.value })} /></label>
              <label className="advance-search-field"><span>Group Name</span><input value={advance.groupName} onChange={(event) => setAdvance({ ...advance, groupName: event.target.value })} /></label>
            </div>
            <div className="advance-search-actions" style={{ flex: '0 0 auto' }}>
              <button type="button" className="primary-button" onClick={() => setAdvanceOpen(false)}>Cancel</button>
              <button type="button" className="primary-button" onClick={() => setAdvanceOpen(false)}>Confirm</button>
            </div>
          </dialog>
        </div>
      )}
    </section>,
    portalTarget,
  );
}
