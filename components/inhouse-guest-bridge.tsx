'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRightLeft,
  ArrowUpDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import type { TransportData } from '@/lib/use-transport-data';
import { HotelxBackButton } from '@/components/hotelx-back-button';
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
  const [roomType, setRoomType] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortKey, setSortKey] = useState('room-asc');
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
              location: assigned?.locationCode ?? '',
            };
          }),
        ),
      );
  }, [bookings, hotelMasters]);

  const roomTypes = useMemo(
    () => Array.from(new Set(rows.map((row) => row.roomType))).sort(),
    [rows],
  );

  const shownRows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return rows
      .filter((row) => roomType === 'all' || row.roomType === roomType)
      .filter((row) => {
        if (!search) return true;
        return [row.roomNo, row.roomType, row.guest, row.accountName, row.reference]
          .join(' ')
          .toLowerCase()
          .includes(search);
      })
      .sort((a, b) => compareRows(a, b, sortKey));
  }, [query, roomType, rows, sortKey]);

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
          <div className="inhouse-filter-wrap">
            <button
              type="button"
              aria-label="Filter by room type"
              aria-expanded={filterOpen}
              className={roomType !== 'all' ? 'active' : ''}
              onClick={() => setFilterOpen((value) => !value)}
            >
              <SlidersHorizontal size={20} />
            </button>
            {filterOpen && (
              <div className="inhouse-filter-menu">
                <button
                  type="button"
                  className={roomType === 'all' ? 'selected' : ''}
                  onClick={() => {
                    setRoomType('all');
                    setFilterOpen(false);
                  }}
                >
                  All Room Types
                </button>
                {roomTypes.map((code) => (
                  <button
                    type="button"
                    className={roomType === code ? 'selected' : ''}
                    key={code}
                    onClick={() => {
                      setRoomType(code);
                      setFilterOpen(false);
                    }}
                  >
                    {code}
                  </button>
                ))}
              </div>
            )}
          </div>
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
    </section>,
    portalTarget,
  );
}
