'use client';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { privateAccessFromHash } from './private-link';
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
        : 'The transport service is unavailable. Please reload saved data.',
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
export function useTransportData() {
  const [data, setData] = useState<TransportRecord>(() => ({
    revision: 0,
    state: newTransportState(),
  }));
  const dataRef = useRef(data);
  const [mode, setMode] = useState<'demo' | 'cloud'>('demo');
  const modeRef = useRef(mode);
  const tokenRef = useRef('');
  const [connected, setConnected] = useState(false);
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
      setConnected(false);
      markReload(true);
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
    begin('Loading saved data…');
    try {
      if (!tokenRef.current)
        throw new RequestError(
          'This private link is incomplete. Open the full link supplied by your administrator.',
          401,
        );
      replace(record(await request('/state', tokenRef.current)));
      modeRef.current = 'cloud';
      setMode('cloud');
      setConnected(true);
      markReload(false);
    } catch (error) {
      failed(error, false);
      throw error;
    } finally {
      finish();
    }
  }
  const restored = useRef(false);
  const openPrivateLink = useEffectEvent(async () => {
    if (restored.current) return;
    restored.current = true;
    try {
      sessionStorage.removeItem(sessionKey);
    } catch {
      /* No browser storage. */
    }
    const access = privateAccessFromHash(window.location.hash);
    if (!access.present) return;
    tokenRef.current = access.token;
    modeRef.current = 'cloud';
    setMode('cloud');
    markReload(true);
    await reload();
  });
  useEffect(() => {
    // The bookmark retains access without storing a password or a session token.
    void openPrivateLink().catch(() => {});
    const onHashChange = () => {
      window.location.reload();
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  function useDemo() {
    if (busy.current) return;
    tokenRef.current = '';
    window.history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    );
    setConnected(false);
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
      throw new Error(
        'Open your complete private access link to save changes.',
      );
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
    connected,
    pending,
    error,
    needsReload,
    run,
    useDemo,
    reload,
  };
}
export type TransportData = ReturnType<typeof useTransportData>;
