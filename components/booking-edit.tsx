'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { User, Baby, CalendarDays, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { InfantIcon } from '@/components/infant-icon';
import { BookingAvailability } from '@/components/booking-availability';
import { bookingRate } from '@/lib/booking-rate';
import { rateAddOnsForNight } from '@/lib/pax-billing';
import { Choice } from '@/components/hotel-choice';
import { SearchChoice } from '@/components/search-choice';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Booking, BookingRoom } from '@/lib/bookings';
import { initialRateSetupData, type RateSetupData } from '@/lib/rate-setup-data';
import { defaultSalesChannels, type HotelRoomType } from '@/lib/hotel-masters';
import { PhoneField } from '@/components/phone-field';

const money = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const INFANT_MAX_AGE = 2;

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

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function shortDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return `${String(day).padStart(2, '0')} ${SHORT_MONTHS[month - 1]} ${String(year).slice(-2)}`;
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
  childRatesApplied = false,
  childAgePolicy = 0,
  rateSetup,
  bookings,
  booking,
  roomTypes,
  salesChannels = defaultSalesChannels,
  onCancel,
  onUpdate,
  onNotice,
}: {
  childRatesApplied?: boolean;
  childAgePolicy?: number;
  rateSetup?: RateSetupData;
  bookings: Booking[];
  booking: Booking;
  roomTypes: HotelRoomType[];
  salesChannels?: string[];
  onCancel: () => void;
  onUpdate: (booking: Booking) => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const effectiveRateSetup = rateSetup ?? initialRateSetupData;
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
  const [salesChannel, setSalesChannel] = useState(booking.salesChannel ?? salesChannels[0] ?? '');
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
  const salesChannelItems = salesChannels.map((item) => ({ value: item, label: item }));
  const [promoCode, setPromoCode] = useState('NONE');
  const [discountPerNight, setDiscountPerNight] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const nights = nightsBetween(arrival, departure);
  const bookingTotal = roomLines.reduce((total, room) => total + (room.total ?? 0), 0);
  const selectedRoom = activeRoomTypes.find((item) => item.code === roomType);
  const configuredPaxRate = bookingRate(rateSetup, rateCode, roomType, arrival);
  const extraAdultRate = configuredPaxRate?.extraAdult ?? 0;
  const extraChildRate = childRatesApplied ? configuredPaxRate?.extraChild ?? 0 : 0;
  const basePax = configuredPaxRate?.basePax ?? 2;
  const extraAdultCount = Math.max(0, adults - basePax);
  const childCharge = children * extraChildRate * nights * Math.max(1, roomQty);
  const applicableAddOns = useMemo(() => {
    const room = { code: roomType, count: 1, adults, children, infants, rateCode, roomRate };
    const totals = new Map<string, number>();
    for (let cursor = arrival; cursor < departure;) {
      rateAddOnsForNight(room, cursor, effectiveRateSetup, rateCode, { arrival, departure }).forEach((item) => {
        totals.set(item.name, (totals.get(item.name) ?? 0) + item.amount);
      });
      const date = new Date(`${cursor}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + 1);
      cursor = date.toISOString().slice(0, 10);
    }
    return Array.from(totals, ([name, amount]) => ({ name, amount }));
  }, [arrival, departure, roomType, adults, children, infants, rateCode, roomRate, effectiveRateSetup]);
  const addOnTotal = applicableAddOns.reduce((sum, item) => sum + item.amount, 0) * Math.max(1, roomQty);
  const roomSubtotal = nights * Math.max(1, roomQty) * Math.max(0, roomRate + extraAdultCount * extraAdultRate + children * extraChildRate) + addOnTotal;
  const roomDiscount = nights * Math.max(1, roomQty) * Math.max(0, discountPerNight);
  const roomTax = 0;
  const roomTotal = Math.max(0, roomSubtotal - roomDiscount + roomTax);
  const roomQtySafe = Math.max(1, roomQty);

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
        <BookingAvailability childRatesApplied={childRatesApplied} rateSetup={rateSetup} arrival={arrival} bookings={bookings} roomTypes={roomTypes} />

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
            <label className="booking-line-field booking-full-field"><span>Phone No. (Optional)</span><PhoneField value={phone} onChange={setPhone} /></label>
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
            <label className="booking-line-field booking-choice-field"><span>Sales Channel</span><SearchChoice label="Sales Channel" value={salesChannel} onChange={setSalesChannel} items={salesChannelItems} /></label>
            <label className="booking-line-field booking-choice-field"><span>Source *</span><SearchChoice label="Source" value={source} onChange={setSource} items={[{ value: 'Booking', label: 'Booking' }, { value: 'Walk-In', label: 'Walk-In' }, { value: 'OTA', label: 'OTA' }, { value: 'Corporate', label: 'Corporate' }]} /></label>
            <label className="booking-line-field booking-choice-field"><span>Segment *</span><SearchChoice label="Segment" value={segment} onChange={setSegment} items={[{ value: 'Leisure', label: 'Leisure' }, { value: 'Corporate', label: 'Corporate' }, { value: 'Group', label: 'Group' }, { value: 'OTA', label: 'OTA' }]} /></label>
            <label className="booking-line-field"><span>Reference No</span><input value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} /></label>
          </div>
        </div>

        <div className="booking-form-section booking-room-section booking-edit-room-section">
          <div className="booking-section-heading booking-room-heading"><span>Room Type</span><button type="button" className="booking-room-add" aria-label="Add Room Type" onClick={openNewRoom}><Plus size={19} /></button></div>
          <div className="booking-edit-room-table">
            <div className="booking-edit-room-head"><span>No.</span><span>Room Type</span><span>Rate Code</span><span>No. of Room</span><span aria-hidden="true" /><span aria-hidden="true" /></div>
            {roomLines.map((room, index) => (
              <div className="booking-edit-room-row" key={`${room.code}-${index}`}>
                <span><small><svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.9.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg> {shortDate(arrival)} - {shortDate(departure)}</small><b>{index + 1}</b></span>
                <span><b>{room.code}</b><small className="booking-pax-count"><span className="booking-pax-icon billing-pax-tip" data-tip="Adult"><User size={13} aria-label="Adults" /></span><b>{room.adults ?? 0}</b><span className="booking-pax-icon billing-pax-tip" data-tip="Child"><Baby size={13} aria-label="Children" /></span><b>{room.children ?? 0}</b><span className="booking-pax-icon billing-pax-tip" data-tip="Infant"><InfantIcon size={13} label="Infants" /></span><b>{room.infants ?? 0}</b></small></span>
                <span><b>{room.rateCode || 'BAR'}</b><small>Subtotal</small></span>
                <span><b>{room.count}</b><small>{money.format(room.total ?? 0)}</small></span>
                <button type="button" aria-label={`Edit room type ${room.code}`} onClick={() => openEditRoom(index)}><img src="https://hms1.hotelx.asia/static/media/view_edit_icon.cb90a368.svg" alt="" aria-hidden="true" width={22} height={22} style={{ display: 'block', objectFit: 'contain' }} /></button>
                <button type="button" aria-label={`Delete room type ${room.code}`} onClick={() => setRoomLines((current) => current.filter((_, roomIndex) => roomIndex !== index))}><svg viewBox="0 0 24 24" width={20} height={20} fill="gray" aria-hidden="true" focusable="false"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg></button>
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
            <div className="booking-guests-field">
              <div className="booking-guests-steppers">
                <div className="booking-stepper">
                  <div className="booking-stepper-row">
                    <span className="booking-stepper-label">Adult</span>
                    <input className="booking-stepper-value" type="number" min={1} aria-label="Adults" value={adults} onChange={(event) => setAdults(Math.max(1, Math.floor(Number(event.target.value) || 0)))} />
                    <span className="booking-stepper-arrows">
                      <button type="button" aria-label="Increase adults" onClick={() => setAdults(adults + 1)}><ChevronUp size={14} /></button>
                      <button type="button" aria-label="Decrease adults" disabled={adults <= 1} onClick={() => setAdults(Math.max(1, adults - 1))}><ChevronDown size={14} /></button>
                    </span>
                  </div>
                </div>
                <div className="booking-stepper">
                  <div className="booking-stepper-row">
                    <span className="booking-stepper-label">Child</span>
                    <input className="booking-stepper-value" type="number" min={0} aria-label="Children" value={children} onChange={(event) => setChildren(Math.max(0, Math.floor(Number(event.target.value) || 0)))} />
                    <span className="booking-stepper-arrows">
                      <button type="button" aria-label="Increase children" onClick={() => setChildren(children + 1)}><ChevronUp size={14} /></button>
                      <button type="button" aria-label="Decrease children" disabled={children <= 0} onClick={() => setChildren(Math.max(0, children - 1))}><ChevronDown size={14} /></button>
                    </span>
                  </div>
                  {childAgePolicy > INFANT_MAX_AGE && <small className="booking-child-age-note">Age {INFANT_MAX_AGE + 1} - {childAgePolicy} years</small>}
                </div>
                <div className="booking-stepper">
                  <div className="booking-stepper-row">
                    <span className="booking-stepper-label">Infant</span>
                    <input className="booking-stepper-value" type="number" min={0} aria-label="Infants" value={infants} onChange={(event) => setInfants(Math.max(0, Math.floor(Number(event.target.value) || 0)))} />
                    <span className="booking-stepper-arrows">
                      <button type="button" aria-label="Increase infants" onClick={() => setInfants(infants + 1)}><ChevronUp size={14} /></button>
                      <button type="button" aria-label="Decrease infants" disabled={infants <= 0} onClick={() => setInfants(Math.max(0, infants - 1))}><ChevronDown size={14} /></button>
                    </span>
                  </div>
                  {childAgePolicy > INFANT_MAX_AGE && <small className="booking-child-age-note">Age 0 - {INFANT_MAX_AGE} years</small>}
                </div>
              </div>
            </div>
            <label className="booking-line-field booking-choice-field"><span>Rate Code *</span><Choice label="Rate Code" value={rateCode} onChange={setRateCode} items={[{ value: 'BAR', label: 'BAR - Best Available Rate' }, { value: 'CORP', label: 'CORP - Corporate' }, { value: 'PROMO', label: 'PROMO - Promotion' }]} /></label>
            <label className="booking-line-field"><span>Room Rate</span><input type="number" min="0" step="0.01" value={roomRate} onChange={(event) => setRoomRate(Number(event.target.value))} /></label>
            <label className="booking-line-field"><span>Extra Pax (MYR)</span><input value={money.format(extraAdultRate)} readOnly /></label>
            <label className="booking-line-field"><span>Child (MYR)</span><input value={money.format(extraChildRate)} readOnly disabled={!childRatesApplied} /></label>
            {applicableAddOns.length > 0 && <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e5e5', paddingTop: 10, marginTop: 2 }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>Add On Item</strong>
              {applicableAddOns.map((item) => <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0', fontSize: 13 }}><span>{item.name}</span><b>{money.format(item.amount * Math.max(1, roomQty))}</b></div>)}
            </div>}
            <label className="booking-line-field booking-choice-field"><span>Promo Code</span><Choice label="Promo Code" value={promoCode} onChange={setPromoCode} items={[{ value: 'NONE', label: 'No Promo Code' }, { value: 'PROMO10', label: 'PROMO10' }]} /></label>
            <label className="booking-line-field"><span>Disc (Per Night)</span><input type="number" min="0" step="0.01" value={discountPerNight} onChange={(event) => setDiscountPerNight(Number(event.target.value))} /></label>
          </div>
          <div className="booking-room-summary">
            <div className="booking-room-summary-head">
              <strong>Summary<span className="billing-info" tabIndex={0} aria-label={`Summary breakdown: room rate ${money.format(nights * roomQtySafe * roomRate)}, extra pax ${money.format(nights * roomQtySafe * extraAdultCount * extraAdultRate)}, child ${money.format(childCharge)}, add ons ${money.format(addOnTotal)}, subtotal ${money.format(roomSubtotal)}, discount ${money.format(roomDiscount)}, tax ${money.format(roomTax)}, total ${money.format(roomTotal)}`}>
                <svg className="billing-info-icon" viewBox="0 0 16 16" width="13" height="13" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="8" fill="currentColor" /><rect x="7.1" y="6.7" width="1.8" height="5" rx=".9" fill="#fff" /><circle cx="8" cy="4.4" r="1.05" fill="#fff" /></svg>
                <span className="billing-info-tip" role="tooltip"><b>Summary</b>
                  <span className="billing-info-row"><span>Room Rate ({nights} Night(s) x {roomQtySafe} Room(s))</span><span>{money.format(nights * roomQtySafe * roomRate)}</span></span>
                  {extraAdultCount > 0 && extraAdultRate > 0 ? <span className="billing-info-row"><span>Extra Pax ({extraAdultCount} x {money.format(extraAdultRate)})</span><span>{money.format(nights * roomQtySafe * extraAdultCount * extraAdultRate)}</span></span> : null}
                  {children > 0 && extraChildRate > 0 ? <span className="billing-info-row"><span>Child ({children} x {money.format(extraChildRate)})</span><span>{money.format(childCharge)}</span></span> : null}
                  {applicableAddOns.map((item) => <span className="billing-info-row" key={item.name}><span>{item.name} x {roomQtySafe}</span><span>{money.format(item.amount * roomQtySafe)}</span></span>)}
                  <span className="billing-info-row billing-info-total"><span>Subtotal</span><span>{money.format(roomSubtotal)}</span></span>
                  <span className="billing-info-row is-muted"><span>Less : Disc {nights} Night(s) x {roomQtySafe} Room(s)</span><span>-{money.format(roomDiscount)}</span></span>
                  <span className="billing-info-row is-muted"><span>Tax</span><span>{money.format(roomTax)}</span></span>
                  <span className="billing-info-row billing-info-total"><span>Total</span><span>{money.format(roomTotal)}</span></span>
                </span>
              </span></strong>
              <strong>MYR</strong>
            </div>
            <div><span>{nights} Night(s) x {roomQty} Room(s)</span><span>{money.format(roomSubtotal)}</span></div>
            {childCharge > 0 && <div><span>Child</span><span>{money.format(childCharge)}</span></div>}
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
