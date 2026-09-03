'use client';
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
  items: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select
      value={value || null}
      onValueChange={(v) => v !== null && onChange(v)}
      items={items}
    >
      <SelectTrigger className="hotel-select" aria-label={label}>
        <SelectValue placeholder="Select an option" />
      </SelectTrigger>
      <SelectContent>
        {items.length ? (
          items.map((i) => (
            <SelectItem key={i.value} value={i.value}>
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
