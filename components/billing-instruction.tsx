'use client';
import { useState } from 'react';
import { Booking } from '@/lib/bookings';

export function BillingInstruction({ booking, onSave, onBack }: { booking: Booking; onSave: (value: Booking) => Promise<void>; onBack: () => void }) {
  const [cityAccount, setCityAccount] = useState(Boolean(booking.cityAccount));
  const [remark, setRemark] = useState(booking.billingRemark || '');
  const [saving, setSaving] = useState(false);
  return <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label="Billing Instruction"><div className="billing-instruction-card"><div className="billing-instruction-head"><span>Billing Instruction</span><strong>{booking.reference}</strong></div><div className="billing-instruction-form"><label className="billing-check"><span>City Account</span><span><input type="checkbox" checked={cityAccount} onChange={(e) => setCityAccount(e.target.checked)} /> Yes</span></label><label className="billing-remark"><span>Billing Remark</span><textarea value={remark} onChange={(e) => setRemark(e.target.value)} /></label></div><div className="billing-instruction-actions"><button className="secondary-button" onClick={onBack}>Cancel</button><button className="primary-button" disabled={saving} onClick={async () => { setSaving(true); try { await onSave({ ...booking, cityAccount, billingRemark: remark }); onBack(); } finally { setSaving(false); } }}>{saving ? 'Saving…' : 'Confirm'}</button></div></div></div>;
}
