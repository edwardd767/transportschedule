'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Booking } from '@/lib/bookings';
import type { HotelDepartment } from '@/lib/hotel-masters';
import type { TransportData } from '@/lib/use-transport-data';

const CANCEL_CODE = '_bookingCancellationReasonCode';
const CANCEL_DESCRIPTION = '_bookingCancellationReasonDescription';
const CANCEL_REMARK = '_bookingCancellationRemark';
const CANCEL_AT = '_bookingCancellationAt';

type ReasonOption = { code: string; description: string };

function bookingReferenceFromScreen() {
  const text = document.querySelector<HTMLElement>('.booking-detail-bottom')?.textContent ?? '';
  return text.match(/P\d{6}/)?.[0] ?? null;
}

function decodeReason(raw: string, index: number): ReasonOption | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const code = typeof parsed.c === 'string' ? parsed.c : typeof parsed.code === 'string' ? parsed.code : '';
      const description = typeof parsed.d === 'string' ? parsed.d : typeof parsed.description === 'string' ? parsed.description : '';
      if (code.trim() && description.trim()) return { code: code.trim().toUpperCase(), description: description.trim() };
    }
  } catch {
    // Legacy Reason Master records are plain strings.
  }
  const description = raw.trim();
  if (!description) return null;
  return { code: `R${String(index + 1).padStart(3, '0')}`, description };
}

function departmentReasons(department: HotelDepartment | undefined) {
  return (department?.reasons ?? [])
    .map(decodeReason)
    .filter((item): item is ReasonOption => Boolean(item));
}

export function BookingCancellationBridge({ store }: { store: TransportData }) {
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const booking = useMemo(
    () => store.state.bookings.find((item) => item.reference === reference) ?? null,
    [reference, store.state.bookings],
  );

  const reasons = useMemo(() => {
    const departments = store.state.hotelMasters.departments;
    const frontOffice = departments.find((item) => item.id === 'front-office')
      ?? departments.find((item) => item.name.toLowerCase() === 'front office');
    const preferred = departmentReasons(frontOffice);
    if (preferred.length) return preferred;
    return departments.flatMap((department) => departmentReasons(department));
  }, [store.state.hotelMasters.departments]);

  useEffect(() => {
    setWorkspace(document.querySelector<HTMLElement>('.workspace'));

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLButtonElement>('.booking-section-card');
      if (!card || card.querySelector('strong')?.textContent?.trim() !== 'Booking Cancellation | Reinstatement') return;

      const activeReference = bookingReferenceFromScreen();
      if (!activeReference) return;
      const activeBooking = store.state.bookings.find((item) => item.reference === activeReference);
      if (!activeBooking || activeBooking.status === 'Cancelled') return;

      event.preventDefault();
      event.stopPropagation();
      setReference(activeReference);
      setReasonCode('');
      setRemark('');
      setError('');
      setSuccess('');
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [store.state.bookings]);

  useEffect(() => {
    if (!reference) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        setReference(null);
        setSuccess('');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [reference, saving]);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => {
      setSuccess('');
      setReference(null);
    }, 4000);
    return () => window.clearTimeout(timer);
  }, [success]);

  if (!workspace || !reference || !booking) return null;

  const selectedReason = reasons.find((item) => item.code === reasonCode) ?? null;

  const confirmCancellation = async () => {
    if (saving || !selectedReason) return;
    setSaving(true);
    setError('');
    try {
      const now = new Date().toISOString();
      const specialRequests = {
        ...(booking.specialRequests ?? {}),
        [CANCEL_CODE]: selectedReason.code,
        [CANCEL_DESCRIPTION]: selectedReason.description,
        [CANCEL_REMARK]: remark.trim(),
        [CANCEL_AT]: now,
      };
      const next: Booking = {
        ...booking,
        status: 'Cancelled',
        assignedRooms: 0,
        checkedInGuests: 0,
        specialRequests,
      };
      await store.run({ type: 'bookingUpdate', value: next });
      if (store.mode === 'cloud') await store.reload();
      setSuccess(`Booking ${booking.reference} has been cancelled successfully.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to cancel booking.');
    } finally {
      setSaving(false);
    }
  };

  const neutralField = {
    border: 'none',
    borderBottom: '1px solid #999',
    borderRadius: 0,
    outline: 'none',
    boxShadow: 'none',
  } as const;

  return createPortal(
    <>
      {!success && (
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label="Cancel Booking">
          <div className="w-full max-w-[600px] overflow-hidden rounded-[4px] bg-white shadow-2xl">
            <div className="bg-[#fff6eb] px-4 pb-3 pt-4">
              <div className="text-[12px] font-medium text-[#ff8a00]">Cancel Booking</div>
              <div className="mt-1 border-b border-white/80 pb-2 text-[17px] font-semibold text-[#ff8a00]">{booking.reference}</div>
            </div>

            <div className="px-4 pb-3 pt-8">
              <label className="block text-[13px] text-[#777]">
                Reason Code *
                <select
                  autoFocus
                  value={reasonCode}
                  onChange={(event) => setReasonCode(event.target.value)}
                  className="mt-1 w-full bg-transparent px-0 pb-2 pt-1 text-[17px] text-[#777] outline-none ring-0 focus:outline-none focus:ring-0"
                  style={neutralField}
                >
                  <option value="">Select Reason Code</option>
                  {reasons.map((reason) => (
                    <option key={reason.code} value={reason.code}>{reason.code} - {reason.description}</option>
                  ))}
                </select>
              </label>

              <label className="mt-8 block text-[13px] text-[#777]">
                Remark
                <input
                  value={remark}
                  maxLength={500}
                  onChange={(event) => setRemark(event.target.value)}
                  className="mt-1 w-full bg-transparent px-0 pb-2 pt-1 text-[17px] text-[#555] outline-none ring-0 focus:outline-none focus:ring-0"
                  style={neutralField}
                />
              </label>

              {!reasons.length && <p className="mt-3 text-[12px] text-red-600" role="alert">No Reason Code is available. Set up a Reason under Hotel Settings → Department → Front Office → Reason.</p>}
              {error && <p className="mt-3 text-[12px] text-red-600" role="alert">{error}</p>}

              <div className="mt-6 flex justify-end gap-2">
                <button type="button" disabled={saving} onClick={() => setReference(null)} className="rounded-[4px] bg-[#ff9400] px-4 py-2 text-[13px] font-semibold text-white shadow disabled:opacity-60">Cancel</button>
                <button type="button" disabled={saving || !selectedReason} onClick={() => void confirmCancellation()} className="rounded-[4px] bg-[#ff9400] px-4 py-2 text-[13px] font-semibold text-white shadow disabled:bg-[#ddd]">{saving ? 'Cancelling…' : 'Confirm'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[120] flex justify-center px-4" aria-live="polite">
          <div className="pointer-events-auto flex max-w-[720px] items-center gap-5 rounded-[4px] bg-[#333] px-5 py-4 text-[14px] font-medium text-white shadow-2xl">
            <span className="whitespace-nowrap">{success}</span>
            <button type="button" onClick={() => { setSuccess(''); setReference(null); }} className="border-0 bg-transparent p-0 text-[13px] font-semibold uppercase text-[#8ab4ff]">Dismiss</button>
          </div>
        </div>
      )}
    </>,
    workspace,
  );
}
