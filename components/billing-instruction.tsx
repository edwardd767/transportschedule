'use client';
import { useEffect, useState } from 'react';
import { billingInstructionFor, readRoomBillingInstructions, ROOM_BILLING_KEY, type Booking } from '@/lib/bookings';

function growRemark(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}

export function BillingInstruction({ booking, onSave, onBack, roomKey }: { booking: Booking; onSave: (value: Booking) => Promise<void>; onBack: () => void; roomKey?: string }) {
  const initial = billingInstructionFor(booking, roomKey ?? '');
  const [cityAccount, setCityAccount] = useState(initial.cityAccount);
  const [remark, setRemark] = useState(initial.remark);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) onBack();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onBack, saving]);

  const save = async () => {
    setSaving(true);
    try {
      if (roomKey) {
        await onSave({
          ...booking,
          specialRequests: {
            ...(booking.specialRequests ?? {}),
            [ROOM_BILLING_KEY]: JSON.stringify({ ...readRoomBillingInstructions(booking), [roomKey]: { cityAccount, remark } }),
          },
        });
      } else {
        await onSave({ ...booking, cityAccount, billingRemark: remark });
      }
      onBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="billing-instruction-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Billing Instruction"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onBack();
      }}
    >
      <div className="billing-instruction-card">
        <div className="bg-[#fff6eb] px-3 pb-3 pt-3">
          <div className="text-[11px] font-medium text-[#f28b00]">Billing Instruction</div>
          <div className="mt-1 border-b border-[#e6ddd3] pb-2 text-[15px] font-semibold text-[#ff8a00]">{booking.reference}</div>
        </div>
        <div className="billing-instruction-form">
          <label className="billing-check">
            <span>City Account</span>
            <span>
              <input type="checkbox" checked={cityAccount} onChange={(event) => setCityAccount(event.target.checked)} /> Yes
            </span>
          </label>
          <label className="billing-remark">
            <span>Billing Remark</span>
            <textarea rows={1} ref={growRemark} value={remark} onChange={(event) => { setRemark(event.target.value); growRemark(event.currentTarget); }} />
          </label>
        </div>
        <div className="billing-instruction-actions">
          <button className="secondary-button" onClick={onBack}>Cancel</button>
          <button className="primary-button" disabled={saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Confirm'}</button>
        </div>
      </div>
    </div>
  );
}
