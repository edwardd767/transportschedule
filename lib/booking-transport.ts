import {
  addGroupToTrip,
  countPassengers,
  type Boat,
  type ServiceBookingMode,
  type ServiceType,
  type TransportSetup,
  type Trip,
} from './transport';
import type { Booking } from './bookings';

export type BookingTransportDirection = 'arrival' | 'departure';

export type BookingTransportLeg = {
  id: string;
  bookingReference: string;
  direction: BookingTransportDirection;
  serviceId: string;
  serviceName: string;
  serviceType: ServiceType;
  bookingMode: ServiceBookingMode;
  operatorId: string;
  operatorName: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  passengers: number;
  adults?: number;
  children?: number;
  infants?: number;
  flightNo: string;
  vehicle: string;
  driver: string;
  remarks: string;
  tripId: string;
  incidentalCharge?: { chargeId: string; chargeTitle: string; adultRate: number; childRate: number; infantRate: number };
};

export type BookingTransportLegInput = {
  id: string;
  direction: BookingTransportDirection;
  serviceId: string;
  tripId: string;
  date: string;
  time: string;
  pickup: string;
  dropoff: string;
  passengers: number;
  flightNo: string;
  vehicle: string;
  driver: string;
  remarks: string;
  incidentalCharge?: BookingTransportLeg['incidentalCharge'];
};

export function serviceType(service: Boat): ServiceType {
  return service.serviceType ?? 'Speedboat';
}

export function serviceBookingMode(service: Boat): ServiceBookingMode {
  if (service.bookingMode) return service.bookingMode;
  return serviceType(service) === 'Speedboat' ? 'Scheduled' : 'OnDemand';
}

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(new Date(`${value}T12:00:00`).getTime())
  );
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export function addBookingTransportLeg(
  trips: Trip[],
  setup: TransportSetup,
  legs: BookingTransportLeg[],
  booking: Booking,
  input: BookingTransportLegInput,
) {
  if (booking.status === 'Cancelled' || booking.status === 'No Show')
    throw new Error(
      'Transport cannot be assigned to a cancelled or no-show booking.',
    );
  if (
    !Number.isInteger(input.passengers) ||
    input.passengers < 1 ||
    input.passengers > booking.guests
  )
    throw new Error(`Choose between 1 and ${booking.guests} passengers.`);
  if (legs.some((leg) => leg.id === input.id))
    throw new Error('This transport leg has already been added.');

  const service = setup.boats.find(
    (item) => item.id === input.serviceId && item.status === 'Active',
  );
  if (!service) throw new Error('Choose an active transport service.');
  const operator = setup.operators.find(
    (item) => item.id === service.operatorId && item.active,
  );
  if (!operator) throw new Error('Choose a service with an active operator.');
  if (input.passengers > service.capacity)
    throw new Error(
      `${service.name} supports a maximum of ${service.capacity} passengers.`,
    );

  const mode = serviceBookingMode(service);
  if (mode === 'Scheduled') {
    if (!input.tripId) throw new Error('Choose a scheduled departure.');
    if (
      legs.some(
        (leg) =>
          leg.bookingReference === booking.reference &&
          leg.tripId === input.tripId,
      )
    )
      throw new Error('This departure is already added to the booking.');
    const trip = trips.find((item) => item.id === input.tripId);
    if (!trip || trip.boatId !== service.id)
      throw new Error('Choose a valid departure for this service.');
    if (trip.toHotel !== (input.direction === 'arrival'))
      throw new Error(
        `Choose a ${input.direction === 'arrival' ? 'to hotel' : 'from hotel'} departure.`,
      );
    if (trip.groups.some((group) => group.bookingId === booking.reference))
      throw new Error('This booking is already assigned to that departure.');
    if (
      trip.status === 'Cancelled' ||
      trip.status === 'Completed' ||
      trip.capacity - countPassengers(trip) < input.passengers
    )
      throw new Error('The selected departure no longer has enough seats.');

    const groupId = `BOOKING-${booking.reference}-${input.id}`;
    const updated = addGroupToTrip(trip, {
      id: groupId,
      bookingId: booking.reference,
      reference: booking.reference,
      name: booking.guest,
      adults: input.adults ?? input.passengers,
      children: input.children ?? 0,
      infants: input.infants ?? 0,
      boarded: false,
    });
    return {
      trips: trips.map((item) => (item.id === trip.id ? updated : item)),
      leg: {
        id: input.id,
        bookingReference: booking.reference,
        direction: input.direction,
        serviceId: service.id,
        serviceName: service.name,
        serviceType: serviceType(service),
        bookingMode: mode,
        operatorId: operator.id,
        operatorName: operator.name,
        date: trip.date,
        time: trip.time,
        pickup: trip.origin,
        dropoff: trip.destination,
        passengers: input.passengers,
        flightNo: input.flightNo.trim(),
        vehicle: input.vehicle.trim(),
        driver: input.driver.trim(),
        remarks: input.remarks.trim(),
        tripId: trip.id,
        incidentalCharge: service.incidentalCharge,
      } satisfies BookingTransportLeg,
    };
  }

  if (!validDate(input.date)) throw new Error('Choose a valid travel date.');
  if (!validTime(input.time)) throw new Error('Choose a valid pickup time.');
  if (!input.pickup.trim()) throw new Error('Enter the pickup location.');
  if (!input.dropoff.trim()) throw new Error('Enter the drop-off location.');
  return {
    trips,
    leg: {
      id: input.id,
      bookingReference: booking.reference,
      direction: input.direction,
      serviceId: service.id,
      serviceName: service.name,
      serviceType: serviceType(service),
      bookingMode: mode,
      operatorId: operator.id,
      operatorName: operator.name,
      date: input.date,
      time: input.time,
      pickup: input.pickup.trim(),
      dropoff: input.dropoff.trim(),
      passengers: input.passengers,
      flightNo: input.flightNo.trim(),
      vehicle: input.vehicle.trim(),
      driver: input.driver.trim(),
      remarks: input.remarks.trim(),
      tripId: '',
      incidentalCharge: service.incidentalCharge,
    } satisfies BookingTransportLeg,
  };
}

export function removeBookingTransportLeg(
  trips: Trip[],
  legs: BookingTransportLeg[],
  bookingReference: string,
  legId: string,
) {
  const leg = legs.find(
    (item) => item.id === legId && item.bookingReference === bookingReference,
  );
  if (!leg) throw new Error('This transport leg no longer exists.');
  let nextTrips = trips;
  if (leg.tripId) {
    const trip = trips.find((item) => item.id === leg.tripId);
    if (trip) {
      const groupId = `BOOKING-${bookingReference}-${leg.id}`;
      const group = trip.groups.find((item) => item.id === groupId);
      if (trip.status === 'Completed' || group?.boarded)
        throw new Error('Boarded or completed transport cannot be removed.');
      nextTrips = trips.map((item) =>
        item.id === trip.id
          ? {
              ...item,
              groups: item.groups.filter((group) => group.id !== groupId),
            }
          : item,
      );
    }
  }
  return {
    trips: nextTrips,
    legs: legs.filter((item) => item.id !== leg.id),
  };
}
