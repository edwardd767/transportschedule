'use client';

import { Eye, Pencil, Plus, ScanLine, ContactRound, UserRound, UserRoundPen } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { stayDates } from '@/lib/bookings';
import type { Booking } from '@/lib/bookings';
import type { GuestProfile } from '@/lib/transport-state';

type Page = 'rooms' | 'guests' | 'profile';
const today = () => new Date().toISOString().slice(0, 10);
const emptyProfile = (booking: Booking): GuestProfile => ({
  id: crypto.randomUUID(), name: '', mobile: '', email: '',
  nationality: 'Malaysian', identityNo: '', address: '', country: 'Malaysia', state: '', city: '', postcode: '',
  birthDate: '', occupation: '', accountName: booking.accountName ?? '', guestType: 'Normal', adultChild: 'Adult', remark: '',
  newsletter: false, tourismTax: false, visits: 0, updated: today(),
});

export function RoomingList({ booking, profiles, onProfilesSave, onBookingSave, onBack }: {
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
  const [paxDraft, setPaxDraft] = useState('1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [scanText, setScanText] = useState('');
  const run = async (action: () => Promise<void>) => { setBusy(true); setError(''); try { await action(); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to save. Please try again.'); } finally { setBusy(false); } };
  const room = booking.rooms[roomIndex];
  const assigned = useMemo(() => (room?.guestProfileIds ?? []).map(id => profiles.find(profile => profile.id === id)).filter(Boolean) as GuestProfile[], [profiles, room]);
  const pax = Math.max(1, (room?.adults ?? booking.guests ?? 1) + (room?.children ?? 0));
  const roomLabel = `${room?.code ?? 'Room'} | Room ${roomIndex + 1} | ${room?.rateCode ?? 'BAR'} Room Only`;

  const openGuests = (index: number) => { setRoomIndex(index); setPage('guests'); };
  const editProfile = (profile?: GuestProfile) => { setDraft(profile ? { ...profile } : emptyProfile(booking)); setPage('profile'); };
  const saveProfile = async () => {
    if (!draft?.name.trim()) return;
    const value = { ...draft, name: draft.name.trim(), updated: today() };
    const nextProfiles = [value, ...profiles.filter(item => item.id !== value.id)];
    const currentRoom = booking.rooms[roomIndex];
    const ids = Array.from(new Set([...(currentRoom.guestProfileIds ?? []), value.id]));
    const rooms = booking.rooms.map((item, index) => index === roomIndex ? { ...item, guestProfileIds: ids } : item);
    await onProfilesSave(nextProfiles);
    await onBookingSave({ ...booking, rooms });
    setDraft(null);
    setPage('guests');
  };
  const removeProfile = async () => {
    if (!draft) return;
    const rooms = booking.rooms.map((item, index) => index === roomIndex ? { ...item, guestProfileIds: (item.guestProfileIds ?? []).filter(id => id !== draft.id) } : item);
    await onBookingSave({ ...booking, rooms });
    setDraft(null);
    setPage('guests');
  };

  if (page === 'profile' && draft) return <section className="rooming-page" aria-label="Guest profile details">
    <RoomingHeader booking={booking} label="Guest List" onBack={() => setPage('guests')} />
    <div className="rooming-booking-line"><strong>{booking.reference} | {booking.guest}</strong><small>{roomLabel}</small></div>
    <div className="rooming-profile-card">
      <div className="rooming-scan"><div><ContactRound size={88} strokeWidth={1.3} /></div><label><ScanLine size={18} /> SCAN ID<input type="file" accept="image/*" capture="environment" hidden disabled={busy} onChange={event => { const file = event.target.files?.[0]; if (file) void run(async () => { const { recognize } = await import('tesseract.js'); const result = await recognize(file, 'eng'); setScanText(result.data.text); }); }} /></label>{scanText && <label className="rooming-scan-result">Scanned text — review before copying into guest fields<textarea value={scanText} onChange={event => setScanText(event.target.value)} /></label>}</div>
      <div className="rooming-form-grid">
        {([['name', 'Guest Name *'], ['mobile', 'Mobile No.'], ['email', 'Email Address'], ['nationality', 'Nationality *'], ['identityNo', 'NRIC No.'], ['address', 'Address'], ['country', 'Country *'], ['state', 'State *'], ['city', 'City'], ['postcode', 'Postcode'], ['vehicle', 'Vehicle No. / Model'], ['occupation', 'Occupation'], ['birthDate', 'Birth Date'], ['guestType', 'Guest Type *'], ['remark', 'Remark'], ['paymentRemark1', 'PaymentRemark1'], ['paymentRemark2', 'PaymentRemark2'], ['taxExemptReason', 'Tax Exempted Reason Code']] as const).map(([key, label]) => <label className={['name','mobile','email','address','remark','paymentRemark1','paymentRemark2','taxExemptReason'].includes(key) ? 'rooming-wide' : ''} key={key}><span>{label}</span><input type={key === 'birthDate' ? 'date' : key === 'email' ? 'email' : 'text'} value={draft[key] ?? ''} onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}<label><span>Adult/Child *</span><select value={draft.adultChild || 'Adult'} onChange={event => setDraft({ ...draft, adultChild: event.target.value as 'Adult' | 'Child' })}><option>Adult</option><option>Child</option></select></label>
        <label className="rooming-check"><input type="checkbox" checked={draft.tourismTax} onChange={event => setDraft({ ...draft, tourismTax: event.target.checked })} /><span>Tourism Tax</span></label>
      </div>
    </div>
    {error && <p role="alert">{error}</p>}
    <div className="rooming-actions"><button type="button" disabled={busy || !assigned.some(profile => profile.id === draft.id)} onClick={() => void run(removeProfile)}>Delete</button><button type="button" disabled={busy || !draft.name.trim()} className="primary-button" onClick={() => void run(saveProfile)}>Save</button></div>
  </section>;

  if (page === 'guests') return <section className="rooming-page" aria-label="Room guest list">
    <RoomingHeader booking={booking} label="Guest List" onBack={() => setPage('rooms')} />
    <div className="rooming-booking-line"><strong>{booking.reference} | {booking.guest}</strong><small>{roomLabel}</small></div>
    <div className="rooming-pax-head"><span><UserRound size={16} /> No. of Pax: {pax} <b className="rooming-pax-count"><UserRound size={15} /> {room?.adults ?? 1} <ContactRound size={15} /> {room?.children ?? 0}</b></span><button type="button" aria-label="Edit number of pax" onClick={() => { setPaxDraft(String(pax)); setPaxOpen(true); setError(''); }}><Pencil size={17} /></button></div>
    <Dialog open={paxOpen} onOpenChange={setPaxOpen}><DialogContent className="rooming-pax-dialog" aria-describedby={undefined} showCloseButton={false}><DialogTitle>{booking.reference} | {booking.guest}</DialogTitle><small>{roomLabel}</small><form onSubmit={event => { event.preventDefault(); void run(async () => { const value = Number(paxDraft); if (!Number.isInteger(value) || value < 1 || value < (room.children ?? 0) + 1) throw new Error('Enter a whole pax count including the existing children and at least one adult.'); const rooms = booking.rooms.map((item, index) => index === roomIndex ? { ...item, adults: value - (item.children ?? 0) } : item); await onBookingSave({ ...booking, rooms, guests: rooms.reduce((sum, item) => sum + ((item.adults ?? 1) + (item.children ?? 0)) * item.count, 0) }); setPaxOpen(false); }); }}><label>No. of Pax.<input aria-label="No. of Pax" type="number" min="1" step="1" required value={paxDraft} onChange={event => setPaxDraft(event.target.value)} /></label>{error && <p role="alert">{error}</p>}<footer><button type="button" disabled={busy} onClick={() => setPaxOpen(false)}>Cancel</button><button disabled={busy} type="submit">Confirm</button></footer></form></DialogContent></Dialog>
    <div className="rooming-guest-card"><div className="rooming-table-head"><span>No.</span><span>Guest Name(s)</span></div>{assigned.length ? assigned.map((profile, index) => <div className="rooming-guest-row" key={profile.id}><strong>{index + 1}.</strong><div><strong><UserRound size={14} /> {profile.name}</strong><small>{profile.mobile || profile.email || 'Guest profile pending contact details'}</small></div><button type="button" className="rooming-profile-button" aria-label={`Open ${profile.name} profile`} title="Open guest profile" onClick={() => editProfile(profile)}><UserRoundPen size={18} /></button></div>) : <div className="rooming-empty">No guest profile is assigned yet. Add the first guest profile for this room.</div>}</div>
    <button type="button" className="rooming-add" aria-label="Add guest profile" onClick={() => editProfile()}><Plus size={29} /></button>
  </section>;

  return <section className="rooming-page" aria-label="Rooming list">
    <RoomingHeader booking={booking} label="Rooming List" onBack={onBack} />
    <div className="rooming-booking-line"><strong>{booking.reference} | {booking.guest}</strong><small>{booking.rooms.map(item => `${item.code} ${item.count}`).join(' | ')}</small></div>
    <div className="rooming-room-card"><div className="rooming-table-head rooming-room-head"><span>No.</span><span>Room Type</span><span><UserRound size={14} /></span><span>Guest Name(s)</span></div>{booking.rooms.map((item, index) => { const guests = (item.guestProfileIds ?? []).map(id => profiles.find(profile => profile.id === id)).filter(Boolean) as GuestProfile[]; return <div className="rooming-room-row" key={`${item.code}-${index}`}><strong>{index + 1}.</strong><div><strong>{item.code}</strong><small>{item.rateCode ?? 'BAR'} Room Only</small></div><span>{Math.max(1, (item.adults ?? booking.guests ?? 1) + (item.children ?? 0))}</span><div><strong>{guests.map(profile => profile.name).join(', ') || booking.guest}</strong><small>{guests.length ? `${guests.length} guest profile${guests.length === 1 ? '' : 's'}` : 'No guest profile assigned'}</small></div><button type="button" className="rooming-view-button" aria-label={`View ${item.code} guest list`} title="View guest list" onClick={() => openGuests(index)}><Eye size={20} /></button></div>; })}</div>
  </section>;
}

function RoomingHeader({ booking, label, onBack }: { booking: Booking; label: string; onBack: () => void }) {
  return <><div className="rooming-banner"><button type="button" onClick={onBack} aria-label="Back">‹</button><span><small>HMS</small><strong>HOTEL PARADISE</strong></span></div><div className="rooming-breadcrumb">... / ... / {label}</div>{label === 'Rooming List' && <div className="rooming-stay"><strong>{stayDates(booking)}</strong><span>{booking.amount.toFixed(2)}</span></div>}</>;
}
