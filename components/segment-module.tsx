'use client';
import { Mic, MoreVertical, Plus, Search, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { initialSegments, type HotelSegment } from '@/lib/hotel-masters';
import type { Booking } from '@/lib/bookings';
import { ConfirmDialog } from '@/components/confirm-dialog';

const HOTELX_MEDIA = 'https://hms1.hotelx.asia/static/media';

const STAY_VIEW_ICONS = [
  { id: 'CTrip', src: `${HOTELX_MEDIA}/ctrip.e48d1d1b.svg` },
  { id: 'Booking', src: `${HOTELX_MEDIA}/booking.42625cb6.svg` },
  { id: 'Agoda', src: `${HOTELX_MEDIA}/agoda.82065b83.svg` },
  { id: 'Traveloka', src: `${HOTELX_MEDIA}/traveloka.6c4c5e1d.svg` },
  { id: 'Expedia', src: `${HOTELX_MEDIA}/Expedia.3c18d183.svg` },
  { id: 'HotelWorld', src: `${HOTELX_MEDIA}/HotelWorld.264caac6.svg` },
  { id: 'TripAdvisor', src: `${HOTELX_MEDIA}/tripadvisor.d17439c9.svg` },
  { id: 'HotelBeds', src: `${HOTELX_MEDIA}/HotelBeds.02047415.svg` },
];

function formatPostedDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return value;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function SegmentModule({ segments, bookings = [], onChange, onBack: _onBack }: { segments: HotelSegment[]; bookings?: Booking[]; onChange: (value: HotelSegment[]) => Promise<void>; onBack: () => void }) {
  const source = segments.length ? segments : initialSegments;
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inUse = (item: HotelSegment) => bookings.some((booking) => (booking.segment || '').trim().toLowerCase() === item.description.trim().toLowerCase());
  const [draft, setDraft] = useState(source);
  const shown = draft.filter((item) => item.description.toLowerCase().includes(query.trim().toLowerCase()));
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<HotelSegment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [sequence, setSequence] = useState(1);
  const [icon, setIcon] = useState('');
  const [active, setActive] = useState(true);
  const [confirm, setConfirm] = useState<{ title: string; message: string; confirmLabel: string; action: () => void | Promise<void> } | null>(null);

  useEffect(() => setDraft(segments.length ? segments : initialSegments), [segments]);

  useEffect(() => {
    if (!menu) return;
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('.segment-menu') || target?.closest('[aria-label="Segment options"]')) return;
      setMenu(null);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [menu]);

  const open = (item?: HotelSegment) => {
    setMenu(null);
    setEditing(item || null);
    setDialogOpen(true);
    setDescription(item?.description || '');
    setSequence(item?.displaySequence || draft.length + 1);
    setIcon(item?.icon || STAY_VIEW_ICONS[0].id);
    setActive(item ? item.active : true);
  };

  const save = async () => {
    if (!description.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const value = editing
      ? draft.map((item) => item.id === editing.id ? { ...item, description: description.trim(), displaySequence: sequence, icon, updatedAt: today } : item)
      : [...draft, { id: crypto.randomUUID(), description: description.trim(), displaySequence: sequence, icon, active, updatedAt: today }];
    await onChange(value);
    setDraft(value);
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <section className="master-page segment-page">
      {searchOpen ? (
        <div className="segment-search-row">
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search here.."
            aria-label="Search segments"
          />
          <button type="button" aria-label="Voice search"><Mic size={18} /></button>
          <button type="button" aria-label="Close search" onClick={() => { setQuery(''); setSearchOpen(false); }}><X size={18} /></button>
        </div>
      ) : (
        <div className="master-list-head segment-list-head">
          <h1>Segments (<em>{shown.length}</em>)</h1>
          <button type="button" className="segment-search-button" aria-label="Search segments" onClick={() => setSearchOpen(true)}><Search size={21} /></button>
        </div>
      )}
      <div className="segment-list">
        {shown.map((item) => (
          <article className={`segment-row${item.active ? '' : ' is-inactive'}`} key={item.id}>
            <div>
              <strong>{item.description}</strong>
              <small>Last posted on {formatPostedDate(item.updatedAt)}</small>
            </div>
            <button onClick={() => setMenu(menu === item.id ? null : item.id)} aria-label="Segment options"><MoreVertical size={21} /></button>
            {menu === item.id && (
              <div className="segment-menu">
                <button onClick={() => open(item)}>Edit</button>
                <button onClick={() => { setMenu(null); setConfirm({ title: `${item.active ? 'Inactive' : 'Active'} ${item.description}`, message: `Do you want to set ${item.description} to ${item.active ? 'inactive' : 'active'} ?`, confirmLabel: item.active ? 'Inactive' : 'Active', action: async () => { const value = draft.map((x) => x.id === item.id ? { ...x, active: !x.active } : x); await onChange(value); setDraft(value); } }); }}>{item.active ? 'Inactive' : 'Active'}</button>
                <button className="segment-menu-delete" disabled={inUse(item)} title={inUse(item) ? 'Cannot delete: this segment is used by existing bookings.' : 'Delete'} onClick={() => { setMenu(null); setConfirm({ title: `Delete ${item.description}`, message: `Do you want to delete ${item.description} ?`, confirmLabel: 'Delete', action: async () => { const value = draft.filter((x) => x.id !== item.id); await onChange(value); setDraft(value); } }); }}>Delete</button>
              </div>
            )}
          </article>
        ))}
      </div>
      <button className="segment-add" onClick={() => open()} aria-label="Add segment"><Plus size={24} /></button>
      {confirm && <ConfirmDialog title={confirm.title} message={confirm.message} confirmLabel={confirm.confirmLabel} onCancel={() => setConfirm(null)} onConfirm={() => { const run = confirm.action; setConfirm(null); void run(); }} />}
      {dialogOpen && (
        <div className="billing-instruction-overlay">
          <div className="segment-dialog">
            <div className="segment-dialog-head"><strong>{editing ? 'Edit Segment' : 'Add Segment'}</strong></div>
            <div className="segment-dialog-body">
              <label className="segment-field"><span>Description *</span><input placeholder=" " value={description} onChange={(event) => setDescription(event.target.value)} /></label>
              <label className="segment-field"><span>Display Sequence</span><input placeholder=" " type="number" min="1" value={sequence} onChange={(event) => setSequence(Number(event.target.value))} /></label>
              <div className="segment-icon-field">
                <span className="segment-icon-title">Stay View Icon Mapping</span>
                <div className="segment-icon-grid">
                  {STAY_VIEW_ICONS.map((option) => (
                    <label className="segment-icon-option" key={option.id} data-label={option.id}>
                      <input type="radio" name="segment-icon" checked={icon === option.id} onChange={() => setIcon(option.id)} />
                      <svg className="segment-icon-radio" viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden="true" focusable="false">
                        {icon === option.id
                          ? <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zm0-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                          : <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />}
                      </svg>
                      <img src={option.src} alt={option.id} width={25} height={25} />
                    </label>
                  ))}
                </div>
              </div>
              {!editing && (
                <div className="segment-active-row">
                  <span>Active</span>
                  <button type="button" className={`segment-active-switch ${active ? 'is-on' : ''}`} aria-label="Active" aria-pressed={active} onClick={() => setActive((current) => !current)}><i /></button>
                </div>
              )}
            </div>
            <div className="segment-dialog-actions">
              <button type="button" className="segment-cancel" onClick={() => { setDialogOpen(false); setEditing(null); }}>Cancel</button>
              <button type="button" className="segment-save" disabled={!description.trim()} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
