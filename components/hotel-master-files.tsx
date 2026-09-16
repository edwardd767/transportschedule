'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BedDouble,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  FileImage,
  MapPin,
  Mic,
  MoreVertical,
  Pencil,
  Plus,
  Save,
  Search,
  Upload,
  X,
} from 'lucide-react';
import type {
  HotelLocation,
  HotelMasters,
  HotelRoom,
  HotelRoomType,
} from '@/lib/hotel-masters';
import { platformAmenities } from '@/lib/hotel-masters';

export type HotelMasterKind = 'location' | 'roomType' | 'room';

type Props = {
  kind: HotelMasterKind;
  masters: HotelMasters;
  onSaveLocation: (value: HotelLocation) => Promise<void>;
  onSaveRoomType: (value: HotelRoomType) => Promise<void>;
  onReorderRoomTypes: (value: HotelRoomType[]) => Promise<void>;
  onSaveRoom: (value: HotelRoom) => Promise<void>;
  onBack: () => void;
  onNotice: (message: string) => void;
};

function SectionTitle({
  title,
  detail,
  onAdd,
}: {
  title: string;
  detail: string;
  onAdd: () => void;
}) {
  return (
    <div className="master-list-head">
      <div>
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
      <button className="primary-button" type="button" onClick={onAdd}>
        <Plus size={18} /> Add
      </button>
    </div>
  );
}

function DetailHeader({
  title,
  editing,
  onEdit,
  onBack,
}: {
  title: string;
  editing: boolean;
  onEdit: () => void;
  onBack: () => void;
}) {
  return (
    <div className="master-detail-toolbar">
      <strong>{title}</strong>
      {!editing && (
        <button type="button" className="master-edit" onClick={onEdit}>
          <Pencil size={16} /> Edit
        </button>
      )}
    </div>
  );
}

function Field({
  label,
  required,
  children,
  wide = false,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <label className={`master-field${wide ? ' master-field-wide' : ''}`}>
      <span>
        {label}
        {required ? ' *' : ''}
      </span>
      {children}
    </label>
  );
}

function SaveBar({
  editing,
  saving,
  onSave,
}: {
  editing: boolean;
  saving: boolean;
  onSave: () => void;
}) {
  return (
    <div className="master-page-actions master-file-actions">
      <button
        type="button"
        className="primary-button"
        disabled={!editing || saving}
        onClick={onSave}
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  );
}

function LocationMaster({
  masters,
  onSave,
  onBack,
  onNotice,
}: {
  masters: HotelMasters;
  onSave: (value: HotelLocation) => Promise<void>;
  onBack: () => void;
  onNotice: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const source = masters.locations.find((item) => item.code === selected);
  const [draft, setDraft] = useState<HotelLocation>({
    code: '',
    description: '',
    floorPlanAttachment: '',
    active: true,
  });

  function open(item: HotelLocation) {
    setSelected(item.code);
    setAdding(false);
    setEditing(false);
    setDraft({ ...item });
    setError('');
  }
  function add() {
    setSelected('__new__');
    setAdding(true);
    setEditing(true);
    setDraft({ code: '', description: '', floorPlanAttachment: '', active: true });
    setError('');
  }
  async function save() {
    try {
      setSaving(true);
      setError('');
      await onSave(draft);
      setSelected(draft.code.trim().toUpperCase());
      setAdding(false);
      setEditing(false);
      onNotice('Location master saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!selected) {
    return (
      <section className="master-page">
        <SectionTitle
          title="Location"
          detail="Room Location Setup. Locations are used by the Room master file."
          onAdd={add}
        />
        <div className="master-list">
          <div className="master-list-row master-list-header location-row">
            <span>Code</span><span>Description</span><span>Floor Plan</span><span>Status</span><span />
          </div>
          {masters.locations.map((item) => (
            <button key={item.code} className="master-list-row location-row" onClick={() => open(item)}>
              <strong>{item.code}</strong>
              <span>{item.description}</span>
              <span>{item.floorPlanAttachment || '—'}</span>
              <span className={item.active ? 'master-status active' : 'master-status'}>{item.active ? 'Active' : 'Inactive'}</span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
        <button className="secondary-button master-page-back" onClick={onBack}>Back to Hotel Settings</button>
      </section>
    );
  }

  return (
    <section className="master-page master-detail-page">
      <DetailHeader
        title={adding ? 'New Location' : source?.code ?? draft.code}
        editing={editing}
        onEdit={() => setEditing(true)}
        onBack={() => setSelected(null)}
      />
      <div className="master-detail-card">
        <div className="master-section-label">Location</div>
        <div className="master-form-grid">
          <Field label="Code" required>
            <input
              value={draft.code}
              readOnly={!editing || !adding}
              onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })}
            />
          </Field>
          <span />
          <Field label="Description" wide>
            <input
              value={draft.description}
              readOnly={!editing}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>
          <div className="master-subtitle master-field-wide">Public Door Mapping</div>
          <div className="master-upload master-field-wide">
            <div>
              <strong>Upload Floor Plan attachment</strong>
              <small>{draft.floorPlanAttachment || 'No attachment selected'}</small>
            </div>
            {editing ? (
              <label className="master-upload-button" title="Choose floor plan image">
                <Upload size={24} />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setDraft({ ...draft, floorPlanAttachment: file.name });
                  }}
                />
              </label>
            ) : (
              <FileImage size={25} />
            )}
          </div>
          {draft.floorPlanAttachment && (
            <div className="master-attachment master-field-wide">
              <FileImage size={34} />
              <span>{draft.floorPlanAttachment}</span>
            </div>
          )}
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
      <SaveBar editing={editing} saving={saving} onSave={save} />
    </section>
  );
}

function RoomTypeMaster({
  masters,
  onSave,
  onReorder,
  onBack,
  onNotice,
}: {
  masters: HotelMasters;
  onSave: (value: HotelRoomType) => Promise<void>;
  onReorder: (value: HotelRoomType[]) => Promise<void>;
  onBack: () => void;
  onNotice: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menu, setMenu] = useState<string | null>(null);
  const [dragCode, setDragCode] = useState<string | null>(null);
  const currency = masters.profile.currencyCode || 'MYR';
  const visible = masters.roomTypes.filter((item) => `${item.code} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()));
  const source = masters.roomTypes.find((item) => item.code === selected);

  useEffect(() => {
    if (!menu) return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.room-type-menu') || target?.closest('.room-type-menu-trigger')) return;
      setMenu(null);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [menu]);

  useEffect(() => {
    const onHeaderBack = (event: Event) => {
      if (!selected) return;
      event.preventDefault();
      setSelected(null);
      setEditing(false);
    };
    window.addEventListener('hotelx-master-detail-back', onHeaderBack);
    return () => window.removeEventListener('hotelx-master-detail-back', onHeaderBack);
  }, [selected]);

  async function reorder(targetIndex: number) {
    if (!dragCode) return;
    const from = masters.roomTypes.findIndex((item) => item.code === dragCode);
    setDragCode(null);
    if (from < 0 || from === targetIndex) return;
    const next = [...masters.roomTypes];
    const [moved] = next.splice(from, 1);
    next.splice(targetIndex, 0, moved);
    await onReorder(next);
  }
  const [draft, setDraft] = useState<HotelRoomType>({
    code: '', description: '', propertyType: 'Room', measureType: 'Square Metre',
    roomSize: 0, maxGuest: 1, houseLimit: 1, housekeepingPoints: 1, totalRoom: 0, active: true,
  });
  const actualTotal = useMemo(
    () => masters.rooms.filter((room) => room.roomTypeCode === draft.code).length,
    [masters.rooms, draft.code],
  );

  function open(item: HotelRoomType) {
    setSelected(item.code);
    setAdding(false);
    setEditing(false);
    setDraft({ ...item });
    setError('');
  }
  function add() {
    setSelected('__new__');
    setAdding(true);
    setEditing(true);
    setDraft({ code: '', description: '', propertyType: 'Room', measureType: 'Square Metre', roomSize: 0, maxGuest: 1, houseLimit: 1, housekeepingPoints: 1, totalRoom: 0, active: true });
    setError('');
  }
  async function save() {
    try {
      setSaving(true);
      setError('');
      await onSave({ ...draft, totalRoom: adding ? 0 : actualTotal });
      setSelected(draft.code.trim().toUpperCase());
      setAdding(false);
      setEditing(false);
      onNotice('Room Type master saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!selected) {
    return (
      <section className="master-page room-type-page">
        {searchOpen ? (
          <div className="room-type-search">
            <input autoFocus placeholder="Search here.." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search room types" />
            <button type="button" aria-label="Voice search"><Mic size={18} /></button>
            <button type="button" aria-label="Close search" onClick={() => { setQuery(''); setSearchOpen(false); }}><X size={18} /></button>
          </div>
        ) : (
          <div className="room-type-list-head">
            <h1>Room Type (<em>{visible.length}</em>)</h1>
            <button type="button" className="room-type-search-button" aria-label="Search room types" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
          </div>
        )}
        <div className="room-type-hint">Drag and drop the room type to re-sequence.</div>
        <div className="room-type-list">
          {visible.map((item, index) => (
            <article
              className="room-type-row"
              key={item.code}
              draggable
              onClick={() => open(item)}
              onDragStart={(event) => {
                setDragCode(item.code);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', item.code);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(event) => {
                event.preventDefault();
                void reorder(index);
              }}
            >
              <div>
                <strong>{item.code} | {item.description}</strong>
                <small>
                  Room(s): {masters.rooms.filter((room) => room.roomTypeCode === item.code).length} | House Limit: {currency}{' '}
                  {Number(item.houseLimit ?? 0).toFixed(2)}
                </small>
              </div>
              <button type="button" className="room-type-menu-trigger" aria-label="Room type options" onClick={(event) => { event.stopPropagation(); setMenu(menu === item.code ? null : item.code); }}><MoreVertical size={21} /></button>
              {menu === item.code && (
                <div className="room-type-menu" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => { setMenu(null); setSelected(item.code); setAdding(false); setEditing(true); setDraft({ ...item }); setError(''); }}>Edit</button>
                  <button
                    disabled={masters.rooms.some((room) => room.roomTypeCode === item.code)}
                    title={masters.rooms.some((room) => room.roomTypeCode === item.code) ? 'Cannot delete a room type that has rooms.' : undefined}
                    onClick={() => { setMenu(null); onNotice('Deleting a room type is not connected yet.'); }}
                  >
                    Delete
                  </button>
                </div>
              )}
            </article>
          ))}
          {!visible.length && <p className="room-type-empty">No Record Found</p>}
        </div>
        <button type="button" className="room-type-add" aria-label="Add room type" onClick={add}><Plus size={24} /></button>
        <button className="secondary-button master-page-back" onClick={onBack}>Back to Hotel Settings</button>
      </section>
    );
  }

  return (
    <section className="master-page master-detail-page">
      <DetailHeader title={adding ? 'New Room Type' : source?.code ?? draft.code} editing={editing} onEdit={() => setEditing(true)} onBack={() => setSelected(null)} />
      <div className="master-detail-card">
        <div className="master-section-label">Room Type</div>
        <div className="master-form-grid">
          <Field label="Code" required><input value={draft.code} readOnly={!editing || !adding} onChange={(e) => setDraft({ ...draft, code: e.target.value.toUpperCase() })} /></Field>
          <Field label="Total Room"><input value={adding ? 0 : actualTotal} readOnly /></Field>
          <Field label="Description" wide><input value={draft.description} readOnly={!editing} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <Field label="Property Type">{editing ? <select value={draft.propertyType} onChange={(e) => setDraft({ ...draft, propertyType: e.target.value })}><option>Room</option><option>Villa</option><option>Suite</option></select> : <input value={draft.propertyType} readOnly />}</Field>
          <Field label="Measure Type">{editing ? <select value={draft.measureType} onChange={(e) => setDraft({ ...draft, measureType: e.target.value })}><option>Square Metre</option><option>Square Feet</option></select> : <input value={draft.measureType} readOnly />}</Field>
          <Field label="Room Size"><input type="number" min="0" value={draft.roomSize} readOnly={!editing} onChange={(e) => setDraft({ ...draft, roomSize: Number(e.target.value) })} /></Field>
          <Field label="Max Guest" required><input type="number" min="1" value={draft.maxGuest} readOnly={!editing} onChange={(e) => setDraft({ ...draft, maxGuest: Number(e.target.value) })} /></Field>
          <Field label="House Limit"><input type="number" min="0" value={draft.houseLimit} readOnly={!editing} onChange={(e) => setDraft({ ...draft, houseLimit: Number(e.target.value) })} /></Field>
          <Field label="Housekeeping Points"><input type="number" min="0" value={draft.housekeepingPoints} readOnly={!editing} onChange={(e) => setDraft({ ...draft, housekeepingPoints: Number(e.target.value) })} /></Field>
          <Field label="Overbooking Allowed"><input type="number" min="0" value={draft.overbookingAllowed ?? 0} readOnly={!editing} onChange={(e) => setDraft({ ...draft, overbookingAllowed: Number(e.target.value) })} /></Field>
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>

      <div className="master-detail-card">
        <div className="master-section-label">Features/ Amenities</div>
        <div className="master-amenities">
          {platformAmenities.map((amenity) => (
            <label key={amenity}>
              <input
                type="checkbox"
                checked={(draft.amenities ?? []).includes(amenity)}
                disabled={!editing}
                onChange={(e) => setDraft({ ...draft, amenities: e.target.checked ? [...(draft.amenities ?? []), amenity] : (draft.amenities ?? []).filter((item) => item !== amenity) })}
              />
              {amenity}
            </label>
          ))}
        </div>
      </div>

      <div className="master-detail-card">
        <div className="master-section-label">Photos</div>
        <div className="master-photos">
          {(draft.photos ?? []).map((photo) => (
            <span className="master-photo" key={photo}>
              {photo}
              {editing && <button type="button" aria-label={`Remove ${photo}`} onClick={() => setDraft({ ...draft, photos: (draft.photos ?? []).filter((item) => item !== photo) })}>×</button>}
            </span>
          ))}
          {editing && (
            <label className="master-photo-upload">
              <input type="file" accept="image/*" multiple onChange={(e) => setDraft({ ...draft, photos: [...(draft.photos ?? []), ...Array.from(e.target.files ?? []).map((file) => file.name)] })} />
              Upload Photos
            </label>
          )}
          {!editing && !(draft.photos ?? []).length && <span className="master-photos-empty">No photo uploaded.</span>}
        </div>
      </div>
      <SaveBar editing={editing} saving={saving} onSave={save} />
    </section>
  );
}

function RoomMaster({
  masters,
  onSave,
  onBack,
  onNotice,
}: {
  masters: HotelMasters;
  onSave: (value: HotelRoom) => Promise<void>;
  onBack: () => void;
  onNotice: (message: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const source = masters.rooms.find((item) => item.roomNo === selected);
  const defaultType = masters.roomTypes[0];
  const [draft, setDraft] = useState<HotelRoom>({
    roomNo: '', roomTypeCode: defaultType?.code ?? '', description: '', locationCode: masters.locations[0]?.code ?? '',
    maxGuest: defaultType?.maxGuest ?? 1, roomSize: defaultType?.roomSize ?? 0, displaySequence: 1, keycardRoomMapping: '', active: true,
  });

  function open(item: HotelRoom) {
    setSelected(item.roomNo);
    setAdding(false);
    setEditing(false);
    setDraft({ ...item });
    setError('');
  }
  function add() {
    const type = masters.roomTypes.find((item) => item.active) ?? masters.roomTypes[0];
    setSelected('__new__');
    setAdding(true);
    setEditing(true);
    setDraft({ roomNo: '', roomTypeCode: type?.code ?? '', description: '', locationCode: masters.locations.find((item) => item.active)?.code ?? '', maxGuest: type?.maxGuest ?? 1, roomSize: type?.roomSize ?? 0, displaySequence: masters.rooms.length + 1, keycardRoomMapping: '', active: true });
    setError('');
  }
  function changeType(code: string) {
    const type = masters.roomTypes.find((item) => item.code === code);
    setDraft({ ...draft, roomTypeCode: code, maxGuest: type?.maxGuest ?? draft.maxGuest, roomSize: type?.roomSize ?? draft.roomSize });
  }
  async function save() {
    try {
      setSaving(true);
      setError('');
      await onSave(draft);
      setSelected(draft.roomNo.trim().toUpperCase());
      setAdding(false);
      setEditing(false);
      onNotice('Room master saved.');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!selected) {
    return (
      <section className="master-page">
        <SectionTitle title="Room" detail="Guest Room Setup. Rooms reference the Location and Room Type master files." onAdd={add} />
        <div className="master-list master-room-list">
          <div className="master-list-row master-list-header room-row"><span>Room No</span><span>Room Type</span><span>Description</span><span>Location</span><span>Max Guest</span><span>Room Size</span><span /></div>
          {masters.rooms.map((item) => (
            <button key={item.roomNo} className="master-list-row room-row" onClick={() => open(item)}>
              <strong>{item.roomNo}</strong><span>{item.roomTypeCode}</span><span>{item.description}</span><span>{item.locationCode}</span><span>{item.maxGuest}</span><span>{item.roomSize}</span><ChevronRight size={18} />
            </button>
          ))}
        </div>
        <button className="secondary-button master-page-back" onClick={onBack}>Back to Hotel Settings</button>
      </section>
    );
  }

  return (
    <section className="master-page master-detail-page">
      <DetailHeader title={adding ? 'New Room' : source?.roomNo ?? draft.roomNo} editing={editing} onEdit={() => setEditing(true)} onBack={() => setSelected(null)} />
      <div className="master-detail-card">
        <div className="master-section-label">Room</div>
        <div className="master-form-grid">
          <Field label="Room No" required><input value={draft.roomNo} readOnly={!editing || !adding} onChange={(e) => setDraft({ ...draft, roomNo: e.target.value.toUpperCase() })} /></Field>
          <Field label="Room Type">{editing ? <select value={draft.roomTypeCode} onChange={(e) => changeType(e.target.value)}>{masters.roomTypes.filter((item) => item.active).map((item) => <option key={item.code} value={item.code}>{item.code} - {item.description}</option>)}</select> : <input value={draft.roomTypeCode} readOnly />}</Field>
          <Field label="Description" wide><input value={draft.description} readOnly={!editing} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></Field>
          <Field label="Location" required wide>{editing ? <select value={draft.locationCode} onChange={(e) => setDraft({ ...draft, locationCode: e.target.value })}>{masters.locations.filter((item) => item.active).map((item) => <option key={item.code} value={item.code}>{item.description}</option>)}</select> : <input value={masters.locations.find((item) => item.code === draft.locationCode)?.description ?? draft.locationCode} readOnly />}</Field>
          <Field label="Max Guest"><input value={draft.maxGuest} readOnly /></Field>
          <Field label="Room Size"><input value={draft.roomSize} readOnly /></Field>
          <Field label="Display Sequence"><input type="number" min="1" value={draft.displaySequence} readOnly={!editing} onChange={(e) => setDraft({ ...draft, displaySequence: Number(e.target.value) })} /></Field>
          <Field label="Keycard Room Mapping"><input value={draft.keycardRoomMapping} readOnly={!editing} onChange={(e) => setDraft({ ...draft, keycardRoomMapping: e.target.value })} /></Field>
        </div>
        {error && <p className="form-error">{error}</p>}
      </div>
      <SaveBar editing={editing} saving={saving} onSave={save} />
    </section>
  );
}

export function HotelMasterFiles(props: Props) {
  if (props.kind === 'location') {
    return <LocationMaster masters={props.masters} onSave={props.onSaveLocation} onBack={props.onBack} onNotice={props.onNotice} />;
  }
  if (props.kind === 'roomType') {
    return <RoomTypeMaster masters={props.masters} onSave={props.onSaveRoomType} onReorder={props.onReorderRoomTypes} onBack={props.onBack} onNotice={props.onNotice} />;
  }
  return <RoomMaster masters={props.masters} onSave={props.onSaveRoom} onBack={props.onBack} onNotice={props.onNotice} />;
}
