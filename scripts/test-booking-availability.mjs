import assert from 'node:assert/strict';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: ['lib/booking-availability.ts'],
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
  packages: 'external',
});

const source = bundle.outputFiles[0].text.replaceAll('import.meta', '({url:"memory:test"})');
const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { availabilityDays, occupiedRoomCount, roomAvailability } = await import(moduleUrl);

const roomTypes = [
  { code: 'SPK', description: 'Superior King', totalRoom: 24, active: true },
  { code: 'DLK', description: 'Deluxe King', totalRoom: 20, active: true },
];

const bookings = [
  {
    reference: 'P003502',
    guest: 'Aqam',
    arrival: '2026-09-09',
    departure: '2026-09-10',
    status: 'Booked',
    rooms: [{ code: 'SPK', count: 1 }],
  },
];

assert.deepEqual(availabilityDays('2026-09-09', 2).map(day => day.key), ['2026-09-09', '2026-09-10']);
assert.equal(roomAvailability(bookings, roomTypes[0], '2026-09-09'), 23);
assert.equal(roomAvailability(bookings, roomTypes[0], '2026-09-10'), 24);
assert.equal(occupiedRoomCount(bookings, roomTypes, '2026-09-09'), 1);
assert.equal(occupiedRoomCount([{ ...bookings[0], status: 'Cancelled' }], roomTypes, '2026-09-09'), 0);

console.log('Availability checks passed: booking consumes arrival night only and cancelled bookings do not reduce rooms.');
