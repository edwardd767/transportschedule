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
export type RoomStatus = { code: string; description: string; color: string; active: boolean };
export type HotelDepartment = {
  id: string;
  name: string;
  incidentalCharges: string[];
  reasons: string[];
  salesChannels: string[];
};

export type HotelMasters = {
  locations: HotelLocation[];
  roomTypes: HotelRoomType[];
  rooms: HotelRoom[];
  roomStatuses: RoomStatus[];
  departments: HotelDepartment[];
};
export const initialRoomStatuses: RoomStatus[] = [
  { code: 'OC', description: 'Occupied Clean', color: '#26743a', active: true },
  { code: 'OD', description: 'Occupied Dirty', color: '#a5001b', active: true },
  { code: 'OOI', description: 'Out of Inventory', color: '#cfcfcf', active: true },
  { code: 'OOO', description: 'Out of Order', color: '#555555', active: true },
  { code: 'VC', description: 'Vacant Clean', color: '#80c83b', active: true },
  { code: 'VD', description: 'Vacant Dirty', color: '#e4002b', active: true },
  { code: 'VI', description: 'Vacant Inspection', color: '#2f4bc4', active: false },
  { code: 'VR', description: 'Vacant Ready', color: '#2ca9df', active: true },
];
const entries = (prefix: string, total: number) => Array.from({ length: total }, (_, index) => `${prefix} ${index + 1}`);
export const initialDepartments: HotelDepartment[] = [
  ['banquet', 'Banquet', 15, 1, 0], ['breakfast-ta', 'Breakfast (TA)', 1, 1, 0],
  ['city-ledger', 'City Ledger', 17, 0, 0], ['food-beverages', 'Food and Beverages', 47, 4, 0],
  ['front-office', 'Front Office', 19, 5, 0], ['hotel-adjustment', 'Hotel Adjustment', 1, 0, 0],
  ['housekeeping', 'Housekeeping', 8, 7, 0], ['room-revenue', 'Room Revenue', 6, 5, 0],
  ['room-service', 'Room service', 1, 0, 0], ['sales-marketing', 'Sales & Marketing', 0, 0, 13],
].map(([id, name, charges, reasons, channels]) => ({ id: String(id), name: String(name), incidentalCharges: entries('Charge', Number(charges)), reasons: entries('Reason', Number(reasons)), salesChannels: entries('Sales Channel', Number(channels)) }));

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
  roomStatuses: initialRoomStatuses,
  departments: initialDepartments,
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
