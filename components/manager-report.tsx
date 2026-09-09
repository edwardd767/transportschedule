'use client';

import type { Booking } from '@/lib/bookings';
import type { HotelMasters } from '@/lib/hotel-masters';

const money = (value: number) => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = (value: number) => value.toLocaleString('en-MY');
const dateLabel = (value: string) => value ? value.split('-').reverse().join('/') : '';
const dayMs = 86400000;

type Scope = 'today' | 'month' | 'year';
type Metrics = {
  revenue: number;
  available: number;
  occupied: number;
  guests: number;
  adults: number;
  children: number;
  cancelled: number;
  noShow: number;
  stayover: number;
  arrivals: number;
  departures: number;
  vacant: number;
};

function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function startOfYear(date: string) {
  return `${date.slice(0, 4)}-01-01`;
}

function activeOn(booking: Booking, date: string) {
  return booking.arrival <= date && booking.departure > date && !['Cancelled', 'No Show'].includes(booking.status);
}

function countRooms(booking: Booking) {
  return booking.rooms.reduce((sum, room) => sum + room.count, 0);
}

function countAdults(booking: Booking) {
  return booking.rooms.every(room => room.adults !== undefined)
    ? booking.rooms.reduce((sum, room) => sum + room.adults! * room.count, 0)
    : booking.guests;
}

function countChildren(booking: Booking) {
  return booking.rooms.reduce((sum, room) => sum + (room.children ?? 0) * room.count, 0);
}

function nights(booking: Booking) {
  return Math.max(1, Math.round((Date.parse(booking.departure) - Date.parse(booking.arrival)) / dayMs));
}

function roomNights(booking: Booking) {
  return countRooms(booking) * nights(booking);
}

function overlaps(booking: Booking, from: string, to: string) {
  return booking.arrival <= to && booking.departure > from;
}

function metrics(bookings: Booking[], reportDate: string, roomTotal: number, scope: Scope): Metrics {
  const from = scope === 'today' ? reportDate : scope === 'month' ? startOfMonth(reportDate) : startOfYear(reportDate);
  const days = Math.max(1, Math.floor((Date.parse(reportDate) - Date.parse(from)) / dayMs) + 1);
  const relevant = bookings.filter(booking => overlaps(booking, from, reportDate));
  const activeToday = bookings.filter(booking => activeOn(booking, reportDate));
  const revenueBookings = relevant.filter(booking => !['Cancelled', 'No Show'].includes(booking.status));
  const occupied = scope === 'today'
    ? activeToday.reduce((sum, booking) => sum + countRooms(booking), 0)
    : revenueBookings.reduce((sum, booking) => sum + roomNights(booking), 0);
  const available = roomTotal * days;
  return {
    revenue: revenueBookings.reduce((sum, booking) => sum + booking.amount, 0),
    available,
    occupied,
    guests: revenueBookings.reduce((sum, booking) => sum + booking.guests, 0),
    adults: revenueBookings.reduce((sum, booking) => sum + countAdults(booking), 0),
    children: revenueBookings.reduce((sum, booking) => sum + countChildren(booking), 0),
    cancelled: relevant.filter(booking => booking.status === 'Cancelled').length,
    noShow: relevant.filter(booking => booking.status === 'No Show').length,
    stayover: activeToday.length,
    arrivals: bookings.filter(booking => booking.arrival === reportDate && !['Cancelled', 'No Show'].includes(booking.status)).length,
    departures: bookings.filter(booking => booking.departure === reportDate && !['Cancelled', 'No Show'].includes(booking.status)).length,
    vacant: Math.max(0, available - occupied),
  };
}

function segmentRows(bookings: Booking[], reportDate: string) {
  const groups = new Map<string, Booking[]>();
  for (const booking of bookings.filter(item => item.arrival <= reportDate && item.departure > startOfYear(reportDate) && !['Cancelled', 'No Show'].includes(item.status))) {
    const segment = booking.segment || booking.salesChannel || booking.source || 'Walk In';
    groups.set(segment, [...(groups.get(segment) ?? []), booking]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([segment, rows]) => {
    const revenue = rows.reduce((sum, booking) => sum + booking.amount, 0);
    const rooms = rows.reduce((sum, booking) => sum + countRooms(booking), 0);
    const guests = rows.reduce((sum, booking) => sum + booking.guests, 0);
    return { segment, rooms, guests, revenue, arr: rooms ? revenue / rooms : 0 };
  });
}

export function ManagerReport({ bookings, hotelMasters, date, onDate, onBack }: {
  bookings: Booking[];
  hotelMasters: HotelMasters;
  date: string;
  onDate: (value: string) => void;
  onBack: () => void;
}) {
  const roomTotal = hotelMasters.roomTypes.filter(room => room.active).reduce((sum, room) => sum + room.totalRoom, 0);
  const today = metrics(bookings, date, roomTotal, 'today');
  const month = metrics(bookings, date, roomTotal, 'month');
  const year = metrics(bookings, date, roomTotal, 'year');
  const rows: Array<[string, (value: Metrics) => string]> = [
    ['ROOM REVENUE', value => money(value.revenue)],
    ['DAYUSE', () => money(0)],
    ['TOTAL ROOM REVENUE', value => money(value.revenue)],
    ['ROOM AVAILABLE', value => number(value.available)],
    ['OCCUPIED ROOM', value => number(value.occupied)],
    ['ARR', value => money(value.occupied ? value.revenue / value.occupied : 0)],
    ['RevPAR', value => money(value.available ? value.revenue / value.available : 0)],
    ['NO OF GUEST', value => number(value.guests)],
    ['NO OF ADULT', value => number(value.adults)],
    ['NO OF CHILD', value => number(value.children)],
    ['NO SHOW', value => number(value.noShow)],
    ['OCCUPANCY %', value => money(value.available ? value.occupied / value.available * 100 : 0)],
    ['OCCUPANCY % (Total - OOO - OOI)', value => money(value.available ? value.occupied / value.available * 100 : 0)],
    ['CANCELLATION', value => number(value.cancelled)],
    ['ACTUAL ARRIVAL', value => number(value.arrivals)],
    ['ACTUAL DEPARTURE', value => number(value.departures)],
    ['STAYOVER', value => number(value.stayover)],
    ['WALK IN', () => number(0)],
    ['HOUSE USE', () => number(0)],
    ['COMPLIMENTARY', () => number(0)],
    ['DAY USE', () => number(0)],
    ['OOO ROOMS', () => number(0)],
    ['OOI ROOMS', () => number(0)],
    ['VACANT ROOMS', value => number(value.vacant)],
    ['TOTAL ROOM AVAILABLE', value => number(value.available)],
  ];
  const segments = segmentRows(bookings, date);
  return <div className="manager-report">
    <div className="report-view-head"><button type="button" onClick={onBack}>‹ Back to reports</button><strong>Manager Report</strong></div>
    <div className="report-date-filter"><label>Report Date<input type="date" value={date} onChange={event => onDate(event.target.value)} /></label></div>
    <header className="manager-report-heading"><div>{hotelMasters.profile.hotelName}</div><h2>Manager Report</h2><p>{dateLabel(date)}</p></header>
    <div className="manager-report-table-wrap"><table className="manager-room-stat"><thead><tr><th>Room Statistic</th><th>TODAY</th><th>MONTH TO DATE</th><th>YEAR TO DATE</th></tr></thead><tbody>{rows.map(([label, render]) => <tr key={label} className={label.startsWith('TOTAL') ? 'manager-total-row' : undefined}><th scope="row">{label}</th><td>{render(today)}</td><td>{render(month)}</td><td>{render(year)}</td></tr>)}</tbody></table></div>
    <div className="manager-report-table-wrap segment-wrap"><table className="manager-segment-table"><thead><tr><th>Segment</th><th>Room</th><th>Guest</th><th>Room Rev.</th><th>Other Rev.</th><th>FNB Rev.</th><th>ARR</th></tr></thead><tbody>{segments.map(row => <tr key={row.segment}><th scope="row">{row.segment}</th><td>{number(row.rooms)}</td><td>{number(row.guests)}</td><td>{money(row.revenue)}</td><td>{money(0)}</td><td>{money(0)}</td><td>{money(row.arr)}</td></tr>)}{!segments.length && <tr><td colSpan={7}>No booking data found for this report date.</td></tr>}</tbody></table></div>
  </div>;
}
