'use client';

import { useContext, useState } from 'react';
import { RotateCcw, Scan, Search, SlidersHorizontal } from 'lucide-react';
import type { Booking } from '@/lib/bookings';
import { TransportDataContext } from '@/components/transport-connection';

type AdvancedFilters = {
  accountName: string;
  guestName: string;
  roomType: string;
  roomNo: string;
};

const emptyFilters: AdvancedFilters = {
  accountName: '',
  guestName: '',
  roomType: '',
  roomNo: '',
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function bookingRoomNumbers(booking: Booking) {
  const extended = booking as Booking & {
    roomNo?: string;
    roomNos?: string[];
    assignedRoomNos?: string[];
  };

  const values = [
    extended.roomNo,
    ...(extended.roomNos ?? []),
    ...(extended.assignedRoomNos ?? []),
  ];

  for (const room of booking.rooms) {
    const extendedRoom = room as typeof room & {
      roomNo?: string;
      roomNos?: string[];
      assignedRoomNos?: string[];
    };
    values.push(
      extendedRoom.roomNo,
      ...(extendedRoom.roomNos ?? []),
      ...(extendedRoom.assignedRoomNos ?? []),
    );
  }

  return values.filter((value): value is string => Boolean(value));
}

export function CheckIn({ bookings }: { bookings: Booking[] }) {
  const store = useContext(TransportDataContext);
  const [tab, setTab] = useState<'due' | 'checked'>('due');
  const [query, setQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>(emptyFilters);
  const [draftFilters, setDraftFilters] = useState<AdvancedFilters>(emptyFilters);
  const today = todayKey();
  const due = bookings.filter((booking) => booking.arrival === today && booking.status === 'Booked');
  const checked = bookings.filter((booking) => booking.arrival === today && booking.status === 'Inhouse');
  const activeRoomTypes = (store?.state.hotelMasters.roomTypes ?? []).filter((roomType) => roomType.active);

  const rows = (tab === 'due' ? due : checked).filter((booking) => {
    const searchText = `${booking.reference} ${booking.guest} ${booking.accountName ?? ''}`.toLowerCase();
    const queryMatch = searchText.includes(query.trim().toLowerCase());
    const accountMatch = !filters.accountName.trim()
      || (booking.accountName ?? '').toLowerCase().includes(filters.accountName.trim().toLowerCase());
    const guestMatch = !filters.guestName.trim()
      || booking.guest.toLowerCase().includes(filters.guestName.trim().toLowerCase());
    const roomTypeMatch = !filters.roomType
      || booking.rooms.some((room) => room.code === filters.roomType);
    const roomNoMatch = !filters.roomNo.trim()
      || bookingRoomNumbers(booking).some((roomNo) => roomNo.toLowerCase().includes(filters.roomNo.trim().toLowerCase()));
    return queryMatch && accountMatch && guestMatch && roomTypeMatch && roomNoMatch;
  });

  function openAdvancedSearch() {
    setDraftFilters(filters);
    setAdvancedOpen(true);
  }

  function confirmAdvancedSearch() {
    setFilters(draftFilters);
    setAdvancedOpen(false);
  }

  return <section className="checkin-page" aria-label="Check In">
    <div className="checkin-tabs">
      <button type="button" className={tab === 'due' ? 'active' : ''} onClick={() => setTab('due')}>Due In ({due.length})</button>
      <button type="button" className={tab === 'checked' ? 'active' : ''} onClick={() => setTab('checked')}>Checked In ({checked.length})</button>
    </div>
    <div className="checkin-search">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search here..." aria-label="Search check in" />
      <button type="button" aria-label="Search"><Search size={22} /></button>
      <button type="button" aria-label="Expand"><Scan size={22} /></button>
      <button type="button" aria-label="Advanced Search" onClick={openAdvancedSearch}><SlidersHorizontal size={22} /></button>
    </div>
    <div className="checkin-body">
      {rows.length
        ? rows.map((booking) => <div className="checkin-row" key={booking.reference}><span className="checkin-row-copy"><strong>{booking.guest}</strong><small>{booking.reference} · {booking.arrival} → {booking.departure}</small></span></div>)
        : <p className="checkin-empty">No Record Found</p>}
    </div>

    {advancedOpen && (
      <div
        role="presentation"
        onMouseDown={(event) => {
          if (event.currentTarget === event.target) setAdvancedOpen(false);
        }}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
          background: 'rgba(0, 0, 0, 0.48)',
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="advanced-search-title"
          style={{
            width: 'min(610px, calc(100vw - 32px))',
            background: '#fff',
            border: '1px solid #d8d8d8',
            boxShadow: '0 18px 46px rgba(0, 0, 0, 0.28)',
          }}
        >
          <div style={{ padding: '14px 14px 10px', background: '#fff8ef' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <strong id="advanced-search-title" style={{ color: '#f28c00', fontSize: 15 }}>Advance Search</strong>
              <button
                type="button"
                onClick={() => setDraftFilters(emptyFilters)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  minHeight: 32,
                  padding: '5px 11px',
                  border: '1px solid #ffb249',
                  borderRadius: 4,
                  background: '#fff',
                  color: '#f28c00',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <RotateCcw size={15} /> Reset
              </button>
            </div>
            <div style={{ height: 1, marginTop: 10, background: '#eadfce' }} />
          </div>

          <div style={{ padding: '26px 14px 12px' }}>
            <div style={{ display: 'grid', gap: 25 }}>
              <input
                type="text"
                value={draftFilters.accountName}
                onChange={(event) => setDraftFilters((current) => ({ ...current, accountName: event.target.value }))}
                placeholder="Account Name"
                aria-label="Account Name"
                autoFocus
                style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, background: 'transparent' }}
              />
              <input
                type="text"
                value={draftFilters.guestName}
                onChange={(event) => setDraftFilters((current) => ({ ...current, guestName: event.target.value }))}
                placeholder="Guest Name"
                aria-label="Guest Name"
                style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, background: 'transparent' }}
              />
              <select
                value={draftFilters.roomType}
                onChange={(event) => setDraftFilters((current) => ({ ...current, roomType: event.target.value }))}
                aria-label="Room Type"
                style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, color: draftFilters.roomType ? '#242424' : '#888', background: 'transparent' }}
              >
                <option value="">Room Type</option>
                {activeRoomTypes.map((roomType) => (
                  <option key={roomType.code} value={roomType.code}>{roomType.code} - {roomType.description}</option>
                ))}
              </select>
              <input
                type="text"
                value={draftFilters.roomNo}
                onChange={(event) => setDraftFilters((current) => ({ ...current, roomNo: event.target.value }))}
                placeholder="Room No"
                aria-label="Room No"
                style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, background: 'transparent' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 32, paddingBottom: 4 }}>
              <button
                type="button"
                onClick={() => setAdvancedOpen(false)}
                style={{ border: 0, borderRadius: 4, background: '#f79400', color: '#fff', padding: '8px 13px', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,.18)' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAdvancedSearch}
                style={{ border: 0, borderRadius: 4, background: '#f79400', color: '#fff', padding: '8px 13px', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,.18)' }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </section>;
}
