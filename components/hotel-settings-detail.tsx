
'use client';

import {
  ArrowLeft,
  BedDouble,
  Building2,
  ClipboardList,
  ChevronRight,
  MoreVertical,
  Layers3,
  Network,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { RateSetupModule, type RateSetupSection } from '@/components/rate-setup';
import { initialRateSetupData, type RateSetupData } from '@/lib/rate-setup-data';
import { RoomStatusModule } from '@/components/room-status-module';
import { DepartmentModule } from '@/components/department-module-polished';
import { initialHotelProfile, type HotelDepartment, type HotelRoomType, type RoomStatus, type HotelProfile } from '@/lib/hotel-masters';
import { HotelSetupModule as HotelSetupModuleV2 } from '@/components/hotel-setup-module';


function StandardPolicyModule({ onBack, profile, onProfileChange }: { onBack: () => void; profile: HotelProfile; onProfileChange: (value: HotelProfile) => void | Promise<void> }) {
  const [policy, setPolicy] = useState<string | null>(null);
  if (policy === 'General Policy') return <GeneralPolicyModule profile={profile} onProfileChange={onProfileChange} onBack={() => setPolicy(null)} />;
  const policies = ['Hotel Operational Policy', 'Security Deposit Policy', 'State & Tourism Tax', 'Room Status Policy', 'General Policy', 'Terms & Conditions', 'Advance Payment Policy', 'e-Invoice Policy'];
  return <section className="master-page standard-policy-page" aria-label="Standard Policy & Guidelines"><div className="standard-policy-list">{policies.map((item) => <button className="standard-policy-row" type="button" key={item} onClick={() => item === 'General Policy' && setPolicy(item)}><strong>{item}</strong>{item === 'State & Tourism Tax' ? <MoreVertical size={22} /> : <ChevronRight size={24} />}</button>)}</div><button className="secondary-button master-page-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to Hotel Settings</button></section>;
}

function GeneralPolicyModule({ onBack, profile, onProfileChange }: { onBack: () => void; profile: HotelProfile; onProfileChange: (value: HotelProfile) => void | Promise<void> }) {
  const [days, setDays] = useState(String(profile.bookingCancellationDays ?? 3));
  const [currency, setCurrency] = useState(profile.currencyCode || 'MYR');
  const [floatAmount, setFloatAmount] = useState(String(profile.floatAmount ?? 0));
  const [paxCount, setPaxCount] = useState(profile.paxCount || 'No. of Guest Profile Created');
  const [childRatesApplied, setChildRatesApplied] = useState(Boolean(profile.childRatesApplied));
  return <section className="master-page general-policy-page" aria-label="General Policy">
    <div className="general-policy-head"><strong>General Policy</strong></div>
    <div className="general-policy-card">
      <label>Booking Cancellation Policy (days) *<input type="number" min="0" value={days} onChange={(event) => setDays(event.target.value)} /></label>
      <label>Currency Code *<input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
      <label>Float Amount *<input type="number" min="0" step="0.01" value={floatAmount} onChange={(event) => setFloatAmount(event.target.value)} /></label>
      <label>Pax Count *<select value={paxCount} onChange={(event) => setPaxCount(event.target.value)}><option>No. of Guest Profile Created</option><option>No. of Pax Manual Updated</option></select></label>
      <label className="general-policy-toggle"><span>Child Rates Applied</span><input type="checkbox" checked={childRatesApplied} onChange={(event) => setChildRatesApplied(event.target.checked)} /><i /></label>
    </div>
    <div className="master-page-actions"><button className="secondary-button" type="button" onClick={onBack}>Back to Standard Policy</button><button className="primary-button" type="button" onClick={async () => { await onProfileChange({ ...profile, bookingCancellationDays: Number(days), currencyCode: currency, floatAmount: Number(floatAmount), paxCount, childRatesApplied }); }}>Save</button></div>
  </section>;
}

function HotelSetupModule({ profile, onChange, onBack }: { profile: HotelProfile; onChange: (value: HotelProfile) => void | Promise<void>; onBack: () => void }) {
  const [draft, setDraft] = useState(profile?.hotelName ? profile : initialHotelProfile); const [editing, setEditing] = useState(false); const [tab, setTab] = useState('Profile');
  useEffect(() => setDraft(profile?.hotelName ? profile : initialHotelProfile), [profile]);
  const field = (key: keyof HotelProfile, label: string) => <label className="hotel-profile-field"><span>{label}</span><input value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} /></label>;
  return <section className="master-page hotel-profile-page"><div className="hotel-profile-tabs">{['Profile', 'About', 'Gallery', 'Facilities'].map((item) => <button className={tab === item ? 'active' : ''} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>{tab === 'Profile' && <><div className="hotel-profile-card"><div className="hotel-profile-card-head"><strong>Hotel Information</strong><button onClick={() => setEditing(!editing)}>{editing ? 'Done' : '✎'}</button></div>{editing ? <div className="hotel-profile-form">{field('hotelName', 'Hotel Name')}{field('address', 'Address')}{field('hotelType', 'Hotel Type')}{field('companyName', 'Company Name')}{field('companyRegNo', 'Company Reg. No')}{field('sstRegNo', 'SST Reg. No')}{field('ttxRegNo', 'TTx Reg. No')}{field('onlineBookingUrl', 'Online Booking URL')}{field('liveRunDate', 'Live Run Date')}</div> : <div className="hotel-profile-grid"><div>{field('hotelName', 'Hotel Name')}<div className="hotel-profile-value multiline"><span>Address</span>{draft.address}</div></div><div>{field('hotelType', 'Hotel Type')}{field('companyName', 'Company Name')}{field('companyRegNo', 'Company Reg. No')}{field('sstRegNo', 'SST Reg. No')}{field('ttxRegNo', 'TTx Reg. No')}{field('onlineBookingUrl', 'Online Booking URL')}{field('liveRunDate', 'Live Run Date')}</div></div>}</div><div className="hotel-profile-card"><div className="hotel-profile-card-head"><strong>Contact</strong><button onClick={() => setEditing(!editing)}>✎</button></div><div className="hotel-profile-grid"><div>{field('contactPerson', 'Contact Person')}{field('phoneNo', 'Phone No')}{field('reservationEmail', 'Reservation Email')}</div><div>{field('mobileNo', 'Mobile No')}{field('businessEmail', 'Business Email')}</div></div></div></>}{editing && <div className="master-page-actions"><button className="secondary-button" onClick={() => { setDraft(profile); setEditing(false); }}>Cancel</button><button className="primary-button" onClick={async () => { await onChange(draft); setEditing(false); }}>Save</button></div>}<button className="secondary-button master-page-back" onClick={onBack}><ArrowLeft size={16} /> Back to Hotel Settings</button></section>;
}

export type HotelSettingsDetailKind =
  | 'hotelSetup'
  | 'department'
  | 'floorPlan'
  | 'roomStatus'
  | 'ratePolicy'
  | 'standardPolicy';

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
  standardPolicy: {
    title: 'Standard Policy & Guidelines',
    detail: 'Hotel Operational Policy & Guidelines Setup.',
    section: 'Standard Policy & Guidelines',
    empty: 'Hotel operational policies and guidelines will be maintained on this page.',
    icon: ClipboardList,
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
  rateData = initialRateSetupData,
  onRateDataChange = () => {},
  roomStatuses = [],
  onRoomStatusesChange = () => {},
  departments = [],
  onDepartmentsChange = () => {},
  roomTypes = [],
  hotelProfile,
  onHotelProfileChange = () => {},
}: {
  kind: HotelSettingsDetailKind;
  onBack: () => void;
  rateSection?: RateSetupSection | null;
  onRateSectionChange?: (section: RateSetupSection | null) => void;
  rateData?: RateSetupData;
  onRateDataChange?: (value: RateSetupData) => void | Promise<void>;
  roomStatuses?: RoomStatus[];
  onRoomStatusesChange?: (value: RoomStatus[]) => void | Promise<void>;
  departments?: HotelDepartment[];
  onDepartmentsChange?: (value: HotelDepartment[]) => void | Promise<void>;
  roomTypes?: HotelRoomType[];
  hotelProfile?: HotelProfile;
  onHotelProfileChange?: (value: HotelProfile) => void | Promise<void>;
}) {
  const page = pages[kind];
  const Icon = page.icon;

  if (kind === 'ratePolicy') {
    return (
      <section className="master-page rate-setup-master-page" aria-label="Rate Setup">
        <RateSetupModule section={rateSection} onSectionChange={onRateSectionChange} data={rateData} onChange={onRateDataChange} roomTypes={roomTypes} />
        {!rateSection && (
          <button className="secondary-button master-page-back" type="button" onClick={onBack}>
            <ArrowLeft size={16} /> Back to Hotel Settings
          </button>
        )}
      </section>
    );
  }
  if (kind === 'hotelSetup' && hotelProfile) return <HotelSetupModuleV2 profile={hotelProfile} onChange={onHotelProfileChange} onBack={onBack} />;
  if (kind === 'roomStatus') return <RoomStatusModule statuses={roomStatuses} onChange={onRoomStatusesChange} onBack={onBack} />;
  if (kind === 'department') return <DepartmentModule departments={departments} onChange={onDepartmentsChange} onBack={onBack} />;
  if (kind === 'standardPolicy') {
    return <StandardPolicyModule profile={hotelProfile || initialHotelProfile} onProfileChange={onHotelProfileChange} onBack={onBack} />;
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
