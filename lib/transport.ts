export type Group = {
  id: string;
  bookingId?: string;
  reference: string;
  name: string;
  adults: number;
  children: number;
  infants?: number;
  boarded: boolean;
};
export type Operator = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  active: boolean;
};
export type ServiceType =
  | 'Speedboat'
  | 'Taxi Pickup'
  | 'Taxi Drop-off'
  | 'Hotel Van'
  | 'Shuttle'
  | 'Other';
export type ServiceBookingMode = 'Scheduled' | 'OnDemand';

/** The stored value remains Scheduled for existing data compatibility. */
export function tripStatusLabel(status: string) {
  return status === 'Scheduled' ? 'Booked' : status;
}
export type ServiceChargeRate = { chargeId: string; chargeTitle: string; adultRate: number; childRate: number; infantRate: number };
export type Boat = {
  id: string;
  name: string;
  operatorId: string;
  capacity: number;
  status: 'Active' | 'Maintenance' | 'Inactive';
  serviceType: ServiceType;
  bookingMode: ServiceBookingMode;
  incidentalCharge?: ServiceChargeRate;
};
export type TransportRoute = {
  id: string;
  origin: string;
  destination: string;
  meetingPoint: string;
  durationMinutes: number;
  operatorId: string;
  toHotel: boolean;
  active: boolean;
};
export type OperatingRules = {
  start: string;
  end: string;
  turnaroundMinutes: number;
  boardingLeadMinutes: number;
  notes: string;
};
export type TransportSetup = {
  operators: Operator[];
  boats: Boat[];
  routes: TransportRoute[];
  rules: OperatingRules;
};
export const initialSetup: TransportSetup = {
  operators: [
    {
      id: 'operator-1',
      name: 'Hotel Transport Services',
      contact: '',
      phone: '',
      email: '',
      active: true,
    },
  ],
  boats: [
    ...[1, 2, 3].map((n) => ({
      id: `boat-${n}`,
      name: `Rawa 0${n}`,
      operatorId: 'operator-1',
      capacity: 16,
      status: 'Active' as const,
      serviceType: 'Speedboat' as const,
      bookingMode: 'Scheduled' as const,
    })),
    {
      id: 'taxi-pickup',
      name: 'Taxi Pickup',
      operatorId: 'operator-1',
      capacity: 4,
      status: 'Active',
      serviceType: 'Taxi Pickup',
      bookingMode: 'OnDemand',
    },
    {
      id: 'taxi-dropoff',
      name: 'Taxi Drop-off',
      operatorId: 'operator-1',
      capacity: 4,
      status: 'Active',
      serviceType: 'Taxi Drop-off',
      bookingMode: 'OnDemand',
    },
  ],
  routes: [
    {
      id: 'inbound',
      origin: 'Mersing',
      destination: 'Rawa',
      meetingPoint: 'Mersing Jetty',
      durationMinutes: 45,
      operatorId: 'operator-1',
      toHotel: true,
      active: true,
    },
    {
      id: 'outbound',
      origin: 'Rawa',
      destination: 'Mersing',
      meetingPoint: 'Rawa Island Jetty',
      durationMinutes: 45,
      operatorId: 'operator-1',
      toHotel: false,
      active: true,
    },
  ],
  rules: {
    start: '07:00',
    end: '19:00',
    turnaroundMinutes: 0,
    boardingLeadMinutes: 30,
    notes:
      'Water level at least 1.7 metres. Return to port 30 minutes before low tide. Operator approval is required for tide and weather conditions.',
  },
};
export type Trip = {
  id: string;
  date: string;
  time: string;
  direction: string;
  origin: string;
  destination: string;
  meetingPoint: string;
  durationMinutes: number;
  boardingLeadMinutes: number;
  turnaroundMinutes: number;
  operatingNotes: string;
  toHotel: boolean;
  boatId: string;
  boat: string;
  operator: string;
  capacity: number;
  status: 'Scheduled' | 'Boarding' | 'Delayed' | 'Cancelled' | 'Completed';
  groups: Group[];
};
export function validateSetup(setup: TransportSetup) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (
    !time.test(setup.rules.start) ||
    !time.test(setup.rules.end) ||
    setup.rules.start >= setup.rules.end
  )
    throw new Error(
      'Operating end time must be later than the start time on the same day.',
    );
  if (
    !Number.isInteger(setup.rules.turnaroundMinutes) ||
    setup.rules.turnaroundMinutes < 0 ||
    !Number.isInteger(setup.rules.boardingLeadMinutes) ||
    setup.rules.boardingLeadMinutes < 0
  )
    throw new Error(
      'Enter whole, non-negative minutes for turnaround and boarding.',
    );
  for (const [label, items] of [
    ['operator', setup.operators],
    ['service', setup.boats],
  ] as const) {
    const names = items.map((i) => i.name.trim().toLowerCase());
    if (names.some((n) => !n) || new Set(names).size !== names.length)
      throw new Error(`Each ${label} must have a unique name.`);
  }
  for (const boat of setup.boats) {
    if (!Number.isInteger(boat.capacity) || boat.capacity < 1)
      throw new Error('Service capacity must be at least one whole passenger.');
    if (!setup.operators.some((o) => o.id === boat.operatorId))
      throw new Error('Choose an operator for each service.');
  }
  for (const route of setup.routes) {
    if (
      !route.origin.trim() ||
      !route.destination.trim() ||
      route.origin.trim().toLowerCase() ===
        route.destination.trim().toLowerCase()
    )
      throw new Error(
        'A route needs different departure and destination locations.',
      );
    if (!route.meetingPoint.trim())
      throw new Error('Enter a boarding location for each route.');
    if (!Number.isInteger(route.durationMinutes) || route.durationMinutes < 1)
      throw new Error('Journey duration must be at least one whole minute.');
    if (!setup.operators.some((o) => o.id === route.operatorId))
      throw new Error('Choose an operator for each route.');
  }
  const routeKeys = setup.routes.map(
    (r) =>
      `${r.origin.trim().toLowerCase()}|${r.destination.trim().toLowerCase()}|${r.operatorId}`,
  );
  if (new Set(routeKeys).size !== routeKeys.length)
    throw new Error('This operator already has the same route.');
  return setup;
}
export function tripFromSetup(
  setup: TransportSetup,
  values: {
    id: string;
    date: string;
    time: string;
    routeId: string;
    boatId: string;
  },
): Trip {
  const route = setup.routes.find((r) => r.id === values.routeId && r.active);
  const boat = setup.boats.find(
    (b) => b.id === values.boatId && b.status === 'Active',
  );
  if (!route || !boat)
    throw new Error(
      'Select an active route and available scheduled service in Transport Setup.',
    );
  const operator = setup.operators.find(
    (o) => o.id === route.operatorId && o.active,
  );
  if (!operator || boat.operatorId !== route.operatorId)
    throw new Error('Select a scheduled service belonging to the active route operator.');
  return {
    id: values.id,
    date: values.date,
    time: values.time,
    direction: route.id,
    origin: route.origin,
    destination: route.destination,
    meetingPoint: route.meetingPoint,
    durationMinutes: route.durationMinutes,
    boardingLeadMinutes: setup.rules.boardingLeadMinutes,
    turnaroundMinutes: setup.rules.turnaroundMinutes,
    operatingNotes: setup.rules.notes,
    toHotel: route.toHotel,
    boatId: boat.id,
    boat: boat.name,
    operator: operator.name,
    capacity: boat.capacity,
    status: 'Scheduled',
    groups: [],
  };
}
// Customer's August 2026 schedule. Each opposite-direction departure is 45 minutes
// after its paired departure. These are separate trips, not arrival times.
const august: Record<number, string[]> = {
  1: ['08:30', '09:15', '10:45', '12:15', '13:45', '16:00'],
  2: ['09:30', '11:00', '12:30', '14:00', '16:00'],
  3: ['09:30', '11:00', '12:30', '14:00', '16:00'],
  4: ['10:00', '11:30', '13:00', '14:30'],
  5: ['10:30', '12:00', '13:30'],
  6: ['11:30', '13:00', '14:30'],
  7: ['07:15', '12:00', '13:30', '15:00'],
  8: ['08:30', '09:15', '10:45', '12:15', '13:45', '15:15'],
  9: ['08:30', '09:15', '10:45', '12:15', '13:45', '15:15'],
  10: ['08:45', '10:15', '11:45'],
  11: ['08:30', '09:15', '10:45', '12:15'],
  12: ['08:15', '09:45', '11:15', '12:45'],
  13: ['08:45', '10:15', '11:45', '13:15'],
  14: ['08:45', '10:15', '11:45', '13:15'],
  15: ['08:30', '09:15', '10:45', '12:15', '13:45'],
  16: ['09:00', '10:30', '12:00', '13:30'],
  17: ['10:45', '12:15', '13:45'],
  18: ['10:45', '12:15', '13:45'],
  19: ['10:00', '11:30', '13:00', '14:30'],
  20: ['08:15', '09:45', '11:15', '12:45', '14:15'],
  21: ['08:15', '09:45', '11:15', '12:45', '14:15'],
  22: ['08:15', '09:45', '11:15', '12:45', '14:15'],
  23: ['08:30', '09:15', '10:45', '12:15'],
  24: ['08:15', '09:45', '11:15'],
  25: ['08:45', '10:15', '11:45'],
  26: ['08:45', '10:15', '11:45'],
  27: ['08:30', '09:15', '10:45', '12:15'],
  28: ['08:30', '09:15', '10:45', '12:15'],
  29: ['08:30', '09:15', '10:45', '12:15'],
  30: ['08:15', '09:45', '11:15', '12:45'],
  31: ['08:15', '09:45', '11:15', '12:45'],
};
export function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60)
    .toString()
    .padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}
export function countPassengers(trip: Trip) {
  return trip.groups.reduce((n, g) => n + g.adults + g.children, 0);
}
export function addGroupToTrip(trip: Trip, group: Group): Trip {
  if (trip.status === 'Cancelled' || trip.status === 'Completed')
    throw new Error('This trip is closed to new passengers.');
  if (!group.name.trim() || !group.reference.trim())
    throw new Error('Enter a lead guest and reservation reference.');
  if (
    !Number.isInteger(group.adults) ||
    !Number.isInteger(group.children) ||
    group.adults < 1 ||
    group.children < 0
  )
    throw new Error(
      'Enter at least one adult and a valid whole number of children.',
    );
  if (countPassengers(trip) + group.adults + group.children > trip.capacity)
    throw new Error(
      `Only ${trip.capacity - countPassengers(trip)} seats remain on this trip.`,
    );
  if (
    trip.groups.some(
      (g) =>
        g.reference.trim().toLowerCase() ===
        group.reference.trim().toLowerCase(),
    )
  )
    throw new Error('This reservation already has passengers on this trip.');
  return {
    ...trip,
    groups: [
      ...trip.groups,
      { ...group, name: group.name.trim(), reference: group.reference.trim() },
    ],
  };
}
export function addTrip(
  trips: Trip[],
  trip: Trip,
  rules: OperatingRules = initialSetup.rules,
): Trip[] {
  const validDate = new Date(`${trip.date}T12:00:00`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(trip.date) ||
    Number.isNaN(validDate.getTime()) ||
    moveDate(trip.date, 0) !== trip.date
  )
    throw new Error('Choose a valid departure date.');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trip.time))
    throw new Error('Choose a valid departure time.');
  if (!Number.isInteger(trip.capacity) || trip.capacity < 1)
    throw new Error('Enter a valid seat capacity.');
  const minute = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  if (
    minute(trip.time) < minute(rules.start) ||
    minute(trip.time) + trip.durationMinutes > minute(rules.end)
  )
    throw new Error(
      `The ${trip.durationMinutes}-minute trip must fit within operating hours ${rules.start}–${rules.end}.`,
    );
  if (
    trips.some(
      (t) =>
        t.date === trip.date &&
        t.boatId === trip.boatId &&
        t.status !== 'Cancelled' &&
        minute(trip.time) <
          minute(t.time) + t.durationMinutes + t.turnaroundMinutes &&
        minute(trip.time) + trip.durationMinutes + trip.turnaroundMinutes >
          minute(t.time),
    )
  )
    throw new Error(
      'This boat has an overlapping trip or turnaround time. Choose another boat or time.',
    );
  return [...trips, trip];
}
export function moveDate(date: string, days: number) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
const demoNames = [
  'Daniel Tan',
  'Aisha Rahman',
  'James Wilson',
  'Mei Lin',
  'Sofia Ahmad',
  'Oliver Lee',
  'Priya Kumar',
  'Amir Hassan',
];
export const initialTrips: Trip[] = Object.entries(august).flatMap(
  ([day, times]) =>
    times.flatMap((time, index) =>
      [0, 1].map((leg) => {
        const id = `TR${day.padStart(2, '0')}${String(index * 2 + leg + 1).padStart(2, '0')}`;
        const demo = Number(day) === 3;
        const count = demo
          ? [12, 8, 16, 6, 10, 14, 9, 4, 7, 5][index * 2 + leg]
          : 0;
        const groups: Group[] = [];
        let remaining = count;
        let g = 0;
        while (remaining > 0) {
          const n = Math.min(remaining, g === 0 ? 4 : 3);
          groups.push({
            id: `${id}-${g}`,
            reference: `DEMO-${100 + index * 10 + leg * 5 + g}`,
            name: demoNames[(index * 2 + leg + g) % demoNames.length],
            adults: n > 2 ? n - 1 : n,
            children: n > 2 ? 1 : 0,
            boarded: false,
          });
          remaining -= n;
          g++;
        }
        return {
          ...tripFromSetup(initialSetup, {
            id,
            date: `2026-08-${day.padStart(2, '0')}`,
            time: leg ? addMinutes(time, 45) : time,
            routeId: leg ? 'outbound' : 'inbound',
            boatId: `boat-${(index % 2) + 1}`,
          }),
          status: 'Scheduled',
          groups,
        } as Trip;
      }),
    ),
);
