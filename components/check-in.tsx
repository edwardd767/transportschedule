'use client';

import { useState } from 'react';
import { Scan, Search, SlidersHorizontal } from 'lucide-react';
import type { Booking } from '@/lib/bookings';

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function CheckIn({ bookings }: { bookings: Booking[] }) {
  const [tab, setTab] = useState<'due' | 'checked'>('due');
  const [query, setQuery] = useState('');
  const today = todayKey();
  const due = bookings.filter((booking) => booking.arrival === today && booking.status === 'Booked');
  const checked = bookings.filter((booking) => booking.arrival === today && booking.status === 'Inhouse');
  const rows = (tab === 'due' ? due : checked).filter((booking) => `${booking.reference} ${booking.guest}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <section className="checkin-page" aria-label="Check In">
    <div className="checkin-tabs">
      <button type="button" className={tab === 'due' ? 'active' : ''} onClick={() => setTab('due')}>Due In ({due.length})</button>
      <button type="button" className={tab === 'checked' ? 'active' : ''} onClick={() => setTab('checked')}>Checked In ({checked.length})</button>
    </div>
    <div className="checkin-search">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search here..." aria-label="Search check in" />
      <button type="button" aria-label="Search"><Search size={22} /></button>
      <button type="button" aria-label="Expand"><Scan size={22} /></button>
      <button type="button" aria-label="Filter"><SlidersHorizontal size={22} /></button>
    </div>
    <div className="checkin-body">
      {rows.length
        ? rows.map((booking) => <div className="checkin-row" key={booking.reference}><span className="checkin-row-copy"><strong>{booking.guest}</strong><small>{booking.reference} · {booking.arrival} → {booking.departure}</small></span></div>)
        : <p className="checkin-empty">No Record Found</p>}
    </div>
  </section>;
}
