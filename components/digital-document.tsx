'use client';

import type { Booking } from '@/lib/bookings';

const DOCUMENTS = [
  'Registration Card',
  'Invoice',
  'Receipt/Refund Voucher',
  'Deposit',
  'Proforma Invoice',
];

function formatDate(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : '';
}

function latest(values: string[]) {
  return values.filter(Boolean).sort().at(-1) ?? '';
}

export function DigitalDocument({ bookings }: { bookings: Booking[] }) {
  const lastCheckIn = latest(bookings.filter((booking) => booking.status === 'Inhouse').map((booking) => booking.arrival));
  const lastCheckOut = latest(bookings.filter((booking) => booking.status === 'Checkout').map((booking) => booking.departure));

  return (
    <section className="digital-document" aria-label="Digital Document">
      {DOCUMENTS.map((label) => (
        <button type="button" className="digital-document-card" key={label}>
          <strong>{label}</strong>
          <small>
            {label === 'Registration Card'
              ? `Last Check In: ${formatDate(lastCheckIn)}`
              : `Last Check Out: ${formatDate(lastCheckOut)}`}
          </small>
        </button>
      ))}
    </section>
  );
}
