'use client';

import { useMemo, useState } from 'react';
import {
  CalendarDays,
  Car,
  Download,
  FileText,
  Printer,
  Search,
  Ship,
  Users,
  X,
} from 'lucide-react';
import { Choice } from '@/components/hotel-choice';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { sampleBookings } from '@/lib/bookings';
import type { BookingTransportLeg } from '@/lib/booking-transport';
import type { TransportSetup, Trip } from '@/lib/transport';

export type TransportListingReportProps = {
  trips: Trip[];
  setup: TransportSetup;
  bookingLegs: BookingTransportLeg[];
};

type ReportRow = {
  id: string;
  date: string;
  time: string;
  bookingReference: string;
  guest: string;
  direction: 'Arrival' | 'Departure';
  serviceType: string;
  mode: 'Scheduled' | 'On-demand';
  service: string;
  pickup: string;
  dropoff: string;
  passengers: number;
  operator: string;
  flightReference: string;
  vehicleDriver: string;
  status: string;
  remarks: string;
};

function csvCell(value: unknown) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text.trimStart())) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

function reportDate(value: string) {
  if (!value) return '—';
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function statusClass(status: string) {
  if (status === 'Cancelled') return 'cancelled';
  if (status === 'Completed') return 'completed';
  if (status === 'Delayed') return 'full';
  if (status === 'Boarding') return 'boarding';
  return 'scheduled';
}

export function TransportListingReport({
  trips,
  setup,
  bookingLegs,
}: TransportListingReportProps) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [direction, setDirection] = useState('all');
  const [serviceType, setServiceType] = useState('all');
  const [mode, setMode] = useState('all');
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');

  const rows = useMemo<ReportRow[]>(() => {
    const result: ReportRow[] = [];
    const represented = new Set(
      bookingLegs
        .filter((leg) => leg.tripId)
        .map((leg) => `${leg.bookingReference}|${leg.tripId}`),
    );

    for (const leg of bookingLegs) {
      const booking = sampleBookings.find(
        (item) => item.reference === leg.bookingReference,
      );
      const trip = leg.tripId
        ? trips.find((item) => item.id === leg.tripId)
        : undefined;
      result.push({
        id: `leg-${leg.id}`,
        date: leg.date,
        time: leg.time,
        bookingReference: leg.bookingReference,
        guest: booking?.guest ?? '—',
        direction: leg.direction === 'arrival' ? 'Arrival' : 'Departure',
        serviceType: leg.serviceType,
        mode: leg.bookingMode === 'Scheduled' ? 'Scheduled' : 'On-demand',
        service: leg.serviceName,
        pickup: leg.pickup,
        dropoff: leg.dropoff,
        passengers: leg.passengers,
        operator: leg.operatorName,
        flightReference: leg.flightNo || '—',
        vehicleDriver: [leg.vehicle, leg.driver].filter(Boolean).join(' · ') || '—',
        status: trip?.status ?? 'Confirmed',
        remarks: leg.remarks,
      });
    }

    for (const trip of trips) {
      const service = setup.boats.find((item) => item.id === trip.boatId);
      for (const group of trip.groups) {
        const reference = group.bookingId ?? group.reference;
        if (group.bookingId && represented.has(`${group.bookingId}|${trip.id}`)) {
          continue;
        }
        const booking = sampleBookings.find(
          (item) => item.reference === group.bookingId,
        );
        result.push({
          id: `trip-${trip.id}-${group.id}`,
          date: trip.date,
          time: trip.time,
          bookingReference: reference,
          guest: booking?.guest ?? group.name,
          direction: trip.toHotel ? 'Arrival' : 'Departure',
          serviceType: service?.serviceType ?? 'Speedboat',
          mode: 'Scheduled',
          service: trip.boat,
          pickup: trip.origin,
          dropoff: trip.destination,
          passengers: group.adults + group.children,
          operator: trip.operator,
          flightReference: '—',
          vehicleDriver: '—',
          status: trip.status,
          remarks: '',
        });
      }
    }

    return result.sort((a, b) =>
      `${a.date}-${a.time}-${a.bookingReference}`.localeCompare(
        `${b.date}-${b.time}-${b.bookingReference}`,
      ),
    );
  }, [bookingLegs, setup.boats, trips]);

  const serviceTypes = useMemo(
    () => Array.from(new Set(rows.map((row) => row.serviceType))).sort(),
    [rows],
  );
  const statuses = useMemo(
    () => Array.from(new Set(rows.map((row) => row.status))).sort(),
    [rows],
  );

  const shown = rows.filter((row) => {
    const needle = query.trim().toLowerCase();
    return (
      (!fromDate || row.date >= fromDate) &&
      (!toDate || row.date <= toDate) &&
      (direction === 'all' || row.direction === direction) &&
      (serviceType === 'all' || row.serviceType === serviceType) &&
      (mode === 'all' || row.mode === mode) &&
      (status === 'all' || row.status === status) &&
      (!needle ||
        `${row.bookingReference} ${row.guest} ${row.serviceType} ${row.service} ${row.pickup} ${row.dropoff} ${row.operator} ${row.flightReference} ${row.vehicleDriver}`
          .toLowerCase()
          .includes(needle))
    );
  });

  const scheduled = shown.filter((row) => row.mode === 'Scheduled').length;
  const onDemand = shown.length - scheduled;
  const passengers = shown.reduce((total, row) => total + row.passengers, 0);
  const hasFilters = Boolean(
    fromDate ||
      toDate ||
      query ||
      direction !== 'all' ||
      serviceType !== 'all' ||
      mode !== 'all' ||
      status !== 'all',
  );

  function resetFilters() {
    setFromDate('');
    setToDate('');
    setDirection('all');
    setServiceType('all');
    setMode('all');
    setStatus('all');
    setQuery('');
  }

  function exportCsv() {
    const headers = [
      'Travel Date',
      'Time',
      'Booking / Reference',
      'Guest Name',
      'Direction',
      'Service Type',
      'Booking Method',
      'Service',
      'Pickup',
      'Drop-off',
      'Pax',
      'Operator',
      'Flight / Reference',
      'Vehicle / Driver',
      'Status',
      'Remarks',
    ];
    const data = shown.map((row) => [
      row.date,
      row.time,
      row.bookingReference,
      row.guest,
      row.direction,
      row.serviceType,
      row.mode,
      row.service,
      row.pickup,
      row.dropoff,
      row.passengers,
      row.operator,
      row.flightReference === '—' ? '' : row.flightReference,
      row.vehicleDriver === '—' ? '' : row.vehicleDriver,
      row.status,
      row.remarks,
    ]);
    const blob = new Blob(
      ['\uFEFF' + [headers, ...data].map((row) => row.map(csvCell).join(',')).join('\r\n')],
      { type: 'text/csv;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `transport-listing-${fromDate || 'all'}-${toDate || 'all'}.csv`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <section className="transport-report" aria-label="Transport Listing report">
      <div className="listing-title transport-report-title">
        <div>
          <FileText size={21} />
          <h1>
            Transport Listing <span>({shown.length})</span>
          </h1>
          <span className="context-tag">Digital Reporting</span>
        </div>
        <div className="transport-report-actions">
          <button className="secondary-button" onClick={exportCsv} disabled={!shown.length}>
            <Download size={16} /> Export CSV
          </button>
          <button className="secondary-button" onClick={() => window.print()}>
            <Printer size={16} /> Print
          </button>
        </div>
      </div>

      <div className="day-summary transport-report-summary">
        <div>
          <span className="summary-icon"><FileText size={18} /></span>
          <span><small>Records</small><strong>{shown.length}</strong></span>
        </div>
        <div>
          <span className="summary-icon blue"><Ship size={18} /></span>
          <span><small>Scheduled</small><strong>{scheduled}</strong></span>
        </div>
        <div>
          <span className="summary-icon green"><Car size={18} /></span>
          <span><small>On-demand</small><strong>{onDemand}</strong></span>
        </div>
        <div>
          <span className="summary-icon"><Users size={18} /></span>
          <span><small>Total passengers</small><strong>{passengers}</strong></span>
        </div>
      </div>

      <div className="transport-report-filters">
        <label className="search-field transport-report-search">
          <Search size={17} />
          <input
            aria-label="Search transport listing"
            placeholder="Booking, guest, service, pickup, operator…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="transport-report-date">
          <CalendarDays size={15} /> From
          <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
        </label>
        <label className="transport-report-date">
          <CalendarDays size={15} /> To
          <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
        </label>
        <Choice
          label="Direction"
          value={direction}
          onChange={setDirection}
          items={[
            { value: 'all', label: 'All directions' },
            { value: 'Arrival', label: 'Arrival' },
            { value: 'Departure', label: 'Departure' },
          ]}
        />
        <Choice
          label="Service type"
          value={serviceType}
          onChange={setServiceType}
          items={[
            { value: 'all', label: 'All service types' },
            ...serviceTypes.map((value) => ({ value, label: value })),
          ]}
        />
        <Choice
          label="Booking method"
          value={mode}
          onChange={setMode}
          items={[
            { value: 'all', label: 'All booking methods' },
            { value: 'Scheduled', label: 'Scheduled' },
            { value: 'On-demand', label: 'On-demand' },
          ]}
        />
        <Choice
          label="Transport status"
          value={status}
          onChange={setStatus}
          items={[
            { value: 'all', label: 'All statuses' },
            ...statuses.map((value) => ({ value, label: value })),
          ]}
        />
        {hasFilters && (
          <button className="secondary-button" onClick={resetFilters}>
            <X size={15} /> Clear
          </button>
        )}
      </div>

      <div className="transport-report-table-wrap">
        <Table className="setup-table transport-report-table">
          <TableHeader>
            <TableRow>
              <TableHead>No.</TableHead>
              <TableHead>Travel Date</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Booking / Ref</TableHead>
              <TableHead>Guest Name</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Service Type</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Pickup → Drop-off</TableHead>
              <TableHead>Pax</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Flight / Ref</TableHead>
              <TableHead>Vehicle / Driver</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.map((row, index) => (
              <TableRow key={row.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{reportDate(row.date)}</TableCell>
                <TableCell>{row.time || '—'}</TableCell>
                <TableCell><strong>{row.bookingReference}</strong></TableCell>
                <TableCell>{row.guest}</TableCell>
                <TableCell>{row.direction}</TableCell>
                <TableCell>
                  <span className="transport-report-service">
                    {row.serviceType === 'Speedboat' ? <Ship size={14} /> : <Car size={14} />}
                    {row.serviceType}
                    <small>{row.mode}</small>
                  </span>
                </TableCell>
                <TableCell>{row.service}</TableCell>
                <TableCell>
                  <span className="transport-report-route">
                    <strong>{row.pickup}</strong>
                    <small>→ {row.dropoff}</small>
                  </span>
                </TableCell>
                <TableCell>{row.passengers}</TableCell>
                <TableCell>{row.operator}</TableCell>
                <TableCell>{row.flightReference}</TableCell>
                <TableCell>{row.vehicleDriver}</TableCell>
                <TableCell>
                  <span className={`status-pill ${statusClass(row.status)}`}>{row.status}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!shown.length && (
          <div className="empty-state transport-report-empty">
            <FileText size={32} />
            <h3>No transport records found</h3>
            <p>Try another date range, service type, direction or status.</p>
            {hasFilters && (
              <button className="secondary-button" onClick={resetFilters}>Clear filters</button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
