from pathlib import Path

rate_setup = r'''\
'use client';

import { useMemo, useState, type ReactNode } from 'react';
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

function SeasonSetupPage() {
  const [seasons, setSeasons] = useState(initialSeasons);
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
    setSeasons((current) => {
      const exists = current.some((item) => item.id === draft.id);
      return exists
        ? current.map((item) => (item.id === draft.id ? { ...draft, name: draft.name.trim() } : item))
        : [...current, { ...draft, name: draft.name.trim() }];
    });
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
                      onClick: () => setSeasons((current) => current.map((item) => item.id === season.id ? { ...item, active: !item.active } : item)),
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

function SeasonCalendarPage() {
  const [seasons] = useState(initialSeasons);
  const [selectedId, setSelectedId] = useState('non-peak');
  const [month, setMonth] = useState('2026-09');
  const [assignments, setAssignments] = useState<Record<string, string>>(() => {
    const result: Record<string, string> = {};
    for (let day = 1; day <= 30; day += 1) result[`2026-09-${String(day).padStart(2, '0')}`] = 'non-peak';
    return result;
  });
  const [saved, setSaved] = useState(false);
  const selected = seasons.find((item) => item.id === selectedId) ?? seasons[0];
  const { total, offset } = daysForMonth(month);

  const toggleDate = (day: number) => {
    const key = `${month}-${String(day).padStart(2, '0')}`;
    setAssignments((current) => ({ ...current, [key]: current[key] === selectedId ? '' : selectedId }));
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
            const season = seasons.find((item) => item.id === assignments[key]);
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
        <button className="primary-button" type="button" onClick={() => setSaved(true)}>{saved ? 'Saved' : 'Save'}</button>
      </div>
    </div>
  );
}

function RateElementPage() {
  const [items, setItems] = useState(rateElementSeed);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<RateElementItem | null>(null);
  const filtered = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    setItems((current) => current.some((item) => item.id === draft.id)
      ? current.map((item) => item.id === draft.id ? { ...draft, name: draft.name.trim() } : item)
      : [...current, { ...draft, name: draft.name.trim() }]);
    setDraft(null);
  };

  return (
    <div className="rate-section-page">
      <SearchHeader title="Rate Element" count={items.length} query={query} onQuery={setQuery} />
      <div className="rate-row-list">
        {filtered.map((item) => (
          <div className={`rate-list-row detailed${item.active ? '' : ' inactive'}`} key={item.id}>
            <div className="rate-row-copy"><strong>{item.name}</strong><span>{item.basis} &nbsp;|&nbsp; Min: {item.min} &nbsp;|&nbsp; Max: {item.max}</span></div>
            <strong className="rate-row-amount">MYR {item.amount.toFixed(2)}</strong>
            <div className="rate-row-actions">
              <button type="button" aria-label={`Options for ${item.name}`} onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreVertical size={24} /></button>
              {menuId === item.id && (
                <PopupMenu onClose={() => setMenuId(null)} items={[
                  { label: 'Edit', onClick: () => setDraft({ ...item }) },
                  { label: item.active ? 'Inactive' : 'Active', onClick: () => setItems((current) => current.map((row) => row.id === item.id ? { ...row, active: !row.active } : row)) },
                ]} />
              )}
            </div>
          </div>
        ))}
      </div>
      <FloatingAdd label="Add rate element" onClick={() => setDraft({ id: `element-${Date.now()}`, name: '', basis: 'Per Person', min: 1, max: 1, amount: 0, active: true })} />
      {draft && (
        <EditorModal title={items.some((item) => item.id === draft.id) ? 'Edit Rate Element' : 'New Rate Element'} onCancel={() => setDraft(null)} onSave={save}>
          <label className="rate-editor-field">Rate Element<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
          <label className="rate-editor-field">Charge Basis<select value={draft.basis} onChange={(event) => setDraft({ ...draft, basis: event.target.value })}><option>Per Person</option><option>Per Room</option><option>Per Trip</option><option>Per Vehicle</option></select></label>
          <div className="rate-editor-grid"><label className="rate-editor-field">Minimum<input type="number" min="0" value={draft.min} onChange={(event) => setDraft({ ...draft, min: Number(event.target.value) })} /></label><label className="rate-editor-field">Maximum<input type="number" min="0" value={draft.max} onChange={(event) => setDraft({ ...draft, max: Number(event.target.value) })} /></label></div>
          <label className="rate-editor-field">Amount (MYR)<input type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} /></label>
        </EditorModal>
      )}
    </div>
  );
}

function RateTypePage() {
  const [items, setItems] = useState<RateTypeItem[]>(rateTypeNames.map((name, index) => ({ id: `type-${index + 1}`, name, active: true })));
  const [menuId, setMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<RateTypeItem | null>(null);
  const filtered = useMemo(() => items.filter((item) => item.name.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const save = () => {
    if (!draft || !draft.name.trim()) return;
    setItems((current) => current.some((item) => item.id === draft.id)
      ? current.map((item) => item.id === draft.id ? { ...draft, name: draft.name.trim() } : item)
      : [...current, { ...draft, name: draft.name.trim() }]);
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
                  { label: item.active ? 'Inactive' : 'Active', onClick: () => setItems((current) => current.map((row) => row.id === item.id ? { ...row, active: !row.active } : row)) },
                ]} />
              )}
            </div>
          </div>
        ))}
      </div>
      <FloatingAdd label="Add rate type" onClick={() => setDraft({ id: `type-${Date.now()}`, name: '', active: true })} />
      {draft && (
        <EditorModal title={items.some((item) => item.id === draft.id) ? 'Edit Rate Type' : 'New Rate Type'} onCancel={() => setDraft(null)} onSave={save}>
          <label className="rate-editor-field">Rate Type<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
        </EditorModal>
      )}
    </div>
  );
}

function RateSetupPage() {
  const [items, setItems] = useState(initialRatePlans);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<RatePlanItem | null>(null);
  const [validity, setValidity] = useState<{ item: RatePlanItem; from: string; to: string } | null>(null);
  const filtered = useMemo(() => items.filter((item) => `${item.code} ${item.description}`.toLowerCase().includes(query.toLowerCase())), [items, query]);

  const save = () => {
    if (!draft || !draft.code.trim() || !draft.description.trim()) return;
    setItems((current) => current.some((item) => item.id === draft.id)
      ? current.map((item) => item.id === draft.id ? { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' } : item)
      : [...current, { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' }]);
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
                  { label: 'Validity Period', onClick: () => setValidity({ item, from: '2026-09-05', to: '2026-12-31' }) },
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
        <EditorModal title={`Validity Period - ${validity.item.code}`} onCancel={() => setValidity(null)} onSave={() => setValidity(null)}>
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
}: {
  section: RateSetupSection | null;
  onSectionChange: (section: RateSetupSection | null) => void;
}) {
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
      {section === 'season-setup' ? <SeasonSetupPage /> : null}
      {section === 'season-calendar' ? <SeasonCalendarPage /> : null}
      {section === 'rate-element' ? <RateElementPage /> : null}
      {section === 'rate-type' ? <RateTypePage /> : null}
      {section === 'rate-setup' ? <RateSetupPage /> : null}
    </div>
  );
}
'''

Path('components/rate-setup.tsx').write_text(rate_setup, encoding='utf-8')

hotel_detail = r'''\
'use client';

import {
  ArrowLeft,
  BedDouble,
  Building2,
  ClipboardList,
  Layers3,
  Network,
} from 'lucide-react';
import { RateSetupModule, type RateSetupSection } from '@/components/rate-setup';

export type HotelSettingsDetailKind =
  | 'hotelSetup'
  | 'department'
  | 'floorPlan'
  | 'roomStatus'
  | 'ratePolicy';

const pages = {
  hotelSetup: {
    title: 'Hotel Setup',
    detail: 'Hotel Information and Configuration Setup.',
    section: 'Hotel Information',
    empty: 'Hotel configuration fields will be maintained on this page.',
    icon: Building2,
  },
  department: {
    title: 'Department',
    detail: 'Hotel Department Setup.',
    section: 'Department Master',
    empty: 'Hotel departments will be maintained on this page.',
    icon: Network,
  },
  floorPlan: {
    title: 'Floor Plan',
    detail: 'Floor Plan Setup.',
    section: 'Floor Plan Master',
    empty: 'Hotel floor plans and room mapping will be maintained on this page.',
    icon: Layers3,
  },
  roomStatus: {
    title: 'Room Status',
    detail: 'Room Status Setup.',
    section: 'Room Status Master',
    empty: 'Room status configuration will be maintained on this page.',
    icon: BedDouble,
  },
  ratePolicy: {
    title: 'Rate Setup',
    detail: 'Hotel Rate Setup.',
    section: 'Rate Setup Master',
    empty: 'Hotel rates will be maintained on this page.',
    icon: ClipboardList,
  },
} as const;

export function HotelSettingsDetail({
  kind,
  onBack,
  rateSection = null,
  onRateSectionChange = () => {},
}: {
  kind: HotelSettingsDetailKind;
  onBack: () => void;
  rateSection?: RateSetupSection | null;
  onRateSectionChange?: (section: RateSetupSection | null) => void;
}) {
  const page = pages[kind];
  const Icon = page.icon;

  if (kind === 'ratePolicy') {
    return (
      <section className="master-page rate-setup-master-page" aria-label="Rate Setup">
        <RateSetupModule section={rateSection} onSectionChange={onRateSectionChange} />
        {!rateSection && (
          <button className="secondary-button master-page-back" type="button" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Hotel Settings
          </button>
        )}
      </section>
    );
  }

  return (
    <section className="master-page" aria-label={page.title}>
      <div className="master-list-head">
        <div>
          <h1>{page.title}</h1>
          <p>{page.detail}</p>
        </div>
      </div>

      <div className="master-detail-card">
        <div className="master-section-label">{page.section}</div>
        <div className="empty-state" style={{ minHeight: 260 }}>
          <Icon size={42} aria-hidden="true" />
          <h3>{page.title}</h3>
          <p>{page.empty}</p>
        </div>
      </div>

      <button className="secondary-button master-page-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Hotel Settings
      </button>
    </section>
  );
}
'''
Path('components/hotel-settings-detail.tsx').write_text(hotel_detail, encoding='utf-8')

menu = Path('components/hotel-settings-menu.tsx')
text = menu.read_text(encoding='utf-8')
text = text.replace("{ key: 'rate-policy', label: 'Rate Policy', detail: 'Rate Policy Setup.', icon: ClipboardList },", "{ key: 'rate-policy', label: 'Rate Setup', detail: 'Hotel Rate Setup.', icon: ClipboardList },")
menu.write_text(text, encoding='utf-8')

page = Path('app/page.tsx')
text = page.read_text(encoding='utf-8')
text = text.replace("import { HotelSettingsDetail } from '@/components/hotel-settings-detail';", "import { HotelSettingsDetail } from '@/components/hotel-settings-detail';\nimport type { RateSetupSection } from '@/components/rate-setup';")
needle = "  >('booking');\n  const [bookingReference, setBookingReference] = useState<string | null>(null);"
replacement = "  >('booking');\n  const [rateSetupSection, setRateSetupSection] = useState<RateSetupSection | null>(null);\n  const [bookingReference, setBookingReference] = useState<string | null>(null);"
if needle not in text:
    raise SystemExit('Could not insert rateSetupSection state')
text = text.replace(needle, replacement, 1)

# Settings pages use HMS in the property banner, matching the supplied HotelX reference screens.
text = text.replace("              <small>PMS</small>\n              <strong>HOTEL PARADISE</strong>", "              <small>{['setup', 'hotelsettings', 'hotelsetup', 'department', 'location', 'floorplan', 'roomtype', 'room', 'roomstatus', 'ratepolicy'].includes(view) ? 'HMS' : 'PMS'}</small>\n              <strong>HOTEL PARADISE</strong>", 1)

# Add a back arrow in the banner when inside one of the Rate Setup sub-pages.
needle = "            {view === 'booking' && activeBooking && (\n              <button\n                className=\"booking-back\"\n                aria-label=\"Back to booking listing\"\n                onClick={() => setBookingReference(null)}\n              >\n                <ChevronLeft size={24} />\n              </button>\n            )}"
replacement = needle + "\n            {view === 'ratepolicy' && rateSetupSection && (\n              <button\n                className=\"booking-back\"\n                aria-label=\"Back to Rate Setup\"\n                onClick={() => setRateSetupSection(null)}\n              >\n                <ChevronLeft size={24} />\n              </button>\n            )}"
if needle not in text:
    raise SystemExit('Could not add Rate Setup banner back button')
text = text.replace(needle, replacement, 1)

# Update the settings breadcrumb for Rate Setup and its five sub-pages.
old = """                            : view === 'roomstatus'\n                              ? 'Room Status'\n                              : 'Rate Policy'}"""
new = """                            : view === 'roomstatus'\n                              ? 'Room Status'\n                              : rateSetupSection\n                                ? <>Rate Setup <ChevronRight size={14} /> {rateSetupSection === 'season-setup' ? 'Season Setup' : rateSetupSection === 'season-calendar' ? 'Season Calendar' : rateSetupSection === 'rate-element' ? 'Rate Element' : rateSetupSection === 'rate-type' ? 'Rate Type' : 'Rate Setup'}</>\n                                : 'Rate Setup'}"""
if old not in text:
    raise SystemExit('Could not update Rate Setup breadcrumb')
text = text.replace(old, new, 1)

text = text.replace("              onOpenRatePolicy={() => setView('ratepolicy')}", "              onOpenRatePolicy={() => { setRateSetupSection(null); setView('ratepolicy'); }}", 1)

old = """              onBack={() => setView('hotelsettings')}\n            />"""
new = """              rateSection={view === 'ratepolicy' ? rateSetupSection : null}\n              onRateSectionChange={setRateSetupSection}\n              onBack={() => { setRateSetupSection(null); setView('hotelsettings'); }}\n            />"""
if old not in text:
    raise SystemExit('Could not add Rate Setup props to HotelSettingsDetail')
text = text.replace(old, new, 1)
page.write_text(text, encoding='utf-8')

css = Path('app/globals.css')
text = css.read_text(encoding='utf-8')
marker = '/* HotelX Rate Setup module */'
if marker not in text:
    text += r'''\

/* HotelX Rate Setup module */
.rate-setup-master-page {
  position: relative;
  min-height: 100%;
}
.rate-setup-module,
.rate-section-page {
  position: relative;
  min-height: 100%;
}
.rate-setup-module-menu {
  padding-bottom: 12px;
}
.rate-subpage-backline {
  display: flex;
  align-items: center;
  min-height: 34px;
  margin-bottom: 6px;
}
.rate-subpage-backline button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: transparent;
  color: #6d6d6d;
  font: inherit;
  cursor: pointer;
}
.rate-row-list {
  display: grid;
  gap: 6px;
  padding: 0 8px 74px;
}
.rate-list-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  min-height: 68px;
  padding: 11px 18px;
  border: 1px solid #e1e1e1;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.12);
  color: #111;
}
.rate-list-row.detailed {
  grid-template-columns: minmax(0, 1fr) auto 32px;
  gap: 14px;
}
.rate-list-row.inactive {
  color: #8b8b8b;
  background: #f7f7f7;
}
.rate-list-row > strong,
.rate-row-copy strong {
  font-size: 14px;
  font-weight: 800;
}
.rate-row-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}
.rate-row-copy span {
  font-size: 12px;
}
.rate-row-amount {
  white-space: nowrap;
}
.rate-row-actions {
  position: relative;
  justify-self: end;
}
.rate-row-actions > button,
.rate-search-button {
  display: inline-grid;
  place-items: center;
  width: 30px;
  height: 30px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #222;
  cursor: pointer;
}
.rate-popup-menu {
  position: absolute;
  z-index: 50;
  top: 31px;
  right: 0;
  display: grid;
  min-width: 130px;
  overflow: hidden;
  border-radius: 4px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
}
.rate-popup-menu button {
  min-height: 44px;
  padding: 9px 16px;
  border: 0;
  background: #fff;
  text-align: left;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}
.rate-popup-menu button:hover {
  background: #f4f4f4;
}
.rate-popup-menu button:disabled {
  color: #a9a9a9;
  cursor: default;
}
.season-list-row {
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 10px;
}
.season-color-box {
  display: inline-block;
  width: 30px;
  height: 24px;
  border-radius: 5px;
  flex: 0 0 auto;
}
.rate-floating-add {
  position: fixed;
  right: 24px;
  bottom: 22px;
  z-index: 30;
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  border: 0;
  border-radius: 50%;
  background: #ff9100;
  color: #fff;
  box-shadow: 0 4px 13px rgba(0, 0, 0, 0.25);
  cursor: pointer;
}
.rate-list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 48px;
  margin: 0 0 8px;
  padding: 8px 14px;
  background: #fff;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.12);
}
.rate-list-heading strong {
  font-size: 14px;
}
.rate-list-heading strong span {
  color: #ff8900;
}
.rate-search-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
}
.rate-search-wrap input {
  width: min(260px, 34vw);
  height: 32px;
  padding: 4px 9px;
  border: 1px solid #d7d7d7;
  border-radius: 4px;
  font: inherit;
}
.rate-web-icon {
  justify-self: end;
}
.season-calendar-select-card {
  margin: 0 8px 6px;
  padding: 16px 14px 12px;
  border-radius: 5px;
  background: #fff;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.12);
}
.season-calendar-select-card > label {
  display: block;
  margin-bottom: 8px;
  color: #888;
  font-size: 12px;
}
.season-calendar-select-line {
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #aaa;
  padding-bottom: 7px;
}
.season-calendar-select-line select {
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  font: inherit;
  font-weight: 700;
}
.season-calendar-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 42px;
  margin: 0 8px 6px;
  padding: 8px 14px;
  background: #ffe3ad;
  color: #00187d;
  font-size: 12px;
}
.season-calendar-card {
  margin: 0 8px 68px;
  padding: 28px 22px 34px;
  background: #fff;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.12);
}
.season-calendar-nav {
  display: grid;
  grid-template-columns: 42px 1fr 42px;
  align-items: center;
  margin-bottom: 26px;
}
.season-calendar-nav strong {
  justify-self: center;
  font-size: 18px;
}
.season-calendar-nav button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.season-calendar-nav button:last-child {
  justify-self: end;
}
.season-calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 46px);
  justify-content: center;
  gap: 6px;
}
.weekday-grid {
  margin-bottom: 8px;
}
.weekday-grid span {
  text-align: center;
  font-size: 12px;
}
.date-grid button {
  width: 38px;
  height: 38px;
  justify-self: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #111;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}
.date-grid button.marked {
  color: #111;
}
.season-calendar-savebar {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: flex;
  justify-content: center;
  min-height: 58px;
  padding: 9px;
  background: rgba(255,255,255,0.97);
  box-shadow: 0 -2px 7px rgba(0,0,0,0.12);
}
.season-calendar-savebar .primary-button {
  min-width: 150px;
}
.rate-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: grid;
  place-items: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.42);
}
.rate-modal {
  width: min(560px, calc(100vw - 36px));
  max-height: calc(100vh - 36px);
  overflow: auto;
  border-radius: 7px;
  background: #fff;
  box-shadow: 0 12px 36px rgba(0,0,0,0.3);
}
.rate-modal > header,
.rate-modal > footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 16px;
}
.rate-modal > header {
  border-bottom: 1px solid #eee;
  color: #ef8500;
}
.rate-modal > header button {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.rate-modal > footer {
  justify-content: flex-end;
  border-top: 1px solid #eee;
}
.rate-modal-body {
  display: grid;
  gap: 12px;
  padding: 16px;
}
.rate-editor-field {
  display: grid;
  gap: 5px;
  color: #777;
  font-size: 12px;
}
.rate-editor-field input,
.rate-editor-field select {
  width: 100%;
  min-height: 36px;
  padding: 6px 8px;
  border: 0;
  border-bottom: 1px solid #aaa;
  background: #fff;
  color: #111;
  font: inherit;
  font-size: 14px;
}
.rate-editor-field input[type='color'] {
  width: 70px;
  padding: 2px;
}
.rate-editor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.rate-editor-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.rate-editor-check input {
  width: 17px;
  height: 17px;
}

@media (max-width: 639px) {
  .rate-row-list { padding-left: 4px; padding-right: 4px; }
  .rate-list-row { min-height: 62px; padding: 10px 12px; }
  .rate-list-row.detailed { grid-template-columns: minmax(0, 1fr) auto 28px; gap: 7px; }
  .rate-list-row > strong, .rate-row-copy strong { font-size: 13px; }
  .rate-row-copy span, .rate-row-amount { font-size: 11px; }
  .rate-floating-add { right: 16px; bottom: 16px; width: 52px; height: 52px; }
  .season-calendar-card { padding: 20px 8px 28px; }
  .season-calendar-grid { grid-template-columns: repeat(7, 38px); gap: 3px; }
  .date-grid button { width: 34px; height: 34px; }
  .rate-editor-grid { grid-template-columns: 1fr; gap: 12px; }
}
'''
    css.write_text(text, encoding='utf-8')

print('Rate Setup module applied.')
