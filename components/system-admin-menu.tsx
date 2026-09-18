'use client';

import { ChevronRight } from 'lucide-react';

const HOTELX_ICON_BASE = 'https://hms1.hotelx.asia/static/media';

export type SystemAdminSection = 'user' | 'roles' | 'hotel-roles-authorisation' | 'cms-control';

const items: { key: SystemAdminSection; label: string; detail: string; iconSrc: string }[] = [
  {
    key: 'user',
    label: 'User',
    detail: 'User Setup',
    iconSrc: `${HOTELX_ICON_BASE}/user.e7841e2a.svg`,
  },
  {
    key: 'roles',
    label: 'Roles',
    detail: 'Role Setup',
    iconSrc: `${HOTELX_ICON_BASE}/roles.6c9abf83.svg`,
  },
  {
    key: 'hotel-roles-authorisation',
    label: 'Hotel & Roles Authorisation',
    detail: 'Hotel & Roles Authorisation Setup',
    iconSrc: `${HOTELX_ICON_BASE}/auth.cb42ec88.svg`,
  },
  {
    key: 'cms-control',
    label: 'CMS Control',
    detail: 'CMS Control Setup',
    iconSrc: `${HOTELX_ICON_BASE}/auth.cb42ec88.svg`,
  },
];

export function SystemAdminMenu({ onOpen }: { onOpen?: (section: SystemAdminSection) => void }) {
  return (
    <div className="hotel-settings-menu" aria-label="System Admin" style={{ gap: 5 }}>
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
