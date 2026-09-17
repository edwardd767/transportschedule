'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowLeft, Pencil, QrCode, Upload, X } from 'lucide-react';
import { initialHotelProfile, type HotelProfile } from '@/lib/hotel-masters';
import { fallbackGeography } from '@/lib/geography';

const HOTEL_TYPE_OPTIONS = ['Apartment', 'Bungalow', 'Cabin', 'Campsite', 'Cottage', 'Dorm', 'Room', 'Villa'];

type Tab = 'Profile' | 'About' | 'Gallery' | 'Facilities';
type EditScreen = 'hotel' | 'contact' | 'about' | 'gallery';

type HotelSetupExtras = {
  hotelCode: string;
  hotelWebsiteUrl: string;
  enableOnlineBooking: boolean;
  msicCode: string;
  aboutHotel: string;
  logoName: string;
  logoPreview: string;
  galleryNames: string[];
  galleryPreviews: string[];
};

const emptyExtras: HotelSetupExtras = {
  hotelCode: '',
  hotelWebsiteUrl: '',
  enableOnlineBooking: false,
  msicCode: '',
  aboutHotel: '',
  logoName: '',
  logoPreview: '',
  galleryNames: [],
  galleryPreviews: [],
};

function Row({ label, value, full = false }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? 'hotel-setup-row full' : 'hotel-setup-row'}>
      <span className="desc">{label}</span>
      <div className="value">{value || '\u00a0'}</div>
    </div>
  );
}

function Field({
  label,
  value,
  required,
  full,
  children,
}: {
  label: string;
  value: string;
  required?: boolean;
  full?: boolean;
  children?: ReactNode;
}) {
  return (
    <label className="hotel-setup-field" data-filled={value ? 'true' : 'false'} data-full={full ? 'true' : undefined}>
      <span className="label">{label}{required ? ' *' : ''}</span>
      {children}
    </label>
  );
}

export function HotelSetupModule({
  profile,
  onChange,
}: {
  profile: HotelProfile;
  onChange: (value: HotelProfile) => void | Promise<void>;
  onBack?: () => void;
}) {
  const [draft, setDraft] = useState<HotelProfile>(profile?.hotelName ? profile : initialHotelProfile);
  const [extras, setExtras] = useState<HotelSetupExtras>(emptyExtras);
  const [tab, setTab] = useState<Tab>('Profile');
  const [edit, setEdit] = useState<EditScreen | null>(null);
  const [saving, setSaving] = useState(false);
  const baseline = useRef<string | null>(null);

  useEffect(() => setDraft(profile?.hotelName ? profile : initialHotelProfile), [profile]);
  useEffect(() => {
    baseline.current = edit ? JSON.stringify({ draft, extras }) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit]);

  const set = (key: keyof HotelProfile, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const countries = fallbackGeography.countries;
  const states = fallbackGeography.states[draft.country] ?? [];
  const dirty = baseline.current !== null && JSON.stringify({ draft, extras }) !== baseline.current;

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

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    setExtras((current) => ({ ...current, logoName: file.name, logoPreview: URL.createObjectURL(file) }));
  };
  const pickGallery = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    setExtras((current) => ({
      ...current,
      galleryNames: list.map((file) => file.name),
      galleryPreviews: list.map((file) => URL.createObjectURL(file)),
    }));
  };

  if (edit) {
    const title = edit === 'hotel' ? 'Hotel Information' : edit === 'contact' ? 'Contact' : edit === 'about' ? 'Hotel Description' : 'Gallery';
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
              <Field label="Hotel Name" value={draft.hotelName} required full>
                <input value={draft.hotelName} onChange={(e) => set('hotelName', e.target.value)} />
              </Field>
              <Field label="Hotel Code" value={extras.hotelCode} required full>
                <input value={extras.hotelCode} onChange={(e) => setExtras((c) => ({ ...c, hotelCode: e.target.value }))} />
              </Field>
              <Field label="Address" value={draft.address} full>
                <input value={draft.address} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <Field label="Postcode" value={draft.postcode}>
                <input type="tel" value={draft.postcode} onChange={(e) => set('postcode', e.target.value)} />
              </Field>
              <Field label="Country" value={draft.country} required>
                <select value={draft.country} onChange={(e) => setDraft((c) => ({ ...c, country: e.target.value, state: '' }))}>
                  <option value="" />
                  {countries.map((country) => <option key={country} value={country}>{country}</option>)}
                </select>
              </Field>
              <Field label="City" value={draft.city}>
                <input value={draft.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
              <Field label="State" value={draft.state} required>
                <select value={draft.state} onChange={(e) => set('state', e.target.value)}>
                  <option value="" />
                  {states.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
              </Field>
              <Field label="Hotel Type" value={draft.hotelType}>
                <select value={draft.hotelType} onChange={(e) => set('hotelType', e.target.value)}>
                  <option value="" />
                  {HOTEL_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </Field>
              <Field label="Company" value={draft.companyName}>
                <select value={draft.companyName} onChange={(e) => set('companyName', e.target.value)}>
                  <option value="" />
                  {draft.companyName ? <option value={draft.companyName}>{draft.companyName}</option> : null}
                </select>
              </Field>
              <Field label="MSIC Code" value={extras.msicCode} required>
                <input value={extras.msicCode} onChange={(e) => setExtras((c) => ({ ...c, msicCode: e.target.value }))} />
              </Field>
              <Field label="MSIC Description" value={extras.msicCode === '55101' ? 'Hotels and resort hotels' : ''}>
                <input value={extras.msicCode === '55101' ? 'Hotels and resort hotels' : ''} readOnly disabled />
              </Field>

              <div className="hotel-setup-field" data-filled={extras.logoName ? 'true' : 'false'} data-full="true">
                <span className="label">Upload Logo Attachment</span>
                <span className="hotel-setup-upload">
                  <input type="file" accept="image/*" onChange={(e) => pickLogo(e.target.files?.[0])} />
                  <Upload size={20} />
                </span>
                {extras.logoPreview ? (
                  <div className="hotel-setup-thumb">
                    <img src={extras.logoPreview} alt={extras.logoName} />
                    <button type="button" aria-label="Remove logo" onClick={() => setExtras((c) => ({ ...c, logoName: '', logoPreview: '' }))}>
                      <X size={12} />
                    </button>
                  </div>
                ) : null}
              </div>

              <Field label="Online Booking URL" value={draft.onlineBookingUrl} full>
                <input value={draft.onlineBookingUrl} disabled={!extras.enableOnlineBooking} onChange={(e) => set('onlineBookingUrl', e.target.value)} />
              </Field>
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
              <Field label="Contact Person" value={draft.contactPerson} required>
                <input value={draft.contactPerson} onChange={(e) => set('contactPerson', e.target.value)} />
              </Field>
              <Field label="Phone No." value={draft.phoneNo}>
                <input type="tel" value={draft.phoneNo} onChange={(e) => set('phoneNo', e.target.value)} />
              </Field>
              <Field label="Mobile No." value={draft.mobileNo}>
                <input type="tel" value={draft.mobileNo} onChange={(e) => set('mobileNo', e.target.value)} />
              </Field>
              <Field label="Reservation Email" value={draft.reservationEmail}>
                <input type="email" value={draft.reservationEmail} onChange={(e) => set('reservationEmail', e.target.value)} />
              </Field>
              <Field label="Business Email" value={draft.businessEmail}>
                <input type="email" value={draft.businessEmail} onChange={(e) => set('businessEmail', e.target.value)} />
              </Field>
              <Field label="Hotel Website URL" value={extras.hotelWebsiteUrl}>
                <input type="url" value={extras.hotelWebsiteUrl} onChange={(e) => setExtras((c) => ({ ...c, hotelWebsiteUrl: e.target.value }))} />
              </Field>
            </div>
          </div>
        )}

        {edit === 'about' && (
          <div className="hotel-setup-edit-card">
            <div className="hotel-setup-edit-grid">
              <div className="hotel-setup-field" data-filled={extras.aboutHotel ? 'true' : 'false'} data-full="true">
                <span className="label">Upload About Hotel Attachment</span>
                <span className="hotel-setup-upload">
                  <input type="file" onChange={(e) => { const f = e.target.files?.[0]; if (f) setExtras((c) => ({ ...c, logoName: f.name })); }} />
                  <Upload size={20} />
                </span>
              </div>
              <label className="hotel-setup-field" data-filled={extras.aboutHotel ? 'true' : 'false'} data-full="true">
                <span className="label">About Hotel</span>
                <textarea rows={8} value={extras.aboutHotel} onChange={(e) => setExtras((c) => ({ ...c, aboutHotel: e.target.value }))} />
              </label>
            </div>
          </div>
        )}

        {edit === 'gallery' && (
          <div className="hotel-setup-edit-card">
            <div className="hotel-setup-edit-grid">
              <div className="hotel-setup-field" data-filled={extras.galleryNames.length ? 'true' : 'false'} data-full="true">
                <span className="label">Upload Gallery Attachment</span>
                <span className="hotel-setup-upload">
                  <input type="file" accept="image/*" multiple onChange={(e) => pickGallery(e.target.files)} />
                  <Upload size={20} />
                </span>
                <small className="hotel-setup-hint">Cannot upload more than the maximum file size (100mb)</small>
                {extras.galleryPreviews.length ? (
                  <div className="hotel-setup-thumbs">
                    {extras.galleryPreviews.map((src, index) => (
                      <div className="hotel-setup-thumb" key={src}>
                        <img src={src} alt={extras.galleryNames[index]} />
                        <button
                          type="button"
                          aria-label={`Remove ${extras.galleryNames[index]}`}
                          onClick={() => setExtras((c) => ({
                            ...c,
                            galleryNames: c.galleryNames.filter((_, i) => i !== index),
                            galleryPreviews: c.galleryPreviews.filter((_, i) => i !== index),
                          }))}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        )}

        <div className="hotel-setup-footer">
          <button type="button" className="hotel-setup-save" disabled={!dirty || saving} onClick={saveEdit}>
            {saving ? 'Saving…' : 'Save'}
          </button>
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
