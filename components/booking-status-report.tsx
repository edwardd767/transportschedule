'use client';

import type { Booking } from '@/lib/bookings';
import type { GuestProfile } from '@/lib/transport-state';

const columns = ['Booking No', 'Booking Date', 'Guest Name', 'Guest Type', 'Corp/TA', 'Adult', 'Child', 'Nationality', 'Segment', 'Room No', 'Room Type', 'Rate Code', 'Room Rate', 'Disc', 'Nett Rate', 'Arrival Date', 'Departure Date', 'Night', 'Status', 'Reference No', 'Billing Instruction', 'Special Request', 'Promo Code', 'Deposit', 'Audit User', 'Date / Time'];
const codes = { Booked: 'B', Cancelled: 'C', 'No Show': 'N', Inhouse: 'I', Checkout: 'X', Waitlist: 'W' };
const money = (value: number) => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = (value: string) => value ? value.split('-').reverse().join('/') : '—';
const join = (values: (string | undefined)[]) => [...new Set(values.filter(Boolean))].join(', ') || '—';

export function BookingStatusReport({ bookings, profiles, hotelName, from, to, onFrom, onTo, onBack }: {
  bookings: Booking[]; profiles: GuestProfile[]; hotelName: string; from: string; to: string;
  onFrom: (value: string) => void; onTo: (value: string) => void; onBack: () => void;
}) {
  const rows = bookings.filter(item => (!from || item.arrival >= from) && (!to || item.arrival <= to));
  const adults = (item: Booking) => item.rooms.every(room => room.adults !== undefined)
    ? item.rooms.reduce((sum, room) => sum + room.adults! * room.count, 0) : undefined;
  const children = (item: Booking) => item.rooms.reduce((sum, room) => sum + (room.children ?? 0) * room.count, 0);
  const totalRooms = rows.reduce((sum, item) => sum + item.rooms.reduce((n, room) => n + room.count, 0), 0);
  const totalAmount = rows.reduce((sum, item) => sum + item.amount, 0);
  return <div className="booking-status-report">
    <div className="report-view-head"><button type="button" onClick={onBack}>‹ Back to reports</button><strong>Booking Status Report</strong></div>
    <div className="report-date-filter"><label>Arrival Start Date<input type="date" value={from} max={to || undefined} onChange={event => onFrom(event.target.value)} /></label><label>Arrival End Date<input type="date" value={to} min={from || undefined} onChange={event => onTo(event.target.value)} /></label></div>
    <header className="booking-report-heading"><div>{hotelName}</div><h2>Booking Status Report</h2><p>Arrival Start Date: <b>{dateLabel(from)}</b> &nbsp; Arrival End Date: <b>{dateLabel(to)}</b></p></header>
    <div className="report-table-wrap" tabIndex={0} role="region" aria-label="Booking status report, scroll to view all columns"><table><thead><tr>{columns.map(item => <th scope="col" key={item}>{item}</th>)}</tr></thead><tbody>
      {rows.map(item => {
        const ids = new Set(item.rooms.flatMap(room => room.guestProfileIds ?? []));
        const guests = profiles.filter(profile => ids.has(profile.id));
        const nights = Math.max(0, Math.round((Date.parse(item.departure) - Date.parse(item.arrival)) / 86400000));
        const values = [item.reference, '—', item.guest, join(guests.map(profile => profile.guestType)), item.accountName || '—', adults(item) ?? '—', children(item), join(guests.map(profile => profile.nationality)), item.segment || '—', '—', item.rooms.map(room => `${room.code} × ${room.count}`).join(', '), join([...item.rooms.map(room => room.rateCode), ...(item.billingSchedule ?? []).map(line => line.rateCode)]),
          item.rooms.map((room, i) => <div key={i}>{room.code}: {room.roomRate === undefined ? '—' : money(room.roomRate)}</div>),
          item.rooms.map((room, i) => <div key={i}>{room.code}: {room.discount === undefined ? '—' : money(room.discount)}</div>), money(item.amount), dateLabel(item.arrival), dateLabel(item.departure), nights, codes[item.status], item.referenceNo || '—', item.billingRemark || '—', join(Object.values(item.specialRequests ?? {})), join([...item.rooms.map(room => room.promoCode), ...(item.billingSchedule ?? []).map(line => line.promoCode)]), '—', '—', '—'];
        return <tr key={item.reference}>{values.map((value, index) => <td key={columns[index]}>{value}</td>)}</tr>;
      })}
      {!rows.length && <tr><td colSpan={columns.length}>No bookings match the selected arrival dates.</td></tr>}
    </tbody></table></div>
    <div className="report-total-line">Total Adult: {rows.every(item => adults(item) !== undefined) ? rows.reduce((sum, item) => sum + (adults(item) ?? 0), 0) : '—'} &nbsp; Total Child: {rows.reduce((sum, item) => sum + children(item), 0)} &nbsp; Total Room: {totalRooms} &nbsp; Nett Total: {money(totalAmount)}</div>
    <p>Guest Type: B - Blacklist · N - Normal · S - Skipper · V - VIP</p><p>Status: B - Booked · C - Cancelled · N - No Show · I - Inhouse · X - Checkout · P - Pending · W - Waitlist</p>
  </div>;
}
