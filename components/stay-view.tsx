'use client';

import { useContext, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react';
import { TransportDataContext } from '@/components/transport-connection';
import type { Booking } from '@/lib/bookings';

const ASSIGNMENT_KEY = '_roomAssignments';

const STATUS_COLOR = {
  Booked: '#1f49b6',
  InHouse: '#00d100',
  OutOfOrder: '#535353',
  OutOfInventory: '#c8c8c8',
} as const;

const RANGES = [7, 14, 30] as const;

type RoomRow = { roomNo: string; roomTypeCode: string; locationCode: string };
type OperationalPolicyWithHousekeeping = { housekeepingRoomStatuses?: Record<string, string> };

function readAssignmentMap(booking: Booking): Record<string, string[]> {
  const raw = booking.specialRequests?.[ASSIGNMENT_KEY];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([code, roomNos]) => [
        code,
        Array.isArray(roomNos) ? roomNos.filter((value): value is string => typeof value === 'string') : [],
      ]),
    );
  } catch {
    return {};
  }
}

function assignedRoomNumbers(booking: Booking) {
  return Array.from(new Set(Object.values(readAssignmentMap(booking)).flat().map((value) => value.trim()).filter(Boolean)));
}

function isoDate(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function addDays(value: string, amount: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return isoDate(date);
}

function todayIso() {
  const now = new Date();
  return isoDate(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function StayView() {
  const store = useContext(TransportDataContext);
  const [range, setRange] = useState<number>(7);
  const [start, setStart] = useState(todayIso);
  const today = todayIso();

  const rooms = useMemo<RoomRow[]>(
    () => (store?.state.hotelMasters.rooms ?? []).filter((room) => room.active).sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true })),
    [store?.state.hotelMasters.rooms],
  );
  const bookings = store?.state.bookings ?? [];
  const persistedStatuses = ((store?.state.hotelMasters.profile.operationalPolicy as OperationalPolicyWithHousekeeping | undefined)?.housekeepingRoomStatuses) ?? {};

  const days = useMemo(() => Array.from({ length: range }, (_, index) => addDays(start, index)), [range, start]);

  // Bookings without an explicit room assignment fall back to the next free room of their type.
  const assignmentByBooking = useMemo(() => {
    const byType = new Map<string, string[]>();
    for (const room of rooms) byType.set(room.roomTypeCode, [...(byType.get(room.roomTypeCode) ?? []), room.roomNo]);
    const cursor = new Map<string, number>();
    const result = new Map<string, string[]>();
    for (const booking of bookings) {
      if (booking.status === 'Cancelled' || booking.status === 'No Show') continue;
      const explicit = assignedRoomNumbers(booking);
      if (explicit.length) {
        result.set(booking.reference, explicit);
        continue;
      }
      const derived: string[] = [];
      for (const room of booking.rooms) {
        const available = byType.get(room.code) ?? [];
        const from = cursor.get(room.code) ?? 0;
        const count = Math.max(1, room.count);
        for (let index = 0; index < count; index += 1) {
          const roomNo = available[from + index];
          if (roomNo) derived.push(roomNo);
        }
        cursor.set(room.code, from + count);
      }
      if (derived.length) result.set(booking.reference, derived);
    }
    return result;
  }, [bookings, rooms]);

  const stays = useMemo(() => {
    const map = new Map<string, { guest: string; color: string; status: string }>();
    for (const booking of bookings) {
      if (booking.status === 'Cancelled' || booking.status === 'No Show') continue;
      const color = booking.status === 'Inhouse' ? STATUS_COLOR.InHouse : STATUS_COLOR.Booked;
      for (const roomNo of assignmentByBooking.get(booking.reference) ?? []) {
        for (const day of days) {
          if (day >= booking.arrival && day < booking.departure) map.set(`${roomNo}|${day}`, { guest: booking.guest, color, status: booking.status });
        }
      }
    }
    return map;
  }, [assignmentByBooking, bookings, days]);

  const dayLabel = (value: string) => new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  const dayNumber = (value: string) => new Intl.DateTimeFormat('en-GB', { day: '2-digit', timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
  const headerDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${start}T00:00:00Z`));

  const availability = days.map((day) => rooms.filter((room) => !stays.has(`${room.roomNo}|${day}`)).length);
  const occupancy = days.map((day) => {
    const occupied = rooms.filter((room) => stays.has(`${room.roomNo}|${day}`)).length;
    return rooms.length ? ((occupied / rooms.length) * 100).toFixed(2) : '0';
  });

  const roomStatusColor = (roomNo: string) => {
    const code = persistedStatuses[roomNo];
    if (code === 'OOO') return STATUS_COLOR.OutOfOrder;
    if (code === 'OOI') return STATUS_COLOR.OutOfInventory;
    return null;
  };

  return (
    <section className="stay-view" aria-label="Stay View">
      <div className="stay-view-ranges">
        {RANGES.map((value) => (
          <button key={value} type="button" className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{value} Days</button>
        ))}
      </div>

      <div className="stay-view-card stay-view-toolbar">
        <div className="stay-view-nav">
          <button type="button" aria-label="Previous day" onClick={() => setStart(addDays(start, -1))}><ChevronLeft size={20} /></button>
          <span className="stay-view-date">{headerDate}</span>
          <button type="button" aria-label="Next day" onClick={() => setStart(addDays(start, 1))}><ChevronRight size={20} /></button>
          <button type="button" aria-label="Filter rooms"><SlidersHorizontal size={18} /></button>
        </div>
        <div className="stay-view-days">
          {days.map((day) => (
            <span className="stay-view-day" key={day}>
              <small>{dayLabel(day)}</small>
              <b className={day === today ? 'today' : ''}>{dayNumber(day)}</b>
            </span>
          ))}
        </div>
      </div>

      <div className="stay-view-legend">
        <span><i style={{ background: STATUS_COLOR.Booked }} />Booked</span>
        <span><i style={{ background: STATUS_COLOR.InHouse }} />In House</span>
        <span><i style={{ background: STATUS_COLOR.OutOfOrder }} />Out of Order</span>
        <span><i style={{ background: STATUS_COLOR.OutOfInventory }} />Out of Inventory</span>
      </div>

      <div className="stay-view-rooms-title">Rooms</div>

      <div className="stay-view-card stay-view-grid">
        <table>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.roomNo}>
                <td className="stay-view-room">{room.roomNo} ({room.roomTypeCode})</td>
                {days.map((day) => {
                  const stay = stays.get(`${room.roomNo}|${day}`);
                  const status = roomStatusColor(room.roomNo);
                  const color = status ?? stay?.color;
                  return (
                    <td className="stay-view-cell" key={day}>
                      {stay && (
                        <span className="stay-view-stay">
                          <svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true" focusable="false"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                          <span className="stay-view-guest">{stay.guest}</span>
                          <span className="stay-view-bar" style={{ background: color }} />
                        </span>
                      )}
                      {!stay && status && <span className="stay-view-stay"><span className="stay-view-bar" style={{ background: status }} /></span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="stay-view-card stay-view-summary">
        <table>
          <tbody>
            <tr>
              <td className="stay-view-summary-label">Room Availability</td>
              {availability.map((value, index) => <td key={days[index]}>{value}</td>)}
            </tr>
            <tr>
              <td className="stay-view-summary-label">Occupancy (%)</td>
              {occupancy.map((value, index) => <td key={days[index]}>{value}</td>)}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="stay-view-legend stay-view-legend-bottom">
        <span className="stay-view-legend-title">Legend:</span>
        <span><i style={{ background: '#ff9500' }} />Inhouse</span>
        <span><i style={{ background: '#00b050' }} />Room assigned</span>
        <span><i style={{ background: '#000' }} />OOO/OOI</span>
      </div>
    </section>
  );
}
