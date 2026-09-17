'use client';

import { ChevronRight } from 'lucide-react';

const HOTELX_ICON_BASE = 'https://hms1.hotelx.asia/static/media';

export type CommonSettingsSection = 'tax-policy' | 'tax-scheme-policy' | 'company-listing';

const items: { key: CommonSettingsSection; label: string; detail: string; iconSrc: string }[] = [
  {
    key: 'tax-policy',
    label: 'Tax Policy',
    detail: 'Tax Policy Setup',
    iconSrc: `${HOTELX_ICON_BASE}/hotel-settings.bcc5e69d.svg`,
  },
  {
    key: 'tax-scheme-policy',
    label: 'Tax Scheme Policy',
    detail: 'Tax Scheme Policy Setup',
    iconSrc: `${HOTELX_ICON_BASE}/hotel-settings.bcc5e69d.svg`,
  },
  {
    key: 'company-listing',
    label: 'Company Listing',
    detail: 'Company Setup',
    iconSrc: `${HOTELX_ICON_BASE}/px-company.31e910dc.svg`,
  },
];

export function CommonSettingsMenu({ onOpen }: { onOpen?: (section: CommonSettingsSection) => void }) {
  return (
    <div className="hotel-settings-menu" aria-label="Common Settings" style={{ gap: 5 }}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className="hotel-settings-card transport-settings-card"
          onClick={() => onOpen?.(item.key)}
          aria-label={`Open ${item.label}`}
          style={{
            minHeight: 60,
            gridTemplateColumns: '50px minmax(0, 1fr) 24px',
            gap: 10,
            padding: '8px 12px',
          }}
        >
          <span
            className="hotel-settings-card-icon"
            aria-hidden="true"
            style={{
              width: 42,
              height: 42,
              borderRadius: 0,
              background: 'transparent',
              boxShadow: 'none',
              border: 'none',
            }}
          >
            <img
              src={item.iconSrc}
              alt=""
              width={32}
              height={32}
              loading="eager"
              style={{ display: 'block', width: 32, height: 32, objectFit: 'contain' }}
            />
          </span>
          <span className="hotel-settings-card-copy" style={{ gap: 1 }}>
            <strong style={{ fontSize: 13, lineHeight: 1.2 }}>{item.label}</strong>
            <span style={{ fontSize: 12, lineHeight: 1.25 }}>{item.detail}</span>
          </span>
          <ChevronRight className="hotel-settings-card-arrow" size={21} />
        </button>
      ))}
    </div>
  );
}
