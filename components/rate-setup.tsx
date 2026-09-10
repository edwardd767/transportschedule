
'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  User, Baby,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Globe2,
  Info,
  MoreVertical,
  Plus,
  Pencil,
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
  rateTypeId: string;
  rateFrequency: 'Daily' | 'Monthly';
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

function ValidityEditor({ item, validity, seasons, roomTypes, elements, onCancel, onSave }: { item: RatePlanItem; validity: RateValidityItem; seasons: Season[]; roomTypes: { code: string; description: string }[]; elements: RateElementItem[]; onCancel: () => void; onSave: (value: RateValidityItem) => void | Promise<void> }) {
  const [draft, setDraft] = useState(validity);
  const [inclusiveOpen, setInclusiveOpen] = useState(false);
  const [addOnOpen, setAddOnOpen] = useState(false);
  const childChargesEnabled = useContext(ChildRateContext);
  const [activeTab, setActiveTab] = useState<'seasonal' | 'extra' | 'inclusive' | 'addOn'>('seasonal');
  const [elementQuery, setElementQuery] = useState('');
  const [inclusiveMenu, setInclusiveMenu] = useState<string | null>(null);
  const [addOnMenu, setAddOnMenu] = useState<string | null>(null);
  const [rateEditor, setRateEditor] = useState<{ room: string; season: string } | null>(null);
  const selectedElements = draft.inclusiveElements ?? [];
  const selectedAddOnElements = draft.addOnElements ?? [];
  const saveDraft = async () => { await onSave({ ...draft, inclusiveElements: selectedElements, addOnElements: selectedAddOnElements }); };
  const updateRate = (roomType: string, seasonId: string, field: 'amount' | 't1' | 't2' | 't3', value: number) => setDraft((current) => ({ ...current, seasonalRates: { ...current.seasonalRates, [roomType]: { ...current.seasonalRates?.[roomType], [seasonId]: { amount: 0, t1: 0, t2: 0, t3: 0, ...current.seasonalRates?.[roomType]?.[seasonId], [field]: value } } } }));
  return <div className="rate-section-page validity-editor-page"><div className="rate-subpage-backline"><button type="button" onClick={onCancel}><ChevronLeft size={17} /> {item.code}</button></div><div className="master-detail-card"><div className="master-section-label">{item.description || item.code}</div><div className="rate-editor-grid"><label className="rate-editor-field">Start Date<HotelDatePicker value={draft.from} onChange={(from) => setDraft({ ...draft, from })} /></label><label className="rate-editor-field">End Date<HotelDatePicker value={draft.to} onChange={(to) => setDraft({ ...draft, to })} /></label></div></div><div className="rate-validity-tabs"><button type="button" className={activeTab === 'seasonal' ? 'active' : ''} onClick={() => setActiveTab('seasonal')}>Seasonal Rate</button><button type="button" className={activeTab === 'extra' ? 'active' : ''} onClick={() => setActiveTab('extra')}>Extra Pax</button><button type="button" className={activeTab === 'inclusive' ? 'active' : ''} onClick={() => setActiveTab('inclusive')}>Inclusive Item</button><button type="button" className={activeTab === 'addOn' ? 'active' : ''} onClick={() => setActiveTab('addOn')}>Add On Item</button></div>{activeTab === 'inclusive' ? <><div className="rate-inclusive-list">{selectedElements.map((id) => { const element = elements.find((entry) => entry.id === id); return element ? <div className="rate-list-row detailed rate-inclusive-row" key={id}><div className="rate-row-copy"><strong>{element.name}</strong><span>{element.basis} | Min: {element.min} | Max: {element.max}</span></div><div className="rate-inclusive-actions"><strong>MYR {element.amount.toFixed(2)}</strong><button type="button" aria-label={`Options for ${element.name}`} onClick={() => setInclusiveMenu(inclusiveMenu === id ? null : id)}><MoreVertical size={22} /></button>{inclusiveMenu === id && <div className="rate-inclusive-menu"><button type="button" onClick={() => { setInclusiveMenu(null); setInclusiveOpen(true); }}>Edit</button><button type="button" onClick={() => { setDraft((current) => ({ ...current, inclusiveElements: (current.inclusiveElements ?? []).filter((item) => item !== id) })); setInclusiveMenu(null); }}>Delete</button></div>}</div></div> : null; })}</div><FloatingAdd label="Add inclusive item" onClick={() => setInclusiveOpen(true)} /></> : activeTab === 'addOn' ? <><div className="rate-inclusive-list">{selectedAddOnElements.map((id) => { const element = elements.find((entry) => entry.id === id); return element ? <div className="rate-list-row detailed rate-inclusive-row" key={id}><div className="rate-row-copy"><strong>{element.name}</strong><span>{element.basis} | Min: {element.min} | Max: {element.max}</span></div><div className="rate-inclusive-actions"><strong>MYR {element.amount.toFixed(2)}</strong><button type="button" aria-label={`Options for ${element.name}`} onClick={() => setAddOnMenu(addOnMenu === id ? null : id)}><MoreVertical size={22} /></button>{addOnMenu === id && <div className="rate-inclusive-menu"><button type="button" onClick={() => { setAddOnMenu(null); setAddOnOpen(true); }}>Edit</button><button type="button" onClick={() => { setDraft((current) => ({ ...current, addOnElements: (current.addOnElements ?? []).filter((item) => item !== id) })); setAddOnMenu(null); }}>Delete</button></div>}</div></div> : null; })}</div><FloatingAdd label="Add on item" onClick={() => setAddOnOpen(true)} /></> : <div className="rate-seasonal-list">{roomTypes.map((room) => <details open={room.code === roomTypes[0]?.code} key={room.code} className="rate-seasonal-room"><summary>{room.description || room.code}<ChevronDown size={18} /></summary><div>{seasons.map((season) => { const value = draft.seasonalRates?.[room.code]?.[season.id] ?? { amount: 0, t1: 0, t2: 0, t3: 0 }; return <div className="rate-season-row" key={season.id}><strong>{season.name}</strong>{activeTab === 'extra' ? <span className="rate-summary-tiers extra-pax-summary"><User size={14} aria-label="Adult" /><b>{(value.extraAdult ?? 0).toFixed(2)}</b><Baby size={14} aria-label="Child" /><b>{(childChargesEnabled ? value.extraChild ?? 0 : 0).toFixed(2)}</b></span> : <><span className="rate-summary-amount">MYR {value.amount.toFixed(2)}</span><span className="rate-summary-tiers">T1: {value.t1.toFixed(2)} &nbsp;|&nbsp; T2: {value.t2.toFixed(2)} &nbsp;|&nbsp; T3: {value.t3.toFixed(2)}</span></>}<button className="rate-row-edit" type="button" aria-label={`Edit ${room.description || room.code} ${season.name}`} onClick={() => setRateEditor({ room: room.code, season: season.id })}><Pencil size={17} /></button></div>; })}</div></details>)}</div>}<div className="master-page-actions"><button className="secondary-button" type="button" onClick={onCancel}>Cancel</button><button className="primary-button" type="button" onClick={saveDraft}>Save</button></div>{inclusiveOpen && <div className="rate-element-overlay" role="dialog" aria-label="Rate Element"><div className="rate-element-modal"><h2>Rate Element</h2><input placeholder="Search here.." value={elementQuery} onChange={(event) => setElementQuery(event.target.value)} /> <div className="rate-element-options">{elements.filter((element) => element.active && element.name.toLowerCase().includes(elementQuery.toLowerCase())).map((element) => <label key={element.id}><input type="checkbox" checked={selectedElements.includes(element.id)} onChange={() => setDraft((current) => ({ ...current, inclusiveElements: selectedElements.includes(element.id) ? selectedElements.filter((id) => id !== element.id) : [...selectedElements, element.id] }))} /><span><strong>{element.name}</strong><small>{element.basis} | Min: {element.min} | Max: {element.max}</small></span><b>{element.amount.toFixed(2)}</b></label>)}</div><div className="rate-element-actions"><button type="button" onClick={() => setInclusiveOpen(false)}>Cancel</button><button type="button" onClick={saveDraft}>Confirm</button></div></div></div>}{addOnOpen && <div className="rate-element-overlay" role="dialog" aria-label="Rate Element"><div className="rate-element-modal"><h2>Rate Element</h2><input placeholder="Search here.." value={elementQuery} onChange={(event) => setElementQuery(event.target.value)} /> <div className="rate-element-options">{elements.filter((element) => element.active && element.name.toLowerCase().includes(elementQuery.toLowerCase())).map((element) => <label key={element.id}><input type="checkbox" checked={selectedAddOnElements.includes(element.id)} onChange={() => setDraft((current) => ({ ...current, addOnElements: selectedAddOnElements.includes(element.id) ? selectedAddOnElements.filter((id) => id !== element.id) : [...selectedAddOnElements, element.id] }))} /><span><strong>{element.name}</strong><small>{element.basis} | Min: {element.min} | Max: {element.max}</small></span><b>{element.amount.toFixed(2)}</b></label>)}</div><div className="rate-element-actions"><button type="button" onClick={() => setAddOnOpen(false)}>Cancel</button><button type="button" onClick={saveDraft}>Confirm</button></div></div></div>}{rateEditor && <SeasonRateDialog extra={activeTab === 'extra'} roomName={roomTypes.find(room => room.code === rateEditor.room)?.description || rateEditor.room} season={seasons.find(season => season.id === rateEditor.season)!} value={draft.seasonalRates?.[rateEditor.room]?.[rateEditor.season] ?? { amount: 0, t1: 0, t2: 0, t3: 0 }} onCancel={() => setRateEditor(null)} onConfirm={(value) => { setDraft(current => ({ ...current, seasonalRates: { ...current.seasonalRates, [rateEditor.room]: { ...current.seasonalRates?.[rateEditor.room], [rateEditor.season]: value } } })); setRateEditor(null); }} />}</div>;
}

function displayDate(value: string) { const [year, month, day] = value.split('-'); return year && month && day ? `${day}/${month}/${year}` : value; }
function ValidityRow({ row, onEdit }: { row: RateValidityItem; onEdit: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return <div className="rate-list-row detailed rate-validity-row"><div className="rate-row-copy"><strong>{displayDate(row.from)} – {displayDate(row.to)}</strong><span>Last updated today</span></div><div className="rate-row-actions"><button type="button" aria-label="Validity period options" onClick={() => setMenuOpen(!menuOpen)}><MoreVertical size={24} /></button>{menuOpen && <PopupMenu onClose={() => setMenuOpen(false)} items={[{ label: 'Edit', onClick: onEdit }]} />}</div></div>;
}

function RateSetupPage({ items, rateTypes, validityItems, seasons, roomTypes, elements, onChange, onValidityChange }: { items: RatePlanItem[]; rateTypes: RateTypeItem[]; validityItems: RateValidityItem[]; seasons: Season[]; roomTypes: { code: string; description: string }[]; elements: RateElementItem[]; onChange: (value: RatePlanItem[]) => void | Promise<void>; onValidityChange: (value: RateValidityItem[]) => void | Promise<void> }) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<RatePlanItem | null>(null);
  const [validityPage, setValidityPage] = useState<RatePlanItem | null>(null);
  const [validity, setValidity] = useState<RateValidityItem | null>(null);
  const filtered = useMemo(() => items.filter((item) => `${item.code} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const save = () => {
    if (!draft || !draft.code.trim() || !draft.description.trim()) return;
    void onChange(items.some((item) => item.id === draft.id)
      ? items.map((item) => item.id === draft.id ? { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' } : item)
      : [...items, { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' }]);
    setDraft(null);
  };

  if (validity && validityPage) return <ValidityEditor item={validityPage} validity={validity} seasons={seasons} roomTypes={roomTypes} elements={elements} onCancel={() => setValidity(null)} onSave={async (value) => { await onValidityChange([...validityItems.filter((row) => row.id !== value.id), value]); setValidity(null); }} />;
  if (validityPage) return <div className="rate-section-page"><div className="rate-subpage-backline"><button type="button" onClick={() => setValidityPage(null)}><ChevronLeft size={17} /> Rate Setup</button></div><SearchHeader title={validityPage.code} count={validityItems.filter((row) => row.rateSetupId === validityPage.id).length} query="" onQuery={() => {}} /><div className="rate-row-list">{validityItems.filter((row) => row.rateSetupId === validityPage.id).map((row) => <ValidityRow key={row.id} row={row} onEdit={() => setValidity(row)} />)}</div><FloatingAdd label="Add validity period" onClick={() => setValidity({ id: crypto.randomUUID(), rateSetupId: validityPage.id, from: '2026-09-01', to: '2026-12-31', active: true, seasonalRates: {} })} /></div>;

  return (
    <div className="rate-section-page">
      <SearchHeader title="Rate Setup" count={items.length} query={query} onQuery={setQuery} />
      <div className="rate-row-list">
        {filtered.map((item) => (
          <div className={`rate-list-row detailed rate-plan-row${item.active ? '' : ' inactive'}`} key={item.id}>
            <div className="rate-row-copy"><strong>{item.code} &nbsp;|&nbsp; {item.description}</strong><span>{rateTypes.find((type) => type.id === item.rateTypeId)?.name ?? '—'} &nbsp;|&nbsp; {item.rateFrequency} &nbsp;|&nbsp; Last Updated on {item.updated}</span></div>
            {item.web && <Globe2 className="rate-web-icon" size={18} />}
            <div className="rate-row-actions">
              <button type="button" aria-label={`Options for ${item.code}`} onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreVertical size={24} /></button>
              {menuId === item.id && (
                <PopupMenu onClose={() => setMenuId(null)} items={[
                  { label: 'Validity Period', onClick: () => setValidityPage(item) },
                  { label: 'Edit', onClick: () => setDraft({ ...item }) },
                ]} />
              )}
            </div>
          </div>
        ))}
      </div>
      <FloatingAdd label="Add rate setup" onClick={() => setDraft({ id: crypto.randomUUID(), code: '', description: '', rateTypeId: rateTypes.find((type) => type.active)?.id ?? '', rateFrequency: 'Daily', updated: '05 Sep 2026', active: true })} />
      {draft && (
        <EditorModal title={items.some((item) => item.id === draft.id) ? 'Edit Rate Setup' : 'New Rate Setup'} onCancel={() => setDraft(null)} onSave={save}>
          <label className="rate-editor-field">Rate Code<input value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /></label>
          <label className="rate-editor-field">Description<input value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
          <label className="rate-editor-field">Rate Type<select value={draft.rateTypeId} onChange={(event) => setDraft({ ...draft, rateTypeId: event.target.value })}>{rateTypes.filter((type) => type.active).map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label>
          <label className="rate-editor-field">Rate Frequency<select value={draft.rateFrequency} onChange={(event) => setDraft({ ...draft, rateFrequency: event.target.value as RatePlanItem['rateFrequency'] })}><option>Daily</option><option>Monthly</option></select></label>
          <label className="rate-editor-check"><input type="checkbox" checked={draft.web ?? false} onChange={(event) => setDraft({ ...draft, web: event.target.checked })} /> Online / Web Rate</label>
        </EditorModal>
      )}
    </div>
  );
}

const ChildRateContext = createContext(false);

export function RateSetupModule({
  section,
  onSectionChange,
  data,
  onChange,
  childRatesApplied = false,
  roomTypes = [],
}: {
  section: RateSetupSection | null;
  onSectionChange: (section: RateSetupSection | null) => void;
  data: RateSetupData;
  onChange: (value: RateSetupData) => void | Promise<void>;
  childRatesApplied?: boolean;
  roomTypes?: { code: string; description: string }[];
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
    <ChildRateContext.Provider value={childRatesApplied}><div className="rate-setup-module">
      {section === 'season-setup' ? <SeasonSetupPage seasons={data.seasons} onChange={(value) => savePart('seasons', value)} /> : null}
      {section === 'season-calendar' ? <SeasonCalendarPage seasons={data.seasons} assignments={data.calendar} onSave={(value) => savePart('calendar', value)} /> : null}
      {section === 'rate-element' ? <RateElementPage items={data.elements} onChange={(value) => savePart('elements', value)} /> : null}
      {section === 'rate-type' ? <RateTypePage items={data.rateTypes} onChange={(value) => savePart('rateTypes', value)} /> : null}
      {section === 'rate-setup' ? <RateSetupPage items={data.ratePlans} rateTypes={data.rateTypes} validityItems={data.validity} seasons={data.seasons} roomTypes={roomTypes} elements={data.elements} onChange={(value) => savePart('ratePlans', value)} onValidityChange={(value) => savePart('validity', value)} /> : null}
    </div></ChildRateContext.Provider>
  );
}







function SeasonRateDialog({ extra = false, roomName, season, value, onCancel, onConfirm }: { extra?: boolean; roomName: string; season: Season; value: { amount: number; t1: number; t2: number; t3: number; quotas?: number[]; basePax?: number; extraAdult?: number; extraChild?: number }; onCancel: () => void; onConfirm: (value: { amount: number; t1: number; t2: number; t3: number; quotas?: number[]; basePax?: number; extraAdult?: number; extraChild?: number }) => void }) {
  const childEnabled = useContext(ChildRateContext);
  const [pax, setPax] = useState(String(value.basePax ?? 2));
  const [adult, setAdult] = useState(String(value.extraAdult ?? 0));
  const [child, setChild] = useState(String(value.extraChild ?? 0));
  const [amount, setAmount] = useState(String(value.amount.toFixed(2)));
  const [tiers, setTiers] = useState(() => Array.from({ length: Math.max(1, value.quotas?.length ?? (value.t3 ? 3 : value.t2 ? 2 : 1)) }, (_, i) => ({ quota: String(value.quotas?.[i] ?? 0), rate: [value.t1, value.t2, value.t3][i].toFixed(2) })));
  const valid = pax.trim() !== '' && Number.isInteger(Number(pax)) && Number(pax) >= 1 && amount.trim() !== '' && Number.isFinite(Number(amount)) && Number(amount) >= 0 && tiers.every(t => t.quota.trim() !== '' && Number.isInteger(Number(t.quota)) && Number(t.quota) >= 0 && t.rate.trim() !== '' && Number.isFinite(Number(t.rate)) && Number(t.rate) >= 0);
  if (extra) return <div className="rate-element-overlay"><form className="season-dialog extra-pax-dialog" role="dialog" aria-modal="true" aria-label="Extra Pax" onSubmit={e => { e.preventDefault(); onConfirm({ ...value, extraAdult: Number(adult), extraChild: childEnabled ? Number(child) : 0 }); }}><header><strong>Extra Pax</strong><span>{season.name}</span></header><label>Adult<input aria-label="Extra adult charge" type="number" min="0" step="0.01" required value={adult} onChange={e => setAdult(e.target.value)} /></label><label>Child<input aria-label="Extra child charge" type="number" min="0" step="0.01" required disabled={!childEnabled} value={childEnabled ? child : '0'} onChange={e => setChild(e.target.value)} /></label>{!childEnabled && <p>Child charges are disabled in General Policy.</p>}<footer><button type="button" onClick={onCancel}>Cancel</button><button type="submit">Save</button></footer></form></div>;
  return <div className="rate-element-overlay"><form className="season-dialog" role="dialog" aria-modal="true" aria-label="Edit seasonal rate" onSubmit={event => { event.preventDefault(); if(valid) onConfirm({ ...value, basePax: Number(pax), amount: Number(amount), t1: Number(tiers[0]?.rate ?? 0), t2: Number(tiers[1]?.rate ?? 0), t3: Number(tiers[2]?.rate ?? 0), quotas: tiers.map(t => Number(t.quota)) }); }}>
    <header><strong>{roomName}</strong><span><i style={{ background: season.color }} />{season.name}</span></header>
    <label className="season-base-pax">#PAX<input aria-label="Base pax" type="number" min="1" step="1" required value={pax} onChange={e => setPax(e.target.value)} /></label><label className="season-standard"><strong>Standard Rate</strong><input aria-label="Standard Rate" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
    <div className="season-dynamic"><strong>Dynamic Rate</strong><button type="button" aria-label="Add tier" disabled={tiers.length >= 3} onClick={() => setTiers([...tiers, { quota: '0', rate: '0.00' }])}>+</button><button type="button" aria-label="Remove tier" disabled={tiers.length <= 1} onClick={() => setTiers(tiers.slice(0,-1))}>−</button></div>
    <div className="season-tier-list">{tiers.map((tier,index) => <div className="season-tier" key={index}><strong>Tier {index+1}</strong><div>{(['quota','rate'] as const).map(field => <label key={field}><span>{field === 'quota' ? "Room’s Quota" : 'Rate'}</span><input aria-label={`Tier ${index+1} ${field}`} type="number" min="0" step={field === 'quota' ? '1' : '0.01'} value={tier[field]} onChange={e => setTiers(tiers.map((t,i) => i === index ? { ...t, [field]: e.target.value } : t))} /></label>)}</div></div>)}</div>
    <footer><button type="button" onClick={onCancel}>Cancel</button><button type="submit" disabled={!valid}>Confirm</button></footer>
  </form></div>;
}
