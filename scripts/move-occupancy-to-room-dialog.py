from pathlib import Path

path = Path('components/booking-create.tsx')
text = path.read_text()

replacements = [
("""type RoomLine = {\n  id: string;\n  code: string;\n  count: number;\n  rateCode: string;""",
"""type RoomLine = {\n  id: string;\n  code: string;\n  count: number;\n  adults: number;\n  children: number;\n  infants: number;\n  rateCode: string;"""),
("""  const [roomType, setRoomType] = useState(activeRoomTypes[0]?.code ?? '');\n  const [roomQty, setRoomQty] = useState(1);\n  const [rateCode, setRateCode] = useState('BAR');""",
"""  const [roomType, setRoomType] = useState(activeRoomTypes[0]?.code ?? '');\n  const [roomQty, setRoomQty] = useState(1);\n  const [adults, setAdults] = useState(1);\n  const [children, setChildren] = useState(0);\n  const [infants, setInfants] = useState(0);\n  const [rateCode, setRateCode] = useState('BAR');"""),
("""    setRoomType(activeRoomTypes[0]?.code ?? '');\n    setRoomQty(1);\n    setRateCode('BAR');""",
"""    setRoomType(activeRoomTypes[0]?.code ?? '');\n    setRoomQty(1);\n    setAdults(1);\n    setChildren(0);\n    setInfants(0);\n    setRateCode('BAR');"""),
("""    if (selectedRoom.totalRoom > 0 && roomQty > selectedRoom.totalRoom) {\n      setError(`Only ${selectedRoom.totalRoom} ${selectedRoom.code} room(s) are configured.`);\n      return;\n    }\n    const line: RoomLine = {\n      id: crypto.randomUUID(),\n      code: roomType,\n      count: roomQty,""",
"""    if (selectedRoom.totalRoom > 0 && roomQty > selectedRoom.totalRoom) {\n      setError(`Only ${selectedRoom.totalRoom} ${selectedRoom.code} room(s) are configured.`);\n      return;\n    }\n    if (!Number.isSafeInteger(adults) || adults < 1) {\n      setError('Enter at least 1 adult.');\n      return;\n    }\n    if (!Number.isSafeInteger(children) || children < 0) {\n      setError('Enter a valid number of children.');\n      return;\n    }\n    if (!Number.isSafeInteger(infants) || infants < 0) {\n      setError('Enter a valid number of infants.');\n      return;\n    }\n    const roomGuests = adults + children + infants;\n    const roomCapacity = selectedRoom.maxGuest * roomQty;\n    if (roomGuests > roomCapacity) {\n      setError(`Maximum guest capacity for ${roomQty} ${selectedRoom.code} room(s) is ${roomCapacity}.`);\n      return;\n    }\n    const line: RoomLine = {\n      id: crypto.randomUUID(),\n      code: roomType,\n      count: roomQty,\n      adults,\n      children,\n      infants,"""),
("""    const bookBy = String(form.get('bookBy') ?? '').trim();\n    const adults = Number(form.get('adults'));\n    const children = Number(form.get('children'));\n    const infants = Number(form.get('infants'));\n    const guests = adults + children + infants;""",
"""    const bookBy = String(form.get('bookBy') ?? '').trim();\n    const guests = roomLines.reduce(\n      (total, line) => total + line.adults + line.children + line.infants,\n      0,\n    );"""),
("""      if (!bookBy) throw new Error('Book by is required.');\n      if (!nights) throw new Error('Departure date must be after the arrival date.');\n      if (!Number.isSafeInteger(adults) || adults < 1) throw new Error('Enter at least 1 adult.');\n      if (!Number.isSafeInteger(children) || children < 0) throw new Error('Enter a valid number of children.');\n      if (!Number.isSafeInteger(infants) || infants < 0) throw new Error('Enter a valid number of infants.');\n      if (!segment) throw new Error('Choose a Segment.');""",
"""      if (!bookBy) throw new Error('Book by is required.');\n      if (!nights) throw new Error('Departure date must be after the arrival date.');\n      if (!segment) throw new Error('Choose a Segment.');"""),
("""          <div className=\"booking-occupancy-entry\">\n            <label>No. of Adult<input type=\"number\" name=\"adults\" min=\"1\" defaultValue=\"1\" required /></label>\n            <label>No. of Child<input type=\"number\" name=\"children\" min=\"0\" defaultValue=\"0\" required /></label>\n            <label>No. of Infant<input type=\"number\" name=\"infants\" min=\"0\" defaultValue=\"0\" required /></label>\n          </div>\n""",
""""""),
("""            <label className=\"booking-line-field booking-choice-field\"><span>Room Type *</span><Choice label=\"Room Type\" value={roomType} onChange={setRoomType} items={roomTypeItems} /></label>\n            <label className=\"booking-line-field\"><span>No. of Room *</span><input type=\"number\" min=\"1\" value={roomQty} onChange={(event) => setRoomQty(Number(event.target.value))} /></label>\n            <label className=\"booking-line-field booking-choice-field\"><span>Rate Code *</span>""",
"""            <label className=\"booking-line-field booking-choice-field\"><span>Room Type *</span><Choice label=\"Room Type\" value={roomType} onChange={setRoomType} items={roomTypeItems} /></label>\n            <label className=\"booking-line-field\"><span>No. of Room *</span><input type=\"number\" min=\"1\" value={roomQty} onChange={(event) => setRoomQty(Number(event.target.value))} /></label>\n            <div className=\"booking-room-occupancy-entry\">\n              <label className=\"booking-line-field\"><span>No. of Adult *</span><input type=\"number\" min=\"1\" value={adults} onChange={(event) => setAdults(Number(event.target.value))} /></label>\n              <label className=\"booking-line-field\"><span>No. of Child</span><input type=\"number\" min=\"0\" value={children} onChange={(event) => setChildren(Number(event.target.value))} /></label>\n              <label className=\"booking-line-field\"><span>No. of Infant</span><input type=\"number\" min=\"0\" value={infants} onChange={(event) => setInfants(Number(event.target.value))} /></label>\n            </div>\n            <label className=\"booking-line-field booking-choice-field\"><span>Rate Code *</span>"""),
]

for old, new in replacements:
    if old not in text:
        raise SystemExit(f'Missing expected snippet:\n{old[:180]}')
    text = text.replace(old, new, 1)

path.write_text(text)

css = Path('app/globals.css')
css_text = css.read_text()
marker = '/* Booking room occupancy belongs inside Room Type selection */'
if marker not in css_text:
    css_text += '''\n\n/* Booking room occupancy belongs inside Room Type selection */\n.booking-room-occupancy-entry {\n  grid-column: 1 / -1;\n  display: grid;\n  grid-template-columns: repeat(3, minmax(0, 1fr));\n  gap: 18px;\n  padding: 2px 0 4px;\n}\n.booking-room-occupancy-entry .booking-line-field {\n  min-width: 0;\n}\n@media (max-width: 640px) {\n  .booking-room-occupancy-entry {\n    grid-template-columns: 1fr;\n    gap: 10px;\n  }\n}\n'''
css.write_text(css_text)
