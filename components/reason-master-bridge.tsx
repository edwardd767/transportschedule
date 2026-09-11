'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, MoreVertical, Search } from 'lucide-react';
import type { HotelDepartment } from '@/lib/hotel-masters';
import type { TransportData } from '@/lib/use-transport-data';

type ReasonView = {
  index: number;
  code: string;
  description: string;
  modified: string;
};

type ReasonDraft = {
  code: string;
  description: string;
};

function decodeReason(raw: string, index: number): ReasonView {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const code = typeof parsed.c === 'string' ? parsed.c : typeof parsed.code === 'string' ? parsed.code : '';
      const description = typeof parsed.d === 'string' ? parsed.d : typeof parsed.description === 'string' ? parsed.description : '';
      const modified = typeof parsed.t === 'string' ? parsed.t : '';
      if (code.trim() && description.trim()) return { index, code: code.trim(), description: description.trim(), modified };
    }
  } catch {
    // Legacy reasons are plain strings.
  }
  return {
    index,
    code: `R${String(index + 1).padStart(3, '0')}`,
    description: raw.trim(),
    modified: '',
  };
}

function encodeReason(code: string, description: string) {
  return JSON.stringify({ c: code.trim().toUpperCase(), d: description.trim(), t: new Date().toISOString().slice(0, 10) });
}

function displayDate(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

export function ReasonMasterBridge({ store }: { store: TransportData }) {
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [menu, setMenu] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [reasonDraft, setReasonDraft] = useState<ReasonDraft>({ code: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const department = useMemo(
    () => store.state.hotelMasters.departments.find((item) => item.id === departmentId) ?? null,
    [departmentId, store.state.hotelMasters.departments],
  );

  const reasons = useMemo(
    () => (department?.reasons ?? []).map(decodeReason),
    [department?.reasons],
  );

  useEffect(() => {
    setWorkspace(document.querySelector<HTMLElement>('.workspace'));
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('.department-menu button');
      if (!button || button.textContent?.trim() !== 'Reason') return;
      const row = button.closest<HTMLElement>('.department-row');
      const departmentName = row?.querySelector('strong')?.textContent?.trim();
      if (!departmentName) return;
      const selected = store.state.hotelMasters.departments.find((item) => item.name === departmentName);
      if (!selected) return;
      event.preventDefault();
      event.stopPropagation();
      setDepartmentId(selected.id);
      setQuery('');
      setSearchOpen(false);
      setMenu(null);
      setDialogOpen(false);
      setError('');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [store.state.hotelMasters.departments]);

  useEffect(() => {
    if (!departmentId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return;
      if (dialogOpen) {
        setDialogOpen(false);
        setEditingIndex(null);
        setError('');
      } else {
        setDepartmentId(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [departmentId, dialogOpen, saving]);

  if (!workspace || !departmentId || !department) return null;

  const filtered = reasons.filter((item) =>
    `${item.code} ${item.description}`.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const openNew = () => {
    setEditingIndex(null);
    setReasonDraft({ code: '', description: '' });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (reason: ReasonView) => {
    setEditingIndex(reason.index);
    setReasonDraft({ code: reason.code, description: reason.description });
    setMenu(null);
    setError('');
    setDialogOpen(true);
  };

  const saveReason = async () => {
    if (saving) return;
    const code = reasonDraft.code.trim().toUpperCase();
    const description = reasonDraft.description.trim();
    if (!code || !description) {
      setError('Code and Description are required.');
      return;
    }
    if (code.length > 12) {
      setError('Code must be 12 characters or less.');
      return;
    }
    if (description.length > 50) {
      setError('Description must be 50 characters or less.');
      return;
    }
    if (reasons.some((item) => item.code.toUpperCase() === code && item.index !== editingIndex)) {
      setError('Reason Code already exists for this department.');
      return;
    }

    const encoded = encodeReason(code, description);
    if (encoded.length > 100) {
      setError('Reason is too long. Please shorten the Description.');
      return;
    }

    const nextReasons = [...department.reasons];
    if (editingIndex === null) nextReasons.push(encoded);
    else nextReasons[editingIndex] = encoded;

    const nextDepartments: HotelDepartment[] = store.state.hotelMasters.departments.map((item) =>
      item.id === department.id ? { ...item, reasons: nextReasons } : item,
    );

    setSaving(true);
    setError('');
    try {
      await store.run({ type: 'departmentSave', value: nextDepartments });
      setDialogOpen(false);
      setEditingIndex(null);
      setReasonDraft({ code: '', description: '' });
      setMenu(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save Reason.');
    } finally {
      setSaving(false);
    }
  };

  const neutralInputStyle = {
    border: 'none',
    borderBottom: '1px solid #999',
    outline: 'none',
    boxShadow: 'none',
  } as const;

  return createPortal(
    <section className="absolute inset-0 z-[56] flex min-h-0 flex-col bg-[#f4f4f4] p-3" aria-label="Reason Master">
      <div className="relative min-h-[72px] shrink-0 overflow-hidden bg-[radial-gradient(ellipse_at_82%_105%,#ffbd14_0_39%,transparent_39.5%),radial-gradient(ellipse_at_38%_-55%,#f57818_0_51%,transparent_51.5%),linear-gradient(110deg,#f89912,#ffa524_65%,#f67e1b)] px-3 pb-7 pt-2">
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => setDepartmentId(null)} disabled={saving} className="grid h-8 w-8 place-items-center rounded-[3px] bg-white text-[#e78300] shadow disabled:opacity-60" aria-label="Back">
            <ChevronLeft size={23} />
          </button>
          <div>
            <small className="block text-[10px] font-semibold text-white">HMS</small>
            <strong className="block text-[13px] text-[#111]">{store.state.hotelMasters.profile.hotelName || 'HOTEL PARADISE'}</strong>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between border-t border-white/50 px-3 py-1 text-[10px] text-[#151515]"><span>... / Hotel Settings / Department / Reason</span><span>Reason</span></div>
      </div>

      <div className="flex shrink-0 items-center justify-between bg-white px-3 py-2 shadow-sm">
        <div><strong className="text-[14px]">Reasons <span className="text-[#ff8a00]">({reasons.length})</span></strong><small className="ml-2 text-[#777]">{department.name}</small></div>
        <button type="button" aria-label="Search reasons" onClick={() => setSearchOpen((value) => !value)} className="border-0 bg-transparent p-1 text-[#222]"><Search size={21} /></button>
      </div>

      {searchOpen && (
        <label className="mx-2 mt-2 flex items-center gap-2 bg-white px-3 py-2 shadow-sm">
          <Search size={17} className="text-[#777]" />
          <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reason" className="min-w-0 flex-1 border-0 bg-transparent text-[13px] outline-none ring-0 focus:outline-none focus:ring-0" style={{ outline: 'none', boxShadow: 'none' }} />
        </label>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-1">
          {filtered.map((reason) => (
            <article key={`${reason.index}-${reason.code}`} className="relative flex min-h-[58px] items-center justify-between rounded-[3px] bg-white px-3 py-2 shadow-sm">
              <div className="min-w-0 text-[12px]">
                <div><strong>{reason.code}</strong><span> - {reason.description}</span></div>
                {reason.modified && <small className="mt-1 block text-[#555]">Last Modified on <b className="text-[#e78300]">{displayDate(reason.modified)}</b></small>}
              </div>
              <button type="button" aria-label={`Reason options for ${reason.code}`} onClick={() => setMenu(menu === reason.index ? null : reason.index)} className="border-0 bg-transparent p-1"><MoreVertical size={21} /></button>
              {menu === reason.index && <div className="absolute right-8 top-9 z-20 min-w-[100px] rounded bg-white py-1 shadow-lg"><button type="button" onClick={() => openEdit(reason)} className="w-full px-3 py-2 text-left text-[12px] hover:bg-[#f5f5f5]">Edit</button></div>}
            </article>
          ))}
          {!filtered.length && <div className="rounded bg-white p-8 text-center text-[13px] text-[#777]">No reasons found.</div>}
        </div>
      </div>

      <button type="button" aria-label="Add Reason" onClick={openNew} className="absolute bottom-6 right-6 grid h-14 w-14 place-items-center rounded-full border-0 bg-[#b86b00] text-[30px] font-light text-white shadow-lg">+</button>

      {dialogOpen && (
        <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={editingIndex === null ? 'Add Reason' : 'Edit Reason'}>
          <div className="w-full max-w-[600px] overflow-hidden rounded-[3px] bg-white shadow-2xl">
            <div className="bg-[#fff6eb] px-3 py-3 text-[17px] font-semibold text-[#ff8a00]">{editingIndex === null ? 'Add Reason' : 'Edit Reason'}</div>
            <div className="px-3 pb-2 pt-6">
              <label className="block text-[13px] text-[#777]">Code *
                <input autoFocus disabled={editingIndex !== null} value={reasonDraft.code} maxLength={12} onChange={(event) => setReasonDraft((current) => ({ ...current, code: event.target.value.toUpperCase() }))} className="mt-1 w-full bg-transparent px-0 pb-2 text-[17px] text-[#333] outline-none ring-0 focus:outline-none focus:ring-0 disabled:text-[#777]" style={neutralInputStyle} />
              </label>
              <label className="mt-7 block text-[13px] text-[#777]">Description *
                <input value={reasonDraft.description} maxLength={50} onChange={(event) => setReasonDraft((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full bg-transparent px-0 pb-2 text-[17px] text-[#333] outline-none ring-0 focus:outline-none focus:ring-0" style={neutralInputStyle} />
              </label>
              {error && <p className="mt-2 text-[12px] text-red-600" role="alert">{error}</p>}
              <div className="mt-6 flex justify-end gap-2 pb-1">
                <button type="button" disabled={saving} onClick={() => { setDialogOpen(false); setEditingIndex(null); setError(''); }} className="rounded-[4px] bg-[#ff9400] px-4 py-2 text-[13px] font-semibold text-white shadow disabled:opacity-60">Cancel</button>
                <button type="button" disabled={saving || !reasonDraft.code.trim() || !reasonDraft.description.trim()} onClick={() => void saveReason()} className="rounded-[4px] bg-[#ff9400] px-4 py-2 text-[13px] font-semibold text-white shadow disabled:bg-[#ddd] disabled:text-white">{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>,
    workspace,
  );
}
