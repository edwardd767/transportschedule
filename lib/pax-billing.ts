import type { Booking, BookingRoom } from './bookings';
import type { RateSetupData } from './rate-setup-data';
import { bookingRate } from './booking-rate';

export function paxNight(room: BookingRoom, date: string, data: RateSetupData, code = room.rateCode || 'BAR') {
  const rate = bookingRate(data, code, room.code, date);
  const adults = room.adults ?? 1, children = room.children ?? 0;
  const included = rate?.basePax ?? 2;
  const extraAdults = Math.max(0, adults - included);
  const extraChildren = Math.max(0, children - Math.max(0, included - adults));
  const extraPax = extraAdults * (rate?.extraAdult ?? 0) + extraChildren * (rate?.extraChild ?? 0);
  const total = (rate?.amount ?? room.roomRate ?? 0) + extraPax;
  const plan = data.ratePlans.find(p => p.active && p.code === code);
  const validity = data.validity.filter(v => v.active && v.rateSetupId === plan?.id && v.from <= date && v.to >= date).sort((a,b) => b.from.localeCompare(a.from))[0];
  const elements = (validity?.inclusiveElements ?? []).flatMap(id => {
    const e = data.elements.find(e => e.active && e.id === id);
    if (!e || /infant/i.test(e.name)) return [];
    const count = /flat/i.test(e.basis) ? 1 : /child/i.test(e.name + e.basis) ? children : /adult/i.test(e.name + e.basis) ? adults : adults + children;
    return [{ name: e.name, amount: e.amount * count, rhythm: e.postingRhythm }];
  });
  return { total, elements, extraPax };
}

export function regeneratePaxBilling(booking: Booking, data: RateSetupData, previous?: Booking): Booking {
  const schedule = [];
  for (const [index, room] of booking.rooms.entries()) {
    for (let copy = 0; copy < room.count; copy++) {
      for (let date = booking.arrival; date < booking.departure;) {
        const roomKey = `${index}-${copy}`, id = `${roomKey}-${date}`;
        const old = booking.billingSchedule?.find(x => x.id === id);
        const code = old?.rateCode || room.rateCode || 'BAR';
        const next = paxNight(room, date, data, code);
        const previousRoom = previous?.rooms[index];
        const before = old ? old.roomRate + (previousRoom ? next.total - paxNight(previousRoom, date, data, code).total : 0) : next.total;
        const discount = old?.discount ?? room.discountPerNight ?? 0;
        schedule.push({ ...old, id, roomKey, roomTypeCode: room.code, roomLabel: `Room ${copy + 1}`, date, rateCode: code, promoCode: old?.promoCode || '', roomRate: before, discount, total: Math.max(0, (before) - discount) });
        const day = new Date(`${date}T00:00:00Z`); day.setUTCDate(day.getUTCDate()+1); date = day.toISOString().slice(0,10);
      }
    }
  }
  return { ...booking, billingSchedule: schedule, amount: schedule.reduce((sum,row) => sum + row.total,0) };
}
