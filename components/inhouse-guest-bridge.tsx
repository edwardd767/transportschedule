'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowDownUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  Search,
  UserRound,
} from 'lucide-react';
import type { TransportData } from '@/lib/use-transport-data';

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
          <button type="button" className="inhouse-back" aria-label="Back to Front Desk" onClick={() => setOpen(false)}>
            <ChevronLeft size={22} />
          </button>
          <div>
            <small>HMS</small>
            <strong>{hotelMasters.profile.hotelName}</strong>
          </div>
          <span className="inhouse-switch" aria-hidden="true"><RefreshCw size={15} /></span>
        </div>
        <div className="inhouse-crumb"><span>Front Desk</span><strong>In House</strong></div>
      </header>

      <div className="inhouse-toolbar">
        <strong>In House Listing <em>({rows.length})</em></strong>
        <div className="inhouse-tools">
          <label className="inhouse-search">
            <Search size={21} />
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
              <Filter size={21} />
            </button>
            {filterOpen && (
              <div className="inhouse-filter-menu">
                <button type="button" className={roomType === 'all' ? 'selected' : ''} onClick={() => { setRoomType('all'); setFilterOpen(false); }}>All Room Types</button>
                {roomTypes.map((code) => (
                  <button type="button" className={roomType === code ? 'selected' : ''} key={code} onClick={() => { setRoomType(code); setFilterOpen(false); }}>{code}</button>
                ))}
              </div>
            )}
          </div>
          <button type="button" aria-label={sortAsc ? 'Sort room descending' : 'Sort room ascending'} onClick={() => setSortAsc((value) => !value)}>
            <ArrowDownUp size={21} />
          </button>
        </div>
      </div>

      <div className="inhouse-list">
        {shownRows.length ? shownRows.map((row) => (
          <button type="button" className="inhouse-card" key={row.key}>
            <div className="inhouse-card-copy">
              <div className="inhouse-room-line">
                <b>{row.roomNo}</b>
                <strong>{row.roomType}</strong>
                <span className="inhouse-divider" />
                <CalendarDays size={13} />
                <span>{formatStayDate(row.arrival)} - {formatStayDate(row.departure)}</span>
              </div>
              <div className="inhouse-guest-line">
                <UserRound size={13} />
                <span>{row.accountName}</span>
              </div>
            </div>
            <span className="inhouse-ref">{row.reference}</span>
            <ChevronRight size={21} className="inhouse-chevron" />
          </button>
        )) : (
          <div className="inhouse-empty">No in-house guest found.</div>
        )}
      </div>

      <style jsx>{`
        .inhouse-screen{position:absolute;inset:0;z-index:35;display:flex;min-height:0;flex-direction:column;overflow:hidden;background:#f2f2f2;color:#151515;font-family:var(--font-hotelx),'Segoe UI',sans-serif}
        .inhouse-property{flex:none;background:linear-gradient(135deg,#ff8a00,#ff6a17 48%,#ffa91d);color:#111;box-shadow:0 1px 4px #0002}
        .inhouse-property-main{position:relative;display:flex;align-items:center;min-height:58px;padding:9px 14px;gap:10px;background:radial-gradient(circle at 76% -30%,#ffd649 0 11%,transparent 11.5%),radial-gradient(ellipse at 31% -55%,#d95e11 0 42%,transparent 42.5%)}
        .inhouse-property-main small{display:block;font-size:10px;color:#5d5141;line-height:1.1}
        .inhouse-property-main strong{display:block;font-size:13px;line-height:1.2}
        .inhouse-back{display:grid;place-items:center;width:30px;height:30px;border:0;border-radius:3px;background:#fff;color:#d98612}
        .inhouse-switch{margin-left:auto;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;background:#fff;color:#e98c07;box-shadow:0 1px 4px #0003}
        .inhouse-crumb{display:flex;justify-content:space-between;align-items:center;padding:4px 14px 5px;font-size:10px;background:#da7710aa}
        .inhouse-crumb strong{font-weight:600}
        .inhouse-toolbar{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:50px;padding:0 14px;background:#fff;box-shadow:0 2px 7px #0002;z-index:2}
        .inhouse-toolbar>strong{font-size:14px}.inhouse-toolbar em{font-style:normal;color:#f08b00}
        .inhouse-tools{display:flex;align-items:center;gap:4px}.inhouse-tools>button,.inhouse-filter-wrap>button{display:grid;place-items:center;width:32px;height:34px;border:0;background:transparent;color:#111;border-radius:3px}
        .inhouse-filter-wrap>button.active{color:#ef8500;background:#fff1df}
        .inhouse-search{display:flex;align-items:center}
        .inhouse-search input{width:0;opacity:0;border:0;border-bottom:1px solid #ccc;padding:4px 0;transition:width .18s ease,opacity .18s ease;outline:0;background:transparent}
        .inhouse-search:focus-within input,.inhouse-search:hover input{width:150px;opacity:1;margin-left:5px}
        .inhouse-filter-wrap{position:relative}
        .inhouse-filter-menu{position:absolute;right:0;top:39px;width:170px;padding:5px;background:#fff;border:1px solid #ddd;border-radius:5px;box-shadow:0 8px 22px #0003;z-index:20}
        .inhouse-filter-menu button{display:block;width:100%;border:0;background:#fff;text-align:left;padding:8px 9px;border-radius:4px;font-size:12px}.inhouse-filter-menu button:hover,.inhouse-filter-menu button.selected{background:#fff0dd;color:#a95600}
        .inhouse-list{flex:1;min-height:0;overflow-y:auto;padding:18px 12px 26px;scrollbar-gutter:stable}
        .inhouse-card{display:flex;align-items:center;width:100%;min-height:59px;margin:0 0 4px;padding:9px 10px 9px 13px;border:0;border-radius:5px;background:#fff;color:#111;text-align:left;box-shadow:0 1px 5px #0002}
        .inhouse-card:hover{box-shadow:0 2px 8px #0003}
        .inhouse-card-copy{min-width:0;flex:1}.inhouse-room-line,.inhouse-guest-line{display:flex;align-items:center;gap:5px;min-width:0;white-space:nowrap}
        .inhouse-room-line{font-size:11px;font-weight:600}.inhouse-room-line b{color:#ff234b;font-size:12px}.inhouse-room-line strong{font-size:12px}.inhouse-room-line span:last-child{overflow:hidden;text-overflow:ellipsis}
        .inhouse-divider{width:1px;height:14px;background:#777;margin:0 1px}.inhouse-guest-line{margin-top:4px;font-size:11px}.inhouse-guest-line span{overflow:hidden;text-overflow:ellipsis}
        .inhouse-ref{flex:none;width:74px;text-align:right;font-size:11px;margin-left:8px}.inhouse-chevron{flex:none;margin-left:10px}
        .inhouse-empty{display:grid;place-items:center;min-height:160px;color:#777;font-size:13px}
        @media (max-width:720px){.inhouse-toolbar{padding:0 10px}.inhouse-list{padding:12px 7px 20px}.inhouse-card{padding-left:9px}.inhouse-ref{width:62px}.inhouse-search:focus-within input,.inhouse-search:hover input{width:90px}}
      `}</style>
    </section>,
    portalTarget,
  );
}
