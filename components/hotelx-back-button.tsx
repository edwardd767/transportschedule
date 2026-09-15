'use client';

import { ChevronLeft } from 'lucide-react';

export function HotelxBackButton({
  onClick,
  disabled = false,
  label = 'Back',
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="grid h-8 w-8 shrink-0 place-items-center rounded-[3px] bg-white text-[#e78300] shadow disabled:opacity-60"
    >
      <ChevronLeft size={17} />
    </button>
  );
}
