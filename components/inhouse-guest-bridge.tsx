'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowRightLeft,
  ArrowUpDown,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import type { TransportData } from '@/lib/use-transport-data';
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
};

export function InhouseGuestBridge({ store }: { store: TransportData }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [roomType, setRoomType] = useState('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortAsc, setSortAsc] = useState(true);
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
      .sort((a, b) => {
        const value = a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true });
        return sortAsc ? value : -value;
      });
  }, [query, roomType, rows, sortAsc]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <section className="inhouse-screen" aria-label="In House Listing">
      <header className="inhouse-property">
        <div className="inhouse-property-main">
          <button
            type="button"
            className="inhouse-back"
            aria-label="Back to Front Desk"
            onClick={() => setOpen(false)}
          >
            <ChevronLeft size={20} />
          </button>
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
          <button
            type="button"
            aria-label={sortAsc ? 'Sort room descending' : 'Sort room ascending'}
            onClick={() => setSortAsc((value) => !value)}
          >
            <ArrowUpDown size={20} />
          </button>
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
                  <CalendarDays size={12} />
                  <span>
                    {formatStayDate(row.arrival)} - {formatStayDate(row.departure)}
                  </span>
                </div>
                <div className="inhouse-guest-line">
                  <UserRound size={12} />
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
