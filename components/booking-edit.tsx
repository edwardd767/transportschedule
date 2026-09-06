'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { CalendarDays, Pencil, Plus, Trash2 } from 'lucide-react';
import { Choice } from '@/components/hotel-choice';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Booking, BookingRoom } from '@/lib/bookings';
import type { HotelRoomType } from '@/lib/hotel-masters';

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

function initialRooms(booking: Booking): BookingRoom[] {
  const nights = Math.max(1, nightsBetween(booking.arrival, booking.departure));
  const totalRoomCount = Math.max(1, booking.rooms.reduce((sum, room) => sum + room.count, 0));
  const hasItemizedTotal = booking.rooms.some((room) => (room.total ?? 0) > 0);
  let remainingGuests = Math.max(1, booking.guests);
  return booking.rooms.map((room, index) => {
    const configuredAdults = room.adults;
    const fallbackAdults = Math.max(1, index === 0 ? remainingGuests - (booking.rooms.length - 1) : 1);
    const adults = configuredAdults ?? fallbackAdults;
    remainingGuests = Math.max(0, remainingGuests - adults);
    const allocatedTotal = hasItemizedTotal
      ? (room.total ?? 0)
      : (booking.amount * room.count) / totalRoomCount;
    const roomRate = room.roomRate ?? allocatedTotal / (nights * Math.max(1, room.count));
    return {
      code: room.code,
      count: room.count,
      adults,
      children: room.children ?? 0,
      infants: room.infants ?? 0,
      rateCode: room.rateCode ?? 'BAR',
      roomRate,
      promoCode: room.promoCode ?? '',
      discountPerNight: room.discountPerNight ?? 0,
      subtotal: room.subtotal ?? allocatedTotal,
      discount: room.discount ?? 0,
      tax: room.tax ?? 0,
      total: allocatedTotal,
    };
  });
}

export function BookingEdit({
  booking,
  roomTypes,
  onCancel,
  onUpdate,
  onNotice,
}: {
  booking: Booking;
  roomTypes: HotelRoomType[];
  onCancel: () => void;
  onUpdate: (booking: Booking) => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const activeRoomTypes = roomTypes.filter((item) => item.active);
  const [arrival, setArrival] = useState(booking.arrival);
  const [departure, setDeparture] = useState(booking.departure);
  const [groupEnabled, setGroupEnabled] = useState(Boolean(booking.groupName));
  const [groupName, setGroupName] = useState(booking.groupName ?? '');
  const [bookBy, setBookBy] = useState(booking.guest);
  const [phone, setPhone] = useState(booking.phone ?? '');
  const [accountName, setAccountName] = useState(booking.accountName ?? '');
  const [creditLimit, setCreditLimit] = useState(booking.creditLimit ?? 0);
  const [printRate, setPrintRate] = useState(booking.printRate ?? true);
  const [stateTax, setStateTax] = useState(booking.stateTax ?? true);
  const [tourismTax, setTourismTax] = useState(booking.tourismTax ?? true);
  const [email, setEmail] = useState(booking.email ?? '');
  const [salesChannel, setSalesChannel] = useState(booking.salesChannel ?? 'Direct');
  const [source, setSource] = useState(booking.source ?? 'Booking');
  const [segment, setSegment] = useState(booking.segment ?? 'Leisure');
  const [referenceNo, setReferenceNo] = useState(booking.referenceNo ?? '');
  const [roomLines, setRoomLines] = useState<BookingRoom[]>(() => initialRooms(booking));
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoomIndex, setEditingRoomIndex] = useState<number | null>(null);
  const [roomType, setRoomType] = useState(activeRoomTypes[0]?.code ?? '');
  const [roomQty, setRoomQty] = useState(1);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  const [rateCode, setRateCode] = useState('BAR');
  const [roomRate, setRoomRate] = useState(0);
  const [promoCode, setPromoCode] = useState('NONE');
  const [discountPerNight, setDiscountPerNight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const nights = nightsBetween(arrival, departure);
  const bookingTotal = roomLines.reduce((total, room) => total + (room.total ?? 0), 0);
  const selectedRoom = activeRoomTypes.find((item) => item.code === roomType);
  const roomSubtotal = nights * Math.max(1, roomQty) * Math.max(0, roomRate);
  const roomDiscount = nights * Math.max(1, roomQty) * Math.max(0, discountPerNight);
  const roomTax = 0;
  const roomTotal = Math.max(0, roomSubtotal - roomDiscount + roomTax);

  const roomTypeItems = useMemo(
    () => activeRoomTypes.map((item) => ({ value: item.code, label: `${item.code} - ${item.description}` })),
    [activeRoomTypes],
  );

  function resetRoomDraft() {
    setEditingRoomIndex(null);
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

  function openNewRoom() {
    setError('');
    resetRoomDraft();
    setRoomDialogOpen(true);
  }

  function openEditRoom(index: number) {
    const room = roomLines[index];
    setError('');
    setEditingRoomIndex(index);
    setRoomType(room.code);
    setRoomQty(room.count);
    setAdults(room.adults ?? 1);
    setChildren(room.children ?? 0);
    setInfants(room.infants ?? 0);
    setRateCode(room.rateCode ?? 'BAR');
    setRoomRate(room.roomRate ?? 0);
    setPromoCode(room.promoCode || 'NONE');
    setDiscountPerNight(room.discountPerNight ?? 0);
    setRoomDialogOpen(true);
  }

  function saveRoom(close: boolean) {
    setError('');
    if (!selectedRoom) return setError('Choose a Room Type.');
    if (!Number.isSafeInteger(roomQty) || roomQty < 1) return setError('Enter a valid number of rooms.');
    if (selectedRoom.totalRoom > 0 && roomQty > selectedRoom.totalRoom)
      return setError(`Only ${selectedRoom.totalRoom} ${selectedRoom.code} room(s) are configured.`);
    if (!Number.isSafeInteger(adults) || adults < 1) return setError('Enter at least 1 adult.');
    if (!Number.isSafeInteger(children) || children < 0) return setError('Enter a valid number of children.');
    if (!Number.isSafeInteger(infants) || infants < 0) return setError('Enter a valid number of infants.');
    const guestCount = adults + children + infants;
    const capacity = selectedRoom.maxGuest * roomQty;
    if (guestCount > capacity) return setError(`Maximum guest capacity for ${roomQty} ${selectedRoom.code} room(s) is ${capacity}.`);

    const value: BookingRoom = {
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
    setRoomLines((current) =>
      editingRoomIndex === null
        ? [...current, value]
        : current.map((room, index) => (index === editingRoomIndex ? value : room)),
    );
    if (close) setRoomDialogOpen(false);
    resetRoomDraft();
  }

  async function confirmEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setError('');
      setSaving(true);
      if (!bookBy.trim()) throw new Error('Book by is required.');
      if (!nights) throw new Error('Departure date must be after the arrival date.');
      if (!segment) throw new Error('Choose a Segment.');
      if (!roomLines.length) throw new Error('Add at least one Room Type.');
      const guests = roomLines.reduce(
        (total, room) => total + (room.adults ?? 0) + (room.children ?? 0) + (room.infants ?? 0),
        0,
      );
      const value: Booking = {
        ...booking,
        guest: bookBy.trim(),
        arrival,
        departure,
        rooms: roomLines,
        guests,
        amount: bookingTotal,
        groupName: groupEnabled ? groupName.trim() : '',
        phone: phone.trim(),
        accountName: accountName.trim(),
        creditLimit,
        printRate,
        stateTax,
        tourismTax,
        email: email.trim(),
        salesChannel,
        source,
        segment,
        referenceNo: referenceNo.trim(),
      };
      await onUpdate(value);
      onNotice(`Booking ${booking.reference} updated successfully.`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="booking-edit-page" aria-label={`Edit booking ${booking.reference}`}>
      <form className="booking-edit-scroll" onSubmit={confirmEdit}>
        <div className="booking-form-section booking-availability-section">
          <div className="booking-section-heading">Availability</div>
          <div className="booking-availability-date">
            <CalendarDays size={20} />
            <HotelDatePicker value={arrival} onChange={setArrival} ariaLabel="Availability date" />
          </div>
        </div>

        <div className="booking-form-section">
          <div className="booking-section-heading">Stay Information</div>
          <div className="booking-form-grid">
            <label className="booking-line-field"><span>Arrival Date *</span><HotelDatePicker value={arrival} onChange={setArrival} ariaLabel="Arrival date" /></label>
            <label className="booking-line-field"><span>Departure Date *</span><HotelDatePicker value={departure} onChange={setDeparture} ariaLabel="Departure date" /></label>
            <label className="booking-group-field">
              <span className="booking-check-line"><input type="checkbox" checked={groupEnabled} onChange={(event) => setGroupEnabled(event.target.checked)} /><span>Group Name</span></span>
              <input disabled={!groupEnabled} value={groupName} onChange={(event) => setGroupName(event.target.value)} />
            </label>
            <div className="booking-night-field"><span>Night(s)</span><strong>{nights}</strong></div>
          </div>
        </div>

        <div className="booking-form-section">
          <div className="booking-section-heading">Contact Information</div>
          <div className="booking-contact-grid">
            <label className="booking-line-field booking-full-field"><span>Book by *</span><input value={bookBy} onChange={(event) => setBookBy(event.target.value)} required /></label>
            <label className="booking-line-field booking-full-field"><span>Phone No. (Optional)</span><span className="booking-phone-line"><b>🇲🇾</b><span>+60</span><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" /></span></label>
            <label className="booking-line-field"><span>Account Name (If applicable)</span><input value={accountName} onChange={(event) => setAccountName(event.target.value)} /></label>
            <label className="booking-line-field"><span>Credit Limit</span><input type="number" min="0" step="0.01" value={creditLimit} onChange={(event) => setCreditLimit(Number(event.target.value))} /></label>
          </div>
          <div className="booking-tax-row">
            <label><input type="checkbox" checked={printRate} onChange={(event) => setPrintRate(event.target.checked)} />Print Rate</label>
            <label><input type="checkbox" checked={stateTax} onChange={(event) => setStateTax(event.target.checked)} />State Tax</label>
            <label><input type="checkbox" checked={tourismTax} onChange={(event) => setTourismTax(event.target.checked)} />Tourism Tax</label>
          </div>
          <div className="booking-contact-grid booking-contact-lower">
            <label className="booking-line-field booking-full-field"><span>Email Address</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
            <label className="booking-line-field booking-choice-field"><span>Sales Channel</span><Choice label="Sales Channel" value={salesChannel} onChange={setSalesChannel} items={[{ value: 'Direct', label: 'Direct' }, { value: 'Website', label: 'Website' }, { value: 'OTA', label: 'OTA' }, { value: 'Corporate', label: 'Corporate' }]} /></label>
            <label className="booking-line-field booking-choice-field"><span>Source *</span><Choice label="Source" value={source} onChange={setSource} items={[{ value: 'Booking', label: 'Booking' }, { value: 'Walk-In', label: 'Walk-In' }, { value: 'OTA', label: 'OTA' }, { value: 'Corporate', label: 'Corporate' }]} /></label>
            <label className="booking-line-field booking-choice-field"><span>Segment *</span><Choice label="Segment" value={segment} onChange={setSegment} items={[{ value: 'Leisure', label: 'Leisure' }, { value: 'Corporate', label: 'Corporate' }, { value: 'Group', label: 'Group' }, { value: 'OTA', label: 'OTA' }]} /></label>
            <label className="booking-line-field"><span>Reference No</span><input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} /></label>
          </div>
        </div>

        <div className="booking-form-section booking-room-section booking-edit-room-section">
          <div className="booking-section-heading booking-room-heading"><span>Room Type</span><button type="button" className="booking-room-add" aria-label="Add Room Type" onClick={openNewRoom}><Plus size={19} /></button></div>
          <div className="booking-edit-room-table">
            <div className="booking-edit-room-head"><span>No.</span><span>Room Type</span><span>Rate Code</span><span>No. of Room</span><span aria-hidden="true" /><span aria-hidden="true" /></div>
            {roomLines.map((room, index) => (
              <div className="booking-edit-room-row" key={`${room.code}-${index}`}>
                <span><small>📅 {prettyDate(arrival)} - {prettyDate(departure)}</small><b>{index + 1}</b></span>
                <span><b>{room.code}</b></span>
                <span><b>{room.rateCode || 'BAR'}</b><small>Subtotal</small></span>
                <span><b>{room.count}</b><small>{money.format(room.total ?? 0)}</small></span>
                <button type="button" aria-label={`Edit room type ${room.code}`} onClick={() => openEditRoom(index)}><Pencil size={17} /></button>
                <button type="button" aria-label={`Delete room type ${room.code}`} onClick={() => setRoomLines((current) => current.filter((_, roomIndex) => roomIndex !== index))}><Trash2 size={17} /></button>
              </div>
            ))}
            <div className="booking-edit-room-total"><strong>Total</strong><strong>{money.format(bookingTotal)}</strong></div>
          </div>
        </div>

        {error && <p className="booking-new-error booking-edit-error">{error}</p>}
        <div className="booking-edit-actions"><button type="button" className="booking-edit-cancel" onClick={onCancel}>Cancel</button><button type="submit" className="booking-edit-confirm" disabled={saving}>{saving ? 'Saving…' : 'Confirm'}</button></div>
      </form>

      <Dialog open={roomDialogOpen} onOpenChange={(open) => { setRoomDialogOpen(open); if (!open) resetRoomDraft(); }}>
        <DialogContent className="booking-room-dialog">
          <DialogHeader>
            <div className="booking-room-dialog-title"><DialogTitle>Room Type</DialogTitle><strong>{editingRoomIndex === null ? 'New' : 'Edit'}</strong></div>
            <DialogDescription>{editingRoomIndex === null ? 'Add a room type and rate to this booking.' : 'Edit the selected room type and rate.'}</DialogDescription>
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
            <label className="booking-line-field booking-choice-field"><span>Rate Code *</span><Choice label="Rate Code" value={rateCode} onChange={setRateCode} items={[{ value: 'BAR', label: 'BAR - Best Available Rate' }, { value: 'CORP', label: 'CORP - Corporate' }, { value: 'PROMO', label: 'PROMO - Promotion' }]} /></label>
            <label className="booking-line-field"><span>Room Rate</span><input type="number" min="0" step="0.01" value={roomRate} onChange={(event) => setRoomRate(Number(event.target.value))} /></label>
            <label className="booking-line-field booking-choice-field"><span>Promo Code</span><Choice label="Promo Code" value={promoCode} onChange={setPromoCode} items={[{ value: 'NONE', label: 'No Promo Code' }, { value: 'PROMO10', label: 'PROMO10' }]} /></label>
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
          <div className="booking-room-dialog-actions"><button type="button" className="booking-room-secondary" onClick={() => saveRoom(false)}>Save & New</button><button type="button" className="booking-room-cancel" onClick={() => setRoomDialogOpen(false)}>Cancel</button><button type="button" className="booking-room-confirm" onClick={() => saveRoom(true)}>Confirm</button></div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
