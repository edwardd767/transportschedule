 'use client';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { RateSetupData } from '@/lib/rate-setup-data';
import { useState } from 'react';
import { User, Baby, ChevronDown, ChevronUp } from 'lucide-react';
import { HotelDatePicker } from './hotel-date-picker';
import type { Booking } from '@/lib/bookings';
import type { HotelRoomType } from '@/lib/hotel-masters';

export function BookingAvailability({ arrival, bookings, roomTypes, rateSetup, childRatesApplied = false }: { childRatesApplied?: boolean; rateSetup?: RateSetupData; arrival: string; bookings: Booking[]; roomTypes: HotelRoomType[] }) {
  const [selectedRoom, setSelectedRoom] = useState<HotelRoomType | null>(null);
  const [open, setOpen] = useState(false);
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const start = chosenDate || arrival;
  const days = Array.from({ length: 8 }, (_, index) => {
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return { key: date.toISOString().slice(0, 10), day: date.getUTCDate(), weekday: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase() };
  });
  const rateDays = Array.from({ length: 14 }, (_, index) => {
    const date = new Date(`${start}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + index);
    return { key: date.toISOString().slice(0, 10), day: date.getUTCDate(), weekday: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase() };
  });
  const rateFor = (planId: string, date: string) => {
    const validity = rateSetup?.validity.filter(v => v.active && v.rateSetupId === planId && v.from <= date && date <= v.to).sort((a, b) => b.from.localeCompare(a.from))[0];
    const season = rateSetup?.calendar[date];
    if (!selectedRoom || !season) return undefined;
    return validity?.seasonalRates?.[selectedRoom.code]?.[season];
  };
  const rooms = roomTypes.filter(room => room.active);
  const total = rooms.reduce((sum, room) => sum + room.totalRoom, 0);
  const used = (code: string, date: string) => bookings.filter(booking => ['Booked', 'Inhouse', 'Checkout'].includes(booking.status) && booking.arrival <= date && date < booking.departure).reduce((sum, booking) => sum + booking.rooms.filter(room => room.code === code).reduce((count, room) => count + room.count, 0), 0);
  const occupied = days.map(day => rooms.reduce((sum, room) => sum + used(room.code, day.key), 0));
  return <section className="availability-card booking-inline-availability"><div className="availability-head"><button type="button" className="availability-title" onClick={() => setOpen(!open)} aria-expanded={open}>Availability</button><HotelDatePicker value={start} onChange={setChosenDate} ariaLabel="Availability date" /><button type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Collapse availability' : 'Expand availability'} aria-expanded={open}>{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button></div>{open && <div className="availability-scroll"><table aria-label="Room availability by date"><thead><tr className="availability-occ"><th scope="row">Occ %</th><th></th>{days.map((day, i) => <th key={day.key}>{total ? (occupied[i] / total * 100).toFixed(2).replace(/\.?0+$/, '') : '0'}%</th>)}</tr><tr className="availability-total"><th scope="row">Total Available Room</th><th className="availability-current">{total}</th>{days.map((day, i) => <th key={day.key}>{total - occupied[i]}</th>)}</tr><tr className="availability-dates"><th></th><th></th>{days.map(day => <th scope="col" key={day.key} title={day.key}><b>{String(day.day).padStart(2, '0')}</b><small>{day.weekday}</small></th>)}</tr></thead><tbody>{rooms.map(room => <tr key={room.code}><th scope="row"><button type="button" className="availability-room-link" aria-label={`View rates for ${room.description || room.code}`} onClick={() => setSelectedRoom(room)}>{room.code}</button></th><td className="availability-current">{room.totalRoom}</td>{days.map(day => <td key={day.key}>{room.totalRoom - used(room.code, day.key)}</td>)}</tr>)}</tbody></table>{rooms.length === 0 && <p>No active room types configured.</p>}</div>}<Dialog open={Boolean(selectedRoom)} onOpenChange={value => { if (!value) setSelectedRoom(null); }}><DialogContent className="booking-room-rates" aria-describedby={undefined}><DialogTitle>{selectedRoom?.code} – {selectedRoom?.description}</DialogTitle><div className="room-rate-scroll"><table aria-label="Daily room rates"><thead><tr><th></th>{rateDays.map(day => <th key={day.key} title={day.key}><b>{String(day.day).padStart(2, '0')}</b><small>{day.weekday}</small></th>)}</tr></thead><tbody>{rateSetup?.ratePlans.filter(plan => plan.active).map(plan => <tr key={plan.id}><th scope="row" title={plan.description}>{plan.code}<span className="rate-extra-charges">{(rateFor(plan.id, start)?.extraAdult ?? 0) > 0 && <span tabIndex={0} title={`Extra adult charge on ${start}`} aria-label={`Extra adult charge ${rateFor(plan.id, start)?.extraAdult}`}><User size={13} /><b>{rateFor(plan.id, start)?.extraAdult?.toFixed(2)}</b></span>}{childRatesApplied && (rateFor(plan.id, start)?.extraChild ?? 0) > 0 && <span tabIndex={0} title={`Extra child charge on ${start}`} aria-label={`Extra child charge ${rateFor(plan.id, start)?.extraChild}`}><Baby size={13} /><b>{rateFor(plan.id, start)?.extraChild?.toFixed(2)}</b></span>}</span></th>{rateDays.map(day => { const rate = rateFor(plan.id, day.key); return <td key={day.key} title={rate === undefined ? 'No configured rate for this date' : `${day.key}: Extra adult ${rate.extraAdult ?? 0}; Extra child ${childRatesApplied ? rate.extraChild ?? 0 : 0}`}>{rate === undefined ? '—' : rate.amount.toLocaleString('en-MY', { maximumFractionDigits: 2 })}</td>; })}</tr>)}</tbody></table>{!rateSetup?.ratePlans.some(plan => plan.active) && <p>No active rate codes configured.</p>}</div><footer><button type="button" onClick={() => setSelectedRoom(null)}>Close</button></footer></DialogContent></Dialog></section>;
}
