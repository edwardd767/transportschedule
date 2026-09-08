'use client';

import { Search, Upload, X } from 'lucide-react';
import { useState } from 'react';
import type { Booking } from '@/lib/bookings';

export function BookingAttachments({ booking, onSave, onBack }: { booking: Booking; onSave: (booking: Booking) => Promise<void>; onBack: () => void }) {
  const [addOpen, setAddOpen] = useState(false);
  const [room, setRoom] = useState('');
  const [remarks, setRemarks] = useState('');
  const [fileName, setFileName] = useState('');
  const [saving, setSaving] = useState(false);
  const attachments = booking.attachments || [];
  const rooms = booking.rooms.flatMap((item) => Array.from({ length: item.count }, (_, index) => `${item.code}${item.count > 1 ? ` ${index + 1}` : ''}`));
  async function save() {
    if (!room || !remarks.trim()) return;
    setSaving(true);
    try { await onSave({ ...booking, attachments: [...attachments, { room, remarks: remarks.trim(), fileName }] }); setAddOpen(false); setRoom(''); setRemarks(''); setFileName(''); } finally { setSaving(false); }
  }
  return <section className="booking-workspace booking-attachments-page" aria-label="Booking attachments">
    <div className="booking-attachments-breadcrumb"><button className="booking-back-button" onClick={onBack} aria-label="Back"><span>‹</span></button>… / … / Attachments</div>
    <div className="booking-attachments-heading"><strong>Attachments {attachments.length}</strong><Search size={24} aria-hidden="true" /></div>
    {attachments.length === 0 ? <div className="booking-attachments-empty">No Record Found</div> : <div className="booking-attachments-list">{attachments.map((item, index) => <div className="booking-attachment-row" key={`${item.room}-${index}`}><strong>{item.room}</strong><small>{item.remarks}{item.fileName ? ` · ${item.fileName}` : ''}</small></div>)}</div>}
    <button className="booking-attachments-add" onClick={() => setAddOpen(true)} aria-label="Add attachment">+</button>
    {addOpen && <div className="billing-instruction-overlay" role="dialog" aria-modal="true" aria-label="Attachments"><div className="billing-instruction-card booking-attachment-popup">
      <div className="billing-instruction-head"><span>Attachments</span><button className="icon-button" onClick={() => setAddOpen(false)} aria-label="Close"><X size={20} /></button></div>
      <label className="attachment-field"><span>Select Room <b>*</b></span><select value={room} onChange={(e) => setRoom(e.target.value)}><option value="">Select room</option>{rooms.map((item) => <option key={item} value={item}>{item}</option>)}</select><small>Please select a room for this attachment</small></label>
      <label className="attachment-upload"><span>Upload Attachment(s)</span><input type="file" onChange={(e) => setFileName(e.target.files?.[0]?.name || '')} /><Upload size={20} aria-hidden="true" />{fileName && <small>{fileName}</small>}</label>
      <label className="attachment-field"><span>Remarks <b>*</b></span><input value={remarks} onChange={(e) => setRemarks(e.target.value)} /></label>
      <div className="billing-instruction-actions"><button className="secondary-button" onClick={() => setAddOpen(false)}>Cancel</button><button className="primary-button" disabled={!room || !remarks.trim() || saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</button></div>
    </div></div>}
  </section>;
}
