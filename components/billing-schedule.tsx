'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronDown, ChevronRight, ChevronUp, DoorClosed, UserRound } from 'lucide-react';
import type { BillingScheduleAdjustment, Booking, BookingRoom } from '@/lib/bookings';
import { bookingRate } from '@/lib/booking-rate';
import type { BookingTransportLeg } from '@/lib/booking-transport';
import type { RateSetupData } from '@/lib/rate-setup-data';

const money = (value: number) => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
const stayLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit', timeZone: 'UTC' });
const inputDateLabel = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

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

function baseNightRate(room: BookingRoom, date: string, rateSetup: RateSetupData) {
  const configured = bookingRate(rateSetup, room.rateCode || 'BAR', room.code, date)?.amount;
  return configured ?? room.roomRate ?? (room.total && room.count ? room.total / room.count : 0);
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
};

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
          const baseAmount = baseNightRate(room, date, rateSetup);
          rows.push({
            id,
            roomKey,
            roomTypeCode: room.code,
            roomLabel,
            date,
            rateCode: adjustment?.rateCode || room.rateCode || 'BAR',
            promoCode: adjustment?.promoCode || room.promoCode || '',
            amount: adjustment?.total ?? baseAmount,
            baseAmount,
          });
        });
      });
    });
    return rows;
  }, [booking, fromDate, rateSetup, toDate]);

  const activeRateCodes = rateSetup.ratePlans.filter((plan) => plan.active);
  const selectedLines = lines.filter((line) => selected.includes(line.id));
  const transportTotal = bookingLegs.filter((leg) => leg.bookingReference === booking.reference && leg.incidentalCharge?.chargeId).reduce((total, leg) => {
    const charge = leg.incidentalCharge!;
    return total + (leg.adults ?? leg.passengers) * charge.adultRate + (leg.children ?? 0) * charge.childRate + (leg.infants ?? 0) * charge.infantRate;
  }, 0);
  const roomTotal = lines.reduce((total, line) => total + line.amount, 0);
  const visibleIds = lines.map((line) => line.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.includes(id));

  function toggleLine(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function openAdjustment() {
    const first = selectedLines[0];
    if (!first) return;
    const adjustment = lineAdjustment(booking, first);
    setRateCode(adjustment?.rateCode || first.rateCode);
    setRoomRate(adjustment?.roomRate ?? first.baseAmount);
    setPromoCode(adjustment?.promoCode || '');
    setDiscount(adjustment?.discount ?? 0);
    setAdjustOpen(true);
  }

  async function confirmAdjustment() {
    const nextAdjustments = new Map((booking.billingSchedule ?? []).map((item) => [item.id, item]));
    selectedLines.forEach((line) => {
      const nextRate = Math.max(0, roomRate);
      const nextDiscount = Math.max(0, discount);
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
        total: Math.max(0, nextRate - nextDiscount),
      };
      nextAdjustments.set(row.id, row);
    });
    const billingSchedule = Array.from(nextAdjustments.values());
    const adjustedTotal = lines.reduce((total, line) => {
      const adjusted = selected.includes(line.id)
        ? Math.max(0, Math.max(0, roomRate) - Math.max(0, discount))
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
    <div className="rooming-hotel-header billing-schedule-header"><button type="button" className="rooming-back" onClick={onBack} aria-label="Back to booking">‹</button><div><small>HMS</small><strong>HOTEL PARADISE</strong></div></div>
    <div className="rooming-breadcrumb">... / ... / Billing Schedule</div>
    <div className="booking-detail-summary billing-schedule-summary">
      <div className="booking-detail-top"><div className="booking-stay"><strong>{stayLabel(booking.arrival)} - {stayLabel(booking.departure)}</strong><span><DoorClosed size={14} /> 0/1&nbsp;&nbsp; <UserRound size={14} /> 0/1</span></div><strong className="booking-amount">{money(roomTotal + transportTotal)}</strong></div>
      <div className="booking-detail-bottom"><span>{booking.reference} <span className="booking-divider">|</span> {booking.guest}</span></div>
    </div>
    <div className="billing-schedule-scroll">
      {booking.rooms.map((room, roomIndex) => {
        const roomLines = lines.filter((line) => line.roomTypeCode === room.code);
        const isRoomTypeOpen = expandedRoomType === room.code;
        return <article className="billing-room-type-card" key={`${room.code}-${roomIndex}`}>
          <button className="billing-room-type-head" type="button" onClick={() => setExpandedRoomType(isRoomTypeOpen ? '' : room.code)}>
            <span><strong>{room.code}</strong><small><DoorClosed size={14} /> {room.count} | {money(roomLines.reduce((total, line) => total + line.amount, 0))}</small></span>{isRoomTypeOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {isRoomTypeOpen && Array.from({ length: room.count }, (_, copyIndex) => {
            const roomKey = `${roomIndex}-${copyIndex}`;
            const isRoomOpen = expandedRoom === roomKey;
            const dailyLines = roomLines.filter((line) => line.roomKey === roomKey);
            return <div className="billing-room-block" key={roomKey}>
              <button className="billing-room-head" type="button" onClick={() => setExpandedRoom(isRoomOpen ? '' : roomKey)}>
                <span><strong>Room {copyIndex + 1}</strong><small>{booking.guest} | {money(dailyLines.reduce((total, line) => total + line.amount, 0))}</small></span>{isRoomOpen ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
              {isRoomOpen && <div className="billing-room-detail">
                <div className="billing-date-range"><label>{inputDateLabel(fromDate)}<CalendarDays size={18} /><input type="date" value={fromDate} min={booking.arrival} max={addDays(booking.departure, -1)} onChange={(event) => setFromDate(event.target.value)} /></label><ChevronRight size={20} /><label>{inputDateLabel(toDate)}<CalendarDays size={18} /><input type="date" value={toDate} min={booking.arrival} max={addDays(booking.departure, -1)} onChange={(event) => setToDate(event.target.value)} /></label></div>
                <label className="billing-select-all"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? selected.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selected, ...visibleIds])))} /> Select All</label>
                {dailyLines.map((line) => <label className="billing-daily-line" key={line.id}><input type="checkbox" checked={selected.includes(line.id)} onChange={() => toggleLine(line.id)} /><span><strong>{dayLabel(line.date)} | {line.rateCode}</strong><small>Room Charge</small></span><span><strong>{money(line.amount)}</strong><small>{money(line.amount)}</small></span></label>)}
              </div>}
            </div>;
          })}
        </article>;
      })}
    </div>
    <div className="billing-schedule-actions"><button type="button" className="primary-button" disabled={!selectedLines.length} onClick={openAdjustment}>Rate Adjustment</button></div>
    {adjustOpen && <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label="Rate Adjustment"><div className="billing-rate-dialog">
      <div className="billing-rate-dialog-title"><strong>Rate Adjustment</strong><button type="button">Edit</button></div>
      <div className="billing-rate-dialog-sub"><DoorClosed size={16} /> {selectedLines.length} | {Array.from(new Set(selectedLines.map((line) => line.roomTypeCode))).join(', ')}</div>
      <div className="billing-rate-fields">
        <label>New Rate Code *<select value={rateCode} onChange={(event) => { const next = event.target.value; setRateCode(next); const first = selectedLines[0]; const configured = first ? bookingRate(rateSetup, next, first.roomTypeCode, first.date)?.amount : undefined; if (configured !== undefined) setRoomRate(configured); }}>{activeRateCodes.map((plan) => <option key={plan.id} value={plan.code}>{plan.code}</option>)}</select></label>
        <label>Room Rate<input type="number" min="0" step="0.01" value={roomRate} onChange={(event) => setRoomRate(Number(event.target.value))} /></label>
        <label>Promo Code<select value={promoCode} onChange={(event) => setPromoCode(event.target.value)}><option value=""></option><option value="PROMO10">PROMO10</option><option value="CNY20">CNY20</option></select></label>
        <label>Discount<input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label>
      </div>
      <div className="billing-rate-actions"><button type="button" onClick={() => setAdjustOpen(false)}>Cancel</button><button type="button" disabled={saving} onClick={confirmAdjustment}>{saving ? 'Saving...' : 'Confirm'}</button></div>
    </div></div>}
  </section>;
}
