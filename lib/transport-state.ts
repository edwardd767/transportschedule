import {
  initialTrips,
  initialSetup,
  addTrip,
  addGroupToTrip,
  countPassengers,
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
import type { Booking } from './bookings';
import {
  initialBookings,
  initialHotelMasters,
  type HotelLocation,
  type HotelMasters,
  type HotelRoom,
  type HotelRoomType,
  type HotelDepartment,
  type RoomStatus,
} from './hotel-masters';
import {
  addBookingTransportLeg,
  removeBookingTransportLeg,
  type BookingTransportLeg,
  type BookingTransportLegInput,
} from './booking-transport';
import { initialRateSetupData, type RateSetupData } from './rate-setup-data';

export type TransportState = {
  setup: TransportSetup;
  trips: Trip[];
  templates: ScheduleTemplate[];
  dayNotes: Record<string, DayNote>;
  bookingLegs: BookingTransportLeg[];
  hotelMasters: HotelMasters;
  bookings: Booking[];
  rateSetup: RateSetupData;
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
  | { type: 'passengerUpdate'; tripId: string; groupId: string; adults: number; children: number; infants: number }
  | { type: 'passengerRemove'; tripId: string; groupId: string }
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
  | { type: 'bookingTransportUpdate'; bookingReference: string; legId: string; adults: number; children: number; infants: number; adultRate: number; childRate: number; infantRate: number }
  | { type: 'hotelLocationSave'; value: HotelLocation }
  | { type: 'hotelRoomTypeSave'; value: HotelRoomType }
  | { type: 'hotelRoomSave'; value: HotelRoom }
  | { type: 'roomStatusSave'; value: RoomStatus[] }
  | { type: 'departmentSave'; value: HotelDepartment[] }
  | { type: 'bookingCreate'; value: Booking }
  | { type: 'bookingUpdate'; value: Booking }
  | { type: 'rateSetup'; value: RateSetupData }
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
    hotelMasters: initialHotelMasters,
    bookings: initialBookings,
    rateSetup: initialRateSetupData,
  });
}

export function normalizeTransportState(state: TransportState): TransportState {
  const hotelMasters =
    state.hotelMasters &&
    Array.isArray(state.hotelMasters.locations) &&
    Array.isArray(state.hotelMasters.roomTypes) &&
    Array.isArray(state.hotelMasters.rooms) &&
    state.hotelMasters.roomTypes.length
      ? { ...state.hotelMasters, roomStatuses: Array.isArray(state.hotelMasters.roomStatuses) ? state.hotelMasters.roomStatuses : structuredClone(initialHotelMasters.roomStatuses), departments: Array.isArray(state.hotelMasters.departments) ? state.hotelMasters.departments.map((department, departmentIndex) => ({ ...department, incidentalCharges: Array.isArray(department.incidentalCharges) ? department.incidentalCharges.map((charge, chargeIndex) => typeof charge === 'string' ? { id: `${department.id || departmentIndex}-charge-${chargeIndex + 1}`, title: charge, amount: 0, taxScheme: 'SST-3', outletCode: '', rateElement: false, guestAppFb: false, guestAppOnlineShop: false, posInterface: false, eventInterface: false, allowNegative: false, packageRedemption: false, kiosk: false, thirdPartyPos: false, eInvoice: false, msicCode: '55101', classification: '022' } : charge) : [] })) : structuredClone(initialHotelMasters.departments) }
      : structuredClone(initialHotelMasters);
  const bookings =
    Array.isArray(state.bookings) && state.bookings.length
      ? state.bookings
      : structuredClone(initialBookings);
  const savedRateSetup =
    state.rateSetup &&
    Array.isArray(state.rateSetup.seasons) && state.rateSetup.seasons.length &&
    state.rateSetup.calendar && typeof state.rateSetup.calendar === 'object' &&
    Array.isArray(state.rateSetup.elements) && state.rateSetup.elements.length &&
    Array.isArray(state.rateSetup.rateTypes) && state.rateSetup.rateTypes.length &&
    Array.isArray(state.rateSetup.ratePlans) && state.rateSetup.ratePlans.length &&
    Array.isArray(state.rateSetup.validity)
      ? state.rateSetup
      : structuredClone(initialRateSetupData);
  const rateSetup = {
    ...savedRateSetup,
    elements: savedRateSetup.elements.map((element) => ({
      ...element,
      postingRhythm: element.postingRhythm ?? 'Daily',
    })),
    ratePlans: savedRateSetup.ratePlans.map((plan) => ({
      ...plan,
      rateTypeId: plan.rateTypeId ?? '',
      rateFrequency: plan.rateFrequency === 'Monthly' ? 'Monthly' : 'Daily',
    })),
  };
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
    hotelMasters,
    bookings,
    rateSetup,
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
function decimal(value: unknown, label: string, min = 0, max = 100000000) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`Enter a valid ${label}.`);
  return value;
}
function rateSetup(value: unknown): RateSetupData {
  const v = object(value);
  const seasons = list(v.seasons, 200).map((entry) => {
    const row = object(entry);
    return { id: text(row.id, 'season ID', true, 100), name: text(row.name, 'season name', true, 120).trim(), color: text(row.color, 'season colour', true, 20), active: boolean(row.active) };
  });
  unique(seasons);
  const seasonIds = new Set(seasons.map((item) => item.id));
  const calendarRaw = object(v.calendar);
  const calendar: Record<string, string> = {};
  for (const [date, seasonIdValue] of Object.entries(calendarRaw)) {
    if (!validDate(date)) throw new Error('Choose a valid season calendar date.');
    if (typeof seasonIdValue !== 'string' || !seasonIds.has(seasonIdValue)) continue;
    calendar[date] = seasonIdValue;
  }
  const elements = list(v.elements, 1000).map((entry) => {
    const row = object(entry);
    const min = number(row.min, 'minimum quantity', 0, 10000);
    const max = number(row.max, 'maximum quantity', min, 10000);
    const basis = text(row.basis, 'charge basis', true, 80);
    if (!['Flat Rate', 'Per Person', 'Per Adult', 'Per Child', 'Per Infant'].includes(basis)) throw new Error('Choose a valid charge basis.');
    const postingRhythm = typeof row.postingRhythm === 'string' ? row.postingRhythm : 'Daily';
    if (!['Daily', 'First Night', 'Last Night'].includes(postingRhythm)) throw new Error('Choose a valid posting rhythm.');
    return { id: text(row.id, 'rate element ID', true, 100), name: text(row.name, 'rate element', true, 160).trim(), basis, postingRhythm: postingRhythm as 'Daily' | 'First Night' | 'Last Night', min, max, amount: decimal(row.amount, 'rate element amount'), active: boolean(row.active) };
  });
  unique(elements);
  const rateTypes = list(v.rateTypes, 1000).map((entry) => {
    const row = object(entry);
    return { id: text(row.id, 'rate type ID', true, 100), name: text(row.name, 'rate type', true, 160).trim(), active: boolean(row.active) };
  });
  unique(rateTypes);
  const rateTypeIds = new Set(rateTypes.map((item) => item.id));
  const ratePlans = list(v.ratePlans, 2000).map((entry) => {
    const row = object(entry);
    const rateTypeId = text(row.rateTypeId, 'rate type', true, 100);
    if (!rateTypeIds.has(rateTypeId)) throw new Error('Choose an existing Rate Type.');
    const rateFrequency = row.rateFrequency === 'Monthly' ? 'Monthly' : 'Daily';
    return { id: text(row.id, 'rate setup ID', true, 100), code: text(row.code, 'rate code', true, 100).trim(), description: text(row.description, 'rate description', true, 240).trim(), rateTypeId, rateFrequency, updated: text(row.updated, 'last updated date', false, 40), active: boolean(row.active), web: typeof row.web === 'boolean' ? row.web : false };
  });
  unique(ratePlans);
  const ratePlanIds = new Set(ratePlans.map((item) => item.id));
  const validity = list(v.validity, 4000).map((entry) => {
    const row = object(entry);
    const from = text(row.from, 'valid from', true, 10);
    const to = text(row.to, 'valid to', true, 10);
    if (!validDate(from) || !validDate(to) || to < from) throw new Error('Validity end date must be on or after the start date.');
    const rateSetupId = text(row.rateSetupId, 'rate setup', true, 100);
    if (!ratePlanIds.has(rateSetupId)) throw new Error('Choose an existing Rate Setup for the validity period.');
    return { id: text(row.id, 'validity ID', true, 100), rateSetupId, from, to, active: boolean(row.active) };
  });
  unique(validity);
  return { seasons, calendar, elements, rateTypes, ratePlans, validity };
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
    const charge = b.incidentalCharge && typeof b.incidentalCharge === 'object'
      ? object(b.incidentalCharge)
      : null;
    const incidentalCharge = charge?.chargeId
      ? {
          chargeId: text(charge.chargeId, 'incidental charge'),
          chargeTitle: text(charge.chargeTitle, 'incidental charge title'),
          adultRate: decimal(charge.adultRate, 'adult rate'),
          childRate: decimal(charge.childRate, 'child rate'),
          infantRate: decimal(charge.infantRate, 'infant rate'),
        }
      : undefined;
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
      incidentalCharge,
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
    case 'roomStatusSave': {
      const value = list(action.value).map((item) => { const row = object(item); return { code: text(row.code, 'status code', true, 20).toUpperCase(), description: text(row.description, 'room status', true, 100), color: text(row.color, 'status color', true, 20), active: boolean(row.active) }; });
      if (new Set(value.map((item) => item.code)).size !== value.length)
        throw new Error('Duplicate room status codes.');
      return { ...state, hotelMasters: { ...state.hotelMasters, roomStatuses: value } };
    }
    case 'departmentSave': {
      const value = list(action.value).map((item) => { const row = object(item); return { id: text(row.id, 'department ID', true, 60), name: text(row.name, 'department name', true, 100), incidentalCharges: list(row.incidentalCharges).map((v) => { const charge = object(v); return { id: text(charge.id, 'charge ID', true, 100), title: text(charge.title, 'charge title', true, 100), amount: number(charge.amount, 'amount', 0, 999999), taxScheme: text(charge.taxScheme, 'tax scheme', true, 40), outletCode: text(charge.outletCode, 'outlet code', false, 40), rateElement: boolean(charge.rateElement), guestAppFb: boolean(charge.guestAppFb), guestAppOnlineShop: boolean(charge.guestAppOnlineShop), posInterface: boolean(charge.posInterface), eventInterface: boolean(charge.eventInterface), allowNegative: boolean(charge.allowNegative), packageRedemption: boolean(charge.packageRedemption), kiosk: boolean(charge.kiosk), thirdPartyPos: boolean(charge.thirdPartyPos), eInvoice: boolean(charge.eInvoice), msicCode: text(charge.msicCode, 'MSIC code', false, 40), classification: text(charge.classification, 'classification', false, 40) }; }), reasons: list(row.reasons).map((v) => text(v, 'reason', true, 100)), salesChannels: list(row.salesChannels).map((v) => text(v, 'sales channel', true, 100)) }; });
      if (new Set(value.map((item) => item.id)).size !== value.length) throw new Error('Duplicate department IDs.');
      return { ...state, hotelMasters: { ...state.hotelMasters, departments: value } };
    }
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
    case 'passengerUpdate': {
      const current = trip();
      const groupId = text(action.groupId, 'party ID');
      const adults = number(action.adults, 'adults', 0, current.capacity);
      const children = number(action.children, 'children', 0, current.capacity);
      const infants = number(action.infants, 'infants', 0, current.capacity);
      const group = current.groups.find((item) => item.id === groupId);
      if (!group) throw new Error('This reservation no longer exists.');
      if (adults + children < 1 || countPassengers(current) - group.adults - group.children + adults + children > current.capacity)
        throw new Error('Passenger count exceeds available seats.');
      return {
        ...state,
        bookingLegs: group.bookingId ? state.bookingLegs.map((leg) => leg.bookingReference === group.bookingId && leg.tripId === current.id ? { ...leg, passengers: adults + children } : leg) : state.bookingLegs,
        trips: state.trips.map((item) => item.id === current.id ? { ...current, groups: current.groups.map((item) => item.id === groupId ? { ...item, adults, children, infants } : item) } : item),
      };
    }
    case 'passengerRemove': {
      const current = trip();
      const groupId = text(action.groupId, 'party ID');
      const group = current.groups.find((item) => item.id === groupId);
      if (!group) throw new Error('This reservation no longer exists.');
      if (current.status === 'Completed' || group.boarded) throw new Error('Boarded or completed transport cannot be removed.');
      return {
        ...state,
        bookingLegs: group.bookingId ? state.bookingLegs.filter((leg) => !(leg.bookingReference === group.bookingId && leg.tripId === current.id)) : state.bookingLegs,
        trips: state.trips.map((item) => item.id === current.id ? { ...current, groups: current.groups.filter((item) => item.id !== groupId) } : item),
      };
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
    case 'hotelLocationSave': {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const value: HotelLocation = {
        code: text(v.code, 'location code', true, 20).trim().toUpperCase(),
        description: text(v.description, 'location description', true, 120).trim(),
        floorPlanAttachment: text(v.floorPlanAttachment, 'floor plan attachment', false, 255).trim(),
        active: boolean(v.active),
      };
      const exists = normalized.hotelMasters.locations.some((item) => item.code === value.code);
      return {
        ...normalized,
        hotelMasters: {
          ...normalized.hotelMasters,
          locations: exists
            ? normalized.hotelMasters.locations.map((item) => item.code === value.code ? value : item)
            : [...normalized.hotelMasters.locations, value],
        },
      };
    }
    case 'hotelRoomTypeSave': {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const code = text(v.code, 'room type code', true, 20).trim().toUpperCase();
      const value: HotelRoomType = {
        code,
        description: text(v.description, 'room type description', true, 120).trim(),
        propertyType: text(v.propertyType, 'property type', true, 60).trim(),
        measureType: text(v.measureType, 'measure type', true, 60).trim(),
        roomSize: number(v.roomSize, 'room size', 0, 100000),
        maxGuest: number(v.maxGuest, 'max guest', 1, 50),
        houseLimit: number(v.houseLimit, 'house limit', 0, 50),
        housekeepingPoints: number(v.housekeepingPoints, 'housekeeping points', 0, 10000),
        totalRoom: normalized.hotelMasters.rooms.filter((room) => room.roomTypeCode === code).length,
        active: boolean(v.active),
      };
      const exists = normalized.hotelMasters.roomTypes.some((item) => item.code === code);
      return {
        ...normalized,
        hotelMasters: {
          ...normalized.hotelMasters,
          roomTypes: exists
            ? normalized.hotelMasters.roomTypes.map((item) => item.code === code ? value : item)
            : [...normalized.hotelMasters.roomTypes, value],
          rooms: normalized.hotelMasters.rooms.map((room) =>
            room.roomTypeCode === code
              ? { ...room, maxGuest: value.maxGuest, roomSize: value.roomSize }
              : room,
          ),
        },
      };
    }
    case 'hotelRoomSave': {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const roomNo = text(v.roomNo, 'room number', true, 30).trim().toUpperCase();
      const roomTypeCode = text(v.roomTypeCode, 'room type', true, 20).trim().toUpperCase();
      const locationCode = text(v.locationCode, 'location', true, 20).trim().toUpperCase();
      const roomType = normalized.hotelMasters.roomTypes.find((item) => item.code === roomTypeCode && item.active);
      if (!roomType) throw new Error('Choose an active Room Type from Hotel Settings.');
      if (!normalized.hotelMasters.locations.some((item) => item.code === locationCode && item.active))
        throw new Error('Choose an active Location from Hotel Settings.');
      const value: HotelRoom = {
        roomNo,
        roomTypeCode,
        description: text(v.description, 'room description', true, 120).trim(),
        locationCode,
        maxGuest: roomType.maxGuest,
        roomSize: roomType.roomSize,
        displaySequence: number(v.displaySequence, 'display sequence', 1, 100000),
        keycardRoomMapping: text(v.keycardRoomMapping, 'keycard room mapping', false, 100).trim(),
        active: boolean(v.active),
      };
      const exists = normalized.hotelMasters.rooms.some((item) => item.roomNo === roomNo);
      const rooms = exists
        ? normalized.hotelMasters.rooms.map((item) => item.roomNo === roomNo ? value : item)
        : [...normalized.hotelMasters.rooms, value];
      const roomTypes = normalized.hotelMasters.roomTypes.map((type) => ({
        ...type,
        totalRoom: rooms.filter((room) => room.roomTypeCode === type.code).length,
      }));
      return { ...normalized, hotelMasters: { ...normalized.hotelMasters, rooms, roomTypes } };
    }
    case 'bookingCreate': {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const reference = text(v.reference, 'booking reference', true, 30).trim().toUpperCase();
      if (normalized.bookings.some((item) => item.reference === reference))
        throw new Error('This booking reference already exists.');
      const arrival = text(v.arrival, 'arrival date', true, 10);
      const departureDate = text(v.departure, 'departure date', true, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || departureDate <= arrival)
        throw new Error('Departure date must be after the arrival date.');
      const bookingRooms = list(v.rooms, 10).map((entry) => {
        const room = object(entry);
        const code = text(room.code, 'room type', true, 20).trim().toUpperCase();
        const master = normalized.hotelMasters.roomTypes.find((item) => item.code === code && item.active);
        if (!master) throw new Error(`Room Type ${code} is not active in Hotel Settings.`);
        const count = number(room.count, 'number of rooms', 1, master.totalRoom || 1);
        const finite = (value: unknown, fallback = 0) =>
          typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
        return {
          code,
          count,
          adults: typeof room.adults === 'number' ? number(room.adults, 'number of adults', 1, 1000) : undefined,
          children: typeof room.children === 'number' ? number(room.children, 'number of children', 0, 1000) : undefined,
          infants: typeof room.infants === 'number' ? number(room.infants, 'number of infants', 0, 1000) : undefined,
          rateCode: typeof room.rateCode === 'string' ? room.rateCode.slice(0, 40) : undefined,
          roomRate: finite(room.roomRate),
          promoCode: typeof room.promoCode === 'string' ? room.promoCode.slice(0, 40) : undefined,
          discountPerNight: finite(room.discountPerNight),
          subtotal: finite(room.subtotal),
          discount: finite(room.discount),
          tax: finite(room.tax),
          total: finite(room.total),
        };
      });
      const guests = number(v.guests, 'number of guests', 1, 1000);
      const guestCapacity = bookingRooms.reduce((total, item) => {
        const master = normalized.hotelMasters.roomTypes.find((type) => type.code === item.code)!;
        return total + master.maxGuest * item.count;
      }, 0);
      if (guests > guestCapacity)
        throw new Error(`Maximum guest capacity for the selected room(s) is ${guestCapacity}.`);
      if (typeof v.amount !== 'number' || !Number.isFinite(v.amount) || v.amount < 0 || v.amount > 100000000)
        throw new Error('Enter a valid booking amount.');
      const value: Booking = {
        reference,
        guest: text(v.guest, 'guest name', true, 160).trim(),
        arrival,
        departure: departureDate,
        status: 'Booked',
        rooms: bookingRooms,
        assignedRooms: 0,
        checkedInGuests: 0,
        guests,
        amount: v.amount,
        groupName: typeof v.groupName === 'string' ? v.groupName.slice(0, 160) : '',
        phone: typeof v.phone === 'string' ? v.phone.slice(0, 80) : '',
        accountName: typeof v.accountName === 'string' ? v.accountName.slice(0, 160) : '',
        creditLimit: typeof v.creditLimit === 'number' && Number.isFinite(v.creditLimit) && v.creditLimit >= 0 ? v.creditLimit : 0,
        printRate: typeof v.printRate === 'boolean' ? v.printRate : true,
        stateTax: typeof v.stateTax === 'boolean' ? v.stateTax : true,
        tourismTax: typeof v.tourismTax === 'boolean' ? v.tourismTax : true,
        email: typeof v.email === 'string' ? v.email.slice(0, 200) : '',
        salesChannel: typeof v.salesChannel === 'string' ? v.salesChannel.slice(0, 80) : 'Direct',
        source: typeof v.source === 'string' ? v.source.slice(0, 80) : 'Booking',
        segment: typeof v.segment === 'string' ? v.segment.slice(0, 80) : 'Leisure',
        referenceNo: typeof v.referenceNo === 'string' ? v.referenceNo.slice(0, 100) : '',
      };
      return { ...normalized, bookings: [value, ...normalized.bookings] };
    }
    case 'bookingUpdate': {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const reference = text(v.reference, 'booking reference', true, 30).trim().toUpperCase();
      const existing = normalized.bookings.find((item) => item.reference === reference);
      if (!existing) throw new Error('This booking no longer exists.');
      const arrival = text(v.arrival, 'arrival date', true, 10);
      const departureDate = text(v.departure, 'departure date', true, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || departureDate <= arrival)
        throw new Error('Departure date must be after the arrival date.');
      const bookingRooms = list(v.rooms, 10).map((entry) => {
        const room = object(entry);
        const code = text(room.code, 'room type', true, 20).trim().toUpperCase();
        const master = normalized.hotelMasters.roomTypes.find((item) => item.code === code && item.active);
        if (!master) throw new Error(`Room Type ${code} is not active in Hotel Settings.`);
        const count = number(room.count, 'number of rooms', 1, master.totalRoom || 1);
        const finite = (value: unknown, fallback = 0) =>
          typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
        const adults = typeof room.adults === 'number' ? number(room.adults, 'number of adults', 1, 1000) : undefined;
        const children = typeof room.children === 'number' ? number(room.children, 'number of children', 0, 1000) : undefined;
        const infants = typeof room.infants === 'number' ? number(room.infants, 'number of infants', 0, 1000) : undefined;
        if ((adults ?? 1) + (children ?? 0) + (infants ?? 0) > master.maxGuest * count)
          throw new Error(`Maximum guest capacity for ${count} ${code} room(s) is ${master.maxGuest * count}.`);
        return {
          code, count, adults, children, infants,
          rateCode: typeof room.rateCode === 'string' ? room.rateCode.slice(0, 40) : undefined,
          roomRate: finite(room.roomRate),
          promoCode: typeof room.promoCode === 'string' ? room.promoCode.slice(0, 40) : undefined,
          discountPerNight: finite(room.discountPerNight),
          subtotal: finite(room.subtotal), discount: finite(room.discount), tax: finite(room.tax), total: finite(room.total),
        };
      });
      const guests = number(v.guests, 'number of guests', 1, 1000);
      const guestCapacity = bookingRooms.reduce((total, item) => {
        const master = normalized.hotelMasters.roomTypes.find((type) => type.code === item.code)!;
        return total + master.maxGuest * item.count;
      }, 0);
      if (guests > guestCapacity) throw new Error(`Maximum guest capacity for the selected room(s) is ${guestCapacity}.`);
      if (typeof v.amount !== 'number' || !Number.isFinite(v.amount) || v.amount < 0 || v.amount > 100000000)
        throw new Error('Enter a valid booking amount.');
      const value: Booking = {
        ...existing,
        reference,
        guest: text(v.guest, 'guest name', true, 160).trim(),
        arrival,
        departure: departureDate,
        rooms: bookingRooms,
        guests,
        amount: v.amount,
        groupName: typeof v.groupName === 'string' ? v.groupName.slice(0, 160) : '',
        phone: typeof v.phone === 'string' ? v.phone.slice(0, 80) : '',
        accountName: typeof v.accountName === 'string' ? v.accountName.slice(0, 160) : '',
        creditLimit: typeof v.creditLimit === 'number' && Number.isFinite(v.creditLimit) && v.creditLimit >= 0 ? v.creditLimit : 0,
        printRate: typeof v.printRate === 'boolean' ? v.printRate : true,
        stateTax: typeof v.stateTax === 'boolean' ? v.stateTax : true,
        tourismTax: typeof v.tourismTax === 'boolean' ? v.tourismTax : true,
        email: typeof v.email === 'string' ? v.email.slice(0, 200) : '',
        salesChannel: typeof v.salesChannel === 'string' ? v.salesChannel.slice(0, 80) : 'Direct',
        source: typeof v.source === 'string' ? v.source.slice(0, 80) : 'Booking',
        segment: typeof v.segment === 'string' ? v.segment.slice(0, 80) : 'Leisure',
        referenceNo: typeof v.referenceNo === 'string' ? v.referenceNo.slice(0, 100) : '',
      };
      return { ...normalized, bookings: normalized.bookings.map((item) => item.reference === reference ? value : item) };
    }
    case 'rateSetup': {
      return { ...normalizeTransportState(state), rateSetup: rateSetup(action.value) };
    }
    case 'bookingTransportAdd': {
      const booking = normalizeTransportState(state).bookings.find(
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
        adults: number(v.adults, 'adults', 1, booking.guests),
        children: number(v.children, 'children', 0, booking.guests),
        infants: number(v.infants, 'infants', 0, booking.guests),
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
    case 'bookingTransportUpdate': {
      const bookingReference = text(action.bookingReference, 'booking reference');
      const legId = text(action.legId, 'transport leg ID');
      const adults = number(action.adults, 'adults', 1, 1000);
      const children = number(action.children, 'children', 0, 1000);
      const infants = number(action.infants, 'infants', 0, 1000);
      const adultRate = decimal(action.adultRate, 'adult rate');
      const childRate = decimal(action.childRate, 'child rate');
      const infantRate = decimal(action.infantRate, 'infant rate');
      const leg = state.bookingLegs.find((item) => item.id === legId && item.bookingReference === bookingReference);
      if (!leg) throw new Error('This transport charge no longer exists.');
      const updatedLeg = { ...leg, passengers: adults + children, adults, children, infants, incidentalCharge: leg.incidentalCharge ? { ...leg.incidentalCharge, adultRate, childRate, infantRate } : undefined };
      return { ...state, bookingLegs: state.bookingLegs.map((item) => item.id === legId ? updatedLeg : item) };
    }
    case 'transfers': {
      const booking = normalizeTransportState(state).bookings.find(
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
