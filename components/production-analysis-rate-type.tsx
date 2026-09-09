'use client';

import { useState } from 'react';
import type { Booking } from '@/lib/bookings';
import type { HotelMasters } from '@/lib/hotel-masters';
import type { RateSetupData } from '@/lib/rate-setup-data';

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

function rateTypeOf(rateCode: string, rateSetup: RateSetupData) {
  const plan = rateSetup.ratePlans.find((item) => item.code.toLowerCase() === rateCode.toLowerCase());
  if (!plan) return rateCode;
  const type = rateSetup.rateTypes.find((item) => item.id === plan.rateTypeId);
  return type?.name || rateCode;
}

type Allocation = { rateType: string; rooms: number; guests: number; children: number; revenue: number };

function allocations(booking: Booking, rateSetup: RateSetupData): Allocation[] {
  const totalRooms = countRooms(booking);
  return booking.rooms.map((room) => {
    const count = room.count;
    const share = totalRooms ? count / totalRooms : 0;
    const guests = room.adults !== undefined
      ? (room.adults + (room.children ?? 0)) * count
      : booking.guests * share;
    const revenue = room.total ?? room.subtotal ?? booking.amount * share;
    return {
      rateType: rateTypeOf(room.rateCode ?? 'BAR', rateSetup),
      rooms: count,
      guests,
      children: (room.children ?? 0) * count,
      revenue,
    };
  });
}

type Bucket = { rooms: number; guests: number; children: number; revenue: number };

function production(bookings: Booking[], date: string, scope: Scope, rateSetup: RateSetupData) {
  const from = scopeFrom(date, scope);
  const buckets = new Map<string, Bucket>();
  for (const booking of bookings) {
    if (!overlaps(booking, from, date) || ['Cancelled', 'No Show'].includes(booking.status)) continue;
    const factor = scope === 'today' ? 1 : nights(booking);
    for (const allocation of allocations(booking, rateSetup)) {
      const current = buckets.get(allocation.rateType) ?? { rooms: 0, guests: 0, children: 0, revenue: 0 };
      current.rooms += allocation.rooms * factor;
      current.guests += allocation.guests;
      current.children += allocation.children;
      current.revenue += allocation.revenue;
      buckets.set(allocation.rateType, current);
    }
  }
  return buckets;
}

function bucketCells(bucket: Bucket) {
  return [bucket.rooms, bucket.guests, bucket.children, bucket.revenue, 0, 0, bucket.rooms ? bucket.revenue / bucket.rooms : 0];
}

function buildRows(bookings: Booking[], date: string, rateSetup: RateSetupData) {
  const relevant = bookings.filter((booking) => overlaps(booking, startOfYear(date), date) && !['Cancelled', 'No Show'].includes(booking.status));
  const buckets = periods.map((scope) => production(relevant, date, scope, rateSetup));
  const rateTypes = [...new Set(relevant.flatMap((booking) => allocations(booking, rateSetup).map((allocation) => allocation.rateType)))].sort();
  return rateTypes.map((rateType) => ({
    rateType,
    cells: buckets.flatMap((map) => bucketCells(map.get(rateType) ?? { rooms: 0, guests: 0, children: 0, revenue: 0 })),
  }));
}

function printStamp(value: Date) {
  const datePart = value.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const timePart = value.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase();
  return `${datePart}, ${timePart}`;
}

function ProductionRow({ label, cells, total }: { label: string; cells: number[]; total?: boolean }) {
  return <tr className={total ? 'production-total-row' : undefined}><th scope="row">{label}</th>{cells.map((value, index) => <td key={index}>{cellFormats[index % metricColumns.length] === 'money' ? money(value) : number(value)}</td>)}</tr>;
}

export function ProductionAnalysisRateType({ bookings, hotelMasters, rateSetup, date, onDate, onBack }: {
  bookings: Booking[];
  hotelMasters: HotelMasters;
  rateSetup: RateSetupData;
  date: string;
  onDate: (value: string) => void;
  onBack: () => void;
}) {
  const [printed] = useState(() => printStamp(new Date()));
  const rows = buildRows(bookings, date, rateSetup);
  const buckets = periods.map((scope) => production(bookings, date, scope, rateSetup));
  const totalCells = buckets.flatMap((map) => {
    let rooms = 0, guests = 0, children = 0, revenue = 0;
    for (const bucket of map.values()) { rooms += bucket.rooms; guests += bucket.guests; children += bucket.children; revenue += bucket.revenue; }
    return [rooms, guests, children, revenue, 0, 0, rooms ? revenue / rooms : 0];
  });
  return <div className="production-analysis-report">
    <div className="report-view-head"><button type="button" onClick={onBack}>‹ Back to reports</button><strong>Production Analysis by Rate Type</strong></div>
    <div className="report-date-filter"><label>Report Date<input type="date" value={date} onChange={event => onDate(event.target.value)} /></label></div>
    <header className="production-analysis-heading"><div>{hotelMasters.profile.hotelName}</div><h2>Production Analysis Rate Type Report</h2><p>{dateLabel(date)}</p></header>
    <div className="production-analysis-wrap"><table className="production-analysis-table"><thead><tr><th rowSpan={2} scope="col">Rate Type</th>{periods.map(scope => <th key={scope} colSpan={metricColumns.length} scope="colgroup">{scope === 'today' ? 'TODAY' : scope === 'month' ? 'MONTH TO DATE' : 'YEAR TO DATE'}</th>)}</tr><tr>{periods.flatMap(scope => metricColumns.map(column => <th key={`${scope}-${column}`} scope="col">{column}</th>))}</tr></thead><tbody>{rows.map(row => <ProductionRow key={row.rateType} label={row.rateType} cells={row.cells} />)}{!rows.length && <tr><td colSpan={metricColumns.length * periods.length + 1}>No booking data found for this report date.</td></tr>}<ProductionRow label="Total" cells={totalCells} total /><ProductionRow label="Grand Total" cells={totalCells} total /></tbody></table></div>
    <footer className="production-analysis-footer">
      <div>Hotel Date - {dateLabel(date)}</div>
      <div>CRITERIA:</div>
      <div>Date Printed: {printed}</div>
      <div>Printed By : {hotelMasters.profile.contactPerson}</div>
      <div>Page:1/1</div>
    </footer>
  </div>;
}
