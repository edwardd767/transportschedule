'use client';

import { Baby, ClipboardList, Footprints, Minus, Pencil, Plus, ScanLine, ContactRound, UserRound, UserRoundPen } from 'lucide-react';
import { useContext, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { stayDates } from '@/lib/bookings';
import type { Booking } from '@/lib/bookings';
import type { GuestProfile } from '@/lib/transport-state';
import { regeneratePaxBilling } from '@/lib/pax-billing';
import type { RateSetupData } from '@/lib/rate-setup-data';
import { fallbackGeography } from '@/lib/geography';
import { TransportDataContext } from '@/components/transport-connection';
import { Choice } from '@/components/hotel-choice';
import { SearchSelect } from '@/components/search-select';

const ADULT_CHILD_ITEMS = [
  { value: 'Adult', label: 'Adult' },
  { value: 'Child', label: 'Child' },
  { value: 'Infant', label: 'Infant' },
];

type Page = 'rooms' | 'guests' | 'profile';
const today = () => new Date().toISOString().slice(0, 10);
const INFANT_MAX_AGE = 2;
const emptyProfile = (booking: Booking): GuestProfile => ({
  id: crypto.randomUUID(), name: '', mobile: '', email: '',
  nationality: 'Malaysian', identityNo: '', address: '', country: 'Malaysia', state: '', city: '', postcode: '',
  birthDate: '', occupation: '', accountName: booking.accountName ?? '', guestType: 'Normal', adultChild: 'Adult', remark: '',
  newsletter: false, tourismTax: false, visits: 0, updated: today(),
});

export function RoomingList({ booking, profiles, onProfilesSave, onBookingSave, onBack, paxCountPolicy, rateSetup, childAgePolicy = 0 }: {
  paxCountPolicy: string;
  childAgePolicy?: number;
  rateSetup: RateSetupData;
  booking: Booking;
  profiles: GuestProfile[];
  onProfilesSave: (profiles: GuestProfile[]) => Promise<void>;
  onBookingSave: (booking: Booking) => Promise<void>;
  onBack: () => void;
}) {
  const [page, setPage] = useState<Page>('rooms');
  const [roomIndex, setRoomIndex] = useState(0);
  const [draft, setDraft] = useState<GuestProfile | null>(null);
  const [paxOpen, setPaxOpen] = useState(false);
  const [adultDraft, setAdultDraft] = useState('1');
  const [childDraft, setChildDraft] = useState('0');
  const [infantDraft, setInfantDraft] = useState('0');
  const profilePolicy = /guest profile created/i.test(paxCountPolicy);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanText, setScanText] = useState('');
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please try again.'); } finally { setBusy(false); } };
  const room = booking.rooms[roomIndex];
  const assigned = useMemo(() => (room?.guestProfileIds ?? []).map(id => profiles.find(profile => profile.id === id)).filter(Boolean) as GuestProfile[], [profiles, room]);
  const pax = Math.max(0, (room?.adults ?? booking.guests ?? 1) + (room?.children ?? 0));
  const roomLabel = `${room?.code ?? 'Room'} | Room ${roomIndex + 1} | ${room?.rateCode ?? 'BAR'} Room Only`;
  const geography = useContext(TransportDataContext)?.geography ?? fallbackGeography;
  const locationStates = geography.states[draft?.country ?? ''] || [];
  const locationCities = geography.cities[`${draft?.country ?? ''}|${draft?.state ?? ''}`] || [];
  useEffect(() => {
    if (draft?.country && draft?.state) geography.loadCities(draft.country, draft.state);
  }, [draft?.country, draft?.state, geography]);
  const updateDraft = (key: keyof GuestProfile, value: string) => setDraft(current => current ? { ...current, [key]: value, ...(key === 'country' ? { state: '', city: '' } : key === 'state' ? { city: '' } : {}) } as GuestProfile : current);

  const saveRooms = async (rooms: Booking['rooms']) => {
    await onBookingSave(regeneratePaxBilling({ ...booking, rooms, guests: rooms.reduce((sum,r) => sum + ((r.adults ?? 1) + (r.children ?? 0)) * r.count, 0) }, rateSetup, booking));
  };
  const openGuests = (index: number) => { void run(async () => {
    const target = booking.rooms[index];
    const ids = [...(target.guestProfileIds ?? [])];
    const next = [...profiles];
    if (profilePolicy) {
      for (const kind of ['Adult', 'Child'] as const) {
        const desired = kind === 'Adult' ? target.adults ?? 1 : target.children ?? 0;
        const present = ids.filter(id => (next.find(p => p.id === id)?.adultChild || 'Adult') === kind).length;
        for (let i = present; i < desired; i++) {
          const id = crypto.randomUUID();
          if (!next.some(p => p.id === id)) next.push({ ...emptyProfile(booking), id, name: `${kind} ${i + 1}`, adultChild: kind }); ids.push(id);
        }
      }
      if (ids.length !== (target.guestProfileIds ?? []).length) { await onProfilesSave(next); await saveRooms(booking.rooms.map((r,i) => i === index ? { ...r, guestProfileIds: ids } : r)); }
    }
    setRoomIndex(index); setPage('guests');
  }); };
  const editProfile = (profile?: GuestProfile) => { setDraft(profile ? { ...profile } : emptyProfile(booking)); setPage('profile'); };
  const saveProfile = async () => {
    if (!draft?.name.trim()) return;
    const value = { ...draft, name: draft.name.trim(), updated: today() };
    const nextProfiles = [value, ...profiles.filter(item => item.id !== value.id)];
    const currentRoom = booking.rooms[roomIndex];
    const ids = Array.from(new Set([...(currentRoom.guestProfileIds ?? []), value.id]));
    const rooms = booking.rooms.map((item, index) => index === roomIndex ? { ...item, guestProfileIds: ids, ...(profilePolicy ? { adults: ids.filter(id => (nextProfiles.find(p => p.id === id)?.adultChild || 'Adult') === 'Adult').length, children: ids.filter(id => nextProfiles.find(p => p.id === id)?.adultChild === 'Child').length } : {}) } : item);
    await onProfilesSave(nextProfiles);
    await saveRooms(rooms);
    setDraft(null);
    setPage('guests');
  };
  const removeProfile = async () => {
    if (!draft) return;
    const rooms = booking.rooms.map((item, index) => index === roomIndex ? { ...item, guestProfileIds: (item.guestProfileIds ?? []).filter(id => id !== draft.id), ...(profilePolicy ? { adults: assigned.filter(p => p.id !== draft.id && p.adultChild !== 'Child').length, children: assigned.filter(p => p.id !== draft.id && p.adultChild === 'Child').length } : {}) } : item);
    await saveRooms(rooms);
    setDraft(null);
    setPage('guests');
  };

  if (page === 'profile' && draft) return <section className="rooming-page" aria-label="Guest profile details">
    <RoomingHeader booking={booking} label="Guest List" editing onBack={() => setPage('guests')} />
    <div className="rooming-booking-line"><strong>{booking.reference} | {booking.guest}</strong><small>{roomLabel}</small></div>
    <div className="rooming-profile-card">
      <div className="rooming-scan"><div><img src="https://hms1.hotelx.asia/static/media/guest-scan.556f8332.svg" alt="Scan an identity document with a phone" /></div><label><ScanLine size={18} /> SCAN ID<input type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void run(async () => { const { recognize } = await import('tesseract.js'); const result = await recognize(file, 'eng'); setScanText(result.data.text); }); }} /></label>{scanText && <label className="rooming-scan-result">Scanned text — review before copying into guest fields<textarea value={scanText} onChange={event => setScanText(event.target.value)} /></label>}</div>
      <div className="rooming-form-grid">
        {([['name', 'Guest Name *'], ['mobile', 'Mobile No.'], ['email', 'Email Address'], ['nationality', 'Nationality *'], ['identityNo', 'NRIC No.'], ['address', 'Address'], ['country', 'Country *'], ['state', 'State *'], ['city', 'City'], ['postcode', 'Postcode'], ['vehicle', 'Vehicle No. / Model'], ['occupation', 'Occupation'], ['birthDate', 'Birth Date'], ['guestType', 'Guest Type *'], ['adultChild', 'Adult/Child *'], ['remark', 'Remark'], ['paymentRemark1', 'PaymentRemark1'], ['paymentRemark2', 'PaymentRemark2'], ['taxExemptReason', 'Tax Exempted Reason Code']] as const).map(([key, label]) => <label className={['name','mobile','email','address','paymentRemark1','paymentRemark2','taxExemptReason'].includes(key) ? 'rooming-wide' : ''} key={key}><span>{label}</span>{key === 'adultChild' ? <Choice label="Adult/Child" value={draft.adultChild || 'Adult'} onChange={value => setDraft({ ...draft, adultChild: value as 'Adult' | 'Child' | 'Infant' })} items={ADULT_CHILD_ITEMS} /> : key === 'country' ? <SearchSelect value={draft.country} onChange={value => updateDraft('country', value)} options={geography.countries} ariaLabel="Country" /> : key === 'state' ? <SearchSelect value={draft.state} onChange={value => updateDraft('state', value)} options={locationStates} placeholder="Select state" ariaLabel="State" /> : key === 'city' ? <SearchSelect value={draft.city} onChange={value => updateDraft('city', value)} options={locationCities} placeholder="Select city" ariaLabel="City" /> : key === 'nationality' && geography.nationalities.length ? <SearchSelect value={draft.nationality} onChange={value => updateDraft('nationality', value)} options={geography.nationalities} ariaLabel="Nationality" /> : <input type={key === 'birthDate' ? 'date' : key === 'email' ? 'email' : 'text'} value={draft[key] ?? ''} onChange={event => updateDraft(key, event.target.value)} />}</label>)}        <label className="rooming-check"><input type="checkbox" checked={draft.tourismTax} onChange={event => setDraft({ ...draft, tourismTax: event.target.checked })} /><span>Tourism Tax</span></label>
      </div>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="rooming-actions"><button type="button" disabled={busy || !assigned.some(profile => profile.id === draft.id)} onClick={() => void run(removeProfile)}>Delete</button><button type="button" disabled={busy || !draft.name.trim()} className="primary-button" onClick={() => void run(saveProfile)}>Save</button></div>
  </section>;

  if (page === 'guests') return <section className="rooming-page" aria-label="Room guest list">
    <RoomingHeader booking={booking} label="Guest List" onBack={() => setPage('rooms')} />
    <div className="rooming-booking-line"><strong>{booking.reference} | {booking.guest}</strong><small>{roomLabel}</small></div>
    <div className="rooming-pax-head"><span><UserRound size={16} /> No. of Pax: {pax} <b className="rooming-pax-count"><span className="booking-pax-icon billing-pax-tip" data-tip="Adult"><UserRound size={15} aria-label="Adults" /></span> {room?.adults ?? 1} <span className="booking-pax-icon billing-pax-tip" data-tip="Child"><Baby size={15} aria-label="Children" /></span> {room?.children ?? 0} <span className="booking-pax-icon billing-pax-tip" data-tip="Infant"><Footprints size={15} aria-label="Infants" /></span> {room?.infants ?? 0}</b></span><button type="button" aria-label="Edit number of pax" onClick={() => { setAdultDraft(String(room.adults ?? 1)); setChildDraft(String(room.children ?? 0)); setInfantDraft(String(room.infants ?? 0)); setPaxOpen(true); setError(''); }}><Pencil size={17} /></button></div>
    <Dialog open={paxOpen} onOpenChange={setPaxOpen}><DialogContent className="rooming-pax-dialog" aria-describedby={undefined} showCloseButton={false}><DialogTitle>{booking.reference} | {booking.guest}</DialogTitle><small>{roomLabel}</small><form onSubmit={event => { event.preventDefault(); void run(async () => { const adults = Number(adultDraft), children = Number(childDraft), infants = Number(infantDraft); if (![adults,children,infants].every(n => Number.isInteger(n) && n >= 0) || adults + children < 1) throw new Error('Enter adult, child and infant counts with at least one guest.'); const rooms = booking.rooms.map((item,index) => index === roomIndex ? { ...item, adults, children, infants } : item); await saveRooms(rooms); setPaxOpen(false); }); }}><div className="booking-guests-steppers rooming-guests-steppers"><div className="booking-stepper"><div className="booking-stepper-row"><span className="booking-stepper-label">Adult</span><button type="button" aria-label="Decrease adults" disabled={Number(adultDraft) <= 1} onClick={() => setAdultDraft(String(Math.max(1, Math.floor(Number(adultDraft) || 0) - 1)))}><Minus size={16} /></button><input className="booking-stepper-value" type="number" min={1} step={1} required aria-label="No. of Adult" value={adultDraft} onChange={e => setAdultDraft(e.target.value)} /><button type="button" aria-label="Increase adults" onClick={() => setAdultDraft(String(Math.floor(Number(adultDraft) || 0) + 1))}><Plus size={16} /></button></div></div><div className="booking-stepper"><div className="booking-stepper-row"><span className="booking-stepper-label">Child</span><button type="button" aria-label="Decrease children" disabled={Number(childDraft) <= 0} onClick={() => setChildDraft(String(Math.max(0, Math.floor(Number(childDraft) || 0) - 1)))}><Minus size={16} /></button><input className="booking-stepper-value" type="number" min={0} step={1} required aria-label="No. of Child" value={childDraft} onChange={e => setChildDraft(e.target.value)} /><button type="button" aria-label="Increase children" onClick={() => setChildDraft(String(Math.floor(Number(childDraft) || 0) + 1))}><Plus size={16} /></button></div>{childAgePolicy > INFANT_MAX_AGE && <small className="booking-child-age-note">Age {INFANT_MAX_AGE + 1} - {childAgePolicy} years</small>}</div><div className="booking-stepper"><div className="booking-stepper-row"><span className="booking-stepper-label">Infant</span><button type="button" aria-label="Decrease infants" disabled={Number(infantDraft) <= 0} onClick={() => setInfantDraft(String(Math.max(0, Math.floor(Number(infantDraft) || 0) - 1)))}><Minus size={16} /></button><input className="booking-stepper-value" type="number" min={0} step={1} required aria-label="No. of Infant" value={infantDraft} onChange={e => setInfantDraft(e.target.value)} /><button type="button" aria-label="Increase infants" onClick={() => setInfantDraft(String(Math.floor(Number(infantDraft) || 0) + 1))}><Plus size={16} /></button></div>{childAgePolicy > INFANT_MAX_AGE && <small className="booking-child-age-note">Age 0 - {INFANT_MAX_AGE} years</small>}</div></div>{error && <p role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={() => setPaxOpen(false)}>Cancel</button><button disabled={busy} type="submit">Confirm</button></footer></form></DialogContent></Dialog>
    <div className="rooming-guest-card"><div className="rooming-table-head"><span>No.</span><span>Guest Name(s)</span></div>{assigned.length ? assigned.map((profile, index) => <div className="rooming-guest-row" key={profile.id}><strong>{index + 1}.</strong><div><strong>{profile.adultChild === 'Child' ? <Baby size={17} /> : <UserRound size={17} fill="currentColor" />} {profile.name}</strong><small>{profile.identityNo || profile.mobile || 'To Scan'}</small></div><button type="button" className="rooming-profile-button" aria-label={`Open ${profile.name} profile`} title="Open guest profile" onClick={() => editProfile(profile)}><span className="guest-photo-placeholder" /><ClipboardList size={15} /></button></div>) : <div className="rooming-empty">No guest profile is assigned yet. Add the first guest profile for this room.</div>}</div>
    <button type="button" className="rooming-add" aria-label="Add guest profile" onClick={() => editProfile()}><Plus size={29} /></button>
  </section>;

  return <section className="rooming-page" aria-label="Rooming list">
    <RoomingHeader booking={booking} label="Rooming List" onBack={onBack} />
    <div className="rooming-booking-line"><strong>{booking.reference} | {booking.guest}</strong><small>{booking.rooms.map(item => `${item.code} ${item.count}`).join(' | ')}</small></div>
    {error && <p role="alert">{error}</p>}<div className="rooming-room-card"><div className="rooming-table-head rooming-room-head"><span>No.</span><span>Room Type</span><span><UserRound size={14} /></span><span>Guest Name(s)</span></div>{booking.rooms.map((item, index) => { const guests = (item.guestProfileIds ?? []).map(id => profiles.find(profile => profile.id === id)).filter(Boolean) as GuestProfile[]; return <div className="rooming-room-row" key={`${item.code}-${index}`}><strong>{index + 1}.</strong><div><strong>{item.code}</strong><small>{item.rateCode ?? 'BAR'} Room Only</small></div><span>{Math.max(1, (item.adults ?? booking.guests ?? 1) + (item.children ?? 0))}</span><div><strong>{guests.map(profile => profile.name).join(', ') || booking.guest}</strong><small>{guests.length ? `${guests.length} guest profile${guests.length === 1 ? '' : 's'}` : 'No guest profile assigned'}</small></div><button type="button" className="rooming-view-button" disabled={busy} aria-label={`View ${item.code} guest list`} title="View guest list" onClick={() => openGuests(index)}><img src="https://hms1.hotelx.asia/static/media/view_edit_icon.cb90a368.svg" alt="" aria-hidden="true" width={22} height={22} style={{ display: 'block', objectFit: 'contain' }} /></button></div>; })}</div>
  </section>;
}

function RoomingHeader({ booking, label, onBack, editing = false }: { booking: Booking; label: string; onBack: () => void; editing?: boolean }) {
  return <><div className="rooming-banner"><button type="button" onClick={onBack} aria-label="Back">‹</button><span><small>HMS</small><strong>HOTEL PARADISE</strong></span></div><div className="rooming-breadcrumb">... / ... / {label}{editing && <span className="rooming-edit-label">Edit</span>}</div>{label === 'Rooming List' && <div className="rooming-stay"><strong>{stayDates(booking)}</strong><span>{booking.amount.toFixed(2)}</span></div>}</>;
}
