 'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { HotelDatePicker } from './hotel-date-picker';
import type { Booking } from '@/lib/bookings';
import type { HotelRoomType } from '@/lib/hotel-masters';

export function BookingAvailability({ arrival, bookings, roomTypes }: { arrival: string; bookings: Booking[]; roomTypes: HotelRoomType[] }) {
  const [open, setOpen] = useState(false);
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const start = chosenDate || arrival;
  const days = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return { key: date.toISOString().slice(0, 10), day: date.getUTCDate(), weekday: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase() };
  });
  const rooms = roomTypes.filter(room => room.active);
  const total = rooms.reduce((sum, room) => sum + room.totalRoom, 0);
  const used = (code: string, date: string) => bookings.filter(booking => ['Booked', 'Inhouse', 'Checkout'].includes(booking.status) && booking.arrival <= date && date < booking.departure).reduce((sum, booking) => sum + booking.rooms.filter(room => room.code === code).reduce((count, room) => count + room.count, 0), 0);
  const occupied = days.map(day => rooms.reduce((sum, room) => sum + used(room.code, day.key), 0));
  return <section className="availability-card booking-inline-availability"><div className="availability-head"><button type="button" className="availability-title" onClick={() => setOpen(!open)} aria-expanded={open}>Availability</button><HotelDatePicker value={start} onChange={setChosenDate} ariaLabel="Availability date" /><button type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Collapse availability' : 'Expand availability'} aria-expanded={open}>{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></div>{open && <div className="availability-scroll"><table aria-label="Room availability by date"><thead><tr className="availability-occ"><th scope="row">Occ %</th><th></th>{days.map((day, i) => <th key={day.key}>{total ? (occupied[i] / total * 100).toFixed(2).replace(/\.?0+$/, '') : '0'}%</th>)}</tr><tr className="availability-total"><th scope="row">Total Available Room</th><th className="availability-current">{total}</th>{days.map((day, i) => <th key={day.key}>{total - occupied[i]}</th>)}</tr><tr className="availability-dates"><th></th><th></th>{days.map(day => <th scope="col" key={day.key} title={day.key}><b>{String(day.day).padStart(2, '0')}</b><small>{day.weekday}</small></th>)}</tr></thead><tbody>{rooms.map(room => <tr key={room.code}><th scope="row">{room.code}</th><td className="availability-current">{room.totalRoom}</td>{days.map(day => <td key={day.key}>{room.totalRoom - used(room.code, day.key)}</td>)}</tr>)}</tbody></table>{rooms.length === 0 && <p>No active room types configured.</p>}</div>}</section>;
}
