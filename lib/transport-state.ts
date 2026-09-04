import {
  initialTrips,
  initialSetup,
  addTrip,
  addGroupToTrip,
  tripFromSetup,
  validateSetup,
  type TransportSetup,
  type Trip,
  type Group,
  type ServiceBookingMode,
  type ServiceType,
} from './transport';
import {
  initialDayNotes,
  validDate,
  validateTemplate,
  generateTemplate,
  assignBookingTransfers,
  editScheduledTrip,
  type ScheduleTemplate,
  type DayNote,
  type BookingTransferSelection,
} from './transport-planning';
import { sampleBookings } from './bookings';
import {
  addBookingTransportLeg,
  removeBookingTransportLeg,
  type BookingTransportLeg,
  type BookingTransportLegInput,
} from './booking-transport';

export type TransportState = {
  setup: TransportSetup;
  trips: Trip[];
  templates: ScheduleTemplate[];
  dayNotes: Record<string, DayNote>;
  bookingLegs: BookingTransportLeg[];
};
export type DepartureInput = {
  id: string;
  date: string;
  time: string;
  boatId: string;
  routeId: string;
};
export type TransportAction =
  | { type: 'setup'; value: TransportSetup }
  | { type: 'templates'; value: ScheduleTemplate[] }
  | { type: 'generate'; template: ScheduleTemplate }
  | { type: 'dayNote'; date: string; note: DayNote }
  | { type: 'addTrip'; values: DepartureInput }
  | { type: 'editTrip'; values: DepartureInput }
  | { type: 'passengers'; tripId: string; group: Group }
  | { type: 'status'; tripId: string; status: Trip['status'] }
  | { type: 'board'; tripId: string; groupId: string; boarded: boolean }
  | {
      type: 'bookingTransportAdd';
      bookingReference: string;
      values: BookingTransportLegInput;
    }
  | {
      type: 'bookingTransportRemove';
      bookingReference: string;
      legId: string;
    }
  | {
      type: 'transfers';
      bookingReference: string;
      selection: BookingTransferSelection;
    };
export type TransportRecord = { revision: number; state: TransportState };
export function newTransportState(): TransportState {
  return structuredClone({
    setup: initialSetup,
    trips: initialTrips,
    templates: [],
    dayNotes: initialDayNotes,
    bookingLegs: [],
  });
}

export function normalizeTransportState(state: TransportState): TransportState {
  return {
    ...state,
    setup: {
      ...state.setup,
      boats: state.setup.boats.map((service) => {
        const type = service.serviceType ?? 'Speedboat';
        return {
          ...service,
          serviceType: type,
          bookingMode:
            service.bookingMode ?? (type === 'Speedboat' ? 'Scheduled' : 'OnDemand'),
        };
      }),
    },
    trips: state.trips.map((trip) =>
      ['Boarding', 'Delayed', 'Completed'].includes(trip.status)
        ? { ...trip, status: 'Scheduled' }
        : trip,
    ),
    bookingLegs: Array.isArray(state.bookingLegs) ? state.bookingLegs : [],
  };
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid form data.');
  return value as Record<string, unknown>;
}
function text(value: unknown, label: string, required = true, max = 2000) {
  if (
    typeof value !== 'string' ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new Error(`Enter a valid ${label}.`);
  return value;
}
function number(value: unknown, label: string, min = 0, max = 10000) {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < min ||
    value > max
  )
    throw new Error(`Enter a valid ${label}.`);
  return value;
}
function boolean(value: unknown) {
  if (typeof value !== 'boolean') throw new Error('Invalid selection.');
  return value;
}
function list(value: unknown, max = 200): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    throw new Error('Too many records or invalid list.');
  return value;
}
function unique(items: { id: string }[]) {
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error('Duplicate record identifiers.');
}
function departure(value: unknown): DepartureInput {
  const v = object(value);
  return {
    id: text(v.id, 'trip ID', true, 200),
    date: text(v.date, 'date', true, 10),
    time: text(v.time, 'time', true, 5),
    boatId: text(v.boatId, 'boat'),
    routeId: text(v.routeId, 'route'),
  };
}
function template(value: unknown): ScheduleTemplate {
  const v = object(value);
  return validateTemplate({
    id: text(v.id, 'template ID', true, 200),
    name: text(v.name, 'template name', true, 80),
    routeId: text(v.routeId, 'route'),
    boatId: text(v.boatId, 'boat'),
    startDate: text(v.startDate, 'start date'),
    endDate: text(v.endDate, 'end date'),
    weekdays: list(v.weekdays, 7).map((day) => number(day, 'weekday', 0, 6)),
    times: list(v.times, 16).map((time) => text(time, 'departure time')),
    excludedDates: list(v.excludedDates, 366).map((date) =>
      text(date, 'excluded date'),
    ),
  });
}
function setup(value: unknown): TransportSetup {
  const v = object(value);
  const operators = list(v.operators).map((item) => {
    const o = object(item);
    return {
      id: text(o.id, 'operator ID'),
      name: text(o.name, 'operator name'),
      contact: text(o.contact, 'contact', false),
      phone: text(o.phone, 'phone', false),
      email: text(o.email, 'email', false),
      active: boolean(o.active),
    };
  });
  const boats = list(v.boats).map((item) => {
    const b = object(item);
    if (!['Active', 'Maintenance', 'Inactive'].includes(String(b.status)))
      throw new Error('Choose a valid service status.');
    const allowedTypes: ServiceType[] = [
      'Speedboat',
      'Taxi Pickup',
      'Taxi Drop-off',
      'Hotel Van',
      'Shuttle',
      'Other',
    ];
    const serviceType = allowedTypes.includes(String(b.serviceType) as ServiceType)
      ? (String(b.serviceType) as ServiceType)
      : 'Speedboat';
    const allowedModes: ServiceBookingMode[] = ['Scheduled', 'OnDemand'];
    const bookingMode = allowedModes.includes(
      String(b.bookingMode) as ServiceBookingMode,
    )
      ? (String(b.bookingMode) as ServiceBookingMode)
      : serviceType === 'Speedboat'
        ? 'Scheduled'
        : 'OnDemand';
    return {
      id: text(b.id, 'service ID'),
      name: text(b.name, 'service name'),
      operatorId: text(b.operatorId, 'operator'),
      capacity: number(b.capacity, 'capacity', 1),
      status: b.status as TransportSetup['boats'][number]['status'],
      serviceType,
      bookingMode,
    };
  });
  const routes = list(v.routes).map((item) => {
    const r = object(item);
    return {
      id: text(r.id, 'route ID'),
      origin: text(r.origin, 'origin'),
      destination: text(r.destination, 'destination'),
      meetingPoint: text(r.meetingPoint, 'meeting point'),
      durationMinutes: number(r.durationMinutes, 'duration', 1, 1440),
      operatorId: text(r.operatorId, 'operator'),
      toHotel: boolean(r.toHotel),
      active: boolean(r.active),
    };
  });
  unique(operators);
  unique(boats);
  unique(routes);
  const r = object(v.rules);
  return validateSetup({
    operators,
    boats,
    routes,
    rules: {
      start: text(r.start, 'opening time'),
      end: text(r.end, 'closing time'),
      turnaroundMinutes: number(r.turnaroundMinutes, 'turnaround', 0, 1440),
      boardingLeadMinutes: number(
        r.boardingLeadMinutes,
        'boarding lead time',
        0,
        1440,
      ),
      notes: text(r.notes, 'notes', false),
    },
  });
}

// Both the demo and the authenticated Worker use these same operation rules.
export function applyTransportAction(
  state: TransportState,
  input: unknown,
): TransportState {
  const action = object(input);
  const trip = () => {
    const found = state.trips.find(
      (item) => item.id === text(action.tripId, 'trip ID'),
    );
    if (!found) throw new Error('This departure is no longer available.');
    return found;
  };
  const replace = (changed: Trip) => ({
    ...state,
    trips: state.trips.map((item) => (item.id === changed.id ? changed : item)),
  });
  switch (action.type) {
    case 'setup':
      return { ...state, setup: setup(action.value) };
    case 'templates': {
      const templates = list(action.value).map(template);
      unique(templates);
      for (const t of templates) {
        if (
          !state.setup.routes.some((r) => r.id === t.routeId) ||
          !state.setup.boats.some((b) => b.id === t.boatId)
        )
          throw new Error(
            'Choose an existing route and scheduled service for each template.',
          );
      }
      return { ...state, templates };
    }
    case 'generate': {
      const result = generateTemplate(
        state.trips,
        state.setup,
        template(action.template),
      );
      if (result.trips.length > 10000)
        throw new Error('The prototype supports up to 10,000 departures.');
      return { ...state, trips: result.trips };
    }
    case 'dayNote': {
      const date = text(action.date, 'date');
      if (!validDate(date)) throw new Error('Choose a valid date.');
      const v = object(action.note);
      const note = {
        tide: text(v.tide, 'tide', false),
        restricted: text(v.restricted, 'restricted times', false),
        holiday: text(v.holiday, 'holiday', false),
        notes: text(v.notes, 'notes', false),
      };
      if (
        !Object.hasOwn(state.dayNotes, date) &&
        Object.keys(state.dayNotes).length >= 3660
      )
        throw new Error('Too many calendar notes.');
      return { ...state, dayNotes: { ...state.dayNotes, [date]: note } };
    }
    case 'addTrip': {
      const values = departure(action.values);
      if (state.trips.some((t) => t.id === values.id))
        throw new Error('This departure has already been added.');
      if (state.trips.length >= 10000)
        throw new Error('The prototype supports up to 10,000 departures.');
      return {
        ...state,
        trips: addTrip(
          state.trips,
          tripFromSetup(state.setup, values),
          state.setup.rules,
        ),
      };
    }
    case 'editTrip': {
      const values = departure(action.values);
      const original = state.trips.find((t) => t.id === values.id);
      if (!original) throw new Error('This departure is no longer available.');
      return {
        ...state,
        trips: editScheduledTrip(state.trips, state.setup, original, values),
      };
    }
    case 'passengers': {
      const g = object(action.group);
      if (g.bookingId)
        throw new Error(
          'Use Booking Transport to assign linked booking transfers.',
        );
      const current = trip();
      const group = {
        id: text(g.id, 'party ID'),
        name: text(g.name, 'guest name', true, 200),
        reference: text(g.reference, 'reference', true, 100),
        adults: number(g.adults, 'adults', 1),
        children: number(g.children, 'children'),
        boarded: false,
      };
      if (current.groups.some((item) => item.id === group.id))
        throw new Error('This party has already been added.');
      return replace(addGroupToTrip(current, group));
    }
    case 'status': {
      const current = trip();
      if (
        !['Scheduled', 'Cancelled'].includes(String(action.status))
      )
        throw new Error('Choose a valid trip status.');
      return replace({ ...current, status: action.status as Trip['status'] });
    }
    case 'board': {
      const current = trip();
      if (['Cancelled', 'Completed'].includes(current.status))
        throw new Error('Boarding cannot be changed on a closed departure.');
      const groupId = text(action.groupId, 'party ID');
      if (!current.groups.some((g) => g.id === groupId))
        throw new Error('This passenger party no longer exists.');
      return replace({
        ...current,
        groups: current.groups.map((g) =>
          g.id === groupId ? { ...g, boarded: boolean(action.boarded) } : g,
        ),
      });
    }
    case 'bookingTransportAdd': {
      const booking = sampleBookings.find(
        (b) =>
          b.reference === text(action.bookingReference, 'booking reference'),
      );
      if (!booking) throw new Error('This demo booking does not exist.');
      const v = object(action.values);
      const direction = String(v.direction);
      if (direction !== 'arrival' && direction !== 'departure')
        throw new Error('Choose arrival or departure transport.');
      const values: BookingTransportLegInput = {
        id: text(v.id, 'transport leg ID', true, 200),
        direction,
        serviceId: text(v.serviceId, 'service'),
        tripId: text(v.tripId, 'departure', false, 200),
        date: text(v.date, 'date', false, 10),
        time: text(v.time, 'time', false, 5),
        pickup: text(v.pickup, 'pickup location', false, 150),
        dropoff: text(v.dropoff, 'drop-off location', false, 150),
        passengers: number(v.passengers, 'passengers', 1, booking.guests),
        flightNo: text(v.flightNo, 'flight/reference', false, 80),
        vehicle: text(v.vehicle, 'vehicle', false, 100),
        driver: text(v.driver, 'driver', false, 100),
        remarks: text(v.remarks, 'remarks', false, 1000),
      };
      const normalized = normalizeTransportState(state);
      const result = addBookingTransportLeg(
        normalized.trips,
        normalized.setup,
        normalized.bookingLegs,
        booking,
        values,
      );
      return {
        ...normalized,
        trips: result.trips,
        bookingLegs: [...normalized.bookingLegs, result.leg],
      };
    }
    case 'bookingTransportRemove': {
      const bookingReference = text(
        action.bookingReference,
        'booking reference',
      );
      const normalized = normalizeTransportState(state);
      const result = removeBookingTransportLeg(
        normalized.trips,
        normalized.bookingLegs,
        bookingReference,
        text(action.legId, 'transport leg ID', true, 200),
      );
      return {
        ...normalized,
        trips: result.trips,
        bookingLegs: result.legs,
      };
    }
    case 'transfers': {
      const booking = sampleBookings.find(
        (b) =>
          b.reference === text(action.bookingReference, 'booking reference'),
      );
      if (!booking) throw new Error('This demo booking does not exist.');
      const v = object(action.selection);
      const selection = {
        arrivalId: text(v.arrivalId, 'arrival', false),
        returnId: text(v.returnId, 'return', false),
        adults: number(v.adults, 'adults', 1),
        children: number(v.children, 'children'),
      };
      return {
        ...state,
        trips: assignBookingTransfers(state.trips, booking, selection),
      };
    }
    default:
      throw new Error('Unsupported transport action.');
  }
}
