from pathlib import Path


def replace_once(path: str, old: str, new: str):
    file = Path(path)
    text = file.read_text()
    if old not in text:
        raise SystemExit(f'Pattern not found in {path}: {old[:100]!r}')
    file.write_text(text.replace(old, new, 1))


# Booking create: show and total configured rate add-ons.
path = 'components/booking-create.tsx'
replace_once(
    path,
    "import { bookingRate } from '@/lib/booking-rate';\n",
    "import { bookingRate } from '@/lib/booking-rate';\nimport { rateAddOnsForNight } from '@/lib/pax-billing';\n",
)
replace_once(
    path,
    "  const childCharge = children * extraChildRate * nights * Math.max(1, roomQty);\n  const roomSubtotal = nights * Math.max(1, roomQty) * Math.max(0, roomRate + extraAdultCount * extraAdultRate + children * extraChildRate);\n  const roomDiscount = nights * Math.max(1, roomQty) * Math.max(0, discountPerNight);\n",
    "  const childCharge = children * extraChildRate * nights * Math.max(1, roomQty);\n  const applicableAddOns = useMemo(() => {\n    const room = { code: roomType, count: 1, adults, children, infants, rateCode, roomRate };\n    const totals = new Map<string, number>();\n    for (let cursor = arrival; cursor < departure;) {\n      rateAddOnsForNight(room, cursor, effectiveRateSetup, rateCode, { arrival, departure }).forEach((item) => {\n        totals.set(item.name, (totals.get(item.name) ?? 0) + item.amount);\n      });\n      const date = new Date(`${cursor}T00:00:00Z`);\n      date.setUTCDate(date.getUTCDate() + 1);\n      cursor = date.toISOString().slice(0, 10);\n    }\n    return Array.from(totals, ([name, amount]) => ({ name, amount }));\n  }, [arrival, departure, roomType, adults, children, infants, rateCode, roomRate, effectiveRateSetup]);\n  const addOnTotal = applicableAddOns.reduce((sum, item) => sum + item.amount, 0) * Math.max(1, roomQty);\n  const roomSubtotal = nights * Math.max(1, roomQty) * Math.max(0, roomRate + extraAdultCount * extraAdultRate + children * extraChildRate) + addOnTotal;\n  const roomDiscount = nights * Math.max(1, roomQty) * Math.max(0, discountPerNight);\n",
)
replace_once(
    path,
    "            <label className=\"booking-line-field\"><span>Child (MYR)</span><input value={money.format(extraChildRate)} readOnly disabled={!childRatesApplied} /></label>\n            <label className=\"booking-line-field booking-choice-field\"><span>Promo Code</span><Choice label=\"Promo Code\" value={promoCode} onChange={setPromoCode} items={[\n",
    "            <label className=\"booking-line-field\"><span>Child (MYR)</span><input value={money.format(extraChildRate)} readOnly disabled={!childRatesApplied} /></label>\n            {applicableAddOns.length > 0 && <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e5e5', paddingTop: 10, marginTop: 2 }}>\n              <strong style={{ display: 'block', marginBottom: 6 }}>Add On Item</strong>\n              {applicableAddOns.map((item) => <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0', fontSize: 13 }}><span>{item.name}</span><b>{money.format(item.amount * Math.max(1, roomQty))}</b></div>)}\n            </div>}\n            <label className=\"booking-line-field booking-choice-field\"><span>Promo Code</span><Choice label=\"Promo Code\" value={promoCode} onChange={setPromoCode} items={[\n",
)

# Booking edit: same automatic add-on behavior.
path = 'components/booking-edit.tsx'
replace_once(
    path,
    "import { bookingRate } from '@/lib/booking-rate';\n",
    "import { bookingRate } from '@/lib/booking-rate';\nimport { rateAddOnsForNight } from '@/lib/pax-billing';\n",
)
replace_once(
    path,
    "import type { RateSetupData } from '@/lib/rate-setup-data';\n",
    "import { initialRateSetupData, type RateSetupData } from '@/lib/rate-setup-data';\n",
)
replace_once(
    path,
    "  const activeRoomTypes = roomTypes.filter((item) => item.active);\n",
    "  const effectiveRateSetup = rateSetup ?? initialRateSetupData;\n  const activeRoomTypes = roomTypes.filter((item) => item.active);\n",
)
replace_once(
    path,
    "  const childCharge = children * extraChildRate * nights * Math.max(1, roomQty);\n  const roomSubtotal = nights * Math.max(1, roomQty) * Math.max(0, roomRate + extraAdultCount * extraAdultRate + children * extraChildRate);\n  const roomDiscount = nights * Math.max(1, roomQty) * Math.max(0, discountPerNight);\n",
    "  const childCharge = children * extraChildRate * nights * Math.max(1, roomQty);\n  const applicableAddOns = useMemo(() => {\n    const room = { code: roomType, count: 1, adults, children, infants, rateCode, roomRate };\n    const totals = new Map<string, number>();\n    for (let cursor = arrival; cursor < departure;) {\n      rateAddOnsForNight(room, cursor, effectiveRateSetup, rateCode, { arrival, departure }).forEach((item) => {\n        totals.set(item.name, (totals.get(item.name) ?? 0) + item.amount);\n      });\n      const date = new Date(`${cursor}T00:00:00Z`);\n      date.setUTCDate(date.getUTCDate() + 1);\n      cursor = date.toISOString().slice(0, 10);\n    }\n    return Array.from(totals, ([name, amount]) => ({ name, amount }));\n  }, [arrival, departure, roomType, adults, children, infants, rateCode, roomRate, effectiveRateSetup]);\n  const addOnTotal = applicableAddOns.reduce((sum, item) => sum + item.amount, 0) * Math.max(1, roomQty);\n  const roomSubtotal = nights * Math.max(1, roomQty) * Math.max(0, roomRate + extraAdultCount * extraAdultRate + children * extraChildRate) + addOnTotal;\n  const roomDiscount = nights * Math.max(1, roomQty) * Math.max(0, discountPerNight);\n",
)
replace_once(
    path,
    "            <label className=\"booking-line-field\"><span>Child (MYR)</span><input value={money.format(extraChildRate)} readOnly disabled={!childRatesApplied} /></label>\n            <label className=\"booking-line-field booking-choice-field\"><span>Promo Code</span><Choice label=\"Promo Code\" value={promoCode} onChange={setPromoCode} items={[\n",
    "            <label className=\"booking-line-field\"><span>Child (MYR)</span><input value={money.format(extraChildRate)} readOnly disabled={!childRatesApplied} /></label>\n            {applicableAddOns.length > 0 && <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #e5e5e5', paddingTop: 10, marginTop: 2 }}>\n              <strong style={{ display: 'block', marginBottom: 6 }}>Add On Item</strong>\n              {applicableAddOns.map((item) => <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '3px 0', fontSize: 13 }}><span>{item.name}</span><b>{money.format(item.amount * Math.max(1, roomQty))}</b></div>)}\n            </div>}\n            <label className=\"booking-line-field booking-choice-field\"><span>Promo Code</span><Choice label=\"Promo Code\" value={promoCode} onChange={setPromoCode} items={[\n",
)

print('Booking add-on UI and totals patched successfully.')
