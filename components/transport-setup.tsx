'use client';
import { useContext } from 'react';
import {
  TransportDataContext,
  TransportRecovery,
} from './transport-connection';
import { useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  Settings2,
  Ship,
  Users,
  X,
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
import { HotelDatePicker } from '@/components/hotel-date-picker';
import {
  validateSetup,
  tripFromSetup,
  type TransportSetup as Setup,
  type TransportRoute,
  type Boat,
  type Operator,
  type ServiceBookingMode,
  type ServiceType,
  type ServiceChargeRate,
  type Trip,
} from '@/lib/transport';
import type { HotelDepartment } from '@/lib/hotel-masters';
import { parseScheduleWorkbook, type ScheduleParseResult } from '@/lib/schedule-import';
import type { ImportedSchedule } from '@/lib/transport-state';

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
  schedules = [],
  onTripsAdd,
  onTripsDelete,
  onSchedulesChange,
}: {
  config: Setup;
  onChange: (value: Setup) => Promise<void>;
  onBack: () => void;
  onNotice: (message: string) => void;
  scheduleTemplates: ReactNode;
  departments?: HotelDepartment[];
  schedules?: ImportedSchedule[];
  onSchedulesChange?: (value: ImportedSchedule[]) => Promise<void>;
  onTripsAdd?: (value: Trip[]) => Promise<void>;
  onTripsDelete?: (keys: { date: string; routeId: string; boatId: string }[]) => Promise<void>;
}) {
  const pending = Boolean(useContext(TransportDataContext)?.pending);
  const [tab, setTab] = useState('fleet');
  const [editor, setEditor] = useState<Editor | null>(null);
  const [error, setError] = useState('');
  const [importPreview, setImportPreview] = useState<{ fileName: string; result: ScheduleParseResult } | null>(null);
  const [importBoatId, setImportBoatId] = useState('');
  const [importMersingRoute, setImportMersingRoute] = useState('');
  const [importRawaRoute, setImportRawaRoute] = useState('');
  const [importError, setImportError] = useState('');
  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportError('');
    try {
      const result = await parseScheduleWorkbook(await file.arrayBuffer());
      setImportPreview({ fileName: file.name.replace(/\.xlsx$/i, ''), result });
      setImportBoatId(config.boats[0]?.id ?? '');
      const mersing = config.routes.find((route) => route.destination.toLowerCase().includes('mersing')) ?? config.routes[0];
      const rawa = config.routes.find((route) => route.destination.toLowerCase().includes('rawa')) ?? config.routes[1] ?? config.routes[0];
      setImportMersingRoute(mersing?.id ?? '');
      setImportRawaRoute(rawa?.id ?? '');
    } catch (caught) {
      setImportError(caught instanceof Error ? caught.message : String(caught));
    }
  };
  const saveImport = async () => {
    if (!importPreview) return;
    const entries = importPreview.result.months.flatMap((month) =>
      month.days.flatMap((day) => [
        ...(day.toMersing.length && importMersingRoute ? [{ date: day.date, routeId: importMersingRoute, times: day.toMersing }] : []),
        ...(day.toRawa.length && importRawaRoute ? [{ date: day.date, routeId: importRawaRoute, times: day.toRawa }] : []),
      ]),
    );
    if (!onSchedulesChange) return;
    await onSchedulesChange([...schedules, { id: crypto.randomUUID(), name: importPreview.fileName, boatId: importBoatId, entries }]);
    setImportPreview(null);
    onNotice(`Imported ${entries.length} schedule days.`);
  };
  const [generateSchedule, setGenerateSchedule] = useState<ImportedSchedule | null>(null);
  const [generateFrom, setGenerateFrom] = useState('');
  const [generateUntil, setGenerateUntil] = useState('');
  const openGenerate = (schedule: ImportedSchedule) => {
    const dates = schedule.entries.map((entry) => entry.date).sort();
    setGenerateFrom(dates[0] ?? '');
    setGenerateUntil(dates[dates.length - 1] ?? '');
    setGenerateSchedule(schedule);
  };
  const generateEntries = generateSchedule
    ? generateSchedule.entries.filter((entry) => entry.date >= generateFrom && entry.date <= generateUntil)
    : [];
  const generateTrips = async () => {
    if (!generateSchedule || !onTripsAdd) return;
    const created: Trip[] = [];
    for (const entry of generateEntries) {
      for (const time of entry.times) {
        try {
          created.push(
            tripFromSetup(config, {
              id: crypto.randomUUID(),
              date: entry.date,
              time,
              routeId: entry.routeId,
              boatId: generateSchedule.boatId,
            }),
          );
        } catch {
          /* Skip route/service combinations that are no longer active. */
        }
      }
    }
    await onTripsAdd(created);
    setGenerateSchedule(null);
    onNotice(`Generated ${created.length} trips.`);
  };
  const [deletingSchedule, setDeletingSchedule] = useState<ImportedSchedule | null>(null);
  const [deleteFrom, setDeleteFrom] = useState('');
  const [deleteUntil, setDeleteUntil] = useState('');
  const openDelete = (schedule: ImportedSchedule) => {
    const dates = schedule.entries.map((entry) => entry.date).sort();
    setDeleteFrom(dates[0] ?? '');
    setDeleteUntil(dates[dates.length - 1] ?? '');
    setDeletingSchedule(schedule);
  };
  const deleteEntries = deletingSchedule
    ? deletingSchedule.entries
        .filter((entry) => entry.date >= deleteFrom && entry.date <= deleteUntil)
        .map((entry) => ({ date: entry.date, routeId: entry.routeId, boatId: deletingSchedule.boatId }))
    : [];
  const confirmDeleteTrips = async () => {
    if (!deletingSchedule || !onTripsDelete) return;
    await onTripsDelete(deleteEntries);
    setDeletingSchedule(null);
  };
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

  const moneyLabel = (value: number) =>
    value.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const serviceMeta = (boat: Boat) => {
    const parts: string[] = [boat.serviceType ?? 'Speedboat'];
    if ((boat.bookingMode ?? 'Scheduled') === 'Scheduled') {
      parts.push('Scheduled timetable', operatorName(boat.operatorId));
    }
    parts.push(`${boat.capacity} seats`);
    if (boat.incidentalCharge) {
      parts.push(
        `Adult ${moneyLabel(boat.incidentalCharge.adultRate)}`,
        `Child ${moneyLabel(boat.incidentalCharge.childRate)}`,
        `Infant ${moneyLabel(boat.incidentalCharge.infantRate)}`,
      );
    }
    return parts.join(' • ');
  };
  const toggleOperator = (operator: Operator) =>
    onChange({
      ...config,
      operators: config.operators.map((item) =>
        item.id === operator.id ? { ...item, active: !item.active } : item,
      ),
    });
  const toggleBoat = (boat: Boat) =>
    onChange({
      ...config,
      boats: config.boats.map((item) =>
        item.id === boat.id
          ? { ...item, status: item.status === 'Active' ? 'Inactive' : 'Active' }
          : item,
      ),
    });

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
      <div className="setup-head-row">
        <div className="setup-intro">
          <span className="setup-icon">
            <img src="https://dev.hotelx.asia/static/media/transport.e77073f1.svg" alt="" width={26} height={26} />
          </span>
          <div>
            <h2>Set up your transport service</h2>
            <p>Manage the operators, services, routes and the timetables that generate trips.</p>
          </div>
        </div>
        <div className="setup-counts">
          <div>
            <strong>{config.operators.filter((o) => o.active).length}</strong>
            <span>Active operators</span>
          </div>
          <div>
            <strong>
              {config.boats.filter((b) => b.status === 'Active').length}
            </strong>
            <span>Available services</span>
          </div>
          <div>
            <strong>{config.routes.filter((r) => r.active).length}</strong>
            <span>Active routes</span>
          </div>
        </div>
      </div>
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(String(value))}
        className="setup-tabs"
      >
        <TabsList variant="line">
          <TabsTrigger value="fleet">Services &amp; operators</TabsTrigger>
          <TabsTrigger value="routes">Routes &amp; locations</TabsTrigger>
          <TabsTrigger value="templates">Timetables</TabsTrigger>
        </TabsList>
        <TabsContent value="templates">
          <div className="setup-panel">
            <div className="setup-panel-heading">
              <div>
                <h3>Imported Timetables</h3>
                <p>Upload the operator&#39;s yearly speedboat schedule (.xlsx). The file is previewed before anything is saved.</p>
              </div>
              <div className="form-actions">
                <label className="primary-button import-upload">
                  <Plus size={15} /> Import Timetable
                  <input type="file" accept=".xlsx" hidden onChange={handleImportFile} />
                </label>
              </div>
            </div>
            {importError && <p className="setup-import-error">{importError}</p>}
            {schedules.length ? (
              <div className="setup-row-list">
                {schedules.map((schedule) => (
                  <div className="setup-row" key={schedule.id}>
                    <div className="setup-row-copy">
                      <strong>{schedule.name}</strong>
                      <small>
                        {schedule.entries.length} operating days ·{' '}
                        {schedule.entries.reduce((total, entry) => total + entry.times.length, 0)} departures ·{' '}
                        {config.boats.find((boat) => boat.id === schedule.boatId)?.name ?? '—'}
                      </small>
                    </div>
                    <button
                      className="edit-button"
                      onClick={() => openGenerate(schedule)}
                    >
                      <Ship size={15} />
                      <span>Generate trips</span>
                    </button>
                    <button
                      className="edit-button"
                      onClick={() => openDelete(schedule)}
                    >
                      <Trash2 size={15} />
                      <span>Delete trips</span>
                    </button>
                    <button
                      className="setup-pencil"
                      aria-label={`Remove ${schedule.name}`}
                      onClick={() => void onSchedulesChange?.(schedules.filter((item) => item.id !== schedule.id))}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="setup-empty-note">No imported timetables yet. Import the operator&#39;s workbook to create the yearly timetable.</p>
            )}
          </div>
          {scheduleTemplates}
        </TabsContent>
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
          <div className="setup-columns">
            <section className="setup-column">
              <div className="setup-column-head">
                <div>
                  <h4>Operators</h4>
                  <span>{config.operators.length} configured</span>
                </div>
                <button className="primary-button setup-add-button" onClick={() => open('operator')}>
                  <Plus size={14} /> Add operator
                </button>
              </div>
              <div className="setup-row-list">
                {config.operators.map((o) => (
                  <div className="setup-row" key={o.id}>
                    <div className="setup-row-copy">
                      <strong>{o.name}</strong>
                      <small>{o.contact ? `${o.contact} · ` : ''}{o.phone || '—'} · {o.email || '—'}</small>
                    </div>
                    <span className={`setup-active${o.active ? '' : ' is-off'}`}>{o.active ? 'Active' : 'Inactive'}</span>
                    <Switch className="setup-switch" checked={o.active} onCheckedChange={() => void toggleOperator(o)} />
                    <button className="setup-pencil" aria-label={`Edit operator ${o.name}`} onClick={() => open('operator', o)}>
                      <Pencil size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
            <section className="setup-column">
              <div className="setup-column-head">
                <div>
                  <h4>Services</h4>
                  <span>{config.boats.length} configured</span>
                </div>
                <button className="primary-button setup-add-button" onClick={() => open('boat')}>
                  <Plus size={14} /> Add service
                </button>
              </div>
              <div className="setup-row-list">
                {config.boats.map((b) => (
                  <div className="setup-row" key={b.id}>
                    <div className="setup-row-copy">
                      <strong>{b.name}</strong>
                      <small>{serviceMeta(b)}</small>
                    </div>
                    <span className={`setup-active${b.status === 'Active' ? '' : ' is-off'}`}>{b.status}</span>
                    <Switch className="setup-switch" checked={b.status === 'Active'} onCheckedChange={() => void toggleBoat(b)} />
                    <button className="setup-pencil" aria-label={`Edit service ${b.name}`} onClick={() => open('boat', b)}>
                      <Pencil size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
          <p className="setup-column-note">Scheduled services appear in timetables and reserve seats. On-demand services such as taxis are entered directly on the guest booking. Capacity is the maximum passengers for one trip.</p>
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
      <Dialog open={deletingSchedule !== null} onOpenChange={(open) => { if (!open) setDeletingSchedule(null); }}>
        <DialogContent className="hotel-dialog setup-dialog">
          <DialogHeader>
            <DialogTitle>Delete generated trips</DialogTitle>
            <DialogDescription>
              Remove the departures generated from &quot;{deletingSchedule?.name}&quot; in the selected range. The imported timetable itself is kept.
            </DialogDescription>
          </DialogHeader>
          <div className="form-grid">
            <label>
              From
              <HotelDatePicker required value={deleteFrom} onChange={setDeleteFrom} ariaLabel="Delete from date" />
            </label>
            <label>
              Until
              <HotelDatePicker required min={deleteFrom} value={deleteUntil} onChange={setDeleteUntil} ariaLabel="Delete until date" />
            </label>
          </div>
          <div className="import-preview">
            <div>
              <strong>{deleteEntries.length} schedule entries</strong>
              <span>matching this range</span>
            </div>
          </div>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => setDeletingSchedule(null)}>Cancel</button>
            <button className="primary-button" type="button" onClick={confirmDeleteTrips}>Delete trips</button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={generateSchedule !== null} onOpenChange={(open) => { if (!open) setGenerateSchedule(null); }}>
        <DialogContent className="hotel-dialog setup-dialog">
          <DialogHeader>
            <DialogTitle>Generate trips</DialogTitle>
            <DialogDescription>
              Create departures from &quot;{generateSchedule?.name}&quot; between the selected dates. Existing departures are never duplicated.
            </DialogDescription>
          </DialogHeader>
          <div className="form-grid">
            <label>
              From
              <HotelDatePicker required value={generateFrom} onChange={setGenerateFrom} ariaLabel="Generate from date" />
            </label>
            <label>
              Until
              <HotelDatePicker required min={generateFrom} value={generateUntil} onChange={setGenerateUntil} ariaLabel="Generate until date" />
            </label>
          </div>
          <div className="import-preview">
            <div>
              <strong>{generateEntries.length} days</strong>
              <span>{generateEntries.reduce((total, entry) => total + entry.times.length, 0)} departures</span>
            </div>
          </div>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => setGenerateSchedule(null)}>Cancel</button>
            <button className="primary-button" type="button" onClick={generateTrips}>Generate trips</button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={importPreview !== null} onOpenChange={(open) => { if (!open) setImportPreview(null); }}>
        <DialogContent className="hotel-dialog setup-dialog">
          <DialogHeader>
            <DialogTitle>Import Timetable</DialogTitle>
            <DialogDescription>
              {importPreview
                ? `${importPreview.result.months.length} months · ${importPreview.result.dates} operating dates · ${importPreview.result.departures} departures`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="import-fields">
            <label>
              Service
              <Choice label="Imported schedule service" value={importBoatId} onChange={setImportBoatId} items={config.boats.map((boat) => ({ value: boat.id, label: `${boat.name} · ${boat.capacity} seats` }))} />
            </label>
            <label>
              &quot;To Mersing&quot; route
              <Choice label="To Mersing route" value={importMersingRoute} onChange={setImportMersingRoute} items={config.routes.map((route) => ({ value: route.id, label: `${route.origin} → ${route.destination}` }))} />
            </label>
            <label>
              &quot;To Rawa&quot; route
              <Choice label="To Rawa route" value={importRawaRoute} onChange={setImportRawaRoute} items={config.routes.map((route) => ({ value: route.id, label: `${route.origin} → ${route.destination}` }))} />
            </label>
          </div>
          <div className="import-preview">
            {importPreview?.result.months.map((month) => (
              <div key={month.sheet}>
                <strong>{month.sheet}</strong>
                <span>{month.days.length} days · {month.days.reduce((total, day) => total + day.toMersing.length + day.toRawa.length, 0)} departures</span>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={() => setImportPreview(null)}>Cancel</button>
            <button className="primary-button" type="button" onClick={saveImport}>Save schedule</button>
          </div>
        </DialogContent>
      </Dialog>
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
                          { value: 'Scheduled', label: 'Booked timetable' },
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
                    Booked services appear in the timetable and reserve seats.
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
