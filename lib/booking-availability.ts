import type { Booking } from '@/lib/bookings';
import type { HotelRoomType } from '@/lib/hotel-masters';

export const occupyingBookingStatuses = new Set(['Booked', 'Inhouse']);

export function availabilityDays(start: string, length = 8) {
  return Array.from({ length }, (_, index) => {
    const date = new Date(`${start}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + index);
    return {
      key: date.toISOString().slice(0, 10),
      day: date.getUTCDate(),
      weekday: date.toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }).toUpperCase(),
    };
  });
}

export function bookedRoomCount(bookings: Booking[], roomTypeCode: string, date: string) {
  return bookings
    .filter((booking) => occupyingBookingStatuses.has(booking.status) && booking.arrival <= date && date < booking.departure)
    .reduce((sum, booking) => sum + booking.rooms.filter((room) => room.code === roomTypeCode).reduce((count, room) => count + room.count, 0), 0);
}

export function roomAvailability(bookings: Booking[], room: HotelRoomType, date: string) {
  return Math.max(0, room.totalRoom - bookedRoomCount(bookings, room.code, date));
}

export function occupiedRoomCount(bookings: Booking[], roomTypes: HotelRoomType[], date: string) {
  return roomTypes
    .filter((room) => room.active)
    .reduce((sum, room) => sum + bookedRoomCount(bookings, room.code, date), 0);
}
