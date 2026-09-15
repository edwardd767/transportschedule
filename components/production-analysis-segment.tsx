'use client';

import { useState } from 'react';
import type { Booking } from '@/lib/bookings';
import type { HotelMasters } from '@/lib/hotel-masters';

const dayMs = 86400000;
const money = (value: number) => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const number = (value: number) => value.toLocaleString('en-MY');
const dateLabel = (value: string) => value ? value.split('-').reverse().join('/') : '';

type Scope = 'today' | 'month' | 'year';
const periods: Scope[] = ['today', 'month', 'year'];
const metricColumns = ['Room', 'Occ(%)', 'A/C/I', 'Room Rev.', 'Other Rev.', 'FNB Rev.', 'ARR'];
const cellFormats = ['number', 'money', 'text', 'money', 'money', 'money', 'money'];

function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function startOfYear(date: string) {
  return `${date.slice(0, 4)}-01-01`;
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

function countInfants(booking: Booking) {
  return booking.rooms.reduce((sum, room) => sum + (room.infants ?? 0) * room.count, 0);
}

function nights(booking: Booking) {
  return Math.max(1, Math.round((Date.parse(booking.departure) - Date.parse(booking.arrival)) / dayMs));
}

function overlaps(booking: Booking, from: string, to: string) {
  return booking.arrival <= to && booking.departure > from;
}

function scopeFrom(date: string, scope: Scope) {
  return scope === 'today' ? date : scope === 'month' ? startOfMonth(date) : startOfYear(date);
}

function daysInScope(date: string, scope: Scope) {
  if (scope === 'today') return 1;
  return Math.round((Date.parse(date) - Date.parse(scopeFrom(date, scope))) / dayMs) + 1;
}

function totalRooms(hotelMasters: HotelMasters) {
  return hotelMasters.roomTypes.filter((type) => type.active).reduce((sum, type) => sum + type.totalRoom, 0);
}

function segmentOf(booking: Booking) {
  return booking.segment || 'Leisure';
}

function production(rows: Booking[], date: string, scope: Scope, roomTotal: number) {
  const from = scopeFrom(date, scope);
  const relevant = rows.filter((booking) => overlaps(booking, from, date) && !['Cancelled', 'No Show'].includes(booking.status));
  const room = scope === 'today'
    ? relevant.reduce((sum, booking) => sum + countRooms(booking), 0)
    : relevant.reduce((sum, booking) => sum + countRooms(booking) * nights(booking), 0);
  const adults = relevant.reduce((sum, booking) => sum + countAdults(booking), 0);
  const children = relevant.reduce((sum, booking) => sum + countChildren(booking), 0);
  const infants = relevant.reduce((sum, booking) => sum + countInfants(booking), 0);
  const roomRev = relevant.reduce((sum, booking) => sum + booking.amount, 0);
  const available = roomTotal * daysInScope(date, scope);
  const occ = available ? room / available * 100 : 0;
  return { room, occ, adults, children, infants, roomRev, otherRev: 0, fnbRev: 0, arr: room ? roomRev / room : 0 };
}

function paxCell(value: { adults: number; children: number; infants: number }) {
  return `${value.adults}/${value.children}/${value.infants}`;
}

function buildRows(bookings: Booking[], date: string, roomTotal: number) {
  const groups = new Map<string, Booking[]>();
  for (const booking of bookings.filter((item) => overlaps(item, startOfYear(date), date) && !['Cancelled', 'No Show'].includes(item.status))) {
    const segment = segmentOf(booking);
    groups.set(segment, [...(groups.get(segment) ?? []), booking]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([segment, rows]) => {
    const cells = periods.flatMap((scope) => {
      const value = production(rows, date, scope, roomTotal);
      return [value.room, value.occ, paxCell(value), value.roomRev, value.otherRev, value.fnbRev, value.arr];
    });
    return { segment, cells };
  });
}

function printStamp(value: Date) {
  const datePart = value.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timePart = value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  return `${datePart}, ${timePart}`;
}

function SegmentRow({ label, cells, total }: { label: string; cells: (number | string)[]; total?: boolean }) {
  return <tr className={total ? 'production-total-row' : undefined}><th scope="row">{label}</th>{cells.map((value, index) => { const format = cellFormats[index % metricColumns.length]; return <td key={index}>{format === 'money' ? money(value as number) : format === 'text' ? value : number(value as number)}</td>; })}</tr>;
}

export function ProductionAnalysisSegment({ bookings, hotelMasters, date, onDate, onBack }: {
  bookings: Booking[];
  hotelMasters: HotelMasters;
  date: string;
  onDate: (value: string) => void;
  onBack: () => void;
}) {
  const [printed] = useState(() => printStamp(new Date()));
  const roomTotal = totalRooms(hotelMasters);
  const rows = buildRows(bookings, date, roomTotal);
  const totalCells = periods.flatMap((scope) => {
    const value = production(bookings, date, scope, roomTotal);
    return [value.room, value.occ, paxCell(value), value.roomRev, value.otherRev, value.fnbRev, value.arr];
  });
  return <div className="production-analysis-report">
    <div className="report-view-head"><button type="button" onClick={onBack}>‹ Back to reports</button><strong>Production Analysis by Segment</strong></div>
    <div className="report-date-filter"><label>Report Date<input type="date" value={date} onChange={event => onDate(event.target.value)} /></label></div>
    <header className="production-analysis-heading"><div>{hotelMasters.profile.hotelName}</div><h2>Production Analysis Segment Report</h2><p>{dateLabel(date)}</p></header>
    <div className="production-analysis-wrap"><table className="production-analysis-table"><thead><tr><th rowSpan={2} scope="col">Segment</th>{periods.map(scope => <th key={scope} colSpan={metricColumns.length} scope="colgroup">{scope === 'today' ? 'TODAY' : scope === 'month' ? 'MONTH TO DATE' : 'YEAR TO DATE'}</th>)}</tr><tr>{periods.flatMap(scope => metricColumns.map(column => <th key={`${scope}-${column}`} scope="col">{column}</th>))}</tr></thead><tbody>{rows.map(row => <SegmentRow key={row.segment} label={row.segment} cells={row.cells} />)}{!rows.length && <tr><td colSpan={metricColumns.length * periods.length + 1}>No booking data found for this report date.</td></tr>}<SegmentRow label="Total" cells={totalCells} total /><SegmentRow label="Grand Total" cells={totalCells} total /></tbody></table></div>
    <footer className="production-analysis-footer">
      <div>Hotel Date - {dateLabel(date)}</div>
      <div>CRITERIA:</div>
      <div>Date Printed: {printed}</div>
      <div>Printed By : {hotelMasters.profile.contactPerson}</div>
      <div>Page:1/1</div>
    </footer>
  </div>;
}
