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
      {store.mode === 'cloud' && (store.needsReload || !store.signedIn) && (
        <>
          <p>{store.error || 'Reload saved data before making changes.'}</p>
          {store.signedIn ? (
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
          ) : (
            <TransportConnection store={store} />
          )}
        </>
      )}
    </div>
  );
}

export function TransportConnection({ store }: { store: TransportData }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const busy = Boolean(store.pending);
  return (
    <>
      <button
        type="button"
        className="connection-button"
        onClick={() => {
          setOpen(true);
          setError('');
        }}
      >
        <Cloud size={16} />{' '}
        <span>
          {store.pending ||
            (store.mode === 'cloud'
              ? store.signedIn
                ? 'Saved data'
                : 'Sign in again'
              : 'Sign in to saved data')}
        </span>
      </button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) {
            setOpen(value);
            setPassword('');
          }
        }}
      >
        <DialogContent className="hotel-dialog">
          <DialogHeader>
            <DialogTitle>Saved transport data</DialogTitle>
            <DialogDescription>
              {store.signedIn
                ? 'Changes are saved to your shared transport database.'
                : 'Sign in with the prototype password set by your administrator.'}
            </DialogDescription>
          </DialogHeader>
          {store.signedIn ? (
            <div className="hotel-form">
              <p>
                Last loaded version: {store.revision}. Reload to see changes
                made on another device.
              </p>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={async () => {
                  try {
                    await store.reload();
                    setError('');
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                <RefreshCw size={16} /> Reload saved data
              </button>
              <button
                className="secondary-button"
                disabled={busy}
                onClick={() => {
                  store.signOut();
                  setOpen(false);
                }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <form
              className="hotel-form"
              onSubmit={async (event) => {
                event.preventDefault();
                setError('');
                try {
                  await store.signIn(password);
                  setPassword('');
                  setOpen(false);
                } catch (e) {
                  setError((e as Error).message);
                }
              }}
            >
              {store.mode === 'demo' && (
                <p className="helper-text">
                  Signing in loads the shared schedule. Unsaved demo changes are
                  not uploaded.
                </p>
              )}
              <label>
                Prototype password
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  minLength={16}
                  maxLength={256}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button className="primary-button" disabled={busy} type="submit">
                {busy ? store.pending : 'Sign in'}
              </button>
              {store.mode === 'cloud' && (
                <button
                  className="secondary-button"
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    store.signOut();
                    setOpen(false);
                  }}
                >
                  Return to demo
                </button>
              )}
            </form>
          )}
          {(error || store.error) && (
            <p className="form-error" role="alert">
              {error || store.error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
