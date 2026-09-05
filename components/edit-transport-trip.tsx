'use client';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import { useContext } from 'react';
import {
  TransportDataContext,
  TransportRecovery,
} from './transport-connection';
import { useState } from 'react';
import { Choice } from '@/components/hotel-choice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Trip, TransportSetup } from '@/lib/transport';
export function EditTransportTrip({
  trip,
  setup,
  onClose,
  onSave,
}: {
  trip: Trip;
  setup: TransportSetup;
  onClose: () => void;
  onSave: (values: {
    date: string;
    time: string;
    boatId: string;
    routeId: string;
  }) => Promise<void>;
}) {
  const pending = Boolean(useContext(TransportDataContext)?.pending);
  const [values, setValues] = useState({
    date: trip.date,
    time: trip.time,
    boatId: trip.boatId,
    routeId: trip.direction,
  });
  const [error, setError] = useState('');
  const routes = setup.routes.filter(
    (route) =>
      route.active &&
      setup.operators.some(
        (operator) => operator.id === route.operatorId && operator.active,
      ),
  );
  const boats = setup.boats.filter(
    (boat) =>
      boat.status === 'Active' &&
      boat.operatorId ===
        routes.find((route) => route.id === values.routeId)?.operatorId,
  );
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="hotel-dialog">
        <DialogHeader>
          <DialogTitle>Edit departure</DialogTitle>
          <DialogDescription>
            {trip.id} · This change applies only to this trip. Passenger
            assignments will be kept.
          </DialogDescription>
        </DialogHeader>
        <TransportRecovery />
        <form
          className="hotel-form"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await onSave(values);
              onClose();
            } catch (error) {
              setError((error as Error).message);
            }
          }}
        >
          <div className="form-grid">
            <label>
              Date
              <HotelDatePicker
                required
                value={values.date}
                onChange={(date) => setValues({ ...values, date })}
                ariaLabel="Departure date"
              />
            </label>
            <label>
              Departure time
              <input
                type="time"
                required
                value={values.time}
                onChange={(event) =>
                  setValues({ ...values, time: event.target.value })
                }
              />
            </label>
          </div>
          <label>
            Route
            <Choice
              label="Departure route"
              value={values.routeId}
              onChange={(routeId) =>
                setValues({
                  ...values,
                  routeId,
                  boatId:
                    setup.boats.find(
                      (boat) =>
                        boat.status === 'Active' &&
                        boat.operatorId ===
                          routes.find((route) => route.id === routeId)
                            ?.operatorId,
                    )?.id ?? '',
                })
              }
              items={routes.map((route) => ({
                value: route.id,
                label: `${route.origin} → ${route.destination}`,
              }))}
            />
          </label>
          <label>
            Boat
            <Choice
              label="Departure boat"
              value={values.boatId}
              onChange={(boatId) => setValues({ ...values, boatId })}
              items={boats.map((boat) => ({
                value: boat.id,
                label: `${boat.name} · ${boat.capacity} seats`,
              }))}
            />
          </label>
          {error && (
            <p role="alert" className="form-error">
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
            <button className="primary-button" disabled={pending}>
              Save departure
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
