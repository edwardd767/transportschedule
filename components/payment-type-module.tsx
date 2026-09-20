'use client';

import type { PaymentType } from '@/lib/transport-state';

export function PaymentTypeModule({ paymentTypes }: { paymentTypes: PaymentType[] }) {
  return (
    <section className="master-page" aria-label="Payment Type">
      <div className="rate-list-heading">
        <strong>Payment Type (<em>{paymentTypes.length}</em>)</strong>
      </div>
      <div className="rate-row-list">
        {paymentTypes.map((type) => (
          <div className={`rate-list-row detailed${type.active ? '' : ' inactive'}`} key={type.id}>
            <div className="rate-row-copy">
              <strong>{type.description}</strong>
              <span>Sort order {type.sortOrder}</span>
            </div>
            <span className="rate-row-amount">{type.auditDate || '—'}</span>
          </div>
        ))}
        {!paymentTypes.length && <div className="booking-room-empty">No payment types yet.</div>}
      </div>
    </section>
  );
}
