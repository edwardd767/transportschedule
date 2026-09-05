from pathlib import Path


def read(path):
    return Path(path).read_text(encoding='utf-8')


def write(path, text):
    Path(path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'Missing patch target: {label}')
    return text.replace(old, new, 1)

# lib/transport-state.ts
path = 'lib/transport-state.ts'
text = read(path)
text = replace_once(text,
"import {\n  addBookingTransportLeg,\n  removeBookingTransportLeg,\n  type BookingTransportLeg,\n  type BookingTransportLegInput,\n} from './booking-transport';\n",
"import {\n  addBookingTransportLeg,\n  removeBookingTransportLeg,\n  type BookingTransportLeg,\n  type BookingTransportLegInput,\n} from './booking-transport';\nimport { initialRateSetupData, type RateSetupData } from './rate-setup-data';\n",
'import rate setup data')
text = replace_once(text,
"  hotelMasters: HotelMasters;\n  bookings: Booking[];\n};",
"  hotelMasters: HotelMasters;\n  bookings: Booking[];\n  rateSetup: RateSetupData;\n};",
'add state rateSetup')
text = replace_once(text,
"  | { type: 'bookingCreate'; value: Booking }\n  | {\n      type: 'transfers';",
"  | { type: 'bookingCreate'; value: Booking }\n  | { type: 'rateSetup'; value: RateSetupData }\n  | {\n      type: 'transfers';",
'add rateSetup action')
text = replace_once(text,
"    hotelMasters: initialHotelMasters,\n    bookings: initialBookings,\n  });",
"    hotelMasters: initialHotelMasters,\n    bookings: initialBookings,\n    rateSetup: initialRateSetupData,\n  });",
'seed rateSetup')
text = replace_once(text,
"  const bookings =\n    Array.isArray(state.bookings) && state.bookings.length\n      ? state.bookings\n      : structuredClone(initialBookings);\n  return {",
"  const bookings =\n    Array.isArray(state.bookings) && state.bookings.length\n      ? state.bookings\n      : structuredClone(initialBookings);\n  const rateSetup =\n    state.rateSetup &&\n    Array.isArray(state.rateSetup.seasons) && state.rateSetup.seasons.length &&\n    state.rateSetup.calendar && typeof state.rateSetup.calendar === 'object' &&\n    Array.isArray(state.rateSetup.elements) && state.rateSetup.elements.length &&\n    Array.isArray(state.rateSetup.rateTypes) && state.rateSetup.rateTypes.length &&\n    Array.isArray(state.rateSetup.ratePlans) && state.rateSetup.ratePlans.length &&\n    Array.isArray(state.rateSetup.validity)\n      ? state.rateSetup\n      : structuredClone(initialRateSetupData);\n  return {",
'normalize rateSetup')
text = replace_once(text,
"    hotelMasters,\n    bookings,\n  };",
"    hotelMasters,\n    bookings,\n    rateSetup,\n  };",
'return normalized rateSetup')
text = replace_once(text,
"function unique(items: { id: string }[]) {\n  if (new Set(items.map((item) => item.id)).size !== items.length)\n    throw new Error('Duplicate record identifiers.');\n}\n",
"function unique(items: { id: string }[]) {\n  if (new Set(items.map((item) => item.id)).size !== items.length)\n    throw new Error('Duplicate record identifiers.');\n}\nfunction decimal(value: unknown, label: string, min = 0, max = 100000000) {\n  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max)\n    throw new Error(`Enter a valid ${label}.`);\n  return value;\n}\nfunction rateSetup(value: unknown): RateSetupData {\n  const v = object(value);\n  const seasons = list(v.seasons, 200).map((entry) => {\n    const row = object(entry);\n    return { id: text(row.id, 'season ID', true, 100), name: text(row.name, 'season name', true, 120).trim(), color: text(row.color, 'season colour', true, 20), active: boolean(row.active) };\n  });\n  unique(seasons);\n  const seasonIds = new Set(seasons.map((item) => item.id));\n  const calendarRaw = object(v.calendar);\n  const calendar: Record<string, string> = {};\n  for (const [date, seasonIdValue] of Object.entries(calendarRaw)) {\n    if (!validDate(date)) throw new Error('Choose a valid season calendar date.');\n    if (typeof seasonIdValue !== 'string' || !seasonIds.has(seasonIdValue)) continue;\n    calendar[date] = seasonIdValue;\n  }\n  const elements = list(v.elements, 1000).map((entry) => {\n    const row = object(entry);\n    const min = number(row.min, 'minimum quantity', 0, 10000);\n    const max = number(row.max, 'maximum quantity', min, 10000);\n    return { id: text(row.id, 'rate element ID', true, 100), name: text(row.name, 'rate element', true, 160).trim(), basis: text(row.basis, 'charge basis', true, 80), min, max, amount: decimal(row.amount, 'rate element amount'), active: boolean(row.active) };\n  });\n  unique(elements);\n  const rateTypes = list(v.rateTypes, 1000).map((entry) => {\n    const row = object(entry);\n    return { id: text(row.id, 'rate type ID', true, 100), name: text(row.name, 'rate type', true, 160).trim(), active: boolean(row.active) };\n  });\n  unique(rateTypes);\n  const ratePlans = list(v.ratePlans, 2000).map((entry) => {\n    const row = object(entry);\n    return { id: text(row.id, 'rate setup ID', true, 100), code: text(row.code, 'rate code', true, 100).trim(), description: text(row.description, 'rate description', true, 240).trim(), updated: text(row.updated, 'last updated date', true, 40), active: boolean(row.active), web: typeof row.web === 'boolean' ? row.web : false };\n  });\n  unique(ratePlans);\n  const ratePlanIds = new Set(ratePlans.map((item) => item.id));\n  const validity = list(v.validity, 4000).map((entry) => {\n    const row = object(entry);\n    const from = text(row.from, 'valid from', true, 10);\n    const to = text(row.to, 'valid to', true, 10);\n    if (!validDate(from) || !validDate(to) || to < from) throw new Error('Validity end date must be on or after the start date.');\n    const rateSetupId = text(row.rateSetupId, 'rate setup', true, 100);\n    if (!ratePlanIds.has(rateSetupId)) throw new Error('Choose an existing Rate Setup for the validity period.');\n    return { id: text(row.id, 'validity ID', true, 100), rateSetupId, from, to, active: boolean(row.active) };\n  });\n  unique(validity);\n  return { seasons, calendar, elements, rateTypes, ratePlans, validity };\n}\n",
'add rate setup validation')
text = replace_once(text,
"    case 'bookingTransportAdd': {",
"    case 'rateSetup': {\n      return { ...normalizeTransportState(state), rateSetup: rateSetup(action.value) };\n    }\n    case 'bookingTransportAdd': {",
'add rate setup reducer')
write(path, text)

# components/rate-setup.tsx
path = 'components/rate-setup.tsx'
text = read(path)
text = replace_once(text,
"import { useMemo, useState, type ReactNode } from 'react';",
"import { useEffect, useMemo, useState, type ReactNode } from 'react';",
'add useEffect')
text = replace_once(text,
"import { HotelDatePicker } from '@/components/hotel-date-picker';\n",
"import { HotelDatePicker } from '@/components/hotel-date-picker';\nimport type { RateSetupData, RateValidityItem } from '@/lib/rate-setup-data';\n",
'import data types')
text = replace_once(text,
"function SeasonSetupPage() {\n  const [seasons, setSeasons] = useState(initialSeasons);",
"function SeasonSetupPage({ seasons, onChange }: { seasons: Season[]; onChange: (value: Season[]) => void | Promise<void> }) {",
'season page props')
text = replace_once(text,
"    setSeasons((current) => {\n      const exists = current.some((item) => item.id === draft.id);\n      return exists\n        ? current.map((item) => (item.id === draft.id ? { ...draft, name: draft.name.trim() } : item))\n        : [...current, { ...draft, name: draft.name.trim() }];\n    });",
"    const exists = seasons.some((item) => item.id === draft.id);\n    void onChange(exists\n      ? seasons.map((item) => (item.id === draft.id ? { ...draft, name: draft.name.trim() } : item))\n      : [...seasons, { ...draft, name: draft.name.trim() }]);",
'season save')
text = replace_once(text,
"                      onClick: () => setSeasons((current) => current.map((item) => item.id === season.id ? { ...item, active: !item.active } : item)),",
"                      onClick: () => { void onChange(seasons.map((item) => item.id === season.id ? { ...item, active: !item.active } : item)); },",
'season active')
text = replace_once(text,
"function SeasonCalendarPage() {\n  const [seasons] = useState(initialSeasons);\n  const [selectedId, setSelectedId] = useState('non-peak');\n  const [month, setMonth] = useState('2026-09');\n  const [assignments, setAssignments] = useState<Record<string, string>>(() => {\n    const result: Record<string, string> = {};\n    for (let day = 1; day <= 30; day += 1) result[`2026-09-${String(day).padStart(2, '0')}`] = 'non-peak';\n    return result;\n  });\n  const [saved, setSaved] = useState(false);",
"function SeasonCalendarPage({ seasons, assignments, onSave }: { seasons: Season[]; assignments: Record<string, string>; onSave: (value: Record<string, string>) => void | Promise<void> }) {\n  const [selectedId, setSelectedId] = useState(seasons.find((item) => item.active)?.id ?? '');\n  const [month, setMonth] = useState('2026-09');\n  const [draftAssignments, setDraftAssignments] = useState<Record<string, string>>(assignments);\n  const [saved, setSaved] = useState(false);\n  useEffect(() => setDraftAssignments(assignments), [assignments]);",
'calendar props')
text = text.replace("setAssignments((current) => ({ ...current, [key]: current[key] === selectedId ? '' : selectedId }));", "setDraftAssignments((current) => ({ ...current, [key]: current[key] === selectedId ? '' : selectedId }));")
text = text.replace("assignments[key]", "draftAssignments[key]")
text = replace_once(text,
"        <button className=\"primary-button\" type=\"button\" onClick={() => setSaved(true)}>{saved ? 'Saved' : 'Save'}</button>",
"        <button className=\"primary-button\" type=\"button\" onClick={async () => { const cleaned = Object.fromEntries(Object.entries(draftAssignments).filter(([, value]) => value)); await onSave(cleaned); setSaved(true); }}>{saved ? 'Saved' : 'Save'}</button>",
'calendar save')
text = replace_once(text,
"function RateElementPage() {\n  const [items, setItems] = useState(rateElementSeed);",
"function RateElementPage({ items, onChange }: { items: RateElementItem[]; onChange: (value: RateElementItem[]) => void | Promise<void> }) {",
'element props')
text = replace_once(text,
"    setItems((current) => current.some((item) => item.id === draft.id)\n      ? current.map((item) => item.id === draft.id ? { ...draft, name: draft.name.trim() } : item)\n      : [...current, { ...draft, name: draft.name.trim() }]);",
"    void onChange(items.some((item) => item.id === draft.id)\n      ? items.map((item) => item.id === draft.id ? { ...draft, name: draft.name.trim() } : item)\n      : [...items, { ...draft, name: draft.name.trim() }]);",
'element save')
text = replace_once(text,
"{ label: item.active ? 'Inactive' : 'Active', onClick: () => setItems((current) => current.map((row) => row.id === item.id ? { ...row, active: !row.active } : row)) },",
"{ label: item.active ? 'Inactive' : 'Active', onClick: () => { void onChange(items.map((row) => row.id === item.id ? { ...row, active: !row.active } : row)); } },",
'element active')
text = replace_once(text,
"function RateTypePage() {\n  const [items, setItems] = useState<RateTypeItem[]>(rateTypeNames.map((name, index) => ({ id: `type-${index + 1}`, name, active: true })));",
"function RateTypePage({ items, onChange }: { items: RateTypeItem[]; onChange: (value: RateTypeItem[]) => void | Promise<void> }) {",
'type props')
# second identical save block now targets rate type
text = replace_once(text,
"    setItems((current) => current.some((item) => item.id === draft.id)\n      ? current.map((item) => item.id === draft.id ? { ...draft, name: draft.name.trim() } : item)\n      : [...current, { ...draft, name: draft.name.trim() }]);",
"    void onChange(items.some((item) => item.id === draft.id)\n      ? items.map((item) => item.id === draft.id ? { ...draft, name: draft.name.trim() } : item)\n      : [...items, { ...draft, name: draft.name.trim() }]);",
'type save')
# second active occurrence
text = replace_once(text,
"{ label: item.active ? 'Inactive' : 'Active', onClick: () => setItems((current) => current.map((row) => row.id === item.id ? { ...row, active: !row.active } : row)) },",
"{ label: item.active ? 'Inactive' : 'Active', onClick: () => { void onChange(items.map((row) => row.id === item.id ? { ...row, active: !row.active } : row)); } },",
'type active')
text = replace_once(text,
"function RateSetupPage() {\n  const [items, setItems] = useState(initialRatePlans);",
"function RateSetupPage({ items, validityItems, onChange, onValidityChange }: { items: RatePlanItem[]; validityItems: RateValidityItem[]; onChange: (value: RatePlanItem[]) => void | Promise<void>; onValidityChange: (value: RateValidityItem[]) => void | Promise<void> }) {",
'rate plan props')
text = replace_once(text,
"  const [validity, setValidity] = useState<{ item: RatePlanItem; from: string; to: string } | null>(null);",
"  const [validity, setValidity] = useState<{ item: RatePlanItem; id: string; from: string; to: string } | null>(null);",
'validity state')
text = replace_once(text,
"    setItems((current) => current.some((item) => item.id === draft.id)\n      ? current.map((item) => item.id === draft.id ? { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' } : item)\n      : [...current, { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' }]);",
"    void onChange(items.some((item) => item.id === draft.id)\n      ? items.map((item) => item.id === draft.id ? { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' } : item)\n      : [...items, { ...draft, code: draft.code.trim(), description: draft.description.trim(), updated: '05 Sep 2026' }]);",
'rate plan save')
text = replace_once(text,
"{ label: 'Validity Period', onClick: () => setValidity({ item, from: '2026-09-05', to: '2026-12-31' }) },",
"{ label: 'Validity Period', onClick: () => { const existing = validityItems.find((row) => row.rateSetupId === item.id && row.active); setValidity({ item, id: existing?.id ?? `validity-${Date.now()}`, from: existing?.from ?? '2026-09-05', to: existing?.to ?? '2026-12-31' }); } },",
'open validity')
text = replace_once(text,
"        <EditorModal title={`Validity Period - ${validity.item.code}`} onCancel={() => setValidity(null)} onSave={() => setValidity(null)}>",
"        <EditorModal title={`Validity Period - ${validity.item.code}`} onCancel={() => setValidity(null)} onSave={() => { void onValidityChange([...validityItems.filter((row) => row.rateSetupId !== validity.item.id), { id: validity.id, rateSetupId: validity.item.id, from: validity.from, to: validity.to, active: true }]); setValidity(null); }}>",
'save validity')
text = replace_once(text,
"export function RateSetupModule({\n  section,\n  onSectionChange,\n}: {\n  section: RateSetupSection | null;\n  onSectionChange: (section: RateSetupSection | null) => void;\n}) {",
"export function RateSetupModule({\n  section,\n  onSectionChange,\n  data,\n  onChange,\n}: {\n  section: RateSetupSection | null;\n  onSectionChange: (section: RateSetupSection | null) => void;\n  data: RateSetupData;\n  onChange: (value: RateSetupData) => void | Promise<void>;\n}) {\n  const savePart = <K extends keyof RateSetupData>(key: K, value: RateSetupData[K]) => onChange({ ...data, [key]: value });",
'module data props')
text = replace_once(text,
"      {section === 'season-setup' ? <SeasonSetupPage /> : null}\n      {section === 'season-calendar' ? <SeasonCalendarPage /> : null}\n      {section === 'rate-element' ? <RateElementPage /> : null}\n      {section === 'rate-type' ? <RateTypePage /> : null}\n      {section === 'rate-setup' ? <RateSetupPage /> : null}",
"      {section === 'season-setup' ? <SeasonSetupPage seasons={data.seasons} onChange={(value) => savePart('seasons', value)} /> : null}\n      {section === 'season-calendar' ? <SeasonCalendarPage seasons={data.seasons} assignments={data.calendar} onSave={(value) => savePart('calendar', value)} /> : null}\n      {section === 'rate-element' ? <RateElementPage items={data.elements} onChange={(value) => savePart('elements', value)} /> : null}\n      {section === 'rate-type' ? <RateTypePage items={data.rateTypes} onChange={(value) => savePart('rateTypes', value)} /> : null}\n      {section === 'rate-setup' ? <RateSetupPage items={data.ratePlans} validityItems={data.validity} onChange={(value) => savePart('ratePlans', value)} onValidityChange={(value) => savePart('validity', value)} /> : null}",
'module pages')
write(path, text)

# components/hotel-settings-detail.tsx
path = 'components/hotel-settings-detail.tsx'
text = read(path)
text = replace_once(text,
"import { RateSetupModule, type RateSetupSection } from '@/components/rate-setup';\n",
"import { RateSetupModule, type RateSetupSection } from '@/components/rate-setup';\nimport { initialRateSetupData, type RateSetupData } from '@/lib/rate-setup-data';\n",
'detail import')
text = replace_once(text,
"  rateSection = null,\n  onRateSectionChange = () => {},\n}: {",
"  rateSection = null,\n  onRateSectionChange = () => {},\n  rateData = initialRateSetupData,\n  onRateDataChange = () => {},\n}: {",
'detail defaults')
text = replace_once(text,
"  rateSection?: RateSetupSection | null;\n  onRateSectionChange?: (section: RateSetupSection | null) => void;\n}) {",
"  rateSection?: RateSetupSection | null;\n  onRateSectionChange?: (section: RateSetupSection | null) => void;\n  rateData?: RateSetupData;\n  onRateDataChange?: (value: RateSetupData) => void | Promise<void>;\n}) {",
'detail prop types')
text = replace_once(text,
"        <RateSetupModule section={rateSection} onSectionChange={onRateSectionChange} />",
"        <RateSetupModule section={rateSection} onSectionChange={onRateSectionChange} data={rateData} onChange={onRateDataChange} />",
'detail module props')
write(path, text)

# app/page.tsx
path = 'app/page.tsx'
text = read(path)
text = replace_once(text,
"  const { setup, trips, templates, bookingLegs, hotelMasters, bookings } = store.state;",
"  const { setup, trips, templates, bookingLegs, hotelMasters, bookings, rateSetup } = store.state;",
'app destructure')
text = replace_once(text,
"              rateSection={view === 'ratepolicy' ? rateSetupSection : null}\n              onRateSectionChange={setRateSetupSection}\n              onBack={() => { setRateSetupSection(null); setView('hotelsettings'); }}",
"              rateSection={view === 'ratepolicy' ? rateSetupSection : null}\n              onRateSectionChange={setRateSetupSection}\n              rateData={rateSetup}\n              onRateDataChange={async (value) => { await store.run({ type: 'rateSetup', value }); setNotice('Rate Setup saved.'); }}\n              onBack={() => { setRateSetupSection(null); setView('hotelsettings'); }}",
'app detail props')
write(path, text)

# worker/normalized-storage.ts
path = 'worker/normalized-storage.ts'
text = read(path)
text = replace_once(text,
"  BEGIN\n    DELETE FROM public.hotelx_booking_rooms WHERE property_id = p_property_id;",
"  BEGIN\n    DELETE FROM public.hotelx_rate_setup_validity WHERE property_id = p_property_id;\n    DELETE FROM public.hotelx_season_calendar WHERE property_id = p_property_id;\n    DELETE FROM public.hotelx_rate_element WHERE property_id = p_property_id;\n    DELETE FROM public.hotelx_rate_type WHERE property_id = p_property_id;\n    DELETE FROM public.hotelx_rate_setup WHERE property_id = p_property_id;\n    DELETE FROM public.hotelx_season_master WHERE property_id = p_property_id;\n    DELETE FROM public.hotelx_booking_rooms WHERE property_id = p_property_id;",
'delete rate rows')
text = replace_once(text,
"    INSERT INTO public.hotelx_transport_rules (\n      property_id, start_time, end_time, turnaround_minutes,",
"    INSERT INTO public.hotelx_season_master (property_id, id, sort_order, name, color, active)\n    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'name', COALESCE(item.value->>'color', '#ff9100'), COALESCE((item.value->>'active')::boolean, true)\n    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,seasons}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);\n\n    INSERT INTO public.hotelx_season_calendar (property_id, calendar_date, season_id)\n    SELECT p_property_id, assignment.key::date, assignment.value #>> '{}'\n    FROM jsonb_each(COALESCE(p_state #> '{rateSetup,calendar}', '{}'::jsonb)) AS assignment(key, value)\n    WHERE COALESCE(assignment.value #>> '{}', '') <> '';\n\n    INSERT INTO public.hotelx_rate_element (property_id, id, sort_order, name, basis, min_qty, max_qty, amount, active)\n    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'name', item.value->>'basis', COALESCE(NULLIF(item.value->>'min', ''), '0')::integer, COALESCE(NULLIF(item.value->>'max', ''), '0')::integer, COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric, COALESCE((item.value->>'active')::boolean, true)\n    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,elements}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);\n\n    INSERT INTO public.hotelx_rate_type (property_id, id, sort_order, name, active)\n    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'name', COALESCE((item.value->>'active')::boolean, true)\n    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,rateTypes}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);\n\n    INSERT INTO public.hotelx_rate_setup (property_id, id, sort_order, code, description, active, web, last_updated_on)\n    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'code', item.value->>'description', COALESCE((item.value->>'active')::boolean, true), COALESCE((item.value->>'web')::boolean, false), CASE WHEN COALESCE(item.value->>'updated', '') ~ '^\\d{2} [A-Za-z]{3} \\d{4}$' THEN to_date(item.value->>'updated', 'DD Mon YYYY') ELSE NULL END\n    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,ratePlans}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);\n\n    INSERT INTO public.hotelx_rate_setup_validity (property_id, rate_setup_id, id, sort_order, valid_from, valid_to, active)\n    SELECT p_property_id, item.value->>'rateSetupId', item.value->>'id', item.ordinality::integer, (item.value->>'from')::date, (item.value->>'to')::date, COALESCE((item.value->>'active')::boolean, true)\n    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,validity}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);\n\n    INSERT INTO public.hotelx_transport_rules (\n      property_id, start_time, end_time, turnaround_minutes,",
'insert rate rows')
text = replace_once(text,
"      'setup', jsonb_build_object(",
"      'rateSetup', jsonb_build_object(\n        'seasons', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'color', s.color, 'active', s.active) ORDER BY s.sort_order) FROM public.hotelx_season_master s WHERE s.property_id = meta.id), '[]'::jsonb),\n        'calendar', COALESCE((SELECT jsonb_object_agg(to_char(c.calendar_date, 'YYYY-MM-DD'), c.season_id) FROM public.hotelx_season_calendar c WHERE c.property_id = meta.id), '{}'::jsonb),\n        'elements', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'basis', e.basis, 'min', e.min_qty, 'max', e.max_qty, 'amount', e.amount::double precision, 'active', e.active) ORDER BY e.sort_order) FROM public.hotelx_rate_element e WHERE e.property_id = meta.id), '[]'::jsonb),\n        'rateTypes', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'active', t.active) ORDER BY t.sort_order) FROM public.hotelx_rate_type t WHERE t.property_id = meta.id), '[]'::jsonb),\n        'ratePlans', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code, 'description', r.description, 'updated', COALESCE(to_char(r.last_updated_on, 'DD Mon YYYY'), ''), 'active', r.active, 'web', r.web) ORDER BY r.sort_order) FROM public.hotelx_rate_setup r WHERE r.property_id = meta.id), '[]'::jsonb),\n        'validity', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', v.id, 'rateSetupId', v.rate_setup_id, 'from', to_char(v.valid_from, 'YYYY-MM-DD'), 'to', to_char(v.valid_to, 'YYYY-MM-DD'), 'active', v.active) ORDER BY v.sort_order) FROM public.hotelx_rate_setup_validity v WHERE v.property_id = meta.id), '[]'::jsonb)\n      ),\n      'setup', jsonb_build_object(",
'read rateSetup')
text = replace_once(text,
"        const hasBookings = Array.isArray(raw.bookings) && raw.bookings.length > 0;\n        if (!hasMasters || !hasBookings) {",
"        const hasBookings = Array.isArray(raw.bookings) && raw.bookings.length > 0;\n        const hasRateSetup = Boolean(raw.rateSetup && Array.isArray(raw.rateSetup.seasons) && raw.rateSetup.seasons.length && Array.isArray(raw.rateSetup.elements) && raw.rateSetup.elements.length && Array.isArray(raw.rateSetup.rateTypes) && raw.rateSetup.rateTypes.length && Array.isArray(raw.rateSetup.ratePlans) && raw.rateSetup.ratePlans.length && Array.isArray(raw.rateSetup.validity));\n        if (!hasMasters || !hasBookings || !hasRateSetup) {",
'upgrade rate setup check')
text = replace_once(text,
"            bookings: hasBookings ? raw.bookings! : seed.bookings,\n          } as TransportState;",
"            bookings: hasBookings ? raw.bookings! : seed.bookings,\n            rateSetup: hasRateSetup ? raw.rateSetup! : seed.rateSetup,\n          } as TransportState;",
'upgrade rate setup merge')
write(path, text)
