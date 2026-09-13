import type { Booking, BookingRoom } from './bookings';
import type { RateSetupData } from './rate-setup-data';
import { bookingRate } from './booking-rate';

type StayWindow = { arrival: string; departure: string };

type AddOnBreakdown = {
  name: string;
  amount: number;
  rhythm: 'Daily' | 'First Night' | 'Last Night';
};

function rateValidity(data: RateSetupData, code: string, date: string) {
  const plan = data.ratePlans.find((item) => item.active && item.code === code);
  return data.validity
    .filter((item) => item.active && item.rateSetupId === plan?.id && item.from <= date && item.to >= date)
    .sort((a, b) => b.from.localeCompare(a.from))[0];
}

function addOnQuantity(room: BookingRoom, basis: string) {
  const adults = room.adults ?? 1;
  const children = room.children ?? 0;
  const infants = room.infants ?? 0;
  if (/adult/i.test(basis)) return adults;
  if (/child/i.test(basis)) return children;
  if (/infant/i.test(basis)) return infants;
  if (/person/i.test(basis)) return adults + children + infants;
  return 1;
}

export function rateAddOnsForNight(
  room: BookingRoom,
  date: string,
  data: RateSetupData,
  code = room.rateCode || 'BAR',
  stay?: StayWindow,
): AddOnBreakdown[] {
  const validity = rateValidity(data, code, date);
  if (!validity) return [];
  return (validity.addOnElements ?? []).flatMap((id) => {
    const item = data.addOns.find((entry) => entry.active && entry.id === id);
    if (!item) return [];
    const applies =
      item.postingRhythm === 'Daily' ||
      (item.postingRhythm === 'First Night' && (!stay || date === stay.arrival)) ||
      (item.postingRhythm === 'Last Night' && (!stay || date === (() => {
        const end = new Date(`${stay.departure}T00:00:00Z`);
        end.setUTCDate(end.getUTCDate() - 1);
        return end.toISOString().slice(0, 10);
      })()));
    if (!applies) return [];
    return [{
      name: item.name,
      amount: item.amount * addOnQuantity(room, item.basis),
      rhythm: item.postingRhythm,
    }];
  });
}

export function paxNight(
  room: BookingRoom,
  date: string,
  data: RateSetupData,
  code = room.rateCode || 'BAR',
  stay?: StayWindow,
) {
  const rate = bookingRate(data, code, room.code, date);
  const adults = room.adults ?? 1, children = room.children ?? 0;
  const included = rate?.basePax ?? 2;
  const extraAdults = Math.max(0, adults - included);
  const extraChildren = Math.max(0, children - Math.max(0, included - adults));
  const extraPax = extraAdults * (rate?.extraAdult ?? 0) + extraChildren * (rate?.extraChild ?? 0);
  const validity = rateValidity(data, code, date);
  const elements = (validity?.inclusiveElements ?? []).flatMap(id => {
    const e = data.elements.find(e => e.active && e.id === id);
    if (!e || /infant/i.test(e.name)) return [];
    const count = /flat/i.test(e.basis) ? 1 : /child/i.test(e.name + e.basis) ? children : /adult/i.test(e.name + e.basis) ? adults : adults + children;
    return [{ name: e.name, amount: e.amount * count, rhythm: e.postingRhythm }];
  });
  const addOns = rateAddOnsForNight(room, date, data, code, stay);
  const addOnTotal = addOns.reduce((sum, item) => sum + item.amount, 0);
  const total = (rate?.amount ?? room.roomRate ?? 0) + extraPax + addOnTotal;
  return { total, elements, addOns, extraPax };
}

export function regeneratePaxBilling(booking: Booking, data: RateSetupData, previous?: Booking): Booking {
  const schedule = [];
  const stay = { arrival: booking.arrival, departure: booking.departure };
  for (const [index, room] of booking.rooms.entries()) {
    for (let copy = 0; copy < room.count; copy++) {
      for (let date = booking.arrival; date < booking.departure;) {
        const roomKey = `${index}-${copy}`, id = `${roomKey}-${date}`;
        const old = booking.billingSchedule?.find(x => x.id === id);
        const code = old?.rateCode || room.rateCode || 'BAR';
        const next = paxNight(room, date, data, code, stay);
        const previousRoom = previous?.rooms[index];
        const before = old ? old.roomRate + (previousRoom ? next.total - paxNight(previousRoom, date, data, code, stay).total : 0) : next.total;
        const discount = old?.discount ?? room.discountPerNight ?? 0;
        schedule.push({ ...old, id, roomKey, roomTypeCode: room.code, roomLabel: `Room ${copy + 1}`, date, rateCode: code, promoCode: old?.promoCode || '', roomRate: before, discount, total: Math.max(0, (before) - discount) });
        const day = new Date(`${date}T00:00:00Z`); day.setUTCDate(day.getUTCDate()+1); date = day.toISOString().slice(0,10);
      }
    }
  }
  return { ...booking, billingSchedule: schedule, amount: schedule.reduce((sum,row) => sum + row.total,0) };
}
