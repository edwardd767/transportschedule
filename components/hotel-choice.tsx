'use client';
import type { ReactNode } from 'react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
export function Choice({
  value,
  onChange,
  items,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string; icon?: ReactNode }[];
  label: string;
}) {
  const selected = items.find((i) => i.value === value);
  return (
    <Select
      value={value || null}
      onValueChange={(v) => v !== null && onChange(v)}
      items={items}
    >
      <SelectTrigger className="hotel-select" aria-label={label}>
        {selected?.icon ? <span className="hotel-select-icon">{selected.icon}</span> : null}
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {items.length ? (
          items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
              {i.icon ? <span className="hotel-select-icon">{i.icon}</span> : null}
              {i.label}
            </SelectItem>
          ))
        ) : (
          <div className="select-empty">No available options</div>
        )}
      </SelectContent>
    </Select>
  );
}
