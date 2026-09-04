'use client';
import { useContext } from 'react';
import {
  TransportDataContext,
  TransportRecovery,
} from './transport-connection';
import { useState } from 'react';
import { CalendarDays, Pencil, Plus } from 'lucide-react';
import { Choice } from '@/components/hotel-choice';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  validateTemplate,
  type ScheduleTemplate,
} from '@/lib/transport-planning';
import { tripFromSetup, type TransportSetup } from '@/lib/transport';

export function ScheduleTemplates({
  setup,
  templates,
  onChange,
}: {
  setup: TransportSetup;
  templates: ScheduleTemplate[];
  onChange: (templates: ScheduleTemplate[]) => Promise<void>;
}) {
  const pending = Boolean(useContext(TransportDataContext)?.pending);
  const [draft, setDraft] = useState<ScheduleTemplate | null>(null);
  const [times, setTimes] = useState('');
  const [excluded, setExcluded] = useState('');
  const [error, setError] = useState('');
  function open(template?: ScheduleTemplate) {
    const route = setup.routes.find(
      (item) =>
        item.active &&
        setup.operators.some(
          (operator) => operator.id === item.operatorId && operator.active,
        ),
    );
    const value = template ?? {
      id: crypto.randomUUID(),
      name: '',
      routeId: route?.id ?? '',
      boatId:
        setup.boats.find(
          (item) =>
            item.operatorId === route?.operatorId && item.status === 'Active',
        )?.id ?? '',
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      weekdays: [1, 2, 3, 4, 5, 6, 0],
      times: ['09:30'],
      excludedDates: [],
    };
    setDraft({ ...value });
    setTimes(value.times.join(', '));
    setExcluded(value.excludedDates.join(', '));
    setError('');
  }
  const routes = setup.routes.filter(
    (item) =>
      item.active &&
      setup.operators.some(
        (operator) => operator.id === item.operatorId && operator.active,
      ),
  );
  const boats = setup.boats.filter(
    (item) =>
      item.status === 'Active' &&
      item.operatorId ===
        routes.find((route) => route.id === draft?.routeId)?.operatorId,
  );
  return (
    <div className="setup-panel">
      <div className="setup-panel-heading">
        <div>
          <h3>Schedule templates</h3>
          <p>
            Define and save recurring transport schedules. Templates are validated
            before the record is saved.
          </p>
        </div>
        <button className="primary-button" onClick={() => open()}>
          <Plus size={17} /> Add template
        </button>
      </div>
      <div className="template-list">
        {templates.length ? (
          templates.map((template) => (
            <div className="template-card" key={template.id}>
              <CalendarDays size={24} />
              <div>
                <strong>{template.name}</strong>
                <p>
                  {
                    setup.boats.find((boat) => boat.id === template.boatId)
                      ?.name
                  }{' '}
                  ·{' '}
                  {
                    setup.routes.find((route) => route.id === template.routeId)
                      ?.origin
                  }{' '}
                  →{' '}
                  {
                    setup.routes.find((route) => route.id === template.routeId)
                      ?.destination
                  }
                </p>
                <small>
                  {template.startDate} – {template.endDate} ·{' '}
                  {template.times.join(', ')}
                </small>
              </div>
              <button
                className="edit-button"
                aria-label={`Edit ${template.name}`}
                onClick={() => open(template)}
              >
                <Pencil size={15} /> Edit
              </button>
            </div>
          ))
        ) : (
          <div className="empty-state small">
            <CalendarDays size={28} />
            <h3>No schedule templates yet</h3>
            <p>Create a template with a route, boat, times and date range.</p>
          </div>
        )}
      </div>
      {error && !draft && (
        <p role="alert" className="form-error template-error">
          {error}
        </p>
      )}
      <p className="template-help">
        Save validates the route, service, travel dates, weekdays and departure
        times before storing the template. Saving does not generate trips.
      </p>
      <Dialog
        open={draft !== null}
        onOpenChange={(open) => !open && setDraft(null)}
      >
        <DialogContent className="hotel-dialog template-dialog">
          <DialogHeader>
            <DialogTitle>
              {templates.some((item) => item.id === draft?.id)
                ? 'Edit schedule template'
                : 'New schedule template'}
            </DialogTitle>
            <DialogDescription>
              Choose one boat and travel direction for this template.
            </DialogDescription>
          </DialogHeader>
          <TransportRecovery />
          {draft && (
            <form
              className="hotel-form"
              onSubmit={async (event) => {
                event.preventDefault();
                try {
                  const value = validateTemplate({
                    ...draft,
                    name: draft.name.trim(),
                    times: times
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                    excludedDates: excluded
                      .split(',')
                      .map((value) => value.trim())
                      .filter(Boolean),
                  });
                  tripFromSetup(setup, {
                    id: 'validation',
                    date: value.startDate,
                    time: value.times[0],
                    routeId: value.routeId,
                    boatId: value.boatId,
                  });
                  await onChange(
                    templates.some((item) => item.id === value.id)
                      ? templates.map((item) =>
                          item.id === value.id ? value : item,
                        )
                      : [...templates, value],
                  );
                  setDraft(null);
                } catch (error) {
                  setError((error as Error).message);
                }
              }}
            >
              <label>
                Template name
                <input
                  required
                  maxLength={80}
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                  placeholder="e.g. September arrivals"
                />
              </label>
              <div className="form-grid">
                <label>
                  Route
                  <Choice
                    label="Template route"
                    value={draft.routeId}
                    onChange={(routeId) =>
                      setDraft({
                        ...draft,
                        routeId,
                        boatId:
                          setup.boats.find(
                            (boat) =>
                              boat.operatorId ===
                                routes.find((route) => route.id === routeId)
                                  ?.operatorId && boat.status === 'Active',
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
                    label="Template boat"
                    value={draft.boatId}
                    onChange={(boatId) => setDraft({ ...draft, boatId })}
                    items={boats.map((boat) => ({
                      value: boat.id,
                      label: `${boat.name} · ${boat.capacity} seats`,
                    }))}
                  />
                </label>
              </div>
              <div className="form-grid">
                <label>
                  From
                  <input
                    type="date"
                    required
                    value={draft.startDate}
                    onChange={(event) =>
                      setDraft({ ...draft, startDate: event.target.value })
                    }
                  />
                </label>
                <label>
                  Until
                  <input
                    type="date"
                    required
                    min={draft.startDate}
                    value={draft.endDate}
                    onChange={(event) =>
                      setDraft({ ...draft, endDate: event.target.value })
                    }
                  />
                </label>
              </div>
              <fieldset className="template-weekdays">
                <legend>Operating weekdays</legend>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                  (label, index) => (
                    <label key={label}>
                      <input
                        type="checkbox"
                        checked={draft.weekdays.includes(index)}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            weekdays: event.target.checked
                              ? [...draft.weekdays, index]
                              : draft.weekdays.filter((day) => day !== index),
                          })
                        }
                      />
                      {label}
                    </label>
                  ),
                )}
              </fieldset>
              <label>
                Departure times
                <input
                  required
                  value={times}
                  onChange={(event) => setTimes(event.target.value)}
                  placeholder="09:30, 11:00, 12:30"
                />
              </label>
              <label>
                Exclude dates (optional)
                <input
                  value={excluded}
                  onChange={(event) => setExcluded(event.target.value)}
                  placeholder="2026-09-05, 2026-09-12"
                />
              </label>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setDraft(null)}
                >
                  Cancel
                </button>
                <button className="primary-button" disabled={pending}>
                  Save
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
