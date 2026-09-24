export function InfantIcon({ size = 15, label, className }: { size?: number; label?: string; className?: string }) {
  return (
    <span
      className={`infant-icon${className ? ` ${className}` : ''}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
