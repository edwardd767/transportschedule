'use client';

import { useContext, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, MoreVertical, RotateCcw, Scan, Search, SlidersHorizontal, UserRound } from 'lucide-react';
import { TransportDataContext } from '@/components/transport-connection';
import type { Booking } from '@/lib/bookings';

const ASSIGNMENT_KEY = '_roomAssignments';

type RoomEntry = { key: string; code: string; roomNo: string };
type AdvancedFilters = { accountName: string; guestName: string; roomType: string; roomNo: string };

const emptyFilters: AdvancedFilters = { accountName: '', guestName: '', roomType: '', roomNo: '' };

function readAssignmentMap(booking: Booking): Record<string, string[]> {
  const raw = booking.specialRequests?.[ASSIGNMENT_KEY];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([code, roomNos]) => [
        code,
        Array.isArray(roomNos)
          ? Array.from(new Set(roomNos.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map((value) => value.trim())))
          : [],
      ]),
    );
  } catch {
    return {};
  }
}

function bookingRoomNumbers(booking: Booking) {
  const assigned = Object.values(readAssignmentMap(booking)).flat();
  const extended = booking as Booking & { roomNo?: string; roomNos?: string[]; assignedRoomNos?: string[] };
  const values = [...assigned, extended.roomNo, ...(extended.roomNos ?? []), ...(extended.assignedRoomNos ?? [])];
  for (const room of booking.rooms) {
    const extendedRoom = room as typeof room & { roomNo?: string; roomNos?: string[]; assignedRoomNos?: string[] };
    values.push(extendedRoom.roomNo, ...(extendedRoom.roomNos ?? []), ...(extendedRoom.assignedRoomNos ?? []));
  }
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)).map((value) => value.trim()).filter(Boolean)));
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

function totalRooms(booking: Booking) {
  return booking.rooms.reduce((sum, room) => sum + room.count, 0);
}

function bookingRoomEntries(booking: Booking): RoomEntry[] {
  const roomNos = bookingRoomNumbers(booking);
  let roomIndex = 0;
  return booking.rooms.flatMap((room) =>
    Array.from({ length: Math.max(1, room.count) }, (_, index) => {
      const entry = { key: `${room.code}-${index}`, code: room.code, roomNo: roomNos[roomIndex] ?? 'N/A' };
      roomIndex += 1;
      return entry;
    }),
  );
}

export function Checkout({ bookings }: { bookings: Booking[] }) {
  const store = useContext(TransportDataContext);
  const [tab, setTab] = useState<'due' | 'checked'>('due');
  const [query, setQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>(emptyFilters);
  const [draftFilters, setDraftFilters] = useState<AdvancedFilters>(emptyFilters);
  const [expandedReference, setExpandedReference] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const dueOut = useMemo(() => bookings.filter((booking) => booking.status === 'Inhouse'), [bookings]);
  const checkedOut = useMemo(() => bookings.filter((booking) => booking.status === 'Checkout'), [bookings]);
  const source = tab === 'due' ? dueOut : checkedOut;

  const rows = useMemo(() => {
    const search = query.trim().toLowerCase();
    return source.filter((booking) => {
      if (search && ![booking.reference, booking.guest, booking.accountName ?? ''].join(' ').toLowerCase().includes(search)) return false;
      if (filters.guestName && !booking.guest.toLowerCase().includes(filters.guestName.toLowerCase())) return false;
      if (filters.accountName && !(booking.accountName ?? '').toLowerCase().includes(filters.accountName.toLowerCase())) return false;
      if (filters.roomType && !booking.rooms.some((room) => room.code === filters.roomType)) return false;
      if (filters.roomNo && !bookingRoomNumbers(booking).some((roomNo) => roomNo.toLowerCase().includes(filters.roomNo.toLowerCase()))) return false;
      return true;
    });
  }, [filters, query, source]);

  const activeRoomTypes = (store?.state.hotelMasters.roomTypes ?? []).filter((roomType) => roomType.active);

  const checkOut = async (booking: Booking) => {
    if (!store) return;
    setActionKey(null);
    await store.run({ type: 'bookingUpdate', value: { ...booking, status: 'Checkout' } });
    setSnackbar(`${booking.reference} checked out successfully!`);
  };

  return <section className="checkin-page" aria-label="Check Out" style={{ fontSize: 12 }}>
    <div className="checkin-tabs" style={{ minHeight: 48 }}>
      <button type="button" className={tab === 'due' ? 'active' : ''} onClick={() => { setTab('due'); setActionKey(null); }} style={{ fontSize: 14, padding: '0 28px', minHeight: 48 }}>Due Out ({dueOut.length})</button>
      <button type="button" className={tab === 'checked' ? 'active' : ''} onClick={() => { setTab('checked'); setActionKey(null); }} style={{ fontSize: 14, padding: '0 28px', minHeight: 48 }}>Checked Out ({checkedOut.length})</button>
    </div>
    <div className="checkin-search" style={{ minHeight: 46, padding: '0 12px' }}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search here..." aria-label="Search check out" style={{ fontSize: 13 }} />
      <button type="button" aria-label="Search"><Search size={18} /></button>
      <button type="button" aria-label="Expand"><Scan size={18} /></button>
      <button type="button" aria-label="Advanced Search" onClick={() => { setDraftFilters(filters); setAdvancedOpen(true); }}><SlidersHorizontal size={18} /></button>
    </div>
    <div className="checkin-body" style={{ padding: '9px 7px' }}>
      {rows.length ? rows.map((booking) => {
        const expanded = expandedReference === booking.reference;
        const rooms = bookingRoomEntries(booking);
        const assignedRoomNos = bookingRoomNumbers(booking);
        const total = totalRooms(booking);
        return (
          <article key={booking.reference} style={{ marginBottom: 7, borderRadius: 4, background: '#fff', boxShadow: '0 1px 5px rgba(0,0,0,.12)', overflow: 'visible' }}>
            <button type="button" onClick={() => { setExpandedReference(expanded ? null : booking.reference); setActionKey(null); }} style={{ width: '100%', minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', border: 0, background: '#fff', color: '#111', textAlign: 'left', outline: 'none', boxShadow: 'none' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 800, textDecoration: 'underline', lineHeight: 1.3 }}>{booking.reference} <span style={{ textDecoration: 'none' }}>|</span> {booking.guest.toUpperCase()}</span>
                <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2, fontSize: 11, fontWeight: 600 }}>
                  {displayDate(booking.arrival)} - {displayDate(booking.departure)} <UserRound size={12} fill="#111" /> <span style={{ color: '#ef233c' }}>{booking.checkedInGuests}</span>/{total}
                  {assignedRoomNos.length > 0 && <span style={{ marginLeft: 5, color: '#444', fontWeight: 600 }}>{assignedRoomNos.join(', ')}</span>}
                </span>
              </span>
              {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>

            {expanded && <div style={{ borderTop: '1px solid #ddd' }}>
              {rooms.map((room, roomIndex) => {
                const menuKey = `${booking.reference}-${room.key}`;
                return (
                  <div key={room.key} style={{ position: 'relative', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderTop: roomIndex ? '1px solid #eee' : 0, background: '#fff' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800 }}><UserRound size={12} fill="#111" />{booking.guest.toUpperCase()}</div>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2, fontSize: 11 }}>
                        <span style={{ color: room.roomNo === 'N/A' ? '#ff234d' : '#34cdb1', fontWeight: 700 }}>{room.roomNo}</span><span>|</span><strong>{room.code}</strong><span>|</span><span>{displayDate(booking.departure)}</span>
                      </div>
                    </div>
                    {tab === 'due' && (
                      <div style={{ position: 'relative', flex: '0 0 auto' }}>
                        <button type="button" aria-label="Room actions" onClick={() => setActionKey(actionKey === menuKey ? null : menuKey)} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', border: 0, borderRadius: 3, background: 'transparent', color: '#111', outline: 'none', boxShadow: 'none' }}><MoreVertical size={18} /></button>
                        {actionKey === menuKey && <div style={{ position: 'absolute', zIndex: 50, top: 30, right: 0, width: 150, padding: '4px 0', borderRadius: 3, background: '#fff', boxShadow: '0 5px 18px rgba(0,0,0,.28)' }}>
                          <button type="button" onClick={() => setSnackbar(`Folio for room ${room.roomNo} is not connected yet.`)} style={{ width: '100%', padding: '9px 11px', border: 0, background: '#fff', color: '#333', textAlign: 'left', fontSize: 12 }}>View Folio</button>
                          <button type="button" onClick={() => void checkOut(booking)} style={{ width: '100%', padding: '9px 11px', border: 0, background: '#fff', color: '#333', textAlign: 'left', fontSize: 12 }}>Check Out</button>
                        </div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>}
          </article>
        );
      }) : <p className="checkin-empty">No Record Found</p>}
    </div>

    {advancedOpen && <div role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setAdvancedOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0, 0, 0, 0.48)' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="checkout-advanced-search-title" style={{ width: 'min(610px, calc(100vw - 32px))', background: '#fff', border: '1px solid #d8d8d8', boxShadow: '0 18px 46px rgba(0, 0, 0, 0.28)' }}>
        <div style={{ padding: '14px 14px 10px', background: '#fff8ef' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <strong id="checkout-advanced-search-title" style={{ color: '#f28c00', fontSize: 15 }}>Advance Search</strong>
            <button type="button" onClick={() => setDraftFilters(emptyFilters)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 32, padding: '5px 11px', border: '1px solid #ffb249', borderRadius: 4, background: '#fff', color: '#f28c00', fontSize: 13, fontWeight: 600 }}><RotateCcw size={15} /> Reset</button>
          </div>
          <div style={{ height: 1, marginTop: 10, background: '#eadfce' }} />
        </div>
        <div style={{ padding: '26px 14px 12px' }}>
          <div style={{ display: 'grid', gap: 25 }}>
            <input type="text" value={draftFilters.accountName} onChange={(event) => setDraftFilters((current) => ({ ...current, accountName: event.target.value }))} placeholder="Account Name" aria-label="Account Name" autoFocus style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, background: 'transparent' }} />
            <input type="text" value={draftFilters.guestName} onChange={(event) => setDraftFilters((current) => ({ ...current, guestName: event.target.value }))} placeholder="Guest Name" aria-label="Guest Name" style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, background: 'transparent' }} />
            <select value={draftFilters.roomType} onChange={(event) => setDraftFilters((current) => ({ ...current, roomType: event.target.value }))} aria-label="Room Type" style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, color: draftFilters.roomType ? '#242424' : '#888', background: 'transparent' }}>
              <option value="">Room Type</option>{activeRoomTypes.map((roomType) => <option key={roomType.code} value={roomType.code}>{roomType.code} - {roomType.description}</option>)}
            </select>
            <input type="text" value={draftFilters.roomNo} onChange={(event) => setDraftFilters((current) => ({ ...current, roomNo: event.target.value }))} placeholder="Room No" aria-label="Room No" style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, background: 'transparent' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 32, paddingBottom: 4 }}>
            <button type="button" onClick={() => setAdvancedOpen(false)} style={{ border: 0, borderRadius: 4, background: '#f79400', color: '#fff', padding: '8px 13px', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,.18)' }}>Cancel</button>
            <button type="button" onClick={() => { setFilters(draftFilters); setAdvancedOpen(false); }} style={{ border: 0, borderRadius: 4, background: '#f79400', color: '#fff', padding: '8px 13px', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,.18)' }}>Confirm</button>
          </div>
        </div>
      </div>
    </div>}

    {snackbar && <div style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 200, minWidth: 300, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 22, background: '#353535', color: '#fff', borderRadius: 4, padding: '13px 16px', boxShadow: '0 3px 12px rgba(0,0,0,.28)', fontSize: 12, fontWeight: 600 }}><span>{snackbar}</span><button type="button" onClick={() => setSnackbar(null)} style={{ border: 0, background: 'transparent', color: '#77a8ff', fontWeight: 700, fontSize: 11 }}>DISMISS</button></div>}
  </section>;
}
