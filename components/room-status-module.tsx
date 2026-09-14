'use client';

import { useEffect, useMemo, useState } from 'react';
import type { RoomStatus } from '@/lib/hotel-masters';

const HOTELX_ROOM_STATUS_COLORS: Record<string, string> = {
  OC: '#f094c9',
  OD: '#fc1e51',
  OOI: '#c8c8c8',
  OOO: '#535353',
  VC: '#57dfb9',
  VD: '#046f16',
  VI: '#0842c9',
  VR: '#1fb6f9',
};

const LEGACY_ROOM_STATUS_COLORS: Record<string, string> = {
  OC: '#26743a',
  OD: '#a5001b',
  OOI: '#cfcfcf',
  OOO: '#555555',
  VC: '#80c83b',
  VD: '#e4002b',
  VI: '#2f4bc4',
  VR: '#2ca9df',
};

function withHotelXColors(statuses: RoomStatus[]) {
  return statuses.map((status) => {
    const legacy = LEGACY_ROOM_STATUS_COLORS[status.code];
    const target = HOTELX_ROOM_STATUS_COLORS[status.code];
    if (legacy && target && status.color.toLowerCase() === legacy) return { ...status, color: target };
    return status;
  });
}

export function RoomStatusModule({
  statuses,
  onChange,
}: {
  statuses: RoomStatus[];
  onChange: (value: RoomStatus[]) => void | Promise<void>;
  onBack: () => void;
}) {
  const baseline = useMemo(() => withHotelXColors(statuses), [statuses]);
  const [draft, setDraft] = useState<RoomStatus[]>(baseline);
  const [saving, setSaving] = useState(false);

  useEffect(() => setDraft(baseline), [baseline]);

  const changed = JSON.stringify(draft) !== JSON.stringify(baseline);

  async function save() {
    setSaving(true);
    try {
      await onChange(draft);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="master-page room-status-page"
      aria-label="Room Status"
      style={{ display: 'flex', minHeight: '100%', flexDirection: 'column', paddingBottom: 0 }}
    >
      <div
        className="master-detail-card room-status-card"
        style={{ marginTop: 0, borderRadius: 5, overflow: 'hidden' }}
      >
        <div className="room-status-grid room-status-header">
          <span>Room Status</span>
          <span>Status Code</span>
          <span>Status Color</span>
          <span>Active</span>
        </div>
        {draft.map((status) => (
          <div className="room-status-grid room-status-row" key={status.code}>
            <strong>{status.description}</strong>
            <span className="room-status-code">{status.code}</span>
            <label
              className="room-status-color"
              title={`Change ${status.description} colour`}
              style={{
                position: 'relative',
                width: 46,
                height: 22,
                flex: '0 0 46px',
                overflow: 'hidden',
                border: '1px solid #8d8d8d',
                background: status.color,
                cursor: 'pointer',
              }}
            >
              <input
                type="color"
                value={status.color}
                aria-label={`Change ${status.description} colour`}
                onChange={(event) =>
                  setDraft((items) =>
                    items.map((item) =>
                      item.code === status.code ? { ...item, color: event.target.value } : item,
                    ),
                  )
                }
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  padding: 0,
                  border: 0,
                  opacity: 0,
                  cursor: 'pointer',
                }}
              />
            </label>
            <label className="room-status-toggle">
              <input
                type="checkbox"
                checked={status.active}
                onChange={(event) =>
                  setDraft((items) =>
                    items.map((item) =>
                      item.code === status.code ? { ...item, active: event.target.checked } : item,
                    ),
                  )
                }
              />
              <span />
            </label>
          </div>
        ))}
      </div>

      <div
        className="room-status-savebar"
        style={{
          position: 'sticky',
          bottom: 0,
          zIndex: 6,
          display: 'flex',
          minHeight: 72,
          marginTop: 'auto',
          alignItems: 'center',
          justifyContent: 'center',
          borderTop: '1px solid #e4e4e4',
          background: '#fff',
          boxShadow: '0 -1px 4px #0000000d',
          padding: '10px 12px',
        }}
      >
        <button
          className="primary-button"
          type="button"
          disabled={!changed || saving}
          onClick={save}
          style={{ minWidth: 112 }}
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </section>
  );
}
