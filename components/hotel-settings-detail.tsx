
'use client';

import {
  ArrowLeft,
  BedDouble,
  Building2,
  ClipboardList,
  ChevronRight,
  Eye,
  EyeOff,
  MoreVertical,
  Layers3,
  Network,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { RateSetupModule, type RateSetupSection } from '@/components/rate-setup';
import { initialRateSetupData, type RateSetupData } from '@/lib/rate-setup-data';
import { RoomStatusModule } from '@/components/room-status-module';
import { DepartmentModule } from '@/components/department-module-polished';
import { initialHotelProfile, type HotelDepartment, type HotelRoomType, type RoomStatus, type HotelProfile, type HotelOperationalPolicy, type RoomStatusPolicy, type AdvancePaymentPolicy, type EInvoicePolicy, type TermsConditions, type TermConditionKey, type SmtpSettings, type HousekeepingNotification } from '@/lib/hotel-masters';
import { HotelSetupModule as HotelSetupModuleV2 } from '@/components/hotel-setup-module';
import { TimePicker } from '@/components/time-picker';
import { RichTextEditor } from '@/components/rich-text-editor';
import type { Booking } from '@/lib/bookings';


function StandardPolicyModule({ onBack, profile, onProfileChange, roomStatuses }: { onBack: () => void; profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void>; roomStatuses: RoomStatus[] }) {
  const [policy, setPolicy] = useState<string | null>(null);
  useEffect(() => {
    const handleStandardPolicyBack = (event: Event) => {
      if (!policy) return;
      event.preventDefault();
      setPolicy(null);
    };
    window.addEventListener('hotelx-standard-policy-back', handleStandardPolicyBack);
    return () => window.removeEventListener('hotelx-standard-policy-back', handleStandardPolicyBack);
  }, [policy]);
  if (policy === 'Hotel Operational Policy') return <HotelOperationalPolicyModule profile={profile} onProfileChange={onProfileChange} onBack={() => setPolicy(null)} />;
  if (policy === 'Security Deposit Policy') return <SecurityDepositPolicyModule profile={profile} onProfileChange={onProfileChange} />;
  if (policy === 'General Policy') return <GeneralPolicyModule profile={profile} onProfileChange={onProfileChange} onBack={() => setPolicy(null)} />;
  if (policy === 'Room Status Policy') return <RoomStatusPolicyModule profile={profile} roomStatuses={roomStatuses} onProfileChange={onProfileChange} onBack={() => setPolicy(null)} />;
  if (policy === 'Advance Payment Policy') return <AdvancePaymentPolicyModule profile={profile} onProfileChange={onProfileChange} onBack={() => setPolicy(null)} />;
  if (policy === 'e-Invoice Policy') return <EInvoicePolicyModule profile={profile} onProfileChange={onProfileChange} onBack={() => setPolicy(null)} />;
  if (policy === 'Terms & Conditions') return <TermConditionModule profile={profile} onProfileChange={onProfileChange} onBack={() => setPolicy(null)} />;
  const policies = ['Hotel Operational Policy', 'Security Deposit Policy', 'State & Tourism Tax', 'Room Status Policy', 'General Policy', 'Terms & Conditions', 'Advance Payment Policy', 'e-Invoice Policy'];
  return <section className="master-page standard-policy-page" aria-label="Standard Policy & Guidelines"><div className="standard-policy-list">{policies.map((item) => <button className="standard-policy-row" type="button" key={item} onClick={() => (item === 'General Policy' || item === 'Hotel Operational Policy' || item === 'Security Deposit Policy' || item === 'Room Status Policy' || item === 'Advance Payment Policy' || item === 'e-Invoice Policy' || item === 'Terms & Conditions') && setPolicy(item)}><strong>{item}</strong>{item === 'State & Tourism Tax' ? <MoreVertical size={18} /> : <ChevronRight size={18} />}</button>)}</div><button className="secondary-button master-page-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to Hotel Settings</button></section>;
}

const TERM_CONDITION_ITEMS = [
  { key: 'onlineBooking', label: 'Online Booking' },
  { key: 'registrationCard', label: 'Registration Card' },
  { key: 'regulationClause', label: 'Regulation Clause' },
  { key: 'pdpaPolicy', label: 'PDPA Policy' },
  { key: 'onlinePayment', label: 'Online Payment Gateway Terms & Conditions' },
  { key: 'invoiceRemark', label: 'Invoice Remark' },
  { key: 'soaFooter', label: 'Statement Of Account Footer' },
] as const;

const POLICY_STAMP_FORMAT = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

function policyModifiedLabel(profile: HotelProfile, key: string): string {
  return `Last Modified on ${profile.policyModified?.[key] || '–'}`;
}

function stampedProfile(profile: HotelProfile, key: string, patch: Partial<HotelProfile>): HotelProfile {
  return { ...profile, ...patch, policyModified: { ...(profile.policyModified || {}), [key]: POLICY_STAMP_FORMAT.format(new Date()) } };
}

function StandardPolicyRow({ label, stamp, onClick, more }: { label: string; stamp: string; onClick?: () => void; more?: boolean }) {
  return <button className="standard-policy-row" type="button" onClick={onClick}><span className="standard-policy-copy"><strong>{label}</strong><small>{stamp}</small></span>{more ? <MoreVertical size={18} /> : <ChevronRight size={18} />}</button>;
}

function emptyTermsConditions(): TermsConditions {
  return {
    clauses: { onlineBooking: '', registrationCard: '', regulationClause: '', pdpaPolicy: '', onlinePayment: '', invoiceRemark: '', soaFooter: '' },
    guestNotice: true,
    transferDescription: false,
    extendStayDescription: false,
    splitDescription: false,
  };
}

function readTermsConditions(profile: HotelProfile): TermsConditions {
  const fallback = emptyTermsConditions();
  const stored = profile.operationalPolicy.termsConditions;
  if (!stored) return fallback;
  return { ...fallback, ...stored, clauses: { ...fallback.clauses, ...(stored.clauses ?? {}) } };
}

function TermConditionModule({ onBack, profile, onProfileChange }: { onBack: () => void; profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void> }) {
  const [termKey, setTermKey] = useState<TermConditionKey | null>(null);
  const [nightAudit, setNightAudit] = useState(false);
  useEffect(() => {
    const handleBack = (event: Event) => {
      if (nightAudit) { event.preventDefault(); setNightAudit(false); return; }
      if (!termKey) return;
      event.preventDefault();
      setTermKey(null);
    };
    window.addEventListener('hotelx-standard-policy-back', handleBack);
    return () => window.removeEventListener('hotelx-standard-policy-back', handleBack);
  }, [termKey, nightAudit]);
  if (nightAudit) return <NightAuditAutoEmailModule profile={profile} onProfileChange={onProfileChange} onBack={() => setNightAudit(false)} />;
  if (termKey) return <TermConditionEditModule termKey={termKey} profile={profile} onProfileChange={onProfileChange} onBack={() => setTermKey(null)} />;
  return <section className="master-page standard-policy-page" aria-label="Terms & Conditions">
    <div className="standard-policy-list">
      {TERM_CONDITION_ITEMS.map((item) => <StandardPolicyRow key={item.key} label={item.label} stamp={policyModifiedLabel(profile, `terms:${item.key}`)} onClick={() => setTermKey(item.key)} />)}
      <StandardPolicyRow label="SMTP Settings" stamp={policyModifiedLabel(profile, 'smtp')} onClick={() => setNightAudit(true)} />
    </div>
    <button className="secondary-button master-page-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to Standard Policy</button>
  </section>;
}

function TermConditionEditModule({ termKey, profile, onProfileChange, onBack }: { termKey: TermConditionKey; profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void>; onBack: () => void }) {
  const saved = readTermsConditions(profile);
  const [text, setText] = useState(saved.clauses[termKey] ?? '');
  const [guestNotice, setGuestNotice] = useState(saved.guestNotice);
  const [transferDescription, setTransferDescription] = useState(saved.transferDescription);
  const [extendStayDescription, setExtendStayDescription] = useState(saved.extendStayDescription);
  const [splitDescription, setSplitDescription] = useState(saved.splitDescription);
  const label = TERM_CONDITION_ITEMS.find((item) => item.key === termKey)?.label ?? 'Terms & Conditions';
  const toggle = (title: string, checked: boolean, onChange: (next: boolean) => void) => <label className="term-condition-toggle"><span>{title}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><i /></label>;
  return <section className="master-page term-condition-page" aria-label={label}>
    <p className="term-condition-description">Maintain the wording printed on the hotel&apos;s registration card, invoice and online documents.</p>
    <div className="term-condition-editor">
      <RichTextEditor key={termKey} value={text} onChange={setText} placeholder="Enter text here" />
    </div>
    {termKey === 'regulationClause' && toggle('Guest Notice', guestNotice, setGuestNotice)}
    {termKey === 'invoiceRemark' && <>
      {toggle('Show Transfer Description', transferDescription, setTransferDescription)}
      {toggle('Show Extend Stay Description', extendStayDescription, setExtendStayDescription)}
      {toggle('Show Split Description', splitDescription, setSplitDescription)}
    </>}
    <div className="master-page-actions term-condition-actions">
      <button className="primary-button" type="button" onClick={async () => {
        await onProfileChange(stampedProfile(profile, `terms:${termKey}`, {
          operationalPolicy: {
            ...profile.operationalPolicy,
            termsConditions: {
              clauses: { ...saved.clauses, [termKey]: text },
              guestNotice,
              transferDescription,
              extendStayDescription,
              splitDescription,
            },
          },
        }), 'Terms & Conditions saved.');
        onBack();
      }}>Save</button>
    </div>
  </section>;
}

type SecurityDepositPolicyState = {
  securityDepositAmount: number;
  keyCardDepositAmount: number;
  taxSchemeForfeitedRevenue: string;
  promptDuringWalkIn: boolean;
  promptDuringPreCheckin: boolean;
};

function SecurityDepositPolicyModule({ profile, onProfileChange }: { profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void> }) {
  const defaults: SecurityDepositPolicyState = { securityDepositAmount: 0, keyCardDepositAmount: 0, taxSchemeForfeitedRevenue: 'SST', promptDuringWalkIn: true, promptDuringPreCheckin: false };
  const stored = (profile.operationalPolicy as HotelOperationalPolicy & { securityDepositPolicy?: SecurityDepositPolicyState }).securityDepositPolicy;
  const saved = { ...defaults, ...(stored || {}) };
  const [securityDepositAmount, setSecurityDepositAmount] = useState(saved.securityDepositAmount.toFixed(2));
  const [keyCardDepositAmount, setKeyCardDepositAmount] = useState(saved.keyCardDepositAmount.toFixed(2));
  const [taxSchemeForfeitedRevenue, setTaxSchemeForfeitedRevenue] = useState(saved.taxSchemeForfeitedRevenue);
  const [promptDuringWalkIn, setPromptDuringWalkIn] = useState(saved.promptDuringWalkIn);
  const [promptDuringPreCheckin, setPromptDuringPreCheckin] = useState(saved.promptDuringPreCheckin);
  const dirty = securityDepositAmount !== saved.securityDepositAmount.toFixed(2) || keyCardDepositAmount !== saved.keyCardDepositAmount.toFixed(2) || taxSchemeForfeitedRevenue !== saved.taxSchemeForfeitedRevenue || promptDuringWalkIn !== saved.promptDuringWalkIn || promptDuringPreCheckin !== saved.promptDuringPreCheckin;
  const money = (value: string) => { const cleaned = value.replace(/[^0-9.]/g, ''); const dot = cleaned.indexOf('.'); return dot < 0 ? cleaned : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, ''); };
  const amountField = (label: string, value: string, setValue: (next: string) => void) => <label className="security-deposit-field"><span>{label} *</span><input inputMode="decimal" value={value} onChange={(event) => setValue(money(event.target.value))} onBlur={() => setValue((Number.parseFloat(value || '0') || 0).toFixed(2))} /></label>;
  const toggle = (label: string, checked: boolean, onClick: () => void) => <button type="button" className={`security-deposit-switch ${checked ? 'is-on' : ''}`} onClick={onClick}><span>{label}</span><i aria-hidden="true" /></button>;
  return <section className="master-page security-deposit-page" aria-label="Security Deposit Policy">
    <div className="security-deposit-card">
      {amountField('Security Deposit Amt', securityDepositAmount, setSecurityDepositAmount)}
      {amountField('Key Card Deposit Amt', keyCardDepositAmount, setKeyCardDepositAmount)}
      <label className="security-deposit-field"><span>Tax Scheme Forfeited Revenue</span><select value={taxSchemeForfeitedRevenue} onChange={(event) => setTaxSchemeForfeitedRevenue(event.target.value)}><option value="SST">SST</option><option value="No Tax">No Tax</option></select></label>
      {toggle('Prompt during Walk-in', promptDuringWalkIn, () => setPromptDuringWalkIn((value) => !value))}
      {toggle('Prompt during Pre Checkin', promptDuringPreCheckin, () => setPromptDuringPreCheckin((value) => !value))}
    </div>
    <div className="master-page-actions security-deposit-actions"><button className="primary-button" type="button" disabled={!dirty} onClick={async () => { const securityDepositPolicy: SecurityDepositPolicyState = { securityDepositAmount: Number.parseFloat(securityDepositAmount || '0') || 0, keyCardDepositAmount: Number.parseFloat(keyCardDepositAmount || '0') || 0, taxSchemeForfeitedRevenue, promptDuringWalkIn, promptDuringPreCheckin }; await onProfileChange(stampedProfile(profile, 'securityDeposit', { operationalPolicy: { ...profile.operationalPolicy, securityDepositPolicy } })); }}>Save</button></div>
  </section>;
}

function HotelOperationalPolicyModule({ onBack, profile, onProfileChange }: { onBack: () => void; profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void> }) {
  const defaultPolicy = initialHotelProfile.operationalPolicy;
  const savedPolicy = profile.operationalPolicy || {};
  const [draft, setDraft] = useState<HotelOperationalPolicy>({ ...defaultPolicy, ...savedPolicy, occupancy: { ...defaultPolicy.occupancy, ...(savedPolicy.occupancy || {}) } });
  const [editingTime, setEditingTime] = useState<'standardCheckInTime' | 'standardCheckOutTime' | 'nightAuditCutOffTime' | null>(null);
  const toggle = (key: 'postpaid' | 'floorPlan' | 'cashierClosure') => setDraft({ ...draft, [key]: !draft[key] });
  const occupancy = (key: keyof HotelOperationalPolicy['occupancy']) => setDraft({ ...draft, occupancy: { ...draft.occupancy, [key]: !draft.occupancy[key] } });
  const timeField = (key: 'standardCheckInTime' | 'standardCheckOutTime' | 'nightAuditCutOffTime', label: string) => <div className="operational-time-field"><span>{label} *</span><button type="button" className="operational-time-value" onClick={() => setEditingTime(key)}>{draft[key]}</button><span className="operational-clock">◷</span></div>;
  const switchField = (label: string, checked: boolean, onChange: () => void) => <button type="button" className={`operational-switch-row ${checked ? 'is-on' : ''}`} onClick={onChange}><span>{label}</span><i aria-hidden="true" /></button>;
  return <section className="master-page operational-policy-page" aria-label="Hotel Operational Policy">
    <div className="operational-policy-card">{timeField('standardCheckInTime', 'Standard Check In Time')}{timeField('standardCheckOutTime', 'Standard Check Out Time')}{timeField('nightAuditCutOffTime', 'Night Audit Cut Off Time')}{switchField('Postpaid', draft.postpaid, () => toggle('postpaid'))}{switchField('Floor Plan', draft.floorPlan, () => toggle('floorPlan'))}{switchField('Cashier Closure', draft.cashierClosure, () => toggle('cashierClosure'))}</div>
    <div className="operational-policy-card operational-occupancy-card"><div className="operational-section-head"><strong>Occupancy Calculation Formula</strong><span>⌃</span></div>{switchField('House Use', draft.occupancy.houseUse, () => occupancy('houseUse'))}{switchField('Day Use', draft.occupancy.dayUse, () => occupancy('dayUse'))}{switchField('Complimentary', draft.occupancy.complimentary, () => occupancy('complimentary'))}{switchField('OOO', draft.occupancy.ooo, () => occupancy('ooo'))}{switchField('OOI', draft.occupancy.ooi, () => occupancy('ooi'))}</div>
    <div className="operational-policy-card operational-collapsed"><strong>CMS Interface</strong><span>⌄</span></div>
    <div className="master-page-actions operational-policy-actions"><button className="primary-button" type="button" onClick={async () => { await onProfileChange(stampedProfile(profile, 'operational', { operationalPolicy: draft })); }}>Save</button></div>
    {editingTime && <TimePicker value={draft[editingTime]} onCancel={() => setEditingTime(null)} onConfirm={(value) => { setDraft({ ...draft, [editingTime]: value }); setEditingTime(null); }} />}
  </section>;
}

function GeneralPolicyModule({ onBack, profile, onProfileChange }: { onBack: () => void; profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void> }) {
  const [days, setDays] = useState(String(profile.bookingCancellationDays ?? 3));
  const [currency, setCurrency] = useState(profile.currencyCode || 'MYR');
  const [floatAmount, setFloatAmount] = useState(String(profile.floatAmount ?? 0));
  const [paxCount, setPaxCount] = useState(profile.paxCount || 'No. of Pax Manual Updated');
  const [childRatesApplied, setChildRatesApplied] = useState(Boolean(profile.childRatesApplied));
  const [customBreakdown, setCustomBreakdown] = useState(Boolean(profile.customBreakdown));
  const [childAgePolicy, setChildAgePolicy] = useState(String(profile.childAgePolicy ?? 0));
  return <section className="master-page general-policy-page" aria-label="General Policy">
    <div className="general-policy-card">
      <label>Booking Cancellation Policy (days) *<input type="number" min="0" value={days} onChange={(event) => setDays(event.target.value)} /></label>
      <label>Currency Code *<input value={currency} onChange={(event) => setCurrency(event.target.value.toUpperCase())} /></label>
      <label>Float Amount *<input type="number" min="0" step="0.01" value={floatAmount} onChange={(event) => setFloatAmount(event.target.value)} /></label>
      <label>Pax Count *<select value={paxCount} onChange={(event) => setPaxCount(event.target.value)}>
        <option>No. of Pax Manual Updated</option>
        <option>No. of Guest Profile Created</option>
      </select></label>
      <label className="general-policy-toggle"><span>Child Rates Applied</span><input type="checkbox" checked={childRatesApplied} onChange={(event) => setChildRatesApplied(event.target.checked)} /><i /></label>
      <label className="general-policy-toggle"><span>Custom Breakdown</span><input type="checkbox" checked={customBreakdown} onChange={(event) => setCustomBreakdown(event.target.checked)} /><i /></label>
      {childRatesApplied && <label>Child Age Policy *<input type="number" min="0" step="1" inputMode="numeric" value={childAgePolicy} onChange={(event) => setChildAgePolicy(event.target.value.replace(/\D/g, ''))} /></label>}
    </div>
    <div className="master-page-actions general-policy-actions"><button className="primary-button" type="button" onClick={async () => { await onProfileChange(stampedProfile(profile, 'general', { bookingCancellationDays: Number(days), currencyCode: currency, floatAmount: Number(floatAmount), paxCount, childRatesApplied, childAgePolicy: Number(childAgePolicy) || 0, customBreakdown }), 'General Policy saved.'); }}>Save</button></div>
  </section>;
}

function NightAuditAutoEmailModule({ profile, onProfileChange, onBack }: { profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void>; onBack: () => void }) {
  const [section, setSection] = useState<string | null>(null);
  if (section === 'SMTP Settings') return <SmtpSettingsModule profile={profile} onProfileChange={onProfileChange} onBack={() => setSection(null)} />;
  if (section === 'Housekeeping') return <HousekeepingNotificationModule profile={profile} onProfileChange={onProfileChange} onBack={() => setSection(null)} />;
  return <section className="master-page standard-policy-page" aria-label="SMTP Settings">
    <div className="standard-policy-list">
      <StandardPolicyRow label="Night Audit" stamp={policyModifiedLabel(profile, 'smtp')} onClick={() => setSection('SMTP Settings')} />
      <StandardPolicyRow label="Housekeeping" stamp={policyModifiedLabel(profile, 'housekeeping')} onClick={() => setSection('Housekeeping')} />
    </div>
    <button className="secondary-button master-page-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to Terms & Conditions</button>
  </section>;
}

function SmtpSettingsModule({ profile, onProfileChange, onBack }: { profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void>; onBack: () => void }) {
  const saved = { ...(initialHotelProfile.smtpSettings as SmtpSettings), ...(profile.smtpSettings || {}) };
  const [hostName, setHostName] = useState(saved.hostName);
  const [port, setPort] = useState(saved.port);
  const [enableSsl, setEnableSsl] = useState(saved.enableSsl);
  const [recipientEmail, setRecipientEmail] = useState(saved.recipientEmail);
  const [senderEmail, setSenderEmail] = useState(saved.senderEmail);
  const [senderPassword, setSenderPassword] = useState(saved.senderPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [subjectPrefix, setSubjectPrefix] = useState(saved.subjectPrefix);
  const [emailContent, setEmailContent] = useState(saved.emailContent);
  const [testNote, setTestNote] = useState('');
  const testSend = async () => {
    if (!hostName.trim() || !port.trim() || !enableSsl.trim() || !recipientEmail.trim() || !senderEmail.trim()) {
      setTestNote('Fill in Host Name, Port, Enable SSL, Recipient Email and Sender Email before sending a test email.');
      return;
    }
    setTestNote('Sending test email ...');
    const hotel = profile.hotelName || 'HOTEL PARADISE';
    const today = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());
    const samples = ['Daily Revenue Report', 'Daily Occupancy Report', 'Daily Housekeeping Report', 'Daily Transport Report'];
    const fill = (text: string) => text.split('{{HotelName}}').join(hotel).split('{{ReportDate}}').join(today).split('{{ReportName1}}').join(samples[0]).split('{{ReportName2}}').join(samples[1]).split('{{ReportName3}}').join(samples[2]).split('{{ReportName4}}').join(samples[3]);
    try {
      const response = await fetch('/__dev/send-email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ host: hostName.trim(), port: port.trim(), secure: enableSsl.trim().toLowerCase() === 'yes', user: senderEmail.trim(), password: senderPassword, to: recipientEmail.trim(), subject: fill(subjectPrefix), html: fill(emailContent), attachReports: true }),
      });
      const result = (await response.json().catch(() => null)) as { ok?: boolean; error?: string; attached?: string[] } | null;
      if (response.ok && result?.ok) {
        const attached = result.attached?.length ? ` Reports attached: ${result.attached.join(', ')}.` : '';
        setTestNote(`Test email sent to ${recipientEmail.trim()}.${attached}`);
        return;
      }
      setTestNote(`Test send failed: ${result?.error || 'HTTP ' + response.status}`);
    } catch {
      setTestNote('Test sending only works while running the app on localhost (npm run dev).');
    }
  };
  return <section className="master-page smtp-settings-page" aria-label="SMTP Settings">
    <div className="smtp-settings-card">
      <div className="smtp-settings-head"><strong>SMTP Settings</strong><button className="smtp-settings-test" type="button" onClick={testSend}>TEST SEND EMAIL</button></div>
      <div className="smtp-settings-body">
        <label className="smtp-field"><span>Host Name *</span><input value={hostName} onChange={(event) => setHostName(event.target.value)} /></label>
        <div className="smtp-field-row">
          <label className="smtp-field"><span>Port *</span><input inputMode="numeric" value={port} onChange={(event) => setPort(event.target.value.replace(/\D/g, ''))} /></label>
          <label className="smtp-field"><span>Enable SSL *</span><select value={enableSsl} onChange={(event) => setEnableSsl(event.target.value)}><option>Yes</option><option>No</option></select></label>
        </div>
        <label className="smtp-field"><span>Recipient Email *</span><input type="email" multiple placeholder="e.g. manager@hotel.com, owner@hotel.com" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} /></label>
        <label className="smtp-field"><span>Sender Email *</span><input type="email" value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} /></label>
        <label className="smtp-field smtp-password-field"><span>Sender Email Password</span><input type={showPassword ? 'text' : 'password'} value={senderPassword} onChange={(event) => setSenderPassword(event.target.value)} /><button className="smtp-eye" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>
        <label className="smtp-field"><span>Subject Prefix</span><input value={subjectPrefix} onChange={(event) => setSubjectPrefix(event.target.value)} /></label>
        <div className="smtp-content-field"><span>Email Content</span><RichTextEditor value={emailContent} onChange={setEmailContent} placeholder="Enter text here" /></div>
      </div>
    </div>
    {testNote && <p className="smtp-test-note">{testNote}</p>}
    <button className="secondary-button master-page-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to SMTP Settings</button>
    <div className="master-page-actions smtp-settings-actions"><button className="primary-button" type="button" onClick={async () => { await onProfileChange(stampedProfile(profile, 'smtp', { smtpSettings: { hostName, port, enableSsl, recipientEmail, senderEmail, senderPassword, subjectPrefix, emailContent } }), 'SMTP Settings saved.'); }}>Save</button></div>
  </section>;
}

function HousekeepingNotificationModule({ profile, onProfileChange, onBack }: { profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void>; onBack: () => void }) {
  const saved = { ...(initialHotelProfile.housekeepingNotification as HousekeepingNotification), ...(profile.housekeepingNotification || {}) };
  const [hostName, setHostName] = useState(saved.hostName);
  const [port, setPort] = useState(saved.port);
  const [enableSsl, setEnableSsl] = useState(saved.enableSsl);
  const [recipientEmail, setRecipientEmail] = useState(saved.recipientEmail);
  const [senderEmail, setSenderEmail] = useState(saved.senderEmail);
  const [senderPassword, setSenderPassword] = useState(saved.senderPassword);
  const [showPassword, setShowPassword] = useState(false);
  const [subjectPrefix, setSubjectPrefix] = useState(saved.subjectPrefix);
  const [emailContent, setEmailContent] = useState(saved.emailContent);
  return <section className="master-page smtp-settings-page" aria-label="Housekeeping Notification">
    <div className="smtp-settings-card">
      <div className="smtp-settings-head"><strong>Housekeeping Notification</strong></div>
      <div className="smtp-settings-body">
        <label className="smtp-field"><span>Host Name *</span><input value={hostName} onChange={(event) => setHostName(event.target.value)} /></label>
        <div className="smtp-field-row">
          <label className="smtp-field"><span>Port *</span><input inputMode="numeric" value={port} onChange={(event) => setPort(event.target.value.replace(/\D/g, ''))} /></label>
          <label className="smtp-field"><span>Enable SSL *</span><select value={enableSsl} onChange={(event) => setEnableSsl(event.target.value)}><option>Yes</option><option>No</option></select></label>
        </div>
        <label className="smtp-field"><span>Recipient Email *</span><input type="email" multiple placeholder="e.g. manager@hotel.com, owner@hotel.com" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} /></label>
        <label className="smtp-field"><span>Sender Email *</span><input type="email" value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} /></label>
        <label className="smtp-field smtp-password-field"><span>Sender Email Password</span><input type={showPassword ? 'text' : 'password'} value={senderPassword} onChange={(event) => setSenderPassword(event.target.value)} /><button className="smtp-eye" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></label>
        <label className="smtp-field"><span>Subject Prefix</span><input value={subjectPrefix} onChange={(event) => setSubjectPrefix(event.target.value)} /></label>
        <div className="smtp-content-field"><span>Email Content</span><RichTextEditor value={emailContent} onChange={setEmailContent} placeholder="Enter text here" /></div>
      </div>
    </div>
    <button className="secondary-button master-page-back" type="button" onClick={onBack}><ArrowLeft size={16} /> Back to SMTP Settings</button>
    <div className="master-page-actions smtp-settings-actions"><button className="primary-button" type="button" onClick={async () => { await onProfileChange(stampedProfile(profile, 'housekeeping', { housekeepingNotification: { hostName, port, enableSsl, recipientEmail, senderEmail, senderPassword, subjectPrefix, emailContent } }), 'Housekeeping Notification saved.'); }}>Save</button></div>
  </section>;
}

function RoomStatusPolicyModule({ profile, roomStatuses, onProfileChange, onBack }: { profile: HotelProfile; roomStatuses: RoomStatus[]; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void>; onBack: () => void }) {
  const saved = profile.operationalPolicy.roomStatusPolicy;
  const defaults: RoomStatusPolicy = { checkIn: '', checkOut: '', transfer: '', cancelCheckIn: '', cancelCheckOut: '', blockRoomRelease: '' };
  const initial: RoomStatusPolicy = { ...defaults, ...(saved ?? {}) };
  const [draft, setDraft] = useState<RoomStatusPolicy>(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const options = roomStatuses.filter((status) => status.active);
  const field = (key: keyof RoomStatusPolicy, label: string) => (
    <label className="room-status-policy-field" key={key}>
      <span>{label}</span>
      <select value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}>
        <option value="">Select room status</option>
        {options.map((status) => <option key={status.code} value={status.code}>{status.code} - {status.description}</option>)}
      </select>
    </label>
  );
  return <section className="master-page room-status-policy-page" aria-label="Room Status Policy">
    <div className="operational-policy-head"><strong>Room Status Policy</strong><button type="button" onClick={onBack}>Edit</button></div>
    <div className="room-status-policy-card">
      {field('checkIn', 'Check In')}
      {field('checkOut', 'Check Out')}
      {field('transfer', 'Transfer')}
      {field('cancelCheckIn', 'Cancel Check In')}
      {field('cancelCheckOut', 'Cancel Check Out')}
      {field('blockRoomRelease', 'Block Room Release')}
    </div>
    <div className="master-page-actions room-status-policy-actions"><button className="primary-button" type="button" disabled={!dirty} onClick={async () => { await onProfileChange(stampedProfile(profile, 'roomStatus', { operationalPolicy: { ...profile.operationalPolicy, roomStatusPolicy: draft } })); }}>Save</button></div>
  </section>;
}

function AdvancePaymentPolicyModule({ profile, onProfileChange, onBack }: { profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void>; onBack: () => void }) {
  const saved = profile.operationalPolicy.advancePaymentPolicy;
  const initial: AdvancePaymentPolicy = { taxSchemeForfeitedRevenue: saved?.taxSchemeForfeitedRevenue ?? 'SST-5' };
  const [draft, setDraft] = useState<AdvancePaymentPolicy>(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  return <section className="master-page advance-payment-policy-page" aria-label="Advance Payment Policy">
    <div className="operational-policy-head"><strong>Advance Payment Policy</strong><button type="button" onClick={onBack}>Edit</button></div>
    <div className="advance-payment-policy-card">
      <label className="advance-payment-policy-field">
        <span>Tax Scheme Forfeited Revenue</span>
        <select value={draft.taxSchemeForfeitedRevenue} onChange={(event) => setDraft({ taxSchemeForfeitedRevenue: event.target.value })}>
          <option>SST-3</option>
          <option>SST-5</option>
          <option>SST-6</option>
          <option>No Tax</option>
        </select>
      </label>
    </div>
    <div className="master-page-actions advance-payment-policy-actions"><button className="primary-button" type="button" disabled={!dirty} onClick={async () => { await onProfileChange(stampedProfile(profile, 'advancePayment', { operationalPolicy: { ...profile.operationalPolicy, advancePaymentPolicy: draft } })); }}>Save</button></div>
  </section>;
}

const EINVOICE_CLASSIFICATIONS = ['022', '021', '023', '041', '042'];

function EInvoicePolicyModule({ profile, onProfileChange, onBack }: { profile: HotelProfile; onProfileChange: (value: HotelProfile, notice?: string) => void | Promise<void>; onBack: () => void }) {
  const saved = profile.operationalPolicy.eInvoicePolicy;
  const initial: EInvoicePolicy = {
    classificationRoomCharges: saved?.classificationRoomCharges ?? '022',
    classificationServiceCharges: saved?.classificationServiceCharges ?? '022',
    classificationAdvancePaymentForfeit: saved?.classificationAdvancePaymentForfeit ?? '022',
    classificationDepositForfeit: saved?.classificationDepositForfeit ?? '022',
    classificationStateTax: saved?.classificationStateTax ?? '022',
    useSubmissionDateAsDocDate: saved?.useSubmissionDateAsDocDate ?? false,
  };
  const [draft, setDraft] = useState<EInvoicePolicy>(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const field = (key: 'classificationRoomCharges' | 'classificationServiceCharges' | 'classificationAdvancePaymentForfeit' | 'classificationDepositForfeit' | 'classificationStateTax', label: string) => (
    <label className="advance-payment-policy-field" key={key}>
      <span>{label}</span>
      <select value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}>
        {EINVOICE_CLASSIFICATIONS.map((code) => <option key={code}>{code}</option>)}
      </select>
    </label>
  );
  return <section className="master-page e-invoice-policy-page" aria-label="E-Invoice Policy">
    <div className="operational-policy-head"><strong>E-Invoice Policy</strong><button type="button" onClick={onBack}>Edit</button></div>
    <div className="advance-payment-policy-card">
      {field('classificationRoomCharges', 'Classification for Room Charges')}
      {field('classificationServiceCharges', 'Classification for Service Charges')}
      {field('classificationAdvancePaymentForfeit', 'Classification for Advance Payment Forfeit')}
      {field('classificationDepositForfeit', 'Classification for Deposit Forfeit')}
      {field('classificationStateTax', 'Classification for State Tax')}
      <button type="button" className={`operational-switch-row ${draft.useSubmissionDateAsDocDate ? 'is-on' : ''}`} onClick={() => setDraft({ ...draft, useSubmissionDateAsDocDate: !draft.useSubmissionDateAsDocDate })}><span>Use Submission Date as Doc Date</span><i aria-hidden="true" /></button>
    </div>
    <div className="master-page-actions e-invoice-policy-actions"><button className="primary-button" type="button" disabled={!dirty} onClick={async () => { await onProfileChange(stampedProfile(profile, 'eInvoice', { operationalPolicy: { ...profile.operationalPolicy, eInvoicePolicy: draft } })); }}>Confirm</button></div>
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
  bookings = [],
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
  bookings?: Booking[];
  roomTypes?: HotelRoomType[];
  hotelProfile?: HotelProfile;
  onHotelProfileChange?: (value: HotelProfile, notice?: string) => void | Promise<void>;
}) {
  const page = pages[kind];
  const Icon = page.icon;

  if (kind === 'ratePolicy') {
    return (
      <section className="master-page rate-setup-master-page" aria-label="Rate Setup">
        <RateSetupModule childRatesApplied={hotelProfile?.childRatesApplied ?? false} section={rateSection} onSectionChange={onRateSectionChange} data={rateData} onChange={onRateDataChange} roomTypes={roomTypes} />
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
  if (kind === 'department') return <DepartmentModule departments={departments} bookings={bookings} onChange={onDepartmentsChange} onBack={onBack} />;
  if (kind === 'standardPolicy') {
    return <StandardPolicyModule profile={hotelProfile || initialHotelProfile} onProfileChange={onHotelProfileChange} onBack={onBack} roomStatuses={roomStatuses} />;
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
