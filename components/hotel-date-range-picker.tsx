'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

function pad(value: number) {
  return String(value).padStart(2, '0');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day || 1, 12, 0, 0, 0);
}

function displayValue(value: string) {
  if (!value) return 'Select date';
  return parseKey(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function headerValue(value: string) {
  if (!value) return 'Start date';
  const date = parseKey(value);
  return `${pad(date.getDate())} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

function CalendarIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={{ display: 'inline-block', fill: 'currentColor', flex: '0 0 auto' }}
    >
      <path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.11.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
    </svg>
  );
}

export function HotelDateRangePicker({
  from,
  to,
  min,
  max,
  onChange,
  ariaLabel = 'Select date range',
  className = '',
}: {
  from: string;
  to: string;
  min?: string;
  max?: string;
  onChange: (from: string, to: string) => void;
  ariaLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [cursor, setCursor] = useState(() => {
    const selected = parseKey(from || min || new Date().toISOString().slice(0, 10));
    return { year: selected.getFullYear(), month: selected.getMonth() };
  });

  const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
  const dayCount = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const days = [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => index + 1),
  ];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && target.closest('.hotel-calendar-dialog')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const openPicker = () => {
    setDraftFrom(from);
    setDraftTo(to);
    const anchor = parseKey(from || to || min || new Date().toISOString().slice(0, 10));
    setCursor({ year: anchor.getFullYear(), month: anchor.getMonth() });
    setOpen(true);
  };

  const choose = (day: number) => {
    const key = dateKey(cursor.year, cursor.month, day);
    if (min && key < min) return;
    if (max && key > max) return;
    if (!draftFrom || (draftFrom && draftTo)) {
      setDraftFrom(key);
      setDraftTo('');
      return;
    }
    if (key < draftFrom) {
      setDraftTo(draftFrom);
      setDraftFrom(key);
      return;
    }
    setDraftTo(key);
  };

  const shiftMonth = (amount: number) => {
    const next = new Date(cursor.year, cursor.month + amount, 1, 12, 0, 0, 0);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <button
        type="button"
        className={`hotel-date-field hotel-date-range-field ${className}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        onClick={openPicker}
      >
        <span>{displayValue(from)}</span>
        <ChevronRight size={18} />
        <span>{displayValue(to)}</span>
        <CalendarIcon size={18} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="hotel-calendar-dialog" showCloseButton={false}>
          <div className="hotel-calendar-header range">
            <small>{cursor.year}</small>
            <strong>{headerValue(draftFrom)} → {headerValue(draftTo)}</strong>
          </div>

          <div className="hotel-calendar-monthbar">
            <button type="button" className="hotel-calendar-nav" aria-label="Previous month" onClick={() => shiftMonth(-1)}>
              <ChevronLeft size={26} />
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" className="hotel-calendar-nav" aria-label="Next month" onClick={() => shiftMonth(1)}>
              <ChevronRight size={26} />
            </button>
          </div>

          <div className="hotel-calendar-weekdays" aria-hidden="true">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="hotel-calendar-grid" role="grid" aria-label={monthLabel}>
            {days.map((day, index) => {
              if (day === null) return <span key={`blank-${index}`} />;
              const key = dateKey(cursor.year, cursor.month, day);
              const disabled = Boolean((min && key < min) || (max && key > max));
              const isStart = key === draftFrom;
              const isEnd = key === draftTo;
              const inRange = Boolean(draftFrom && draftTo && key > draftFrom && key < draftTo);
              return (
                <button
                  type="button"
                  key={key}
                  className={[isStart || isEnd ? 'selected' : '', inRange ? 'in-range' : ''].filter(Boolean).join(' ')}
                  disabled={disabled}
                  aria-pressed={isStart || isEnd}
                  onClick={() => choose(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="hotel-calendar-actions">
            <button type="button" onClick={() => setOpen(false)}>Cancel</button>
            <button
              type="button"
              onClick={() => {
                onChange(draftFrom, draftTo || draftFrom);
                setOpen(false);
              }}
            >
              OK
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
