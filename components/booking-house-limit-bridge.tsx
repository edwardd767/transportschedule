'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { BedDouble, ChevronLeft, DoorClosed } from 'lucide-react';
import { stayDates, type Booking } from '@/lib/bookings';
import type { TransportData } from '@/lib/use-transport-data';

const HOUSE_LIMIT_KEY = '_houseLimits';
const ASSIGNMENT_KEY = '_roomAssignments';

type NumberMap = Record<string, number[]>;
type AssignmentMap = Record<string, string[]>;

function bookingReferenceFromScreen() {
  const text = document.querySelector<HTMLElement>('.booking-detail-bottom')?.textContent ?? '';
  return text.match(/P\d{6}/)?.[0] ?? null;
}

function parseMap<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    const value = JSON.parse(raw) as T;
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function readHouseLimits(booking: Booking): NumberMap {
  const parsed = parseMap<Record<string, unknown>>(booking.specialRequests?.[HOUSE_LIMIT_KEY], {});
  const result: NumberMap = {};
  for (const [code, values] of Object.entries(parsed)) {
    if (!Array.isArray(values)) continue;
    result[code] = values.map((value) => Number(value)).filter((value) => Number.isFinite(value) && value >= 0);
  }
  return result;
}

function readAssignments(booking: Booking): AssignmentMap {
  const parsed = parseMap<Record<string, unknown>>(booking.specialRequests?.[ASSIGNMENT_KEY], {});
  const result: AssignmentMap = {};
  for (const [code, values] of Object.entries(parsed)) {
    if (!Array.isArray(values)) continue;
    result[code] = values.filter((value): value is string => typeof value === 'string');
  }
  return result;
}

export function BookingHouseLimitBridge({ store }: { store: TransportData }) {
  const [workspace, setWorkspace] = useState<HTMLElement | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string[]>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const booking = useMemo(
    () => store.state.bookings.find((item) => item.reference === reference) ?? null,
    [reference, store.state.bookings],
  );

  useEffect(() => {
    setWorkspace(document.querySelector<HTMLElement>('.workspace'));
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const card = target?.closest<HTMLButtonElement>('.booking-section-card');
      if (!card || card.querySelector('strong')?.textContent?.trim() !== 'House Limit') return;
      const activeReference = bookingReferenceFromScreen();
      const activeBooking = store.state.bookings.find((item) => item.reference === activeReference);
      if (!activeBooking) return;
      event.preventDefault();
      event.stopPropagation();

      const saved = readHouseLimits(activeBooking);
      const next: Record<string, string[]> = {};
      for (const room of activeBooking.rooms) {
        const master = store.state.hotelMasters.roomTypes.find((item) => item.code === room.code);
        const defaultValue = master?.houseLimit ?? 0;
        const values = saved[room.code] ?? [];
        next[room.code] = Array.from({ length: room.count }, (_, index) =>
          Number.isFinite(values[index]) ? Number(values[index]).toFixed(2) : Number(defaultValue).toFixed(2),
        );
      }
      setDraft(next);
      setReference(activeBooking.reference);
      setError('');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [store.state.bookings, store.state.hotelMasters.roomTypes]);

  useEffect(() => {
    if (!reference) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setReference(null);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [reference, saving]);

  if (!workspace || !reference || !booking) return null;

  const assignments = readAssignments(booking);
  const rows = booking.rooms.flatMap((room) =>
    Array.from({ length: room.count }, (_, index) => ({
      key: `${room.code}-${index}`,
      code: room.code,
      index,
      roomNo: assignments[room.code]?.[index] ?? '',
      guest: booking.guest || 'N/A',
    })),
  );

  const save = async () => {
    if (saving) return;
    const value: NumberMap = {};
    for (const room of booking.rooms) {
      const values = draft[room.code] ?? [];
      const parsed = values.map((entry) => Number(entry));
      if (parsed.length !== room.count || parsed.some((entry) => !Number.isFinite(entry) || entry < 0)) {
        setError('Enter a valid House Limit for every room.');
        return;
      }
      value[room.code] = parsed;
    }
    setSaving(true);
    setError('');
    try {
      await store.run({
        type: 'bookingUpdate',
        value: {
          ...booking,
          specialRequests: {
            ...(booking.specialRequests ?? {}),
            [HOUSE_LIMIT_KEY]: JSON.stringify(value),
          },
        },
      });
      setReference(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save House Limit.');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <section className="absolute inset-0 z-[55] flex min-h-0 flex-col bg-[#f4f4f4] p-3" aria-label="House Limit">
      <div className="relative min-h-[72px] shrink-0 overflow-hidden bg-[radial-gradient(ellipse_at_82%_105%,#ffbd14_0_39%,transparent_39.5%),radial-gradient(ellipse_at_38%_-55%,#f57818_0_51%,transparent_51.5%),linear-gradient(110deg,#f89912,#ffa524_65%,#f67e1b)] px-3 pb-7 pt-2">
        <div className="flex items-start gap-2">
          <button type="button" onClick={() => setReference(null)} disabled={saving} className="grid h-8 w-8 place-items-center rounded-[3px] bg-white text-[#e78300] shadow disabled:opacity-60" aria-label="Back">
            <ChevronLeft size={23} />
          </button>
          <div>
            <small className="block text-[10px] font-semibold text-white">HMS</small>
            <strong className="block text-[13px] text-[#111]">{store.state.hotelMasters.profile.hotelName || 'HOTEL PARADISE'}</strong>
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-white/50 px-3 py-1 text-[10px] text-[#151515]">... / ... / House Limit</div>
      </div>

      <div className="shrink-0 bg-[#fff8ef] px-3 py-2 text-[12px]">
        <div className="flex items-center justify-between"><strong>{stayDates(booking).replace('–', '-')}</strong><strong className="text-[#ff2855]">{Number(booking.amount || 0).toFixed(2)}</strong></div>
        <div className="mt-1">{booking.reference} <span className="mx-2">|</span> {booking.guest}</div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        <div className="mb-1 flex items-center justify-between px-2 text-[11px] font-semibold"><span>Room Details</span><span>House Limit</span></div>
        <div className="space-y-1">
          {rows.map((row, rowIndex) => (
            <div key={row.key} className="flex min-h-[52px] items-center justify-between rounded-[3px] bg-white px-3 py-2 shadow-sm">
              <div className="min-w-0 text-[11px] text-[#111]">
                <div className="flex items-center gap-1 font-semibold">
                  <span>{rowIndex + 1}. {row.code}</span>
                  <BedDouble size={14} />
                  <span>{row.roomNo || '-'}</span>
                </div>
                <div className="mt-1 truncate">{row.guest}</div>
              </div>
              <input
                aria-label={`House Limit for ${row.code} room ${rowIndex + 1}`}
                inputMode="decimal"
                value={draft[row.code]?.[row.index] ?? ''}
                onChange={(event) => {
                  const nextValue = event.target.value;
                  if (!/^\d*(?:\.\d{0,2})?$/.test(nextValue)) return;
                  setDraft((current) => {
                    const list = [...(current[row.code] ?? [])];
                    list[row.index] = nextValue;
                    return { ...current, [row.code]: list };
                  });
                }}
                onBlur={(event) => {
                  const value = Number(event.target.value);
                  if (!Number.isFinite(value) || value < 0) return;
                  setDraft((current) => {
                    const list = [...(current[row.code] ?? [])];
                    list[row.index] = value.toFixed(2);
                    return { ...current, [row.code]: list };
                  });
                }}
                className="w-[180px] rounded-[3px] border border-[#bdbdbd] bg-white px-2 py-1 text-right text-[13px] text-[#111] outline-none ring-0 focus:border-[#bdbdbd] focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                style={{ outline: 'none', boxShadow: 'none' }}
              />
            </div>
          ))}
        </div>
        {error && <p className="mt-2 text-[12px] text-red-600" role="alert">{error}</p>}
      </div>

      <div className="shrink-0 border-t border-[#ddd] bg-white py-3 text-center shadow-[0_-2px_8px_rgba(0,0,0,0.08)]">
        <button type="button" disabled={saving} onClick={() => void save()} className="min-w-[126px] rounded-[4px] bg-[#ff932f] px-8 py-2 text-[13px] font-semibold text-white shadow disabled:opacity-60">
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>,
    workspace,
  );
}
