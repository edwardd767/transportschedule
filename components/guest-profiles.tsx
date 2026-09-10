'use client';

import { MoreVertical, Plus, Search, SlidersHorizontal, UserRound } from 'lucide-react';
import { useState } from 'react';
import type { GuestProfile } from '@/lib/transport-state';
import { geography } from '@/lib/geography';

const blank = (): GuestProfile => ({ id: crypto.randomUUID(), name: '', mobile: '', email: '', nationality: 'Malaysian', identityNo: '', address: '', country: 'Malaysia', state: '', city: '', postcode: '', birthDate: '', occupation: '', accountName: '', guestType: 'Normal', adultChild: 'Adult', remark: '', newsletter: false, tourismTax: false, visits: 0, updated: new Date().toISOString().slice(0, 10) });

function formatUpdated(value: string) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function GuestProfiles({ profiles, onSave }: { profiles: GuestProfile[]; onSave: (value: GuestProfile[]) => Promise<void> }) {
  const [editing, setEditing] = useState<GuestProfile | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [visitsOnly, setVisitsOnly] = useState(false);
  const visible = profiles.filter((profile) => (!visitsOnly || profile.visits > 0) && `${profile.name} ${profile.email} ${profile.mobile}`.toLowerCase().includes(query.trim().toLowerCase()));
  const save = async () => { if (!editing?.name.trim()) return; await onSave([editing, ...profiles.filter(item => item.id !== editing.id)]); setEditing(null); };
  if (editing) { const states = geography.states[editing.country] || []; const cities = geography.cities[`${editing.country}|${editing.state}`] || []; const update = (key: keyof GuestProfile, value: string) => setEditing({ ...editing, [key]: value, ...(key === 'country' ? { state: '', city: '' } : key === 'state' ? { city: '' } : {}) } as GuestProfile); return <section className="guest-profile-page"><div className="guest-profile-banner"><button onClick={() => setEditing(null)}>‹</button><strong>Guest Profile</strong></div><div className="guest-profile-card"><h2>Guest Information</h2><div className="guest-profile-grid">{([['name','Guest Name *'],['mobile','Mobile No. (Optional)'],['adultChild','Adult/Child *'],['email','Email Address *'],['nationality','Nationality *'],['identityNo','IC No / Passport No *'],['address','Address'],['country','Country *'],['state','State *'],['city','City'],['postcode','Postcode'],['birthDate','Birth Date'],['occupation','Occupation'],['accountName','Account Name (If applicable)'],['guestType','Guest Type *'],['remark','Remark']] as const).map(([key,label]) => <label key={key}><span>{label}</span>{key === 'adultChild' ? <select value={editing.adultChild || 'Adult'} onChange={event => update(key, event.target.value)}><option>Adult</option><option>Child</option></select> : key === 'country' ? <select value={editing.country} onChange={event => update(key, event.target.value)}>{geography.countries.map(item => <option key={item}>{item}</option>)}</select> : key === 'state' ? <select value={editing.state} onChange={event => update(key, event.target.value)}><option value="">Select state</option>{states.map(item => <option key={item}>{item}</option>)}</select> : key === 'city' ? <select value={editing.city} onChange={event => update(key, event.target.value)}><option value="">Select city</option>{cities.map(item => <option key={item}>{item}</option>)}</select> : <input value={editing[key]} onChange={event => update(key, event.target.value)} />}</label>)}<label className="guest-toggle"><span>News Letter</span><input type="checkbox" checked={editing.newsletter} onChange={event => setEditing({ ...editing, newsletter: event.target.checked })} /></label><label className="guest-toggle"><span>Tourism Tax</span><input type="checkbox" checked={editing.tourismTax} onChange={event => setEditing({ ...editing, tourismTax: event.target.checked })} /></label></div></div><div className="guest-profile-actions"><button onClick={() => setEditing(null)}>Cancel</button><button className="primary-button" onClick={save}>Save</button></div></section>; }
  return <section className="guest-profile-page">
    <div className="guest-profile-banner"><strong>Guest Profile</strong></div>
    <div className="guest-profile-list-head">
      <strong>Guests (<em>{profiles.length}</em>)</strong>
      <div className="guest-profile-list-tools">
        <button type="button" aria-label="Search guests" aria-pressed={searchOpen} onClick={() => setSearchOpen(!searchOpen)}><Search size={21} /></button>
        <button type="button" aria-label="Filter guests" aria-pressed={visitsOnly} onClick={() => setVisitsOnly(!visitsOnly)}><SlidersHorizontal size={21} /></button>
        <button type="button" aria-label="Add guest" onClick={() => setEditing(blank())}><Plus size={21} /></button>
      </div>
    </div>
    {searchOpen && <div className="guest-profile-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search guest" /></div>}
    <div className="guest-profile-list">
      {visible.map((profile) => (
        <button className="guest-profile-row" key={profile.id} onClick={() => setEditing(profile)}>
          <span className="guest-profile-row-icon"><UserRound size={16} /></span>
          <span className="guest-profile-row-main">
            <strong>{profile.name}</strong>
            {profile.email ? <span className="guest-profile-row-email">{profile.email}</span> : null}
            <small>No. Of Visit: <b>{profile.visits}</b></small>
          </span>
          <span className="guest-profile-row-meta">
            {profile.mobile ? <span>{profile.mobile}</span> : null}
            <time>{formatUpdated(profile.updated)}</time>
          </span>
          <MoreVertical size={18} />
        </button>
      ))}
    </div>
  </section>;
}
