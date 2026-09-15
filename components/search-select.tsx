'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

export function SearchSelect({ value, onChange, options, placeholder = '', ariaLabel, disabled = false }: {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (query === null) return options;
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((item) => item.toLowerCase().includes(needle)) : options;
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (wrapper.current?.contains(event.target as Node)) return;
      setOpen(false);
      setQuery(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight]);

  const openList = () => {
    setOpen(true);
    setQuery(null);
    setHighlight(Math.max(0, options.indexOf(value)));
  };

  const commit = (option: string) => {
    onChange(option);
    setOpen(false);
    setQuery(null);
  };

  return (
    <div className="hotelx-search-select" ref={wrapper}>
      <input
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        disabled={disabled}
        placeholder={placeholder}
        value={query ?? value}
        onFocus={(event) => {
          openList();
          event.target.select();
        }}
        onChange={(event) => {
          setOpen(true);
          setQuery(event.target.value);
          setHighlight(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
            setHighlight((current) => Math.min(current + 1, filtered.length - 1));
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setHighlight((current) => Math.max(current - 1, 0));
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (open && filtered[highlight]) commit(filtered[highlight]);
          } else if (event.key === 'Escape') {
            setOpen(false);
            setQuery(null);
          }
        }}
      />
      {value && !disabled && (
        <button
          type="button"
          className="hotelx-search-clear"
          aria-label={`Clear ${ariaLabel ?? 'selection'}`}
          tabIndex={-1}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange('');
            setQuery(null);
          }}
        >
          <X size={15} />
        </button>
      )}
      <button
        type="button"
        className="hotelx-search-toggle"
        aria-label={`Show ${ariaLabel ?? 'options'}`}
        tabIndex={-1}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) {
            setOpen(false);
            setQuery(null);
          } else {
            openList();
          }
        }}
      >
        <svg width="12" height="8" viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5" fill="none" stroke="#777" strokeWidth="1.6" /></svg>
      </button>
      {open && (
        <div className="hotelx-search-select-menu" role="listbox" ref={listRef}>
          {filtered.length ? (
            filtered.map((option, index) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={option === value}
                data-active={index === highlight}
                className={option === value ? 'is-selected' : undefined}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(option)}
                onMouseEnter={() => setHighlight(index)}
              >
                {option}
              </button>
            ))
          ) : (
            <p className="hotelx-search-select-empty">No matches</p>
          )}
        </div>
      )}
    </div>
  );
}
