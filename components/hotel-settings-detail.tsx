'use client';

import {
  ArrowLeft,
  BadgePercent,
  BedDouble,
  Building2,
  ChevronRight,
  ClipboardList,
  Grid3X3,
  Layers3,
  ListChecks,
  Network,
  ReceiptText,
  Tags,
} from 'lucide-react';

export type HotelSettingsDetailKind =
  | 'hotelSetup'
  | 'department'
  | 'floorPlan'
  | 'roomStatus'
  | 'ratePolicy';

const pages = {
  hotelSetup: {
    title: 'Hotel Setup',
    detail: 'Hotel Information and Configuration Setup.',
    section: 'Hotel Information',
    empty: 'Hotel configuration fields will be maintained on this page.',
    icon: Building2,
  },
  department: {
    title: 'Department',
    detail: 'Hotel Department Setup.',
    section: 'Department Master',
    empty: 'Hotel departments will be maintained on this page.',
    icon: Network,
  },
  floorPlan: {
    title: 'Floor Plan',
    detail: 'Floor Plan Setup.',
    section: 'Floor Plan Master',
    empty: 'Hotel floor plans and room mapping will be maintained on this page.',
    icon: Layers3,
  },
  roomStatus: {
    title: 'Room Status',
    detail: 'Room Status Setup.',
    section: 'Room Status Master',
    empty: 'Room status configuration will be maintained on this page.',
    icon: BedDouble,
  },
  ratePolicy: {
    title: 'Rate Policy',
    detail: 'Rate Policy Setup.',
    section: 'Rate Policy Master',
    empty: 'Rate policies will be maintained on this page.',
    icon: ClipboardList,
  },
} as const;

const ratePolicyItems = [
  {
    key: 'rate-type',
    label: 'Rate Type',
    detail: 'Hotel Rate Type Setup.',
    icon: Tags,
  },
  {
    key: 'rate-plan',
    label: 'Rate Plan',
    detail: 'Hotel Rate Plan Setup.',
    icon: ListChecks,
  },
  {
    key: 'rate-plan-grid',
    label: 'Rate Plan Grid',
    detail: 'Hotel Rate Plan Grid Setup.',
    icon: Grid3X3,
  },
  {
    key: 'rate-plan-price-factor',
    label: 'Rate Plan Price Factor',
    detail: 'Hotel Rate Plan Price Factor Setup.',
    icon: BadgePercent,
  },
  {
    key: 'rate-policy',
    label: 'Rate Policy',
    detail: 'Hotel Rate Policy Setup.',
    icon: ClipboardList,
  },
  {
    key: 'service-rate',
    label: 'Service Rate',
    detail: 'Service Rate Setup.',
    icon: ReceiptText,
  },
] as const;

export function HotelSettingsDetail({
  kind,
  onBack,
}: {
  kind: HotelSettingsDetailKind;
  onBack: () => void;
}) {
  const page = pages[kind];
  const Icon = page.icon;

  if (kind === 'ratePolicy') {
    return (
      <section className="master-page" aria-label="Rate Policy">
        <div className="hotel-settings-menu" aria-label="Rate Policy setup">
          {ratePolicyItems.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                className="hotel-settings-card"
                aria-label={item.label}
              >
                <span className="hotel-settings-card-icon" aria-hidden="true">
                  <ItemIcon size={28} />
                </span>
                <span className="hotel-settings-card-copy">
                  <strong>{item.label}</strong>
                  <span>{item.detail}</span>
                </span>
                <ChevronRight className="hotel-settings-card-arrow" size={28} />
              </button>
            );
          })}
        </div>

        <button className="secondary-button master-page-back" type="button" onClick={onBack}>
          <ArrowLeft size={16} /> Back to Hotel Settings
        </button>
      </section>
    );
  }

  return (
    <section className="master-page" aria-label={page.title}>
      <div className="master-list-head">
        <div>
          <h1>{page.title}</h1>
          <p>{page.detail}</p>
        </div>
      </div>

      <div className="master-detail-card">
        <div className="master-section-label">{page.section}</div>
        <div className="empty-state" style={{ minHeight: 260 }}>
          <Icon size={42} aria-hidden="true" />
          <h3>{page.title}</h3>
          <p>{page.empty}</p>
        </div>
      </div>

      <button className="secondary-button master-page-back" type="button" onClick={onBack}>
        <ArrowLeft size={16} /> Back to Hotel Settings
      </button>
    </section>
  );
}
