from pathlib import Path
import re

booking_create = r'''\'use client\';

import { useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Plus, X } from 'lucide-react';
import { Choice } from '@/components/hotel-choice';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Booking } from '@/lib/bookings';
import { nextBookingReference, type HotelRoomType } from '@/lib/hotel-masters';

type RoomLine = {
  id: string;
  code: string;
  count: number;
  rateCode: string;
  roomRate: number;
  promoCode: string;
  discountPerNight: number;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
};

const money = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function nightsBetween(arrival: string, departure: string) {
  const start = new Date(`${arrival}T00:00:00Z`).getTime();
  const end = new Date(`${departure}T00:00:00Z`).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round((end - start) / 86400000);
}

function prettyDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

export function BookingCreate({
  bookings,
  roomTypes,
  onCreate,
  onCancel,
  onNotice,
}: {
  bookings: Booking[];
  roomTypes: HotelRoomType[];
  onCreate: (booking: Booking) => Promise<void>;
  onCancel: () => void;
  onNotice: (message: string) => void;
}) {
  const activeRoomTypes = roomTypes.filter((item) => item.active);
  const [arrival, setArrival] = useState('2026-09-05');
  const [departure, setDeparture] = useState('2026-09-06');
  const [groupEnabled, setGroupEnabled] = useState(false);
  const [salesChannel, setSalesChannel] = useState('Direct');
  const [source, setSource] = useState('Booking');
  const [segment, setSegment] = useState('Leisure');
  const [printRate, setPrintRate] = useState(true);
  const [stateTax, setStateTax] = useState(true);
  const [tourismTax, setTourismTax] = useState(true);
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [roomType, setRoomType] = useState(activeRoomTypes[0]?.code ?? '');
  const [roomQty, setRoomQty] = useState(1);
  const [rateCode, setRateCode] = useState('BAR');
  const [roomRate, setRoomRate] = useState(0);
  const [promoCode, setPromoCode] = useState('NONE');
  const [discountPerNight, setDiscountPerNight] = useState(0);
  const [roomLines, setRoomLines] = useState<RoomLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const nights = nightsBetween(arrival, departure);
  const bookingTotal = roomLines.reduce((total, line) => total + line.total, 0);
  const selectedRoom = activeRoomTypes.find((item) => item.code === roomType);
  const roomSubtotal = nights * Math.max(1, roomQty) * Math.max(0, roomRate);
  const roomDiscount = nights * Math.max(1, roomQty) * Math.max(0, discountPerNight);
  const roomTax = 0;
  const roomTotal = Math.max(0, roomSubtotal - roomDiscount + roomTax);

  const roomTypeItems = useMemo(
    () => activeRoomTypes.map((item) => ({ value: item.code, label: `${item.code} - ${item.description}` })),
    [roomTypes],
  );

  function resetRoomDraft() {
    setRoomType(activeRoomTypes[0]?.code ?? '');
    setRoomQty(1);
    setRateCode('BAR');
    setRoomRate(0);
    setPromoCode('NONE');
    setDiscountPerNight(0);
  }

  function addRoom(close: boolean) {
    setError('');
    if (!roomType || !selectedRoom) {
      setError('Choose a Room Type.');
      return;
    }
    if (!Number.isSafeInteger(roomQty) || roomQty < 1) {
      setError('Enter a valid number of rooms.');
      return;
    }
    if (selectedRoom.totalRoom > 0 && roomQty > selectedRoom.totalRoom) {
      setError(`Only ${selectedRoom.totalRoom} ${selectedRoom.code} room(s) are configured.`);
      return;
    }
    const line: RoomLine = {
      id: crypto.randomUUID(),
      code: roomType,
      count: roomQty,
      rateCode,
      roomRate,
      promoCode: promoCode === 'NONE' ? '' : promoCode,
      discountPerNight,
      subtotal: roomSubtotal,
      discount: roomDiscount,
      tax: roomTax,
      total: roomTotal,
    };
    setRoomLines((current) => [...current, line]);
    if (close) setRoomDialogOpen(false);
    resetRoomDraft();
  }

  async function saveBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const bookBy = String(form.get('bookBy') ?? '').trim();
    const adults = Number(form.get('adults'));
    const children = Number(form.get('children'));
    const infants = Number(form.get('infants'));
    const guests = adults + children + infants;
    try {
      setError('');
      setSaving(true);
      if (!bookBy) throw new Error('Book by is required.');
      if (!nights) throw new Error('Departure date must be after the arrival date.');
      if (!Number.isSafeInteger(adults) || adults < 1) throw new Error('Enter at least 1 adult.');
      if (!Number.isSafeInteger(children) || children < 0) throw new Error('Enter a valid number of children.');
      if (!Number.isSafeInteger(infants) || infants < 0) throw new Error('Enter a valid number of infants.');
      if (!segment) throw new Error('Choose a Segment.');
      if (!roomLines.length) throw new Error('Add at least one Room Type.');
      const booking: Booking = {
        reference: nextBookingReference(bookings),
        guest: bookBy,
        arrival,
        departure,
        status: 'Booked',
        rooms: roomLines.map((line) => ({ code: line.code, count: line.count })),
        assignedRooms: 0,
        checkedInGuests: 0,
        guests,
        amount: bookingTotal,
      };
      await onCreate(booking);
      onNotice(`Booking ${booking.reference} created successfully.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="booking-new-page" aria-label="Create booking">
      <div className="booking-new-titlebar">
        <button type="button" className="booking-new-close" aria-label="Close booking creation" onClick={onCancel}>
          <X size={22} />
        </button>
        <span>Booking</span>
        <strong>New</strong>
      </div>

      <form className="booking-new-scroll" onSubmit={saveBooking}>
        <div className="booking-form-section booking-availability-section">
          <div className="booking-section-heading">Availability</div>
          <div className="booking-availability-date">
            <CalendarDays size={22} />
            <HotelDatePicker value={arrival} onChange={setArrival} ariaLabel="Availability date" />
          </div>
        </div>

        <div className="booking-form-section">
          <div className="booking-section-heading">Stay Information</div>
          <div className="booking-form-grid">
            <label className="booking-line-field">
              <span>Arrival Date *</span>
              <HotelDatePicker value={arrival} onChange={setArrival} ariaLabel="Arrival date" />
            </label>
            <label className="booking-line-field">
              <span>Departure Date *</span>
              <HotelDatePicker value={departure} onChange={setDeparture} ariaLabel="Departure date" />
            </label>
            <label className="booking-group-field">
              <span className="booking-check-line">
                <input type="checkbox" checked={groupEnabled} onChange={(event) => setGroupEnabled(event.target.checked)} />
                <span>Group Name</span>
              </span>
              <input name="groupName" disabled={!groupEnabled} placeholder={groupEnabled ? 'Group name' : ''} />
            </label>
            <div className="booking-night-field">
              <span>Night(s)</span>
              <strong>{nights}</strong>
            </div>
          </div>
          <div className="booking-occupancy-entry">
            <label>No. of Adult<input type="number" name="adults" min="1" defaultValue="1" required /></label>
            <label>No. of Child<input type="number" name="children" min="0" defaultValue="0" required /></label>
            <label>No. of Infant<input type="number" name="infants" min="0" defaultValue="0" required /></label>
          </div>
        </div>

        <div className="booking-form-section">
          <div className="booking-section-heading">Contact Information</div>
          <div className="booking-contact-grid">
            <label className="booking-line-field booking-full-field">
              <span>Book by *</span>
              <input name="bookBy" required maxLength={160} />
            </label>
            <label className="booking-line-field booking-full-field">
              <span>Phone No. (Optional)</span>
              <span className="booking-phone-line"><b>🇲🇾</b><span>+60</span><input name="phone" inputMode="tel" /></span>
            </label>
            <label className="booking-line-field">
              <span>Account Name (If applicable)</span>
              <input name="accountName" />
            </label>
            <label className="booking-line-field">
              <span>Credit Limit</span>
              <input value="0.00" readOnly />
            </label>
          </div>

          <div className="booking-tax-row">
            <label><input type="checkbox" checked={printRate} onChange={(event) => setPrintRate(event.target.checked)} />Print Rate</label>
            <label><input type="checkbox" checked={stateTax} onChange={(event) => setStateTax(event.target.checked)} />State Tax</label>
            <label><input type="checkbox" checked={tourismTax} onChange={(event) => setTourismTax(event.target.checked)} />Tourism Tax</label>
          </div>

          <div className="booking-contact-grid booking-contact-lower">
            <label className="booking-line-field booking-full-field">
              <span>Email Address</span>
              <input type="email" name="email" />
            </label>
            <label className="booking-line-field booking-choice-field">
              <span>Sales Channel</span>
              <Choice label="Sales Channel" value={salesChannel} onChange={setSalesChannel} items={[
                { value: 'Direct', label: 'Direct' },
                { value: 'Website', label: 'Website' },
                { value: 'OTA', label: 'OTA' },
                { value: 'Corporate', label: 'Corporate' },
              ]} />
            </label>
            <label className="booking-line-field booking-choice-field">
              <span>Source *</span>
              <Choice label="Source" value={source} onChange={setSource} items={[
                { value: 'Booking', label: 'Booking' },
                { value: 'Walk-In', label: 'Walk-In' },
                { value: 'OTA', label: 'OTA' },
                { value: 'Corporate', label: 'Corporate' },
              ]} />
            </label>
            <label className="booking-line-field booking-choice-field">
              <span>Segment *</span>
              <Choice label="Segment" value={segment} onChange={setSegment} items={[
                { value: 'Leisure', label: 'Leisure' },
                { value: 'Corporate', label: 'Corporate' },
                { value: 'Group', label: 'Group' },
                { value: 'OTA', label: 'OTA' },
              ]} />
            </label>
            <label className="booking-line-field">
              <span>Reference No</span>
              <input name="referenceNo" />
            </label>
          </div>
        </div>

        <div className="booking-form-section booking-room-section">
          <div className="booking-section-heading booking-room-heading">
            <span>Room Type</span>
            <button type="button" className="booking-room-add" aria-label="Add Room Type" onClick={() => { setError(''); setRoomDialogOpen(true); }}>
              <Plus size={20} />
            </button>
          </div>
          <div className="booking-room-table">
            <div className="booking-room-table-head">
              <span>No.</span><span>Room Type</span><span>Rate Code</span><span>No. of Room</span><span>Amount</span>
            </div>
            {roomLines.map((line, index) => (
              <div className="booking-room-table-row" key={line.id}>
                <span>{index + 1}</span>
                <span>{line.code}</span>
                <span>{line.rateCode}</span>
                <span>{line.count}</span>
                <span>{money.format(line.total)}</span>
              </div>
            ))}
            {!roomLines.length && <div className="booking-room-empty">Add a Room Type to continue.</div>}
            <div className="booking-room-total"><strong>Total</strong><strong>{money.format(bookingTotal)}</strong></div>
          </div>
        </div>

        {error && <p className="booking-new-error">{error}</p>}
        <div className="booking-new-actions">
          <button type="button" className="booking-share-button" disabled>Share</button>
          <button type="submit" className="booking-save-button" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>

      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="booking-room-dialog">
          <DialogHeader>
            <div className="booking-room-dialog-title"><DialogTitle>Room Type</DialogTitle><strong>New</strong></div>
            <DialogDescription>Add a room type and rate to this booking.</DialogDescription>
          </DialogHeader>
          <div className="booking-room-dialog-grid">
            <label className="booking-line-field"><span>Arrival Date *</span><input value={prettyDate(arrival)} readOnly /></label>
            <label className="booking-line-field"><span>Departure Date *</span><input value={prettyDate(departure)} readOnly /></label>
            <label className="booking-line-field booking-choice-field"><span>Room Type *</span><Choice label="Room Type" value={roomType} onChange={setRoomType} items={roomTypeItems} /></label>
            <label className="booking-line-field"><span>No. of Room *</span><input type="number" min="1" value={roomQty} onChange={(event) => setRoomQty(Number(event.target.value))} /></label>
            <label className="booking-line-field booking-choice-field"><span>Rate Code *</span><Choice label="Rate Code" value={rateCode} onChange={setRateCode} items={[
              { value: 'BAR', label: 'BAR - Best Available Rate' },
              { value: 'CORP', label: 'CORP - Corporate' },
              { value: 'PROMO', label: 'PROMO - Promotion' },
            ]} /></label>
            <label className="booking-line-field"><span>Room Rate</span><input type="number" min="0" step="0.01" value={roomRate} onChange={(event) => setRoomRate(Number(event.target.value))} /></label>
            <label className="booking-line-field booking-choice-field"><span>Promo Code</span><Choice label="Promo Code" value={promoCode} onChange={setPromoCode} items={[
              { value: 'NONE', label: 'No Promo Code' },
              { value: 'PROMO10', label: 'PROMO10' },
            ]} /></label>
            <label className="booking-line-field"><span>Disc (Per Night)</span><input type="number" min="0" step="0.01" value={discountPerNight} onChange={(event) => setDiscountPerNight(Number(event.target.value))} /></label>
          </div>
          <div className="booking-room-summary">
            <div className="booking-room-summary-head"><strong>Summary</strong><strong>MYR</strong></div>
            <div><span>{nights} Night(s) x {roomQty} Room(s)</span><span>{money.format(roomSubtotal)}</span></div>
            <div><span>Less : Disc {nights} Night(s) x {roomQty} Room(s)</span><span>{money.format(roomDiscount)}</span></div>
            <div><span>Tax</span><span>{money.format(roomTax)}</span></div>
            <div className="booking-room-summary-total"><strong>Total</strong><strong>{money.format(roomTotal)}</strong></div>
          </div>
          {error && <p className="booking-new-error booking-room-error">{error}</p>}
          <div className="booking-room-dialog-actions">
            <button type="button" className="booking-room-secondary" onClick={() => addRoom(false)}>Save & New</button>
            <button type="button" className="booking-room-cancel" onClick={() => setRoomDialogOpen(false)}>Cancel</button>
            <button type="button" className="booking-room-confirm" onClick={() => addRoom(true)}>Confirm</button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
'''

Path('components/booking-create.tsx').write_text(booking_create)

path = Path('components/bookings.tsx')
text = path.read_text()
text = text.replace("import { useEffect, useRef, useState, type FormEvent } from 'react';", "import { useEffect, useRef, useState } from 'react';")
text = text.replace("import { nextBookingReference, type HotelRoomType } from '@/lib/hotel-masters';", "import type { HotelRoomType } from '@/lib/hotel-masters';\nimport { BookingCreate } from '@/components/booking-create';")
text = re.sub(r"import \{\n  Dialog,\n  DialogContent,\n  DialogDescription,\n  DialogHeader,\n  DialogTitle,\n\} from '@/components/ui/dialog';\n", "", text, count=1)
text = re.sub(r"  const \[createError, setCreateError\] = useState\(''\);\n  const \[creating, setCreating\] = useState\(false\);\n  const \[createRoomType, setCreateRoomType\] = useState\(\n    roomTypes\.find\(\(item\) => item\.active\)\?\.code \?\? '',\n  \);\n", "", text, count=1)
text = re.sub(r"\n  useEffect\(\(\) => \{\n    if \(!roomTypes\.some\(\(item\) => item\.code === createRoomType && item\.active\)\) \{\n      setCreateRoomType\(roomTypes\.find\(\(item\) => item\.active\)\?\.code \?\? ''\);\n    \}\n  \}, \[roomTypes, createRoomType\]\);\n", "\n", text, count=1)
text = re.sub(r"\n  async function createBooking\(event: FormEvent<HTMLFormElement>\) \{.*?\n  \}\n\n  if \(booking\) \{", "\n\n  if (createOpen) {\n    return (\n      <BookingCreate\n        bookings={bookings}\n        roomTypes={roomTypes}\n        onCancel={() => setCreateOpen(false)}\n        onNotice={onNotice}\n        onCreate={async (value) => {\n          await onCreate(value);\n          setCreateOpen(false);\n        }}\n      />\n    );\n  }\n\n  if (booking) {", text, count=1, flags=re.S)
text = text.replace("        onClick={() => {\n          setCreateError('');\n          setCreateRoomType(roomTypes.find((item) => item.active)?.code ?? '');\n          setCreateOpen(true);\n        }}", "        onClick={() => setCreateOpen(true)}")
text = re.sub(r"\n\n      <Dialog open=\{createOpen\} onOpenChange=\{setCreateOpen\}>.*?\n      </Dialog>", "", text, count=1, flags=re.S)
path.write_text(text)

page = Path('app/page.tsx')
page_text = page.read_text()
page_text = page_text.replace('<small>HMS</small>', '<small>PMS</small>', 1)
page.write_text(page_text)

css_path = Path('app/globals.css')
css = css_path.read_text()
marker = '/* Booking creation redesign based on HotelX PMS */'
if marker not in css:
    css += r'''

/* Booking creation redesign based on HotelX PMS */
.booking-new-page { flex:1; min-height:0; display:flex; flex-direction:column; background:#f4f4f4; overflow:hidden; }
.booking-new-titlebar { min-height:36px; display:grid; grid-template-columns:42px 1fr auto; align-items:center; gap:8px; padding:0 14px; background:linear-gradient(90deg,#ff7b16,#ff9d10); color:#151515; border-top:1px solid #fff8; font-size:13px; }
.booking-new-titlebar > strong { font-weight:650; }
.booking-new-close { width:32px; height:30px; display:grid; place-items:center; border:0; border-radius:5px; background:#fff; color:#ef8500; }
.booking-new-scroll { flex:1; min-height:0; overflow-y:auto; padding:12px 10px 84px; }
.booking-form-section { margin-bottom:8px; background:#fff; border:1px solid #e2e2e2; box-shadow:0 1px 6px #0000000d; }
.booking-section-heading { min-height:54px; display:flex; align-items:center; padding:0 18px; background:#fff8ee; color:#f68b00; font-size:17px; font-weight:700; }
.booking-availability-section { display:grid; grid-template-columns:1fr auto; align-items:stretch; min-height:88px; }
.booking-availability-section .booking-section-heading { background:#fff; }
.booking-availability-date { min-width:280px; display:flex; align-items:center; gap:16px; padding:0 20px; color:#777; }
.booking-availability-date .hotel-date-picker { min-width:185px; }
.booking-form-grid,.booking-contact-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:40px; row-gap:18px; padding:28px 18px 20px; }
.booking-contact-grid { padding-bottom:8px; }
.booking-contact-lower { padding-top:16px; padding-bottom:24px; }
.booking-full-field { grid-column:1/-1; }
.booking-line-field,.booking-group-field,.booking-night-field { min-width:0; display:flex; flex-direction:column; gap:7px; color:#8a8a8a; font-size:15px; }
.booking-line-field > input,.booking-group-field > input,.booking-night-field > strong,.booking-phone-line { width:100%; min-height:38px; padding:7px 0; border:0; border-bottom:1px solid #aaa; border-radius:0; background:transparent; color:#181818; font-size:18px; }
.booking-night-field > strong { font-weight:500; }
.booking-group-field > input:disabled { color:#aaa; }
.booking-check-line { min-height:38px; display:flex; align-items:center; gap:10px; color:#9b9b9b; font-size:18px; }
.booking-check-line input,.booking-tax-row input { width:19px; height:19px; accent-color:#ff9200; }
.booking-phone-line { display:flex; align-items:center; gap:10px; }
.booking-phone-line input { flex:1; min-width:0; border:0; outline:0; background:transparent; }
.booking-choice-field .hotel-select { min-height:38px; height:38px; border:0 !important; border-bottom:1px solid #aaa !important; border-radius:0 !important; padding:0 !important; background:transparent !important; box-shadow:none !important; color:#181818; font-size:18px; }
.booking-tax-row { display:flex; flex-wrap:wrap; gap:52px; padding:14px 18px 10px; }
.booking-tax-row label { display:flex; align-items:center; gap:12px; font-size:18px; color:#111; }
.booking-occupancy-entry { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; padding:0 18px 24px; }
.booking-occupancy-entry label { display:flex; flex-direction:column; gap:6px; color:#8a8a8a; font-size:14px; }
.booking-occupancy-entry input { min-height:38px; padding:7px 0; border:0; border-bottom:1px solid #aaa; border-radius:0; background:transparent; color:#181818; font-size:17px; }
.booking-room-heading { justify-content:space-between; }
.booking-room-add { width:28px; height:28px; display:grid; place-items:center; border:0; border-radius:4px; background:#ff9200; color:#fff; }
.booking-room-table { padding:8px 16px 18px; overflow-x:auto; }
.booking-room-table-head,.booking-room-table-row { min-width:680px; display:grid; grid-template-columns:70px 1.4fr 1.2fr 1fr 1fr; align-items:center; gap:12px; min-height:38px; border-bottom:1px solid #e3e3e3; }
.booking-room-table-head { color:#60646b; font-size:13px; font-weight:700; border-bottom:1px solid #555; }
.booking-room-table-row { font-size:14px; }
.booking-room-table-row > span:last-child,.booking-room-table-head > span:last-child { text-align:right; }
.booking-room-empty { min-width:680px; padding:20px 0; color:#999; font-size:14px; }
.booking-room-total { min-width:680px; display:flex; justify-content:space-between; padding-top:12px; font-size:15px; }
.booking-new-error { margin:10px 4px; padding:10px 12px; border:1px solid #efc1c1; border-radius:5px; background:#fff2f2; color:#a13030; font-size:13px; }
.booking-new-actions { position:sticky; bottom:-84px; margin:16px -10px -84px; padding:12px 18px; display:flex; justify-content:flex-end; gap:16px; background:#fff; border-top:1px solid #ddd; box-shadow:0 -2px 8px #00000012; }
.booking-share-button,.booking-save-button { min-width:150px; min-height:44px; border:0; border-radius:7px; font-size:16px; font-weight:650; }
.booking-share-button:disabled { background:#dedede; color:#aaa; }
.booking-save-button { background:#ff9200; color:#fff; }
.booking-save-button:disabled { background:#e2e2e2; color:#aaa; }
.booking-room-dialog { width:min(900px,calc(100vw - 28px)) !important; max-width:900px !important; padding:0 !important; overflow:hidden; }
.booking-room-dialog [data-slot='dialog-header'] { padding:18px 18px 4px; background:#fff8ee; }
.booking-room-dialog-title { display:flex; align-items:center; justify-content:space-between; color:#f68b00; }
.booking-room-dialog-title strong { font-size:16px; }
.booking-room-dialog-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:24px 30px; padding:28px 18px 12px; }
.booking-room-summary { margin-top:8px; padding:18px; background:#fff8ee; font-size:14px; }
.booking-room-summary > div { display:flex; justify-content:space-between; gap:20px; padding:5px 0; }
.booking-room-summary-head { padding-bottom:8px !important; }
.booking-room-summary-total { margin-top:4px; padding-top:12px !important; border-top:1px solid #777; font-size:16px; }
.booking-room-error { margin:10px 18px 0; }
.booking-room-dialog-actions { display:flex; justify-content:flex-end; gap:12px; padding:16px 18px; background:#fff; }
.booking-room-secondary,.booking-room-cancel,.booking-room-confirm { min-height:42px; padding:8px 18px; border:0; border-radius:6px; font-size:15px; font-weight:650; }
.booking-room-secondary { background:#dedede; color:#fff; }
.booking-room-cancel { background:#ff9200; color:#fff; }
.booking-room-confirm { background:#ff9200; color:#fff; }
@media (max-width:760px) {
  .booking-new-scroll { padding:8px 6px 80px; }
  .booking-new-titlebar { padding:0 8px; }
  .booking-availability-section { grid-template-columns:1fr; }
  .booking-availability-date { min-width:0; padding:12px 16px 18px; }
  .booking-form-grid,.booking-contact-grid { grid-template-columns:1fr; gap:18px; padding:20px 14px; }
  .booking-full-field { grid-column:auto; }
  .booking-tax-row { gap:18px 26px; padding:12px 14px; }
  .booking-tax-row label { font-size:15px; }
  .booking-occupancy-entry { grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; padding:0 14px 22px; }
  .booking-occupancy-entry label { font-size:12px; }
  .booking-room-dialog-grid { grid-template-columns:1fr; gap:18px; padding:20px 14px; max-height:48vh; overflow-y:auto; }
  .booking-room-dialog-actions { gap:8px; padding:12px; }
  .booking-room-secondary,.booking-room-cancel,.booking-room-confirm { flex:1; padding:8px 6px; font-size:13px; }
  .booking-new-actions { padding:10px 12px; }
  .booking-share-button,.booking-save-button { min-width:0; flex:1; }
}
'''
css_path.write_text(css)

print('Booking creation redesign applied.')
