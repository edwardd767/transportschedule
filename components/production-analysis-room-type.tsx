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
const metricColumns = ['Room', 'Guest', 'Child', 'Room Rev.', 'Other Rev.', 'FNB Rev.', 'ARR'];
const cellFormats = ['number', 'number', 'number', 'money', 'money', 'money', 'money'];

function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

function startOfYear(date: string) {
  return `${date.slice(0, 4)}-01-01`;
}

function countRooms(booking: Booking) {
  return booking.rooms.reduce((sum, room) => sum + room.count, 0);
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

type Bucket = { rooms: number; guests: number; children: number; revenue: number };

function productionByRoomType(bookings: Booking[], date: string, scope: Scope) {
  const from = scopeFrom(date, scope);
  const buckets = new Map<string, Bucket>();
  for (const booking of bookings) {
    if (!overlaps(booking, from, date) || ['Cancelled', 'No Show'].includes(booking.status)) continue;
    const factor = scope === 'today' ? 1 : nights(booking);
    const totalRooms = countRooms(booking);
    for (const room of booking.rooms) {
      const share = totalRooms ? room.count / totalRooms : 0;
      const guests = room.adults !== undefined
        ? (room.adults + (room.children ?? 0)) * room.count
        : booking.guests * share;
      const revenue = room.total ?? room.subtotal ?? booking.amount * share;
      const current = buckets.get(room.code) ?? { rooms: 0, guests: 0, children: 0, revenue: 0 };
      current.rooms += room.count * factor;
      current.guests += guests;
      current.children += (room.children ?? 0) * room.count;
      current.revenue += revenue;
      buckets.set(room.code, current);
    }
  }
  return buckets;
}

function bucketCells(bucket: Bucket) {
  return [bucket.rooms, bucket.guests, bucket.children, bucket.revenue, 0, 0, bucket.rooms ? bucket.revenue / bucket.rooms : 0];
}

function buildRows(bookings: Booking[], hotelMasters: HotelMasters, date: string) {
  const relevant = bookings.filter((booking) => overlaps(booking, startOfYear(date), date) && !['Cancelled', 'No Show'].includes(booking.status));
  const buckets = periods.map((scope) => productionByRoomType(relevant, date, scope));
  const types = [...hotelMasters.roomTypes].sort((a, b) => a.code.localeCompare(b.code));
  return types.map((type) => ({
    code: type.code,
    roomType: type.description,
    cells: buckets.flatMap((map) => bucketCells(map.get(type.code) ?? { rooms: 0, guests: 0, children: 0, revenue: 0 })),
  }));
}

function printStamp(value: Date) {
  const datePart = value.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timePart = value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  return `${datePart}, ${timePart}`;
}

function RoomTypeRow({ code, roomType, cells, total }: { code: string; roomType: string; cells: number[]; total?: boolean }) {
  return <tr className={total ? 'production-total-row' : undefined}><th scope="row">{code}</th><td className="production-room-type">{roomType}</td>{cells.map((value, index) => <td key={index}>{cellFormats[index % metricColumns.length] === 'money' ? money(value) : number(value)}</td>)}</tr>;
}

export function ProductionAnalysisRoomType({ bookings, hotelMasters, date, onDate, onBack }: {
  bookings: Booking[];
  hotelMasters: HotelMasters;
  date: string;
  onDate: (value: string) => void;
  onBack: () => void;
}) {
  const [printed] = useState(() => printStamp(new Date()));
  const rows = buildRows(bookings, hotelMasters, date);
  const buckets = periods.map((scope) => productionByRoomType(bookings, date, scope));
  const totalCells = buckets.flatMap((map) => {
    let rooms = 0, guests = 0, children = 0, revenue = 0;
    for (const bucket of map.values()) { rooms += bucket.rooms; guests += bucket.guests; children += bucket.children; revenue += bucket.revenue; }
    return [rooms, guests, children, revenue, 0, 0, rooms ? revenue / rooms : 0];
  });
  return <div className="production-analysis-report">
    <div className="report-view-head"><button type="button" onClick={onBack}>‹ Back to reports</button><strong>Production Analysis by Room Type</strong></div>
    <div className="report-date-filter"><label>Report Date<input type="date" value={date} onChange={event => onDate(event.target.value)} /></label></div>
    <header className="production-analysis-heading"><div>{hotelMasters.profile.hotelName}</div><h2>Production Analysis Room Type Report</h2><p>{dateLabel(date)}</p></header>
    <div className="production-analysis-wrap"><table className="production-analysis-table"><thead><tr><th rowSpan={2} scope="col">Code</th><th rowSpan={2} scope="col">Room Type</th>{periods.map(scope => <th key={scope} colSpan={metricColumns.length} scope="colgroup">{scope === 'today' ? 'TODAY' : scope === 'month' ? 'MONTH TO DATE' : 'YEAR TO DATE'}</th>)}</tr><tr>{periods.flatMap(scope => metricColumns.map(column => <th key={`${scope}-${column}`} scope="col">{column}</th>))}</tr></thead><tbody>{rows.map(row => <RoomTypeRow key={row.code} code={row.code} roomType={row.roomType} cells={row.cells} />)}{!rows.length && <tr><td colSpan={metricColumns.length * periods.length + 2}>No room types configured.</td></tr>}<RoomTypeRow code="Total" roomType="" cells={totalCells} total /><RoomTypeRow code="Grand Total" roomType="" cells={totalCells} total /></tbody></table></div>
    <footer className="production-analysis-footer">
      <div>Hotel Date - {dateLabel(date)}</div>
      <div>CRITERIA:</div>
      <div>Date Printed: {printed}</div>
      <div>Printed By : {hotelMasters.profile.contactPerson}</div>
      <div>Page:1/1</div>
    </footer>
  </div>;
}
