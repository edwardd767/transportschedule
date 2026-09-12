'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Booking } from '@/lib/bookings';
import type { HotelDepartment, HotelRoomType } from '@/lib/hotel-masters';
import type { TransportData } from '@/lib/use-transport-data';

const CANCEL_CODE = '_bookingCancellationReasonCode';
const CANCEL_DESCRIPTION = '_bookingCancellationReasonDescription';
const CANCEL_REMARK = '_bookingCancellationRemark';
const CANCEL_AT = '_bookingCancellationAt';
const REINSTATE_CODE = '_bookingReinstatementReasonCode';
const REINSTATE_DESCRIPTION = '_bookingReinstatementReasonDescription';
const REINSTATE_REMARK = '_bookingReinstatementRemark';
const REINSTATE_AT = '_bookingReinstatementAt';
const LAST_CANCELLATION = '_lastBookingCancellation';
const ROOM_ASSIGNMENTS = '_roomAssignments';

const CANCELLED_DISABLED_SECTIONS = new Set([
  'Room Assignment',
  'Room Upgrade',
  'Incidental Charges',
  'Confirmation Letter',
  'Proforma Invoice',
  'House Limit',
  'Room Cancellation | Reinstatement',
]);

const OCCUPYING_STATUSES = new Set<Booking['status']>(['Booked', 'Inhouse']);

type ReasonOption = { code: string; description: string };

function bookingReferenceFromScreen() {
  const text = document.querySelector<HTMLElement>('.booking-detail-bottom')?.textContent ?? '';
  return text.match(/P\d{6}/)?.[0] ?? null;
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

function requiredRoomsByType(booking: Booking) {
  const required = new Map<string, number>();
  booking.rooms.forEach((room) => {
    required.set(room.code, (required.get(room.code) ?? 0) + room.count);
  });
  return required;
}

function reinstatementAvailabilityError(
  booking: Booking,
  bookings: Booking[],
  roomTypes: HotelRoomType[],
  arrival: string,
  departure: string,
) {
  const activeRoomTypes = new Map(
    roomTypes.filter((room) => room.active).map((room) => [room.code, room]),
  );
  const required = requiredRoomsByType(booking);

  for (let date = arrival; date < departure; date = addDays(date, 1)) {
    for (const [roomCode, requiredCount] of required) {
      const roomType = activeRoomTypes.get(roomCode);
      if (!roomType) {
        return `Unable to reinstate. Room Type ${roomCode} is not active.`;
      }

      const occupied = bookings
        .filter(
          (item) =>
            item.reference !== booking.reference &&
            OCCUPYING_STATUSES.has(item.status) &&
            item.arrival <= date &&
            date < item.departure,
        )
        .reduce(
          (total, item) =>
            total +
            item.rooms
              .filter((room) => room.code === roomCode)
              .reduce((sum, room) => sum + room.count, 0),
          0,
        );

      const available = Math.max(0, roomType.totalRoom - occupied);
      if (available < requiredCount) {
        return `Unable to reinstate. ${roomCode} requires ${requiredCount} room(s), but only ${available} room(s) are available on ${date}.`;
      }
    }
  }

  return '';
}

function applyCancelledSectionState(bookings: Booking[]) {
  const activeReference = bookingReferenceFromScreen();
  const activeBooking = activeReference
    ? bookings.find((item) => item.reference === activeReference)
    : undefined;
  const cancelled = activeBooking?.status === 'Cancelled';

  document.querySelectorAll<HTMLButtonElement>('.booking-section-card').forEach((card) => {
    const title = card.querySelector('strong')?.textContent?.trim() ?? '';
    const shouldDisable = Boolean(cancelled && CANCELLED_DISABLED_SECTIONS.has(title));

    if (shouldDisable) {
      card.disabled = true;
      card.dataset.cancelledDisabled = 'true';
      card.setAttribute('aria-disabled', 'true');
      card.setAttribute('title', 'Unavailable for cancelled booking');
      card.style.opacity = '0.48';
      card.style.background = '#ededed';
      card.style.color = '#8a8a8a';
      card.style.cursor = 'default';
      card.style.boxShadow = 'none';
      card.style.borderColor = '#dddddd';
      const icon = card.querySelector<SVGElement>('svg');
      if (icon) icon.style.opacity = '0.35';
      return;
    }

    if (card.dataset.cancelledDisabled === 'true') {
      card.disabled = false;
      delete card.dataset.cancelledDisabled;
      card.removeAttribute('aria-disabled');
      card.removeAttribute('title');
      card.style.removeProperty('opacity');
      card.style.removeProperty('background');
      card.style.removeProperty('color');
      card.style.removeProperty('cursor');
      card.style.removeProperty('box-shadow');
      card.style.removeProperty('border-color');
      const icon = card.querySelector<SVGElement>('svg');
      if (icon) icon.style.removeProperty('opacity');
    }
  });
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
      if (!activeBooking) return;

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
    const apply = () => applyCancelledSectionState(store.state.bookings);
    apply();
    const root = document.querySelector<HTMLElement>('.workspace') ?? document.body;
    const observer = new MutationObserver(apply);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
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
  const reinstating = booking.status === 'Cancelled';
  const today = localDateKey();
  const pastArrival = reinstating && booking.arrival < today;

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

  const confirmReinstatement = async () => {
    if (saving || !selectedReason) return;
    setSaving(true);
    setError('');
    try {
      const arrival = booking.arrival < today ? today : booking.arrival;
      const departure = booking.arrival < today ? addDays(today, 1) : booking.departure;
      const availabilityError = reinstatementAvailabilityError(
        booking,
        store.state.bookings,
        store.state.hotelMasters.roomTypes,
        arrival,
        departure,
      );
      if (availabilityError) {
        setError(availabilityError);
        return;
      }

      const now = new Date().toISOString();
      const specialRequests: Record<string, string> = { ...(booking.specialRequests ?? {}) };
      specialRequests[LAST_CANCELLATION] = JSON.stringify({
        reasonCode: specialRequests[CANCEL_CODE] ?? '',
        description: specialRequests[CANCEL_DESCRIPTION] ?? '',
        remark: specialRequests[CANCEL_REMARK] ?? '',
        at: specialRequests[CANCEL_AT] ?? '',
      });
      delete specialRequests[CANCEL_CODE];
      delete specialRequests[CANCEL_DESCRIPTION];
      delete specialRequests[CANCEL_REMARK];
      delete specialRequests[CANCEL_AT];
      delete specialRequests[ROOM_ASSIGNMENTS];
      specialRequests[REINSTATE_CODE] = selectedReason.code;
      specialRequests[REINSTATE_DESCRIPTION] = selectedReason.description;
      specialRequests[REINSTATE_REMARK] = remark.trim();
      specialRequests[REINSTATE_AT] = now;

      const next: Booking = {
        ...booking,
        arrival,
        departure,
        status: 'Booked',
        assignedRooms: 0,
        checkedInGuests: 0,
        specialRequests,
      };

      await store.run({ type: 'bookingUpdate', value: next });
      if (store.mode === 'cloud') await store.reload();
      setSuccess(
        pastArrival
          ? `Booking ${booking.reference} has been reinstated successfully. Stay changed to ${arrival} - ${departure}.`
          : `Booking ${booking.reference} has been reinstated successfully.`,
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to reinstate booking.');
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
        <div className="absolute inset-0 z-[90] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={reinstating ? 'Reinstatement' : 'Cancel Booking'}>
          <div className="w-full max-w-[600px] overflow-hidden rounded-[4px] bg-white shadow-2xl">
            <div className="bg-[#fff6eb] px-4 pb-3 pt-4">
              <div className="text-[12px] font-medium text-[#ff8a00]">{reinstating ? 'Reinstatement' : 'Cancel Booking'}</div>
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

              {pastArrival && (
                <p className="mt-3 text-[12px] text-[#777]">
                  Arrival date has passed. Reinstatement will change the stay to {today} - {addDays(today, 1)}.
                </p>
              )}
              {!reasons.length && <p className="mt-3 text-[12px] text-red-600" role="alert">No Reason Code is available. Set up a Reason under Hotel Settings → Department → Front Office → Reason.</p>}
              {error && <p className="mt-3 text-[12px] text-red-600" role="alert">{error}</p>}

              <div className="mt-6 flex justify-end gap-2">
                <button type="button" disabled={saving} onClick={() => setReference(null)} className="rounded-[4px] bg-[#ff9400] px-4 py-2 text-[13px] font-semibold text-white shadow disabled:opacity-60">Cancel</button>
                <button
                  type="button"
                  disabled={saving || !selectedReason}
                  onClick={() => void (reinstating ? confirmReinstatement() : confirmCancellation())}
                  className="rounded-[4px] bg-[#ff9400] px-4 py-2 text-[13px] font-semibold text-white shadow disabled:bg-[#ddd]"
                >
                  {saving ? (reinstating ? 'Reinstating…' : 'Cancelling…') : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="pointer-events-none absolute inset-x-0 bottom-5 z-[120] flex justify-center px-4" aria-live="polite">
          <div className="pointer-events-auto flex max-w-[820px] items-center gap-5 rounded-[4px] bg-[#333] px-5 py-4 text-[14px] font-medium text-white shadow-2xl">
            <span className="whitespace-nowrap">{success}</span>
            <button type="button" onClick={() => { setSuccess(''); setReference(null); }} className="border-0 bg-transparent p-0 text-[13px] font-semibold uppercase text-[#8ab4ff]">Dismiss</button>
          </div>
        </div>
      )}
    </>,
    workspace,
  );
}
