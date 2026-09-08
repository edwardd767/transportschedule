'use client';
import { useState } from 'react';
import type { Booking } from '@/lib/bookings';

export function SpecialRequest({ booking, onSave, onBack }: { booking: Booking; onSave: (value: Booking) => Promise<void>; onBack: () => void }) {
  const [requests, setRequests] = useState<Record<string, string>>(booking.specialRequests || {}); const [saving, setSaving] = useState(false);
  return <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label="Special Request"><div className="billing-instruction-card special-request-card"><div className="billing-instruction-head"><span>Special Request</span><strong>{booking.reference}</strong></div><div className={`special-request-fields rooms-${booking.rooms.length}`}>{booking.rooms.map((room, index) => { const key = `${room.code}-${index}`; return <label key={key}><span>{room.code} {room.count > 1 ? `(${room.count} rooms)` : ''}</span><textarea value={requests[key] || ''} onChange={(e) => setRequests({ ...requests, [key]: e.target.value })} /></label>; })}</div><div className="billing-instruction-actions"><button className="secondary-button" onClick={onBack}>Cancel</button><button className="primary-button" disabled={saving} onClick={async () => { setSaving(true); try { await onSave({ ...booking, specialRequests: requests }); onBack(); } finally { setSaving(false); } }}>{saving ? 'Saving…' : 'Confirm'}</button></div></div></div>;
}
