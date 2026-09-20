'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

export function SearchChoice({
  value,
  onChange,
  items,
  label,
  placeholder = '',
}: {
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
  label: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [typed, setTyped] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!typed) return items;
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => item.label.toLowerCase().includes(needle));
  }, [items, query, typed]);

  useEffect(() => {
    if (!open) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
        setTyped(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); setQuery(''); setTyped(false); }
    };
    document.addEventListener('mousedown', onDocumentClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocumentClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openList = () => {
    const rect = root.current?.getBoundingClientRect();
    if (rect) setDropUp(rect.bottom + 300 > window.innerHeight && rect.top > 300);
    setOpen(true);
  };

  return (
    <span className="search-choice" ref={root}>
      <input
        ref={inputRef}
        className="search-choice-input"
        aria-label={label}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        value={open ? query : value}
        placeholder={open ? value : placeholder}
        onChange={(event) => { setQuery(event.target.value); setTyped(true); if (!open) openList(); }}
        onFocus={() => { openList(); setQuery(value); setTyped(false); requestAnimationFrame(() => inputRef.current?.select()); }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && filtered.length) {
            event.preventDefault();
            onChange(filtered[0].value);
            setOpen(false);
        setQuery('');
        setTyped(false);
          }
        }}
      />
      <span className="search-choice-adornment">
        {open ? (
          <>
            {value ? (
              <button
                type="button"
                aria-label={`Clear ${label}`}
                onClick={() => { onChange(''); setQuery(''); setTyped(false); inputRef.current?.focus(); }}
              >
                <X size={18} />
              </button>
            ) : null}
            <button type="button" aria-label={`Search ${label}`} onClick={() => inputRef.current?.focus()}>
              <Search size={18} />
            </button>
          </>
        ) : (
          <button type="button" aria-label={`Open ${label}`} onClick={() => { openList(); setQuery(value); setTyped(false); inputRef.current?.focus(); requestAnimationFrame(() => inputRef.current?.select()); }}>
            <ChevronDown size={18} />
          </button>
        )}
      </span>
      {open && (
        <ul className={dropUp ? 'search-choice-popup up' : 'search-choice-popup'} role="listbox" aria-label={label}>
          {filtered.length ? (
            filtered.map((item) => (
              <li
                key={item.value}
                role="option"
                aria-selected={item.value === value}
                className={item.value === value ? 'selected' : ''}
                onClick={() => { onChange(item.value); setOpen(false); setQuery(''); setTyped(false); }}
              >
                {item.label}
              </li>
            ))
          ) : (
            <li className="empty">No matching options</li>
          )}
        </ul>
      )}
    </span>
  );
}
