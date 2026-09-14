'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { HotelRoomType } from '@/lib/hotel-masters';
import type { Booking } from '@/lib/bookings';
import { availabilityDays, occupiedRoomCount, roomAvailability } from '@/lib/booking-availability';
import { HotelDatePicker } from '@/components/hotel-date-picker';

export function AvailabilityDialog({ bookings, roomTypes, onClose }: { bookings: Booking[]; roomTypes: HotelRoomType[]; onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const days = availabilityDays(start);
  const active = roomTypes.filter(x => x.active);
  const total = active.reduce((sum, x) => sum + x.totalRoom, 0);
  const occupied = days.map(day => occupiedRoomCount(bookings, active, day.key));
  const displayDate = new Date(`${start}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

  return <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label="Availability">
    <div className="availability-card">
      <div className="availability-head">
        <strong>Availability</strong>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <HotelDatePicker
            value={start}
            min={today}
            onChange={setStart}
            ariaLabel="Select availability date"
            className="!h-8 !w-8 !min-h-0 !border-0 !bg-transparent !p-0 !shadow-none [&>span]:!hidden [&>svg]:!h-[18px] [&>svg]:!w-[18px]"
          />
          <span style={{ marginLeft: 0 }}>{displayDate}</span>
        </div>
        <button onClick={onClose} aria-label="Close"><X size={18} /></button>
      </div>
      <div className="availability-scroll">
        <table style={{ tableLayout: 'fixed', minWidth: 570 }}>
          <colgroup>
            <col style={{ width: 155 }} />
            <col style={{ width: 48 }} />
            {days.map(day => <col key={day.key} style={{ width: 44 }} />)}
          </colgroup>
          <thead>
            <tr className="availability-occ">
              <th style={{ textAlign: 'left' }}>Occ %</th>
              <th></th>
              {days.map((day, index) => <th key={day.key}>{total ? (occupied[index] / total * 100).toFixed(2).replace(/\.?0+$/, '') : '0'}%</th>)}
            </tr>
            <tr className="availability-total">
              <th>Total Available Room</th>
              <th className="availability-current" style={{ textAlign: 'center' }}>{total}</th>
              {days.map((day, index) => <th key={day.key} style={{ textAlign: 'center' }}>{total - occupied[index]}</th>)}
            </tr>
            <tr className="availability-dates">
              <th></th>
              <th></th>
              {days.map(day => <th key={day.key}><b>{String(day.day).padStart(2, '0')}</b><small>{day.weekday}</small></th>)}
            </tr>
          </thead>
          <tbody>
            {active.map(room => <tr key={room.code}>
              <th>{room.code}</th>
              <td className="availability-current">{room.totalRoom}</td>
              {days.map(day => <td key={day.key}>{roomAvailability(bookings, room, day.key)}</td>)}
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="availability-actions"><button className="primary-button" onClick={onClose}>Close</button></div>
    </div>
  </div>;
}
