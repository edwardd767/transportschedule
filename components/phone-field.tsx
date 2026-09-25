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
  const [query, setQuery] = useState('');
  const root = useRef<HTMLSpanElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const chosenAt = useRef(0);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const focusTimer = window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), 0);
    const onDocumentClick = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocumentClick);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('mousedown', onDocumentClick);
    };
  }, [open]);

  const update = (next: string) => {
    if (!controlled) setInternal(next);
    onChange?.(next);
  };

  const needle = query.trim().toLowerCase();
  const matches = needle
    ? DIAL_CODES.filter((entry) => entry.name.toLowerCase().includes(needle) || entry.dial.toLowerCase().includes(needle))
    : DIAL_CODES;

  const choose = (entry: DialCode) => {
    chosenAt.current = Date.now();
    searchRef.current?.blur();
    setCountry(entry);
    setOpen(false);
  };

  return (
    <span className="booking-phone-line" ref={root}>
      <button
        type="button"
        className="phone-country-trigger"
        aria-label="Select country code"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (Date.now() - chosenAt.current < 400) return;
          setOpen((state) => !state);
        }}
      >
        <span className="phone-flag" style={flagStyle(country.iso)} aria-hidden="true" />
        <span className="phone-dial">{country.dial}</span>
        <i className="phone-caret" aria-hidden="true" />
      </button>
      <input name={name} type="tel" inputMode="tel" aria-label={ariaLabel} value={current} onChange={(event) => update(event.target.value.replace(/[^\d\s-]/g, ''))} />
      {open && (
        <div className="phone-country-menu">
          <input
            ref={searchRef}
            className="phone-country-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && matches[0]) { event.preventDefault(); choose(matches[0]); }
              if (event.key === 'Escape') setOpen(false);
            }}
            placeholder="Search country"
            aria-label="Search country"
          />
          <ul className="phone-country-list" role="listbox" aria-label="Country codes">
            {matches.map((entry) => (
              <li
                key={entry.iso}
                role="option"
                aria-selected={entry.iso === country.iso}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(entry)}
              >
                <span className="phone-flag" style={flagStyle(entry.iso)} aria-hidden="true" />
                <span className="phone-country-name">{entry.name}</span>
                <span className="phone-country-dial">{entry.dial}</span>
              </li>
            ))}
            {!matches.length && <li className="phone-country-empty">No matches</li>}
          </ul>
        </div>
      )}
    </span>
  );
}
