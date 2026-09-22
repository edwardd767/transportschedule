'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import type { BillingScheduleAdjustment, Booking, BookingRoom } from '@/lib/bookings';
import { paxNight } from '@/lib/pax-billing';
import { bookingRate } from '@/lib/booking-rate';
import type { BookingTransportLeg } from '@/lib/booking-transport';
import type { RateSetupData } from '@/lib/rate-setup-data';
import { HotelDatePicker } from '@/components/hotel-date-picker';

const money = (value: number) => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const stayLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' });
const inputDateLabel = (value: string) => {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
};

const HOTELX_ROOM_ICON = 'https://hms1.hotelx.asia/static/media/door-subinfoline.44af6263.svg';

function RoomIcon({ size = 14 }: { size?: number }) {
  return <img src={HOTELX_ROOM_ICON} alt="" aria-hidden="true" width={size} height={size} style={{ width: size, height: size, display: 'inline-block', objectFit: 'contain', flex: '0 0 auto' }} />;
}

const HOTELX_PERSON_ICON = 'https://hms1.hotelx.asia/static/media/person.eed5ce8b.svg';

function PersonIcon({ size = 14 }: { size?: number }) {
  return <img src={HOTELX_PERSON_ICON} alt="" aria-hidden="true" width={size} height={size} style={{ width: size, height: size, display: 'inline-block', objectFit: 'contain', flex: '0 0 auto' }} />;
}

function addDays(value: string, days: number) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function eachStayDate(arrival: string, departure: string) {
  const days: string[] = [];
  for (let cursor = arrival; cursor < departure; cursor = addDays(cursor, 1)) days.push(cursor);
  return days;
}

function baseNightRate(room: BookingRoom, date: string, rateSetup: RateSetupData, booking: Booking, code?: string) {
  const selectedCode = code || room.rateCode || 'BAR';
  const configured = bookingRate(rateSetup, selectedCode, room.code, date)?.amount;
  return (configured !== undefined
    ? paxNight(room, date, rateSetup, selectedCode, { arrival: booking.arrival, departure: booking.departure }).total
    : undefined) ?? room.roomRate ?? (room.total && room.count ? room.total / room.count : 0);
}

type BillingLine = {
  id: string;
  roomKey: string;
  roomTypeCode: string;
  roomLabel: string;
  date: string;
  rateCode: string;
  promoCode: string;
  amount: number;
  baseAmount: number;
  extraPax: number;
  extraPaxLines: { label: string; amount: number }[];
  elements: { name: string; amount: number }[];
  addOns: { name: string; amount: number }[];
};

function billingRoomAssignments(booking: Booking): Record<string, string[]> {
  const raw = booking.specialRequests?._roomAssignments;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([roomType, roomNos]) => [
        roomType,
        Array.isArray(roomNos)
          ? roomNos.filter((roomNo): roomNo is string => typeof roomNo === 'string' && Boolean(roomNo.trim())).map((roomNo) => roomNo.trim())
          : [],
      ]),
    );
  } catch {
    return {};
  }
}

function lineAdjustment(booking: Booking, line: BillingLine) {
  return booking.billingSchedule?.find((item) => item.id === line.id);
}

export function BillingSchedule({ booking, bookingLegs, rateSetup, onSave, onBack }: { booking: Booking; bookingLegs: BookingTransportLeg[]; rateSetup: RateSetupData; onSave: (booking: Booking) => Promise<void>; onBack: () => void }) {
  const [expandedRoomType, setExpandedRoomType] = useState(booking.rooms[0]?.code ?? '');
  const [expandedRoom, setExpandedRoom] = useState('0-0');
  const [fromDate, setFromDate] = useState(booking.arrival);
  const [toDate, setToDate] = useState(addDays(booking.departure, -1));
  const [selected, setSelected] = useState<string[]>([]);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [rateCode, setRateCode] = useState(rateSetup.ratePlans.find((plan) => plan.active)?.code || 'BAR');
  const [roomRate, setRoomRate] = useState(0);
  const [promoCode, setPromoCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [breakdownSort, setBreakdownSort] = useState<Record<string, 'asc' | 'desc'>>({});

  const lines = useMemo(() => {
    const stayDates = eachStayDate(booking.arrival, booking.departure).filter((date) => date >= fromDate && date <= toDate);
    const rows: BillingLine[] = [];
    booking.rooms.forEach((room, roomIndex) => {
      Array.from({ length: room.count }, (_, copyIndex) => {
        const roomKey = `${roomIndex}-${copyIndex}`;
        const roomLabel = `Room ${copyIndex + 1}`;
        stayDates.forEach((date) => {
          const id = `${roomKey}-${date}`;
          const adjustment = booking.billingSchedule?.find((item) => item.id === id);
          const selectedCode = adjustment?.rateCode || room.rateCode || 'BAR';
          const night = paxNight(room, date, rateSetup, selectedCode, { arrival: booking.arrival, departure: booking.departure });
          const baseAmount = baseNightRate(room, date, rateSetup, booking, selectedCode);
          const elements = night.elements.filter(e => e.rhythm === 'Daily' || (e.rhythm === 'First Night' ? date === booking.arrival : date === addDays(booking.departure, -1)));
          rows.push({
            id,
            roomKey,
            roomTypeCode: room.code,
            roomLabel,
            date,
            rateCode: selectedCode,
            promoCode: adjustment?.promoCode || room.promoCode || '',
            amount: adjustment?.total ?? baseAmount,
            baseAmount,
            elements,
            addOns: night.addOns,
            extraPax: night.extraPax,
            extraPaxLines: night.extraPaxLines,
          });
        });
      });
    });
    return rows;
  }, [booking, fromDate, rateSetup, toDate]);

  const assignedRoomNumbers = useMemo(() => billingRoomAssignments(booking), [booking]);
  const activeRateCodes = rateSetup.ratePlans.filter((plan) => plan.active);
  const selectedLines = lines.filter((line) => selected.includes(line.id));
  const transportLines = bookingLegs
    .filter((leg) => leg.bookingReference === booking.reference && leg.incidentalCharge?.chargeId)
    .map((leg) => {
      const charge = leg.incidentalCharge!;
      const amount = (leg.adults ?? leg.passengers) * charge.adultRate + (leg.children ?? 0) * charge.childRate + (leg.infants ?? 0) * charge.infantRate;
      return { id: leg.id, direction: leg.direction, title: charge.chargeTitle || leg.serviceName, date: leg.date, time: leg.time, amount };
    });
  const transportTotal = transportLines.reduce((total, line) => total + line.amount, 0);
  const roomTotal = lines.reduce((total, line) => total + line.amount, 0);
  const visibleIds = lines.map((line) => line.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function toggleLine(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function toggleBreakdownSort(id: string) {
    setBreakdownSort((current) => ({
      ...current,
      [id]: current[id] === 'asc' ? 'desc' : 'asc',
    }));
  }

  function openAdjustment() {
    const first = selectedLines[0];
    if (!first) return;
    const adjustment = lineAdjustment(booking, first);
    const addOnTotal = first.addOns.reduce((sum, item) => sum + item.amount, 0);
    setRateCode(adjustment?.rateCode || first.rateCode);
    setRoomRate(Math.max(0, (adjustment?.roomRate ?? first.baseAmount) - addOnTotal));
    setPromoCode(adjustment?.promoCode || '');
    setDiscount(adjustment?.discount ?? 0);
    setAdjustOpen(true);
  }

  async function confirmAdjustment() {
    const nextAdjustments = new Map((booking.billingSchedule ?? []).map((item) => [item.id, item]));
    selectedLines.forEach((line) => {
      const nextRate = Math.max(0, roomRate);
      const nextDiscount = Math.max(0, discount);
      const addOnTotal = line.addOns.reduce((sum, item) => sum + item.amount, 0);
      const row: BillingScheduleAdjustment = {
        id: line.id,
        roomKey: line.roomKey,
        roomTypeCode: line.roomTypeCode,
        roomLabel: line.roomLabel,
        date: line.date,
        rateCode,
        promoCode,
        roomRate: nextRate,
        discount: nextDiscount,
        total: Math.max(0, nextRate - nextDiscount) + addOnTotal,
      };
      nextAdjustments.set(row.id, row);
    });
    const billingSchedule = Array.from(nextAdjustments.values());
    const adjustedTotal = lines.reduce((total, line) => {
      const addOnTotal = line.addOns.reduce((sum, item) => sum + item.amount, 0);
      const adjusted = selected.includes(line.id)
        ? Math.max(0, Math.max(0, roomRate) - Math.max(0, discount)) + addOnTotal
        : billingSchedule.find((item) => item.id === line.id)?.total ?? line.baseAmount;
      return total + adjusted;
    }, 0);
    setSaving(true);
    try {
      await onSave({ ...booking, billingSchedule, amount: adjustedTotal });
      setAdjustOpen(false);
      setSelected([]);
    } finally {
      setSaving(false);
    }
  }

  return <section className="booking-workspace billing-schedule billing-schedule-page" aria-label="Billing schedule">
    <div className="billing-schedule-breadcrumb"><button type="button" onClick={onBack} aria-label="Back to booking">‹</button><span>... / ... / Billing Schedule</span></div>
    <div className="booking-detail-summary billing-schedule-summary">
      <div className="booking-detail-top"><div className="booking-stay"><strong>{stayLabel(booking.arrival)} - {stayLabel(booking.departure)}</strong><span><RoomIcon size={14} /> 0/1&nbsp;&nbsp; <PersonIcon size={14} /> 0/1</span></div><strong className="booking-amount">{money(roomTotal + transportTotal)}</strong></div>
      <div className="booking-detail-bottom"><span>{booking.reference} <span className="booking-divider">|</span> {booking.guest}</span></div>
    </div>
    <div className="billing-schedule-scroll">
      {booking.rooms.map((room, roomIndex) => {
        const roomLines = lines.filter((line) => line.roomTypeCode === room.code);
        const isRoomTypeOpen = expandedRoomType === room.code;
        return <article className="billing-room-type-card" key={`${room.code}-${roomIndex}`}>
          <button className="billing-room-type-head" type="button" onClick={() => setExpandedRoomType(isRoomTypeOpen ? '' : room.code)}>
            <span><strong>{room.code}</strong><small><RoomIcon size={14} /> {room.count} | {money(roomLines.reduce((total, line) => total + line.amount, 0))}</small></span>{isRoomTypeOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {isRoomTypeOpen && Array.from({ length: room.count }, (_, copyIndex) => {
            const roomKey = `${roomIndex}-${copyIndex}`;
            const isRoomOpen = expandedRoom === roomKey;
            const dailyLines = roomLines.filter((line) => line.roomKey === roomKey);
            const sameTypeOffset = booking.rooms.slice(0, roomIndex).filter((item) => item.code === room.code).reduce((total, item) => total + item.count, 0);
            const assignedRoomNo = assignedRoomNumbers[room.code]?.[sameTypeOffset + copyIndex];
            return <div className="billing-room-block" key={roomKey}>
              <button className="billing-room-head" type="button" onClick={() => setExpandedRoom(isRoomOpen ? '' : roomKey)}>
                <span><strong>Room {copyIndex + 1}</strong><small>{booking.guest}{assignedRoomNo ? ` | ${assignedRoomNo}` : ''} | {money(dailyLines.reduce((total, line) => total + line.amount, 0))}</small></span>{isRoomOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
              {isRoomOpen && <div className="billing-room-detail">
                <div className="billing-date-range"><HotelDatePicker value={fromDate} min={booking.arrival} max={toDate || addDays(booking.departure, -1)} onChange={setFromDate} ariaLabel="Select billing schedule start date" className="billing-date-field" /><ChevronRight size={20} /><HotelDatePicker value={toDate} min={fromDate || booking.arrival} max={addDays(booking.departure, -1)} onChange={setToDate} ariaLabel="Select billing schedule end date" className="billing-date-field" /></div>
                <label className="billing-select-all"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? selected.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])))} /> Select All</label>
                {dailyLines.map((line) => {
                  const elementTotal = line.elements.reduce((sum, item) => sum + item.amount, 0);
                  const addOnTotal = line.addOns.reduce((sum, item) => sum + item.amount, 0);
                  const roomCharge = Math.max(0, line.amount - elementTotal - addOnTotal);
                  const sortDirection = breakdownSort[line.id];
                  const standardBreakdown: { key: string; name: string; amount: number; info?: { title: string; lines: { label: string; amount: number; muted?: boolean }[]; total?: number } }[] = [
                    { key: 'room-charge', name: 'Room Charge', amount: roomCharge, info: line.extraPax > 0 ? { title: 'Breakdown', lines: [{ label: 'Room Charge', amount: Math.max(0, roomCharge - line.extraPax) }, { label: 'Extra Pax', amount: line.extraPax }, ...line.extraPaxLines.map((entry) => ({ ...entry, muted: true }))], total: roomCharge } : undefined },
                    ...line.elements.map((item, index) => ({ key: `element-${index}`, name: item.name, amount: item.amount })),
                    ...line.addOns.map((item, index) => ({ key: `addon-${index}`, name: `Add On - ${item.name}`, amount: item.amount })),
                  ];
                  const sortedBreakdown = sortDirection
                    ? [...standardBreakdown].sort((a, b) => sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount)
                    : standardBreakdown;
                  return <label className="billing-daily-line" key={line.id}><input type="checkbox" checked={selected.includes(line.id)} onChange={() => toggleLine(line.id)} /><span><strong>{dayLabel(line.date)} | <button type="button" title="Sort breakdown by amount" aria-label={`Sort ${line.date} ${line.rateCode} breakdown by amount ${sortDirection === 'asc' ? 'descending' : 'ascending'}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); toggleBreakdownSort(line.id); }} style={{ border: 0, padding: 0, background: 'transparent', font: 'inherit', fontWeight: 'inherit', cursor: 'pointer', color: 'inherit' }}>{line.rateCode}{sortDirection ? ` ${sortDirection === 'asc' ? '↑' : '↓'}` : ''}</button></strong><span className="billing-breakdown-labels">{sortedBreakdown.map((item) => <small key={item.key}>{item.name}{item.info ? <span className="billing-info" tabIndex={0} aria-label={`${item.info.title}: ${item.info.lines.map((entry) => `${entry.label} ${money(entry.amount)}`).join(', ')}`}><svg className="billing-info-icon" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="8" fill="currentColor" /><rect x="7.1" y="6.7" width="1.8" height="5" rx=".9" fill="#fff" /><circle cx="8" cy="4.4" r="1.05" fill="#fff" /></svg><span className="billing-info-tip" role="tooltip"><b>{item.info.title}</b>{item.info.lines.map((entry, index) => <span className={`billing-info-row${entry.muted ? ' is-muted' : ''}`} key={index}><span>{entry.label}</span><span>{money(entry.amount)}</span></span>)}{item.info.total !== undefined ? <span className="billing-info-row billing-info-total"><span>Total</span><span>{money(item.info.total)}</span></span> : null}</span></span> : null}</small>)}</span></span><span><strong>{money(line.amount)}</strong><span className="billing-breakdown-values">{sortedBreakdown.map((item) => <small key={item.key}>{money(item.amount)}</small>)}</span></span></label>;
                })}
                {roomIndex === 0 && copyIndex === 0 && transportLines.map((line) => (
                  <div className="billing-daily-line" key={line.id}>
                    <span aria-hidden="true" />
                    <span>
                      <strong>Transport | {line.title}</strong>
                      <span className="billing-breakdown-labels"><small>{line.direction === 'arrival' ? 'Arrival' : 'Departure'} · {dayLabel(line.date)}{line.time ? ` · ${line.time}` : ''}</small></span>
                    </span>
                    <span><strong>{money(line.amount)}</strong></span>
                  </div>
                ))}
              </div>}
            </div>;
          })}
        </article>;
      })}
    </div>
    <div className="billing-schedule-actions max-[720px]:!left-0"><button type="button" className="primary-button" disabled={!selectedLines.length} onClick={openAdjustment}>Rate Adjustment</button></div>
    {adjustOpen && <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label="Rate Adjustment"><div className="billing-rate-dialog">
      <div className="billing-rate-dialog-title"><strong>Rate Adjustment</strong><button type="button">Edit</button></div>
      <div className="billing-rate-dialog-sub"><RoomIcon size={16} /> {selectedLines.length} | {Array.from(new Set(selectedLines.map((line) => line.roomTypeCode))).join(', ')}</div>
      <div className="billing-rate-fields">
        <label>New Rate Code *<select value={rateCode} onChange={(event) => { const next = event.target.value; setRateCode(next); const first = selectedLines[0]; if (first) { const configured = bookingRate(rateSetup, next, first.roomTypeCode, first.date)?.amount; const nextNight = booking.rooms.find((room) => room.code === first.roomTypeCode); const addOnTotal = nextNight ? paxNight(nextNight, first.date, rateSetup, next, { arrival: booking.arrival, departure: booking.departure }).addOns.reduce((sum, item) => sum + item.amount, 0) : 0; if (configured !== undefined) setRoomRate(configured + first.extraPax); if (addOnTotal < 0) setRoomRate(configured ?? 0); } }}>{activeRateCodes.map((plan) => <option key={plan.id} value={plan.code}>{plan.code}</option>)}</select></label>
        <label>Room Rate<input type="number" min="0" step="0.01" value={roomRate} onChange={(event) => setRoomRate(Number(event.target.value))} /></label>
        <label>Promo Code<select value={promoCode} onChange={(event) => setPromoCode(event.target.value)}><option value=""></option><option value="PROMO10">PROMO10</option><option value="CNY20">CNY20</option></select></label>
        <label>Discount<input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label>
      </div>
      <div className="billing-rate-actions"><button type="button" onClick={() => setAdjustOpen(false)}>Cancel</button><button type="button" disabled={saving} onClick={confirmAdjustment}>{saving ? 'Saving...' : 'Confirm'}</button></div>
    </div></div>}
  </section>;
}
