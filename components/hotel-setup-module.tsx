'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Pencil, QrCode, Upload } from 'lucide-react';
import { initialHotelProfile, type HotelProfile } from '@/lib/hotel-masters';

const HOTEL_TYPE_OPTIONS = ['Apartment', 'Bungalow', 'Cabin', 'Campsite', 'Cottage', 'Dorm', 'Room', 'Villa'];

type Tab = 'Profile' | 'About' | 'Gallery' | 'Facilities';
type EditScreen = 'hotel' | 'contact' | 'about' | 'gallery';

type HotelSetupExtras = {
  hotelCode: string;
  hotelWebsiteUrl: string;
  enableOnlineBooking: boolean;
  aboutHotel: string;
  logoName: string;
  galleryNames: string[];
};

const emptyExtras: HotelSetupExtras = {
  hotelCode: '',
  hotelWebsiteUrl: '',
  enableOnlineBooking: false,
  aboutHotel: '',
  logoName: '',
  galleryNames: [],
};

function Row({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'hotel-setup-row full' : 'hotel-setup-row'}>
      <span className="desc">{label}</span>
      <div className="value">{value || '\u00a0'}</div>
    </div>
  );
}

export function HotelSetupModule({
  profile,
  onChange,
  onBack,
}: {
  profile: HotelProfile;
  onChange: (value: HotelProfile) => void | Promise<void>;
  onBack: () => void;
}) {
  const [draft, setDraft] = useState<HotelProfile>(profile?.hotelName ? profile : initialHotelProfile);
  const [extras, setExtras] = useState<HotelSetupExtras>(emptyExtras);
  const [tab, setTab] = useState<Tab>('Profile');
  const [edit, setEdit] = useState<EditScreen | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(profile?.hotelName ? profile : initialHotelProfile), [profile]);

  const set = (key: keyof HotelProfile, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const saveEdit = async () => {
    if (edit === 'hotel' || edit === 'contact') {
      setSaving(true);
      try {
        await onChange(draft);
      } finally {
        setSaving(false);
      }
    }
    setEdit(null);
  };

  if (edit) {
    const title =
      edit === 'hotel' ? 'Hotel Information' : edit === 'contact' ? 'Contact' : edit === 'about' ? 'Hotel Description' : 'Gallery';
    return (
      <section className="master-page hotel-setup-edit-page" aria-label={title}>
        <div className="hotel-setup-edit-head">
          <button type="button" className="master-back" onClick={() => setEdit(null)}>
            <ArrowLeft size={18} /> Back
          </button>
          <strong>{title}</strong>
          <small>Edit</small>
        </div>

        {edit === 'hotel' && (
          <div className="hotel-setup-edit-card">
            <div className="hotel-setup-edit-grid">
              <label className="hotel-setup-field full"><span>Hotel Name *</span><input required value={draft.hotelName} onChange={(e) => set('hotelName', e.target.value)} /></label>
              <label className="hotel-setup-field full"><span>Hotel Code *</span><input required value={extras.hotelCode} onChange={(e) => setExtras((c) => ({ ...c, hotelCode: e.target.value }))} /></label>
              <label className="hotel-setup-field full"><span>Address</span><input value={draft.address} onChange={(e) => set('address', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>Postcode</span><input type="tel" value={draft.postcode} onChange={(e) => set('postcode', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>Country *</span><input required value={draft.country} onChange={(e) => set('country', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>City</span><input value={draft.city} onChange={(e) => set('city', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>State</span><input value={draft.state} onChange={(e) => set('state', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>Hotel Type</span>
                <select value={draft.hotelType} onChange={(e) => set('hotelType', e.target.value)}>
                  <option value="">Select hotel type</option>
                  {HOTEL_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              <label className="hotel-setup-field"><span>Company</span><input value={draft.companyName} onChange={(e) => set('companyName', e.target.value)} /></label>
              <label className="hotel-setup-field full">
                <span>Upload Logo Attachment</span>
                <span className="hotel-setup-upload">
                  <input type="file" accept="image/*" onChange={(e) => setExtras((c) => ({ ...c, logoName: e.target.files?.[0]?.name ?? '' }))} />
                  <Upload size={18} />
                  <b>{extras.logoName || 'Choose file'}</b>
                </span>
              </label>
              <label className="hotel-setup-field full"><span>Online Booking URL</span><input value={draft.onlineBookingUrl} disabled={!extras.enableOnlineBooking} onChange={(e) => set('onlineBookingUrl', e.target.value)} /></label>
              <label className="hotel-setup-switch">
                <span>Enable Online Booking:</span>
                <input type="checkbox" checked={extras.enableOnlineBooking} onChange={(e) => setExtras((c) => ({ ...c, enableOnlineBooking: e.target.checked }))} />
              </label>
            </div>
          </div>
        )}

        {edit === 'contact' && (
          <div className="hotel-setup-edit-card">
            <div className="hotel-setup-edit-grid">
              <label className="hotel-setup-field"><span>Contact Person *</span><input required value={draft.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>Phone No.</span><input type="tel" value={draft.phoneNo} onChange={(e) => set('phoneNo', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>Mobile No.</span><input type="tel" value={draft.mobileNo} onChange={(e) => set('mobileNo', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>Reservation Email</span><input type="email" value={draft.reservationEmail} onChange={(e) => set('reservationEmail', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>Business Email</span><input type="email" value={draft.businessEmail} onChange={(e) => set('businessEmail', e.target.value)} /></label>
              <label className="hotel-setup-field"><span>Hotel Website URL</span><input type="url" value={extras.hotelWebsiteUrl} onChange={(e) => setExtras((c) => ({ ...c, hotelWebsiteUrl: e.target.value }))} /></label>
            </div>
          </div>
        )}

        {edit === 'about' && (
          <div className="hotel-setup-edit-card">
            <div className="hotel-setup-edit-grid">
              <label className="hotel-setup-field full">
                <span>Upload About Hotel Attachment</span>
                <span className="hotel-setup-upload">
                  <input type="file" onChange={(e) => setExtras((c) => ({ ...c, logoName: e.target.files?.[0]?.name ?? c.logoName }))} />
                  <Upload size={18} />
                  <b>Choose file</b>
                </span>
              </label>
              <label className="hotel-setup-field full"><span>About Hotel</span><textarea rows={8} value={extras.aboutHotel} onChange={(e) => setExtras((c) => ({ ...c, aboutHotel: e.target.value }))} /></label>
            </div>
          </div>
        )}

        {edit === 'gallery' && (
          <div className="hotel-setup-edit-card">
            <div className="hotel-setup-edit-grid">
              <label className="hotel-setup-field full">
                <span>Upload Gallery Attachment</span>
                <span className="hotel-setup-upload">
                  <input type="file" accept="image/*" multiple onChange={(e) => setExtras((c) => ({ ...c, galleryNames: Array.from(e.target.files ?? []).map((f) => f.name) }))} />
                  <Upload size={18} />
                  <b>{extras.galleryNames.length ? `${extras.galleryNames.length} file(s) selected` : 'Choose files'}</b>
                </span>
                <small className="hotel-setup-hint">Cannot upload more than the maximum file size (100mb)</small>
              </label>
            </div>
          </div>
        )}

        <div className="master-page-actions">
          <button type="button" className="primary-button" disabled={saving} onClick={saveEdit}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </section>
    );
  }

  return (
    <section className="master-page hotel-setup-page" aria-label="Hotel Setup">
      <div className="hotel-setup-tabs">
        {(['Profile', 'About', 'Gallery', 'Facilities'] as Tab[]).map((item) => (
          <button key={item} type="button" className={tab === item ? 'active' : ''} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>

      {tab === 'Profile' && (
        <>
          <div className="hotel-setup-card">
            <div className="hotel-setup-card-head">
              <strong>Hotel Information</strong>
              <div className="hotel-setup-card-actions">
                <button type="button" aria-label="QR Code"><QrCode size={26} /></button>
                <button type="button" aria-label="Edit" onClick={() => setEdit('hotel')}><Pencil size={18} /></button>
              </div>
            </div>
            <div className="hotel-setup-card-body">
              <Row label="Hotel Name" value={draft.hotelName} full />
              <Row label="Address" value={[draft.address, `${draft.postcode} ${draft.city}`, `${draft.state}, ${draft.country}`].filter((line) => line.trim()).join('\n')} full />
              <Row label="Hotel Type" value={draft.hotelType} />
              <Row label="Company Name" value={draft.companyName} />
              <Row label="Company Reg. No" value={draft.companyRegNo} />
              <Row label="SST Reg. No" value={draft.sstRegNo} />
              <Row label="TTx Reg. No" value={draft.ttxRegNo} />
              <Row label="Online Booking URL" value={draft.onlineBookingUrl} />
              <Row label="" value={extras.logoName || 'No logo attached'} />
              <Row label="Live Run Date" value={draft.liveRunDate || '-'} />
            </div>
          </div>

          <div className="hotel-setup-card">
            <div className="hotel-setup-card-head">
              <strong>Contact</strong>
              <div className="hotel-setup-card-actions">
                <button type="button" aria-label="Edit" onClick={() => setEdit('contact')}><Pencil size={18} /></button>
              </div>
            </div>
            <div className="hotel-setup-card-body">
              <Row label="Contact Person" value={draft.contactPerson} />
              <Row label="Phone No" value={draft.phoneNo} />
              <Row label="Mobile No" value={draft.mobileNo} />
              <Row label="Reservation Email" value={draft.reservationEmail} />
              <Row label="Business Email" value={draft.businessEmail} />
              <Row label="Hotel Website URL" value={extras.hotelWebsiteUrl} />
            </div>
          </div>
        </>
      )}

      {tab === 'About' && (
        <div className="hotel-setup-card">
          <div className="hotel-setup-card-head">
            <strong>Hotel Description</strong>
            <div className="hotel-setup-card-actions">
              <button type="button" aria-label="Edit" onClick={() => setEdit('about')}><Pencil size={18} /></button>
            </div>
          </div>
          <div className="hotel-setup-card-body">
            <div className="hotel-setup-about">{extras.aboutHotel || 'No description attached'}</div>
          </div>
        </div>
      )}

      {tab === 'Gallery' && (
        <div className="hotel-setup-card">
          <div className="hotel-setup-card-head">
            <strong>Gallery</strong>
            <div className="hotel-setup-card-actions">
              <button type="button" aria-label="Edit" onClick={() => setEdit('gallery')}><Pencil size={18} /></button>
            </div>
          </div>
          <div className="hotel-setup-card-body">
            <div className="hotel-setup-about">
              {extras.galleryNames.length ? `${extras.galleryNames.length} image(s) attached` : 'No gallery attached'}
            </div>
          </div>
        </div>
      )}

      {tab === 'Facilities' && (
        <div className="hotel-setup-card">
          <div className="hotel-setup-card-body">
            <div className="hotel-setup-about">No facilities configured.</div>
          </div>
        </div>
      )}
    </section>
  );
}
