'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TransportData } from '@/lib/use-transport-data';

const INTERNAL_KEY = '__bookingInternalRemarks';
const PAYMENT_1_KEY = '__bookingPaymentRemarks1';
const PAYMENT_2_KEY = '__bookingPaymentRemarks2';

function bookingReferenceFromScreen() {
  const text = document.querySelector<HTMLElement>('.booking-detail-bottom')?.textContent ?? '';
  return text.match(/P\d{6}/)?.[0] ?? null;
}

export function BookingRemarksBridge({ store }: { store: TransportData }) {
  const [reference, setReference] = useState<string | null>(null);
  const [tab, setTab] = useState<'internal' | 'payment'>('internal');
  const [internalRemarks, setInternalRemarks] = useState('');
  const [paymentRemarks1, setPaymentRemarks1] = useState('');
  const [paymentRemarks2, setPaymentRemarks2] = useState('');
  const [saving, setSaving] = useState(false);

  const booking = useMemo(
    () => store.state.bookings.find((item) => item.reference === reference) ?? null,
    [reference, store.state.bookings],
  );

  useEffect(() => {
    const syncSummary = () => {
      const activeReference = bookingReferenceFromScreen();
      if (!activeReference) return;
      const activeBooking = store.state.bookings.find((item) => item.reference === activeReference);
      if (!activeBooking) return;
      const remark = activeBooking.specialRequests?.[INTERNAL_KEY]?.trim() ?? '';
      const cards = Array.from(document.querySelectorAll<HTMLButtonElement>('.booking-section-card'));
      const remarksCard = cards.find(
        (card) => card.querySelector('strong')?.textContent?.trim() === 'Remarks',
      );
      if (!remarksCard) return;
      const copy = remarksCard.querySelector<HTMLElement>(':scope > span');
      if (!copy) return;
      let summary = copy.querySelector<HTMLElement>('[data-booking-remarks-summary]');
      if (!remark) {
        summary?.remove();
        return;
      }
      if (!summary) {
        summary = document.createElement('small');
        summary.dataset.bookingRemarksSummary = 'true';
        copy.appendChild(summary);
      }
      summary.textContent = remark;
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLButtonElement>('.booking-section-card');
      if (!card || card.querySelector('strong')?.textContent?.trim() !== 'Remarks') return;
      const activeReference = bookingReferenceFromScreen();
      if (!activeReference) return;
      const activeBooking = store.state.bookings.find((item) => item.reference === activeReference);
      if (!activeBooking) return;
      event.preventDefault();
      event.stopPropagation();
      const requests = activeBooking.specialRequests ?? {};
      setReference(activeReference);
      setInternalRemarks(requests[INTERNAL_KEY] ?? '');
      setPaymentRemarks1(requests[PAYMENT_1_KEY] ?? '');
      setPaymentRemarks2(requests[PAYMENT_2_KEY] ?? '');
      setTab('internal');
    };

    document.addEventListener('click', onClick, true);
    const observer = new MutationObserver(syncSummary);
    const workspace = document.querySelector('.workspace');
    if (workspace) observer.observe(workspace, { childList: true, subtree: true });
    syncSummary();
    return () => {
      document.removeEventListener('click', onClick, true);
      observer.disconnect();
    };
  }, [store.state.bookings]);

  useEffect(() => {
    if (!reference) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setReference(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [reference, saving]);

  if (!reference || !booking) return null;

  const confirm = async () => {
    setSaving(true);
    try {
      await store.run({
        type: 'bookingUpdate',
        value: {
          ...booking,
          specialRequests: {
            ...(booking.specialRequests ?? {}),
            [INTERNAL_KEY]: internalRemarks,
            [PAYMENT_1_KEY]: paymentRemarks1,
            [PAYMENT_2_KEY]: paymentRemarks2,
          },
        },
      });
      setReference(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Booking Remarks"
    >
      <div className="w-full max-w-[600px] overflow-hidden rounded-[3px] bg-white shadow-2xl">
        <div className="bg-[#fff6eb] px-3 pb-3 pt-3">
          <div className="text-[11px] font-medium text-[#f28b00]">Remarks</div>
          <div className="mt-1 border-b border-[#e6ddd3] pb-2 text-[15px] font-semibold text-[#ff8a00]">
            {booking.reference}
          </div>
        </div>

        <div className="px-3 pt-5">
          <div className="flex gap-7 border-b border-transparent text-[14px] font-semibold">
            <button
              type="button"
              className={`border-b-[3px] px-0 pb-2 ${tab === 'internal' ? 'border-[#ff9000] text-[#ff9000]' : 'border-transparent text-[#999]'}`}
              onClick={() => setTab('internal')}
            >
              INTERNAL REMARKS
            </button>
            <button
              type="button"
              className={`border-b-[3px] px-0 pb-2 ${tab === 'payment' ? 'border-[#ff9000] text-[#ff9000]' : 'border-transparent text-[#999]'}`}
              onClick={() => setTab('payment')}
            >
              PAYMENT REMARKS
            </button>
          </div>

          {tab === 'internal' ? (
            <div className="pb-5 pt-7">
              <label className="block text-[13px] text-[#949494]">Internal Remarks</label>
              <input
                autoFocus
                value={internalRemarks}
                onChange={(event) => setInternalRemarks(event.target.value)}
                className="mt-1 w-full border-0 border-b border-[#999] bg-transparent px-0 pb-2 text-[17px] text-[#333] outline-none"
                maxLength={2000}
              />
            </div>
          ) : (
            <div className="space-y-7 pb-5 pt-7">
              <input
                autoFocus
                aria-label="Payment Remarks 1"
                placeholder="Remarks 1"
                value={paymentRemarks1}
                onChange={(event) => setPaymentRemarks1(event.target.value)}
                className="w-full border-0 border-b border-[#999] bg-transparent px-0 pb-2 text-[17px] text-[#333] outline-none placeholder:text-[#999]"
                maxLength={2000}
              />
              <input
                aria-label="Payment Remarks 2"
                placeholder="Remarks 2"
                value={paymentRemarks2}
                onChange={(event) => setPaymentRemarks2(event.target.value)}
                className="w-full border-0 border-b border-[#999] bg-transparent px-0 pb-2 text-[17px] text-[#333] outline-none placeholder:text-[#999]"
                maxLength={2000}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pb-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={() => setReference(null)}
              className="rounded-[4px] bg-[#ff9400] px-3 py-2 text-[13px] font-semibold text-white shadow disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void confirm()}
              className="rounded-[4px] bg-[#ff9400] px-3 py-2 text-[13px] font-semibold text-white shadow disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
