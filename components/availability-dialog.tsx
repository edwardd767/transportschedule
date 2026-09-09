'use client';
import { CalendarDays, X } from 'lucide-react';
import type { HotelRoomType } from '@/lib/hotel-masters';
import type { Booking } from '@/lib/bookings';
import { availabilityDays, occupiedRoomCount, roomAvailability } from '@/lib/booking-availability';

export function AvailabilityDialog({ bookings, roomTypes, onClose }: { bookings: Booking[]; roomTypes: HotelRoomType[]; onClose: () => void }) {
  const start = new Date().toISOString().slice(0, 10);
  const days = availabilityDays(start);
  const active = roomTypes.filter(x => x.active);
  const total = active.reduce((sum, x) => sum + x.totalRoom, 0);
  const occupied = days.map(day => occupiedRoomCount(bookings, active, day.key));
  const displayDate = new Date(`${start}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

  return <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label="Availability"><div className="availability-card"><div className="availability-head"><strong>Availability</strong><span><CalendarDays size={18} /> {displayDate}</span><button onClick={onClose} aria-label="Close"><X size={18} /></button></div><div className="availability-scroll"><table><thead><tr className="availability-occ"><th>Occ %</th><th></th>{days.map((day, index) => <th key={day.key}>{total ? (occupied[index] / total * 100).toFixed(2).replace(/\.?0+$/, '') : '0'}%</th>)}</tr><tr className="availability-total"><th>Total Available Room</th><th className="availability-current">{total}</th>{days.map((day, index) => <th key={day.key}>{total - occupied[index]}</th>)}</tr><tr className="availability-dates"><th></th><th></th>{days.map(day => <th key={day.key}><b>{String(day.day).padStart(2, '0')}</b><small>{day.weekday}</small></th>)}</tr></thead><tbody>{active.map(room => <tr key={room.code}><th>{room.code}</th><td className="availability-current">{room.totalRoom}</td>{days.map(day => <td key={day.key}>{roomAvailability(bookings, room, day.key)}</td>)}</tr>)}</tbody></table></div><div className="availability-actions"><button className="primary-button" onClick={onClose}>Close</button></div></div></div>;
}





