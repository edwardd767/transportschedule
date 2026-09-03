export const bookingStatuses = [
  'Booked',
  'Inhouse',
  'Checkout',
  'Waitlist',
  'Cancelled',
  'No Show',
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];
export type Booking = {
  reference: string;
  guest: string;
  arrival: string;
  departure: string;
  status: BookingStatus;
  rooms: { code: string; count: number }[];
  assignedRooms: number;
  checkedInGuests: number;
  guests: number;
  amount: number;
  highlightDates?: boolean;
};

// The first five rows follow the supplied screen. Remaining rows are demo data.
export const sampleBookings: Booking[] = [
  {
    reference: 'P003496',
    guest: 'mikail',
    arrival: '2026-08-31',
    departure: '2026-09-03',
    status: 'Inhouse',
    rooms: [{ code: 'DLK', count: 2 }],
    assignedRooms: 2,
    checkedInGuests: 2,
    guests: 2,
    amount: 1200,
  },
  {
    reference: 'P003495',
    guest: 'CHIA',
    arrival: '2026-08-29',
    departure: '2026-08-30',
    status: 'No Show',
    rooms: [{ code: 'SPK', count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 1,
    amount: 100,
  },
  {
    reference: 'P003494',
    guest: 'HAQEEM BIN MHD EFFENDI',
    arrival: '2026-08-29',
    departure: '2026-08-30',
    status: 'No Show',
    rooms: [
      { code: 'SPK', count: 1 },
      { code: 'SPT', count: 1 },
    ],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 2,
    amount: 350,
  },
  {
    reference: 'P003493',
    guest: 'syafiqtester123',
    arrival: '2026-08-29',
    departure: '2026-08-30',
    status: 'No Show',
    rooms: [{ code: 'SPK', count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 1,
    amount: 200,
  },
  {
    reference: 'P003492',
    guest: 'Helmy',
    arrival: '2026-08-29',
    departure: '2026-09-03',
    status: 'Inhouse',
    rooms: [
      { code: 'SPK', count: 1 },
      { code: 'DLK', count: 1 },
    ],
    assignedRooms: 1,
    checkedInGuests: 2,
    guests: 3,
    amount: 1250,
    highlightDates: true,
  },
  ...Array.from({ length: 15 }, (_, index): Booking => {
    const day = 28 - index;
    const status = bookingStatuses[(index + 5) % bookingStatuses.length];
    const count = index === 0 ? 4 : (index % 3) + 1;
    return {
      reference: `P00${3491 - index}`,
      guest: `Sample guest ${String(index + 6).padStart(2, '0')}`,
      arrival: `2026-08-${String(day).padStart(2, '0')}`,
      departure: `2026-08-${String(day + 2).padStart(2, '0')}`,
      status,
      rooms: [{ code: index % 2 === 0 ? 'SPK' : 'DLK', count }],
      assignedRooms: status === 'Inhouse' || status === 'Checkout' ? count : 0,
      checkedInGuests: status === 'Inhouse' ? count : 0,
      guests: count,
      amount: index === 0 ? 550 : count * 250,
      highlightDates: index === 0,
    };
  }),
];

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});
const amountFormatter = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export function stayDates(booking: Booking) {
  return `${dateFormatter.format(new Date(`${booking.arrival}T00:00:00Z`))} – ${dateFormatter.format(new Date(`${booking.departure}T00:00:00Z`))}`;
}
export function bookingAmount(booking: Booking) {
  return amountFormatter.format(booking.amount);
}
export function roomCount(booking: Booking) {
  return booking.rooms.reduce((total, room) => total + room.count, 0);
}
export function bookingStatusClass(status: BookingStatus) {
  return `booking-status-${status.toLowerCase().replaceAll(' ', '-')}`;
}
