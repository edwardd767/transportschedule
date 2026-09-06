'use client';
import { useContext } from 'react';
import {
  TransportDataContext,
  TransportRecovery,
} from './transport-connection';
import { useState, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Settings2,
  Ship,
  Users,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Choice } from '@/components/hotel-choice';
import {
  validateSetup,
  type TransportSetup as Setup,
  type TransportRoute,
  type Boat,
  type Operator,
  type ServiceBookingMode,
  type ServiceType,
  type ServiceChargeRate,
} from '@/lib/transport';
import type { HotelDepartment } from '@/lib/hotel-masters';

type Editor =
  | { kind: 'route'; record: TransportRoute }
  | { kind: 'boat'; record: Boat }
  | { kind: 'operator'; record: Operator };
export function TransportSetup({
  config,
  onChange,
  onBack,
  onNotice,
  scheduleTemplates,
  departments = [],
}: {
  config: Setup;
  onChange: (value: Setup) => Promise<void>;
  onBack: () => void;
  onNotice: (message: string) => void;
  scheduleTemplates: ReactNode;
  departments?: HotelDepartment[];
}) {
  const pending = Boolean(useContext(TransportDataContext)?.pending);
  const [tab, setTab] = useState('routes');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState('');
  const operatorName = (id: string) =>
    config.operators.find((o) => o.id === id)?.name ?? 'Unassigned';
  const operatorOptions = config.operators.map((o) => ({
    value: o.id,
    label: o.name + (o.active ? '' : ' (inactive)'),
  }));
  function open(kind: Editor['kind'], record?: Editor['record']) {
    setError('');
    const id = crypto.randomUUID();
    const operatorId = config.operators.find((o) => o.active)?.id ?? '';
    if (kind === 'route')
      setEditor({
        kind,
        record: (record as TransportRoute) ?? {
          id,
          origin: '',
          destination: '',
          meetingPoint: '',
          durationMinutes: 45,
          operatorId,
          toHotel: true,
          active: true,
        },
      });
    if (kind === 'boat')
      setEditor({
        kind,
        record: (record as Boat) ?? {
          id,
          name: '',
          operatorId,
          capacity: 16,
          status: 'Active',
          serviceType: 'Speedboat',
          bookingMode: 'Scheduled',
          incidentalCharge: undefined,
        },
      });
    if (kind === 'operator')
      setEditor({
        kind,
        record: (record as Operator) ?? {
          id,
          name: '',
          contact: '',
          phone: '',
          email: '',
          active: true,
        },
      });
  }
  function updateDraft(values: Partial<TransportRoute & Boat & Operator>) {
    setEditor((previous) =>
      previous
        ? ({ ...previous, record: { ...previous.record, ...values } } as Editor)
        : null,
    );
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor) return;
    try {
      let next: Setup;
      if (editor.kind === 'route') {
        const record = {
          ...editor.record,
          origin: editor.record.origin.trim(),
          destination: editor.record.destination.trim(),
          meetingPoint: editor.record.meetingPoint.trim(),
        };
        next = {
          ...config,
          routes: config.routes.some((r) => r.id === record.id)
            ? config.routes.map((r) => (r.id === record.id ? record : r))
            : [...config.routes, record],
        };
      } else if (editor.kind === 'boat') {
        const record = { ...editor.record, name: editor.record.name.trim() };
        next = {
          ...config,
          boats: config.boats.some((b) => b.id === record.id)
            ? config.boats.map((b) => (b.id === record.id ? record : b))
            : [...config.boats, record],
        };
      } else {
        const record = { ...editor.record, name: editor.record.name.trim() };
        next = {
          ...config,
          operators: config.operators.some((o) => o.id === record.id)
            ? config.operators.map((o) => (o.id === record.id ? record : o))
            : [...config.operators, record],
        };
      }
      await onChange(validateSetup(next));
      onNotice(`${editor.kind === 'boat' ? 'Service' : editor.kind[0].toUpperCase() + editor.kind.slice(1)} saved.`);
      setEditor(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  const isExisting =
    editor &&
    (editor.kind === 'route'
      ? config.routes
      : editor.kind === 'boat'
        ? config.boats
        : config.operators
    ).some((r) => r.id === editor.record.id);

  return (
    <>
      <div className="listing-title">
        <div>
          <h1>Transport Setup</h1>
          <span className="context-tag">
            <Ship size={14} /> Transport
          </span>
        </div>
        <button className="secondary-button" onClick={onBack}>
          <ArrowLeft size={17} /> Schedule
        </button>
      </div>
      <div className="setup-intro">
        <span className="setup-icon">
          <Settings2 size={25} />
        </span>
        <div>
          <h2>Set up your transport service</h2>
          <p>Manage the routes, services and schedule templates used for transport.</p>
        </div>
      </div>
      <div className="setup-counts">
        <div>
          <MapPin />
          <strong>{config.routes.filter((r) => r.active).length}</strong>
          <span>Active routes</span>
        </div>
        <div>
          <Ship />
          <strong>
            {config.boats.filter((b) => b.status === 'Active').length}
          </strong>
          <span>Available services</span>
        </div>
        <div>
          <Building2 />
          <strong>{config.operators.filter((o) => o.active).length}</strong>
          <span>Active operators</span>
        </div>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(String(value))}
        className="setup-tabs"
      >
        <TabsList variant="line">
          <TabsTrigger value="routes">
            <MapPin size={17} />
            Routes & locations
          </TabsTrigger>
          <TabsTrigger value="fleet">
            <Ship size={17} />
            Services & operators
          </TabsTrigger>
          <TabsTrigger value="templates">Schedule templates</TabsTrigger>
        </TabsList>
        <TabsContent value="templates">{scheduleTemplates}</TabsContent>
        <TabsContent value="routes">
          <div className="setup-panel">
            <div className="setup-panel-heading">
              <div>
                <h3>Routes & boarding locations</h3>
                <p>Set up each travel direction as its own route.</p>
              </div>
              <button className="primary-button" onClick={() => open('route')}>
                <Plus size={17} /> Add route
              </button>
            </div>
            <div className="route-setup-list">
              {config.routes.map((r) => (
                <div className="route-setup-card" key={r.id}>
                  <span className="route-icon">
                    <MapPin size={22} />
                  </span>
                  <div className="route-setup-copy">
                    <strong>
                      {r.origin}
                      <ArrowRight size={16} />
                      {r.destination}
                    </strong>
                    <span>
                      {r.meetingPoint} · {r.durationMinutes} min
                    </span>
                    <small>
                      {operatorName(r.operatorId)} ·{' '}
                      {r.toHotel ? 'To hotel' : 'From hotel'}
                    </small>
                  </div>
                  <span
                    className={`status-pill ${r.active ? 'boarding' : 'cancelled'}`}
                  >
                    {r.active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    className="edit-button"
                    aria-label={`Edit route ${r.origin} to ${r.destination}`}
                    onClick={() => open('route', r)}
                  >
                    <Pencil size={16} />
                    <span>Edit</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="fleet">
          <div className="setup-panel">
            <div className="setup-panel-heading">
              <div>
                <h3>Transport services & operators</h3>
                <p>
                  Manage operators and transport services such as boats, taxis and transfers
                  together in one place.
                </p>
              </div>
              <div className="form-actions">
                <button
                  className="secondary-button"
                  aria-busy={pending}
                  onClick={() => open('operator')}
                >
                  <Plus size={17} /> Add operator
                </button>
                <button
                  className="primary-button"
                  onClick={() => open('boat')}
                >
                  <Plus size={17} /> Add service
                </button>
              </div>
            </div>

            <div className="settings-section-label">
              <Building2 size={18} />
              <h4>Operators</h4>
              <span>{config.operators.length} configured</span>
            </div>
            <Table className="setup-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Operator</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Phone / email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.operators.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <span className="table-name">
                        <Building2 size={18} />
                        {o.name}
                      </span>
                    </TableCell>
                    <TableCell>{o.contact || '—'}</TableCell>
                    <TableCell>
                      <div className="contact-cell">
                        {o.phone || '—'}
                        <small>{o.email}</small>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`status-pill ${o.active ? 'boarding' : 'cancelled'}`}
                      >
                        {o.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        className="edit-button"
                        aria-label={`Edit operator ${o.name}`}
                        onClick={() => open('operator', o)}
                      >
                        <Pencil size={16} />
                        <span>Edit</span>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="settings-section-label">
              <Ship size={18} />
              <h4>Services</h4>
              <span>{config.boats.length} configured</span>
            </div>
            <Table className="setup-table">
              <TableHeader>
                <TableRow>
                  <TableHead>Service</TableHead>
                  <TableHead>Type / booking</TableHead>
                  <TableHead>Operator</TableHead>
                  <TableHead>Passenger capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.boats.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <span className="table-name">
                        <Ship size={18} />
                        {b.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="contact-cell">
                        {b.serviceType ?? 'Speedboat'}
                        <small>
                          {(b.bookingMode ?? 'Scheduled') === 'Scheduled'
                            ? 'Scheduled timetable'
                            : 'On-demand booking'}
                        </small>
                      </div>
                    </TableCell>
                    <TableCell>{operatorName(b.operatorId)}</TableCell>
                    <TableCell>
                      <span className="seat-cell">
                        <Users size={15} />
                        {b.capacity} seats
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`status-pill ${b.status === 'Active' ? 'boarding' : b.status === 'Maintenance' ? 'full' : 'cancelled'}`}
                      >
                        {b.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      <button
                        className="edit-button"
                        aria-label={`Edit service ${b.name}`}
                        onClick={() => open('boat', b)}
                      >
                        <Pencil size={16} />
                        <span>Edit</span>
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
      <div className="setup-scope-note">
        <Settings2 size={18} />
        <p>
          Setup changes apply to new trips. Existing departures retain their
          route, service, capacity and instructions so current bookings stay
          consistent.
        </p>
      </div>
      <p className="demo-note">
        Open your private link to keep your setup across refreshes. Demo mode
        uses sample configuration.
      </p>
      <Dialog
        open={editor !== null}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <DialogContent className="hotel-dialog setup-dialog">
          <DialogHeader>
            <DialogTitle>
              {isExisting ? 'Edit' : 'Add'} {editor?.kind === 'boat' ? 'service' : editor?.kind}
            </DialogTitle>
            <DialogDescription>
              {editor?.kind === 'route'
                ? 'Define a direction, operator and boarding point.'
                : editor?.kind === 'boat'
                  ? 'Set the service’s operator, capacity and availability.'
                  : 'Add the service provider and contact details.'}
            </DialogDescription>
          </DialogHeader>
          <TransportRecovery />
          {editor && (
            <form className="hotel-form" onSubmit={save}>
              {editor.kind === 'route' && (
                <>
                  <div className="form-grid">
                    <label>
                      From
                      <input
                        required
                        maxLength={70}
                        value={editor.record.origin}
                        onChange={(e) =>
                          updateDraft({ origin: e.target.value })
                        }
                        placeholder="e.g. Mersing"
                      />
                    </label>
                    <label>
                      To
                      <input
                        required
                        maxLength={70}
                        value={editor.record.destination}
                        onChange={(e) =>
                          updateDraft({ destination: e.target.value })
                        }
                        placeholder="e.g. Rawa"
                      />
                    </label>
                  </div>
                  <label>
                    Boarding location
                    <input
                      required
                      maxLength={150}
                      value={editor.record.meetingPoint}
                      onChange={(e) =>
                        updateDraft({ meetingPoint: e.target.value })
                      }
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Journey duration (minutes)
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={editor.record.durationMinutes}
                        onChange={(e) =>
                          updateDraft({
                            durationMinutes: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Journey direction
                      <Choice
                        label="Journey direction"
                        value={editor.record.toHotel ? 'arrival' : 'departure'}
                        onChange={(v) =>
                          updateDraft({ toHotel: v === 'arrival' })
                        }
                        items={[
                          { value: 'arrival', label: 'To hotel' },
                          { value: 'departure', label: 'From hotel' },
                        ]}
                      />
                    </label>
                  </div>
                  <label>
                    Operator
                    <Choice
                      label="Route operator"
                      value={editor.record.operatorId}
                      onChange={(v) => updateDraft({ operatorId: v })}
                      items={operatorOptions}
                    />
                  </label>
                  <div className="switch-field">
                    <div>
                      <strong id="route-active-label">Active route</strong>
                      <small>Available for new departures</small>
                    </div>
                    <Switch
                      aria-labelledby="route-active-label"
                      checked={editor.record.active}
                      onCheckedChange={(v) => updateDraft({ active: v })}
                    />
                  </div>
                </>
              )}
              {editor.kind === 'boat' && (
                <>
                  <label>
                    Service name
                    <input
                      required
                      maxLength={70}
                      value={editor.record.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      placeholder="e.g. Island Transfer 01"
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Service type
                      <Choice
                        label="Service type"
                        value={editor.record.serviceType ?? 'Speedboat'}
                        onChange={(v) => {
                          const serviceType = v as ServiceType;
                          const bookingMode: ServiceBookingMode =
                            serviceType === 'Speedboat' || serviceType === 'Shuttle'
                              ? 'Scheduled'
                              : 'OnDemand';
                          updateDraft({ serviceType, bookingMode });
                        }}
                        items={[
                          'Speedboat',
                          'Taxi Pickup',
                          'Taxi Drop-off',
                          'Hotel Van',
                          'Shuttle',
                          'Other',
                        ].map((v) => ({ value: v, label: v }))}
                      />
                    </label>
                    <label>
                      Booking method
                      <Choice
                        label="Booking method"
                        value={editor.record.bookingMode ?? 'Scheduled'}
                        onChange={(v) =>
                          updateDraft({ bookingMode: v as ServiceBookingMode })
                        }
                        items={[
                          { value: 'Scheduled', label: 'Scheduled timetable' },
                          { value: 'OnDemand', label: 'On-demand booking' },
                        ]}
                      />
                    </label>
                  </div>
                  <label>
                    Incidental charge
                    <Choice
                      label="Incidental charge"
                      value={editor.record.incidentalCharge?.chargeId ?? 'none'}
                      onChange={(v) => {
                        if (v === 'none') return updateDraft({ incidentalCharge: undefined });
                        const charge = departments.flatMap((d) => d.incidentalCharges).find((c) => c.id === v);
                        if (charge) updateDraft({ incidentalCharge: { chargeId: charge.id, chargeTitle: charge.title, adultRate: charge.amount, childRate: charge.amount, infantRate: charge.amount } as ServiceChargeRate });
                      }}
                      items={[{ value: 'none', label: 'No incidental charge' }, ...departments.flatMap((d) => d.incidentalCharges.map((c) => ({ value: c.id, label: `${d.name} · ${c.title}` })))]}
                    />
                  </label>
                  {editor.record.incidentalCharge && <div className="form-grid">
                    {(['adultRate', 'childRate', 'infantRate'] as const).map((field) => <label key={field}>{field === 'adultRate' ? 'Adult rate' : field === 'childRate' ? 'Child rate' : 'Infant rate'}
                      <input type="number" min="0" step="0.01" value={editor.record.incidentalCharge?.[field] ?? 0} onChange={(e) => updateDraft({ incidentalCharge: { ...editor.record.incidentalCharge!, [field]: Number(e.target.value) } })} />
                    </label>)}
                  </div>}
                  <label>
                    Operator
                    <Choice
                      label="Service operator"
                      value={editor.record.operatorId}
                      onChange={(v) => updateDraft({ operatorId: v })}
                      items={operatorOptions}
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Passenger seat capacity
                      <input
                        required
                        type="number"
                        min="1"
                        step="1"
                        value={editor.record.capacity}
                        onChange={(e) =>
                          updateDraft({ capacity: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Status
                      <Choice
                        label="Service status"
                        value={editor.record.status}
                        onChange={(v) =>
                          updateDraft({ status: v as Boat['status'] })
                        }
                        items={['Active', 'Maintenance', 'Inactive'].map(
                          (v) => ({ value: v, label: v }),
                        )}
                      />
                    </label>
                  </div>
                  <p className="helper-text">
                    Scheduled services appear in the timetable and reserve seats.
                    On-demand services such as taxis are entered directly in the
                    guest booking. Capacity is the maximum passengers for one service.
                  </p>
                </>
              )}
              {editor.kind === 'operator' && (
                <>
                  <label>
                    Operator name
                    <input
                      required
                      maxLength={100}
                      value={editor.record.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                    />
                  </label>
                  <label>
                    Contact person{' '}
                    <span className="optional-label">Optional</span>
                    <input
                      maxLength={100}
                      value={editor.record.contact}
                      onChange={(e) => updateDraft({ contact: e.target.value })}
                    />
                  </label>
                  <div className="form-grid">
                    <label>
                      Phone
                      <input
                        type="tel"
                        maxLength={40}
                        value={editor.record.phone}
                        onChange={(e) => updateDraft({ phone: e.target.value })}
                      />
                    </label>
                    <label>
                      Email
                      <input
                        type="email"
                        maxLength={150}
                        value={editor.record.email}
                        onChange={(e) => updateDraft({ email: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="switch-field">
                    <div>
                      <strong id="operator-active-label">
                        Active operator
                      </strong>
                      <small>Available for new departures</small>
                    </div>
                    <Switch
                      aria-labelledby="operator-active-label"
                      checked={editor.record.active}
                      onCheckedChange={(v) => updateDraft({ active: v })}
                    />
                  </div>
                </>
              )}
              {error && (
                <p role="alert" className="form-error">
                  {error}
                </p>
              )}
              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setEditor(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={pending}
                >
                  <Save size={16} /> Save {editor.kind === 'boat' ? 'service' : editor.kind}
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
