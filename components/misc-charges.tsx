'use client';

import { useContext, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { TransportDataContext } from '@/components/transport-connection';

const ASSIGNMENT_KEY = '_roomAssignments';

// TODO(HotelX): source these from the incidental-charge masters once they are exposed on hotelMasters.
const INCIDENTAL_CHARGES = ['Laundry', 'Mini Bar', 'Telephone', 'Room Service', 'Damage / Loss', 'Miscellaneous'];

type MiscCharge = {
  id: string;
  roomNo: string;
  guest: string;
  charge: string;
  description: string;
  referenceNo: string;
  quantity: number;
  unitPrice: number;
  discount: number;
};

const money = (value: number) => value.toFixed(2);

function assignedRoomsByBooking(booking: { specialRequests?: Record<string, string> }) {
  const raw = booking.specialRequests?.[ASSIGNMENT_KEY];
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return [];
    return Object.values(parsed).flat().filter((value): value is string => typeof value === 'string');
  } catch {
    return [];
  }
}

export function MiscCharges({ onBack }: { onBack: () => void }) {
  const store = useContext(TransportDataContext);
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<MiscCharge[]>([]);
  const [open, setOpen] = useState(false);
  const [roomNo, setRoomNo] = useState('');
  const [charge, setCharge] = useState('');
  const [description, setDescription] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState('0.00');
  const [discount, setDiscount] = useState('0.00');

  const currency = store?.state.hotelMasters.profile.currencyCode || 'MYR';
  const chargeTitles = INCIDENTAL_CHARGES;
  const rooms = useMemo(() => {
    const bookings = store?.state.bookings ?? [];
    const occupied = new Map<string, string>();
    for (const booking of bookings) {
      if (booking.status !== 'Inhouse') continue;
      for (const roomNo of assignedRoomsByBooking(booking)) occupied.set(roomNo, booking.guest);
    }
    return (store?.state.hotelMasters.rooms ?? [])
      .filter((room) => room.active)
      .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }))
      .map((room) => ({ roomNo: room.roomNo, guest: occupied.get(room.roomNo) ?? '' }));
  }, [store?.state.bookings, store?.state.hotelMasters.rooms]);

  const guestName = rooms.find((room) => room.roomNo === roomNo)?.guest ?? '';
  const gross = Math.max(0, (Number(quantity) || 0) * (Number(unitPrice) || 0));
  const nett = Math.max(0, gross - (Number(discount) || 0));
  const canConfirm = Boolean(roomNo && charge);

  const reset = () => {
    setRoomNo('');
    setCharge('');
    setDescription('');
    setReferenceNo('');
    setQuantity('1');
    setUnitPrice('0.00');
    setDiscount('0.00');
  };

  const save = (keepOpen: boolean) => {
    if (!canConfirm) return;
    setEntries((current) => [
      { id: crypto.randomUUID(), roomNo, guest: guestName, charge, description, referenceNo, quantity: Number(quantity) || 0, unitPrice: Number(unitPrice) || 0, discount: Number(discount) || 0 },
      ...current,
    ]);
    reset();
    if (!keepOpen) setOpen(false);
  };

  const shown = entries.filter((entry) => `${entry.roomNo} ${entry.guest} ${entry.charge} ${entry.description} ${entry.referenceNo}`.toLowerCase().includes(query.trim().toLowerCase()));

  const field = (label: string, value: string, onChange: (next: string) => void, options: string[]) => (
    <label className="misc-charge-field">
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="" />
        {options.map((option) => <option key={option}>{option}</option>)}
      </select>
    </label>
  );

  const text = (label: string, value: string, onChange: (next: string) => void, numeric = false) => (
    <label className="misc-charge-field">
      <span>{label}</span>
      <input
        inputMode={numeric ? 'decimal' : 'text'}
        value={value}
        onChange={(event) => onChange(numeric ? event.target.value.replace(/[^0-9.]/g, '') : event.target.value)}
        onBlur={numeric ? () => onChange((Number.parseFloat(value || '0') || 0).toFixed(2)) : undefined}
      />
    </label>
  );

  return (
    <section className="misc-charges" aria-label="Misc Charges">
      <div className="misc-charges-head">
        <button type="button" className="misc-charges-back" aria-label="Back to Room Management" onClick={onBack}>‹</button>
        <strong>Misc Charges</strong>
        <button type="button" className="misc-charges-add" aria-label="Add misc charge" onClick={() => setOpen(true)}><Plus size={20} /></button>
      </div>
      <label className="misc-charges-search">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Here..." aria-label="Search misc charges" />
        <Search size={18} />
      </label>
      {shown.length ? (
        <div className="misc-charges-list">
          {shown.map((entry) => (
            <article className="misc-charge-row" key={entry.id}>
              <strong>{entry.roomNo} {entry.guest ? `| ${entry.guest}` : ''}</strong>
              <small>{entry.charge}{entry.description ? ` · ${entry.description}` : ''}{entry.referenceNo ? ` · ${entry.referenceNo}` : ''}</small>
              <b>{currency} {money(Math.max(0, entry.quantity * entry.unitPrice - entry.discount))}</b>
            </article>
          ))}
        </div>
      ) : (
        <div className="misc-charges-empty"><strong>No Record Found</strong></div>
      )}

      {open && (
        <div className="misc-charge-overlay" role="dialog" aria-modal="true" aria-label="Incidental Charges">
          <div className="misc-charge-card">
            <div className="misc-charge-head"><strong>Incidental Charges</strong><em>New</em></div>
            <div className="misc-charge-body">
              <div className="misc-charge-grid">
                {field('Room No. *', roomNo, setRoomNo, rooms.map((room) => room.roomNo))}
                <label className="misc-charge-field"><span>Guest Name</span><span className="misc-charge-readonly">{guestName}</span></label>
                <label className="misc-charge-field misc-charge-wide"><span>Incidental Charges</span>
                  <select value={charge} onChange={(event) => setCharge(event.target.value)}>
                    <option value="" />
                    {chargeTitles.map((title) => <option key={title}>{title}</option>)}
                  </select>
                </label>
                <label className="misc-charge-field misc-charge-wide"><span>Description</span>
                  <input value={description} onChange={(event) => setDescription(event.target.value)} />
                </label>
                {text('Reference No.', referenceNo, setReferenceNo)}
                {text('Quantity', quantity, setQuantity, true)}
                {text(`Unit Price (${currency})`, unitPrice, setUnitPrice, true)}
                {text(`Discount Amount (${currency})`, discount, setDiscount, true)}
              </div>
              <div className="misc-charge-summary">
                <div><span>Gross Amount</span><b>{money(gross)}</b></div>
                <div><span>NETT AMOUNT</span><b>{money(nett)}</b></div>
              </div>
            </div>
            <div className="misc-charge-actions">
              <button type="button" className="misc-charge-save-new" disabled={!canConfirm} onClick={() => save(true)}>Save &amp; New</button>
              <button type="button" className="misc-charge-cancel" onClick={() => { reset(); setOpen(false); }}>Cancel</button>
              <button type="button" className="misc-charge-confirm" disabled={!canConfirm} onClick={() => save(false)}>Confirm</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
