'use client';

import {
  BedDouble,
  Building2,
  ChevronRight,
  ClipboardList,
  DoorOpen,
  Layers3,
  MapPin,
  Network,
  Ship,
} from 'lucide-react';

const items = [
  { key: 'hotel', label: 'Hotel Setup', detail: 'Hotel Information and Configuration Setup.', icon: Building2 },
  { key: 'department', label: 'Department', detail: 'Hotel Department Setup.', icon: Network },
  { key: 'location', label: 'Location', detail: 'Room Location Setup.', icon: MapPin },
  { key: 'floor-plan', label: 'Floor Plan', detail: 'Floor Plan Setup.', icon: Layers3 },
  { key: 'room-type', label: 'Room Type', detail: 'Room Type Setup.', icon: BedDouble },
  { key: 'room', label: 'Room', detail: 'Guest Room Setup.', icon: DoorOpen },
  { key: 'room-status', label: 'Room Status', detail: 'Room Status Setup.', icon: ClipboardList },
  { key: 'rate-policy', label: 'Rate Setup', detail: 'Hotel Rate Setup.', icon: ClipboardList },
  { key: 'transport', label: 'Transport Setup', detail: 'Transport Services, Routes and Schedule Setup.', icon: Ship },
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
  onOpenTransportSetup,
}: {
  onOpenHotelSetup: () => void;
  onOpenDepartment: () => void;
  onOpenLocation: () => void;
  onOpenFloorPlan: () => void;
  onOpenRoomType: () => void;
  onOpenRoom: () => void;
  onOpenRoomStatus: () => void;
  onOpenRatePolicy: () => void;
  onOpenTransportSetup: () => void;
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
    transport: onOpenTransportSetup,
  };

  return (
    <div className="hotel-settings-menu" aria-label="Hotel Settings">
      {items.map((item) => {
        const Icon = item.icon;
        const action = actions[item.key];
        return (
          <button
            key={item.key}
            type="button"
            className="hotel-settings-card transport-settings-card"
            onClick={action}
            aria-label={`Open ${item.label}`}
          >
            <span className="hotel-settings-card-icon" aria-hidden="true"><Icon size={28} /></span>
            <span className="hotel-settings-card-copy"><strong>{item.label}</strong><span>{item.detail}</span></span>
            <ChevronRight className="hotel-settings-card-arrow" size={28} />
          </button>
        );
      })}
    </div>
  );
}
