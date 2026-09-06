'use client';
import { HotelDatePicker } from '@/components/hotel-date-picker';

import { useContext, useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Car, MapPin, Plus, Ship, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Choice } from '@/components/hotel-choice';
import {
  TransportDataContext,
  TransportRecovery,
} from './transport-connection';
import { countPassengers, type TransportSetup, type Trip } from '@/lib/transport';
import { type Booking } from '@/lib/bookings';
import {
  serviceBookingMode,
  serviceType,
  type BookingTransportDirection,
  type BookingTransportLeg,
  type BookingTransportLegInput,
} from '@/lib/booking-transport';

function ServiceIcon({ type }: { type: string }) {
  return type === 'Speedboat' ? <Ship size={17} /> : <Car size={17} />;
}

function DeleteIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="currentColor"
        d="M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.7 11.1A2 2 0 0 1 14.3 22h-4.6a2 2 0 0 1-2-1.9L7 9Z"
      />
    </svg>
  );
}

export function BookingTransfers({
  booking,
  trips,
  setup,
  bookingLegs,
  onClose,
  onAdd,
  onRemove,
  onCalendar,
}: {
  booking: Booking;
  trips: Trip[];
  setup: TransportSetup;
  bookingLegs: BookingTransportLeg[];
  onClose: () => void;
  onAdd: (values: BookingTransportLegInput) => Promise<void>;
  onRemove: (legId: string) => Promise<void>;
  onCalendar: (date: string) => void;
}) {
  const pending = Boolean(useContext(TransportDataContext)?.pending);
  const [adding, setAdding] = useState<BookingTransportDirection | null>(null);
  const [serviceId, setServiceId] = useState('');
  const [travelDate, setTravelDate] = useState(booking.arrival);
  const [tripId, setTripId] = useState('');
  const [passengers, setPassengers] = useState(booking.guests);
  const [error, setError] = useState('');
  const blocked =
    booking.status === 'Cancelled' || booking.status === 'No Show';
  const services = setup.boats.filter(
    (service) =>
      service.status === 'Active' &&
      setup.operators.some(
        (operator) => operator.id === service.operatorId && operator.active,
      ),
  );
  const selectedService =
    services.find((service) => service.id === serviceId) ?? null;
  const selectedMode = selectedService
    ? serviceBookingMode(selectedService)
    : null;
  const current = bookingLegs
    .filter((leg) => leg.bookingReference === booking.reference)
    .sort((a, b) =>
      `${a.direction}-${a.date}-${a.time}`.localeCompare(
        `${b.direction}-${b.date}-${b.time}`,
      ),
    );
  const representedTrips = new Set(current.map((leg) => leg.tripId).filter(Boolean));
  const legacyTrips = trips.filter(
    (trip) =>
      !representedTrips.has(trip.id) &&
      trip.groups.some((group) => group.bookingId === booking.reference),
  );
  const candidates = useMemo(() => {
    if (!selectedService || !adding || selectedMode !== 'Scheduled') return [];
    return trips
      .filter(
        (trip) =>
          trip.date === travelDate &&
          trip.boatId === selectedService.id &&
          trip.toHotel === (adding === 'arrival'),
      )
      .sort((a, b) => a.time.localeCompare(b.time));
  }, [adding, selectedMode, selectedService, travelDate, trips]);

  function startAdd(direction: BookingTransportDirection) {
    const first = services[0];
    setAdding(direction);
    setServiceId(first?.id ?? '');
    setTravelDate(direction === 'arrival' ? booking.arrival : booking.departure);
    setTripId('');
    setPassengers(booking.guests);
    setError('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!adding || !selectedService) return;
    const form = new FormData(event.currentTarget);
    try {
      await onAdd({
        id: crypto.randomUUID(),
        direction: adding,
        serviceId: selectedService.id,
        tripId: selectedMode === 'Scheduled' ? tripId : '',
        date: selectedMode === 'Scheduled' ? travelDate : String(form.get('date')),
        time: selectedMode === 'Scheduled' ? '' : String(form.get('time')),
        pickup: selectedMode === 'Scheduled' ? '' : String(form.get('pickup')),
        dropoff: selectedMode === 'Scheduled' ? '' : String(form.get('dropoff')),
        passengers,
        flightNo: String(form.get('flightNo') ?? ''),
        vehicle: String(form.get('vehicle') ?? ''),
        driver: String(form.get('driver') ?? ''),
        remarks: String(form.get('remarks') ?? ''),
      });
      setAdding(null);
      setError('');
    } catch (error) {
      setError((error as Error).message);
    }
  }

  const legSection = (direction: BookingTransportDirection) => {
    const title = direction === 'arrival' ? 'Arrival transport' : 'Departure transport';
    const legs = current.filter((leg) => leg.direction === direction);
    const old = legacyTrips.filter(
      (trip) => trip.toHotel === (direction === 'arrival'),
    );
    return (
      <fieldset className="transfer-leg">
        <legend>{title}</legend>
        <div className="transfer-options">
          {legs.map((leg) => (
            <div className="transfer-option" key={leg.id}>
              <span>
                <strong>
                  <ServiceIcon type={leg.serviceType} /> {leg.serviceName}
                </strong>
                <small>
                  {leg.serviceType} · {leg.bookingMode === 'Scheduled' ? 'Scheduled' : 'On-demand'}
                </small>
                <small>
                  {leg.date} · {leg.time} · {leg.passengers} pax
                </small>
                <small>
                  <MapPin size={13} /> {leg.pickup} → {leg.dropoff}
                </small>
                <small>Operator: {leg.operatorName}</small>
                {leg.flightNo && <small>Flight: {leg.flightNo}</small>}
                {(leg.vehicle || leg.driver) && (
                  <small>
                    Vehicle/driver: {[leg.vehicle, leg.driver].filter(Boolean).join(' · ')}
                  </small>
                )}
                {leg.incidentalCharge?.chargeId && (
                  <small>
                    {leg.incidentalCharge.chargeTitle} · Adult {Number(leg.incidentalCharge.adultRate || 0).toFixed(2)} · Child {Number(leg.incidentalCharge.childRate || 0).toFixed(2)} · Infant {Number(leg.incidentalCharge.infantRate || 0).toFixed(2)}
                  </small>
                )}
                {leg.remarks && <small>{leg.remarks}</small>}
              </span>
              <button
                type="button"
                className="transport-remove-button"
                aria-label={`Remove ${leg.serviceName}`}
                title="Remove transport"
                disabled={pending}
                onClick={async () => {
                  try {
                    await onRemove(leg.id);
                    setError('');
                  } catch (error) {
                    setError((error as Error).message);
                  }
                }}
              >
                <DeleteIcon size={18} />
              </button>
            </div>
          ))}
          {old.map((trip) => (
            <div className="transfer-option" key={`legacy-${trip.id}`}>
              <span>
                <strong>
                  <Ship size={17} /> {trip.boat}
                </strong>
                <small>Existing scheduled transfer</small>
                <small>{trip.date} · {trip.time} · {trip.origin} → {trip.destination}</small>
                <small>
                  {trip.groups.find((group) => group.bookingId === booking.reference)?.adults ?? booking.guests} pax
                </small>
              </span>
            </div>
          ))}
          {!legs.length && !old.length && (
            <p className="transfer-empty">No transport added yet.</p>
          )}
        </div>
        <button
          type="button"
          className="primary-button"
          disabled={blocked || pending || !services.length}
          onClick={() => startAdd(direction)}
        >
          <Plus size={16} /> Add transport
        </button>
      </fieldset>
    );
  };

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
        {!adding ? (
          <>
            <p className="helper-text">
              Add as many transport legs as needed. Scheduled services reserve an existing departure; on-demand services capture pickup details directly.
            </p>
            <div className="transfer-legs">
              {legSection('arrival')}
              {legSection('departure')}
            </div>
            {!services.length && (
              <p className="form-error">
                Add an active service and operator in Hotel Settings → Transport Setup first.
              </p>
            )}
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
              <button type="button" className="primary-button" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <form className="hotel-form" onSubmit={save}>
            <div className="settings-section-label">
              {adding === 'arrival' ? <Car size={18} /> : <Car size={18} />}
              <h4>{adding === 'arrival' ? 'Add arrival transport' : 'Add departure transport'}</h4>
            </div>
            <label>
              Transport service
              <Choice
                label="Transport service"
                value={serviceId}
                onChange={(value) => {
                  setServiceId(value);
                  setTripId('');
                }}
                items={services.map((service) => ({
                  value: service.id,
                  label: `${service.name} · ${serviceType(service)}`,
                }))}
              />
            </label>
            {selectedService && (
              <p className="helper-text">
                {serviceType(selectedService)} ·{' '}
                {selectedMode === 'Scheduled'
                  ? 'Choose from the transport timetable.'
                  : 'Enter pickup time and locations for this booking.'}
              </p>
            )}
            <label>
              Passengers
              <span className="seat-cell">
                <Users size={14} /> Maximum {booking.guests} from this booking
              </span>
              <input
                required
                type="number"
                min={1}
                max={Math.min(booking.guests, selectedService?.capacity ?? booking.guests)}
                value={passengers}
                onChange={(event) => setPassengers(Number(event.target.value))}
              />
            </label>

            {selectedMode === 'Scheduled' ? (
              <>
                <label className="transfer-date">
                  Travel date
                  <HotelDatePicker
                    required
                    value={travelDate}
                    onChange={(value) => {
                      setTravelDate(value);
                      setTripId('');
                    }}
                    ariaLabel="Travel date"
                  />
                </label>
                <div className="transfer-options">
                  {candidates.map((trip) => {
                    const remaining = trip.capacity - countPassengers(trip);
                    const unavailable =
                      ['Cancelled', 'Completed'].includes(trip.status) ||
                      remaining < passengers;
                    return (
                      <label
                        className={`transfer-option ${unavailable ? 'unavailable' : ''}`}
                        key={trip.id}
                      >
                        <input
                          type="radio"
                          name="tripId"
                          checked={tripId === trip.id}
                          disabled={unavailable}
                          onChange={() => setTripId(trip.id)}
                        />
                        <span>
                          <strong>
                            {trip.time} · {trip.origin} → {trip.destination}
                          </strong>
                          <small>
                            <Ship size={13} /> {trip.boat} · {remaining} seats available
                          </small>
                        </span>
                      </label>
                    );
                  })}
                  {!candidates.length && (
                    <p className="transfer-empty">
                      No matching scheduled departures on this date.
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => onCalendar(travelDate)}
                >
                  <CalendarDays size={15} /> View timetable
                </button>
              </>
            ) : selectedMode === 'OnDemand' ? (
              <>
                <div className="form-grid">
                  <label>
                    Travel date
                    <HotelDatePicker
                      name="date"
                      required
                      defaultValue={adding === 'arrival' ? booking.arrival : booking.departure}
                      ariaLabel="Travel date"
                    />
                  </label>
                  <label>
                    Pickup time
                    <input type="time" name="time" required defaultValue="10:00" />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Pickup from
                    <input
                      name="pickup"
                      required
                      maxLength={150}
                      placeholder="Airport, jetty, station or address"
                    />
                  </label>
                  <label>
                    Drop-off at
                    <input
                      name="dropoff"
                      required
                      maxLength={150}
                      placeholder="Hotel, jetty, airport or address"
                    />
                  </label>
                </div>
                <div className="form-grid">
                  <label>
                    Flight / reference <span className="optional-label">Optional</span>
                    <input name="flightNo" maxLength={80} placeholder="e.g. AK6042" />
                  </label>
                  <label>
                    Vehicle <span className="optional-label">Optional</span>
                    <input name="vehicle" maxLength={100} placeholder="e.g. Toyota Innova" />
                  </label>
                </div>
                <label>
                  Driver <span className="optional-label">Optional</span>
                  <input name="driver" maxLength={100} />
                </label>
                <label>
                  Remarks <span className="optional-label">Optional</span>
                  <textarea
                    name="remarks"
                    rows={3}
                    maxLength={1000}
                    placeholder="Pickup instructions, luggage, child seat, etc."
                  />
                </label>
              </>
            ) : null}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setAdding(null);
                  setError('');
                }}
              >
                Back
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={
                  pending ||
                  !selectedService ||
                  (selectedMode === 'Scheduled' && !tripId)
                }
              >
                Save transport
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
