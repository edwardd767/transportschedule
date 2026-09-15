'use client';

export function HotelxChevronLeft({ size = 24 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z" />
    </svg>
  );
}

export function HotelxBackButton({
  onClick,
  disabled = false,
  label = 'Back',
  className = '',
}: {
  onClick: () => void;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`grid shrink-0 place-items-center disabled:opacity-60 ${className}`.trim()}
      style={{ background: '#fff', color: '#ff9800', borderRadius: 3, padding: 2, border: 0, lineHeight: 0 }}
    >
      <HotelxChevronLeft />
    </button>
  );
}
