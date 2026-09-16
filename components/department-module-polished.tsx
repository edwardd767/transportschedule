'use client';
import { ArrowLeft, Mic, MoreVertical, Search, Upload, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cleanSalesChannels, type HotelDepartment, type IncidentalCharge } from '@/lib/hotel-masters';

const blank = (): IncidentalCharge => ({ id: crypto.randomUUID(), title: '', amount: 0, taxScheme: 'SST-3', outletCode: '', rateElement: false, guestAppFb: false, guestAppOnlineShop: false, posInterface: false, eventInterface: false, allowNegative: true, packageRedemption: false, kiosk: false, thirdPartyPos: false, eInvoice: true, msicCode: '55101', classification: '022' });
const flags: Array<[keyof IncidentalCharge, string]> = [['rateElement', 'Rate Element'], ['guestAppFb', 'GuestApp - F&B'], ['guestAppOnlineShop', 'GuestApp - OnlineShop'], ['posInterface', 'POS Interface'], ['eventInterface', 'Event Interface'], ['allowNegative', 'Allow Negative'], ['packageRedemption', 'Package Redemption'], ['kiosk', 'Kiosk'], ['thirdPartyPos', '3rd Party POS'], ['eInvoice', 'e-Invoice']];

export function DepartmentModule({ departments, onChange, onBack }: { departments: HotelDepartment[]; onChange: (v: HotelDepartment[]) => void | Promise<void>; onBack: () => void }) {
  const [draft, setDraft] = useState(departments), [menu, setMenu] = useState<string | null>(null), [dept, setDept] = useState<string | null>(null), [charge, setCharge] = useState<IncidentalCharge | null>(null), [chargeList, setChargeList] = useState(false), [chargeMenu, setChargeMenu] = useState<string | null>(null), [salesChannelList, setSalesChannelList] = useState(false), [salesChannelMenu, setSalesChannelMenu] = useState<string | null>(null), [salesChannelDraft, setSalesChannelDraft] = useState(''), [salesChannelEditing, setSalesChannelEditing] = useState<string | null>(null), [salesChannelDialog, setSalesChannelDialog] = useState(false), [saving, setSaving] = useState(false), [query, setQuery] = useState(''), [searchOpen, setSearchOpen] = useState(false);
  const [departmentDialog, setDepartmentDialog] = useState(false);
  const [departmentEditingId, setDepartmentEditingId] = useState<string | null>(null);
  const [departmentDraft, setDepartmentDraft] = useState({
    name: '',
    allowReason: false,
    allowSalesChannel: false,
    allowIncidentalCharges: false,
    serviceRequest: false,
  });
  useEffect(() => setDraft(departments), [departments]);
  const department = draft.find((x) => x.id === dept);
  const departmentWithCleanSalesChannels = department ? { ...department, salesChannels: cleanSalesChannels(department.salesChannels) } : undefined;
  const visible = useMemo(() => draft.filter((d) => d.name.toLowerCase().includes(query.toLowerCase())), [draft, query]);
  const open = (d: HotelDepartment, c?: IncidentalCharge) => { setDept(d.id); setCharge(c ? { ...c } : blank()); setChargeList(false); setSalesChannelList(false); setMenu(null); setChargeMenu(null); };
  const showCharges = (d: HotelDepartment) => { setDept(d.id); setCharge(null); setChargeList(true); setMenu(null); };
  const showSalesChannels = (d: HotelDepartment) => { setDept(d.id); setCharge(null); setChargeList(false); setSalesChannelList(true); setMenu(null); setSalesChannelMenu(null); setSalesChannelDialog(false); setSalesChannelDraft(''); setSalesChannelEditing(null); setQuery(''); setSearchOpen(false); };
  const close = () => { setCharge(null); setChargeList(false); setSalesChannelList(false); setSalesChannelDialog(false); setSalesChannelDraft(''); setSalesChannelEditing(null); setDept(null); setQuery(''); setSearchOpen(false); };
  const openSalesChannel = (value = '') => { setSalesChannelEditing(value || null); setSalesChannelDraft(value); setSalesChannelMenu(null); setSalesChannelDialog(true); };
  const saveSalesChannel = async () => {
    if (!department || !salesChannelDraft.trim()) return;
    const value = salesChannelDraft.trim();
    const current = cleanSalesChannels(department.salesChannels);
    const salesChannels = salesChannelEditing ? current.map((item) => item === salesChannelEditing ? value : item) : [...current, value];
    const next = draft.map((d) => d.id !== department.id ? d : { ...d, salesChannels: Array.from(new Set(salesChannels)) });
    setSaving(true);
    try {
      await onChange(next);
      setDraft(next);
      setSalesChannelDialog(false);
      setSalesChannelDraft('');
      setSalesChannelEditing(null);
    } finally {
      setSaving(false);
    }
  };
  const save = async () => { if (!department || !charge) return; const next = draft.map((d) => d.id !== department.id ? d : { ...d, incidentalCharges: d.incidentalCharges.some((c) => c.id === charge.id) ? d.incidentalCharges.map((c) => c.id === charge.id ? charge : c) : [...d.incidentalCharges, charge] }); setSaving(true); try { await onChange(next); setDraft(next); close(); } finally { setSaving(false); } };
  const departmentValues = (d: HotelDepartment) => ({
    name: d.name,
    allowReason: d.allowReason ?? d.reasons.length > 0,
    allowSalesChannel: d.allowSalesChannel ?? cleanSalesChannels(d.salesChannels).length > 0,
    allowIncidentalCharges: d.allowIncidentalCharges ?? d.incidentalCharges.length > 0,
    serviceRequest: d.serviceRequest ?? false,
  });
  const openDepartmentDialog = () => {
    setDepartmentEditingId(null);
    setDepartmentDraft({ name: '', allowReason: false, allowSalesChannel: false, allowIncidentalCharges: false, serviceRequest: false });
    setDepartmentDialog(true);
  };
  const openDepartmentEdit = (d: HotelDepartment) => {
    setMenu(null);
    setDepartmentEditingId(d.id);
    setDepartmentDraft(departmentValues(d));
    setDepartmentDialog(true);
  };
  const closeDepartmentDialog = () => {
    setDepartmentDialog(false);
    setDepartmentEditingId(null);
    setDepartmentDraft({ name: '', allowReason: false, allowSalesChannel: false, allowIncidentalCharges: false, serviceRequest: false });
  };
  const saveDepartment = async () => {
    const name = departmentDraft.name.trim();
    if (!name || saving) return;
    const next = departmentEditingId
      ? draft.map((d) => d.id !== departmentEditingId ? d : {
          ...d,
          name,
          allowReason: departmentDraft.allowReason,
          allowSalesChannel: departmentDraft.allowSalesChannel,
          allowIncidentalCharges: departmentDraft.allowIncidentalCharges,
          serviceRequest: departmentDraft.serviceRequest,
        })
      : [...draft, {
          id: crypto.randomUUID(),
          name,
          incidentalCharges: [],
          reasons: [],
          salesChannels: [],
          allowReason: departmentDraft.allowReason,
          allowSalesChannel: departmentDraft.allowSalesChannel,
          allowIncidentalCharges: departmentDraft.allowIncidentalCharges,
          serviceRequest: departmentDraft.serviceRequest,
        } satisfies HotelDepartment];
    setSaving(true);
    try {
      await onChange(next);
      setDraft(next);
      closeDepartmentDialog();
    } finally {
      setSaving(false);
    }
  };
  const departmentEditingTarget = departmentEditingId ? draft.find((d) => d.id === departmentEditingId) : undefined;
  const departmentEditChanged = !departmentEditingTarget || JSON.stringify(departmentDraft) !== JSON.stringify(departmentValues(departmentEditingTarget));
  if (department && chargeList) return <section className="master-page incidental-list-page"><div className="department-editor-head"><button className="master-back" onClick={close}><ArrowLeft size={18} /> Back</button><strong>Incidental Charges</strong></div><div className="master-list-head incidental-list-head"><h1>Incidental Charges Listing <em>({department.incidentalCharges.length})</em></h1><Search size={21} /></div><div className="incidental-list">{department.incidentalCharges.map((item) => <article className="incidental-row" key={item.id}><div className="incidental-thumb" /><div className="incidental-copy"><strong>{item.title}</strong><small>MYR {Number(item.amount).toFixed(2)}</small></div><button className="department-menu-trigger" onClick={() => setChargeMenu(chargeMenu === item.id ? null : item.id)}><MoreVertical size={21} /></button>{chargeMenu === item.id && <div className="department-menu incidental-row-menu"><button onClick={() => open(department, item)}>Edit</button><button>QR Code</button></div>}</article>)}</div><button className="incidental-add-button" aria-label="Add incidental charge" onClick={() => open(department)}><span>+</span></button></section>;
  if (department && salesChannelList) {
    const displayDepartment = departmentWithCleanSalesChannels ?? department;
    const channels = displayDepartment.salesChannels.filter((item) => item.toLowerCase().includes(query.toLowerCase()));
    return <section className="master-page department-page sales-channel-page"><div className="department-editor-head"><button className="master-back" onClick={close}><ArrowLeft size={18} /> Back</button><strong>{displayDepartment.name}</strong></div><div className="master-list-head department-list-head"><div><h1>Sales Channel Listing <em>({displayDepartment.salesChannels.length})</em></h1></div><button className="department-search-button" aria-label="Search sales channels" onClick={() => setSearchOpen(!searchOpen)}><Search size={21} /></button></div>{searchOpen && <div className="department-search-field"><Search size={16} /><input autoFocus placeholder="Search sales channel" value={query} onChange={(e) => setQuery(e.target.value)} /></div>}<div className="department-list">{channels.map((item, index) => { const key = `${index}-${item}`; return <article className="department-row" key={key}><div><strong>{item}</strong><small>Department : <b>{displayDepartment.name}</b></small></div><button className="department-menu-trigger" aria-label={`Sales channel options for ${item}`} onClick={() => setSalesChannelMenu(salesChannelMenu === key ? null : key)}><MoreVertical size={21} /></button>{salesChannelMenu === key && <div className="department-menu"><button onClick={() => openSalesChannel(item)}>Edit</button><button>Inactive</button></div>}</article>; })}</div><button className="incidental-add-button" aria-label="Add sales channel" onClick={() => openSalesChannel()}><span>+</span></button>{salesChannelDialog && <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label="New Sales Channel"><div className="billing-instruction-card sales-channel-dialog"><h2>{salesChannelEditing ? 'Edit Sales Channel' : 'New Sales Channel'}</h2><label>Description *<input autoFocus value={salesChannelDraft} onChange={(event) => setSalesChannelDraft(event.target.value)} /></label><div className="billing-instruction-actions"><button className="secondary-button" onClick={() => { setSalesChannelDialog(false); setSalesChannelDraft(''); setSalesChannelEditing(null); }}>Cancel</button><button className="primary-button" disabled={!salesChannelDraft.trim() || saving} onClick={saveSalesChannel}>{saving ? 'Saving…' : 'Save'}</button></div></div></div>}</section>;
  }
  if (department && charge) return <section className="master-page incidental-charge-page"><div className="department-editor-head"><button className="master-back" onClick={close}><ArrowLeft size={18} /> Back</button><strong>Incidental Charges</strong></div><div className="master-detail-card incidental-charge-card"><div className="master-section-label">Charge Item</div><div className="master-form-grid"><label className="master-field master-field-wide"><span>Title</span><input value={charge.title} onChange={(e) => setCharge({ ...charge, title: e.target.value })} /></label><label className="master-field"><span>Amount (MYR)</span><input type="number" min="0" value={charge.amount} onChange={(e) => setCharge({ ...charge, amount: Number(e.target.value) })} /></label><label className="master-field"><span>Tax Scheme *</span><select value={charge.taxScheme} onChange={(e) => setCharge({ ...charge, taxScheme: e.target.value })}><option>SST-3</option><option>SST-4</option><option>SST-6</option><option>None</option></select></label><label className="master-field master-field-wide"><span>Outlet Code</span><input value={charge.outletCode} onChange={(e) => setCharge({ ...charge, outletCode: e.target.value })} /></label></div><div className="incidental-checks">{flags.map(([key, label]) => <label key={String(key)}><input type="checkbox" checked={Boolean(charge[key])} onChange={(e) => setCharge({ ...charge, [key]: e.target.checked })} />{label}</label>)}</div><div className="incidental-attachment"><span>Upload Attachment(s)</span><Upload size={18} /></div></div><div className="master-page-actions"><button className="secondary-button" onClick={close}>Cancel</button><button className="primary-button" disabled={!charge.title.trim() || saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button></div></section>;
  return (
    <section className="master-page department-page">
      {searchOpen ? (
        <div className="department-search-field">
          <input autoFocus placeholder="Search here.." value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search departments" />
          <button type="button" aria-label="Voice search"><Mic size={18} /></button>
          <button type="button" aria-label="Close search" onClick={() => { setQuery(''); setSearchOpen(false); }}><X size={18} /></button>
        </div>
      ) : (
        <div className="master-list-head department-list-head">
          <div><h1>Department (<em>{draft.length}</em>)</h1></div>
          <button className="department-search-button" aria-label="Search departments" onClick={() => setSearchOpen(true)}><Search size={18} /></button>
        </div>
      )}
      <div className="department-list">
        {visible.map((d) => (
          <article className="department-row" key={d.id}>
            <div>
              <strong>{d.name}</strong>
              {(() => {
                const details = [
                  (d.allowIncidentalCharges ?? d.incidentalCharges.length > 0) ? <span key="incidental">Incidental Charges : <b>{d.incidentalCharges.length}</b></span> : null,
                  (d.allowReason ?? d.reasons.length > 0) ? <span key="reason">Reason : <b>{d.reasons.length}</b></span> : null,
                  (d.allowSalesChannel ?? cleanSalesChannels(d.salesChannels).length > 0) ? <span key="sales">Sales Channel : <b>{cleanSalesChannels(d.salesChannels).length}</b></span> : null,
                  (d.serviceRequest ?? false) ? <span key="service">Service Request</span> : null,
                ].filter(Boolean);
                return details.length ? <small>{details.map((item, index) => <span key={index}>{index > 0 ? ' | ' : ''}{item}</span>)}</small> : null;
              })()}
            </div>
            <button className="department-menu-trigger" onClick={() => setMenu(menu === d.id ? null : d.id)}><MoreVertical size={21} /></button>
            {menu === d.id && (
              <div className="department-menu">
                <button onClick={() => openDepartmentEdit(d)}>Edit</button>
                <button onClick={() => showCharges(d)}>Incidental Charges</button>
                <button>Reason</button>
                <button onClick={() => showSalesChannels(d)}>Sales Channel</button>
                <button>Inactive</button>
              </div>
            )}
          </article>
        ))}
      </div>
      <button className="incidental-add-button department-add-button" type="button" aria-label="Add department" onClick={openDepartmentDialog}><span>+</span></button>
      <button className="secondary-button master-page-back" onClick={onBack}><ArrowLeft size={16} /> Back to Hotel Settings</button>
      {departmentDialog && (
        <div className="billing-instruction-overlay department-create-overlay" role="dialog" aria-modal="true" aria-label="New Department">
          <div className="department-create-dialog">
            <h2>{departmentEditingId ? 'Edit Department' : 'New Department'}</h2>
            <div className="department-create-body">
              <label className="department-create-description">
                <span>Description *</span>
                <input autoFocus value={departmentDraft.name} onChange={(event) => setDepartmentDraft({ ...departmentDraft, name: event.target.value })} />
              </label>
              <div className="department-create-options">
                <label className="department-create-toggle"><input type="checkbox" checked={departmentDraft.allowReason} onChange={(event) => setDepartmentDraft({ ...departmentDraft, allowReason: event.target.checked })} /><i /><span>Allow Reason</span></label>
                <label className="department-create-toggle"><input type="checkbox" checked={departmentDraft.allowSalesChannel} onChange={(event) => setDepartmentDraft({ ...departmentDraft, allowSalesChannel: event.target.checked })} /><i /><span>Allow Sales Channel</span></label>
                <label className="department-create-toggle"><input type="checkbox" checked={departmentDraft.allowIncidentalCharges} onChange={(event) => setDepartmentDraft({ ...departmentDraft, allowIncidentalCharges: event.target.checked })} /><i /><span>Allow Incidental Charges</span></label>
                <label className="department-create-toggle"><input type="checkbox" checked={departmentDraft.serviceRequest} onChange={(event) => setDepartmentDraft({ ...departmentDraft, serviceRequest: event.target.checked })} /><i /><span>Service Request</span></label>
              </div>
              <div className="department-create-actions">
                <button type="button" className="secondary-button" onClick={closeDepartmentDialog}>Cancel</button>
                <button type="button" className="primary-button" disabled={!departmentDraft.name.trim() || saving || (Boolean(departmentEditingId) && !departmentEditChanged)} onClick={saveDepartment}>{saving ? 'Saving…' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
