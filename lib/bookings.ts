export const bookingStatuses = [
  'Booked',
  'Inhouse',
  'Checkout',
  'Waitlist',
  'Cancelled',
  'No Show',
] as const;

export type BookingStatus = (typeof bookingStatuses)[number];
export type BookingRoom = {
  code: string;
  count: number;
  adults?: number;
  children?: number;
  infants?: number;
  rateCode?: string;
  roomRate?: number;
  promoCode?: string;
  discountPerNight?: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total?: number;
};
export type Booking = {
  reference: string;
  guest: string;
  arrival: string;
  departure: string;
  status: BookingStatus;
  rooms: BookingRoom[];
  assignedRooms: number;
  checkedInGuests: number;
  guests: number;
  amount: number;
  highlightDates?: boolean;
  groupName?: string;
  phone?: string;
  accountName?: string;
  creditLimit?: number;
  printRate?: boolean;
  stateTax?: boolean;
  tourismTax?: boolean;
  email?: string;
  salesChannel?: string;
  source?: string;
  segment?: string;
  referenceNo?: string;
};

// The guest names follow the supplied screen. Statuses and amounts are sample data.
export const sampleBookings: Booking[] = [
  {
    reference: 'P003496',
    guest: 'Edward Jacob',
    arrival: '2026-09-01',
    departure: '2026-09-04',
    status: 'Inhouse',
    rooms: [{ code: 'DLK', count: 2 }],
    assignedRooms: 2,
    checkedInGuests: 2,
    guests: 2,
    amount: 1200,
  },
  {
    reference: 'P003495',
    guest: 'Chia',
    arrival: '2026-09-03',
    departure: '2026-09-04',
    status: 'No Show',
    rooms: [{ code: 'SPK', count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 1,
    amount: 100,
  },
  {
    reference: 'P003494',
    guest: 'Ms.Khor',
    arrival: '2026-09-03',
    departure: '2026-09-04',
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
    guest: 'Tini',
    arrival: '2026-09-04',
    departure: '2026-09-05',
    status: 'No Show',
    rooms: [{ code: 'SPK', count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 1,
    amount: 200,
  },
  {
    reference: 'P003492',
    guest: 'Aaron',
    arrival: '2026-09-05',
    departure: '2026-09-10',
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
  {
    reference: 'P003491',
    guest: 'Nurzaim',
    arrival: '2026-09-02',
    departure: '2026-09-04',
    status: 'Booked',
    rooms: [{ code: 'SPK', count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 2,
    amount: 400,
  },
  {
    reference: 'P003490',
    guest: 'Syuhaidah',
    arrival: '2026-09-06',
    departure: '2026-09-10',
    status: 'Checkout',
    rooms: [{ code: 'DLK', count: 1 }],
    assignedRooms: 1,
    checkedInGuests: 2,
    guests: 2,
    amount: 900,
  },
  {
    reference: 'P003489',
    guest: 'Helmy',
    arrival: '2026-09-07',
    departure: '2026-09-10',
    status: 'Booked',
    rooms: [{ code: 'SPT', count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 3,
    amount: 750,
  },
  {
    reference: 'P003488',
    guest: 'Afiefah',
    arrival: '2026-09-09',
    departure: '2026-09-13',
    status: 'Booked',
    rooms: [{ code: 'DLK', count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 1,
    amount: 450,
  },
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
