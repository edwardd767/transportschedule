'use client';
import { useEffect, useState } from 'react';
import { Booking } from '@/lib/bookings';

function growRemark(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export function BillingInstruction({ booking, onSave, onBack }: { booking: Booking; onSave: (value: Booking) => Promise<void>; onBack: () => void }) {
  const [cityAccount, setCityAccount] = useState(Boolean(booking.cityAccount));
  const [remark, setRemark] = useState(booking.billingRemark || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onBack();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack, saving]);

  return <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label="Billing Instruction" onClick={(event) => { if (event.target === event.currentTarget && !saving) onBack(); }}><div className="billing-instruction-card"><div className="bg-[#fff6eb] px-3 pb-3 pt-3"><div className="text-[11px] font-medium text-[#f28b00]">Billing Instruction</div><div className="mt-1 border-b border-[#e6ddd3] pb-2 text-[15px] font-semibold text-[#ff8a00]">{booking.reference}</div></div><div className="billing-instruction-form"><label className="billing-check"><span>City Account</span><span><input type="checkbox" checked={cityAccount} onChange={(e) => setCityAccount(e.target.checked)} /> Yes</span></label><label className="billing-remark"><span>Billing Remark</span><textarea rows={1} ref={growRemark} value={remark} onChange={(e) => { setRemark(e.target.value); growRemark(e.currentTarget); }} /></label></div><div className="billing-instruction-actions"><button className="secondary-button" onClick={onBack}>Cancel</button><button className="primary-button" disabled={saving} onClick={async () => { setSaving(true); try { await onSave({ ...booking, cityAccount, billingRemark: remark }); onBack(); } finally { setSaving(false); } }}>{saving ? 'Saving…' : 'Confirm'}</button></div></div></div>;
}
