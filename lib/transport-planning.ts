import {
  addGroupToTrip,
  addTrip,
  countPassengers,
  moveDate,
  tripFromSetup,
  type Trip,
  type TransportSetup,
} from './transport';
import type { Booking } from './bookings';

export type ScheduleTemplate = {
  id: string;
  name: string;
  routeId: string;
  boatId: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
  times: string[];
  excludedDates: string[];
};
export type DayNote = {
  tide: string;
  restricted: string;
  holiday: string;
  notes: string;
};
export const emptyDayNote: DayNote = {
  tide: '',
  restricted: '',
  holiday: '',
  notes: '',
};

// Reference text from the supplied PDF, separate from bookable departures.
const tideWindows = [
  ['08:30–16:00', '00:30–08:30, 16:00–21:00'],
  ['09:30–16:00', '01:30–09:30, 16:00–21:30'],
  ['09:30–16:00', '02:30–09:30, 16:00–22:00'],
  ['10:00–16:00', '03:30–10:00, 16:00–23:00'],
  ['10:30–16:30', '05:00–10:30, 16:30–24:00'],
  ['11:30–16:30', '06:30–11:30, 16:30–24:00'],
  ['01:00–09:00, 12:00–17:00', '17:00–24:00'],
  ['02:00–17:00', '17:00–24:00'],
  ['03:30–18:00', '18:00–24:00'],
  ['04:30–13:30, 17:00–19:30', '13:30–17:00'],
  ['05:30–14:00, 17:00–21:00', '14:00–18:00'],
  ['06:30–14:30', '14:30–18:30'],
  ['07:00–15:00', '15:00–19:00'],
  ['17:30–15:00', '15:00–20:00'],
  ['08:30–15:30', '01:00–08:30, 19:30–20:30'],
  ['09:00–15:30', '02:00–09:00, 15:30–21:30'],
  ['09:30–15:30', '03:00–09:30, 15:30–22:30'],
  ['10:00–15:30', '04:30–10:00, 15:30–24:00'],
  ['10:00–16:00', '06:30–10:00, 16:00–24:00'],
  ['00:00–16:00', '16:00–24:00'],
  ['01:00–16:00', '16:00–24:00'],
  ['02:00–16:00', '16:00–24:00'],
  ['03:00–13:00', '13:00–24:00'],
  ['04:00–13:00, 18:00–20:00', '13:00–18:00'],
  ['04:30–13:30, 18:30–21:00', '13:30–18:30'],
  ['05:30–13:30, 18:30–22:00', '13:30–18:30'],
  ['06:00–14:00, 19:00–23:30', '14:00–19:00'],
  ['07:00–14:00, 19:00–24:00', '14:00–19:00'],
  ['07:30–14:00, 19:30–24:00', '14:00–19:30'],
  ['08:00–14:30, 20:00–24:00', '14:30–20:00'],
  ['08:15–14:30, 20:30–24:00', '14:30–20:30'],
];
export const initialDayNotes: Record<string, DayNote> = Object.fromEntries(
  tideWindows.map(([tide, restricted], index) => {
    const day = index + 1;
    return [
      `2026-08-${String(day).padStart(2, '0')}`,
      {
        tide,
        restricted,
        holiday:
          day === 9
            ? 'National Day · Singapore'
            : day === 25
              ? 'Birthday Prophet'
              : day === 31
                ? 'National Day · Malaysia / School holiday'
                : day >= 29
                  ? 'School holiday'
                  : '',
        notes:
          day === 14
            ? 'PDF lists 17:30–15:00. Confirm this tide window with the operator.'
            : '',
      },
    ];
  }),
);

export function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(new Date(`${value}T12:00:00`).getTime()) &&
    moveDate(value, 0) === value
  );
}
export function shiftMonth(month: string, offset: number) {
  const date = new Date(`${month}-01T12:00:00`);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}
export function monthDates(month: string): (string | null)[] {
  if (!validDate(`${month}-01`)) return [];
  const first = `${month}-01`;
  const leading = (new Date(`${first}T12:00:00`).getDay() + 6) % 7;
  const last = moveDate(`${shiftMonth(month, 1)}-01`, -1);
  const dates: (string | null)[] = Array(leading).fill(null);
  for (let day = first; day <= last; day = moveDate(day, 1)) dates.push(day);
  while (dates.length % 7) dates.push(null);
  return dates;
}
export function validateTemplate(template: ScheduleTemplate) {
  if (!template.name.trim()) throw new Error('Enter a template name.');
  if (
    !validDate(template.startDate) ||
    !validDate(template.endDate) ||
    template.endDate < template.startDate
  )
    throw new Error('Choose a valid start and end date.');
  if (template.endDate > moveDate(template.startDate, 365))
    throw new Error('Generate a maximum of one year at a time.');
  if (
    !template.weekdays.length ||
    template.weekdays.some(
      (day) => !Number.isInteger(day) || day < 0 || day > 6,
    )
  )
    throw new Error('Choose at least one weekday.');
  if (
    !template.times.length ||
    template.times.length > 16 ||
    template.times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
  )
    throw new Error(
      'Enter 1–16 departure times in HH:MM format, separated by commas.',
    );
  if (new Set(template.times).size !== template.times.length)
    throw new Error('Remove duplicate departure times.');
  if (
    template.excludedDates.some(
      (date) =>
        !validDate(date) ||
        date < template.startDate ||
        date > template.endDate,
    )
  )
    throw new Error('Excluded dates must fall within the template date range.');
  return template;
}
export function generateTemplate(
  trips: Trip[],
  setup: TransportSetup,
  template: ScheduleTemplate,
) {
  validateTemplate(template);
  let next = [...trips];
  let skipped = 0;
  const added: Trip[] = [];
  for (
    let date = template.startDate;
    date <= template.endDate;
    date = moveDate(date, 1)
  ) {
    if (
      !template.weekdays.includes(new Date(`${date}T12:00:00`).getDay()) ||
      template.excludedDates.includes(date)
    )
      continue;
    for (const time of [...template.times].sort()) {
      const id = `TPL-${template.id}-${date}-${time}`;
      if (
        next.some(
          (trip) =>
            trip.id === id ||
            (trip.date === date &&
              trip.time === time &&
              trip.boatId === template.boatId &&
              trip.direction === template.routeId &&
              trip.status !== 'Cancelled'),
        )
      ) {
        skipped++;
        continue;
      }
      try {
        const trip = tripFromSetup(setup, {
          id,
          date,
          time,
          routeId: template.routeId,
          boatId: template.boatId,
        });
        next = addTrip(next, trip, setup.rules);
        added.push(trip);
      } catch (error) {
        throw new Error(
          `${date} at ${time}: ${(error as Error).message} No trips were generated.`,
        );
      }
    }
  }
  if (!added.length && !skipped)
    throw new Error('No dates match these weekdays and exclusions.');
  return { trips: next, added, skipped };
}

export type BookingTransferSelection = {
  arrivalId: string;
  returnId: string;
  adults: number;
  children: number;
};
function checkTransferOrder(trips: Trip[], reference: string) {
  const linked = trips.filter((trip) =>
    trip.groups.some((group) => group.bookingId === reference),
  );
  const inbound = linked.find((trip) => trip.toHotel);
  const outbound = linked.find((trip) => !trip.toHotel);
  if (inbound && outbound) {
    const arrivalEnd =
      new Date(`${inbound.date}T${inbound.time}:00`).getTime() +
      inbound.durationMinutes * 60000;
    if (new Date(`${outbound.date}T${outbound.time}:00`).getTime() < arrivalEnd)
      throw new Error(
        'The return trip must depart after the arrival journey finishes.',
      );
  }
}
export function assignBookingTransfers(
  trips: Trip[],
  booking: Booking,
  selection: BookingTransferSelection,
) {
  const { adults, children } = selection;
  if (
    !Number.isInteger(adults) ||
    !Number.isInteger(children) ||
    adults < 1 ||
    children < 0 ||
    adults + children > booking.guests
  )
    throw new Error(
      `Choose at least one adult, up to ${booking.guests} guests in total.`,
    );
  if (booking.status === 'Cancelled' || booking.status === 'No Show')
    throw new Error(
      'Transport cannot be assigned to a cancelled or no-show booking.',
    );
  const selectedIds = [selection.arrivalId, selection.returnId].filter(Boolean);
  let next = trips.map((trip) => {
    const linked = trip.groups.find(
      (group) => group.bookingId === booking.reference,
    );
    if (linked && (linked.boarded || trip.status === 'Completed')) {
      if (
        !selectedIds.includes(trip.id) ||
        linked.adults !== adults ||
        linked.children !== children
      )
        throw new Error('Boarded or completed transfers cannot be changed.');
      return trip;
    }
    return {
      ...trip,
      groups: trip.groups.filter(
        (group) => group.bookingId !== booking.reference,
      ),
    };
  });
  for (const [id, toHotel] of [
    [selection.arrivalId, true],
    [selection.returnId, false],
  ] as const) {
    if (!id) continue;
    const trip = next.find((item) => item.id === id);
    if (!trip || trip.toHotel !== toHotel)
      throw new Error(`Select a valid ${toHotel ? 'arrival' : 'return'} trip.`);
    if (trip.groups.some((group) => group.bookingId === booking.reference))
      continue;
    const updated = addGroupToTrip(trip, {
      id: `BOOKING-${booking.reference}-${toHotel ? 'arrival' : 'return'}`,
      bookingId: booking.reference,
      reference: booking.reference,
      name: booking.guest,
      adults,
      children,
      boarded: false,
    });
    next = next.map((item) => (item.id === id ? updated : item));
  }
  checkTransferOrder(next, booking.reference);
  return next;
}
export function editScheduledTrip(
  trips: Trip[],
  setup: TransportSetup,
  original: Trip,
  values: { date: string; time: string; boatId: string; routeId: string },
) {
  if (
    original.status === 'Completed' ||
    original.status === 'Cancelled' ||
    original.groups.some((group) => group.boarded)
  )
    throw new Error(
      'Completed, cancelled or boarded trips cannot be rescheduled.',
    );
  const changed = {
    ...tripFromSetup(setup, { id: original.id, ...values }),
    status: original.status,
    groups: original.groups,
  };
  if (countPassengers(changed) > changed.capacity)
    throw new Error(
      'The selected boat has fewer seats than the passengers already assigned.',
    );
  if (original.groups.length && changed.toHotel !== original.toHotel)
    throw new Error(
      'A trip with assigned passengers must keep its travel direction.',
    );
  const next = addTrip(
    trips.filter((trip) => trip.id !== original.id),
    changed,
    setup.rules,
  );
  for (const group of changed.groups)
    if (group.bookingId) checkTransferOrder(next, group.bookingId);
  return next;
}
