import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const directory = await mkdtemp(join(tmpdir(), 'hotelx-planning-'));
try {
  for (const name of ['transport', 'transport-planning']) {
    const source = await readFile(
      new URL(`../lib/${name}.ts`, import.meta.url),
      'utf8',
    );
    const { outputText } = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ES2022,
      },
    });
    await writeFile(
      join(directory, `${name}.mjs`),
      outputText.replace(/(['"])\.\/transport\1/g, "'./transport.mjs'"),
    );
  }
  const { initialSetup, tripFromSetup, countPassengers } = await import(
    pathToFileURL(join(directory, 'transport.mjs'))
  );
  const {
    assignBookingTransfers,
    editScheduledTrip,
    generateTemplate,
    monthDates,
    shiftMonth,
  } = await import(pathToFileURL(join(directory, 'transport-planning.mjs')));
  const createTrip = (id, date, time, routeId = 'inbound', boatId = 'boat-3') =>
    tripFromSetup(initialSetup, { id, date, time, routeId, boatId });
  const booking = {
    reference: 'BOOK-TEST',
    guest: 'Test guest',
    arrival: '2026-08-31',
    departure: '2026-09-03',
    guests: 2,
    status: 'Booked',
  };
  const template = {
    id: 'test',
    name: 'Weekday arrivals',
    routeId: 'inbound',
    boatId: 'boat-3',
    startDate: '2026-09-01',
    endDate: '2026-09-07',
    weekdays: [1, 3],
    times: ['09:30', '11:00'],
    excludedDates: ['2026-09-02'],
  };
  const generated = generateTemplate([], initialSetup, template);
  assert.deepEqual(
    generated.added.map((trip) => `${trip.date} ${trip.time}`),
    ['2026-09-07 09:30', '2026-09-07 11:00'],
  );
  assert.equal(
    generateTemplate(generated.trips, initialSetup, template).skipped,
    2,
  );
  const editedGenerated = generated.trips.map((trip, index) =>
    index ? trip : { ...trip, date: '2026-09-08' },
  );
  assert.equal(
    generateTemplate(editedGenerated, initialSetup, template).added.length,
    0,
    'Regeneration preserves individually moved trips',
  );
  const snapshot = JSON.stringify(generated.trips);
  assert.throws(
    () =>
      generateTemplate(generated.trips, initialSetup, {
        ...template,
        id: 'overlap',
        times: ['08:00', '09:45'],
      }),
    /overlapping/,
  );
  assert.equal(
    JSON.stringify(generated.trips),
    snapshot,
    'A late conflict does not partially insert trips',
  );
  assert.throws(
    () => generateTemplate([], initialSetup, { ...template, times: ['18:45'] }),
    /operating hours/,
  );
  assert.throws(
    () => generateTemplate([], initialSetup, { ...template, weekdays: [] }),
    /weekday/,
  );
  assert.throws(
    () =>
      generateTemplate([], initialSetup, {
        ...template,
        startDate: '2026-02-30',
      }),
    /valid start/,
  );

  const dates = monthDates('2026-08');
  assert.equal(dates.length, 42);
  assert.equal(dates[5], '2026-08-01');
  assert.equal(dates[35], '2026-08-31');
  assert.equal(monthDates('2028-02').filter(Boolean).length, 29);
  assert.equal(shiftMonth('2026-12', 1), '2027-01');

  const base = [
    createTrip('arrival', '2026-08-31', '09:30'),
    createTrip('return', '2026-09-03', '10:15', 'outbound'),
    createTrip('alternative', '2026-08-31', '11:00'),
  ];
  const selection = {
    arrivalId: 'arrival',
    returnId: 'return',
    adults: 2,
    children: 0,
  };
  const fullReturn = base.map((trip) =>
    trip.id === 'return' ? { ...trip, capacity: 1 } : trip,
  );
  assert.throws(
    () => assignBookingTransfers(fullReturn, booking, selection),
    /Only 1 seats/,
  );
  assert.equal(
    countPassengers(fullReturn[0]),
    0,
    'Arrival remains unassigned when return capacity fails',
  );
  const assigned = assignBookingTransfers(base, booking, selection);
  assert.deepEqual(assigned.map(countPassengers), [2, 2, 0]);
  assert.deepEqual(
    assignBookingTransfers(assigned, booking, selection).map(countPassengers),
    [2, 2, 0],
  );
  const moved = assignBookingTransfers(assigned, booking, {
    ...selection,
    arrivalId: 'alternative',
  });
  assert.deepEqual(
    moved.map(countPassengers),
    [0, 2, 2],
    'Moving a transfer releases previous seats',
  );
  assert.deepEqual(
    assignBookingTransfers(moved, booking, {
      ...selection,
      arrivalId: '',
      returnId: '',
    }).map(countPassengers),
    [0, 0, 0],
  );
  assert.throws(
    () =>
      assignBookingTransfers(base, booking, {
        ...selection,
        arrivalId: 'return',
      }),
    /arrival trip/,
  );
  assert.throws(
    () => assignBookingTransfers(base, booking, { ...selection, adults: 3 }),
    /up to 2/,
  );
  const closed = base.map((trip) =>
    trip.id === 'arrival' ? { ...trip, status: 'Cancelled' } : trip,
  );
  assert.throws(
    () => assignBookingTransfers(closed, booking, selection),
    /closed/,
  );
  const backwards = base.map((trip) =>
    trip.id === 'return'
      ? { ...trip, date: '2026-08-31', time: '09:45' }
      : trip,
  );
  assert.throws(
    () => assignBookingTransfers(backwards, booking, selection),
    /arrival journey finishes/,
  );
  const boarded = assigned.map((trip) =>
    trip.id === 'arrival'
      ? {
          ...trip,
          groups: trip.groups.map((group) => ({ ...group, boarded: true })),
        }
      : trip,
  );
  assert.throws(
    () =>
      assignBookingTransfers(boarded, booking, {
        ...selection,
        arrivalId: 'alternative',
      }),
    /Boarded or completed/,
  );
  assert.equal(
    assignBookingTransfers(boarded, booking, selection)[0].groups[0].boarded,
    true,
  );
  const completed = assigned.map((trip) =>
    trip.id === 'arrival' ? { ...trip, status: 'Completed' } : trip,
  );
  assert.throws(
    () =>
      assignBookingTransfers(completed, booking, {
        ...selection,
        arrivalId: '',
      }),
    /Boarded or completed/,
  );
  assert.throws(
    () =>
      editScheduledTrip(boarded, initialSetup, boarded[0], {
        date: '2026-08-31',
        time: '10:00',
        boatId: 'boat-3',
        routeId: 'inbound',
      }),
    /boarded/,
  );
  assert.throws(
    () =>
      editScheduledTrip(assigned, initialSetup, assigned[0], {
        date: '2026-09-04',
        time: '09:30',
        boatId: 'boat-3',
        routeId: 'inbound',
      }),
    /arrival journey finishes/,
  );
  const smallerBoatSetup = {
    ...initialSetup,
    boats: initialSetup.boats.map((boat) =>
      boat.id === 'boat-2' ? { ...boat, capacity: 1 } : boat,
    ),
  };
  assert.throws(
    () =>
      editScheduledTrip(assigned, smallerBoatSetup, assigned[0], {
        date: '2026-08-31',
        time: '09:30',
        boatId: 'boat-2',
        routeId: 'inbound',
      }),
    /fewer seats/,
  );
  const changed = editScheduledTrip(assigned, initialSetup, assigned[0], {
    date: '2026-08-31',
    time: '08:30',
    boatId: 'boat-3',
    routeId: 'inbound',
  });
  assert.equal(
    changed.find((trip) => trip.id === 'arrival').groups[0].bookingId,
    booking.reference,
  );
  console.log(
    'Transport planning checks passed: calendar boundaries, template exclusions and duplicates, atomic generation and seat assignments, transfer order, rescheduling, and boarded/completed protection.',
  );
} finally {
  const target = resolve(directory);
  if (
    dirname(target) !== resolve(tmpdir()) ||
    !basename(target).startsWith('hotelx-planning-')
  )
    throw new Error('Unexpected temporary test directory');
  await rm(target, { recursive: true, force: true });
}
