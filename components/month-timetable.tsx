'use client';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Choice } from '@/components/hotel-choice';
import {
  countPassengers,
  formatDate,
  tripStatusLabel,
  type Trip,
  type TransportSetup,
} from '@/lib/transport';
import { monthDates, shiftMonth } from '@/lib/transport-planning';

export function MonthTimetable({
  month,
  onMonth,
  trips,
  setup,
  boat,
  route,
  onBoat,
  onRoute,
  onDay,
  onTrip,
  onAdd,
}: {
  month: string;
  onMonth: (value: string) => void;
  trips: Trip[];
  setup: TransportSetup;
  boat: string;
  route: string;
  onBoat: (value: string) => void;
  onRoute: (value: string) => void;
  onDay: (date: string, routeId?: string) => void;
  onTrip: (trip: Trip) => void;
  onAdd: (date: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const dates = monthDates(month);
  const filtered = trips.filter(
    (trip) =>
      trip.date.startsWith(month) &&
      (boat === 'all' || trip.boatId === boat) &&
      (route === 'all' || trip.direction === route),
  );
  const byDate = new Map<string, Trip[]>();
  for (const trip of [...filtered].sort((a, b) => a.time.localeCompare(b.time)))
    byDate.set(trip.date, [...(byDate.get(trip.date) ?? []), trip]);
  return (
    <section className="timetable" aria-label="Monthly transport timetable">
      <div className="timetable-controls">
        <div className="timetable-month">
          <button
            className="icon-button"
            aria-label="Previous month"
            onClick={() => onMonth(shiftMonth(month, -1))}
          >
            <ChevronLeft size={20} />
          </button>
          <HotelDatePicker
            mode="month"
            value={month}
            onChange={onMonth}
            ariaLabel="Timetable month"
            className="hotel-month-field"
          />
          <button
            className="icon-button"
            aria-label="Next month"
            onClick={() => onMonth(shiftMonth(month, 1))}
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <Choice
          label="Filter calendar by boat"
          value={boat}
          onChange={onBoat}
          items={[
            { value: 'all', label: 'All boats' },
            ...setup.boats.map((item) => ({
              value: item.id,
              label: item.name,
            })),
          ]}
        />
        <Choice
          label="Filter calendar by route"
          value={route}
          onChange={onRoute}
          items={[
            { value: 'all', label: 'All routes' },
            ...setup.routes.map((item) => ({
              value: item.id,
              label: `${item.origin} → ${item.destination}`,
            })),
          ]}
        />
        <label className="calendar-expand">
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => setShowAll(event.target.checked)}
          />{' '}
          Expanded timetable
        </label>
        <span className="timetable-count">{filtered.length} trips</span>
      </div>
      <div className="timetable-key">
        <span className="direction-in">● To hotel</span>
        <span className="direction-out">● From hotel</span>
        <span>
          {showAll
            ? 'Seats shown as booked / capacity. Select a time for trip details.'
            : 'Trips by direction. Select a date for all departures.'}
        </span>
      </div>
      <div
        className={`timetable-scroll ${showAll ? 'timetable-expanded' : 'timetable-fit'}`}
        key={month}
        tabIndex={0}
        role="region"
        aria-label="Calendar dates and departures"
      >
        <div
          className="timetable-grid"
          style={
            showAll
              ? undefined
              : {
                  gridTemplateRows: `28px repeat(${dates.length / 7}, minmax(0, 1fr))`,
                }
          }
        >
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div className="timetable-weekday" key={day}>
              {day}
            </div>
          ))}
          {dates.map((date, index) => {
            if (!date)
              return <div className="timetable-blank" key={`blank-${index}`} />;
            const daily = byDate.get(date) ?? [];
            return (
              <article
                className={`timetable-day ${index % 7 >= 5 ? 'is-weekend' : ''}`}
                key={date}
              >
                <div className="timetable-date">
                  <button
                    onClick={() => onDay(date)}
                    aria-label={`Open ${formatDate(date)}, ${daily.length} trips`}
                  >
                    <span className="calendar-date-badge">
                      <strong>{Number(date.slice(-2))}</strong>
                      <small>
                        {new Date(`${date}T12:00:00`).toLocaleDateString('en', {
                          month: 'short',
                        })}
                      </small>
                    </span>
                    <span>{daily.length} trips</span>
                  </button>
                </div>
                {!showAll ? (
                  <div className="compact-directions">
                    {[true, false].map((direction) => {
                      const departures = daily.filter(
                        (trip) => trip.toHotel === direction,
                      );
                      const first = departures[0];
                      const label = direction ? 'To hotel' : 'From hotel';
                      return (
                        <button
                          key={String(direction)}
                          className={`compact-direction ${direction ? 'direction-in' : 'direction-out'}`}
                          onClick={() =>
                            onDay(
                              date,
                              departures[0]?.direction ??
                                setup.routes.find(
                                  (item) => item.toHotel === direction,
                                )?.id,
                            )
                          }
                          title={`${formatDate(date)} · ${label}: ${departures.length} trips${first ? ` · First departure ${first.time}, ${first.boat}` : ''}`}
                          aria-label={`${formatDate(date)}, ${departures.length} ${label.toLowerCase()} trips. Open day listing.`}
                        >
                          <span className="compact-trip-count">
                            <b>{departures.length}</b>
                            <span>
                              {departures.length === 1 ? 'trip' : 'trips'}
                            </span>
                          </span>
                          {first && (
                            <>
                              <strong className="compact-first-time">
                                {first.time}
                              </strong>
                              <span className="compact-first-boat">
                                {first.boat}
                              </span>
                            </>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <>
                    {daily.length ? (
                      <div className="timetable-directions">
                        {[true, false].map((direction) => {
                          const departures = daily.filter(
                            (trip) => trip.toHotel === direction,
                          );
                          return (
                            <div
                              key={String(direction)}
                              className={
                                direction ? 'direction-in' : 'direction-out'
                              }
                            >
                              <h3>{direction ? 'To hotel' : 'From hotel'}</h3>
                              {departures.map((trip) => {
                                const booked = countPassengers(trip);
                                const status =
                                  trip.status === 'Scheduled' &&
                                  booked >= trip.capacity
                                    ? 'Full'
                                    : trip.status;
                                return (
                                  <button
                                    key={trip.id}
                                    className={`calendar-departure ${trip.status === 'Cancelled' ? 'is-cancelled' : ''}`}
                                    onClick={() => onTrip(trip)}
                                    aria-label={`${trip.time}, ${trip.origin} to ${trip.destination}, ${trip.boat}, ${booked} of ${trip.capacity} seats booked, ${status}`}
                                  >
                                    <strong>{trip.time}</strong>
                                    <span>{trip.boat}</span>
                                    <small>
                                      {trip.origin} → {trip.destination}
                                    </small>
                                    <span className="calendar-seats">
                                      {booked}/{trip.capacity}
                                      {status !== 'Scheduled' && (
                                        <b>{tripStatusLabel(status)}</b>
                                      )}
                                    </span>
                                  </button>
                                );
                              })}
                              {!departures.length && (
                                <span className="calendar-no-direction">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <button
                        className="calendar-empty-day"
                        onClick={() => onAdd(date)}
                      >
                        <Plus size={15} /> Add departure
                      </button>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      </div>
      <p className={`calendar-source ${showAll ? '' : 'calendar-fit-source'}`}>
        {showAll ? (
          <>
            August timetable and tide windows: supplied customer PDF. Tide notes
            are reference information; operating hours and boat availability are
            checked separately when adding trips.
          </>
        ) : (
          'Month overview · Counts follow your boat and route filters. Times shown are the first departures. Expand the timetable for every trip.'
        )}
      </p>
    </section>
  );
}
