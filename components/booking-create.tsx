'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { User, Baby, CalendarDays, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';
import { InfantIcon } from '@/components/infant-icon';
import { BookingAvailability } from '@/components/booking-availability';
import { bookingRate } from '@/lib/booking-rate';
import { rateAddOnsForNight } from '@/lib/pax-billing';
import { Choice } from '@/components/hotel-choice';
import { SearchChoice } from '@/components/search-choice';
import { HotelDatePicker } from '@/components/hotel-date-picker';
import { PhoneField } from '@/components/phone-field';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Booking } from '@/lib/bookings';
import { initialRateSetupData, type RateSetupData } from '@/lib/rate-setup-data';
import { defaultSalesChannels, nextBookingReference, type HotelRoomType, type HotelSegment } from '@/lib/hotel-masters';

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

const STAY_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function stayDate(value: string) {
  if (!value) return '';
  const [year, month, day] = value.split('-').map((part) => parseInt(part, 10));
  if (!year || !month || !day) return value;
  return `${String(day).padStart(2, '0')} ${STAY_MONTHS[month - 1]} ${String(year).slice(-2)}`;
}
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

function localDateKey(offsetDays = 0) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function BookingCreate({
  childRatesApplied = false,
  childAgePolicy = 0,
  bookings,
  roomTypes,
  rateSetup,
  segments = [],
  salesChannels = defaultSalesChannels,
  onCreate,
  onCancel,
  onNotice,
}: {
  childRatesApplied?: boolean;
  childAgePolicy?: number;
  bookings: Booking[];
  roomTypes: HotelRoomType[];
  rateSetup?: RateSetupData;
  segments?: HotelSegment[];
  salesChannels?: string[];
  onCreate: (booking: Booking) => Promise<void>;
  onCancel: () => void;
  onNotice: (message: string) => void;
}) {
  const effectiveRateSetup: RateSetupData = {
    ...initialRateSetupData,
    ...(rateSetup ?? {}),
    seasons: Array.isArray(rateSetup?.seasons) ? rateSetup.seasons : initialRateSetupData.seasons,
    calendar: rateSetup?.calendar && typeof rateSetup.calendar === 'object' ? rateSetup.calendar : initialRateSetupData.calendar,
    ratePlans: Array.isArray(rateSetup?.ratePlans) ? rateSetup.ratePlans : initialRateSetupData.ratePlans,
    validity: Array.isArray(rateSetup?.validity) ? rateSetup.validity : initialRateSetupData.validity,
  };
  const activeRoomTypes = roomTypes.filter((item) => item.active);
  const [arrival, setArrival] = useState(() => localDateKey(0));
  const [departure, setDeparture] = useState(() => localDateKey(1));
  const [groupEnabled, setGroupEnabled] = useState(false);
  const [salesChannel, setSalesChannel] = useState(salesChannels[0] ?? '');
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
  const activeRatePlans = effectiveRateSetup.ratePlans.filter((item) => item.active);
  const rateItems = activeRatePlans.map((item) => ({ value: item.code, label: `${item.code} - ${item.description}` }));
  const salesChannelItems = salesChannels.map((item) => ({ value: item, label: item }));
  const rateAmount = (code: string) => { const plan = activeRatePlans.find((item) => item.code === code); const valid = effectiveRateSetup.validity.find((item) => item.rateSetupId === plan?.id && item.active && arrival >= item.from && arrival <= item.to); const season = effectiveRateSetup.calendar[arrival] || effectiveRateSetup.seasons[0]?.id; return valid?.seasonalRates?.[roomType]?.[season || '']?.amount || 0; };
  const [promoCode, setPromoCode] = useState('NONE');
  const [discountPerNight, setDiscountPerNight] = useState(0);
  const [roomLines, setRoomLines] = useState<RoomLine[]>([]);
  const [bannerSlot, setBannerSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setBannerSlot(document.querySelector<HTMLElement>('.property-identity'));
  }, []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const nights = nightsBetween(arrival, departure);
  const stayLabel = `${stayDate(arrival)} - ${stayDate(departure)}`;
  const bookingTotal = roomLines.reduce((total, line) => total + line.total, 0);
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
    [roomTypes],
  );

  useEffect(() => {
    if (activeRatePlans.length && !activeRatePlans.some((item) => item.code === rateCode)) {
      setRateCode(activeRatePlans[0].code);
    }
    setRoomRate(rateAmount(rateCode));
  }, [arrival, roomType, rateCode, rateSetup]);

  function resetRoomDraft() {
    setRoomType(activeRoomTypes[0]?.code ?? '');
    setRoomQty(1);
    setAdults(1);
    setChildren(0);
    setInfants(0);
    setRateCode(activeRatePlans[0]?.code ?? 'BAR');
    setRoomRate(rateAmount(activeRatePlans[0]?.code ?? 'BAR'));
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
      {bannerSlot && createPortal(
        <button type="button" className="booking-back" aria-label="Close booking creation" onClick={onCancel} style={{ order: -1 }}>
          <X size={18} />
        </button>,
        bannerSlot,
      )}
      <form id="booking-create-form" className="booking-new-scroll" onSubmit={saveBooking}>
        <BookingAvailability childRatesApplied={childRatesApplied} rateSetup={rateSetup} arrival={arrival} bookings={bookings} roomTypes={roomTypes} />

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
              <PhoneField name="phone" />
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
              <SearchChoice label="Sales Channel" value={salesChannel} onChange={setSalesChannel} items={salesChannelItems} />
            </label>
            <label className="booking-line-field booking-choice-field">
              <span>Source *</span>
              <SearchChoice label="Source" value={source} onChange={setSource} items={[
                { value: 'Booking', label: 'Booking' },
                { value: 'Walk-In', label: 'Walk-In' },
                { value: 'OTA', label: 'OTA' },
                { value: 'Corporate', label: 'Corporate' },
              ]} />
            </label>
            <label className="booking-line-field booking-choice-field">
              <span>Segment *</span>
              <SearchChoice label="Segment" value={segment} onChange={setSegment} items={segments.filter((item) => item.active).sort((a, b) => a.displaySequence - b.displaySequence).map((item) => ({ value: item.description, label: item.description }))} />
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
              <span>No.</span>
              <span className="booking-room-stay-head">Room Type<small><svg viewBox="0 0 24 24" width={14} height={14} fill="currentColor" aria-hidden="true" focusable="false"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.9.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" /></svg> {stayLabel}</small></span>
              <span>Rate Code</span><span>No. of Room</span><span>Amount</span>
            </div>
            {roomLines.map((line, index) => (
              <div className="booking-room-line" key={line.id}>
                <div className="booking-room-table-row">
                  <span>{index + 1}</span>
                  <span>{line.code}<small className="booking-pax-count"><span className="booking-pax-icon billing-pax-tip" data-tip="Adult"><User size={13} aria-label="Adults" /></span><b>{line.adults}</b><span className="booking-pax-icon billing-pax-tip" data-tip="Child"><Baby size={13} aria-label="Children" /></span><b>{line.children}</b><span className="booking-pax-icon billing-pax-tip" data-tip="Infant"><InfantIcon size={13} label="Infants" /></span><b>{line.infants}</b></small></span>
                  <span>{line.rateCode}</span>
                  <span>{line.count}</span>
                  <span>{money.format(line.total)}</span>
                </div>
                <div className="booking-room-subtotal"><span>Subtotal</span><strong>{money.format(line.subtotal)}</strong></div>
              </div>
            ))}
            {!roomLines.length && <div className="booking-room-empty">Add a Room Type to continue.</div>}
            <div className="booking-room-total"><strong>Total</strong><strong>{money.format(bookingTotal)}</strong></div>
          </div>
        </div>

        {error && <p className="booking-new-error">{error}</p>}
      </form>

      <div className="booking-new-actions">
        <button type="button" className="booking-share-button" disabled>Share</button>
        <button type="submit" form="booking-create-form" className="booking-save-button" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
      </div>

      <Dialog open={roomDialogOpen} onOpenChange={setRoomDialogOpen}>
        <DialogContent className="booking-room-dialog">
          <DialogHeader>
            <div className="booking-room-dialog-title"><DialogTitle>Room Type</DialogTitle><strong>New</strong></div>
            <DialogDescription>Add a room type and rate to this booking.</DialogDescription>
          </DialogHeader>
          <div className="booking-room-dialog-grid">
            <label className="booking-line-field"><span>Arrival Date *</span><HotelDatePicker value={arrival} onChange={setArrival} ariaLabel="Arrival date" /></label>
            <label className="booking-line-field"><span>Departure Date *</span><HotelDatePicker value={departure} onChange={setDeparture} ariaLabel="Departure date" /></label>
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
            <label className="booking-line-field booking-choice-field"><span>Rate Code *</span><Choice label="Rate Code" value={rateCode} onChange={(value) => { setRateCode(value); setRoomRate(rateAmount(value)); }} items={rateItems.length ? rateItems : [{ value: 'BAR', label: 'BAR - Best Available Rate' }]} /></label>
            <label className="booking-line-field"><span>Room Rate</span><input type="number" min="0" step="0.01" value={roomRate} readOnly /></label>
            <label className="booking-line-field"><span>Extra Pax (MYR)</span><input value={money.format(extraAdultRate)} readOnly /></label>
            <label className="booking-line-field"><span>Child (MYR)</span><input value={money.format(extraChildRate)} readOnly disabled={!childRatesApplied} /></label>
            {applicableAddOns.length > 0 && <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e5e5', paddingTop: 10, marginTop: 2 }}>
              <strong style={{ display: 'block', marginBottom: 6 }}>Add On Item</strong>
              {applicableAddOns.map((item) => <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0', fontSize: 13 }}><span>{item.name}</span><b>{money.format(item.amount * Math.max(1, roomQty))}</b></div>)}
            </div>}
            <label className="booking-line-field booking-choice-field"><span>Promo Code</span><Choice label="Promo Code" value={promoCode} onChange={setPromoCode} items={[
              { value: 'NONE', label: 'No Promo Code' },
              { value: 'PROMO10', label: 'PROMO10' },
            ]} /></label>
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