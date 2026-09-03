'use client';
import { useContext } from 'react';
import {
  TransportDataContext,
  TransportRecovery,
} from './transport-connection';
import { useState } from 'react';
import { CalendarDays, Ship } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { countPassengers, type Trip } from '@/lib/transport';
import { type Booking } from '@/lib/bookings';
import { type BookingTransferSelection } from '@/lib/transport-planning';

export function BookingTransfers({
  booking,
  trips,
  onClose,
  onSave,
  onCalendar,
}: {
  booking: Booking;
  trips: Trip[];
  onClose: () => void;
  onSave: (selection: BookingTransferSelection) => Promise<void>;
  onCalendar: (date: string) => void;
}) {
  const pending = Boolean(useContext(TransportDataContext)?.pending);
  const linked = trips.filter((trip) =>
    trip.groups.some((group) => group.bookingId === booking.reference),
  );
  const existingArrival = linked.find((trip) => trip.toHotel);
  const existingReturn = linked.find((trip) => !trip.toHotel);
  const party = linked[0]?.groups.find(
    (group) => group.bookingId === booking.reference,
  );
  const [arrivalDate, setArrivalDate] = useState(
    existingArrival?.date ?? booking.arrival,
  );
  const [returnDate, setReturnDate] = useState(
    existingReturn?.date ?? booking.departure,
  );
  const [selection, setSelection] = useState<BookingTransferSelection>({
    arrivalId: existingArrival?.id ?? '',
    returnId: existingReturn?.id ?? '',
    adults: party?.adults ?? booking.guests,
    children: party?.children ?? 0,
  });
  const [error, setError] = useState('');
  const passengerCount = selection.adults + selection.children;
  const isLocked = (trip?: Trip) =>
    Boolean(
      trip &&
      (trip.status === 'Completed' ||
        trip.groups.some(
          (group) => group.bookingId === booking.reference && group.boarded,
        )),
    );
  const lockedParty = linked.some(isLocked);
  const blocked =
    booking.status === 'Cancelled' || booking.status === 'No Show';
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="hotel-dialog transfer-dialog">
        <DialogHeader>
          <DialogTitle>Booking transport</DialogTitle>
          <DialogDescription>
            {booking.reference} · {booking.guest} · {booking.guests} guests
          </DialogDescription>
        </DialogHeader>
        <TransportRecovery />
        <form
          className="hotel-form"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await onSave(selection);
              onClose();
            } catch (error) {
              setError((error as Error).message);
            }
          }}
        >
          <div className="form-grid transfer-party">
            <label>
              Adults
              <input
                type="number"
                required
                min={1}
                max={booking.guests}
                disabled={lockedParty}
                value={selection.adults}
                onChange={(event) =>
                  setSelection({
                    ...selection,
                    adults: Number(event.target.value),
                  })
                }
              />
            </label>
            <label>
              Children
              <input
                type="number"
                required
                min={0}
                max={Math.max(0, booking.guests - 1)}
                disabled={lockedParty}
                value={selection.children}
                onChange={(event) =>
                  setSelection({
                    ...selection,
                    children: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <p className="helper-text">
            Each adult or child uses one seat. The same party is assigned to
            both selected trips.
          </p>
          <div className="transfer-legs">
            {([true, false] as const).map((arrival) => {
              const date = arrival ? arrivalDate : returnDate;
              const key = arrival ? 'arrivalId' : 'returnId';
              const locked = isLocked(
                arrival ? existingArrival : existingReturn,
              );
              const candidates = trips
                .filter(
                  (trip) => trip.date === date && trip.toHotel === arrival,
                )
                .sort((a, b) => a.time.localeCompare(b.time));
              return (
                <fieldset className="transfer-leg" key={key}>
                  <legend>
                    {arrival ? 'Arrival · To hotel' : 'Return · From hotel'}
                  </legend>
                  <label className="transfer-date">
                    Travel date
                    <input
                      type="date"
                      required
                      disabled={locked}
                      value={date}
                      onChange={(event) => {
                        if (arrival) setArrivalDate(event.target.value);
                        else setReturnDate(event.target.value);
                        setSelection({ ...selection, [key]: '' });
                      }}
                    />
                  </label>
                  <div className="transfer-options">
                    <label className="transfer-option transfer-none">
                      <input
                        type="radio"
                        name={key}
                        value=""
                        checked={!selection[key]}
                        disabled={locked}
                        onChange={() =>
                          setSelection({ ...selection, [key]: '' })
                        }
                      />
                      <span>Not assigned</span>
                    </label>
                    {candidates.map((trip) => {
                      const group = trip.groups.find(
                        (group) => group.bookingId === booking.reference,
                      );
                      const remaining =
                        trip.capacity -
                        countPassengers(trip) +
                        (group ? group.adults + group.children : 0);
                      const closed =
                        trip.status === 'Cancelled' ||
                        trip.status === 'Completed';
                      const unavailable = closed || remaining < passengerCount;
                      return (
                        <label
                          key={trip.id}
                          className={`transfer-option ${unavailable ? 'unavailable' : ''}`}
                        >
                          <input
                            type="radio"
                            name={key}
                            value={trip.id}
                            checked={selection[key] === trip.id}
                            disabled={locked || unavailable}
                            onChange={() =>
                              setSelection({ ...selection, [key]: trip.id })
                            }
                          />
                          <span>
                            <strong>
                              {trip.time} · {trip.origin} → {trip.destination}
                            </strong>
                            <small>
                              <Ship size={13} /> {trip.boat} ·{' '}
                              {closed
                                ? trip.status
                                : `${remaining} seats available for this booking`}
                              {!closed && remaining < passengerCount
                                ? ' · Not enough seats'
                                : ''}
                            </small>
                          </span>
                        </label>
                      );
                    })}
                    {!candidates.length && (
                      <p className="transfer-empty">
                        No departures scheduled for this date.
                      </p>
                    )}
                  </div>
                  {locked && (
                    <p className="helper-text">
                      This transfer is boarded or completed and cannot be
                      changed.
                    </p>
                  )}
                  <button
                    type="button"
                    className="text-button"
                    disabled={!date}
                    onClick={() => onCalendar(date)}
                  >
                    <CalendarDays size={15} /> View timetable
                  </button>
                </fieldset>
              );
            })}
          </div>
          {blocked && (
            <p className="form-error">
              Transport cannot be assigned to a cancelled or no-show booking.
            </p>
          )}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="primary-button"
              aria-busy={pending}
              disabled={
                pending ||
                blocked ||
                (!linked.length && !selection.arrivalId && !selection.returnId)
              }
            >
              Save transfers
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
