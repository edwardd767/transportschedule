'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BedDouble,
  Building2,
  Check,
  ChevronDown,
  DoorOpen,
  Grid2X2,
  Pencil,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import type { Booking } from '@/lib/bookings';
import type { TransportData } from '@/lib/use-transport-data';

type HousekeepingStatus = string;
type AssignmentMap = Record<string, string[]>;
type OperationalPolicyWithHousekeeping = TransportData['state']['hotelMasters']['profile']['operationalPolicy'] & {
  housekeepingRoomStatuses?: Record<string, string>;
};

type StatusLegendItem = {
  code: string;
  label: string;
  color: string;
};

type RoomRow = {
  roomNo: string;
  roomType: string;
  status: HousekeepingStatus;
  guest: string;
  bookingReference?: string;
  bookingStatus?: Booking['status'];
  locationCode: string;
  location: string;
  checkout?: string;
};

const assignmentKey = '_roomAssignments';

function checkoutText(departure: string, checkoutTime: string) {
  const match = checkoutTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  let hour = match ? Number(match[1]) : 12;
  const minute = match ? Number(match[2]) : 0;
  const meridiem = match?.[3]?.toUpperCase();
  if (meridiem === 'PM' && hour < 12) hour += 12;
  if (meridiem === 'AM' && hour === 12) hour = 0;
  const target = new Date(`${departure}T00:00:00`);
  target.setHours(hour, minute, 0, 0);
  const hours = Math.round((target.getTime() - Date.now()) / 3600000);
  return `C/O In ${hours} hrs`;
}

function readAssignments(booking: Booking): AssignmentMap {
  const raw = booking.specialRequests?.[assignmentKey];
  if (!raw) return {};
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return Object.fromEntries(
      Object.entries(value).map(([roomType, roomNos]) => [
        roomType,
        Array.isArray(roomNos)
          ? Array.from(
              new Set(
                roomNos
                  .filter(
                    (roomNo): roomNo is string =>
                      typeof roomNo === 'string' && roomNo.trim(),
                  )
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

function buildRows(store: TransportData): RoomRow[] {
  const { hotelMasters, bookings } = store.state;
  const activeRooms = [...hotelMasters.rooms]
    .filter((room) => room.active)
    .sort(
      (a, b) =>
        a.displaySequence - b.displaySequence ||
        a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }),
    );
  const locations = new Map(
    hotelMasters.locations.map((item) => [item.code, item.description]),
  );
  const persistedStatuses =
    (hotelMasters.profile.operationalPolicy as OperationalPolicyWithHousekeeping)
      .housekeepingRoomStatuses ?? {};

  // Room assignment is read-only in Housekeeping. Assignment is handled by Front Desk.
  const assignedByRoom = new Map<string, Booking>();
  for (const booking of bookings) {
    if (!['Booked', 'Inhouse'].includes(booking.status)) continue;
    for (const roomNos of Object.values(readAssignments(booking))) {
      for (const roomNo of roomNos) {
        if (!assignedByRoom.has(roomNo)) assignedByRoom.set(roomNo, booking);
      }
    }
  }

  const checkoutTime =
    hotelMasters.profile.operationalPolicy.standardCheckOutTime || '12:00 PM';

  return activeRooms.map((room) => {
    const assignedBooking = assignedByRoom.get(room.roomNo);
    const defaultStatus = assignedBooking?.status === 'Inhouse' ? 'OD' : 'VC';
    return {
      roomNo: room.roomNo,
      roomType: room.roomTypeCode,
      status: persistedStatuses[room.roomNo] || defaultStatus,
      guest: assignedBooking?.guest || assignedBooking?.accountName || 'N/A',
      bookingReference: assignedBooking?.reference,
      bookingStatus: assignedBooking?.status,
      locationCode: room.locationCode,
      location: locations.get(room.locationCode) ?? room.locationCode ?? 'N/A',
      checkout:
        assignedBooking?.status === 'Inhouse'
          ? checkoutText(assignedBooking.departure, checkoutTime)
          : undefined,
    };
  });
}

function HousekeepingScreen({ store }: { store: TransportData }) {
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('all');
  const [statusFilter, setStatusFilter] = useState<HousekeepingStatus | 'all'>('all');
  const [statusMenuRoomNo, setStatusMenuRoomNo] = useState<string | null>(null);
  const [savingRoomNo, setSavingRoomNo] = useState<string | null>(null);
  const [statusError, setStatusError] = useState('');

  const statusLegend = useMemo<StatusLegendItem[]>(
    () =>
      store.state.hotelMasters.roomStatuses
        .filter((item) => item.active)
        .map((item) => ({
          code: item.code,
          label: item.description,
          color: item.color,
        })),
    [store.state.hotelMasters.roomStatuses],
  );

  const baseRows = useMemo(
    () => buildRows(store),
    [
      store.state.hotelMasters.rooms,
      store.state.hotelMasters.locations,
      store.state.hotelMasters.profile.operationalPolicy,
      store.state.bookings,
    ],
  );

  const activeLocations = useMemo(
    () => store.state.hotelMasters.locations.filter((item) => item.active),
    [store.state.hotelMasters.locations],
  );

  const rows = useMemo(
    () =>
      baseRows
        .filter((room) => statusFilter === 'all' || room.status === statusFilter)
        .filter((room) => location === 'all' || room.locationCode === location)
        .filter((room) =>
          `${room.roomNo} ${room.roomType} ${room.guest} ${room.bookingReference ?? ''} ${room.status} ${room.location}`
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
        ),
    [baseRows, location, query, statusFilter],
  );

  const statusColor = (code: string) =>
    statusLegend.find((item) => item.code === code)?.color ?? '#888';

  const saveStatus = async (room: RoomRow, statusCode: string) => {
    if (savingRoomNo) return;
    setSavingRoomNo(room.roomNo);
    setStatusError('');
    try {
      const profile = store.state.hotelMasters.profile;
      const policy = profile.operationalPolicy as OperationalPolicyWithHousekeeping;
      await store.run({
        type: 'hotelProfileSave',
        value: {
          ...profile,
          operationalPolicy: {
            ...policy,
            housekeepingRoomStatuses: {
              ...(policy.housekeepingRoomStatuses ?? {}),
              [room.roomNo]: statusCode,
            },
          },
        },
      });
      setStatusMenuRoomNo(null);
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : 'Unable to update housekeeping status.',
      );
    } finally {
      setSavingRoomNo(null);
    }
  };

  useEffect(() => {
    if (!statusMenuRoomNo) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !savingRoomNo) {
        setStatusMenuRoomNo(null);
        setStatusError('');
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (target?.closest('[data-housekeeping-status-ui="true"]')) return;
      if (!savingRoomNo) {
        setStatusMenuRoomNo(null);
        setStatusError('');
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [savingRoomNo, statusMenuRoomNo]);

  const propertyName =
    store.state.hotelMasters.profile.hotelName || 'HOTEL PARADISE';

  return (
    <section
      className="absolute inset-0 z-[30] flex min-h-0 flex-col bg-[#f4f4f4] px-4 pb-3 pt-3"
      aria-label="Housekeeping Room Management"
    >
      <div className="relative min-h-[72px] shrink-0 overflow-hidden bg-[radial-gradient(ellipse_at_82%_105%,#ffbd14_0_39%,transparent_39.5%),radial-gradient(ellipse_at_38%_-55%,#f57818_0_51%,transparent_51.5%),linear-gradient(110deg,#f89912,#ffa524_65%,#f67e1b)] px-3 pb-7 pt-2">
        <div className="flex items-start justify-between">
          <div>
            <small className="block text-[11px] font-semibold text-white">HMS</small>
            <strong className="block text-[14px] font-semibold text-[#111]">
              {propertyName}
            </strong>
          </div>
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-[#f79400] shadow">
            ↔
          </span>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/40 bg-[#f08013]/10 px-3 py-1 text-[11px] text-[#151515]">
          ... / Room Management
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-4 gap-2 bg-white px-2 py-2">
        {[
          ['🧹', 'Room Status'],
          ['🧾', 'Misc Charges'],
          ['🚫', 'Block Room'],
          ['⚙️', 'Services'],
        ].map(([icon, label]) => (
          <button
            key={label}
            type="button"
            className="flex min-h-[58px] flex-col items-center justify-center gap-1 rounded-[5px] border border-[#ddd] bg-white text-[11px] font-semibold shadow-sm hover:bg-[#fff8ef]"
          >
            <span className="text-[20px] leading-none">{icon}</span>
            {label}
          </button>
        ))}
      </div>

      <div className="flex shrink-0 items-stretch gap-2 bg-[#fff7ee] px-2 pb-2">
        <label className="flex min-h-[46px] flex-1 items-center gap-3 bg-white px-3 shadow-sm">
          <Search size={20} className="text-[#777]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search here.."
            className="min-w-0 flex-1 border-0 bg-transparent text-[14px] outline-none placeholder:text-[#a0a0a0] focus:outline-none focus:ring-0"
          />
          <SlidersHorizontal size={21} className="text-[#333]" />
        </label>
        <label className="relative flex min-w-[170px] items-center bg-white shadow-sm">
          <select
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="h-full w-full appearance-none border-0 bg-transparent px-4 pr-10 text-[13px] font-semibold outline-none focus:outline-none focus:ring-0"
          >
            <option value="all">Location</option>
            {activeLocations.map((item) => (
              <option value={item.code} key={item.code}>
                {item.description}
              </option>
            ))}
          </select>
          <ChevronDown
            size={18}
            className="pointer-events-none absolute right-3 text-[#222]"
          />
        </label>
        <button
          type="button"
          aria-label="Grid view"
          className="grid min-w-[48px] place-items-center bg-white text-[#ff8a00] shadow-sm"
        >
          <Grid2X2 size={22} />
        </button>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 bg-white px-3 py-2 text-[11px]">
        {statusLegend.map((item) => (
          <button
            type="button"
            key={item.code}
            onClick={() =>
              setStatusFilter((current) =>
                current === item.code ? 'all' : item.code,
              )
            }
            className={`inline-flex items-center gap-1 border-0 bg-transparent p-0 ${statusFilter === item.code ? 'font-bold' : ''}`}
            title={`Filter ${item.label}`}
          >
            <span
              className="h-[10px] w-[10px] rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </button>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-[#efefef] px-2 pb-3 pt-1">
        <div className="space-y-[5px]">
          {rows.map((room) => {
            const occupied = room.status === 'OC' || room.status === 'OD';
            const menuOpen = statusMenuRoomNo === room.roomNo;
            return (
              <article
                key={room.roomNo}
                className="relative flex min-h-[78px] items-stretch overflow-visible rounded-[4px] bg-white shadow-sm"
              >
                <div
                  className="m-2 flex w-[112px] shrink-0 flex-col justify-center rounded-[3px] px-2 text-white"
                  style={{ backgroundColor: statusColor(room.status) }}
                >
                  <div className="flex items-center justify-between text-[13px] font-bold">
                    <span>{room.roomNo}</span>
                    <span>{room.status}</span>
                  </div>
                  <strong className="mt-1 text-[13px]">{room.roomType}</strong>
                </div>

                <div className="flex min-w-0 flex-1 items-center justify-between gap-4 px-2 py-2">
                  <div className="min-w-0 text-[12px] text-[#151515]">
                    <div className="flex items-center gap-2 font-semibold">
                      <Building2 size={17} className="text-[#444]" />
                      <span className="truncate">{room.guest}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <DoorOpen size={17} className="text-[#444]" />
                      <span>
                        {room.bookingReference
                          ? `${room.bookingReference} · ${room.location}`
                          : room.location}
                      </span>
                    </div>
                  </div>

                  <div
                    className="relative flex shrink-0 items-center gap-4"
                    data-housekeeping-status-ui="true"
                  >
                    {occupied && room.checkout ? (
                      <strong className="text-[11px]">{room.checkout}</strong>
                    ) : (
                      <span />
                    )}
                    <button
                      type="button"
                      aria-label={`Change room ${room.roomNo} housekeeping status`}
                      title="Change housekeeping status"
                      aria-expanded={menuOpen}
                      onClick={() => {
                        setStatusError('');
                        setStatusMenuRoomNo((current) =>
                          current === room.roomNo ? null : room.roomNo,
                        );
                      }}
                      className="border-0 bg-transparent p-1 text-[#ff8a18]"
                    >
                      <Pencil size={21} fill="currentColor" />
                    </button>

                    {menuOpen && (
                      <div
                        className="absolute right-0 top-[42px] z-[90] w-[205px] rounded-[3px] border border-[#e1e1e1] bg-white py-2 shadow-xl"
                        role="menu"
                        aria-label={`Room ${room.roomNo} housekeeping statuses`}
                        data-housekeeping-status-ui="true"
                      >
                        {statusLegend.length ? (
                          statusLegend.map((item) => {
                            const selected = room.status === item.code;
                            const saving = savingRoomNo === room.roomNo;
                            return (
                              <button
                                key={item.code}
                                type="button"
                                role="menuitemradio"
                                aria-checked={selected}
                                disabled={saving}
                                onClick={() => void saveStatus(room, item.code)}
                                className="flex w-full items-center gap-2 border-0 bg-white px-3 py-2 text-left text-[14px] text-[#444] hover:bg-[#f7f7f7] disabled:opacity-60"
                              >
                                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center">
                                  {selected && (
                                    <span className="grid h-[18px] w-[18px] place-items-center rounded-[2px] bg-[#ff9a2f] text-white">
                                      <Check size={14} strokeWidth={3} />
                                    </span>
                                  )}
                                </span>
                                <span className="min-w-0 flex-1 truncate">
                                  {item.label}
                                </span>
                                <span
                                  className="h-[8px] w-[8px] shrink-0 rounded-full"
                                  style={{ backgroundColor: item.color }}
                                  aria-hidden="true"
                                />
                              </button>
                            );
                          })
                        ) : (
                          <div className="px-3 py-3 text-[12px] text-[#777]">
                            No active Room Status is configured.
                          </div>
                        )}
                        {statusError && (
                          <p
                            className="border-t border-[#eee] px-3 pb-1 pt-2 text-[11px] font-medium text-[#b42318]"
                            role="alert"
                          >
                            {statusError}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
          {!rows.length && (
            <div className="rounded bg-white p-8 text-center text-sm text-[#777]">
              No rooms match the selected filters.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function HousekeepingBridge({ store }: { store: TransportData }) {
  const [navMount, setNavMount] = useState<HTMLButtonElement | null>(null);
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    let observer: MutationObserver | null = null;
    let mount: HTMLButtonElement | null = null;
    let targetWorkspace: HTMLElement | null = null;
    let previousPosition = '';

    const attach = () => {
      const nav = document.querySelector<HTMLElement>('.main-nav');
      targetWorkspace = document.querySelector<HTMLElement>('.workspace');
      if (!nav || !targetWorkspace) return false;

      const existing = nav.querySelector<HTMLButtonElement>(
        '[data-housekeeping-nav="true"]',
      );
      if (existing) {
        mount = existing;
      } else {
        mount = document.createElement('button');
        mount.type = 'button';
        mount.dataset.housekeepingNav = 'true';
        const frontDesk = Array.from(nav.children).find(
          (node) =>
            node instanceof HTMLButtonElement &&
            node.textContent?.trim().includes('Front Desk'),
        );
        if (frontDesk?.nextSibling) nav.insertBefore(mount, frontDesk.nextSibling);
        else nav.appendChild(mount);
      }

      previousPosition = targetWorkspace.style.position;
      targetWorkspace.style.position = 'relative';
      setNavMount(mount);
      setWorkspace(targetWorkspace);
      return true;
    };

    if (!attach()) {
      observer = new MutationObserver(() => {
        if (attach()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      if (targetWorkspace) targetWorkspace.style.position = previousPosition;
      mount?.remove();
    };
  }, []);

  useEffect(() => {
    if (!navMount) return;

    const openHousekeeping = () => {
      document
        .querySelectorAll<HTMLButtonElement>('.main-nav > button')
        .forEach((button) => button.classList.remove('active'));
      navMount.classList.add('active');
      navMount.setAttribute('aria-current', 'page');
      setActive(true);
    };

    const leaveHousekeeping = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const button = target?.closest<HTMLButtonElement>('.main-nav > button');
      if (!button || button === navMount) return;
      setActive(false);
      navMount.classList.remove('active');
      navMount.removeAttribute('aria-current');
    };

    navMount.addEventListener('click', openHousekeeping);
    document.addEventListener('click', leaveHousekeeping, true);
    return () => {
      navMount.removeEventListener('click', openHousekeeping);
      document.removeEventListener('click', leaveHousekeeping, true);
    };
  }, [navMount]);

  return (
    <>
      {navMount &&
        createPortal(
          <>
            <BedDouble />
            <span>Housekeeping</span>
          </>,
          navMount,
        )}
      {workspace && active &&
        createPortal(<HousekeepingScreen store={store} />, workspace)}
    </>
  );
}
