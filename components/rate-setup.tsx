
'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Globe2,
  Info,
  MoreVertical,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import type { RateSetupData, RateValidityItem } from '@/lib/rate-setup-data';

export type RateSetupSection =
  | 'season-setup'
  | 'season-calendar'
  | 'rate-element'
  | 'rate-type'
  | 'rate-setup';

type Season = {
  id: string;
  name: string;
  color: string;
  active: boolean;
};

type RateElementItem = {
  id: string;
  name: string;
  basis: string;
  postingRhythm: 'Daily' | 'First Night' | 'Last Night';
  min: number;
  max: number;
  amount: number;
  active: boolean;
};

type RateTypeItem = {
  id: string;
  name: string;
  active: boolean;
};

type RatePlanItem = {
  id: string;
  code: string;
  description: string;
  updated: string;
  active: boolean;
  web?: boolean;
};

const initialSeasons: Season[] = [
  { id: 'non-peak', name: 'Non Peak', color: '#25ef1a', active: true },
  { id: 'peak', name: 'Peak', color: '#ed0000', active: true },
  { id: 'super-peak', name: 'Super Peak', color: '#2341dc', active: true },
  { id: 'public-holidays', name: 'Public Holidays', color: '#2bb3a6', active: true },
];

const rateElementSeed: RateElementItem[] = [
  ['Banquet Drink', 'Per Person', 1, 4, 2],
  ['Banquet Food', 'Per Person', 1, 2, 10],
  ['BBQ Dinner 2025', 'Per Person', 1, 3, 60],
  ['BBQ Dinner baru', 'Per Person', 1, 3, 60],
  ['Breakfast (Adult)', 'Per Person', 1, 2, 20],
  ['Breakfast Package', 'Per Person', 1, 4, 20],
  ['Breakfast Package Child', 'Per Person', 1, 4, 15],
  ['Breakfast Package Infant', 'Per Person', 0, 2, 0],
  ['Extra Bed', 'Per Room', 1, 1, 80],
  ['Extra Breakfast', 'Per Person', 1, 4, 25],
  ['Airport Transfer', 'Per Trip', 1, 6, 120],
  ['Welcome Drink', 'Per Person', 1, 4, 8],
  ['Late Checkout', 'Per Room', 1, 1, 100],
  ['Early Check-in', 'Per Room', 1, 1, 100],
  ['Dinner Adult', 'Per Person', 1, 4, 55],
  ['Dinner Child', 'Per Person', 1, 4, 30],
  ['Lunch Adult', 'Per Person', 1, 4, 45],
  ['Lunch Child', 'Per Person', 1, 4, 25],
  ['Spa Voucher', 'Per Person', 1, 2, 50],
  ['Laundry Credit', 'Per Room', 1, 1, 30],
  ['Minibar Credit', 'Per Room', 1, 1, 25],
  ['Parking', 'Per Vehicle', 1, 2, 10],
  ['Tourism Package', 'Per Person', 1, 4, 35],
  ['Romantic Setup', 'Per Room', 1, 1, 150],
  ['Anniversary Cake', 'Per Room', 1, 1, 80],
].map((item, index) => ({
  id: `element-${index + 1}`,
  name: String(item[0]),
  basis: String(item[1]),
  postingRhythm: 'Daily',
  min: Number(item[2]),
  max: Number(item[3]),
  amount: Number(item[4]),
  active: true,
}));

const rateTypeNames = [
  'BAR',
  'COMP',
  'Corp1',
  'Monthly - Trillion',
  'BEST AVAILABLE RATE',
  'Corporate',
  'Government',
  'Citto Inn',
  'House Use',
  'Long Stay',
  'Member Rate',
  'Online Travel Agent',
  'Package Rate',
  'Promotion',
  'Rack Rate',
  'Staff Rate',
  'Travel Agent',
  'Walk In',
  'Weekend Rate',
  'Wholesale',
];

const firstRatePlans: Array<[string, string, string, boolean?, boolean?]> = [
  ['DU', 'DAYUSE', '10 Feb 2021'],
  ['BAR', 'BEST AVAILABLE RATE 2021', '25 Mar 2024'],
  ['Special Rate', 'Special Rate', '26 Jun 2025', false],
  ['COMP', 'COMPLIMENTARY', '27 Jan 2026'],
  ['HU', 'HOUSEUSE', '27 Sep 2022'],
  ['Promo With BF', 'Promotion Rate W Breakfast', '01 Feb 2023', true, true],
  ['Boss friends promo rate', 'Boss friends', '26 Jun 2025', false],
  ['CORP', 'Corporate Rate', '23 Jul 2026'],
  ['GOV', 'Government Rate', '23 Jul 2026'],
  ['OTA', 'Online Travel Agent Rate', '19 Aug 2026', true, true],
];

const initialRatePlans: RatePlanItem[] = [
  ...firstRatePlans.map((item, index) => ({
    id: `rate-${index + 1}`,
    code: item[0],
    description: item[1],
    updated: item[2],
    active: item[3] ?? true,
    web: item[4] ?? false,
  })),
  ...Array.from({ length: 35 }, (_, index) => ({
    id: `rate-${index + 11}`,
    code: `RATE${String(index + 11).padStart(2, '0')}`,
    description: `Hotel Rate Plan ${index + 11}`,
    updated: index % 3 === 0 ? '27 Aug 2026' : index % 3 === 1 ? '19 Aug 2026' : '23 Jul 2026',
    active: index % 9 !== 0,
    web: index % 7 === 0,
  })),
];

const moduleItems: { key: RateSetupSection; label: string; detail: string }[] = [
  { key: 'season-setup', label: 'Season Setup', detail: 'Season: 4' },
  { key: 'season-calendar', label: 'Season Calendar', detail: 'Latest updated on 23 Jul 2026' },
  { key: 'rate-element', label: 'Rate Element', detail: 'Latest update on 19 Aug 2026' },
  { key: 'rate-type', label: 'Rate Type', detail: 'Latest updated on 23 Jul 2026' },
  { key: 'rate-setup', label: 'Rate Setup', detail: 'Latest updated on 27 Aug 2026' },
];

function PopupMenu({
  items,
  onClose,
}: {
  items: { label: string; onClick: () => void; disabled?: boolean }[];
  onClose: () => void;
}) {
  return (
    <div className="rate-popup-menu" role="menu">
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          role="menuitem"
          disabled={item.disabled}
          onClick={() => {
            item.onClick();
            onClose();
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function EditorModal({
  title,
  children,
  onCancel,
  onSave,
  saveLabel = 'Save',
}: {
  title: string;
  children: ReactNode;
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <div className="rate-modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="rate-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <strong>{title}</strong>
          <button type="button" aria-label="Close" onClick={onCancel}><X size={18} /></button>
        </header>
        <div className="rate-modal-body">{children}</div>
        <footer>
          <button type="button" className="secondary-button" onClick={onCancel}>Cancel</button>
          <button type="button" className="primary-button" onClick={onSave}>{saveLabel}</button>
        </footer>
      </section>
    </div>
  );
}

function FloatingAdd({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button className="rate-floating-add" type="button" onClick={onClick} aria-label={label}>
      <Plus size={28} />
    </button>
  );
}

function SearchHeader({
  title,
  count,
  query,
  onQuery,
}: {
  title: string;
  count: number;
  query: string;
  onQuery: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rate-list-heading">
      <strong>{title} <span>({count})</span></strong>
      <div className="rate-search-wrap">
        {open && (
          <input
            autoFocus
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder={`Search ${title}`}
            aria-label={`Search ${title}`}
          />
        )}
        <button type="button" className="rate-search-button" aria-label={`Search ${title}`} onClick={() => setOpen((value) => !value)}>
          <Search size={24} />
        </button>
      </div>
    </div>
  );
}

function SeasonSetupPage({ seasons, onChange }: { seasons: Season[]; onChange: (value: Season[]) => void | Promise<void> }) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Season | null>(null);
  const [draft, setDraft] = useState<Season | null>(null);

  const beginEdit = (season?: Season) => {
    const next = season ?? {
      id: `season-${Date.now()}`,
      name: '',
      color: '#ff9100',
      active: true,
    };
    setEditing(next);
    setDraft({ ...next });
  };

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    const exists = seasons.some((item) => item.id === draft.id);
    void onChange(exists
      ? seasons.map((item) => (item.id === draft.id ? { ...draft, name: draft.name.trim() } : item))
      : [...seasons, { ...draft, name: draft.name.trim() }]);
    setEditing(null);
    setDraft(null);
  };

  return (
    <div className="rate-section-page season-setup-page">
      <div className="rate-row-list season-row-list">
        {seasons.map((season) => (
          <div className={`rate-list-row season-list-row${season.active ? '' : ' inactive'}`} key={season.id}>
            <span className="season-color-box" style={{ background: season.color }} />
            <strong>{season.name}</strong>
            <div className="rate-row-actions">
              <button type="button" aria-label={`Options for ${season.name}`} onClick={() => setMenuId(menuId === season.id ? null : season.id)}>
                <MoreVertical size={24} />
              </button>
              {menuId === season.id && (
                <PopupMenu
                  onClose={() => setMenuId(null)}
                  items={[
                    { label: 'Edit', onClick: () => beginEdit(season) },
                    {
                      label: season.active ? 'Inactive' : 'Active',
                      onClick: () => { void onChange(seasons.map((item) => item.id === season.id ? { ...item, active: !item.active } : item)); },
                    },
                  ]}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <FloatingAdd label="Add season" onClick={() => beginEdit()} />
      {editing && draft && (
        <EditorModal title={seasons.some((item) => item.id === editing.id) ? 'Edit Season' : 'New Season'} onCancel={() => { setEditing(null); setDraft(null); }} onSave={save}>
          <label className="rate-editor-field">Season Name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className="rate-editor-field">Season Colour<input type="color" value={draft.color} onChange={(event) => setDraft({ ...draft, color: event.target.value })} /></label>
        </EditorModal>
      )}
    </div>
  );
}

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

function moveMonth(value: string, amount: number) {
  const [year, month] = value.split('-').map(Number);
  const next = new Date(year, month - 1 + amount, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
}

function daysForMonth(value: string) {
  const [year, month] = value.split('-').map(Number);
  const total = new Date(year, month, 0).getDate();
  const offset = new Date(year, month - 1, 1).getDay();
  return { total, offset };
}

function SeasonCalendarPage({ seasons, assignments, onSave }: { seasons: Season[]; assignments: Record<string, string>; onSave: (value: Record<string, string>) => void | Promise<void> }) {
  const [selectedId, setSelectedId] = useState(seasons.find((item) => item.active)?.id ?? '');
  const [month, setMonth] = useState('2026-09');
  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>(assignments);
  const [saved, setSaved] = useState(false);
  useEffect(() => setDraftAssignments(assignments), [assignments]);
  const selected = seasons.find((item) => item.id === selectedId) ?? seasons[0];
  const { total, offset } = daysForMonth(month);

  const toggleDate = (day: number) => {
    const key = `${month}-${String(day).padStart(2, '0')}`;
    setDraftAssignments((current) => ({ ...current, [key]: current[key] === selectedId ? '' : selectedId }));
    setSaved(false);
  };

  return (
    <div className="rate-section-page season-calendar-page">
      <div className="season-calendar-select-card">
        <label>Season</label>
        <div className="season-calendar-select-line">
          <span className="season-color-box" style={{ background: selected.color }} />
          <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
            {seasons.filter((item) => item.active).map((season) => <option value={season.id} key={season.id}>{season.name}</option>)}
          </select>
        </div>
      </div>
      <div className="season-calendar-info"><Info size={17} /> Mark date below for selected season</div>
      <div className="season-calendar-card">
        <div className="season-calendar-nav">
          <button type="button" onClick={() => setMonth(moveMonth(month, -1))} aria-label="Previous month"><ChevronLeft size={26} /></button>
          <strong>{monthLabel(month)}</strong>
          <button type="button" onClick={() => setMonth(moveMonth(month, 1))} aria-label="Next month"><ChevronRight size={26} /></button>
        </div>
        <div className="season-calendar-grid weekday-grid">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="season-calendar-grid date-grid">
          {Array.from({ length: offset }, (_, index) => <span key={`empty-${index}`} />)}
          {Array.from({ length: total }, (_, index) => {
            const day = index + 1;
            const key = `${month}-${String(day).padStart(2, '0')}`;
            const season = seasons.find((item) => item.id === draftAssignments[key]);
            return (
              <button
                type="button"
                key={day}
                onClick={() => toggleDate(day)}
                className={season ? 'marked' : ''}
                style={season ? { background: season.color } : undefined}
                aria-label={`${day} ${monthLabel(month)}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>
      <div className="season-calendar-savebar">
        <button className="primary-button" type="button" onClick={async () => { const cleaned = Object.fromEntries(Object.entries(draftAssignments).filter(([, value]) => value)); await onSave(cleaned); setSaved(true); }}>{saved ? 'Saved' : 'Save'}</button>
      </div>
    </div>
  );
}

function RateElementPage({ items, onChange }: { items: RateElementItem[]; onChange: (value: RateElementItem[]) => void | Promise<void> }) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<RateElementItem | null>(null);
  const filtered = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    void onChange(items.some((item) => item.id === draft.id)
      ? items.map((item) => item.id === draft.id ? { ...draft, name: draft.name.trim() } : item)
      : [...items, { ...draft, name: draft.name.trim() }]);
    setDraft(null);
  };

  return (
    <div className="rate-section-page">
      <SearchHeader title="Rate Element" count={items.length} query={query} onQuery={setQuery} />
      <div className="rate-row-list">
        {filtered.map((item) => (
          <div className={`rate-list-row detailed${item.active ? '' : ' inactive'}`} key={item.id}>
            <div className="rate-row-copy"><strong>{item.name}</strong><span>{item.basis} &nbsp;|&nbsp; {item.postingRhythm} &nbsp;|&nbsp; Min: {item.min} &nbsp;|&nbsp; Max: {item.max}</span></div>
            <strong className="rate-row-amount">MYR {item.amount.toFixed(2)}</strong>
            <div className="rate-row-actions">
              <button type="button" aria-label={`Options for ${item.name}`} onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreVertical size={24} /></button>
              {menuId === item.id && (
                <PopupMenu onClose={() => setMenuId(null)} items={[
                  { label: 'Edit', onClick: () => setDraft({ ...item }) },
                  { label: item.active ? 'Inactive' : 'Active', onClick: () => { void onChange(items.map((row) => row.id === item.id ? { ...row, active: !row.active } : row)); } },
                ]} />
              )}
            </div>
          </div>
        ))}
      </div>
      <FloatingAdd label="Add rate element" onClick={() => setDraft({ id: crypto.randomUUID(), name: '', basis: 'Per Person', postingRhythm: 'Daily', min: 1, max: 1, amount: 0, active: true })} />
      {draft && (
        <EditorModal title={items.some((item) => item.id === draft.id) ? 'Edit Rate Element' : 'New Rate Element'} onCancel={() => setDraft(null)} onSave={save}>
          <label className="rate-editor-field">Rate Element<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className="rate-editor-field">Charge Basis<select value={draft.basis} onChange={(event) => setDraft({ ...draft, basis: event.target.value })}><option>Flat Rate</option><option>Per Person</option><option>Per Adult</option><option>Per Child</option><option>Per Infant</option></select></label>
          <label className="rate-editor-field">Posting Rhythm<select value={draft.postingRhythm} onChange={(event) => setDraft({ ...draft, postingRhythm: event.target.value as RateElementItem['postingRhythm'] })}><option>Daily</option><option>First Night</option><option>Last Night</option></select></label>
          <div className="rate-editor-grid"><label className="rate-editor-field">Minimum<input type="number" min="0" value={draft.min} onChange={(event) => setDraft({ ...draft, min: Number(event.target.value) })} /></label><label className="rate-editor-field">Maximum<input type="number" min="0" value={draft.max} onChange={(event) => setDraft({ ...draft, max: Number(event.target.value) })} /></label></div>
          <label className="rate-editor-field">Amount (MYR)<input type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} /></label>
        </EditorModal>
      )}
    </div>
  );
}

function RateTypePage({ items, onChange }: { items: RateTypeItem[]; onChange: (value: RateTypeItem[]) => void | Promise<void> }) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<RateTypeItem | null>(null);
  const filtered = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    void onChange(items.some((item) => item.id === draft.id)
      ? items.map((item) => item.id === draft.id ? { ...draft, name: draft.name.trim() } : item)
      : [...items, { ...draft, name: draft.name.trim() }]);
    setDraft(null);
  };

  return (
    <div className="rate-section-page">
      <SearchHeader title="Rate Type" count={items.length} query={query} onQuery={setQuery} />
      <div className="rate-row-list">
        {filtered.map((item) => (
          <div className={`rate-list-row${item.active ? '' : ' inactive'}`} key={item.id}>
            <strong>{item.name}</strong>
            <div className="rate-row-actions">
              <button type="button" aria-label={`Options for ${item.name}`} onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreVertical size={24} /></button>
              {menuId === item.id && (
                <PopupMenu onClose={() => setMenuId(null)} items={[
                  { label: 'Edit', onClick: () => setDraft({ ...item }) },
                  { label: item.active ? 'Inactive' : 'Active', onClick: () => { void onChange(items.map((row) => row.id === item.id ? { ...row, active: !row.active } : row)); } },
                ]} />
              )}
            </div>
          </div>
        ))}
      </div>
      <FloatingAdd label="Add rate type" onClick={() => setDraft({ id: crypto.randomUUID(), name: '', active: true })} />
      {draft && (
        <EditorModal title={items.some((item) => item.id === draft.id) ? 'Edit Rate Type' : 'New Rate Type'} onCancel={() => setDraft(null)} onSave={save}>
          <label className="rate-editor-field">Rate Type<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        </EditorModal>
      )}
    </div>
  );
}

function RateSetupPage({ items, validityItems, onChange, onValidityChange }: { items: RatePlanItem[]; validityItems: RateValidityItem[]; onChange: (value: RatePlanItem[]) => void | Promise<void>; onValidityChange: (value: RateValidityItem[]) => void | Promise<void> }) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<RatePlanItem | null>(null);
  const [validity, setValidity] = useState<{ item: RatePlanItem; id: string; from: string; to: string } | null>(null);
  const filtered = useMemo(() => items.filter((item) => `${item.code} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const save = () => {
    if (!draft || !draft.code.trim() || !draft.description.trim()) return;
    void onChange(items.some((item) => item.id === draft.id)
      ? items.map((item) => item.id === draft.id ? { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' } : item)
      : [...items, { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' }]);
    setDraft(null);
  };

  return (
    <div className="rate-section-page">
      <SearchHeader title="Rate Setup" count={items.length} query={query} onQuery={setQuery} />
      <div className="rate-row-list">
        {filtered.map((item) => (
          <div className={`rate-list-row detailed rate-plan-row${item.active ? '' : ' inactive'}`} key={item.id}>
            <div className="rate-row-copy"><strong>{item.code} &nbsp;|&nbsp; {item.description}</strong><span>Last Updated on {item.updated}</span></div>
            {item.web && <Globe2 className="rate-web-icon" size={18} />}
            <div className="rate-row-actions">
              <button type="button" aria-label={`Options for ${item.code}`} onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreVertical size={24} /></button>
              {menuId === item.id && (
                <PopupMenu onClose={() => setMenuId(null)} items={[
                  { label: 'Validity Period', onClick: () => { const existing = validityItems.find((row) => row.rateSetupId === item.id && row.active); setValidity({ item, id: existing?.id ?? `validity-${Date.now()}`, from: existing?.from ?? '2026-09-05', to: existing?.to ?? '2026-12-31' }); } },
                  { label: 'Edit', onClick: () => setDraft({ ...item }) },
                ]} />
              )}
            </div>
          </div>
        ))}
      </div>
      <FloatingAdd label="Add rate setup" onClick={() => setDraft({ id: `rate-${Date.now()}`, code: '', description: '', updated: '05 Sep 2026', active: true })} />
      {draft && (
        <EditorModal title={items.some((item) => item.id === draft.id) ? 'Edit Rate Setup' : 'New Rate Setup'} onCancel={() => setDraft(null)} onSave={save}>
          <label className="rate-editor-field">Rate Code<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /></label>
          <label className="rate-editor-field">Description<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label className="rate-editor-check"><input type="checkbox" checked={draft.web ?? false} onChange={(event) => setDraft({ ...draft, web: event.target.checked })} /> Online / Web Rate</label>
        </EditorModal>
      )}
      {validity && (
        <EditorModal title={`Validity Period - ${validity.item.code}`} onCancel={() => setValidity(null)} onSave={() => { void onValidityChange([...validityItems.filter((row) => row.rateSetupId !== validity.item.id), { id: validity.id, rateSetupId: validity.item.id, from: validity.from, to: validity.to, active: true }]); setValidity(null); }}>
          <div className="rate-editor-grid">
            <label className="rate-editor-field">Valid From<HotelDatePicker value={validity.from} onChange={(value) => setValidity({ ...validity, from: value })} /></label>
            <label className="rate-editor-field">Valid To<HotelDatePicker value={validity.to} onChange={(value) => setValidity({ ...validity, to: value })} /></label>
          </div>
        </EditorModal>
      )}
    </div>
  );
}

export function RateSetupModule({
  section,
  onSectionChange,
  data,
  onChange,
}: {
  section: RateSetupSection | null;
  onSectionChange: (section: RateSetupSection | null) => void;
  data: RateSetupData;
  onChange: (value: RateSetupData) => void | Promise<void>;
}) {
  const savePart = <K extends keyof RateSetupData>(key: K, value: RateSetupData[K]) => onChange({ ...data, [key]: value });
  if (!section) {
    return (
      <div className="hotel-settings-menu rate-setup-module-menu" aria-label="Rate Setup">
        {moduleItems.map((item) => (
          <button
            key={item.key}
            type="button"
            className="hotel-settings-card"
            style={{ gridTemplateColumns: 'minmax(0, 1fr) 28px' }}
            aria-label={item.label}
            onClick={() => onSectionChange(item.key)}
          >
            <span className="hotel-settings-card-copy"><strong>{item.label}</strong><span>{item.detail}</span></span>
            <ChevronRight className="hotel-settings-card-arrow" size={28} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="rate-setup-module">
      <div className="rate-subpage-backline">
        <button type="button" onClick={() => onSectionChange(null)}><ChevronLeft size={17} /> Rate Setup</button>
      </div>
      {section === 'season-setup' ? <SeasonSetupPage seasons={data.seasons} onChange={(value) => savePart('seasons', value)} /> : null}
      {section === 'season-calendar' ? <SeasonCalendarPage seasons={data.seasons} assignments={data.calendar} onSave={(value) => savePart('calendar', value)} /> : null}
      {section === 'rate-element' ? <RateElementPage items={data.elements} onChange={(value) => savePart('elements', value)} /> : null}
      {section === 'rate-type' ? <RateTypePage items={data.rateTypes} onChange={(value) => savePart('rateTypes', value)} /> : null}
      {section === 'rate-setup' ? <RateSetupPage items={data.ratePlans} validityItems={data.validity} onChange={(value) => savePart('ratePlans', value)} onValidityChange={(value) => savePart('validity', value)} /> : null}
    </div>
  );
}
