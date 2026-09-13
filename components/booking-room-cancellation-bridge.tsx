'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, ChevronLeft, DoorClosed, RotateCcw, X } from 'lucide-react';
import type { Booking } from '@/lib/bookings';
import type { HotelDepartment } from '@/lib/hotel-masters';
import type { TransportData } from '@/lib/use-transport-data';

const ROOM_CANCELLATIONS = '_roomCancellations';

type ReasonOption = { code: string; description: string };
type RoomCancellation = {
  roomKey: string;
  roomCode: string;
  roomNumber: number;
  reasonCode: string;
  reasonDescription: string;
  remark: string;
  at: string;
};
type RoomRow = {
  key: string;
  roomCode: string;
  roomNumber: number;
  guest: string;
};

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
      if (code.trim() && description.trim()) {
        return { code: code.trim().toUpperCase(), description: description.trim() };
      }
    }
  } catch {
    // Legacy Reason Master values may be plain strings.
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

function cancellationMap(booking: Booking | null) {
  if (!booking?.specialRequests?.[ROOM_CANCELLATIONS]) return {} as Record<string, RoomCancellation>;
  try {
    const parsed = JSON.parse(booking.specialRequests[ROOM_CANCELLATIONS]) as Record<string, RoomCancellation>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function roomRows(booking: Booking) {
  const rows: RoomRow[] = [];
  let roomNumber = 0;

  booking.rooms.forEach((room, roomIndex) => {
    for (let copyIndex = 0; copyIndex < room.count; copyIndex += 1) {
      roomNumber += 1;
      rows.push({
        key: `${roomIndex}-${copyIndex}`,
        roomCode: room.code,
        roomNumber,
        guest: booking.guest,
      });
    }
  });

  return rows;
}

function formatStay(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

function money(value: number) {
  return value.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function BookingRoomCancellationBridge({ store }: { store: TransportData }) {
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [selectedRoomKey, setSelectedRoomKey] = useState<string | null>(null);
  const [mode, setMode] = useState<'cancel' | 'reinstate'>('cancel');
  const [reasonCode, setReasonCode] = useState('');
  const [reasonOpen, setReasonOpen] = useState(false);
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
      const card = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.booking-section-card');
      if (!card || card.querySelector('strong')?.textContent?.trim() !== 'Room Cancellation | Reinstatement') return;

      const activeReference = bookingReferenceFromScreen();
      if (!activeReference || !store.state.bookings.some((item) => item.reference === activeReference)) return;

      event.preventDefault();
      event.stopPropagation();
      setReference(activeReference);
      setSelectedRoomKey(null);
      setReasonCode('');
      setReasonOpen(false);
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
      if (event.key !== 'Escape' || saving) return;
      if (reasonOpen) {
        setReasonOpen(false);
        return;
      }
      if (selectedRoomKey) {
        setSelectedRoomKey(null);
        setReasonCode('');
        setRemark('');
        setError('');
        return;
      }
      setReference(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [reference, saving, selectedRoomKey, reasonOpen]);

  if (!workspace || !reference || !booking) return null;

  const rows = roomRows(booking);
  const cancellations = cancellationMap(booking);
  const selectedRoom = rows.find((row) => row.key === selectedRoomKey) ?? null;
  const selectedReason = reasons.find((reason) => reason.code === reasonCode) ?? null;
  const activeRows = rows.filter((row) => !cancellations[row.key]);

  const openAction = (row: RoomRow, action: 'cancel' | 'reinstate') => {
    setSelectedRoomKey(row.key);
    setMode(action);
    setReasonCode('');
    setReasonOpen(false);
    setRemark('');
    setError('');
    setSuccess('');
  };

  const confirm = async () => {
    if (!selectedRoom || !selectedReason || saving) return;
    setSaving(true);
    setError('');

    try {
      const nextCancellations = { ...cancellations };

      if (mode === 'cancel') {
        nextCancellations[selectedRoom.key] = {
          roomKey: selectedRoom.key,
          roomCode: selectedRoom.roomCode,
          roomNumber: selectedRoom.roomNumber,
          reasonCode: selectedReason.code,
          reasonDescription: selectedReason.description,
          remark: remark.trim(),
          at: new Date().toISOString(),
        };
      } else {
        delete nextCancellations[selectedRoom.key];
      }

      const activeCount = Math.max(0, rows.length - Object.keys(nextCancellations).length);
      const specialRequests = {
        ...(booking.specialRequests ?? {}),
        [ROOM_CANCELLATIONS]: JSON.stringify(nextCancellations),
      };

      const next: Booking = {
        ...booking,
        status: activeCount === 0 ? 'Cancelled' : booking.status === 'Cancelled' ? 'Booked' : booking.status,
        assignedRooms: Math.min(booking.assignedRooms, activeCount),
        checkedInGuests: activeCount === 0 ? 0 : booking.checkedInGuests,
        specialRequests,
      };

      await store.run({ type: 'bookingUpdate', value: next });
      if (store.mode === 'cloud') await store.reload();

      setSuccess(
        mode === 'cancel'
          ? `${selectedRoom.roomCode} Room ${selectedRoom.roomNumber} cancelled successfully.`
          : `${selectedRoom.roomCode} Room ${selectedRoom.roomNumber} reinstated successfully.`,
      );
      setSelectedRoomKey(null);
      setReasonCode('');
      setReasonOpen(false);
      setRemark('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update room cancellation.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="absolute inset-0 z-[80] overflow-auto bg-[#f6f6f6]" aria-label="Room Cancellation - Reinstatement">
      <div className="mx-auto max-w-[1180px] p-3 sm:p-4">
        <div className="overflow-hidden bg-gradient-to-r from-[#ff8b28] via-[#ffb52f] to-[#ff762d] text-[#222] shadow-sm">
          <div className="flex items-center gap-3 px-3 py-2">
            <button
              type="button"
              aria-label="Back to booking"
              onClick={() => setReference(null)}
              className="flex h-9 w-9 items-center justify-center rounded bg-white text-[#ef821d] shadow"
            >
              <ChevronLeft size={22} />
            </button>
            <div>
              <small className="block text-[11px] font-semibold text-white">HMS</small>
              <strong className="block text-[15px]">HOTEL PARADISE</strong>
            </div>
          </div>
          <div className="border-t border-white/70 px-4 py-1.5 text-[12px]">... / ... / Room Cancellation - Reinstatement</div>
        </div>

        <div className="bg-[#fff8ef] px-4 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-[14px]">
              <strong>{formatStay(booking.arrival)} - {formatStay(booking.departure)}</strong>
              <span className="flex items-center gap-1"><DoorClosed size={15} /> {activeRows.length}/{rows.length}</span>
              <span>♟ {Math.max(0, booking.checkedInGuests)}/{Math.max(1, booking.guests)}</span>
            </div>
            <strong className="text-[#ff2f58]">{money(booking.amount)}</strong>
          </div>
          <div className="mt-1 border-t border-white pt-1 text-[12px]">{booking.reference} &nbsp;|&nbsp; {booking.guest}</div>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] px-4 text-[12px] font-medium sm:text-[13px]">
          <span>Room Details</span>
          <span>Cancellation / Reinstatement</span>
        </div>

        <div className="mt-1 space-y-2 px-2 sm:px-3">
          {rows.map((row) => {
            const cancelled = Boolean(cancellations[row.key]);
            return (
              <div key={row.key} className="flex min-h-[72px] items-center justify-between gap-4 rounded-md bg-white px-4 py-3 shadow-md">
                <div>
                  <div className="flex items-center gap-2 text-[14px] font-semibold">
                    <span>{row.roomNumber}. {row.roomCode}</span>
                    <DoorClosed size={16} />
                    {cancelled && <span className="rounded bg-[#fff1e2] px-2 py-0.5 text-[10px] font-semibold text-[#f28a22]">Cancelled</span>}
                  </div>
                  <div className="mt-1 text-[12px]">{row.guest}</div>
                  {cancelled && (
                    <div className="mt-1 text-[10px] text-[#8b8b8b]">
                      {cancellations[row.key].reasonCode} - {cancellations[row.key].reasonDescription}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  aria-label={cancelled ? `Reinstate ${row.roomCode} Room ${row.roomNumber}` : `Cancel ${row.roomCode} Room ${row.roomNumber}`}
                  onClick={() => openAction(row, cancelled ? 'reinstate' : 'cancel')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff9138] text-white shadow-sm"
                >
                  {cancelled ? <RotateCcw size={17} /> : <X size={19} strokeWidth={3} />}
                </button>
              </div>
            );
          })}
        </div>

        {success && <div className="mx-3 mt-4 rounded border border-[#b9dfbd] bg-[#effbef] px-3 py-2 text-[12px] text-[#2c7334]">{success}</div>}
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-label={mode === 'cancel' ? 'Room Cancellation' : 'Room Reinstatement'}>
          <div className="w-full max-w-[520px] overflow-visible rounded-[5px] bg-white shadow-2xl">
            <div className="rounded-t-[5px] bg-[#fff6eb] px-4 pb-3 pt-4 text-[#ff8a22]">
              <div className="text-[11px] font-medium">{mode === 'cancel' ? 'Cancellation' : 'Reinstatement'}</div>
              <div className="mt-1 border-b border-white pb-2 text-[14px] font-semibold">
                {selectedRoom.roomCode} <DoorClosed className="inline-block" size={16} /> &nbsp;|&nbsp; Room {selectedRoom.roomNumber} | {selectedRoom.guest}
              </div>
            </div>

            <div className="px-4 pb-4 pt-7">
              <div className="relative">
                <label className="block text-[12px] text-[#777]">Reason Code *</label>
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={reasonOpen}
                  onClick={() => setReasonOpen((open) => !open)}
                  className="mt-1 flex w-full items-center justify-between border-0 border-b border-[#aaa] bg-white px-0 py-2 text-left text-[13px] text-[#333] outline-none"
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <span className={selectedReason ? 'text-[#333]' : 'text-[#777]'}>
                    {selectedReason ? `${selectedReason.code} - ${selectedReason.description}` : 'Select Reason Code'}
                  </span>
                  <ChevronDown size={17} className={`shrink-0 text-[#777] transition-transform ${reasonOpen ? 'rotate-180' : ''}`} />
                </button>

                {reasonOpen && (
                  <div
                    role="listbox"
                    className="absolute left-0 right-0 top-full z-[180] mt-1 max-h-[210px] overflow-y-auto rounded-[3px] border border-[#ddd] bg-white py-1 shadow-xl"
                  >
                    {reasons.map((reason) => {
                      const selected = reason.code === reasonCode;
                      return (
                        <button
                          key={reason.code}
                          type="button"
                          role="option"
                          aria-selected={selected}
                          onClick={() => {
                            setReasonCode(reason.code);
                            setReasonOpen(false);
                            setError('');
                          }}
                          className={`block w-full border-0 px-3 py-2.5 text-left text-[13px] outline-none ${
                            selected
                              ? 'bg-[#fff4e8] font-medium text-[#ef861d]'
                              : 'bg-white text-[#333] hover:bg-[#fff9f2] focus:bg-[#fff9f2]'
                          }`}
                          style={{ WebkitTapHighlightColor: 'transparent' }}
                        >
                          {reason.code} - {reason.description}
                        </button>
                      );
                    })}
                    {!reasons.length && (
                      <div className="px-3 py-2.5 text-[12px] text-[#888]">No Reason Code available</div>
                    )}
                  </div>
                )}
              </div>

              {!reasons.length && (
                <div className="mt-2 text-[11px] text-red-600">No Reason Code is available. Set one under Hotel Settings → Department → Front Office → Reason.</div>
              )}

              <label className="mt-7 block text-[12px] text-[#777]">Remark</label>
              <input
                value={remark}
                maxLength={500}
                onChange={(event) => setRemark(event.target.value)}
                className="mt-1 w-full border-0 border-b border-[#aaa] bg-transparent px-0 py-2 text-[13px] outline-none"
              />

              {error && <div className="mt-3 rounded bg-[#fff1f1] px-3 py-2 text-[11px] text-[#b42318]">{error}</div>}

              <div className="mt-7 flex justify-end gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => { setSelectedRoomKey(null); setReasonCode(''); setReasonOpen(false); setRemark(''); setError(''); }}
                  className="rounded bg-[#ff962f] px-4 py-2 text-[12px] font-semibold text-white shadow"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedReason || saving}
                  onClick={() => void confirm()}
                  className="rounded bg-[#ff962f] px-4 py-2 text-[12px] font-semibold text-white shadow disabled:bg-[#ddd] disabled:text-white"
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    workspace,
  );
}
