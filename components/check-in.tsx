'use client';

import { useContext, useEffect, useState } from 'react';
import {
  BedDouble,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  MoreVertical,
  RotateCcw,
  Scan,
  Search,
  SlidersHorizontal,
  UserRound,
} from 'lucide-react';
import type { Booking } from '@/lib/bookings';
import type { GuestProfile } from '@/lib/transport-state';
import { TransportDataContext } from '@/components/transport-connection';

const ASSIGNMENT_KEY = '_roomAssignments';

type AdvancedFilters = {
  accountName: string;
  guestName: string;
  roomType: string;
  roomNo: string;
};

type RoomEntry = {
  key: string;
  code: string;
  roomNo: string;
};

const emptyFilters: AdvancedFilters = {
  accountName: '',
  guestName: '',
  roomType: '',
  roomNo: '',
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function readAssignmentMap(booking: Booking): Record<string, string[]> {
  const raw = booking.specialRequests?.[ASSIGNMENT_KEY];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([code, roomNos]) => [
        code,
        Array.isArray(roomNos)
          ? Array.from(new Set(roomNos.filter((value): value is string => typeof value === 'string' && Boolean(value.trim())).map((value) => value.trim())))
          : [],
      ]),
    );
  } catch {
    return {};
  }
}

function bookingRoomNumbers(booking: Booking) {
  const assignedFromMap = Object.values(readAssignmentMap(booking)).flat();
  const extended = booking as Booking & {
    roomNo?: string;
    roomNos?: string[];
    assignedRoomNos?: string[];
  };
  const values = [
    ...assignedFromMap,
    extended.roomNo,
    ...(extended.roomNos ?? []),
    ...(extended.assignedRoomNos ?? []),
  ];
  for (const room of booking.rooms) {
    const extendedRoom = room as typeof room & {
      roomNo?: string;
      roomNos?: string[];
      assignedRoomNos?: string[];
    };
    values.push(
      extendedRoom.roomNo,
      ...(extendedRoom.roomNos ?? []),
      ...(extendedRoom.assignedRoomNos ?? []),
    );
  }
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)).map((value) => value.trim()).filter(Boolean)));
}

function displayDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function totalRooms(booking: Booking) {
  return booking.rooms.reduce((sum, room) => sum + room.count, 0);
}

function bookingRoomEntries(booking: Booking): RoomEntry[] {
  const roomNos = bookingRoomNumbers(booking);
  let roomIndex = 0;
  return booking.rooms.flatMap((room) =>
    Array.from({ length: Math.max(1, room.count) }, (_, index) => {
      const entry = { key: `${room.code}-${index}`, code: room.code, roomNo: roomNos[roomIndex] ?? 'N/A' };
      roomIndex += 1;
      return entry;
    }),
  );
}

function blankGuest(booking: Booking, room: RoomEntry): GuestProfile {
  return {
    id: `checkin-${booking.reference}-${room.roomNo}`,
    name: booking.guest,
    mobile: booking.phone ?? '',
    email: booking.email ?? '',
    nationality: '',
    identityNo: '',
    address: '',
    country: 'Malaysia',
    state: '',
    city: '',
    postcode: '',
    birthDate: '',
    occupation: '',
    accountName: booking.accountName ?? '',
    guestType: 'Guest',
    adultChild: 'Adult',
    remark: '',
    newsletter: false,
    tourismTax: Boolean(booking.tourismTax),
    visits: 0,
    updated: todayKey(),
  };
}

function Field({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  return (
    <label style={{ display: 'grid', gap: 4 }}>
      <span style={{ fontSize: 12, color: '#777' }}>{label}{required ? ' *' : ''}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', outline: 0, padding: '5px 0 7px', fontSize: 15, background: 'transparent' }}
      />
    </label>
  );
}

export function CheckIn({ bookings }: { bookings: Booking[] }) {
  const store = useContext(TransportDataContext);
  const [tab, setTab] = useState<'due' | 'checked'>('due');
  const [query, setQuery] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedFilters>(emptyFilters);
  const [draftFilters, setDraftFilters] = useState<AdvancedFilters>(emptyFilters);
  const [expandedReference, setExpandedReference] = useState<string | null>(null);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [checkInContext, setCheckInContext] = useState<{ booking: Booking; room: RoomEntry } | null>(null);
  const [guestDraft, setGuestDraft] = useState<GuestProfile | null>(null);
  const [savingGuest, setSavingGuest] = useState(false);

  const today = todayKey();
  const due = bookings.filter((booking) => booking.arrival === today && booking.status === 'Booked');
  const checked = bookings.filter((booking) => booking.arrival === today && booking.status === 'Inhouse');
  const activeRoomTypes = (store?.state.hotelMasters.roomTypes ?? []).filter((roomType) => roomType.active);

  useEffect(() => {
    const source = tab === 'due' ? due : checked;
    if (!source.length) {
      setExpandedReference(null);
      return;
    }
    if (!expandedReference || !source.some((booking) => booking.reference === expandedReference)) {
      setExpandedReference(source[0].reference);
    }
  }, [tab, due.length, checked.length, expandedReference]);

  useEffect(() => {
    if (!snackbar) return;
    const timer = window.setTimeout(() => setSnackbar(null), 4000);
    return () => window.clearTimeout(timer);
  }, [snackbar]);

  const rows = (tab === 'due' ? due : checked).filter((booking) => {
    const searchText = `${booking.reference} ${booking.guest} ${booking.accountName ?? ''}`.toLowerCase();
    const queryMatch = searchText.includes(query.trim().toLowerCase());
    const accountMatch = !filters.accountName.trim() || (booking.accountName ?? '').toLowerCase().includes(filters.accountName.trim().toLowerCase());
    const guestMatch = !filters.guestName.trim() || booking.guest.toLowerCase().includes(filters.guestName.trim().toLowerCase());
    const roomTypeMatch = !filters.roomType || booking.rooms.some((room) => room.code === filters.roomType);
    const roomNoMatch = !filters.roomNo.trim() || bookingRoomNumbers(booking).some((roomNo) => roomNo.toLowerCase().includes(filters.roomNo.trim().toLowerCase()));
    return queryMatch && accountMatch && guestMatch && roomTypeMatch && roomNoMatch;
  });

  function openAdvancedSearch() {
    setDraftFilters(filters);
    setAdvancedOpen(true);
  }

  function confirmAdvancedSearch() {
    setFilters(draftFilters);
    setAdvancedOpen(false);
  }

  async function unassignRoom(booking: Booking, room: RoomEntry) {
    if (!store || room.roomNo === 'N/A') return;
    setActionKey(null);
    const assignments = readAssignmentMap(booking);
    const nextAssignments = Object.fromEntries(
      Object.entries(assignments).map(([code, roomNos]) => [code, code === room.code ? roomNos.filter((roomNo) => roomNo !== room.roomNo) : roomNos]),
    );
    const assignedRooms = Array.from(new Set(Object.values(nextAssignments).flat())).length;
    const nextBooking: Booking = {
      ...booking,
      assignedRooms,
      specialRequests: {
        ...(booking.specialRequests ?? {}),
        [ASSIGNMENT_KEY]: JSON.stringify(nextAssignments),
      },
    };
    await store.run({ type: 'bookingUpdate', value: nextBooking });
    setSnackbar('Unassigned Successfully!');
  }

  function beginCheckIn(booking: Booking, room: RoomEntry) {
    if (!store || room.roomNo === 'N/A') return;
    setActionKey(null);
    const roomMaster = booking.rooms.find((item) => item.code === room.code);
    const profileId = roomMaster?.guestProfileIds?.[0];
    const profiles = store.state.guestProfiles ?? [];
    const matched = (profileId ? profiles.find((profile) => profile.id === profileId) : undefined)
      ?? profiles.find((profile) => profile.name.trim().toLowerCase() === booking.guest.trim().toLowerCase());
    setGuestDraft(matched ? { ...matched } : blankGuest(booking, room));
    setCheckInContext({ booking, room });
  }

  async function saveGuestProfile() {
    if (!store || !guestDraft || !checkInContext || savingGuest) return;
    setSavingGuest(true);
    try {
      const nextProfile = { ...guestDraft, updated: todayKey() };
      const nextProfiles = [nextProfile, ...store.state.guestProfiles.filter((profile) => profile.id !== nextProfile.id)];
      await store.run({ type: 'guestProfilesSave', value: nextProfiles });
      setGuestDraft(nextProfile);
      setSnackbar('Guest information saved successfully!');
    } finally {
      setSavingGuest(false);
    }
  }

  if (checkInContext && guestDraft) {
    const { booking, room } = checkInContext;
    const update = (key: keyof GuestProfile, value: string | boolean) => setGuestDraft((current) => current ? ({ ...current, [key]: value } as GuestProfile) : current);
    return (
      <section className="checkin-page" aria-label="Guest Check In" style={{ fontSize: 12, minHeight: '100%' }}>
        <div style={{ padding: '9px 10px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #ddd', paddingBottom: 8 }}>
            <button type="button" onClick={() => { setCheckInContext(null); setGuestDraft(null); }} style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', border: 0, borderRadius: 4, background: '#fff', color: '#ff8700' }} aria-label="Back to Due In"><ChevronLeft size={22} /></button>
            <strong style={{ fontSize: 12 }}>Check-In</strong>
          </div>
          <div style={{ padding: '7px 2px 8px', fontSize: 11, fontWeight: 600 }}>... / ... / {booking.reference}</div>
        </div>

        <div style={{ margin: '0 10px 58px', background: '#fff', borderRadius: 4, boxShadow: '0 1px 5px rgba(0,0,0,.14)', padding: '10px 12px 18px' }}>
          <div style={{ display: 'grid', placeItems: 'center', padding: '0 0 16px' }}>
            <div style={{ width: 210, height: 130, borderRadius: 9, display: 'grid', placeItems: 'center', background: '#e5e5e5', color: '#183b8e' }}><Scan size={56} strokeWidth={1.6} /></div>
            <button type="button" style={{ marginTop: 8, border: 0, borderRadius: 4, background: '#ff9228', color: '#fff', padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, boxShadow: '0 2px 5px rgba(0,0,0,.22)' }}><Scan size={18} /> SCAN ID</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '16px 22px' }}>
            <div style={{ gridColumn: '1 / -1' }}><Field label="Guest Name" required value={guestDraft.name} onChange={(value) => update('name', value)} /></div>
            <Field label="Mobile No" value={guestDraft.mobile} onChange={(value) => update('mobile', value)} />
            <Field label="Email Address" value={guestDraft.email} onChange={(value) => update('email', value)} />
            <Field label="Nationality" required value={guestDraft.nationality} onChange={(value) => update('nationality', value)} />
            <Field label="NRIC No." required value={guestDraft.identityNo} onChange={(value) => update('identityNo', value)} />
            <div style={{ gridColumn: '1 / -1' }}><Field label="Address" value={guestDraft.address} onChange={(value) => update('address', value)} /></div>
            <Field label="Country" value={guestDraft.country} onChange={(value) => update('country', value)} />
            <Field label="State" value={guestDraft.state} onChange={(value) => update('state', value)} />
            <Field label="City" value={guestDraft.city} onChange={(value) => update('city', value)} />
            <Field label="Postcode" value={guestDraft.postcode} onChange={(value) => update('postcode', value)} />
            <Field label="Birth Date" value={guestDraft.birthDate} onChange={(value) => update('birthDate', value)} />
            <Field label="Occupation" value={guestDraft.occupation} onChange={(value) => update('occupation', value)} />
            <Field label="Account Name" value={guestDraft.accountName} onChange={(value) => update('accountName', value)} />
            <Field label="Guest Type" value={guestDraft.guestType} onChange={(value) => update('guestType', value)} />
            <div style={{ gridColumn: '1 / -1' }}><Field label="Remark" value={guestDraft.remark} onChange={(value) => update('remark', value)} /></div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}><input type="checkbox" checked={guestDraft.newsletter} onChange={(event) => update('newsletter', event.target.checked)} /> News Letter</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12 }}><input type="checkbox" checked={guestDraft.tourismTax} onChange={(event) => update('tourismTax', event.target.checked)} /> Tourism Tax</label>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: '#666' }}>Room {room.roomNo} | {room.code} | {displayDate(booking.arrival)} - {displayDate(booking.departure)}</div>
        </div>

        <div style={{ position: 'sticky', bottom: 0, display: 'flex', justifyContent: 'center', padding: '8px 12px', background: '#fff', boxShadow: '0 -1px 6px rgba(0,0,0,.14)' }}>
          <button type="button" onClick={saveGuestProfile} disabled={savingGuest} style={{ minWidth: 190, border: 0, borderRadius: 4, background: '#ff9228', color: '#fff', padding: '10px 18px', fontSize: 14, fontWeight: 700, boxShadow: '0 2px 5px rgba(0,0,0,.2)', opacity: savingGuest ? .6 : 1 }}>{savingGuest ? 'Saving...' : 'E-Registration Card'}</button>
        </div>
        {snackbar && <div style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 200, minWidth: 300, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 22, background: '#353535', color: '#fff', borderRadius: 4, padding: '13px 16px', boxShadow: '0 3px 12px rgba(0,0,0,.28)', fontSize: 12, fontWeight: 600 }}><span>{snackbar}</span><button type="button" onClick={() => setSnackbar(null)} style={{ border: 0, background: 'transparent', color: '#77a8ff', fontWeight: 700, fontSize: 11 }}>DISMISS</button></div>}
      </section>
    );
  }

  return <section className="checkin-page" aria-label="Check In" style={{ fontSize: 12 }}>
    <div className="checkin-tabs" style={{ minHeight: 48 }}>
      <button type="button" className={tab === 'due' ? 'active' : ''} onClick={() => { setTab('due'); setActionKey(null); }} style={{ fontSize: 14, padding: '0 28px', minHeight: 48 }}>Due In ({due.length})</button>
      <button type="button" className={tab === 'checked' ? 'active' : ''} onClick={() => { setTab('checked'); setActionKey(null); }} style={{ fontSize: 14, padding: '0 28px', minHeight: 48 }}>Checked In ({checked.length})</button>
    </div>
    <div className="checkin-search" style={{ minHeight: 46, padding: '0 12px' }}>
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search here..." aria-label="Search check in" style={{ fontSize: 13 }} />
      <button type="button" aria-label="Search"><Search size={18} /></button>
      <button type="button" aria-label="Expand"><Scan size={18} /></button>
      <button type="button" aria-label="Advanced Search" onClick={openAdvancedSearch}><SlidersHorizontal size={18} /></button>
    </div>
    <div className="checkin-body" style={{ padding: '9px 7px' }}>
      {rows.length ? rows.map((booking) => {
        const expanded = expandedReference === booking.reference;
        const rooms = bookingRoomEntries(booking);
        const assignedRoomNos = bookingRoomNumbers(booking);
        const total = totalRooms(booking);
        return (
          <article key={booking.reference} style={{ marginBottom: 7, borderRadius: 4, background: '#fff', boxShadow: '0 1px 5px rgba(0,0,0,.12)', overflow: 'visible' }}>
            <button type="button" onClick={() => { setExpandedReference(expanded ? null : booking.reference); setActionKey(null); }} style={{ width: '100%', minHeight: 54, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', border: 0, background: '#fff', color: '#111', textAlign: 'left', outline: 'none', boxShadow: 'none' }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 800, textDecoration: 'underline', lineHeight: 1.3 }}>{booking.reference} <span style={{ textDecoration: 'none' }}>|</span> {booking.guest.toUpperCase()}</span>
                <span style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2, fontSize: 11, fontWeight: 600 }}>
                  {displayDate(booking.arrival)} - {displayDate(booking.departure)} <BedDouble size={13} color="#214a9c" /> <span style={{ color: '#ef233c' }}>{booking.assignedRooms}</span>/{total}
                  {assignedRoomNos.length > 0 && <span style={{ marginLeft: 5, color: '#444', fontWeight: 600 }}>{assignedRoomNos.join(', ')}</span>}
                </span>
              </span>
              {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </button>

            {expanded && <div style={{ borderTop: '1px solid #ddd' }}>
              {rooms.map((room, roomIndex) => {
                const menuKey = `${booking.reference}-${room.key}`;
                const assigned = room.roomNo !== 'N/A';
                return (
                  <div key={room.key} style={{ position: 'relative', minHeight: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 10px', borderTop: roomIndex ? '1px solid #eee' : 0, background: '#fff' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800 }}><UserRound size={12} fill="#111" />{booking.guest.toUpperCase()}</div>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2, fontSize: 11 }}>
                        <span style={{ color: assigned ? '#34cdb1' : '#ff234d', fontWeight: 700 }}>{room.roomNo}</span><span>|</span><strong>{room.code}</strong><span>|</span><BedDouble size={12} color="#214a9c" /><span>{displayDate(booking.arrival)} - {displayDate(booking.departure)}</span>
                      </div>
                    </div>
                    <div style={{ position: 'relative', flex: '0 0 auto' }}>
                      <button type="button" aria-label="Room actions" onClick={() => setActionKey(actionKey === menuKey ? null : menuKey)} style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', border: 0, borderRadius: 3, background: 'transparent', color: '#111', outline: 'none', boxShadow: 'none' }}><MoreVertical size={18} /></button>
                      {actionKey === menuKey && tab === 'due' && <div style={{ position: 'absolute', zIndex: 50, top: 30, right: 0, width: assigned ? 150 : 138, padding: '4px 0', borderRadius: 3, background: '#fff', boxShadow: '0 5px 18px rgba(0,0,0,.28)' }}>
                        {assigned ? <>
                          <button type="button" onClick={() => unassignRoom(booking, room)} style={{ width: '100%', padding: '9px 11px', border: 0, background: '#fff', color: '#333', textAlign: 'left', fontSize: 12 }}>Unassign Room</button>
                          <button type="button" onClick={() => beginCheckIn(booking, room)} style={{ width: '100%', padding: '9px 11px', border: 0, background: '#fff', color: '#333', textAlign: 'left', fontSize: 12 }}>Check In</button>
                        </> : <button type="button" onClick={async () => { setActionKey(null); await store?.run({ type: 'roomingEnsure', reference: booking.reference }); window.dispatchEvent(new CustomEvent('hotelx-checkin-assign-room', { detail: { reference: booking.reference } })); }} style={{ width: '100%', padding: '9px 11px', border: 0, background: '#fff', color: '#333', textAlign: 'left', fontSize: 12 }}>Assign Room</button>}
                      </div>}
                    </div>
                  </div>
                );
              })}
            </div>}
          </article>
        );
      }) : <p className="checkin-empty">No Record Found</p>}
    </div>

    {advancedOpen && <div role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setAdvancedOpen(false); }} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, background: 'rgba(0, 0, 0, 0.48)' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="advanced-search-title" style={{ width: 'min(610px, calc(100vw - 32px))', background: '#fff', border: '1px solid #d8d8d8', boxShadow: '0 18px 46px rgba(0, 0, 0, 0.28)' }}>
        <div style={{ padding: '14px 14px 10px', background: '#fff8ef' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <strong id="advanced-search-title" style={{ color: '#f28c00', fontSize: 15 }}>Advance Search</strong>
            <button type="button" onClick={() => setDraftFilters(emptyFilters)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, minHeight: 32, padding: '5px 11px', border: '1px solid #ffb249', borderRadius: 4, background: '#fff', color: '#f28c00', fontSize: 13, fontWeight: 600 }}><RotateCcw size={15} /> Reset</button>
          </div>
          <div style={{ height: 1, marginTop: 10, background: '#eadfce' }} />
        </div>
        <div style={{ padding: '26px 14px 12px' }}>
          <div style={{ display: 'grid', gap: 25 }}>
            <input type="text" value={draftFilters.accountName} onChange={(event) => setDraftFilters((current) => ({ ...current, accountName: event.target.value }))} placeholder="Account Name" aria-label="Account Name" autoFocus style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, background: 'transparent' }} />
            <input type="text" value={draftFilters.guestName} onChange={(event) => setDraftFilters((current) => ({ ...current, guestName: event.target.value }))} placeholder="Guest Name" aria-label="Guest Name" style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, background: 'transparent' }} />
            <select value={draftFilters.roomType} onChange={(event) => setDraftFilters((current) => ({ ...current, roomType: event.target.value }))} aria-label="Room Type" style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, color: draftFilters.roomType ? '#242424' : '#888', background: 'transparent' }}>
              <option value="">Room Type</option>{activeRoomTypes.map((roomType) => <option key={roomType.code} value={roomType.code}>{roomType.code} - {roomType.description}</option>)}
            </select>
            <input type="text" value={draftFilters.roomNo} onChange={(event) => setDraftFilters((current) => ({ ...current, roomNo: event.target.value }))} placeholder="Room No" aria-label="Room No" style={{ width: '100%', border: 0, borderBottom: '1px solid #aaa', borderRadius: 0, outline: 0, padding: '7px 0', fontSize: 16, background: 'transparent' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 32, paddingBottom: 4 }}>
            <button type="button" onClick={() => setAdvancedOpen(false)} style={{ border: 0, borderRadius: 4, background: '#f79400', color: '#fff', padding: '8px 13px', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,.18)' }}>Cancel</button>
            <button type="button" onClick={confirmAdvancedSearch} style={{ border: 0, borderRadius: 4, background: '#f79400', color: '#fff', padding: '8px 13px', fontSize: 13, fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,.18)' }}>Confirm</button>
          </div>
        </div>
      </div>
    </div>}

    {snackbar && <div style={{ position: 'fixed', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 200, minWidth: 300, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 22, background: '#353535', color: '#fff', borderRadius: 4, padding: '13px 16px', boxShadow: '0 3px 12px rgba(0,0,0,.28)', fontSize: 12, fontWeight: 600 }}><span>{snackbar}</span><button type="button" onClick={() => setSnackbar(null)} style={{ border: 0, background: 'transparent', color: '#77a8ff', fontWeight: 700, fontSize: 11 }}>DISMISS</button></div>}
  </section>;
}
