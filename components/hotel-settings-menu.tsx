'use client';

import { ChevronRight } from 'lucide-react';

const HOTELX_ICON_BASE = 'https://hms1.hotelx.asia/static/media';

const items = [
  {
    key: 'hotel',
    label: 'Hotel Setup',
    detail: 'Hotel Information and Configuration Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/hotel-setup.77068d33.svg`,
  },
  {
    key: 'department',
    label: 'Department',
    detail: 'Hotel Department Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/department.38cdc1a5.svg`,
  },
  {
    key: 'location',
    label: 'Location',
    detail: 'Room Location Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/location.e6075677.svg`,
  },
  {
    key: 'floor-plan',
    label: 'Floor Plan',
    detail: 'Floor Plan Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/location.e6075677.svg`,
  },
  {
    key: 'room-type',
    label: 'Room Type',
    detail: 'Room Type Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/room-type.c65b1618.svg`,
  },
  {
    key: 'room',
    label: 'Room',
    detail: 'Guest Room Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/room.fcc72953.svg`,
  },
  {
    key: 'room-status',
    label: 'Room Status',
    detail: 'Room Status Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/room-status.1587beed.svg`,
  },
  {
    key: 'rate-policy',
    label: 'Rate Policy',
    detail: 'Rate Policy Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/rate-policy.565c75fe.svg`,
  },
  {
    key: 'standard-policy',
    label: 'Standard Policy & Guidelines',
    detail: 'Hotel Operational Policy & Guidelines Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/standard-policy-guidelines.99b97c81.svg`,
  },
  {
    key: 'segment',
    label: 'Segment',
    detail: 'Segment Setup.',
    iconSrc: `${HOTELX_ICON_BASE}/segment.fc30bed9.svg`,
  },
  {
    key: 'transport',
    label: 'Transport Setup',
    detail: 'Transport Services, Routes and Schedule Setup.',
    iconSrc: 'https://dev.hotelx.asia/static/media/transport.3cf761c5.svg',
  },
] as const;

export function HotelSettingsMenu({
  onOpenHotelSetup,
  onOpenDepartment,
  onOpenLocation,
  onOpenFloorPlan,
  onOpenRoomType,
  onOpenRoom,
  onOpenRoomStatus,
  onOpenRatePolicy,
  onOpenStandardPolicy,
  onOpenTransportSetup,
  onOpenSegment,
}: {
  onOpenHotelSetup: () => void;
  onOpenDepartment: () => void;
  onOpenLocation: () => void;
  onOpenFloorPlan: () => void;
  onOpenRoomType: () => void;
  onOpenRoom: () => void;
  onOpenRoomStatus: () => void;
  onOpenRatePolicy: () => void;
  onOpenStandardPolicy: () => void;
  onOpenTransportSetup: () => void;
  onOpenSegment: () => void;
}) {
  const actions: Record<string, () => void> = {
    hotel: onOpenHotelSetup,
    department: onOpenDepartment,
    location: onOpenLocation,
    'floor-plan': onOpenFloorPlan,
    'room-type': onOpenRoomType,
    room: onOpenRoom,
    'room-status': onOpenRoomStatus,
    'rate-policy': onOpenRatePolicy,
    'standard-policy': onOpenStandardPolicy,
    transport: onOpenTransportSetup,
    segment: onOpenSegment,
  };

  return (
    <div className="hotel-settings-menu" aria-label="Hotel Settings" style={{ gap: 5 }}>
      {items.map((item) => {
        const action = actions[item.key];
        return (
          <button
            key={item.key}
            type="button"
            className="hotel-settings-card transport-settings-card"
            onClick={action}
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
        );
      })}
    </div>
  );
}
