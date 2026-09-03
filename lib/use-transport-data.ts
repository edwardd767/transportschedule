'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import {
  applyTransportAction,
  newTransportState,
  type TransportAction,
  type TransportRecord,
} from './transport-state';

const api = 'https://hotelx-transport-api.edwardjacob721.workers.dev';
const sessionKey = 'hotelx-transport-session-v1';
class RequestError extends Error {
  constructor(
    message: string,
    readonly status = 0,
  ) {
    super(message);
  }
}
async function request(path: string, token: string, body?: unknown) {
  let response: Response;
  try {
    response = await fetch(api + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new RequestError(
      'Could not reach saved data. Check your connection and reload before retrying a save.',
    );
  }
  const raw = await response.json().catch(() => null);
  const data =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  if (!response.ok)
    throw new RequestError(
      typeof data.error === 'string'
        ? data.error
        : 'Deploy the full Transport API in Cloudflare before signing in.',
      response.status,
    );
  return data;
}
function record(data: unknown): TransportRecord {
  const value = data as TransportRecord;
  if (
    !value ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    !value.state?.setup ||
    !Array.isArray(value.state.trips) ||
    !Array.isArray(value.state.templates) ||
    !value.state.dayNotes
  ) {
    throw new RequestError(
      'The server did not return saved transport data. Check the Transport API deployment.',
    );
  }
  return value;
}
function remember(token: string) {
  try {
    if (token) sessionStorage.setItem(sessionKey, token);
    else sessionStorage.removeItem(sessionKey);
  } catch {
    /* Session can still work in this tab until refresh. */
  }
}

export function useTransportData() {
  const [data, setData] = useState<TransportRecord>(() => ({
    revision: 0,
    state: newTransportState(),
  }));
  const dataRef = useRef(data);
  const [mode, setMode] = useState<'demo' | 'cloud'>('demo');
  const modeRef = useRef(mode);
  const tokenRef = useRef('');
  const [signedIn, setSignedIn] = useState(false);
  const [pending, setPending] = useState('');
  const busy = useRef(false);
  const reloadRequired = useRef(false);
  const [error, setError] = useState('');
  const [needsReload, setNeedsReload] = useState(false);
  function markReload(value: boolean) {
    reloadRequired.current = value;
    setNeedsReload(value);
  }
  function replace(value: TransportRecord) {
    dataRef.current = value;
    setData(value);
  }
  function begin(label: string) {
    if (busy.current)
      throw new Error('Please wait for the current request to finish.');
    busy.current = true;
    setPending(label);
    setError('');
  }
  function finish() {
    busy.current = false;
    setPending('');
  }
  function failed(error: unknown, writing: boolean) {
    const e = error as Error;
    if (e instanceof RequestError && e.status === 401) {
      tokenRef.current = '';
      remember('');
      setSignedIn(false);
    }
    if (
      writing &&
      (!(e instanceof RequestError) ||
        e.status === 0 ||
        e.status === 409 ||
        e.status >= 500)
    )
      markReload(true);
    setError(e.message);
  }
  async function reload() {
    if (!tokenRef.current) throw new Error('Sign in to reload saved data.');
    begin('Loading saved data…');
    try {
      replace(record(await request('/state', tokenRef.current)));
      modeRef.current = 'cloud';
      setMode('cloud');
      setSignedIn(true);
      markReload(false);
    } catch (error) {
      failed(error, false);
      throw error;
    } finally {
      finish();
    }
  }
  const restored = useRef(false);
  const restoreSession = useEffectEvent(async () => {
    if (restored.current) return;
    restored.current = true;
    let token = '';
    try {
      token = sessionStorage.getItem(sessionKey) ?? '';
    } catch {
      /* No browser storage. */
    }
    if (!token) return;
    tokenRef.current = token;
    modeRef.current = 'cloud';
    setMode('cloud');
    markReload(true);
    await reload();
  });
  useEffect(() => {
    // Restore once. Subsequent reloads are deliberate, preserving open form drafts.
    void restoreSession().catch(() => {});
  }, []);
  async function signIn(password: string) {
    begin('Signing in…');
    try {
      const result = await request('/session', '', { password });
      if (typeof result?.token !== 'string')
        throw new RequestError(
          'Deploy the full Transport API before signing in.',
        );
      const saved = record(await request('/state', result.token));
      tokenRef.current = result.token;
      remember(result.token);
      replace(saved);
      modeRef.current = 'cloud';
      setMode('cloud');
      setSignedIn(true);
      markReload(false);
    } catch (error) {
      failed(error, false);
      throw error;
    } finally {
      finish();
    }
  }
  function signOut() {
    if (busy.current) return;
    tokenRef.current = '';
    remember('');
    setSignedIn(false);
    modeRef.current = 'demo';
    setMode('demo');
    markReload(false);
    setError('');
    replace({ revision: 0, state: newTransportState() });
  }
  async function run(action: TransportAction) {
    if (busy.current)
      throw new Error('Please wait for the current request to finish.');
    if (modeRef.current === 'demo') {
      const next = {
        revision: 0,
        state: applyTransportAction(dataRef.current.state, action),
      };
      replace(next);
      return next.state;
    }
    if (!tokenRef.current)
      throw new Error('Sign in again to save your changes.');
    if (reloadRequired.current)
      throw new Error('Reload saved data, review your form, then save again.');
    begin('Saving…');
    try {
      const next = record(
        await request('/action', tokenRef.current, {
          revision: dataRef.current.revision,
          action,
        }),
      );
      replace(next);
      return next.state;
    } catch (error) {
      failed(error, true);
      throw error;
    } finally {
      finish();
    }
  }
  return {
    state: data.state,
    revision: data.revision,
    mode,
    signedIn,
    pending,
    error,
    needsReload,
    run,
    signIn,
    signOut,
    reload,
  };
}
export type TransportData = ReturnType<typeof useTransportData>;
