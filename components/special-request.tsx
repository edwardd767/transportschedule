'use client';

import { useState } from 'react';
import type { Booking } from '@/lib/bookings';

export function SpecialRequest({
  booking,
  onSave,
  onBack,
}: {
  booking: Booking;
  onSave: (value: Booking) => Promise<void>;
  onBack: () => void;
}) {
  const [requests, setRequests] = useState<Record<string, string>>(
    booking.specialRequests || {},
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await onSave({ ...booking, specialRequests: requests });
      onBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Special Request"
    >
      <div className="w-full max-w-[600px] overflow-hidden rounded-[3px] bg-white shadow-2xl">
        <div className="bg-[#fff6eb] px-3 pb-3 pt-3">
          <div className="text-[11px] font-medium text-[#f28b00]">Special Request</div>
          <div className="mt-1 border-b border-[#e6ddd3] pb-2 text-[15px] font-semibold text-[#ff8a00]">
            {booking.reference}
          </div>
        </div>

        <div className="px-3 pb-2 pt-5">
          <div className="space-y-5">
            {booking.rooms.map((room, index) => {
              const key = `${room.code}-${index}`;
              const roomLabel = `Room ${index + 1} - ${room.code}`;
              return (
                <label key={key} className="block">
                  <span className="block text-[13px] text-[#a0a0a0]">{roomLabel}</span>
                  <input
                    value={requests[key] || ''}
                    onChange={(event) =>
                      setRequests({ ...requests, [key]: event.target.value })
                    }
                    className="mt-1 w-full bg-transparent px-0 pb-2 text-[17px] text-[#333] outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0"
                    style={{
                      border: 'none',
                      borderBottom: '1px solid #999',
                      outline: 'none',
                      boxShadow: 'none',
                    }}
                    maxLength={2000}
                  />
                </label>
              );
            })}
          </div>

          <div className="mt-5 flex justify-end gap-2 pb-1">
            <button
              type="button"
              className="rounded-[4px] bg-[#ff9400] px-3 py-2 text-[13px] font-semibold text-white shadow disabled:opacity-60"
              disabled={saving}
              onClick={onBack}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded-[4px] bg-[#ff9400] px-3 py-2 text-[13px] font-semibold text-white shadow disabled:opacity-60"
              disabled={saving}
              onClick={() => void save()}
            >
              {saving ? 'Saving…' : 'Confirm'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
