'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BedDouble,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  DoorClosed,
  RotateCw,
  UserRound,
  Users,
} from 'lucide-react';
import type { Booking } from '@/lib/bookings';
import { roomCount, stayDates } from '@/lib/bookings';
import type { TransportData } from '@/lib/use-transport-data';

const ASSIGNMENT_KEY = '_roomAssignments';

type AssignmentMap = Record<string, string[]>;
type OperationalPolicyWithHousekeeping = TransportData['state']['hotelMasters']['profile']['operationalPolicy'] & {
  housekeepingRoomStatuses?: Record<string, string>;
};

type RoomView = {
  roomNo: string;
  roomTypeCode: string;
  locationCode: string;
  locationName: string;
  maxGuest: number;
  status: string;
  statusColor: string;
  assignedToOther: boolean;
};

function bookingReferenceFromScreen() {
  const text = document.querySelector<HTMLElement>('.booking-detail-bottom')?.textContent ?? '';
  return text.match(/P\d{6}/)?.[0] ?? null;
}

function readAssignments(booking: Booking): AssignmentMap {
  const raw = booking.specialRequests?.[ASSIGNMENT_KEY];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([roomType, roomNos]) => [
        roomType,
        Array.isArray(roomNos)
          ? Array.from(
              new Set(
                roomNos
                  .filter((roomNo): roomNo is string => typeof roomNo === 'string' && Boolean(roomNo.trim()))
                  .map((roomNo) => roomNo.trim()),
              ),
            )
          : [],
      ]),
    );
  } catch {
    return {};
  }
}

function assignmentCount(assignments: AssignmentMap) {
  return Array.from(new Set(Object.values(assignments).flat())).length;
}

function roomTypeBookedCount(booking: Booking, roomTypeCode: string) {
  return booking.rooms
    .filter((room) => room.code === roomTypeCode)
    .reduce((total, room) => total + room.count, 0);
}

export function BookingRoomAssignmentBridge({ store }: { store: TransportData }) {
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [roomTypeCode, setRoomTypeCode] = useState<string | null>(null);
  const [draftAssignments, setDraftAssignments] = useState<AssignmentMap>({});
  const [originalAssignments, setOriginalAssignments] = useState<AssignmentMap>({});
  const [openLocations, setOpenLocations] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const booking = useMemo(
    () => store.state.bookings.find((item) => item.reference === reference) ?? null,
    [reference, store.state.bookings],
  );

  useEffect(() => {
    setWorkspace(document.querySelector<HTMLElement>('.workspace'));

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLButtonElement>('.booking-section-card');
      if (!card || card.querySelector('strong')?.textContent?.trim() !== 'Room Assignment') return;

      const activeReference = bookingReferenceFromScreen();
      if (!activeReference) return;
      const activeBooking = store.state.bookings.find((item) => item.reference === activeReference);
      if (!activeBooking) return;

      event.preventDefault();
      event.stopPropagation();
      const assignments = readAssignments(activeBooking);
      setReference(activeReference);
      setRoomTypeCode(null);
      setDraftAssignments(assignments);
      setOriginalAssignments(assignments);
      setOpenLocations(new Set());
      setSaveError('');
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [store.state.bookings]);

  useEffect(() => {
    if (!reference) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || saving) return;
      if (roomTypeCode) {
        setRoomTypeCode(null);
        setDraftAssignments(originalAssignments);
        setSaveError('');
      } else {
        setReference(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [originalAssignments, reference, roomTypeCode, saving]);

  useEffect(() => {
    if (!snackbar) return;
    const timer = window.setTimeout(() => setSnackbar(null), 4000);
    return () => window.clearTimeout(timer);
  }, [snackbar]);

  const allRoomAssignments = useMemo(() => {
    const result = new Map<string, string>();
    for (const other of store.state.bookings) {
      if (!['Booked', 'Inhouse'].includes(other.status)) continue;
      for (const roomNos of Object.values(readAssignments(other))) {
        for (const roomNo of roomNos) {
          if (!result.has(roomNo)) result.set(roomNo, other.reference);
        }
      }
    }
    return result;
  }, [store.state.bookings]);

  const statusMap = useMemo(
    () => new Map(store.state.hotelMasters.roomStatuses.map((item) => [item.code, item])),
    [store.state.hotelMasters.roomStatuses],
  );

  const persistedRoomStatuses =
    (store.state.hotelMasters.profile.operationalPolicy as OperationalPolicyWithHousekeeping)
      .housekeepingRoomStatuses ?? {};

  if (!workspace || !reference || !booking) return null;

  const closeAll = () => {
    if (saving) return;
    setReference(null);
    setRoomTypeCode(null);
    setSaveError('');
  };

  const back = () => {
    if (saving) return;
    if (roomTypeCode) {
      setRoomTypeCode(null);
      setDraftAssignments(originalAssignments);
      setSaveError('');
    } else {
      closeAll();
    }
  };

  const distinctRoomTypes = Array.from(new Set(booking.rooms.map((room) => room.code)));
  const selectedRoomType = roomTypeCode
    ? store.state.hotelMasters.roomTypes.find((room) => room.code === roomTypeCode) ?? null
    : null;
  const requiredCount = roomTypeCode ? roomTypeBookedCount(booking, roomTypeCode) : 0;
  const currentSelected = roomTypeCode ? draftAssignments[roomTypeCode] ?? [] : [];
  const originalSelected = roomTypeCode ? originalAssignments[roomTypeCode] ?? [] : [];

  const matchingRooms: RoomView[] = roomTypeCode
    ? store.state.hotelMasters.rooms
        .filter((room) => room.active && room.roomTypeCode === roomTypeCode)
        .sort(
          (a, b) =>
            a.displaySequence - b.displaySequence ||
            a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }),
        )
        .map((room) => {
          const assignedRef = allRoomAssignments.get(room.roomNo);
          const assignedBooking = assignedRef
            ? store.state.bookings.find((item) => item.reference === assignedRef)
            : null;
          const defaultStatus = assignedBooking?.status === 'Inhouse' ? 'OD' : 'VC';
          const status = persistedRoomStatuses[room.roomNo] || defaultStatus;
          const masterStatus = statusMap.get(status);
          const locationName =
            store.state.hotelMasters.locations.find((item) => item.code === room.locationCode)?.description ||
            room.locationCode ||
            'N/A';
          return {
            roomNo: room.roomNo,
            roomTypeCode: room.roomTypeCode,
            locationCode: room.locationCode,
            locationName,
            maxGuest: room.maxGuest,
            status,
            statusColor: masterStatus?.color || '#999999',
            assignedToOther: Boolean(assignedRef && assignedRef !== booking.reference),
          };
        })
    : [];

  const locationGroups = Array.from(
    matchingRooms.reduce((map, room) => {
      const list = map.get(room.locationCode) ?? [];
      list.push(room);
      map.set(room.locationCode, list);
      return map;
    }, new Map<string, RoomView[]>()),
  ).sort((a, b) => {
    const locationOrder = store.state.hotelMasters.locations
      .filter((item) => item.active)
      .map((item) => item.code);
    return locationOrder.indexOf(a[0]) - locationOrder.indexOf(b[0]);
  });

  const vacantStatuses = new Set(['VC', 'VD', 'VI', 'VR']);
  const selectableRoom = (room: RoomView) =>
    !room.assignedToOther && (vacantStatuses.has(room.status) || currentSelected.includes(room.roomNo));

  const statusCounts = ['VC', 'VD', 'VI', 'VR'].map((code) => ({
    code,
    count: matchingRooms.filter((room) => room.status === code && !room.assignedToOther).length,
  }));

  const changed = JSON.stringify([...currentSelected].sort()) !== JSON.stringify([...originalSelected].sort());

  const toggleRoom = (room: RoomView) => {
    if (!roomTypeCode || !selectableRoom(room) || saving) return;
    setSaveError('');
    setDraftAssignments((current) => {
      const selected = current[roomTypeCode] ?? [];
      if (selected.includes(room.roomNo)) {
        return { ...current, [roomTypeCode]: selected.filter((item) => item !== room.roomNo) };
      }
      if (selected.length >= requiredCount) return current;
      return { ...current, [roomTypeCode]: [...selected, room.roomNo] };
    });
  };

  const autoAssign = () => {
    if (!roomTypeCode || saving) return;
    const priority = ['VR', 'VC', 'VI', 'VD'];
    const eligible = [...matchingRooms]
      .filter(selectableRoom)
      .sort((a, b) => priority.indexOf(a.status) - priority.indexOf(b.status));
    const existing = currentSelected.filter((roomNo) => eligible.some((room) => room.roomNo === roomNo));
    const needed = Math.max(0, requiredCount - existing.length);
    const picked = eligible
      .filter((room) => !existing.includes(room.roomNo))
      .slice(0, needed)
      .map((room) => room.roomNo);
    const next = [...existing, ...picked].slice(0, requiredCount);
    setDraftAssignments((current) => ({ ...current, [roomTypeCode]: next }));
    setOpenLocations(
      new Set(
        matchingRooms
          .filter((room) => next.includes(room.roomNo))
          .map((room) => room.locationCode),
      ),
    );
  };

  const reset = () => {
    if (!roomTypeCode || saving) return;
    setDraftAssignments((current) => ({ ...current, [roomTypeCode]: [...originalSelected] }));
    setSaveError('');
  };

  const save = async () => {
    if (!roomTypeCode || saving) return;
    setSaving(true);
    setSaveError('');
    try {
      const normalized: AssignmentMap = {
        ...originalAssignments,
        [roomTypeCode]: [...currentSelected],
      };
      const nextBooking: Booking = {
        ...booking,
        assignedRooms: assignmentCount(normalized),
        specialRequests: {
          ...(booking.specialRequests ?? {}),
          [ASSIGNMENT_KEY]: JSON.stringify(normalized),
        },
      };
      await store.run({ type: 'bookingUpdate', value: nextBooking });
      setOriginalAssignments(normalized);
      setDraftAssignments(normalized);
      setRoomTypeCode(null);
      setSnackbar('Assign Room(s) Successfully!');
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to assign room(s).');
    } finally {
      setSaving(false);
    }
  };

  const roomTypeList = (
    <div className="space-y-2 px-3 py-3">
      {distinctRoomTypes.map((code) => {
        const booked = roomTypeBookedCount(booking, code);
        const assigned = (originalAssignments[code] ?? []).length;
        return (
          <button
            key={code}
            type="button"
            onClick={() => {
              setRoomTypeCode(code);
              setDraftAssignments(originalAssignments);
              const firstLocation = store.state.hotelMasters.rooms.find(
                (room) => room.active && room.roomTypeCode === code,
              )?.locationCode;
              setOpenLocations(firstLocation ? new Set([firstLocation]) : new Set());
            }}
            className="flex w-full items-center justify-between rounded-[4px] bg-white px-3 py-4 text-left shadow-sm"
          >
            <span>
              <strong className="block text-[14px] text-[#111]">{code} | {stayDates(booking).replace('–', '-')}</strong>
              <small className="mt-1 flex items-center gap-1 text-[12px] text-[#333]">
                <BedDouble size={16} /> {assigned} / {booked}
              </small>
            </span>
            <ChevronRight size={23} />
          </button>
        );
      })}
    </div>
  );

  const assignmentDetail = roomTypeCode && selectedRoomType ? (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-3 mt-3 rounded-[3px] bg-white shadow-sm">
        <div className="flex items-start justify-between border-b border-[#ddd] px-3 py-3">
          <div>
            <div className="text-[11px] font-semibold text-[#ff8700]">Stay Information</div>
            <div className="mt-1 text-[13px] font-medium">{roomTypeCode}</div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]">
              {statusCounts.map((item) => (
                <span key={item.code} className="inline-flex items-center gap-1">
                  <span className="h-3 w-3 border border-[#999] bg-white" />
                  {item.code}: {item.count}
                </span>
              ))}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[11px] font-semibold text-[#ff8700]">Assigned Room</div>
            <div className="mt-1 flex items-center justify-end gap-1 text-[13px]"><BedDouble size={17} /> {currentSelected.length} / {requiredCount}</div>
          </div>
        </div>

        <div className="max-h-[calc(100vh-330px)] overflow-y-auto px-2 py-2">
          {locationGroups.map(([locationCode, rooms]) => {
            const open = openLocations.has(locationCode);
            const selectedInGroup = rooms.filter((room) => currentSelected.includes(room.roomNo)).length;
            const locationName = rooms[0]?.locationName || locationCode;
            return (
              <div key={locationCode} className="mb-1">
                <div className={`flex items-center justify-between px-2 py-2 ${open ? 'bg-[#fff5e8]' : 'bg-[#dedede]'}`}>
                  <button
                    type="button"
                    className="flex flex-1 items-center text-left text-[13px] font-semibold"
                    onClick={() =>
                      setOpenLocations((current) => {
                        const next = new Set(current);
                        if (next.has(locationCode)) next.delete(locationCode);
                        else next.add(locationCode);
                        return next;
                      })
                    }
                  >
                    {locationName} <span className="ml-1 text-[#e30023]">({selectedInGroup}/{rooms.length})</span>
                  </button>
                  {open && (
                    <div className="mr-2 flex items-center gap-1">
                      <button type="button" onClick={autoAssign} className="inline-flex items-center gap-1 rounded-[4px] border border-[#ff9000] bg-white px-2 py-1 text-[12px] text-[#777]"><Check size={14} /> Auto</button>
                      <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-[4px] border border-[#ff9000] bg-white px-2 py-1 text-[12px] text-[#ff9000]"><RotateCw size={14} /> Reset</button>
                    </div>
                  )}
                  <button
                    type="button"
                    aria-label={open ? `Collapse ${locationName}` : `Expand ${locationName}`}
                    onClick={() =>
                      setOpenLocations((current) => {
                        const next = new Set(current);
                        if (next.has(locationCode)) next.delete(locationCode);
                        else next.add(locationCode);
                        return next;
                      })
                    }
                    className="p-1 text-[#666]"
                  >
                    <ChevronDown size={18} className={open ? 'rotate-180' : ''} />
                  </button>
                </div>

                {open && (
                  <div className="grid grid-cols-4 gap-2 bg-[#efefef] p-2 max-[900px]:grid-cols-3 max-[700px]:grid-cols-2">
                    {rooms.map((room) => {
                      const selected = currentSelected.includes(room.roomNo);
                      const eligible = selectableRoom(room);
                      return (
                        <button
                          key={room.roomNo}
                          type="button"
                          disabled={!eligible || saving}
                          onClick={() => toggleRoom(room)}
                          className={`min-h-[58px] rounded-[3px] px-2 py-1 text-left text-white shadow-sm ${!eligible && !selected ? 'cursor-not-allowed opacity-45' : ''}`}
                          style={{ backgroundColor: selected ? '#3210c8' : room.statusColor }}
                          title={room.assignedToOther ? 'Assigned to another booking' : `${room.roomNo} - ${room.status}`}
                        >
                          <div className="flex items-center justify-between text-[12px] font-bold">
                            <span>{room.roomNo}</span>
                            <span>{room.status}</span>
                          </div>
                          <div className="mt-1 flex items-end justify-between text-[11px]">
                            <strong>{room.roomTypeCode}</strong>
                            <span className="inline-flex items-center gap-[2px]"><Users size={11} /> {room.maxGuest}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          {!locationGroups.length && (
            <div className="p-8 text-center text-[13px] text-[#777]">No active rooms are configured for {roomTypeCode}.</div>
          )}
        </div>
      </div>

      {saveError && <p className="mx-3 mt-2 text-[12px] font-medium text-[#b42318]" role="alert">{saveError}</p>}
      <div className="mt-auto border-t border-[#ddd] bg-white px-3 py-3 text-center shadow-[0_-3px_10px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={() => void save()}
          disabled={!changed || saving}
          className="min-w-[130px] rounded-[4px] bg-[#ff9428] px-8 py-2 text-[14px] font-semibold text-white shadow disabled:bg-[#d8d8d8] disabled:text-[#aaa]"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  ) : null;

  return createPortal(
    <section className="absolute inset-0 z-[75] flex min-h-0 flex-col bg-[#f5f5f5]" aria-label="Room Assignment">
      <div className="shrink-0 px-3 pt-3">
        <div className="relative min-h-[72px] overflow-hidden bg-[radial-gradient(ellipse_at_82%_105%,#ffbd14_0_39%,transparent_39.5%),radial-gradient(ellipse_at_38%_-55%,#f57818_0_51%,transparent_51.5%),linear-gradient(110deg,#f89912,#ffa524_65%,#f67e1b)] px-3 pb-7 pt-2">
          <div className="flex items-start gap-2">
            <button type="button" onClick={back} disabled={saving} className="grid h-8 w-8 place-items-center rounded-[3px] bg-white text-[#e78300] shadow disabled:opacity-60" aria-label="Back">
              <ChevronLeft size={23} />
            </button>
            <div>
              <small className="block text-[10px] font-semibold text-white">HMS</small>
              <strong className="block text-[13px] text-[#111]">{store.state.hotelMasters.profile.hotelName || 'HOTEL PARADISE'}</strong>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 border-t border-white/50 px-3 py-1 text-[10px] text-[#151515]">... / ... / Room Assignment</div>
        </div>

        <div className="bg-[#fff8ed] px-3 py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <strong className="text-[13px]">{stayDates(booking).replace('–', '-')}</strong>
              <span className="inline-flex items-center gap-1 text-[11px]"><DoorClosed size={15} /> <span className={booking.assignedRooms < roomCount(booking) ? 'text-[#d90029]' : ''}>{booking.assignedRooms}</span>/{roomCount(booking)}</span>
              <span className="inline-flex items-center gap-1 text-[11px]"><UserRound size={15} /> <span className={booking.checkedInGuests < booking.guests ? 'text-[#d90029]' : ''}>{booking.checkedInGuests}</span>/{booking.guests}</span>
            </div>
            <strong className="text-[12px] text-[#ff174f]">{booking.amount.toFixed(2)}</strong>
          </div>
          <div className="mt-1 text-[11px]">{booking.reference} &nbsp;|&nbsp; {booking.guest}</div>
        </div>
      </div>

      <div className="min-h-0 flex flex-1 flex-col overflow-hidden">
        {roomTypeCode ? assignmentDetail : roomTypeList}
      </div>

      {snackbar && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 z-[120] -translate-x-1/2">
          <div className="pointer-events-auto flex items-center gap-7 whitespace-nowrap rounded-[4px] bg-[#303030] px-4 py-3 text-[13px] font-semibold text-white shadow-2xl" role="status" aria-live="polite">
            <span>{snackbar}</span>
            <button type="button" onClick={() => setSnackbar(null)} className="border-0 bg-transparent p-0 text-[12px] font-semibold uppercase text-[#8ab4f8]">Dismiss</button>
          </div>
        </div>
      )}
    </section>,
    workspace,
  );
}
