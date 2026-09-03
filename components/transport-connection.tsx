'use client';
import { createContext, useContext, useState } from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
  return (
    <>
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
