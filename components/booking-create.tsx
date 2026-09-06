'use client';

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
  adults: number;
  children: number;
  infants: number;
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
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
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
    setAdults(1);
    setChildren(0);
    setInfants(0);
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
    if (!Number.isSafeInteger(adults) || adults < 1) {
      setError('Enter at least 1 adult.');
      return;
    }
    if (!Number.isSafeInteger(children) || children < 0) {
      setError('Enter a valid number of children.');
      return;
    }
    if (!Number.isSafeInteger(infants) || infants < 0) {
      setError('Enter a valid number of infants.');
      return;
    }
    const roomGuests = adults + children + infants;
    const roomCapacity = selectedRoom.maxGuest * roomQty;
    if (roomGuests > roomCapacity) {
      setError(`Maximum guest capacity for ${roomQty} ${selectedRoom.code} room(s) is ${roomCapacity}.`);
      return;
    }
    const line: RoomLine = {
      id: crypto.randomUUID(),
      code: roomType,
      count: roomQty,
      adults,
      children,
      infants,
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
    const groupName = groupEnabled ? String(form.get('groupName') ?? '').trim() : '';
    const phone = String(form.get('phone') ?? '').trim();
    const accountName = String(form.get('accountName') ?? '').trim();
    const email = String(form.get('email') ?? '').trim();
    const referenceNo = String(form.get('referenceNo') ?? '').trim();
    const guests = roomLines.reduce(
      (total, line) => total + line.adults + line.children + line.infants,
      0,
    );
    try {
      setError('');
      setSaving(true);
      if (!bookBy) throw new Error('Book by is required.');
      if (!nights) throw new Error('Departure date must be after the arrival date.');
      if (!segment) throw new Error('Choose a Segment.');
      if (!roomLines.length) throw new Error('Add at least one Room Type.');
      const booking: Booking = {
        reference: nextBookingReference(bookings),
        guest: bookBy,
        arrival,
        departure,
        status: 'Booked',
        rooms: roomLines.map(({ id: _id, ...line }) => line),
        assignedRooms: 0,
        checkedInGuests: 0,
        guests,
        amount: bookingTotal,
        groupName,
        phone,
        accountName,
        creditLimit: 0,
        printRate,
        stateTax,
        tourismTax,
        email,
        salesChannel,
        source,
        segment,
        referenceNo,
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
            <div className="booking-room-occupancy-entry">
              <label className="booking-line-field"><span>No. of Adult *</span><input type="number" min="1" value={adults} onChange={(event) => setAdults(Number(event.target.value))} /></label>
              <label className="booking-line-field"><span>No. of Child</span><input type="number" min="0" value={children} onChange={(event) => setChildren(Number(event.target.value))} /></label>
              <label className="booking-line-field"><span>No. of Infant</span><input type="number" min="0" value={infants} onChange={(event) => setInfants(Number(event.target.value))} /></label>
            </div>
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
