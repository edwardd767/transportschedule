'use client';
import { MoreVertical, Plus, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { initialSegments, type HotelSegment } from '@/lib/hotel-masters';
import type { Booking } from '@/lib/bookings';
import { ConfirmDialog } from '@/components/confirm-dialog';

function formatPostedDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return value;
  const [, year, month, day] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day));
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function SegmentModule({ segments, bookings = [], onChange, onBack: _onBack }: { segments: HotelSegment[]; bookings?: Booking[]; onChange: (value: HotelSegment[]) => Promise<void>; onBack: () => void }) {
  const source = segments.length ? segments : initialSegments;
  const inUse = (item: HotelSegment) => bookings.some((booking) => (booking.segment || '').trim().toLowerCase() === item.description.trim().toLowerCase());
  const [draft, setDraft] = useState(source);
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<HotelSegment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [sequence, setSequence] = useState(1);
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
  };

  const save = async () => {
    if (!description.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    const value = editing
      ? draft.map((item) => item.id === editing.id ? { ...item, description: description.trim(), displaySequence: sequence, updatedAt: today } : item)
      : [...draft, { id: crypto.randomUUID(), description: description.trim(), displaySequence: sequence, icon: '', active: true, updatedAt: today }];
    await onChange(value);
    setDraft(value);
    setDialogOpen(false);
    setEditing(null);
  };

  return (
    <section className="master-page segment-page">
      <div className="master-list-head segment-list-head">
        <h1>Segments <em>({draft.length})</em></h1>
        <Search size={21} />
      </div>
      <div className="segment-list">
        {draft.map((item) => (
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
          <div className="billing-instruction-card segment-dialog">
            <h2>{editing ? 'Edit Segment' : 'Add Segment'}</h2>
            <label>Description *<input value={description} onChange={(event) => setDescription(event.target.value)} /></label>
            <label>Display Sequence<input type="number" min="1" value={sequence} onChange={(event) => setSequence(Number(event.target.value))} /></label>
            <div className="billing-instruction-actions">
              <button className="secondary-button" onClick={() => { setDialogOpen(false); setEditing(null); }}>Cancel</button>
              <button className="primary-button" disabled={!description.trim()} onClick={save}>Save</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
