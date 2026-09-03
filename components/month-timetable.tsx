'use client';
import { useContext } from 'react';
import {
  TransportDataContext,
  TransportRecovery,
} from './transport-connection';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus } from 'lucide-react';
import { Choice } from '@/components/hotel-choice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  countPassengers,
  formatDate,
  type Trip,
  type TransportSetup,
} from '@/lib/transport';
import {
  emptyDayNote,
  monthDates,
  shiftMonth,
  type DayNote,
} from '@/lib/transport-planning';

export function MonthTimetable({
  month,
  onMonth,
  trips,
  setup,
  boat,
  route,
  onBoat,
  onRoute,
  notes,
  onNote,
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
  notes: Record<string, DayNote>;
  onNote: (date: string, note: DayNote) => Promise<void>;
  onDay: (date: string) => void;
  onTrip: (trip: Trip) => void;
  onAdd: (date: string) => void;
}) {
  const pending = Boolean(useContext(TransportDataContext)?.pending);
  const [editing, setEditing] = useState<{
    date: string;
    note: DayNote;
  } | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [error, setError] = useState('');
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
          <label>
            <span className="sr-only">Timetable month</span>
            <input
              type="month"
              value={month}
              onChange={(event) =>
                event.target.value && onMonth(event.target.value)
              }
            />
          </label>
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
            : 'Trips by direction. Select a date for all departures; use the pencil for daily notes.'}
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
            const note = notes[date] ?? emptyDayNote;
            return (
              <article className="timetable-day" key={date}>
                <div className="timetable-date">
                  <button
                    onClick={() => onDay(date)}
                    aria-label={`Open ${formatDate(date)}, ${daily.length} trips`}
                  >
                    <strong>{Number(date.slice(-2))}</strong>
                    {!showAll && note.holiday && (
                      <i className="compact-holiday" title={note.holiday}>
                        <span className="sr-only">{note.holiday}</span>
                      </i>
                    )}
                    <span>{daily.length} trips</span>
                  </button>
                  <button
                    className={`icon-button ${note.notes ? 'has-daily-note' : ''}`}
                    title={note.holiday || note.notes || 'Daily notes'}
                    aria-label={`Edit notes for ${formatDate(date)}`}
                    onClick={() => setEditing({ date, note: { ...note } })}
                  >
                    <Pencil size={13} />
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
                          onClick={() => onDay(date)}
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
                    {note.holiday && (
                      <div className="timetable-holiday">{note.holiday}</div>
                    )}
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
                                        <b>{status}</b>
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
                    {(note.tide || note.restricted || note.notes) && (
                      <div className="timetable-notes">
                        {note.tide && (
                          <p>
                            <span>Tide window</span>
                            {note.tide}
                          </p>
                        )}
                        {note.restricted && (
                          <p className="tide-restricted">
                            <span>Restricted window</span>
                            {note.restricted}
                          </p>
                        )}
                        {note.notes && (
                          <p className="tide-note">{note.notes}</p>
                        )}
                      </div>
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
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
      >
        <DialogContent className="hotel-dialog">
          <DialogHeader>
            <DialogTitle>Daily notes</DialogTitle>
            <DialogDescription>
              {editing ? formatDate(editing.date) : ''}
            </DialogDescription>
          </DialogHeader>
          <TransportRecovery />
          {editing && (
            <form
              className="hotel-form"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  await onNote(editing.date, editing.note);
                  setError('');
                  setEditing(null);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {(
                [
                  ['holiday', 'Holiday / event'],
                  ['tide', 'Tide window'],
                  ['restricted', 'Restricted window'],
                  ['notes', 'Operating notes'],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={editing.note[key]}
                    maxLength={300}
                    placeholder={key === 'tide' ? 'e.g. 09:30–16:00' : ''}
                    onChange={(event) =>
                      setEditing({
                        ...editing,
                        note: { ...editing.note, [key]: event.target.value },
                      })
                    }
                  />
                </label>
              ))}
              <p className="helper-text">
                These notes do not create or cancel departures.
              </p>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={pending}>
                  Save notes
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
