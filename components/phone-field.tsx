'use client';

import { useEffect, useRef, useState } from 'react';
import { DIAL_CODES, FLAG_POSITION, FLAG_SPRITE, type DialCode } from '@/lib/dial-codes';

const DEFAULT_COUNTRY = DIAL_CODES.find((entry) => entry.iso === 'my') ?? DIAL_CODES[0];

function flagStyle(iso: string) {
  return { backgroundImage: `url(${FLAG_SPRITE})`, backgroundPosition: FLAG_POSITION[iso] ?? '0 0' };
}

export function PhoneField({
  name,
  value,
  defaultValue = '',
  onChange,
  ariaLabel = 'Phone number',
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  ariaLabel?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const current = controlled ? value : internal;
  const [country, setCountry] = useState<DialCode>(DEFAULT_COUNTRY);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => document.removeEventListener('mousedown', onDocumentClick);
  }, [open]);

  const update = (next: string) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  return (
    <span className="booking-phone-line" ref={root}>
      <button
        type="button"
        className="phone-country-trigger"
        aria-label="Select country code"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((state) => !state)}
      >
        <span className="phone-flag" style={flagStyle(country.iso)} aria-hidden="true" />
        <span className="phone-dial">{country.dial}</span>
        <i className="phone-caret" aria-hidden="true" />
      </button>
      <input name={name} inputMode="tel" aria-label={ariaLabel} value={current} onChange={(event) => update(event.target.value)} />
      {open && (
        <ul className="phone-country-list" role="listbox" aria-label="Country codes">
          {DIAL_CODES.map((entry) => (
            <li
              key={entry.iso}
              role="option"
              aria-selected={entry.iso === country.iso}
              onClick={() => { setCountry(entry); setOpen(false); }}
            >
              <span className="phone-flag" style={flagStyle(entry.iso)} aria-hidden="true" />
              <span className="phone-country-name">{entry.name}</span>
              <span className="phone-country-dial">{entry.dial}</span>
            </li>
          ))}
        </ul>
      )}
    </span>
  );
}
