'use client';

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
      className="grid shrink-0 place-items-center disabled:opacity-60"
      style={{ background: '#fff', color: '#ff9800', borderRadius: 3, padding: 2, border: 0, lineHeight: 0 }}
    >
      <svg viewBox="0 0 24 24" width={24} height={24} fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
      </svg>
    </button>
  );
}
