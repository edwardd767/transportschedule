'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

type PickerMode = 'date' | 'month';

type HotelDatePickerProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  min?: string;
  max?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  mode?: PickerMode;
};

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function normaliseDate(value: string, mode: PickerMode) {
  if (mode === 'month') {
    if (/^\d{4}-\d{2}$/.test(value)) return `${value}-01`;
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const today = new Date();
  return dateKey(today.getFullYear(), today.getMonth(), today.getDate());
}

function parseKey(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day || 1, 12, 0, 0, 0);
}

function displayValue(value: string, mode: PickerMode) {
  if (!value) return mode === 'month' ? 'Select month' : 'Select date';
  const key = normaliseDate(value, mode);
  const date = parseKey(key);
  if (mode === 'month') {
    return date.toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric',
    });
  }
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function HotelDatePicker({
  value,
  defaultValue = '',
  onChange,
  name,
  required = false,
  min,
  max,
  disabled = false,
  ariaLabel = 'Select date',
  className = '',
  mode = 'date',
}: HotelDatePickerProps) {
  const controlled = value !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = controlled ? value ?? '' : internalValue;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => normaliseDate(currentValue, mode));
  const [cursor, setCursor] = useState(() => {
    const selected = parseKey(normaliseDate(currentValue, mode));
    return { year: selected.getFullYear(), month: selected.getMonth() };
  });

  const selected = parseKey(draft);
  const days = useMemo(() => {
    const firstDay = new Date(cursor.year, cursor.month, 1).getDay();
    const count = new Date(cursor.year, cursor.month + 1, 0).getDate();
    return [
      ...Array.from({ length: firstDay }, () => null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ];
  }, [cursor]);

  function openPicker() {
    const next = normaliseDate(currentValue, mode);
    const selectedDate = parseKey(next);
    setDraft(next);
    setCursor({ year: selectedDate.getFullYear(), month: selectedDate.getMonth() });
    setOpen(true);
  }

  function shiftMonth(amount: number) {
    const next = new Date(cursor.year, cursor.month + amount, 1, 12, 0, 0, 0);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  }

  function choose(day: number) {
    const next = dateKey(cursor.year, cursor.month, day);
    if (min && next < min) return;
    if (max && next > max) return;
    setDraft(next);
  }

  function commit() {
    const next = mode === 'month' ? draft.slice(0, 7) : draft;
    if (!controlled) setInternalValue(next);
    onChange?.(next);
    setOpen(false);
  }

  const header = selected.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      {name && <input type="hidden" name={name} value={currentValue} />}
      <button
        type="button"
        className={`hotel-date-field ${className}`.trim()}
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={openPicker}
      >
        <span>{displayValue(currentValue, mode)}</span>
        <CalendarDays size={18} />
      </button>
      {required && !currentValue && <span className="sr-only">A date is required.</span>}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="hotel-calendar-dialog" showCloseButton={false}>
          <div className="hotel-calendar-header">
            <small>{selected.getFullYear()}</small>
            <strong>{header}</strong>
          </div>

          <div className="hotel-calendar-monthbar">
            <button
              type="button"
              className="hotel-calendar-nav"
              aria-label="Previous month"
              onClick={() => shiftMonth(-1)}
            >
              <ChevronLeft size={26} />
            </button>
            <strong>{monthLabel}</strong>
            <button
              type="button"
              className="hotel-calendar-nav"
              aria-label="Next month"
              onClick={() => shiftMonth(1)}
            >
              <ChevronRight size={26} />
            </button>
          </div>

          <div className="hotel-calendar-weekdays" aria-hidden="true">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="hotel-calendar-grid" role="grid" aria-label={monthLabel}>
            {days.map((day, index) => {
              if (day === null) return <span key={`blank-${index}`} />;
              const key = dateKey(cursor.year, cursor.month, day);
              const isSelected = key === draft;
              const isDisabled = Boolean((min && key < min) || (max && key > max));
              return (
                <button
                  type="button"
                  key={key}
                  className={isSelected ? 'selected' : ''}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  onClick={() => choose(day)}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="hotel-calendar-actions">
            <button type="button" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" onClick={commit}>
              OK
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
