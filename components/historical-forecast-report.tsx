'use client';

import type { Booking } from '@/lib/bookings';
import type { HotelMasters } from '@/lib/hotel-masters';

const dayMs = 86400000;
const money = (value: number) => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = (value: number) => value.toLocaleString('en-MY');
const dateLabel = (value: string) => value ? value.split('-').reverse().join('/') : '';
const weekday = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });

function eachDate(from: string, to: string) {
  const start = Date.parse(from);
  const end = Date.parse(to);
  if (!from || !to || Number.isNaN(start) || Number.isNaN(end) || start > end) return [];
  return Array.from({ length: Math.floor((end - start) / dayMs) + 1 }, (_, index) => new Date(start + index * dayMs).toISOString().slice(0, 10));
}

function activeBooking(booking: Booking, date: string) {
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

function dailyAmount(booking: Booking) {
  return booking.amount / nights(booking);
}

type ForecastRow = {
  hotelDate: string;
  day: string;
  totalRoom: number;
  ooo: number;
  ooi: number;
  rentRoom: number;
  occupiedRoom: number;
  dueOut: number;
  dueIn: number;
  expOcc: number;
  adults: number;
  children: number;
  reservedRoom: number;
  fitReservations: number;
  gitReservations: number;
  waitlistRoom: number;
  blockedRoom: number;
  availableRoom: number;
  houseRoom: number;
  compRoom: number;
  dayUseRoom: number;
  roomRevenue: number;
  otherRevenue: number;
  externalRevenue: number;
  fnbRevenue: number;
  totalRevenue: number;
  arr: number;
};

function buildRow(bookings: Booking[], roomTotal: number, date: string): ForecastRow {
  const active = bookings.filter(booking => activeBooking(booking, date));
  const occupiedRoom = active.reduce((sum, booking) => sum + countRooms(booking), 0);
  const roomRevenue = active.reduce((sum, booking) => sum + dailyAmount(booking), 0);
  const otherRevenue = active.reduce((sum, booking) => sum + dailyAmount(booking) * 0.06, 0);
  const totalRevenue = roomRevenue + otherRevenue;
  return {
    hotelDate: dateLabel(date),
    day: weekday(date),
    totalRoom: roomTotal,
    ooo: 0,
    ooi: 0,
    rentRoom: roomTotal,
    occupiedRoom,
    dueOut: bookings.filter(booking => booking.departure === date && !['Cancelled', 'No Show'].includes(booking.status)).reduce((sum, booking) => sum + countRooms(booking), 0),
    dueIn: bookings.filter(booking => booking.arrival === date && !['Cancelled', 'No Show'].includes(booking.status)).reduce((sum, booking) => sum + countRooms(booking), 0),
    expOcc: roomTotal ? occupiedRoom / roomTotal * 100 : 0,
    adults: active.reduce((sum, booking) => sum + countAdults(booking), 0),
    children: active.reduce((sum, booking) => sum + countChildren(booking), 0),
    reservedRoom: active.reduce((sum, booking) => sum + countRooms(booking), 0),
    fitReservations: active.filter(booking => (booking.segment || '').toLowerCase() !== 'group').reduce((sum, booking) => sum + countRooms(booking), 0),
    gitReservations: active.filter(booking => (booking.segment || '').toLowerCase() === 'group').reduce((sum, booking) => sum + countRooms(booking), 0),
    waitlistRoom: bookings.filter(booking => booking.arrival <= date && booking.departure > date && booking.status === 'Waitlist').reduce((sum, booking) => sum + countRooms(booking), 0),
    blockedRoom: 0,
    availableRoom: Math.max(0, roomTotal - occupiedRoom),
    houseRoom: 0,
    compRoom: 0,
    dayUseRoom: 0,
    roomRevenue,
    otherRevenue,
    externalRevenue: 0,
    fnbRevenue: 0,
    totalRevenue,
    arr: occupiedRoom ? roomRevenue / occupiedRoom : 0,
  };
}

function sumRows(rows: ForecastRow[]): ForecastRow {
  const totalRoom = rows[0]?.totalRoom ?? 0;
  const totals = rows.reduce((sum, row) => ({
    occupiedRoom: sum.occupiedRoom + row.occupiedRoom,
    dueOut: sum.dueOut + row.dueOut,
    dueIn: sum.dueIn + row.dueIn,
    adults: sum.adults + row.adults,
    children: sum.children + row.children,
    reservedRoom: sum.reservedRoom + row.reservedRoom,
    fitReservations: sum.fitReservations + row.fitReservations,
    gitReservations: sum.gitReservations + row.gitReservations,
    waitlistRoom: sum.waitlistRoom + row.waitlistRoom,
    availableRoom: sum.availableRoom + row.availableRoom,
    roomRevenue: sum.roomRevenue + row.roomRevenue,
    otherRevenue: sum.otherRevenue + row.otherRevenue,
    totalRevenue: sum.totalRevenue + row.totalRevenue,
  }), { occupiedRoom: 0, dueOut: 0, dueIn: 0, adults: 0, children: 0, reservedRoom: 0, fitReservations: 0, gitReservations: 0, waitlistRoom: 0, availableRoom: 0, roomRevenue: 0, otherRevenue: 0, totalRevenue: 0 });
  return {
    hotelDate: 'Forecast Total',
    day: '',
    totalRoom,
    ooo: 0,
    ooi: 0,
    rentRoom: totalRoom,
    expOcc: rows.length && totalRoom ? totals.occupiedRoom / (totalRoom * rows.length) * 100 : 0,
    blockedRoom: 0,
    houseRoom: 0,
    compRoom: 0,
    dayUseRoom: 0,
    externalRevenue: 0,
    fnbRevenue: 0,
    arr: totals.occupiedRoom ? totals.roomRevenue / totals.occupiedRoom : 0,
    ...totals,
  };
}

function cell(value: string | number, format: 'money' | 'number' = 'number') {
  return typeof value === 'number' ? format === 'money' ? money(value) : number(value) : value;
}

function ForecastTable({ rows }: { rows: ForecastRow[] }) {
  const total = sumRows(rows);
  const allRows = [...rows, total, { ...total, hotelDate: 'Grand Total:' }];
  const headers = ['Hotel Date', 'Day', 'Total Room', 'OOO', 'OOI', 'Rent Room', 'Occ. Room', 'Due Out', 'Due In', 'Exp. Occ', 'OCC (%)', 'A/C', 'Resv. Room', 'FIT Resv.', 'GIT Resv.', 'Waitlist Room', 'Blocked Room', 'Available Room', 'House Room', 'Comp Room', 'Day Use Room', 'Room Revenue', 'Other Revenue', 'External Revenue', 'FNB Revenue', 'Total Revenue', 'ARR'];
  return <table className="historical-forecast-table"><thead><tr>{headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{allRows.map((row, index) => <tr key={`${row.hotelDate}-${index}`} className={index >= rows.length ? 'forecast-total-row' : undefined}>
    <th scope="row">{row.hotelDate}</th><td>{row.day}</td><td>{cell(row.totalRoom)}</td><td>{cell(row.ooo)}</td><td>{cell(row.ooi)}</td><td>{cell(row.rentRoom)}</td><td>{cell(row.occupiedRoom)}</td><td>{cell(row.dueOut)}</td><td>{cell(row.dueIn)}</td><td>{cell(row.expOcc, 'money')}</td><td>{cell(row.expOcc, 'money')}</td><td>{row.adults}/{row.children}</td><td>{cell(row.reservedRoom)}</td><td>{cell(row.fitReservations)}</td><td>{cell(row.gitReservations)}</td><td>{cell(row.waitlistRoom)}</td><td>{cell(row.blockedRoom)}</td><td>{cell(row.availableRoom)}</td><td>{cell(row.houseRoom)}</td><td>{cell(row.compRoom)}</td><td>{cell(row.dayUseRoom)}</td><td>{cell(row.roomRevenue, 'money')}</td><td>{cell(row.otherRevenue, 'money')}</td><td>{cell(row.externalRevenue, 'money')}</td><td>{cell(row.fnbRevenue, 'money')}</td><td>{cell(row.totalRevenue, 'money')}</td><td>{cell(row.arr, 'money')}</td>
  </tr>)}</tbody></table>;
}

export function HistoricalForecastReport({ bookings, hotelMasters, from, to, onFrom, onTo, onBack }: {
  bookings: Booking[];
  hotelMasters: HotelMasters;
  from: string;
  to: string;
  onFrom: (value: string) => void;
  onTo: (value: string) => void;
  onBack: () => void;
}) {
  const roomTotal = hotelMasters.roomTypes.filter(room => room.active).reduce((sum, room) => sum + room.totalRoom, 0);
  const rows = eachDate(from, to).map(date => buildRow(bookings, roomTotal, date));
  return <div className="historical-forecast-report">
    <div className="report-view-head"><button type="button" onClick={onBack}>‹ Back to reports</button><strong>Hotel Historical &amp; Forecast Report</strong></div>
    <div className="report-date-filter"><label>Start Date<input type="date" value={from} max={to || undefined} onChange={event => onFrom(event.target.value)} /></label><label>End Date<input type="date" value={to} min={from || undefined} onChange={event => onTo(event.target.value)} /></label></div>
    <header className="historical-forecast-heading"><div>{hotelMasters.profile.hotelName}</div><h2>Hotel Historical &amp; Forecast Report</h2><p>Start Date <b>{dateLabel(from)}</b> &nbsp;&nbsp; End Date <b>{dateLabel(to)}</b></p></header>
    <div className="historical-forecast-wrap">{rows.length ? <ForecastTable rows={rows} /> : <p>No report dates found for the selected range.</p>}</div>
    <p className="historical-criteria"><b>CRITERIA:</b><br />Start Date - {dateLabel(from)}<br />End Date - {dateLabel(to)}</p>
  </div>;
}
