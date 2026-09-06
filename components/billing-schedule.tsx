'use client';

import { ArrowLeft, CheckSquare } from 'lucide-react';
import type { Booking } from '@/lib/bookings';
import type { BookingTransportLeg } from '@/lib/booking-transport';

const money = (value: number) => value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function BillingSchedule({ booking, bookingLegs, onBack }: { booking: Booking; bookingLegs: BookingTransportLeg[]; onBack: () => void }) {
  const transport = bookingLegs.filter((leg) => leg.bookingReference === booking.reference && leg.incidentalCharge?.chargeId).map((leg) => {
    const charge = leg.incidentalCharge!;
    const adults = leg.adults ?? leg.passengers;
    const children = leg.children ?? 0;
    const infants = leg.infants ?? 0;
    return { leg, charge, adults, children, infants, total: adults * charge.adultRate + children * charge.childRate + infants * charge.infantRate };
  });
  const roomTotal = booking.rooms.reduce((total, room) => total + (room.total ?? room.roomRate ?? 0) * room.count, 0);
  const transportTotal = transport.reduce((total, item) => total + item.total, 0);
  return <section className="booking-workspace billing-schedule" aria-label="Billing schedule">
    <button className="secondary-button" onClick={onBack}><ArrowLeft size={17} /> Back to booking</button>
    <div className="booking-detail-summary">
      <div className="booking-detail-top"><div className="booking-stay"><strong>Billing Schedule</strong><span>{booking.arrival} – {booking.departure}</span></div><strong className="booking-amount">{money(roomTotal + transportTotal)}</strong></div>
      <div className="booking-detail-bottom"><span>{booking.reference} <span className="booking-divider">|</span> {booking.guest}</span></div>
    </div>
    <article className="billing-card"><h2>Room charges</h2>{booking.rooms.map((room) => <div className="billing-line" key={room.code}><CheckSquare size={18}/><span><strong>{room.code} · {room.rateCode || 'BAR'}</strong><small>{room.count} room{room.count === 1 ? '' : 's'} · Room charge</small></span><strong>{money((room.total ?? room.roomRate ?? 0) * room.count)}</strong></div>)}</article>
    <div className="billing-total"><span>Total billing amount</span><strong>{money(roomTotal + transportTotal)}</strong></div>
  </section>;
}
