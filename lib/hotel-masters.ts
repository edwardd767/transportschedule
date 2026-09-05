import { sampleBookings, type Booking } from './bookings';

export type HotelLocation = {
  code: string;
  description: string;
  floorPlanAttachment: string;
  active: boolean;
};

export type HotelRoomType = {
  code: string;
  description: string;
  propertyType: string;
  measureType: string;
  roomSize: number;
  maxGuest: number;
  houseLimit: number;
  housekeepingPoints: number;
  totalRoom: number;
  active: boolean;
};

export type HotelRoom = {
  roomNo: string;
  roomTypeCode: string;
  description: string;
  locationCode: string;
  maxGuest: number;
  roomSize: number;
  displaySequence: number;
  keycardRoomMapping: string;
  active: boolean;
};

export type HotelMasters = {
  locations: HotelLocation[];
  roomTypes: HotelRoomType[];
  rooms: HotelRoom[];
};

const locations: HotelLocation[] = Array.from({ length: 7 }, (_, index) => ({
  code: `L${index + 1}`,
  description: `Level ${index + 1}`,
  floorPlanAttachment: index === 0 ? 'Level 1 Floor Plan' : '',
  active: true,
}));

const roomTypes: HotelRoomType[] = [
  {
    code: 'SPK',
    description: 'SUPERIOR KING',
    propertyType: 'Room',
    measureType: 'Square Metre',
    roomSize: 450,
    maxGuest: 3,
    houseLimit: 3,
    housekeepingPoints: 1,
    totalRoom: 24,
    active: true,
  },
  {
    code: 'DLK',
    description: 'DELUXE KING',
    propertyType: 'Room',
    measureType: 'Square Metre',
    roomSize: 500,
    maxGuest: 3,
    houseLimit: 3,
    housekeepingPoints: 1,
    totalRoom: 20,
    active: true,
  },
  {
    code: 'SPT',
    description: 'SUPERIOR TWIN',
    propertyType: 'Room',
    measureType: 'Square Metre',
    roomSize: 450,
    maxGuest: 3,
    houseLimit: 3,
    housekeepingPoints: 1,
    totalRoom: 18,
    active: true,
  },
];

function roomsFor(
  type: HotelRoomType,
  floor: number,
  start: number,
): HotelRoom[] {
  return Array.from({ length: type.totalRoom }, (_, index) => {
    const roomNo = String(start + index);
    return {
      roomNo,
      roomTypeCode: type.code,
      description: `Room ${roomNo}`,
      locationCode: `L${floor}`,
      maxGuest: type.maxGuest,
      roomSize: type.roomSize,
      displaySequence: index + 1,
      keycardRoomMapping: '',
      active: true,
    };
  });
}

export const initialHotelMasters: HotelMasters = {
  locations,
  roomTypes,
  rooms: [
    ...roomsFor(roomTypes[0], 7, 701),
    ...roomsFor(roomTypes[1], 5, 501),
    ...roomsFor(roomTypes[2], 3, 301),
  ],
};

export const initialBookings: Booking[] = sampleBookings;

export function roomTypeRoomCount(masters: HotelMasters, code: string) {
  return masters.rooms.filter((room) => room.roomTypeCode === code).length;
}

export function nextBookingReference(bookings: Booking[]) {
  const highest = bookings.reduce((max, booking) => {
    const match = /^P(\d+)$/.exec(booking.reference);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `P${String(highest + 1).padStart(6, '0')}`;
}
