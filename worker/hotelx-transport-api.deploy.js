// HotelX Transport API. Paste the whole file into the Cloudflare Worker editor.
// Required secret: DATABASE_URL. Private-link verifier is included; TRANSPORT_PASSWORD supports legacy sessions only.

// lib/transport.ts
var initialSetup = {
  operators: [
    {
      id: "operator-1",
      name: "Hotel Transport Services",
      contact: "",
      phone: "",
      email: "",
      active: true
    }
  ],
  boats: [
    ...[1, 2, 3].map((n) => ({
      id: `boat-${n}`,
      name: `Rawa 0${n}`,
      operatorId: "operator-1",
      capacity: 16,
      status: "Active",
      serviceType: "Speedboat",
      bookingMode: "Scheduled"
    })),
    {
      id: "taxi-pickup",
      name: "Taxi Pickup",
      operatorId: "operator-1",
      capacity: 4,
      status: "Active",
      serviceType: "Taxi Pickup",
      bookingMode: "OnDemand"
    },
    {
      id: "taxi-dropoff",
      name: "Taxi Drop-off",
      operatorId: "operator-1",
      capacity: 4,
      status: "Active",
      serviceType: "Taxi Drop-off",
      bookingMode: "OnDemand"
    }
  ],
  routes: [
    {
      id: "inbound",
      origin: "Mersing",
      destination: "Rawa",
      meetingPoint: "Mersing Jetty",
      durationMinutes: 45,
      operatorId: "operator-1",
      toHotel: true,
      active: true
    },
    {
      id: "outbound",
      origin: "Rawa",
      destination: "Mersing",
      meetingPoint: "Rawa Island Jetty",
      durationMinutes: 45,
      operatorId: "operator-1",
      toHotel: false,
      active: true
    }
  ],
  rules: {
    start: "07:00",
    end: "19:00",
    turnaroundMinutes: 0,
    boardingLeadMinutes: 30,
    notes: "Water level at least 1.7 metres. Return to port 30 minutes before low tide. Operator approval is required for tide and weather conditions."
  }
};
function validateSetup(setup2) {
  const time = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!time.test(setup2.rules.start) || !time.test(setup2.rules.end) || setup2.rules.start >= setup2.rules.end)
    throw new Error(
      "Operating end time must be later than the start time on the same day."
    );
  if (!Number.isInteger(setup2.rules.turnaroundMinutes) || setup2.rules.turnaroundMinutes < 0 || !Number.isInteger(setup2.rules.boardingLeadMinutes) || setup2.rules.boardingLeadMinutes < 0)
    throw new Error(
      "Enter whole, non-negative minutes for turnaround and boarding."
    );
  for (const [label, items] of [
    ["operator", setup2.operators],
    ["service", setup2.boats]
  ]) {
    const names = items.map((i) => i.name.trim().toLowerCase());
    if (names.some((n) => !n) || new Set(names).size !== names.length)
      throw new Error(`Each ${label} must have a unique name.`);
  }
  for (const boat of setup2.boats) {
    if (!Number.isInteger(boat.capacity) || boat.capacity < 1)
      throw new Error("Service capacity must be at least one whole passenger.");
    if (!setup2.operators.some((o) => o.id === boat.operatorId))
      throw new Error("Choose an operator for each service.");
  }
  for (const route of setup2.routes) {
    if (!route.origin.trim() || !route.destination.trim() || route.origin.trim().toLowerCase() === route.destination.trim().toLowerCase())
      throw new Error(
        "A route needs different departure and destination locations."
      );
    if (!route.meetingPoint.trim())
      throw new Error("Enter a boarding location for each route.");
    if (!Number.isInteger(route.durationMinutes) || route.durationMinutes < 1)
      throw new Error("Journey duration must be at least one whole minute.");
    if (!setup2.operators.some((o) => o.id === route.operatorId))
      throw new Error("Choose an operator for each route.");
  }
  const routeKeys = setup2.routes.map(
    (r) => `${r.origin.trim().toLowerCase()}|${r.destination.trim().toLowerCase()}|${r.operatorId}`
  );
  if (new Set(routeKeys).size !== routeKeys.length)
    throw new Error("This operator already has the same route.");
  return setup2;
}
function tripFromSetup(setup2, values) {
  const route = setup2.routes.find((r) => r.id === values.routeId && r.active);
  const boat = setup2.boats.find(
    (b) => b.id === values.boatId && b.status === "Active"
  );
  if (!route || !boat)
    throw new Error(
      "Select an active route and available scheduled service in Transport Setup."
    );
  const operator = setup2.operators.find(
    (o) => o.id === route.operatorId && o.active
  );
  if (!operator || boat.operatorId !== route.operatorId)
    throw new Error("Select a scheduled service belonging to the active route operator.");
  return {
    id: values.id,
    date: values.date,
    time: values.time,
    direction: route.id,
    origin: route.origin,
    destination: route.destination,
    meetingPoint: route.meetingPoint,
    durationMinutes: route.durationMinutes,
    boardingLeadMinutes: setup2.rules.boardingLeadMinutes,
    turnaroundMinutes: setup2.rules.turnaroundMinutes,
    operatingNotes: setup2.rules.notes,
    toHotel: route.toHotel,
    boatId: boat.id,
    boat: boat.name,
    operator: operator.name,
    capacity: boat.capacity,
    status: "Scheduled",
    groups: []
  };
}
var august = {
  1: ["08:30", "09:15", "10:45", "12:15", "13:45", "16:00"],
  2: ["09:30", "11:00", "12:30", "14:00", "16:00"],
  3: ["09:30", "11:00", "12:30", "14:00", "16:00"],
  4: ["10:00", "11:30", "13:00", "14:30"],
  5: ["10:30", "12:00", "13:30"],
  6: ["11:30", "13:00", "14:30"],
  7: ["07:15", "12:00", "13:30", "15:00"],
  8: ["08:30", "09:15", "10:45", "12:15", "13:45", "15:15"],
  9: ["08:30", "09:15", "10:45", "12:15", "13:45", "15:15"],
  10: ["08:45", "10:15", "11:45"],
  11: ["08:30", "09:15", "10:45", "12:15"],
  12: ["08:15", "09:45", "11:15", "12:45"],
  13: ["08:45", "10:15", "11:45", "13:15"],
  14: ["08:45", "10:15", "11:45", "13:15"],
  15: ["08:30", "09:15", "10:45", "12:15", "13:45"],
  16: ["09:00", "10:30", "12:00", "13:30"],
  17: ["10:45", "12:15", "13:45"],
  18: ["10:45", "12:15", "13:45"],
  19: ["10:00", "11:30", "13:00", "14:30"],
  20: ["08:15", "09:45", "11:15", "12:45", "14:15"],
  21: ["08:15", "09:45", "11:15", "12:45", "14:15"],
  22: ["08:15", "09:45", "11:15", "12:45", "14:15"],
  23: ["08:30", "09:15", "10:45", "12:15"],
  24: ["08:15", "09:45", "11:15"],
  25: ["08:45", "10:15", "11:45"],
  26: ["08:45", "10:15", "11:45"],
  27: ["08:30", "09:15", "10:45", "12:15"],
  28: ["08:30", "09:15", "10:45", "12:15"],
  29: ["08:30", "09:15", "10:45", "12:15"],
  30: ["08:15", "09:45", "11:15", "12:45"],
  31: ["08:15", "09:45", "11:15", "12:45"]
};
function addMinutes(time, minutes) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
}
function countPassengers(trip) {
  return trip.groups.reduce((n, g) => n + g.adults + g.children, 0);
}
function addGroupToTrip(trip, group) {
  if (trip.status === "Cancelled" || trip.status === "Completed")
    throw new Error("This trip is closed to new passengers.");
  if (!group.name.trim() || !group.reference.trim())
    throw new Error("Enter a lead guest and reservation reference.");
  if (!Number.isInteger(group.adults) || !Number.isInteger(group.children) || group.adults < 1 || group.children < 0)
    throw new Error(
      "Enter at least one adult and a valid whole number of children."
    );
  if (countPassengers(trip) + group.adults + group.children > trip.capacity)
    throw new Error(
      `Only ${trip.capacity - countPassengers(trip)} seats remain on this trip.`
    );
  if (trip.groups.some(
    (g) => g.reference.trim().toLowerCase() === group.reference.trim().toLowerCase()
  ))
    throw new Error("This reservation already has passengers on this trip.");
  return {
    ...trip,
    groups: [
      ...trip.groups,
      { ...group, name: group.name.trim(), reference: group.reference.trim() }
    ]
  };
}
function addTrip(trips, trip, rules = initialSetup.rules) {
  const validDate3 = /* @__PURE__ */ new Date(`${trip.date}T12:00:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trip.date) || Number.isNaN(validDate3.getTime()) || moveDate(trip.date, 0) !== trip.date)
    throw new Error("Choose a valid departure date.");
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(trip.time))
    throw new Error("Choose a valid departure time.");
  if (!Number.isInteger(trip.capacity) || trip.capacity < 1)
    throw new Error("Enter a valid seat capacity.");
  const minute = (time) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };
  if (minute(trip.time) < minute(rules.start) || minute(trip.time) + trip.durationMinutes > minute(rules.end))
    throw new Error(
      `The ${trip.durationMinutes}-minute trip must fit within operating hours ${rules.start}\u2013${rules.end}.`
    );
  if (trips.some(
    (t) => t.date === trip.date && t.boatId === trip.boatId && t.status !== "Cancelled" && minute(trip.time) < minute(t.time) + t.durationMinutes + t.turnaroundMinutes && minute(trip.time) + trip.durationMinutes + trip.turnaroundMinutes > minute(t.time)
  ))
    throw new Error(
      "This boat has an overlapping trip or turnaround time. Choose another boat or time."
    );
  return [...trips, trip];
}
function moveDate(date, days) {
  const d = /* @__PURE__ */ new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
var demoNames = [
  "Daniel Tan",
  "Aisha Rahman",
  "James Wilson",
  "Mei Lin",
  "Sofia Ahmad",
  "Oliver Lee",
  "Priya Kumar",
  "Amir Hassan"
];
var initialTrips = Object.entries(august).flatMap(
  ([day, times]) => times.flatMap(
    (time, index) => [0, 1].map((leg) => {
      const id = `TR${day.padStart(2, "0")}${String(index * 2 + leg + 1).padStart(2, "0")}`;
      const demo = Number(day) === 3;
      const count = demo ? [12, 8, 16, 6, 10, 14, 9, 4, 7, 5][index * 2 + leg] : 0;
      const groups = [];
      let remaining = count;
      let g = 0;
      while (remaining > 0) {
        const n = Math.min(remaining, g === 0 ? 4 : 3);
        groups.push({
          id: `${id}-${g}`,
          reference: `DEMO-${100 + index * 10 + leg * 5 + g}`,
          name: demoNames[(index * 2 + leg + g) % demoNames.length],
          adults: n > 2 ? n - 1 : n,
          children: n > 2 ? 1 : 0,
          boarded: false
        });
        remaining -= n;
        g++;
      }
      return {
        ...tripFromSetup(initialSetup, {
          id,
          date: `2026-08-${day.padStart(2, "0")}`,
          time: leg ? addMinutes(time, 45) : time,
          routeId: leg ? "outbound" : "inbound",
          boatId: `boat-${index % 2 + 1}`
        }),
        status: "Scheduled",
        groups
      };
    })
  )
);

// lib/transport-planning.ts
var tideWindows = [
  ["08:30\u201316:00", "00:30\u201308:30, 16:00\u201321:00"],
  ["09:30\u201316:00", "01:30\u201309:30, 16:00\u201321:30"],
  ["09:30\u201316:00", "02:30\u201309:30, 16:00\u201322:00"],
  ["10:00\u201316:00", "03:30\u201310:00, 16:00\u201323:00"],
  ["10:30\u201316:30", "05:00\u201310:30, 16:30\u201324:00"],
  ["11:30\u201316:30", "06:30\u201311:30, 16:30\u201324:00"],
  ["01:00\u201309:00, 12:00\u201317:00", "17:00\u201324:00"],
  ["02:00\u201317:00", "17:00\u201324:00"],
  ["03:30\u201318:00", "18:00\u201324:00"],
  ["04:30\u201313:30, 17:00\u201319:30", "13:30\u201317:00"],
  ["05:30\u201314:00, 17:00\u201321:00", "14:00\u201318:00"],
  ["06:30\u201314:30", "14:30\u201318:30"],
  ["07:00\u201315:00", "15:00\u201319:00"],
  ["17:30\u201315:00", "15:00\u201320:00"],
  ["08:30\u201315:30", "01:00\u201308:30, 19:30\u201320:30"],
  ["09:00\u201315:30", "02:00\u201309:00, 15:30\u201321:30"],
  ["09:30\u201315:30", "03:00\u201309:30, 15:30\u201322:30"],
  ["10:00\u201315:30", "04:30\u201310:00, 15:30\u201324:00"],
  ["10:00\u201316:00", "06:30\u201310:00, 16:00\u201324:00"],
  ["00:00\u201316:00", "16:00\u201324:00"],
  ["01:00\u201316:00", "16:00\u201324:00"],
  ["02:00\u201316:00", "16:00\u201324:00"],
  ["03:00\u201313:00", "13:00\u201324:00"],
  ["04:00\u201313:00, 18:00\u201320:00", "13:00\u201318:00"],
  ["04:30\u201313:30, 18:30\u201321:00", "13:30\u201318:30"],
  ["05:30\u201313:30, 18:30\u201322:00", "13:30\u201318:30"],
  ["06:00\u201314:00, 19:00\u201323:30", "14:00\u201319:00"],
  ["07:00\u201314:00, 19:00\u201324:00", "14:00\u201319:00"],
  ["07:30\u201314:00, 19:30\u201324:00", "14:00\u201319:30"],
  ["08:00\u201314:30, 20:00\u201324:00", "14:30\u201320:00"],
  ["08:15\u201314:30, 20:30\u201324:00", "14:30\u201320:30"]
];
var initialDayNotes = Object.fromEntries(
  tideWindows.map(([tide, restricted], index) => {
    const day = index + 1;
    return [
      `2026-08-${String(day).padStart(2, "0")}`,
      {
        tide,
        restricted,
        holiday: day === 9 ? "National Day \xB7 Singapore" : day === 25 ? "Birthday Prophet" : day === 31 ? "National Day \xB7 Malaysia / School holiday" : day >= 29 ? "School holiday" : "",
        notes: day === 14 ? "PDF lists 17:30\u201315:00. Confirm this tide window with the operator." : ""
      }
    ];
  })
);
function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite((/* @__PURE__ */ new Date(`${value}T12:00:00`)).getTime()) && moveDate(value, 0) === value;
}
function validateTemplate(template2) {
  if (!template2.name.trim()) throw new Error("Enter a template name.");
  if (!validDate(template2.startDate) || !validDate(template2.endDate) || template2.endDate < template2.startDate)
    throw new Error("Choose a valid start and end date.");
  if (template2.endDate > moveDate(template2.startDate, 365))
    throw new Error("Generate a maximum of one year at a time.");
  if (!template2.weekdays.length || template2.weekdays.some(
    (day) => !Number.isInteger(day) || day < 0 || day > 6
  ))
    throw new Error("Choose at least one weekday.");
  if (!template2.times.length || template2.times.length > 16 || template2.times.some((time) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)))
    throw new Error(
      "Enter 1\u201316 departure times in HH:MM format, separated by commas."
    );
  if (new Set(template2.times).size !== template2.times.length)
    throw new Error("Remove duplicate departure times.");
  if (template2.excludedDates.some(
    (date) => !validDate(date) || date < template2.startDate || date > template2.endDate
  ))
    throw new Error("Excluded dates must fall within the template date range.");
  return template2;
}
function generateTemplate(trips, setup2, template2) {
  validateTemplate(template2);
  let next = [...trips];
  let skipped = 0;
  const added = [];
  for (let date = template2.startDate; date <= template2.endDate; date = moveDate(date, 1)) {
    if (!template2.weekdays.includes((/* @__PURE__ */ new Date(`${date}T12:00:00`)).getDay()) || template2.excludedDates.includes(date))
      continue;
    for (const time of [...template2.times].sort()) {
      const id = `TPL-${template2.id}-${date}-${time}`;
      if (next.some(
        (trip) => trip.id === id || trip.date === date && trip.time === time && trip.boatId === template2.boatId && trip.direction === template2.routeId && trip.status !== "Cancelled"
      )) {
        skipped++;
        continue;
      }
      try {
        const trip = tripFromSetup(setup2, {
          id,
          date,
          time,
          routeId: template2.routeId,
          boatId: template2.boatId
        });
        next = addTrip(next, trip, setup2.rules);
        added.push(trip);
      } catch (error) {
        throw new Error(
          `${date} at ${time}: ${error.message} No trips were generated.`
        );
      }
    }
  }
  if (!added.length && !skipped)
    throw new Error("No dates match these weekdays and exclusions.");
  return { trips: next, added, skipped };
}
function checkTransferOrder(trips, reference) {
  const linked = trips.filter(
    (trip) => trip.groups.some((group) => group.bookingId === reference)
  );
  const inbound = linked.find((trip) => trip.toHotel);
  const outbound = linked.find((trip) => !trip.toHotel);
  if (inbound && outbound) {
    const arrivalEnd = (/* @__PURE__ */ new Date(`${inbound.date}T${inbound.time}:00`)).getTime() + inbound.durationMinutes * 6e4;
    if ((/* @__PURE__ */ new Date(`${outbound.date}T${outbound.time}:00`)).getTime() < arrivalEnd)
      throw new Error(
        "The return trip must depart after the arrival journey finishes."
      );
  }
}
function assignBookingTransfers(trips, booking, selection) {
  const { adults, children } = selection;
  if (!Number.isInteger(adults) || !Number.isInteger(children) || adults < 1 || children < 0 || adults + children > booking.guests)
    throw new Error(
      `Choose at least one adult, up to ${booking.guests} guests in total.`
    );
  if (booking.status === "Cancelled" || booking.status === "No Show")
    throw new Error(
      "Transport cannot be assigned to a cancelled or no-show booking."
    );
  const selectedIds = [selection.arrivalId, selection.returnId].filter(Boolean);
  let next = trips.map((trip) => {
    const linked = trip.groups.find(
      (group) => group.bookingId === booking.reference
    );
    if (linked && (linked.boarded || trip.status === "Completed")) {
      if (!selectedIds.includes(trip.id) || linked.adults !== adults || linked.children !== children)
        throw new Error("Boarded or completed transfers cannot be changed.");
      return trip;
    }
    return {
      ...trip,
      groups: trip.groups.filter(
        (group) => group.bookingId !== booking.reference
      )
    };
  });
  for (const [id, toHotel] of [
    [selection.arrivalId, true],
    [selection.returnId, false]
  ]) {
    if (!id) continue;
    const trip = next.find((item) => item.id === id);
    if (!trip || trip.toHotel !== toHotel)
      throw new Error(`Select a valid ${toHotel ? "arrival" : "return"} trip.`);
    if (trip.groups.some((group) => group.bookingId === booking.reference))
      continue;
    const updated = addGroupToTrip(trip, {
      id: `BOOKING-${booking.reference}-${toHotel ? "arrival" : "return"}`,
      bookingId: booking.reference,
      reference: booking.reference,
      name: booking.guest,
      adults,
      children,
      boarded: false
    });
    next = next.map((item) => item.id === id ? updated : item);
  }
  checkTransferOrder(next, booking.reference);
  return next;
}
function editScheduledTrip(trips, setup2, original, values) {
  if (original.status === "Completed" || original.status === "Cancelled" || original.groups.some((group) => group.boarded))
    throw new Error(
      "Completed, cancelled or boarded trips cannot be rescheduled."
    );
  const changed = {
    ...tripFromSetup(setup2, { id: original.id, ...values }),
    status: original.status,
    groups: original.groups
  };
  if (countPassengers(changed) > changed.capacity)
    throw new Error(
      "The selected boat has fewer seats than the passengers already assigned."
    );
  if (original.groups.length && changed.toHotel !== original.toHotel)
    throw new Error(
      "A trip with assigned passengers must keep its travel direction."
    );
  const next = addTrip(
    trips.filter((trip) => trip.id !== original.id),
    changed,
    setup2.rules
  );
  for (const group of changed.groups)
    if (group.bookingId) checkTransferOrder(next, group.bookingId);
  return next;
}

// lib/bookings.ts
var sampleBookings = [
  {
    reference: "P003496",
    guest: "Edward Jacob",
    arrival: "2026-09-01",
    departure: "2026-09-04",
    status: "Inhouse",
    rooms: [{ code: "DLK", count: 2 }],
    assignedRooms: 2,
    checkedInGuests: 2,
    guests: 2,
    amount: 1200
  },
  {
    reference: "P003495",
    guest: "Chia",
    arrival: "2026-09-03",
    departure: "2026-09-04",
    status: "No Show",
    rooms: [{ code: "SPK", count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 1,
    amount: 100
  },
  {
    reference: "P003494",
    guest: "Ms.Khor",
    arrival: "2026-09-03",
    departure: "2026-09-04",
    status: "No Show",
    rooms: [
      { code: "SPK", count: 1 },
      { code: "SPT", count: 1 }
    ],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 2,
    amount: 350
  },
  {
    reference: "P003493",
    guest: "Tini",
    arrival: "2026-09-04",
    departure: "2026-09-05",
    status: "No Show",
    rooms: [{ code: "SPK", count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 1,
    amount: 200
  },
  {
    reference: "P003492",
    guest: "Aaron",
    arrival: "2026-09-05",
    departure: "2026-09-10",
    status: "Inhouse",
    rooms: [
      { code: "SPK", count: 1 },
      { code: "DLK", count: 1 }
    ],
    assignedRooms: 1,
    checkedInGuests: 2,
    guests: 3,
    amount: 1250,
    highlightDates: true
  },
  {
    reference: "P003491",
    guest: "Nurzaim",
    arrival: "2026-09-02",
    departure: "2026-09-04",
    status: "Booked",
    rooms: [{ code: "SPK", count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 2,
    amount: 400
  },
  {
    reference: "P003490",
    guest: "Syuhaidah",
    arrival: "2026-09-06",
    departure: "2026-09-10",
    status: "Checkout",
    rooms: [{ code: "DLK", count: 1 }],
    assignedRooms: 1,
    checkedInGuests: 2,
    guests: 2,
    amount: 900
  },
  {
    reference: "P003489",
    guest: "Helmy",
    arrival: "2026-09-07",
    departure: "2026-09-10",
    status: "Booked",
    rooms: [{ code: "SPT", count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 3,
    amount: 750
  },
  {
    reference: "P003488",
    guest: "Afiefah",
    arrival: "2026-09-09",
    departure: "2026-09-13",
    status: "Booked",
    rooms: [{ code: "DLK", count: 1 }],
    assignedRooms: 0,
    checkedInGuests: 0,
    guests: 1,
    amount: 450
  }
];
var dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "2-digit",
  timeZone: "UTC"
});
var amountFormatter = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

// lib/hotel-masters.ts
var initialRoomStatuses = [
  { code: "OC", description: "Occupied Clean", color: "#26743a", active: true },
  { code: "OD", description: "Occupied Dirty", color: "#a5001b", active: true },
  { code: "OOI", description: "Out of Inventory", color: "#cfcfcf", active: true },
  { code: "OOO", description: "Out of Order", color: "#555555", active: true },
  { code: "VC", description: "Vacant Clean", color: "#80c83b", active: true },
  { code: "VD", description: "Vacant Dirty", color: "#e4002b", active: true },
  { code: "VI", description: "Vacant Inspection", color: "#2f4bc4", active: false },
  { code: "VR", description: "Vacant Ready", color: "#2ca9df", active: true }
];
var entries = (prefix, total) => Array.from({ length: total }, (_, index) => `${prefix} ${index + 1}`);
var charges = (prefix, total) => Array.from({ length: total }, (_, index) => ({ id: `${prefix}-charge-${index + 1}`, title: index === 0 ? "Boat Service" : `Charge ${index + 1}`, amount: 0, taxScheme: "SST-3", outletCode: "", rateElement: false, guestAppFb: false, guestAppOnlineShop: false, posInterface: false, eventInterface: false, allowNegative: false, packageRedemption: false, kiosk: false, thirdPartyPos: false, eInvoice: false, msicCode: "55101", classification: "022" }));
var initialDepartments = [
  ["banquet", "Banquet", 15, 1, 0],
  ["breakfast-ta", "Breakfast (TA)", 1, 1, 0],
  ["city-ledger", "City Ledger", 17, 0, 0],
  ["food-beverages", "Food and Beverages", 47, 4, 0],
  ["front-office", "Front Office", 19, 5, 0],
  ["hotel-adjustment", "Hotel Adjustment", 1, 0, 0],
  ["housekeeping", "Housekeeping", 8, 7, 0],
  ["room-revenue", "Room Revenue", 6, 5, 0],
  ["room-service", "Room service", 1, 0, 0],
  ["sales-marketing", "Sales & Marketing", 0, 0, 13]
].map(([id, name, chargeCount, reasons, channels]) => ({ id: String(id), name: String(name), incidentalCharges: charges(String(id), Number(chargeCount)), reasons: entries("Reason", Number(reasons)), salesChannels: entries("Sales Channel", Number(channels)) }));
var locations = Array.from({ length: 7 }, (_, index) => ({
  code: `L${index + 1}`,
  description: `Level ${index + 1}`,
  floorPlanAttachment: index === 0 ? "Level 1 Floor Plan" : "",
  active: true
}));
var roomTypes = [
  {
    code: "SPK",
    description: "SUPERIOR KING",
    propertyType: "Room",
    measureType: "Square Metre",
    roomSize: 450,
    maxGuest: 3,
    houseLimit: 3,
    housekeepingPoints: 1,
    totalRoom: 24,
    active: true
  },
  {
    code: "DLK",
    description: "DELUXE KING",
    propertyType: "Room",
    measureType: "Square Metre",
    roomSize: 500,
    maxGuest: 3,
    houseLimit: 3,
    housekeepingPoints: 1,
    totalRoom: 20,
    active: true
  },
  {
    code: "SPT",
    description: "SUPERIOR TWIN",
    propertyType: "Room",
    measureType: "Square Metre",
    roomSize: 450,
    maxGuest: 3,
    houseLimit: 3,
    housekeepingPoints: 1,
    totalRoom: 18,
    active: true
  }
];
function roomsFor(type, floor, start) {
  return Array.from({ length: type.totalRoom }, (_, index) => {
    const roomNo = String(start + index);
    return {
      roomNo,
      roomTypeCode: type.code,
      description: `Room ${roomNo}`,
      locationCode: `L${floor}`,
      maxGuest: type.maxGuest,
      roomSize: type.roomSize,
      displaySequence: index + 1,
      keycardRoomMapping: "",
      active: true
    };
  });
}
var initialHotelMasters = {
  locations,
  roomTypes,
  rooms: [
    ...roomsFor(roomTypes[0], 7, 701),
    ...roomsFor(roomTypes[1], 5, 501),
    ...roomsFor(roomTypes[2], 3, 301)
  ],
  roomStatuses: initialRoomStatuses,
  departments: initialDepartments
};
var initialBookings = sampleBookings;

// lib/booking-transport.ts
function serviceType(service) {
  return service.serviceType ?? "Speedboat";
}
function serviceBookingMode(service) {
  if (service.bookingMode) return service.bookingMode;
  return serviceType(service) === "Speedboat" ? "Scheduled" : "OnDemand";
}
function validDate2(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite((/* @__PURE__ */ new Date(`${value}T12:00:00`)).getTime());
}
function validTime(value) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
function addBookingTransportLeg(trips, setup2, legs, booking, input) {
  if (booking.status === "Cancelled" || booking.status === "No Show")
    throw new Error(
      "Transport cannot be assigned to a cancelled or no-show booking."
    );
  if (!Number.isInteger(input.passengers) || input.passengers < 1 || input.passengers > booking.guests)
    throw new Error(`Choose between 1 and ${booking.guests} passengers.`);
  if (legs.some((leg) => leg.id === input.id))
    throw new Error("This transport leg has already been added.");
  const service = setup2.boats.find(
    (item) => item.id === input.serviceId && item.status === "Active"
  );
  if (!service) throw new Error("Choose an active transport service.");
  const operator = setup2.operators.find(
    (item) => item.id === service.operatorId && item.active
  );
  if (!operator) throw new Error("Choose a service with an active operator.");
  if (input.passengers > service.capacity)
    throw new Error(
      `${service.name} supports a maximum of ${service.capacity} passengers.`
    );
  const mode = serviceBookingMode(service);
  if (mode === "Scheduled") {
    if (!input.tripId) throw new Error("Choose a scheduled departure.");
    if (legs.some(
      (leg) => leg.bookingReference === booking.reference && leg.tripId === input.tripId
    ))
      throw new Error("This departure is already added to the booking.");
    const trip = trips.find((item) => item.id === input.tripId);
    if (!trip || trip.boatId !== service.id)
      throw new Error("Choose a valid departure for this service.");
    if (trip.toHotel !== (input.direction === "arrival"))
      throw new Error(
        `Choose a ${input.direction === "arrival" ? "to hotel" : "from hotel"} departure.`
      );
    if (trip.groups.some((group) => group.bookingId === booking.reference))
      throw new Error("This booking is already assigned to that departure.");
    if (trip.status === "Cancelled" || trip.status === "Completed" || trip.capacity - countPassengers(trip) < input.passengers)
      throw new Error("The selected departure no longer has enough seats.");
    const groupId = `BOOKING-${booking.reference}-${input.id}`;
    const updated = addGroupToTrip(trip, {
      id: groupId,
      bookingId: booking.reference,
      reference: booking.reference,
      name: booking.guest,
      adults: input.adults ?? input.passengers,
      children: input.children ?? 0,
      infants: input.infants ?? 0,
      boarded: false
    });
    return {
      trips: trips.map((item) => item.id === trip.id ? updated : item),
      leg: {
        id: input.id,
        bookingReference: booking.reference,
        direction: input.direction,
        serviceId: service.id,
        serviceName: service.name,
        serviceType: serviceType(service),
        bookingMode: mode,
        operatorId: operator.id,
        operatorName: operator.name,
        date: trip.date,
        time: trip.time,
        pickup: trip.origin,
        dropoff: trip.destination,
        passengers: input.passengers,
        flightNo: input.flightNo.trim(),
        vehicle: input.vehicle.trim(),
        driver: input.driver.trim(),
        remarks: input.remarks.trim(),
        tripId: trip.id
      }
    };
  }
  if (!validDate2(input.date)) throw new Error("Choose a valid travel date.");
  if (!validTime(input.time)) throw new Error("Choose a valid pickup time.");
  if (!input.pickup.trim()) throw new Error("Enter the pickup location.");
  if (!input.dropoff.trim()) throw new Error("Enter the drop-off location.");
  return {
    trips,
    leg: {
      id: input.id,
      bookingReference: booking.reference,
      direction: input.direction,
      serviceId: service.id,
      serviceName: service.name,
      serviceType: serviceType(service),
      bookingMode: mode,
      operatorId: operator.id,
      operatorName: operator.name,
      date: input.date,
      time: input.time,
      pickup: input.pickup.trim(),
      dropoff: input.dropoff.trim(),
      passengers: input.passengers,
      flightNo: input.flightNo.trim(),
      vehicle: input.vehicle.trim(),
      driver: input.driver.trim(),
      remarks: input.remarks.trim(),
      tripId: ""
    }
  };
}
function removeBookingTransportLeg(trips, legs, bookingReference, legId) {
  const leg = legs.find(
    (item) => item.id === legId && item.bookingReference === bookingReference
  );
  if (!leg) throw new Error("This transport leg no longer exists.");
  let nextTrips = trips;
  if (leg.tripId) {
    const trip = trips.find((item) => item.id === leg.tripId);
    if (trip) {
      const groupId = `BOOKING-${bookingReference}-${leg.id}`;
      const group = trip.groups.find((item) => item.id === groupId);
      if (trip.status === "Completed" || group?.boarded)
        throw new Error("Boarded or completed transport cannot be removed.");
      nextTrips = trips.map(
        (item) => item.id === trip.id ? {
          ...item,
          groups: item.groups.filter((group2) => group2.id !== groupId)
        } : item
      );
    }
  }
  return {
    trips: nextTrips,
    legs: legs.filter((item) => item.id !== leg.id)
  };
}

// lib/rate-setup-data.ts
var initialRateSeasons = [
  { id: "non-peak", name: "Non Peak", color: "#25ef1a", active: true },
  { id: "peak", name: "Peak", color: "#ed0000", active: true },
  { id: "super-peak", name: "Super Peak", color: "#2341dc", active: true },
  { id: "public-holidays", name: "Public Holidays", color: "#2bb3a6", active: true }
];
var initialRateElements = [
  ["Banquet Drink", "Per Person", 1, 4, 2],
  ["Banquet Food", "Per Person", 1, 2, 10],
  ["BBQ Dinner 2025", "Per Person", 1, 3, 60],
  ["BBQ Dinner baru", "Per Person", 1, 3, 60],
  ["Breakfast (Adult)", "Per Person", 1, 2, 20],
  ["Breakfast Package", "Per Person", 1, 4, 20],
  ["Breakfast Package Child", "Per Person", 1, 4, 15],
  ["Breakfast Package Infant", "Per Person", 0, 2, 0],
  ["Extra Bed", "Per Room", 1, 1, 80],
  ["Extra Breakfast", "Per Person", 1, 4, 25],
  ["Airport Transfer", "Per Trip", 1, 6, 120],
  ["Welcome Drink", "Per Person", 1, 4, 8],
  ["Late Checkout", "Per Room", 1, 1, 100],
  ["Early Check-in", "Per Room", 1, 1, 100],
  ["Dinner Adult", "Per Person", 1, 4, 55],
  ["Dinner Child", "Per Person", 1, 4, 30],
  ["Lunch Adult", "Per Person", 1, 4, 45],
  ["Lunch Child", "Per Person", 1, 4, 25],
  ["Spa Voucher", "Per Person", 1, 2, 50],
  ["Laundry Credit", "Per Room", 1, 1, 30],
  ["Minibar Credit", "Per Room", 1, 1, 25],
  ["Parking", "Per Vehicle", 1, 2, 10],
  ["Tourism Package", "Per Person", 1, 4, 35],
  ["Romantic Setup", "Per Room", 1, 1, 150],
  ["Anniversary Cake", "Per Room", 1, 1, 80]
].map((item, index) => ({
  id: `element-${index + 1}`,
  name: String(item[0]),
  basis: String(item[1]),
  min: Number(item[2]),
  max: Number(item[3]),
  amount: Number(item[4]),
  active: true
}));
var rateTypeNames = [
  "BAR",
  "COMP",
  "Corp1",
  "Monthly - Trillion",
  "BEST AVAILABLE RATE",
  "Corporate",
  "Government",
  "Citto Inn",
  "House Use",
  "Long Stay",
  "Member Rate",
  "Online Travel Agent",
  "Package Rate",
  "Promotion",
  "Rack Rate",
  "Staff Rate",
  "Travel Agent",
  "Walk In",
  "Weekend Rate",
  "Wholesale"
];
var initialRateTypes = rateTypeNames.map((name, index) => ({
  id: `a1000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  name,
  active: true
}));
var firstRatePlans = [
  ["DU", "DAYUSE", "10 Feb 2021"],
  ["BAR", "BEST AVAILABLE RATE 2021", "25 Mar 2024"],
  ["Special Rate", "Special Rate", "26 Jun 2025", false],
  ["COMP", "COMPLIMENTARY", "27 Jan 2026"],
  ["HU", "HOUSEUSE", "27 Sep 2022"],
  ["Promo With BF", "Promotion Rate W Breakfast", "01 Feb 2023", true, true],
  ["Boss friends promo rate", "Boss friends", "26 Jun 2025", false],
  ["CORP", "Corporate Rate", "23 Jul 2026"],
  ["GOV", "Government Rate", "23 Jul 2026"],
  ["OTA", "Online Travel Agent Rate", "19 Aug 2026", true, true]
];
var initialRatePlans = [
  ...firstRatePlans.map((item, index) => ({
    id: `rate-${index + 1}`,
    code: item[0],
    description: item[1],
    updated: item[2],
    active: item[3] ?? true,
    web: item[4] ?? false
  })),
  ...Array.from({ length: 35 }, (_, index) => ({
    id: `rate-${index + 11}`,
    code: `RATE${String(index + 11).padStart(2, "0")}`,
    description: `Hotel Rate Plan ${index + 11}`,
    updated: index % 3 === 0 ? "27 Aug 2026" : index % 3 === 1 ? "19 Aug 2026" : "23 Jul 2026",
    active: index % 9 !== 0,
    web: index % 7 === 0
  }))
];
var initialCalendar = {};
for (let day = 1; day <= 30; day += 1) {
  initialCalendar[`2026-09-${String(day).padStart(2, "0")}`] = "non-peak";
}
var initialRateSetupData = {
  seasons: initialRateSeasons,
  calendar: initialCalendar,
  elements: initialRateElements,
  rateTypes: initialRateTypes,
  ratePlans: initialRatePlans,
  validity: []
};

// lib/transport-state.ts
function newTransportState() {
  return structuredClone({
    setup: initialSetup,
    trips: initialTrips,
    templates: [],
    dayNotes: initialDayNotes,
    bookingLegs: [],
    hotelMasters: initialHotelMasters,
    bookings: initialBookings,
    rateSetup: initialRateSetupData
  });
}
function normalizeTransportState(state) {
  const hotelMasters = state.hotelMasters && Array.isArray(state.hotelMasters.locations) && Array.isArray(state.hotelMasters.roomTypes) && Array.isArray(state.hotelMasters.rooms) && state.hotelMasters.roomTypes.length ? { ...state.hotelMasters, roomStatuses: Array.isArray(state.hotelMasters.roomStatuses) ? state.hotelMasters.roomStatuses : structuredClone(initialHotelMasters.roomStatuses), departments: Array.isArray(state.hotelMasters.departments) ? state.hotelMasters.departments.map((department, departmentIndex) => ({ ...department, incidentalCharges: Array.isArray(department.incidentalCharges) ? department.incidentalCharges.map((charge, chargeIndex) => typeof charge === "string" ? { id: `${department.id || departmentIndex}-charge-${chargeIndex + 1}`, title: charge, amount: 0, taxScheme: "SST-3", outletCode: "", rateElement: false, guestAppFb: false, guestAppOnlineShop: false, posInterface: false, eventInterface: false, allowNegative: false, packageRedemption: false, kiosk: false, thirdPartyPos: false, eInvoice: false, msicCode: "55101", classification: "022" } : charge) : [] })) : structuredClone(initialHotelMasters.departments) } : structuredClone(initialHotelMasters);
  const bookings = Array.isArray(state.bookings) && state.bookings.length ? state.bookings : structuredClone(initialBookings);
  const rateSetup2 = state.rateSetup && Array.isArray(state.rateSetup.seasons) && state.rateSetup.seasons.length && state.rateSetup.calendar && typeof state.rateSetup.calendar === "object" && Array.isArray(state.rateSetup.elements) && state.rateSetup.elements.length && Array.isArray(state.rateSetup.rateTypes) && state.rateSetup.rateTypes.length && Array.isArray(state.rateSetup.ratePlans) && state.rateSetup.ratePlans.length && Array.isArray(state.rateSetup.validity) ? state.rateSetup : structuredClone(initialRateSetupData);
  return {
    ...state,
    setup: {
      ...state.setup,
      boats: state.setup.boats.map((service) => {
        const type = service.serviceType ?? "Speedboat";
        return {
          ...service,
          serviceType: type,
          bookingMode: service.bookingMode ?? (type === "Speedboat" ? "Scheduled" : "OnDemand")
        };
      })
    },
    trips: state.trips.map(
      (trip) => ["Boarding", "Delayed", "Completed"].includes(trip.status) ? { ...trip, status: "Scheduled" } : trip
    ),
    bookingLegs: Array.isArray(state.bookingLegs) ? state.bookingLegs : [],
    hotelMasters,
    bookings,
    rateSetup: rateSetup2
  };
}
function object(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Invalid form data.");
  return value;
}
function text(value, label, required = true, max = 2e3) {
  if (typeof value !== "string" || value.length > max || required && !value.trim())
    throw new Error(`Enter a valid ${label}.`);
  return value;
}
function number(value, label, min = 0, max = 1e4) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    throw new Error(`Enter a valid ${label}.`);
  return value;
}
function boolean(value) {
  if (typeof value !== "boolean") throw new Error("Invalid selection.");
  return value;
}
function list(value, max = 200) {
  if (!Array.isArray(value) || value.length > max)
    throw new Error("Too many records or invalid list.");
  return value;
}
function unique(items) {
  if (new Set(items.map((item) => item.id)).size !== items.length)
    throw new Error("Duplicate record identifiers.");
}
function decimal(value, label, min = 0, max = 1e8) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max)
    throw new Error(`Enter a valid ${label}.`);
  return value;
}
function rateSetup(value) {
  const v = object(value);
  const seasons = list(v.seasons, 200).map((entry) => {
    const row = object(entry);
    return { id: text(row.id, "season ID", true, 100), name: text(row.name, "season name", true, 120).trim(), color: text(row.color, "season colour", true, 20), active: boolean(row.active) };
  });
  unique(seasons);
  const seasonIds = new Set(seasons.map((item) => item.id));
  const calendarRaw = object(v.calendar);
  const calendar = {};
  for (const [date, seasonIdValue] of Object.entries(calendarRaw)) {
    if (!validDate(date)) throw new Error("Choose a valid season calendar date.");
    if (typeof seasonIdValue !== "string" || !seasonIds.has(seasonIdValue)) continue;
    calendar[date] = seasonIdValue;
  }
  const elements = list(v.elements, 1e3).map((entry) => {
    const row = object(entry);
    const min = number(row.min, "minimum quantity", 0, 1e4);
    const max = number(row.max, "maximum quantity", min, 1e4);
    return { id: text(row.id, "rate element ID", true, 100), name: text(row.name, "rate element", true, 160).trim(), basis: text(row.basis, "charge basis", true, 80), min, max, amount: decimal(row.amount, "rate element amount"), active: boolean(row.active) };
  });
  unique(elements);
  const rateTypes = list(v.rateTypes, 1e3).map((entry) => {
    const row = object(entry);
    return { id: text(row.id, "rate type ID", true, 100), name: text(row.name, "rate type", true, 160).trim(), active: boolean(row.active) };
  });
  unique(rateTypes);
  const ratePlans = list(v.ratePlans, 2e3).map((entry) => {
    const row = object(entry);
    return { id: text(row.id, "rate setup ID", true, 100), code: text(row.code, "rate code", true, 100).trim(), description: text(row.description, "rate description", true, 240).trim(), updated: text(row.updated, "last updated date", false, 40), active: boolean(row.active), web: typeof row.web === "boolean" ? row.web : false };
  });
  unique(ratePlans);
  const ratePlanIds = new Set(ratePlans.map((item) => item.id));
  const validity = list(v.validity, 4e3).map((entry) => {
    const row = object(entry);
    const from = text(row.from, "valid from", true, 10);
    const to = text(row.to, "valid to", true, 10);
    if (!validDate(from) || !validDate(to) || to < from) throw new Error("Validity end date must be on or after the start date.");
    const rateSetupId = text(row.rateSetupId, "rate setup", true, 100);
    if (!ratePlanIds.has(rateSetupId)) throw new Error("Choose an existing Rate Setup for the validity period.");
    return { id: text(row.id, "validity ID", true, 100), rateSetupId, from, to, active: boolean(row.active) };
  });
  unique(validity);
  return { seasons, calendar, elements, rateTypes, ratePlans, validity };
}
function departure(value) {
  const v = object(value);
  return {
    id: text(v.id, "trip ID", true, 200),
    date: text(v.date, "date", true, 10),
    time: text(v.time, "time", true, 5),
    boatId: text(v.boatId, "boat"),
    routeId: text(v.routeId, "route")
  };
}
function template(value) {
  const v = object(value);
  return validateTemplate({
    id: text(v.id, "template ID", true, 200),
    name: text(v.name, "template name", true, 80),
    routeId: text(v.routeId, "route"),
    boatId: text(v.boatId, "boat"),
    startDate: text(v.startDate, "start date"),
    endDate: text(v.endDate, "end date"),
    weekdays: list(v.weekdays, 7).map((day) => number(day, "weekday", 0, 6)),
    times: list(v.times, 16).map((time) => text(time, "departure time")),
    excludedDates: list(v.excludedDates, 366).map(
      (date) => text(date, "excluded date")
    )
  });
}
function setup(value) {
  const v = object(value);
  const operators = list(v.operators).map((item) => {
    const o = object(item);
    return {
      id: text(o.id, "operator ID"),
      name: text(o.name, "operator name"),
      contact: text(o.contact, "contact", false),
      phone: text(o.phone, "phone", false),
      email: text(o.email, "email", false),
      active: boolean(o.active)
    };
  });
  const boats = list(v.boats).map((item) => {
    const b = object(item);
    if (!["Active", "Maintenance", "Inactive"].includes(String(b.status)))
      throw new Error("Choose a valid service status.");
    const allowedTypes = [
      "Speedboat",
      "Taxi Pickup",
      "Taxi Drop-off",
      "Hotel Van",
      "Shuttle",
      "Other"
    ];
    const serviceType2 = allowedTypes.includes(String(b.serviceType)) ? String(b.serviceType) : "Speedboat";
    const allowedModes = ["Scheduled", "OnDemand"];
    const bookingMode = allowedModes.includes(
      String(b.bookingMode)
    ) ? String(b.bookingMode) : serviceType2 === "Speedboat" ? "Scheduled" : "OnDemand";
    return {
      id: text(b.id, "service ID"),
      name: text(b.name, "service name"),
      operatorId: text(b.operatorId, "operator"),
      capacity: number(b.capacity, "capacity", 1),
      status: b.status,
      serviceType: serviceType2,
      bookingMode
    };
  });
  const routes = list(v.routes).map((item) => {
    const r2 = object(item);
    return {
      id: text(r2.id, "route ID"),
      origin: text(r2.origin, "origin"),
      destination: text(r2.destination, "destination"),
      meetingPoint: text(r2.meetingPoint, "meeting point"),
      durationMinutes: number(r2.durationMinutes, "duration", 1, 1440),
      operatorId: text(r2.operatorId, "operator"),
      toHotel: boolean(r2.toHotel),
      active: boolean(r2.active)
    };
  });
  unique(operators);
  unique(boats);
  unique(routes);
  const r = object(v.rules);
  return validateSetup({
    operators,
    boats,
    routes,
    rules: {
      start: text(r.start, "opening time"),
      end: text(r.end, "closing time"),
      turnaroundMinutes: number(r.turnaroundMinutes, "turnaround", 0, 1440),
      boardingLeadMinutes: number(
        r.boardingLeadMinutes,
        "boarding lead time",
        0,
        1440
      ),
      notes: text(r.notes, "notes", false)
    }
  });
}
function applyTransportAction(state, input) {
  const action = object(input);
  const trip = () => {
    const found = state.trips.find(
      (item) => item.id === text(action.tripId, "trip ID")
    );
    if (!found) throw new Error("This departure is no longer available.");
    return found;
  };
  const replace = (changed) => ({
    ...state,
    trips: state.trips.map((item) => item.id === changed.id ? changed : item)
  });
  switch (action.type) {
    case "setup":
      return { ...state, setup: setup(action.value) };
    case "roomStatusSave": {
      const value = list(action.value).map((item) => {
        const row = object(item);
        return { code: text(row.code, "status code", true, 20).toUpperCase(), description: text(row.description, "room status", true, 100), color: text(row.color, "status color", true, 20), active: boolean(row.active) };
      });
      if (new Set(value.map((item) => item.code)).size !== value.length)
        throw new Error("Duplicate room status codes.");
      return { ...state, hotelMasters: { ...state.hotelMasters, roomStatuses: value } };
    }
    case "departmentSave": {
      const value = list(action.value).map((item) => {
        const row = object(item);
        return { id: text(row.id, "department ID", true, 60), name: text(row.name, "department name", true, 100), incidentalCharges: list(row.incidentalCharges).map((v) => {
          const charge = object(v);
          return { id: text(charge.id, "charge ID", true, 100), title: text(charge.title, "charge title", true, 100), amount: number(charge.amount, "amount", 0, 999999), taxScheme: text(charge.taxScheme, "tax scheme", true, 40), outletCode: text(charge.outletCode, "outlet code", false, 40), rateElement: boolean(charge.rateElement), guestAppFb: boolean(charge.guestAppFb), guestAppOnlineShop: boolean(charge.guestAppOnlineShop), posInterface: boolean(charge.posInterface), eventInterface: boolean(charge.eventInterface), allowNegative: boolean(charge.allowNegative), packageRedemption: boolean(charge.packageRedemption), kiosk: boolean(charge.kiosk), thirdPartyPos: boolean(charge.thirdPartyPos), eInvoice: boolean(charge.eInvoice), msicCode: text(charge.msicCode, "MSIC code", false, 40), classification: text(charge.classification, "classification", false, 40) };
        }), reasons: list(row.reasons).map((v) => text(v, "reason", true, 100)), salesChannels: list(row.salesChannels).map((v) => text(v, "sales channel", true, 100)) };
      });
      if (new Set(value.map((item) => item.id)).size !== value.length) throw new Error("Duplicate department IDs.");
      return { ...state, hotelMasters: { ...state.hotelMasters, departments: value } };
    }
    case "templates": {
      const templates = list(action.value).map(template);
      unique(templates);
      for (const t of templates) {
        if (!state.setup.routes.some((r) => r.id === t.routeId) || !state.setup.boats.some((b) => b.id === t.boatId))
          throw new Error(
            "Choose an existing route and scheduled service for each template."
          );
      }
      return { ...state, templates };
    }
    case "generate": {
      const result = generateTemplate(
        state.trips,
        state.setup,
        template(action.template)
      );
      if (result.trips.length > 1e4)
        throw new Error("The prototype supports up to 10,000 departures.");
      return { ...state, trips: result.trips };
    }
    case "dayNote": {
      const date = text(action.date, "date");
      if (!validDate(date)) throw new Error("Choose a valid date.");
      const v = object(action.note);
      const note = {
        tide: text(v.tide, "tide", false),
        restricted: text(v.restricted, "restricted times", false),
        holiday: text(v.holiday, "holiday", false),
        notes: text(v.notes, "notes", false)
      };
      if (!Object.hasOwn(state.dayNotes, date) && Object.keys(state.dayNotes).length >= 3660)
        throw new Error("Too many calendar notes.");
      return { ...state, dayNotes: { ...state.dayNotes, [date]: note } };
    }
    case "addTrip": {
      const values = departure(action.values);
      if (state.trips.some((t) => t.id === values.id))
        throw new Error("This departure has already been added.");
      if (state.trips.length >= 1e4)
        throw new Error("The prototype supports up to 10,000 departures.");
      return {
        ...state,
        trips: addTrip(
          state.trips,
          tripFromSetup(state.setup, values),
          state.setup.rules
        )
      };
    }
    case "editTrip": {
      const values = departure(action.values);
      const original = state.trips.find((t) => t.id === values.id);
      if (!original) throw new Error("This departure is no longer available.");
      return {
        ...state,
        trips: editScheduledTrip(state.trips, state.setup, original, values)
      };
    }
    case "passengers": {
      const g = object(action.group);
      if (g.bookingId)
        throw new Error(
          "Use Booking Transport to assign linked booking transfers."
        );
      const current = trip();
      const group = {
        id: text(g.id, "party ID"),
        name: text(g.name, "guest name", true, 200),
        reference: text(g.reference, "reference", true, 100),
        adults: number(g.adults, "adults", 1),
        children: number(g.children, "children"),
        boarded: false
      };
      if (current.groups.some((item) => item.id === group.id))
        throw new Error("This party has already been added.");
      return replace(addGroupToTrip(current, group));
    }
    case "passengerUpdate": {
      const current = trip();
      const groupId = text(action.groupId, "party ID");
      const adults = number(action.adults, "adults", 0, current.capacity);
      const children = number(action.children, "children", 0, current.capacity);
      const infants = number(action.infants, "infants", 0, current.capacity);
      const group = current.groups.find((item) => item.id === groupId);
      if (!group) throw new Error("This reservation no longer exists.");
      if (adults + children < 1 || countPassengers(current) - group.adults - group.children + adults + children > current.capacity)
        throw new Error("Passenger count exceeds available seats.");
      return {
        ...state,
        bookingLegs: group.bookingId ? state.bookingLegs.map((leg) => leg.bookingReference === group.bookingId && leg.tripId === current.id ? { ...leg, passengers: adults + children } : leg) : state.bookingLegs,
        trips: state.trips.map((item) => item.id === current.id ? { ...current, groups: current.groups.map((item2) => item2.id === groupId ? { ...item2, adults, children, infants } : item2) } : item)
      };
    }
    case "passengerRemove": {
      const current = trip();
      const groupId = text(action.groupId, "party ID");
      const group = current.groups.find((item) => item.id === groupId);
      if (!group) throw new Error("This reservation no longer exists.");
      if (current.status === "Completed" || group.boarded) throw new Error("Boarded or completed transport cannot be removed.");
      return {
        ...state,
        bookingLegs: group.bookingId ? state.bookingLegs.filter((leg) => !(leg.bookingReference === group.bookingId && leg.tripId === current.id)) : state.bookingLegs,
        trips: state.trips.map((item) => item.id === current.id ? { ...current, groups: current.groups.filter((item2) => item2.id !== groupId) } : item)
      };
    }
    case "status": {
      const current = trip();
      if (!["Scheduled", "Cancelled"].includes(String(action.status)))
        throw new Error("Choose a valid trip status.");
      return replace({ ...current, status: action.status });
    }
    case "board": {
      const current = trip();
      if (["Cancelled", "Completed"].includes(current.status))
        throw new Error("Boarding cannot be changed on a closed departure.");
      const groupId = text(action.groupId, "party ID");
      if (!current.groups.some((g) => g.id === groupId))
        throw new Error("This passenger party no longer exists.");
      return replace({
        ...current,
        groups: current.groups.map(
          (g) => g.id === groupId ? { ...g, boarded: boolean(action.boarded) } : g
        )
      });
    }
    case "hotelLocationSave": {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const value = {
        code: text(v.code, "location code", true, 20).trim().toUpperCase(),
        description: text(v.description, "location description", true, 120).trim(),
        floorPlanAttachment: text(v.floorPlanAttachment, "floor plan attachment", false, 255).trim(),
        active: boolean(v.active)
      };
      const exists = normalized.hotelMasters.locations.some((item) => item.code === value.code);
      return {
        ...normalized,
        hotelMasters: {
          ...normalized.hotelMasters,
          locations: exists ? normalized.hotelMasters.locations.map((item) => item.code === value.code ? value : item) : [...normalized.hotelMasters.locations, value]
        }
      };
    }
    case "hotelRoomTypeSave": {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const code = text(v.code, "room type code", true, 20).trim().toUpperCase();
      const value = {
        code,
        description: text(v.description, "room type description", true, 120).trim(),
        propertyType: text(v.propertyType, "property type", true, 60).trim(),
        measureType: text(v.measureType, "measure type", true, 60).trim(),
        roomSize: number(v.roomSize, "room size", 0, 1e5),
        maxGuest: number(v.maxGuest, "max guest", 1, 50),
        houseLimit: number(v.houseLimit, "house limit", 0, 50),
        housekeepingPoints: number(v.housekeepingPoints, "housekeeping points", 0, 1e4),
        totalRoom: normalized.hotelMasters.rooms.filter((room) => room.roomTypeCode === code).length,
        active: boolean(v.active)
      };
      const exists = normalized.hotelMasters.roomTypes.some((item) => item.code === code);
      return {
        ...normalized,
        hotelMasters: {
          ...normalized.hotelMasters,
          roomTypes: exists ? normalized.hotelMasters.roomTypes.map((item) => item.code === code ? value : item) : [...normalized.hotelMasters.roomTypes, value],
          rooms: normalized.hotelMasters.rooms.map(
            (room) => room.roomTypeCode === code ? { ...room, maxGuest: value.maxGuest, roomSize: value.roomSize } : room
          )
        }
      };
    }
    case "hotelRoomSave": {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const roomNo = text(v.roomNo, "room number", true, 30).trim().toUpperCase();
      const roomTypeCode = text(v.roomTypeCode, "room type", true, 20).trim().toUpperCase();
      const locationCode = text(v.locationCode, "location", true, 20).trim().toUpperCase();
      const roomType = normalized.hotelMasters.roomTypes.find((item) => item.code === roomTypeCode && item.active);
      if (!roomType) throw new Error("Choose an active Room Type from Hotel Settings.");
      if (!normalized.hotelMasters.locations.some((item) => item.code === locationCode && item.active))
        throw new Error("Choose an active Location from Hotel Settings.");
      const value = {
        roomNo,
        roomTypeCode,
        description: text(v.description, "room description", true, 120).trim(),
        locationCode,
        maxGuest: roomType.maxGuest,
        roomSize: roomType.roomSize,
        displaySequence: number(v.displaySequence, "display sequence", 1, 1e5),
        keycardRoomMapping: text(v.keycardRoomMapping, "keycard room mapping", false, 100).trim(),
        active: boolean(v.active)
      };
      const exists = normalized.hotelMasters.rooms.some((item) => item.roomNo === roomNo);
      const rooms = exists ? normalized.hotelMasters.rooms.map((item) => item.roomNo === roomNo ? value : item) : [...normalized.hotelMasters.rooms, value];
      const roomTypes2 = normalized.hotelMasters.roomTypes.map((type) => ({
        ...type,
        totalRoom: rooms.filter((room) => room.roomTypeCode === type.code).length
      }));
      return { ...normalized, hotelMasters: { ...normalized.hotelMasters, rooms, roomTypes: roomTypes2 } };
    }
    case "bookingCreate": {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const reference = text(v.reference, "booking reference", true, 30).trim().toUpperCase();
      if (normalized.bookings.some((item) => item.reference === reference))
        throw new Error("This booking reference already exists.");
      const arrival = text(v.arrival, "arrival date", true, 10);
      const departureDate = text(v.departure, "departure date", true, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || departureDate <= arrival)
        throw new Error("Departure date must be after the arrival date.");
      const bookingRooms = list(v.rooms, 10).map((entry) => {
        const room = object(entry);
        const code = text(room.code, "room type", true, 20).trim().toUpperCase();
        const master = normalized.hotelMasters.roomTypes.find((item) => item.code === code && item.active);
        if (!master) throw new Error(`Room Type ${code} is not active in Hotel Settings.`);
        const count = number(room.count, "number of rooms", 1, master.totalRoom || 1);
        const finite = (value2, fallback = 0) => typeof value2 === "number" && Number.isFinite(value2) && value2 >= 0 ? value2 : fallback;
        return {
          code,
          count,
          adults: typeof room.adults === "number" ? number(room.adults, "number of adults", 1, 1e3) : void 0,
          children: typeof room.children === "number" ? number(room.children, "number of children", 0, 1e3) : void 0,
          infants: typeof room.infants === "number" ? number(room.infants, "number of infants", 0, 1e3) : void 0,
          rateCode: typeof room.rateCode === "string" ? room.rateCode.slice(0, 40) : void 0,
          roomRate: finite(room.roomRate),
          promoCode: typeof room.promoCode === "string" ? room.promoCode.slice(0, 40) : void 0,
          discountPerNight: finite(room.discountPerNight),
          subtotal: finite(room.subtotal),
          discount: finite(room.discount),
          tax: finite(room.tax),
          total: finite(room.total)
        };
      });
      const guests = number(v.guests, "number of guests", 1, 1e3);
      const guestCapacity = bookingRooms.reduce((total, item) => {
        const master = normalized.hotelMasters.roomTypes.find((type) => type.code === item.code);
        return total + master.maxGuest * item.count;
      }, 0);
      if (guests > guestCapacity)
        throw new Error(`Maximum guest capacity for the selected room(s) is ${guestCapacity}.`);
      if (typeof v.amount !== "number" || !Number.isFinite(v.amount) || v.amount < 0 || v.amount > 1e8)
        throw new Error("Enter a valid booking amount.");
      const value = {
        reference,
        guest: text(v.guest, "guest name", true, 160).trim(),
        arrival,
        departure: departureDate,
        status: "Booked",
        rooms: bookingRooms,
        assignedRooms: 0,
        checkedInGuests: 0,
        guests,
        amount: v.amount,
        groupName: typeof v.groupName === "string" ? v.groupName.slice(0, 160) : "",
        phone: typeof v.phone === "string" ? v.phone.slice(0, 80) : "",
        accountName: typeof v.accountName === "string" ? v.accountName.slice(0, 160) : "",
        creditLimit: typeof v.creditLimit === "number" && Number.isFinite(v.creditLimit) && v.creditLimit >= 0 ? v.creditLimit : 0,
        printRate: typeof v.printRate === "boolean" ? v.printRate : true,
        stateTax: typeof v.stateTax === "boolean" ? v.stateTax : true,
        tourismTax: typeof v.tourismTax === "boolean" ? v.tourismTax : true,
        email: typeof v.email === "string" ? v.email.slice(0, 200) : "",
        salesChannel: typeof v.salesChannel === "string" ? v.salesChannel.slice(0, 80) : "Direct",
        source: typeof v.source === "string" ? v.source.slice(0, 80) : "Booking",
        segment: typeof v.segment === "string" ? v.segment.slice(0, 80) : "Leisure",
        referenceNo: typeof v.referenceNo === "string" ? v.referenceNo.slice(0, 100) : ""
      };
      return { ...normalized, bookings: [value, ...normalized.bookings] };
    }
    case "bookingUpdate": {
      const normalized = normalizeTransportState(state);
      const v = object(action.value);
      const reference = text(v.reference, "booking reference", true, 30).trim().toUpperCase();
      const existing = normalized.bookings.find((item) => item.reference === reference);
      if (!existing) throw new Error("This booking no longer exists.");
      const arrival = text(v.arrival, "arrival date", true, 10);
      const departureDate = text(v.departure, "departure date", true, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(departureDate) || departureDate <= arrival)
        throw new Error("Departure date must be after the arrival date.");
      const bookingRooms = list(v.rooms, 10).map((entry) => {
        const room = object(entry);
        const code = text(room.code, "room type", true, 20).trim().toUpperCase();
        const master = normalized.hotelMasters.roomTypes.find((item) => item.code === code && item.active);
        if (!master) throw new Error(`Room Type ${code} is not active in Hotel Settings.`);
        const count = number(room.count, "number of rooms", 1, master.totalRoom || 1);
        const finite = (value2, fallback = 0) => typeof value2 === "number" && Number.isFinite(value2) && value2 >= 0 ? value2 : fallback;
        const adults = typeof room.adults === "number" ? number(room.adults, "number of adults", 1, 1e3) : void 0;
        const children = typeof room.children === "number" ? number(room.children, "number of children", 0, 1e3) : void 0;
        const infants = typeof room.infants === "number" ? number(room.infants, "number of infants", 0, 1e3) : void 0;
        if ((adults ?? 1) + (children ?? 0) + (infants ?? 0) > master.maxGuest * count)
          throw new Error(`Maximum guest capacity for ${count} ${code} room(s) is ${master.maxGuest * count}.`);
        return {
          code,
          count,
          adults,
          children,
          infants,
          rateCode: typeof room.rateCode === "string" ? room.rateCode.slice(0, 40) : void 0,
          roomRate: finite(room.roomRate),
          promoCode: typeof room.promoCode === "string" ? room.promoCode.slice(0, 40) : void 0,
          discountPerNight: finite(room.discountPerNight),
          subtotal: finite(room.subtotal),
          discount: finite(room.discount),
          tax: finite(room.tax),
          total: finite(room.total)
        };
      });
      const guests = number(v.guests, "number of guests", 1, 1e3);
      const guestCapacity = bookingRooms.reduce((total, item) => {
        const master = normalized.hotelMasters.roomTypes.find((type) => type.code === item.code);
        return total + master.maxGuest * item.count;
      }, 0);
      if (guests > guestCapacity) throw new Error(`Maximum guest capacity for the selected room(s) is ${guestCapacity}.`);
      if (typeof v.amount !== "number" || !Number.isFinite(v.amount) || v.amount < 0 || v.amount > 1e8)
        throw new Error("Enter a valid booking amount.");
      const value = {
        ...existing,
        reference,
        guest: text(v.guest, "guest name", true, 160).trim(),
        arrival,
        departure: departureDate,
        rooms: bookingRooms,
        guests,
        amount: v.amount,
        groupName: typeof v.groupName === "string" ? v.groupName.slice(0, 160) : "",
        phone: typeof v.phone === "string" ? v.phone.slice(0, 80) : "",
        accountName: typeof v.accountName === "string" ? v.accountName.slice(0, 160) : "",
        creditLimit: typeof v.creditLimit === "number" && Number.isFinite(v.creditLimit) && v.creditLimit >= 0 ? v.creditLimit : 0,
        printRate: typeof v.printRate === "boolean" ? v.printRate : true,
        stateTax: typeof v.stateTax === "boolean" ? v.stateTax : true,
        tourismTax: typeof v.tourismTax === "boolean" ? v.tourismTax : true,
        email: typeof v.email === "string" ? v.email.slice(0, 200) : "",
        salesChannel: typeof v.salesChannel === "string" ? v.salesChannel.slice(0, 80) : "Direct",
        source: typeof v.source === "string" ? v.source.slice(0, 80) : "Booking",
        segment: typeof v.segment === "string" ? v.segment.slice(0, 80) : "Leisure",
        referenceNo: typeof v.referenceNo === "string" ? v.referenceNo.slice(0, 100) : ""
      };
      return { ...normalized, bookings: normalized.bookings.map((item) => item.reference === reference ? value : item) };
    }
    case "rateSetup": {
      return { ...normalizeTransportState(state), rateSetup: rateSetup(action.value) };
    }
    case "bookingTransportAdd": {
      const booking = normalizeTransportState(state).bookings.find(
        (b) => b.reference === text(action.bookingReference, "booking reference")
      );
      if (!booking) throw new Error("This demo booking does not exist.");
      const v = object(action.values);
      const direction = String(v.direction);
      if (direction !== "arrival" && direction !== "departure")
        throw new Error("Choose arrival or departure transport.");
      const values = {
        id: text(v.id, "transport leg ID", true, 200),
        direction,
        serviceId: text(v.serviceId, "service"),
        tripId: text(v.tripId, "departure", false, 200),
        date: text(v.date, "date", false, 10),
        time: text(v.time, "time", false, 5),
        pickup: text(v.pickup, "pickup location", false, 150),
        dropoff: text(v.dropoff, "drop-off location", false, 150),
        passengers: number(v.passengers, "passengers", 1, booking.guests),
        flightNo: text(v.flightNo, "flight/reference", false, 80),
        vehicle: text(v.vehicle, "vehicle", false, 100),
        driver: text(v.driver, "driver", false, 100),
        remarks: text(v.remarks, "remarks", false, 1e3)
      };
      const normalized = normalizeTransportState(state);
      const result = addBookingTransportLeg(
        normalized.trips,
        normalized.setup,
        normalized.bookingLegs,
        booking,
        values
      );
      return {
        ...normalized,
        trips: result.trips,
        bookingLegs: [...normalized.bookingLegs, result.leg]
      };
    }
    case "bookingTransportRemove": {
      const bookingReference = text(
        action.bookingReference,
        "booking reference"
      );
      const normalized = normalizeTransportState(state);
      const result = removeBookingTransportLeg(
        normalized.trips,
        normalized.bookingLegs,
        bookingReference,
        text(action.legId, "transport leg ID", true, 200)
      );
      return {
        ...normalized,
        trips: result.trips,
        bookingLegs: result.legs
      };
    }
    case "transfers": {
      const booking = normalizeTransportState(state).bookings.find(
        (b) => b.reference === text(action.bookingReference, "booking reference")
      );
      if (!booking) throw new Error("This demo booking does not exist.");
      const v = object(action.selection);
      const selection = {
        arrivalId: text(v.arrivalId, "arrival", false),
        returnId: text(v.returnId, "return", false),
        adults: number(v.adults, "adults", 1),
        children: number(v.children, "children")
      };
      return {
        ...state,
        trips: assignBookingTransfers(state.trips, booking, selection)
      };
    }
    default:
      throw new Error("Unsupported transport action.");
  }
}

// worker/neon.ts
var ApiError = class extends Error {
  constructor(code, message, status = 502) {
    super(message);
    this.code = code;
    this.status = status;
  }
};
function nonPoolerHost(host) {
  const parts = host.split(".");
  parts[0] = parts[0].replace(/-pooler$/, "");
  return parts.join(".");
}
function apiHost(host) {
  const parts = host.split(".");
  parts[0] = "api";
  return parts.join(".");
}
function allowed(url, host) {
  const direct = nonPoolerHost(host);
  const api = /^api(?:\.c-\d+)?\.[a-z0-9-]+\.(?:aws|azure)\.neon\.tech$/i;
  return (url.hostname === host || url.hostname === direct || api.test(url.hostname)) && url.protocol === "https:" && !url.port && !url.username && !url.password && !url.search && !url.hash && ["/sql", "/sql/"].includes(url.pathname);
}
async function executeHttpQuery(endpoint, databaseHost, connection, sql, params) {
  let url = endpoint;
  const seen = /* @__PURE__ */ new Set();
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 15e3);
  try {
    for (let hop = 0; hop <= 3; hop++) {
      if (!allowed(url, databaseHost) || seen.has(url.href))
        throw new ApiError(
          "DATABASE_REDIRECT",
          "The database returned an unsupported redirect."
        );
      seen.add(url.href);
      const response = await fetch(url.href, {
        method: "POST",
        redirect: "manual",
        signal: abort.signal,
        headers: {
          "Content-Type": "application/json",
          "Neon-Connection-String": connection,
          "Neon-Array-Mode": "true",
          "Neon-Raw-Text-Output": "true"
        },
        body: JSON.stringify({ query: sql, params })
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("Location");
        await response.body?.cancel();
        if (!location)
          throw new ApiError(
            "DATABASE_REDIRECT",
            "The database redirect was incomplete."
          );
        url = new URL(location, url);
        continue;
      }
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        if (detail.code === "42P01")
          throw new ApiError(
            "STORAGE_MISSING",
            "Run the transport storage setup script in Neon first.",
            503
          );
        throw new ApiError(
          "DATABASE_QUERY",
          "The database could not complete this request. Please try again."
        );
      }
      const data = await response.json();
      if (!Array.isArray(data.rows))
        throw new ApiError(
          "DATABASE_RESPONSE",
          "The database returned an unexpected response."
        );
      return data.rows;
    }
    throw new ApiError(
      "DATABASE_REDIRECT",
      "The database returned too many redirects."
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      abort.signal.aborted ? "DATABASE_TIMEOUT" : "DATABASE_CONNECTION",
      "The database connection was interrupted. Reload saved data before retrying a change."
    );
  } finally {
    clearTimeout(timeout);
  }
}
var queryNeon = async (connection, sql, params) => {
  let database;
  try {
    database = new URL(connection);
    if (!["postgres:", "postgresql:"].includes(database.protocol) || !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)+\.neon\.tech$/i.test(
      database.hostname
    ) || !database.username || !database.password || /[^\x21-\x7e]/.test(connection))
      throw new Error();
  } catch {
    throw new ApiError(
      "DATABASE_CONFIGURATION",
      "The database connection secret needs attention.",
      503
    );
  }
  const endpoints = [
    new URL(`https://${nonPoolerHost(database.hostname)}/sql`),
    new URL(`https://${apiHost(database.hostname)}/sql`)
  ];
  let lastError;
  for (const endpoint of endpoints) {
    try {
      return await executeHttpQuery(
        endpoint,
        database.hostname,
        connection,
        sql,
        params
      );
    } catch (error) {
      lastError = error;
      if (error instanceof ApiError && !["DATABASE_CONNECTION", "DATABASE_TIMEOUT"].includes(error.code))
        throw error;
    }
  }
  if (lastError instanceof ApiError) throw lastError;
  throw new ApiError(
    "DATABASE_CONNECTION",
    "The database connection was interrupted. Reload saved data before retrying a change."
  );
};

// worker/normalized-storage.ts
var schemaStatements = [
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_meta (
    id text PRIMARY KEY,
    schema_version integer NOT NULL DEFAULT 2 CHECK (schema_version = 2),
    revision integer NOT NULL DEFAULT 1 CHECK (revision >= 1),
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_rules (
    property_id text PRIMARY KEY REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    start_time text NOT NULL,
    end_time text NOT NULL,
    turnaround_minutes integer NOT NULL DEFAULT 0,
    boarding_lead_minutes integer NOT NULL DEFAULT 0,
    notes text NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_operators (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    contact text NOT NULL DEFAULT '',
    phone text NOT NULL DEFAULT '',
    email text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_services (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    operator_id text NOT NULL,
    capacity integer NOT NULL CHECK (capacity >= 1),
    status text NOT NULL CHECK (status IN ('Active', 'Maintenance', 'Inactive')),
    service_type text NOT NULL,
    booking_mode text NOT NULL CHECK (booking_mode IN ('Scheduled', 'OnDemand')),
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_routes (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    origin text NOT NULL,
    destination text NOT NULL,
    meeting_point text NOT NULL,
    duration_minutes integer NOT NULL CHECK (duration_minutes >= 1),
    operator_id text NOT NULL,
    to_hotel boolean NOT NULL,
    active boolean NOT NULL,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_templates (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    route_id text NOT NULL,
    service_id text NOT NULL,
    start_date text NOT NULL,
    end_date text NOT NULL,
    weekdays smallint[] NOT NULL DEFAULT '{}'::smallint[],
    departure_times text[] NOT NULL DEFAULT '{}'::text[],
    excluded_dates text[] NOT NULL DEFAULT '{}'::text[],
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_day_notes (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    date_key text NOT NULL,
    tide text NOT NULL DEFAULT '',
    restricted text NOT NULL DEFAULT '',
    holiday text NOT NULL DEFAULT '',
    notes text NOT NULL DEFAULT '',
    PRIMARY KEY (property_id, date_key)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_trips (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    trip_date text NOT NULL,
    trip_time text NOT NULL,
    direction text NOT NULL,
    origin text NOT NULL,
    destination text NOT NULL,
    meeting_point text NOT NULL,
    duration_minutes integer NOT NULL,
    boarding_lead_minutes integer NOT NULL,
    turnaround_minutes integer NOT NULL,
    operating_notes text NOT NULL DEFAULT '',
    to_hotel boolean NOT NULL,
    service_id text NOT NULL,
    service_name text NOT NULL,
    operator_name text NOT NULL,
    capacity integer NOT NULL CHECK (capacity >= 1),
    status text NOT NULL,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_trip_groups (
    property_id text NOT NULL,
    trip_id text NOT NULL,
    id text NOT NULL,
    sort_order integer NOT NULL,
    booking_id text,
    reference text NOT NULL,
    name text NOT NULL,
    adults integer NOT NULL,
    children integer NOT NULL,
    infants integer NOT NULL DEFAULT 0,
    boarded boolean NOT NULL DEFAULT false,
    PRIMARY KEY (property_id, trip_id, id),
    FOREIGN KEY (property_id, trip_id)
      REFERENCES public.hotelx_transport_trips(property_id, id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_transport_booking_legs (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    booking_reference text NOT NULL,
    direction text NOT NULL CHECK (direction IN ('arrival', 'departure')),
    service_id text NOT NULL,
    service_name text NOT NULL,
    service_type text NOT NULL,
    booking_mode text NOT NULL CHECK (booking_mode IN ('Scheduled', 'OnDemand')),
    operator_id text NOT NULL,
    operator_name text NOT NULL,
    travel_date text NOT NULL,
    travel_time text NOT NULL,
    pickup text NOT NULL,
    dropoff text NOT NULL,
    passengers integer NOT NULL CHECK (passengers >= 1),
    flight_no text NOT NULL DEFAULT '',
    vehicle text NOT NULL DEFAULT '',
    driver text NOT NULL DEFAULT '',
    remarks text NOT NULL DEFAULT '',
    trip_id text NOT NULL DEFAULT '',
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_location_master (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    code text NOT NULL,
    sort_order integer NOT NULL,
    description text NOT NULL,
    floor_plan_attachment text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (property_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_room_type_master (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    code text NOT NULL,
    sort_order integer NOT NULL,
    description text NOT NULL,
    property_type text NOT NULL,
    measure_type text NOT NULL,
    room_size integer NOT NULL DEFAULT 0,
    max_guest integer NOT NULL CHECK (max_guest >= 1),
    house_limit integer NOT NULL DEFAULT 0,
    housekeeping_points integer NOT NULL DEFAULT 0,
    total_room integer NOT NULL DEFAULT 0,
    active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (property_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_room_master (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    room_no text NOT NULL,
    sort_order integer NOT NULL,
    room_type_code text NOT NULL,
    description text NOT NULL,
    location_code text NOT NULL,
    max_guest integer NOT NULL CHECK (max_guest >= 1),
    room_size integer NOT NULL DEFAULT 0,
    display_sequence integer NOT NULL,
    keycard_room_mapping text NOT NULL DEFAULT '',
    active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (property_id, room_no),
    FOREIGN KEY (property_id, room_type_code) REFERENCES public.hotelx_room_type_master(property_id, code),
    FOREIGN KEY (property_id, location_code) REFERENCES public.hotelx_location_master(property_id, code)
  )`,
  `ALTER TABLE public.hotelx_transport_trip_groups ADD COLUMN IF NOT EXISTS infants integer NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_roomstatus (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    status_code text NOT NULL,
    sort_order integer NOT NULL,
    status_name text NOT NULL,
    status_color text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    PRIMARY KEY (property_id, status_code)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_department (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    department_id text NOT NULL,
    sort_order integer NOT NULL,
    department_name text NOT NULL,
    incidental_charges jsonb NOT NULL DEFAULT '[]'::jsonb,
    reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
    sales_channels jsonb NOT NULL DEFAULT '[]'::jsonb,
    PRIMARY KEY (property_id, department_id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_incidentalcharges (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    charge_id text NOT NULL,
    department_id text NOT NULL,
    title text NOT NULL,
    amount numeric(14,2) NOT NULL DEFAULT 0,
    tax_scheme text NOT NULL,
    outlet_code text NOT NULL DEFAULT '',
    options jsonb NOT NULL DEFAULT '{}'::jsonb,
    msic_code text NOT NULL DEFAULT '',
    classification text NOT NULL DEFAULT '',
    PRIMARY KEY (property_id, charge_id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_bookings (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    reference text NOT NULL,
    sort_order integer NOT NULL,
    guest text NOT NULL,
    arrival_date text NOT NULL,
    departure_date text NOT NULL,
    status text NOT NULL,
    assigned_rooms integer NOT NULL DEFAULT 0,
    checked_in_guests integer NOT NULL DEFAULT 0,
    guests integer NOT NULL,
    amount numeric(14,2) NOT NULL DEFAULT 0,
    highlight_dates boolean NOT NULL DEFAULT false,
    PRIMARY KEY (property_id, reference)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_booking_rooms (
    property_id text NOT NULL,
    booking_reference text NOT NULL,
    room_type_code text NOT NULL,
    sort_order integer NOT NULL,
    room_count integer NOT NULL CHECK (room_count >= 1),
    PRIMARY KEY (property_id, booking_reference, room_type_code),
    FOREIGN KEY (property_id, booking_reference) REFERENCES public.hotelx_bookings(property_id, reference) ON DELETE CASCADE,
    FOREIGN KEY (property_id, room_type_code) REFERENCES public.hotelx_room_type_master(property_id, code)
  )`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS group_name text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS phone text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS account_name text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS credit_limit numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS print_rate boolean NOT NULL DEFAULT true`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS state_tax boolean NOT NULL DEFAULT true`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS tourism_tax boolean NOT NULL DEFAULT true`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS sales_channel text NOT NULL DEFAULT 'Direct'`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'Booking'`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS segment text NOT NULL DEFAULT 'Leisure'`,
  `ALTER TABLE public.hotelx_bookings ADD COLUMN IF NOT EXISTS reference_no text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS adults integer NOT NULL DEFAULT 1`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS children integer NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS infants integer NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS rate_code text NOT NULL DEFAULT 'BAR'`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS room_rate numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS promo_code text NOT NULL DEFAULT ''`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS discount_per_night numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS discount numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS tax numeric(14,2) NOT NULL DEFAULT 0`,
  `ALTER TABLE public.hotelx_booking_rooms ADD COLUMN IF NOT EXISTS total numeric(14,2) NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_season_master (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    color text NOT NULL DEFAULT '#ff9100',
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_season_calendar (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    calendar_date date NOT NULL,
    season_id text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, calendar_date),
    FOREIGN KEY (property_id, season_id)
      REFERENCES public.hotelx_season_master(property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_element (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    basis text NOT NULL,
    min_qty integer NOT NULL DEFAULT 0 CHECK (min_qty >= 0),
    max_qty integer NOT NULL DEFAULT 0 CHECK (max_qty >= min_qty),
    amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_type (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    name text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_setup (
    property_id text NOT NULL REFERENCES public.hotelx_transport_meta(id) ON DELETE CASCADE,
    id text NOT NULL,
    sort_order integer NOT NULL,
    code text NOT NULL,
    description text NOT NULL,
    active boolean NOT NULL DEFAULT true,
    web boolean NOT NULL DEFAULT false,
    last_updated_on date,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, id),
    UNIQUE (property_id, code)
  )`,
  `CREATE TABLE IF NOT EXISTS public.hotelx_rate_setup_validity (
    property_id text NOT NULL,
    rate_setup_id text NOT NULL,
    id text NOT NULL,
    sort_order integer NOT NULL,
    valid_from date NOT NULL,
    valid_to date NOT NULL,
    active boolean NOT NULL DEFAULT true,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (property_id, rate_setup_id, id),
    FOREIGN KEY (property_id, rate_setup_id)
      REFERENCES public.hotelx_rate_setup(property_id, id) ON DELETE CASCADE,
    CHECK (valid_to >= valid_from)
  )`,
  `CREATE INDEX IF NOT EXISTS hotelx_season_calendar_season_idx
    ON public.hotelx_season_calendar(property_id, season_id, calendar_date)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_element_name_idx
    ON public.hotelx_rate_element(property_id, name)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_type_name_idx
    ON public.hotelx_rate_type(property_id, name)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_setup_code_idx
    ON public.hotelx_rate_setup(property_id, code)`,
  `CREATE INDEX IF NOT EXISTS hotelx_rate_setup_validity_dates_idx
    ON public.hotelx_rate_setup_validity(property_id, rate_setup_id, valid_from, valid_to)`,
  `CREATE INDEX IF NOT EXISTS hotelx_room_master_type_idx
    ON public.hotelx_room_master(property_id, room_type_code, location_code)`,
  `CREATE INDEX IF NOT EXISTS hotelx_bookings_dates_idx
    ON public.hotelx_bookings(property_id, arrival_date, departure_date)`,
  `CREATE INDEX IF NOT EXISTS hotelx_transport_trips_date_idx
    ON public.hotelx_transport_trips(property_id, trip_date, trip_time)`,
  `CREATE INDEX IF NOT EXISTS hotelx_transport_groups_booking_idx
    ON public.hotelx_transport_trip_groups(property_id, booking_id)`,
  `CREATE INDEX IF NOT EXISTS hotelx_transport_legs_booking_idx
    ON public.hotelx_transport_booking_legs(property_id, booking_reference, travel_date)`,
  `CREATE OR REPLACE FUNCTION public.hotelx_transport_replace_rows(
    p_property_id text,
    p_state jsonb
  ) RETURNS void
  LANGUAGE plpgsql
  AS $$
  BEGIN
    DELETE FROM public.hotelx_rate_setup_validity WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_season_calendar WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_rate_element WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_rate_type WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_rate_setup WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_season_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_booking_rooms WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_bookings WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_room_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_roomstatus WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_department WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_incidentalcharges WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_room_type_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_location_master WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_trip_groups WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_booking_legs WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_trips WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_templates WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_day_notes WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_services WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_routes WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_operators WHERE property_id = p_property_id;
    DELETE FROM public.hotelx_transport_rules WHERE property_id = p_property_id;

    INSERT INTO public.hotelx_location_master (
      property_id, code, sort_order, description, floor_plan_attachment, active
    )
    SELECT p_property_id, item.value->>'code', item.ordinality::integer,
      COALESCE(item.value->>'description', ''), COALESCE(item.value->>'floorPlanAttachment', ''),
      COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,locations}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_room_type_master (
      property_id, code, sort_order, description, property_type, measure_type,
      room_size, max_guest, house_limit, housekeeping_points, total_room, active
    )
    SELECT p_property_id, item.value->>'code', item.ordinality::integer,
      COALESCE(item.value->>'description', ''), COALESCE(item.value->>'propertyType', 'Room'),
      COALESCE(item.value->>'measureType', 'Square Metre'),
      COALESCE(NULLIF(item.value->>'roomSize', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'maxGuest', ''), '1')::integer,
      COALESCE(NULLIF(item.value->>'houseLimit', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'housekeepingPoints', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'totalRoom', ''), '0')::integer,
      COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,roomTypes}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_room_master (
      property_id, room_no, sort_order, room_type_code, description, location_code,
      max_guest, room_size, display_sequence, keycard_room_mapping, active
    )
    SELECT p_property_id, item.value->>'roomNo', item.ordinality::integer,
      item.value->>'roomTypeCode', COALESCE(item.value->>'description', ''),
      item.value->>'locationCode', COALESCE(NULLIF(item.value->>'maxGuest', ''), '1')::integer,
      COALESCE(NULLIF(item.value->>'roomSize', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'displaySequence', ''), item.ordinality::text)::integer,
      COALESCE(item.value->>'keycardRoomMapping', ''), COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,rooms}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_roomstatus (
      property_id, status_code, sort_order, status_name, status_color, active
    )
    SELECT p_property_id, item.value->>'code', item.ordinality::integer,
      item.value->>'description', COALESCE(item.value->>'color', '#808080'),
      COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,roomStatuses}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_department (
      property_id, department_id, sort_order, department_name, incidental_charges, reasons, sales_channels
    )
    SELECT p_property_id, item.value->>'id', item.ordinality::integer,
      item.value->>'name', COALESCE(item.value->'incidentalCharges', '[]'::jsonb),
      COALESCE(item.value->'reasons', '[]'::jsonb), COALESCE(item.value->'salesChannels', '[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,departments}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_incidentalcharges (
      property_id, charge_id, department_id, title, amount, tax_scheme, outlet_code, options, msic_code, classification
    )
    SELECT p_property_id, charge.value->>'id', department.value->>'id', charge.value->>'title',
      COALESCE(NULLIF(charge.value->>'amount',''),'0')::numeric, COALESCE(charge.value->>'taxScheme','SST-3'),
      COALESCE(charge.value->>'outletCode',''), charge.value - 'id' - 'title' - 'amount' - 'taxScheme' - 'outletCode' - 'msicCode' - 'classification',
      COALESCE(charge.value->>'msicCode',''), COALESCE(charge.value->>'classification','')
    FROM jsonb_array_elements(COALESCE(p_state #> '{hotelMasters,departments}', '[]'::jsonb)) AS department(value)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(department.value->'incidentalCharges', '[]'::jsonb)) AS charge(value);

    INSERT INTO public.hotelx_bookings (
      property_id, reference, sort_order, guest, arrival_date, departure_date, status,
      assigned_rooms, checked_in_guests, guests, amount, highlight_dates,
      group_name, phone, account_name, credit_limit, print_rate, state_tax, tourism_tax,
      email, sales_channel, source, segment, reference_no
    )
    SELECT p_property_id, item.value->>'reference', item.ordinality::integer,
      item.value->>'guest', item.value->>'arrival', item.value->>'departure',
      COALESCE(item.value->>'status', 'Booked'),
      COALESCE(NULLIF(item.value->>'assignedRooms', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'checkedInGuests', ''), '0')::integer,
      COALESCE(NULLIF(item.value->>'guests', ''), '1')::integer,
      COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric,
      COALESCE((item.value->>'highlightDates')::boolean, false),
      COALESCE(item.value->>'groupName', ''), COALESCE(item.value->>'phone', ''),
      COALESCE(item.value->>'accountName', ''), COALESCE(NULLIF(item.value->>'creditLimit', ''), '0')::numeric,
      COALESCE((item.value->>'printRate')::boolean, true), COALESCE((item.value->>'stateTax')::boolean, true),
      COALESCE((item.value->>'tourismTax')::boolean, true), COALESCE(item.value->>'email', ''),
      COALESCE(item.value->>'salesChannel', 'Direct'), COALESCE(item.value->>'source', 'Booking'),
      COALESCE(item.value->>'segment', 'Leisure'), COALESCE(item.value->>'referenceNo', '')
    FROM jsonb_array_elements(COALESCE(p_state->'bookings', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_booking_rooms (
      property_id, booking_reference, room_type_code, sort_order, room_count,
      adults, children, infants, rate_code, room_rate, promo_code, discount_per_night,
      subtotal, discount, tax, total
    )
    SELECT p_property_id, booking.value->>'reference', room.value->>'code',
      room.ordinality::integer, COALESCE(NULLIF(room.value->>'count', ''), '1')::integer,
      COALESCE(NULLIF(room.value->>'adults', ''), '1')::integer, COALESCE(NULLIF(room.value->>'children', ''), '0')::integer,
      COALESCE(NULLIF(room.value->>'infants', ''), '0')::integer, COALESCE(room.value->>'rateCode', 'BAR'),
      COALESCE(NULLIF(room.value->>'roomRate', ''), '0')::numeric, COALESCE(room.value->>'promoCode', ''),
      COALESCE(NULLIF(room.value->>'discountPerNight', ''), '0')::numeric, COALESCE(NULLIF(room.value->>'subtotal', ''), '0')::numeric,
      COALESCE(NULLIF(room.value->>'discount', ''), '0')::numeric, COALESCE(NULLIF(room.value->>'tax', ''), '0')::numeric,
      COALESCE(NULLIF(room.value->>'total', ''), '0')::numeric
    FROM jsonb_array_elements(COALESCE(p_state->'bookings', '[]'::jsonb)) AS booking(value)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(booking.value->'rooms', '[]'::jsonb))
      WITH ORDINALITY AS room(value, ordinality);

    INSERT INTO public.hotelx_season_master (property_id, id, sort_order, name, color, active)
    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'name', COALESCE(item.value->>'color', '#ff9100'), COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,seasons}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_season_calendar (property_id, calendar_date, season_id)
    SELECT p_property_id, assignment.key::date, assignment.value #>> '{}'
    FROM jsonb_each(COALESCE(p_state #> '{rateSetup,calendar}', '{}'::jsonb)) AS assignment(key, value)
    WHERE COALESCE(assignment.value #>> '{}', '') <> '';

    INSERT INTO public.hotelx_rate_element (property_id, id, sort_order, name, basis, min_qty, max_qty, amount, active)
    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'name', item.value->>'basis', COALESCE(NULLIF(item.value->>'min', ''), '0')::integer, COALESCE(NULLIF(item.value->>'max', ''), '0')::integer, COALESCE(NULLIF(item.value->>'amount', ''), '0')::numeric, COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,elements}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_rate_type (property_id, id, sort_order, name, active)
    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'name', COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,rateTypes}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_rate_setup (property_id, id, sort_order, code, description, active, web, last_updated_on)
    SELECT p_property_id, item.value->>'id', item.ordinality::integer, item.value->>'code', item.value->>'description', COALESCE((item.value->>'active')::boolean, true), COALESCE((item.value->>'web')::boolean, false), CASE WHEN COALESCE(item.value->>'updated', '') ~ '^d{2} [A-Za-z]{3} d{4}$' THEN to_date(item.value->>'updated', 'DD Mon YYYY') ELSE NULL END
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,ratePlans}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_rate_setup_validity (property_id, rate_setup_id, id, sort_order, valid_from, valid_to, active)
    SELECT p_property_id, item.value->>'rateSetupId', item.value->>'id', item.ordinality::integer, (item.value->>'from')::date, (item.value->>'to')::date, COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{rateSetup,validity}', '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_rules (
      property_id, start_time, end_time, turnaround_minutes,
      boarding_lead_minutes, notes
    ) VALUES (
      p_property_id,
      COALESCE(p_state #>> '{setup,rules,start}', '07:00'),
      COALESCE(p_state #>> '{setup,rules,end}', '19:00'),
      COALESCE(NULLIF(p_state #>> '{setup,rules,turnaroundMinutes}', ''), '0')::integer,
      COALESCE(NULLIF(p_state #>> '{setup,rules,boardingLeadMinutes}', ''), '0')::integer,
      COALESCE(p_state #>> '{setup,rules,notes}', '')
    );

    INSERT INTO public.hotelx_transport_operators (
      property_id, id, sort_order, name, contact, phone, email, active
    )
    SELECT
      p_property_id,
      item.value->>'id',
      item.ordinality::integer,
      item.value->>'name',
      COALESCE(item.value->>'contact', ''),
      COALESCE(item.value->>'phone', ''),
      COALESCE(item.value->>'email', ''),
      COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{setup,operators}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_services (
      property_id, id, sort_order, name, operator_id, capacity, status,
      service_type, booking_mode
    )
    SELECT
      p_property_id,
      item.value->>'id',
      item.ordinality::integer,
      item.value->>'name',
      item.value->>'operatorId',
      COALESCE(NULLIF(item.value->>'capacity', ''), '1')::integer,
      COALESCE(item.value->>'status', 'Active'),
      COALESCE(item.value->>'serviceType', 'Speedboat'),
      COALESCE(
        item.value->>'bookingMode',
        CASE
          WHEN COALESCE(item.value->>'serviceType', 'Speedboat') IN ('Speedboat', 'Shuttle')
            THEN 'Scheduled'
          ELSE 'OnDemand'
        END
      )
    FROM jsonb_array_elements(COALESCE(p_state #> '{setup,boats}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_routes (
      property_id, id, sort_order, origin, destination, meeting_point,
      duration_minutes, operator_id, to_hotel, active
    )
    SELECT
      p_property_id,
      item.value->>'id',
      item.ordinality::integer,
      item.value->>'origin',
      item.value->>'destination',
      COALESCE(item.value->>'meetingPoint', ''),
      COALESCE(NULLIF(item.value->>'durationMinutes', ''), '1')::integer,
      item.value->>'operatorId',
      COALESCE((item.value->>'toHotel')::boolean, false),
      COALESCE((item.value->>'active')::boolean, true)
    FROM jsonb_array_elements(COALESCE(p_state #> '{setup,routes}', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_templates (
      property_id, id, sort_order, name, route_id, service_id,
      start_date, end_date, weekdays, departure_times, excluded_dates
    )
    SELECT
      p_property_id,
      item.value->>'id',
      item.ordinality::integer,
      item.value->>'name',
      item.value->>'routeId',
      item.value->>'boatId',
      item.value->>'startDate',
      item.value->>'endDate',
      ARRAY(
        SELECT weekday.value::smallint
        FROM jsonb_array_elements_text(COALESCE(item.value->'weekdays', '[]'::jsonb)) AS weekday(value)
      ),
      ARRAY(
        SELECT departure.value
        FROM jsonb_array_elements_text(COALESCE(item.value->'times', '[]'::jsonb)) AS departure(value)
      ),
      ARRAY(
        SELECT excluded.value
        FROM jsonb_array_elements_text(COALESCE(item.value->'excludedDates', '[]'::jsonb)) AS excluded(value)
      )
    FROM jsonb_array_elements(COALESCE(p_state->'templates', '[]'::jsonb))
      WITH ORDINALITY AS item(value, ordinality);

    INSERT INTO public.hotelx_transport_day_notes (
      property_id, date_key, tide, restricted, holiday, notes
    )
    SELECT
      p_property_id,
      note.key,
      COALESCE(note.value->>'tide', ''),
      COALESCE(note.value->>'restricted', ''),
      COALESCE(note.value->>'holiday', ''),
      COALESCE(note.value->>'notes', '')
    FROM jsonb_each(COALESCE(p_state->'dayNotes', '{}'::jsonb)) AS note(key, value);

    INSERT INTO public.hotelx_transport_trips (
      property_id, id, sort_order, trip_date, trip_time, direction,
      origin, destination, meeting_point, duration_minutes,
      boarding_lead_minutes, turnaround_minutes, operating_notes,
      to_hotel, service_id, service_name, operator_name, capacity, status
    )
    SELECT
      p_property_id,
      trip.value->>'id',
      trip.ordinality::integer,
      trip.value->>'date',
      trip.value->>'time',
      trip.value->>'direction',
      trip.value->>'origin',
      trip.value->>'destination',
      COALESCE(trip.value->>'meetingPoint', ''),
      COALESCE(NULLIF(trip.value->>'durationMinutes', ''), '0')::integer,
      COALESCE(NULLIF(trip.value->>'boardingLeadMinutes', ''), '0')::integer,
      COALESCE(NULLIF(trip.value->>'turnaroundMinutes', ''), '0')::integer,
      COALESCE(trip.value->>'operatingNotes', ''),
      COALESCE((trip.value->>'toHotel')::boolean, false),
      COALESCE(trip.value->>'boatId', ''),
      COALESCE(trip.value->>'boat', ''),
      COALESCE(trip.value->>'operator', ''),
      COALESCE(NULLIF(trip.value->>'capacity', ''), '1')::integer,
      COALESCE(trip.value->>'status', 'Scheduled')
    FROM jsonb_array_elements(COALESCE(p_state->'trips', '[]'::jsonb))
      WITH ORDINALITY AS trip(value, ordinality);

    INSERT INTO public.hotelx_transport_trip_groups (
      property_id, trip_id, id, sort_order, booking_id, reference,
      name, adults, children, infants, boarded
    )
    SELECT
      p_property_id,
      trip.value->>'id',
      group_row.value->>'id',
      group_row.ordinality::integer,
      NULLIF(group_row.value->>'bookingId', ''),
      COALESCE(group_row.value->>'reference', ''),
      COALESCE(group_row.value->>'name', ''),
      COALESCE(NULLIF(group_row.value->>'adults', ''), '0')::integer,
      COALESCE(NULLIF(group_row.value->>'children', ''), '0')::integer,
      COALESCE(NULLIF(group_row.value->>'infants', ''), '0')::integer,
      COALESCE((group_row.value->>'boarded')::boolean, false)
    FROM jsonb_array_elements(COALESCE(p_state->'trips', '[]'::jsonb)) AS trip(value)
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(trip.value->'groups', '[]'::jsonb))
      WITH ORDINALITY AS group_row(value, ordinality);

    INSERT INTO public.hotelx_transport_booking_legs (
      property_id, id, sort_order, booking_reference, direction,
      service_id, service_name, service_type, booking_mode,
      operator_id, operator_name, travel_date, travel_time, pickup,
      dropoff, passengers, flight_no, vehicle, driver, remarks, trip_id
    )
    SELECT
      p_property_id,
      leg.value->>'id',
      leg.ordinality::integer,
      leg.value->>'bookingReference',
      leg.value->>'direction',
      leg.value->>'serviceId',
      leg.value->>'serviceName',
      COALESCE(leg.value->>'serviceType', 'Other'),
      COALESCE(leg.value->>'bookingMode', 'OnDemand'),
      COALESCE(leg.value->>'operatorId', ''),
      COALESCE(leg.value->>'operatorName', ''),
      COALESCE(leg.value->>'date', ''),
      COALESCE(leg.value->>'time', ''),
      COALESCE(leg.value->>'pickup', ''),
      COALESCE(leg.value->>'dropoff', ''),
      COALESCE(NULLIF(leg.value->>'passengers', ''), '1')::integer,
      COALESCE(leg.value->>'flightNo', ''),
      COALESCE(leg.value->>'vehicle', ''),
      COALESCE(leg.value->>'driver', ''),
      COALESCE(leg.value->>'remarks', ''),
      COALESCE(leg.value->>'tripId', '')
    FROM jsonb_array_elements(COALESCE(p_state->'bookingLegs', '[]'::jsonb))
      WITH ORDINALITY AS leg(value, ordinality);
  END;
  $$`,
  `CREATE OR REPLACE FUNCTION public.hotelx_transport_initialize(
    p_property_id text,
    p_revision integer,
    p_state jsonb
  ) RETURNS integer
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_revision integer;
  BEGIN
    INSERT INTO public.hotelx_transport_meta (id, schema_version, revision)
    VALUES (p_property_id, 2, GREATEST(COALESCE(p_revision, 1), 1))
    ON CONFLICT (id) DO NOTHING
    RETURNING revision INTO v_revision;

    IF v_revision IS NULL THEN
      RETURN NULL;
    END IF;

    PERFORM public.hotelx_transport_replace_rows(p_property_id, p_state);
    RETURN v_revision;
  END;
  $$`,
  `CREATE OR REPLACE FUNCTION public.hotelx_transport_save(
    p_property_id text,
    p_expected_revision integer,
    p_state jsonb
  ) RETURNS integer
  LANGUAGE plpgsql
  AS $$
  DECLARE
    v_revision integer;
  BEGIN
    UPDATE public.hotelx_transport_meta
    SET revision = revision + 1,
        schema_version = 2,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_property_id
      AND revision = p_expected_revision
    RETURNING revision INTO v_revision;

    IF v_revision IS NULL THEN
      RETURN NULL;
    END IF;

    PERFORM public.hotelx_transport_replace_rows(p_property_id, p_state);
    RETURN v_revision;
  END;
  $$`,
  `CREATE OR REPLACE FUNCTION public.hotelx_transport_read(p_property_id text)
  RETURNS TABLE(revision integer, state jsonb)
  LANGUAGE sql
  STABLE
  AS $$
  SELECT
    meta.revision,
    jsonb_build_object(
      'hotelMasters', jsonb_build_object(
        'locations', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'code', location.code,
            'description', location.description,
            'floorPlanAttachment', location.floor_plan_attachment,
            'active', location.active
          ) ORDER BY location.sort_order)
          FROM public.hotelx_location_master AS location
          WHERE location.property_id = meta.id
        ), '[]'::jsonb),
        'roomTypes', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'code', room_type.code,
            'description', room_type.description,
            'propertyType', room_type.property_type,
            'measureType', room_type.measure_type,
            'roomSize', room_type.room_size,
            'maxGuest', room_type.max_guest,
            'houseLimit', room_type.house_limit,
            'housekeepingPoints', room_type.housekeeping_points,
            'totalRoom', room_type.total_room,
            'active', room_type.active
          ) ORDER BY room_type.sort_order)
          FROM public.hotelx_room_type_master AS room_type
          WHERE room_type.property_id = meta.id
        ), '[]'::jsonb),
        'rooms', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'roomNo', room.room_no,
            'roomTypeCode', room.room_type_code,
            'description', room.description,
            'locationCode', room.location_code,
            'maxGuest', room.max_guest,
            'roomSize', room.room_size,
            'displaySequence', room.display_sequence,
            'keycardRoomMapping', room.keycard_room_mapping,
            'active', room.active
          ) ORDER BY room.sort_order)
          FROM public.hotelx_room_master AS room
          WHERE room.property_id = meta.id
        ), '[]'::jsonb),
        'roomStatuses', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'code', status.status_code,
            'description', status.status_name,
            'color', status.status_color,
            'active', status.active
          ) ORDER BY status.sort_order)
          FROM public.hotelx_roomstatus AS status
          WHERE status.property_id = meta.id
        ), '[]'::jsonb),
        'departments', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'id', department.department_id,
            'name', department.department_name,
            'incidentalCharges', department.incidental_charges,
            'reasons', department.reasons,
            'salesChannels', department.sales_channels
          ) ORDER BY department.sort_order)
          FROM public.hotelx_department AS department
          WHERE department.property_id = meta.id
        ), '[]'::jsonb)
      ),
      'bookings', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'reference', booking.reference,
          'guest', booking.guest,
          'arrival', booking.arrival_date,
          'departure', booking.departure_date,
          'status', booking.status,
          'rooms', COALESCE((
            SELECT jsonb_agg(jsonb_build_object(
              'code', br.room_type_code, 'count', br.room_count, 'adults', br.adults, 'children', br.children, 'infants', br.infants,
              'rateCode', br.rate_code, 'roomRate', br.room_rate::double precision, 'promoCode', br.promo_code,
              'discountPerNight', br.discount_per_night::double precision, 'subtotal', br.subtotal::double precision,
              'discount', br.discount::double precision, 'tax', br.tax::double precision, 'total', br.total::double precision
            ) ORDER BY br.sort_order)
            FROM public.hotelx_booking_rooms AS br
            WHERE br.property_id = booking.property_id AND br.booking_reference = booking.reference
          ), '[]'::jsonb),
          'assignedRooms', booking.assigned_rooms,
          'checkedInGuests', booking.checked_in_guests,
          'guests', booking.guests,
          'amount', booking.amount::double precision,
          'highlightDates', booking.highlight_dates,
          'groupName', booking.group_name, 'phone', booking.phone, 'accountName', booking.account_name,
          'creditLimit', booking.credit_limit::double precision, 'printRate', booking.print_rate, 'stateTax', booking.state_tax,
          'tourismTax', booking.tourism_tax, 'email', booking.email, 'salesChannel', booking.sales_channel,
          'source', booking.source, 'segment', booking.segment, 'referenceNo', booking.reference_no
        ) ORDER BY booking.sort_order)
        FROM public.hotelx_bookings AS booking
        WHERE booking.property_id = meta.id
      ), '[]'::jsonb),
      'rateSetup', jsonb_build_object(
        'seasons', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', s.id, 'name', s.name, 'color', s.color, 'active', s.active) ORDER BY s.sort_order) FROM public.hotelx_season_master s WHERE s.property_id = meta.id), '[]'::jsonb),
        'calendar', COALESCE((SELECT jsonb_object_agg(to_char(c.calendar_date, 'YYYY-MM-DD'), c.season_id) FROM public.hotelx_season_calendar c WHERE c.property_id = meta.id), '{}'::jsonb),
        'elements', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', e.id, 'name', e.name, 'basis', e.basis, 'min', e.min_qty, 'max', e.max_qty, 'amount', e.amount::double precision, 'active', e.active) ORDER BY e.sort_order) FROM public.hotelx_rate_element e WHERE e.property_id = meta.id), '[]'::jsonb),
        'rateTypes', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', t.id, 'name', t.name, 'active', t.active) ORDER BY t.sort_order) FROM public.hotelx_rate_type t WHERE t.property_id = meta.id), '[]'::jsonb),
        'ratePlans', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', r.id, 'code', r.code, 'description', r.description, 'updated', COALESCE(to_char(r.last_updated_on, 'DD Mon YYYY'), ''), 'active', r.active, 'web', r.web) ORDER BY r.sort_order) FROM public.hotelx_rate_setup r WHERE r.property_id = meta.id), '[]'::jsonb),
        'validity', COALESCE((SELECT jsonb_agg(jsonb_build_object('id', v.id, 'rateSetupId', v.rate_setup_id, 'from', to_char(v.valid_from, 'YYYY-MM-DD'), 'to', to_char(v.valid_to, 'YYYY-MM-DD'), 'active', v.active) ORDER BY v.sort_order) FROM public.hotelx_rate_setup_validity v WHERE v.property_id = meta.id), '[]'::jsonb)
      ),
      'setup', jsonb_build_object(
        'operators', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', op.id,
              'name', op.name,
              'contact', op.contact,
              'phone', op.phone,
              'email', op.email,
              'active', op.active
            ) ORDER BY op.sort_order
          )
          FROM public.hotelx_transport_operators AS op
          WHERE op.property_id = meta.id
        ), '[]'::jsonb),
        'boats', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', service.id,
              'name', service.name,
              'operatorId', service.operator_id,
              'capacity', service.capacity,
              'status', service.status,
              'serviceType', service.service_type,
              'bookingMode', service.booking_mode
            ) ORDER BY service.sort_order
          )
          FROM public.hotelx_transport_services AS service
          WHERE service.property_id = meta.id
        ), '[]'::jsonb),
        'routes', COALESCE((
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', route.id,
              'origin', route.origin,
              'destination', route.destination,
              'meetingPoint', route.meeting_point,
              'durationMinutes', route.duration_minutes,
              'operatorId', route.operator_id,
              'toHotel', route.to_hotel,
              'active', route.active
            ) ORDER BY route.sort_order
          )
          FROM public.hotelx_transport_routes AS route
          WHERE route.property_id = meta.id
        ), '[]'::jsonb),
        'rules', COALESCE((
          SELECT jsonb_build_object(
            'start', rules.start_time,
            'end', rules.end_time,
            'turnaroundMinutes', rules.turnaround_minutes,
            'boardingLeadMinutes', rules.boarding_lead_minutes,
            'notes', rules.notes
          )
          FROM public.hotelx_transport_rules AS rules
          WHERE rules.property_id = meta.id
        ), '{}'::jsonb)
      ),
      'trips', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', trip.id,
            'date', trip.trip_date,
            'time', trip.trip_time,
            'direction', trip.direction,
            'origin', trip.origin,
            'destination', trip.destination,
            'meetingPoint', trip.meeting_point,
            'durationMinutes', trip.duration_minutes,
            'boardingLeadMinutes', trip.boarding_lead_minutes,
            'turnaroundMinutes', trip.turnaround_minutes,
            'operatingNotes', trip.operating_notes,
            'toHotel', trip.to_hotel,
            'boatId', trip.service_id,
            'boat', trip.service_name,
            'operator', trip.operator_name,
            'capacity', trip.capacity,
            'status', trip.status,
            'groups', COALESCE((
              SELECT jsonb_agg(
                jsonb_strip_nulls(jsonb_build_object(
                  'id', group_row.id,
                  'bookingId', group_row.booking_id,
                  'reference', group_row.reference,
                  'name', group_row.name,
                'adults', group_row.adults,
                'children', group_row.children,
                'infants', group_row.infants,
                  'boarded', group_row.boarded
                )) ORDER BY group_row.sort_order
              )
              FROM public.hotelx_transport_trip_groups AS group_row
              WHERE group_row.property_id = trip.property_id
                AND group_row.trip_id = trip.id
            ), '[]'::jsonb)
          ) ORDER BY trip.sort_order
        )
        FROM public.hotelx_transport_trips AS trip
        WHERE trip.property_id = meta.id
      ), '[]'::jsonb),
      'templates', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', template.id,
            'name', template.name,
            'routeId', template.route_id,
            'boatId', template.service_id,
            'startDate', template.start_date,
            'endDate', template.end_date,
            'weekdays', to_jsonb(template.weekdays),
            'times', to_jsonb(template.departure_times),
            'excludedDates', to_jsonb(template.excluded_dates)
          ) ORDER BY template.sort_order
        )
        FROM public.hotelx_transport_templates AS template
        WHERE template.property_id = meta.id
      ), '[]'::jsonb),
      'dayNotes', COALESCE((
        SELECT jsonb_object_agg(
          note.date_key,
          jsonb_build_object(
            'tide', note.tide,
            'restricted', note.restricted,
            'holiday', note.holiday,
            'notes', note.notes
          )
        )
        FROM public.hotelx_transport_day_notes AS note
        WHERE note.property_id = meta.id
      ), '{}'::jsonb),
      'bookingLegs', COALESCE((
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', leg.id,
            'bookingReference', leg.booking_reference,
            'direction', leg.direction,
            'serviceId', leg.service_id,
            'serviceName', leg.service_name,
            'serviceType', leg.service_type,
            'bookingMode', leg.booking_mode,
            'operatorId', leg.operator_id,
            'operatorName', leg.operator_name,
            'date', leg.travel_date,
            'time', leg.travel_time,
            'pickup', leg.pickup,
            'dropoff', leg.dropoff,
            'passengers', leg.passengers,
            'flightNo', leg.flight_no,
            'vehicle', leg.vehicle,
            'driver', leg.driver,
            'remarks', leg.remarks,
            'tripId', leg.trip_id
          ) ORDER BY leg.sort_order
        )
        FROM public.hotelx_transport_booking_legs AS leg
        WHERE leg.property_id = meta.id
      ), '[]'::jsonb)
    )
  FROM public.hotelx_transport_meta AS meta
  WHERE meta.id = p_property_id;
  $$`
];
var readSql = "/* normalized-read */ SELECT revision::text, state::text FROM public.hotelx_transport_read($1)";
var legacyExistsSql = "/* normalized-legacy-exists */ SELECT COALESCE(to_regclass('public.hotelx_transport_state')::text, '')";
var legacyReadSql = "/* normalized-legacy-read */ SELECT revision::text, state::text FROM public.hotelx_transport_state WHERE id = $1";
var initializeSql = "/* normalized-initialize */ SELECT public.hotelx_transport_initialize($1, $2::integer, $3::jsonb)::text";
var bookingExtrasReadSql = `/* normalized-booking-extras-read */
SELECT
  booking.reference,
  booking.group_name,
  booking.phone,
  booking.account_name,
  booking.credit_limit::text,
  booking.print_rate::text,
  booking.state_tax::text,
  booking.tourism_tax::text,
  booking.email,
  booking.sales_channel,
  booking.source,
  booking.segment,
  booking.reference_no,
  COALESCE(room.room_type_code, ''),
  COALESCE(room.adults, 1)::text,
  COALESCE(room.children, 0)::text,
  COALESCE(room.infants, 0)::text,
  COALESCE(room.rate_code, 'BAR'),
  COALESCE(room.room_rate, 0)::text,
  COALESCE(room.promo_code, ''),
  COALESCE(room.discount_per_night, 0)::text,
  COALESCE(room.subtotal, 0)::text,
  COALESCE(room.discount, 0)::text,
  COALESCE(room.tax, 0)::text,
  COALESCE(room.total, 0)::text
FROM public.hotelx_bookings AS booking
LEFT JOIN public.hotelx_booking_rooms AS room
  ON room.property_id = booking.property_id
 AND room.booking_reference = booking.reference
WHERE booking.property_id = $1
ORDER BY booking.sort_order, room.sort_order`;
var saveSql = "/* normalized-save */ SELECT public.hotelx_transport_save($1, $2::integer, $3::jsonb)::text";
function createNormalizedTransportStorage(query) {
  let ready = null;
  const ensure = async (connection) => {
    if (!ready) {
      const statements = schemaStatements;
      ready = query(
        connection,
        `DO $hotelx_schema$ BEGIN
          PERFORM pg_advisory_xact_lock(hashtext('hotelx-transport-schema'));
          ${statements.join(";\n")};
        END; $hotelx_schema$`,
        []
      ).then(() => {
      }).catch((error) => {
        ready = null;
        throw error;
      });
    }
    await ready;
  };
  const read = async (connection, id) => {
    await ensure(connection);
    const rows = await query(connection, readSql, [id]);
    const row = rows[0] ?? null;
    if (!row) return null;
    const extras = await query(connection, bookingExtrasReadSql, [id]);
    if (!extras.length) return row;
    const state = JSON.parse(row[1]);
    const bookings = new Map(state.bookings.map((booking) => [booking.reference, booking]));
    const numeric = (value) => {
      const parsed = Number(value ?? "0");
      return Number.isFinite(parsed) ? parsed : 0;
    };
    for (const values of extras) {
      const booking = bookings.get(values[0]);
      if (!booking) continue;
      booking.groupName = values[1] ?? "";
      booking.phone = values[2] ?? "";
      booking.accountName = values[3] ?? "";
      booking.creditLimit = numeric(values[4]);
      booking.printRate = values[5] === "true";
      booking.stateTax = values[6] === "true";
      booking.tourismTax = values[7] === "true";
      booking.email = values[8] ?? "";
      booking.salesChannel = values[9] ?? "Direct";
      booking.source = values[10] ?? "Booking";
      booking.segment = values[11] ?? "Leisure";
      booking.referenceNo = values[12] ?? "";
      const roomCode = values[13];
      if (!roomCode) continue;
      const room = booking.rooms.find((item) => item.code === roomCode);
      if (!room) continue;
      room.adults = numeric(values[14]);
      room.children = numeric(values[15]);
      room.infants = numeric(values[16]);
      room.rateCode = values[17] ?? "BAR";
      room.roomRate = numeric(values[18]);
      room.promoCode = values[19] ?? "";
      room.discountPerNight = numeric(values[20]);
      room.subtotal = numeric(values[21]);
      room.discount = numeric(values[22]);
      room.tax = numeric(values[23]);
      room.total = numeric(values[24]);
    }
    return [row[0], JSON.stringify(state)];
  };
  const readLegacy = async (connection, id) => {
    const exists = await query(connection, legacyExistsSql, []);
    if (!exists[0]?.[0]) return null;
    const rows = await query(connection, legacyReadSql, [id]);
    return rows[0] ?? null;
  };
  return {
    read,
    async readOrInitialize(connection, id, seed) {
      const current = await read(connection, id);
      if (current) {
        const raw = JSON.parse(current[1]);
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const rateTypes = raw.rateSetup?.rateTypes;
        const rateTypesNeedMigration = Array.isArray(rateTypes) && rateTypes.some((item) => !uuidPattern.test(String(item.id)) || String(item.id).toLowerCase().startsWith("a1000000-0000-4000-8000-"));
        if (rateTypesNeedMigration && raw.rateSetup) {
          raw.rateSetup = { ...raw.rateSetup, rateTypes: rateTypes.map((item) => ({ ...item, id: uuidPattern.test(String(item.id)) && !String(item.id).toLowerCase().startsWith("a1000000-0000-4000-8000-") ? item.id : crypto.randomUUID() })) };
        }
        const hasMasters = Boolean(
          raw.hotelMasters && Array.isArray(raw.hotelMasters.locations) && Array.isArray(raw.hotelMasters.roomTypes) && raw.hotelMasters.roomTypes.length && Array.isArray(raw.hotelMasters.rooms) && raw.hotelMasters.rooms.length
        );
        const hasBookings = Array.isArray(raw.bookings) && raw.bookings.length > 0;
        const hasRateSetup = Boolean(raw.rateSetup && Array.isArray(raw.rateSetup.seasons) && raw.rateSetup.seasons.length && Array.isArray(raw.rateSetup.elements) && raw.rateSetup.elements.length && Array.isArray(raw.rateSetup.rateTypes) && raw.rateSetup.rateTypes.length && Array.isArray(raw.rateSetup.ratePlans) && raw.rateSetup.ratePlans.length && Array.isArray(raw.rateSetup.validity));
        const hasRoomStatuses = Boolean(raw.hotelMasters && Array.isArray(raw.hotelMasters.roomStatuses) && raw.hotelMasters.roomStatuses.length);
        const hasDepartments = Boolean(raw.hotelMasters && Array.isArray(raw.hotelMasters.departments) && raw.hotelMasters.departments.length);
        if (!hasMasters || !hasBookings || !hasRateSetup || !hasRoomStatuses || !hasDepartments || rateTypesNeedMigration) {
          const merged = {
            ...seed,
            ...raw,
            hotelMasters: hasMasters ? { ...raw.hotelMasters, roomStatuses: hasRoomStatuses ? raw.hotelMasters.roomStatuses : seed.hotelMasters.roomStatuses, departments: hasDepartments ? raw.hotelMasters.departments : seed.hotelMasters.departments } : seed.hotelMasters,
            bookings: hasBookings ? raw.bookings : seed.bookings,
            rateSetup: hasRateSetup ? raw.rateSetup : seed.rateSetup
          };
          const upgraded = await query(connection, saveSql, [id, current[0], JSON.stringify(merged)]);
          const revision2 = Number(upgraded[0]?.[0]);
          if (Number.isSafeInteger(revision2) && revision2 >= 1)
            return [String(revision2), JSON.stringify(merged)];
        }
        return current;
      }
      const legacy = await readLegacy(connection, id);
      const revision = legacy?.[0] ?? "1";
      const state = legacy?.[1] ?? JSON.stringify(seed);
      await query(connection, initializeSql, [id, revision, state]);
      const initialized = await read(connection, id);
      if (!initialized)
        throw new ApiError(
          "STORAGE_INIT",
          "Could not initialize normalized transport storage. Try again.",
          503
        );
      return initialized;
    },
    async save(connection, id, expectedRevision, state) {
      await ensure(connection);
      const rows = await query(connection, saveSql, [
        id,
        String(expectedRevision),
        JSON.stringify(state)
      ]);
      const revision = Number(rows[0]?.[0]);
      return Number.isSafeInteger(revision) && revision >= 1 ? revision : null;
    }
  };
}

// worker/private-link-config.ts
var privateLinkSha256 = "15c8d4269b890c552d66d9c3360b6567a4b419ef471d4477a79e37c9696e8b5b";

// lib/private-link.ts
var privateKeyPattern = /^hx_link_v1_[A-Za-z0-9_-]{43}$/;

// worker/index.ts
function passwordStatus(password) {
  if (!password) return "missing";
  if (password.length < 16) return "too_short";
  if (password.length > 256) return "too_long";
  return "ready";
}
var encoder = new TextEncoder();
var allowedOrigins = /* @__PURE__ */ new Set([
  "https://edwardd767.github.io",
  "http://localhost:3000"
]);
var expirySeconds = 12 * 60 * 60;
var recordId = "hotel-paradise";
var rate = /* @__PURE__ */ new Map();
async function key(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}
async function matches(provided, secret) {
  const k = await key(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    k,
    encoder.encode("password:" + provided)
  );
  return crypto.subtle.verify(
    "HMAC",
    k,
    signature,
    encoder.encode("password:" + secret)
  );
}
async function session(secret) {
  const payload = `v1.${Math.floor(Date.now() / 1e3) + expirySeconds}.${crypto.randomUUID()}`;
  const signature = await crypto.subtle.sign(
    "HMAC",
    await key(secret),
    encoder.encode(payload)
  );
  const hex = Array.from(
    new Uint8Array(signature),
    (b) => b.toString(16).padStart(2, "0")
  ).join("");
  return payload + "." + hex;
}
async function authenticated(request, secret) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  if (!/^v1\.\d{10}\.[0-9a-f-]{36}\.[0-9a-f]{64}$/.test(token)) return false;
  const parts = token.split(".");
  const now = Math.floor(Date.now() / 1e3);
  if (Number(parts[1]) <= now || Number(parts[1]) > now + expirySeconds + 30)
    return false;
  const signature = Uint8Array.from(
    parts[3].match(/../g),
    (value) => parseInt(value, 16)
  );
  return crypto.subtle.verify(
    "HMAC",
    await key(secret),
    signature,
    encoder.encode(parts.slice(0, 3).join("."))
  );
}
async function privateAccess(request, verifier) {
  const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
  if (!privateKeyPattern.test(token) || !/^[a-f0-9]{64}$/.test(verifier))
    return false;
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(token));
  const hash = Array.from(
    new Uint8Array(digest),
    (byte) => byte.toString(16).padStart(2, "0")
  ).join("");
  return hash === verifier;
}
async function jsonBody(request, limit) {
  if (!request.headers.get("Content-Type")?.toLowerCase().startsWith("application/json"))
    throw new ApiError("CONTENT_TYPE", "Send JSON form data.", 415);
  if (Number(request.headers.get("Content-Length")) > limit)
    throw new ApiError("BODY_SIZE", "The submitted form is too large.", 413);
  const reader = request.body?.getReader();
  if (!reader)
    throw new ApiError("INVALID_FORM", "No form data was supplied.", 400);
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) {
        await reader.cancel();
        throw new ApiError(
          "BODY_SIZE",
          "The submitted form is too large.",
          413
        );
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.length;
    }
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error();
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("INVALID_FORM", "The submitted form is invalid.", 400);
  } finally {
    reader.releaseLock();
  }
}
function decode(row) {
  const revision = Number(row[0]);
  const state = JSON.parse(row[1]);
  if (!Number.isSafeInteger(revision) || revision < 1 || !state.setup || !Array.isArray(state.trips) || !Array.isArray(state.templates) || !state.dayNotes)
    throw new ApiError(
      "STORAGE_FORMAT",
      "The saved data needs administrator attention.",
      503
    );
  return { revision, state: normalizeTransportState(state) };
}
function createWorker(query = queryNeon, verifier = privateLinkSha256) {
  const storage = createNormalizedTransportStorage(query);
  return {
    async fetch(request, env) {
      const origin = request.headers.get("Origin");
      const cors = {
        "Cache-Control": "no-store",
        Vary: "Origin"
      };
      if (origin && allowedOrigins.has(origin)) {
        cors["Access-Control-Allow-Origin"] = origin;
        cors["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
        cors["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS";
      }
      const reply = (body, status = 200) => Response.json(body, { status, headers: cors });
      try {
        if (origin && !allowedOrigins.has(origin))
          throw new ApiError(
            "ORIGIN",
            "This website is not allowed to use this API.",
            403
          );
        if (request.method === "OPTIONS")
          return new Response(null, { status: 204, headers: cors });
        const path = new URL(request.url).pathname;
        if (request.method === "GET" && (path === "/health" || path === "/")) {
          return reply({
            apiVersion: 4,
            diagnosticsVersion: 4,
            service: "HotelX Transport API",
            status: "ready",
            storageConfigured: Boolean(env.DATABASE_URL),
            storageModel: "normalized-tables",
            storageSchemaVersion: 2,
            hotelMasterSchemaVersion: 1,
            rateSetupSchemaVersion: 1,
            privateLinkConfigured: /^[a-f0-9]{64}$/.test(verifier),
            signInConfigured: passwordStatus(env.TRANSPORT_PASSWORD) === "ready",
            signInStatus: passwordStatus(env.TRANSPORT_PASSWORD)
          });
        }
        if (!["/session", "/state", "/action"].includes(path))
          throw new ApiError("NOT_FOUND", "Not found.", 404);
        if (!env.DATABASE_URL)
          throw new ApiError(
            "DATABASE_CONFIGURATION",
            "Save the DATABASE_URL Worker secret first.",
            503
          );
        const secret = env.TRANSPORT_PASSWORD;
        const hasPrivateAccess = await privateAccess(request, verifier);
        if (path === "/session" && request.method === "POST") {
          if (!secret || passwordStatus(secret) !== "ready")
            throw new ApiError(
              "SIGN_IN_CONFIGURATION",
              "Password access is not configured.",
              503
            );
          const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
          const now = Date.now();
          const previous = rate.get(ip);
          const bucket = previous && previous.until > now ? previous : { until: now + 6e4, attempts: 0 };
          if (bucket.attempts >= 10)
            throw new ApiError(
              "SIGN_IN_LIMIT",
              "Too many sign-in attempts. Try again in a minute.",
              429
            );
          bucket.attempts++;
          rate.set(ip, bucket);
          if (rate.size > 4096) rate.delete(rate.keys().next().value);
          const body = await jsonBody(request, 4096);
          if (typeof body.password !== "string" || body.password.length > 256 || !await matches(body.password, secret))
            throw new ApiError(
              "SIGN_IN_FAILED",
              "The prototype password is incorrect.",
              401
            );
          return reply({
            token: await session(secret),
            expiresIn: expirySeconds
          });
        }
        if (!hasPrivateAccess && !(secret && await authenticated(request, secret)))
          throw new ApiError(
            "SIGN_IN_REQUIRED",
            "Open your private access link to use the shared transport data.",
            401
          );
        const connection = env.DATABASE_URL.trim();
        if (path === "/state" && request.method === "GET") {
          const row = await storage.readOrInitialize(
            connection,
            recordId,
            newTransportState()
          );
          return reply(decode(row));
        }
        if (path === "/action" && request.method === "POST") {
          const body = await jsonBody(request, 256 * 1024);
          if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1)
            throw new ApiError(
              "REVISION",
              "Reload saved data before saving.",
              400
            );
          const row = await storage.read(connection, recordId);
          if (!row)
            throw new ApiError(
              "RELOAD_REQUIRED",
              "Reload saved data before saving.",
              409
            );
          const current = decode(row);
          if (current.revision !== body.revision)
            throw new ApiError(
              "CONFLICT",
              "Someone else saved changes. Reload saved data, review your form, then save again.",
              409
            );
          let state;
          try {
            state = applyTransportAction(current.state, body.action);
          } catch (error) {
            throw new ApiError("VALIDATION", error.message, 400);
          }
          const encoded = JSON.stringify(state);
          if (encoder.encode(encoded).byteLength > 16 * 1024 * 1024)
            throw new ApiError(
              "STORAGE_SIZE",
              "The prototype data has reached its size limit.",
              413
            );
          const savedRevision = await storage.save(
            connection,
            recordId,
            current.revision,
            state
          );
          if (!savedRevision)
            throw new ApiError(
              "CONFLICT",
              "Someone else saved changes. Reload saved data, review your form, then save again.",
              409
            );
          return reply({ revision: savedRevision, state });
        }
        throw new ApiError("METHOD", "This method is not supported.", 405);
      } catch (error) {
        if (error instanceof ApiError)
          return reply(
            { code: error.code, error: error.message },
            error.status
          );
        return reply(
          {
            code: "SERVER_ERROR",
            error: "The request could not finish. Reload saved data before retrying a change."
          },
          500
        );
      }
    }
  };
}
var index_default = createWorker();
export {
  createWorker,
  index_default as default
};
