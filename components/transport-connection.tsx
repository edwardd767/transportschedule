'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { InhouseGuestBridge } from '@/components/inhouse-guest-bridge';
import { BookingRemarksBridge } from '@/components/booking-remarks-bridge';
import { BookingRoomAssignmentBridge } from '@/components/booking-room-assignment-bridge';
import { BookingHouseLimitBridge } from '@/components/booking-house-limit-bridge';
import { BookingCancellationBridge } from '@/components/booking-cancellation-bridge';
import { BookingRoomCancellationBridge } from '@/components/booking-room-cancellation-bridge';
import { ReasonMasterBridge } from '@/components/reason-master-bridge';
import { HousekeepingBridge } from '@/components/housekeeping-bridge';
import type { TransportData } from '@/lib/use-transport-data';

export const TransportDataContext = createContext<TransportData | null>(null);
export function TransportRecovery() {
  const store = useContext(TransportDataContext);
  if (!store) return null;
  return (
    <div className="transport-recovery" aria-live="polite">
      {store.pending && <p>{store.pending}</p>}
      {store.mode === 'cloud' && (store.needsReload || !store.connected) && (
        <>
          <p>{store.error || 'Reload saved data before making changes.'}</p>
          <button
            type="button"
            className="secondary-button"
            disabled={Boolean(store.pending)}
            onClick={() => {
              void store.reload().catch(() => {});
            }}
          >
            Reload saved data
          </button>
        </>
      )}
    </div>
  );
}

export function TransportConnection({ store }: { store: TransportData }) {
  const [open, setOpen] = useState(false);
  const busy = Boolean(store.pending);

  useEffect(() => {
    const hideTransportGuestProfileSubnav = () => {
      document.querySelectorAll<HTMLElement>('.main-nav .subnav').forEach((subnav) => {
        const buttons = Array.from(subnav.querySelectorAll('button'));
        const isTransportSubnav =
          buttons.length === 1 && buttons[0]?.textContent?.trim() === 'Transport';
        if (isTransportSubnav) subnav.style.display = 'none';
      });
    };

    hideTransportGuestProfileSubnav();
    const observer = new MutationObserver(hideTransportGuestProfileSubnav);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const closeRoomCancellationBeforeNavigation = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const navButton = target?.closest<HTMLButtonElement>('.main-nav button');
      if (!navButton) return;

      const roomCancellationPage = document.querySelector<HTMLElement>(
        '[aria-label="Room Cancellation - Reinstatement"]',
      );
      if (!roomCancellationPage) return;

      roomCancellationPage
        .querySelector<HTMLButtonElement>('button[aria-label="Back to booking"]')
        ?.click();
    };

    document.addEventListener('click', closeRoomCancellationBeforeNavigation, true);
    return () =>
      document.removeEventListener('click', closeRoomCancellationBeforeNavigation, true);
  }, []);

  useEffect(() => {
    const applyRoomCancellationLayout = () => {
      const page = document.querySelector<HTMLElement>(
        '[aria-label="Room Cancellation - Reinstatement"]',
      );
      const container = page?.firstElementChild as HTMLElement | null;
      if (!container) return;

      container.style.width = '100%';
      container.style.maxWidth = 'none';
      container.style.marginLeft = '0';
      container.style.marginRight = '0';
      container.style.padding = window.innerWidth <= 640 ? '12px' : '14px 16px';
    };

    applyRoomCancellationLayout();
    const observer = new MutationObserver(applyRoomCancellationLayout);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('resize', applyRoomCancellationLayout);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', applyRoomCancellationLayout);
    };
  }, []);

  return (
    <>
      <InhouseGuestBridge store={store} />
      <BookingRemarksBridge store={store} />
      <BookingRoomAssignmentBridge store={store} />
      <BookingHouseLimitBridge store={store} />
      <BookingCancellationBridge store={store} />
      <BookingRoomCancellationBridge store={store} />
      <ReasonMasterBridge store={store} />
      <HousekeepingBridge store={store} />
      <button
        type="button"
        className="connection-button"
        onClick={() => setOpen(true)}
      >
        <Cloud size={16} />
        <span aria-live="polite">
          {store.pending ||
            (store.mode === 'cloud'
              ? store.connected
                ? 'Connected'
                : 'Link unavailable'
              : 'Demo mode')}
        </span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="hotel-dialog">
          <DialogHeader>
            <DialogTitle>
              {store.mode === 'cloud' ? 'Shared transport data' : 'Demo mode'}
            </DialogTitle>
            <DialogDescription>
              {store.mode === 'cloud'
                ? 'Your private link opens the shared schedule. Changes are saved when you save a form.'
                : 'Open your private access link to load and save shared transport data.'}
            </DialogDescription>
          </DialogHeader>
          <div className="hotel-form">
            {store.mode === 'cloud' ? (
              <>
                <p>
                  Bookmark your private link to return here. Reload to see
                  changes made on another device.
                </p>
                {store.connected && (
                  <p className="helper-text">
                    Last loaded version: {store.revision}.
                  </p>
                )}
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => {
                    void store.reload().catch(() => {});
                  }}
                >
                  <RefreshCw size={16} /> Reload saved data
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  disabled={busy}
                  onClick={() => {
                    store.useDemo();
                    setOpen(false);
                  }}
                >
                  Return to demo
                </button>
              </>
            ) : (
              <p>Demo changes reset when the page is refreshed.</p>
            )}
          </div>
          {store.error && (
            <p className="form-error" role="alert">
              {store.error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
