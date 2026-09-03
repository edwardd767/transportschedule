export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
export type Query = (
  connection: string,
  sql: string,
  params: string[],
) => Promise<string[][]>;

function allowed(url: URL, host: string) {
  const parts = host.split('.');
  parts[0] = parts[0].replace(/-pooler$/, '');
  const api = /^api(?:\.c-\d+)?\.[a-z0-9-]+\.(?:aws|azure)\.neon\.tech$/i;
  return (
    (url.hostname === host ||
      url.hostname === parts.join('.') ||
      api.test(url.hostname)) &&
    url.protocol === 'https:' &&
    !url.port &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    ['/sql', '/sql/'].includes(url.pathname)
  );
}

// Only server-owned, parameterized statements call this function.
export const queryNeon: Query = async (connection, sql, params) => {
  let database: URL;
  try {
    database = new URL(connection);
    if (
      !['postgres:', 'postgresql:'].includes(database.protocol) ||
      !/^ep-[a-z0-9-]+(?:\.[a-z0-9-]+)+\.neon\.tech$/i.test(
        database.hostname,
      ) ||
      !database.username ||
      !database.password ||
      /[^\x21-\x7e]/.test(connection)
    )
      throw new Error();
  } catch {
    throw new ApiError(
      'DATABASE_CONFIGURATION',
      'The database connection secret needs attention.',
      503,
    );
  }
  const labels = database.hostname.split('.');
  labels[0] = 'api';
  let url = new URL('https://' + labels.join('.') + '/sql');
  const seen = new Set<string>();
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 15000);
  try {
    for (let hop = 0; hop <= 3; hop++) {
      if (!allowed(url, database.hostname) || seen.has(url.href))
        throw new ApiError(
          'DATABASE_REDIRECT',
          'The database returned an unsupported redirect.',
        );
      seen.add(url.href);
      const response = await fetch(url.href, {
        method: 'POST',
        redirect: 'manual',
        signal: abort.signal,
        headers: {
          'Content-Type': 'application/json',
          'Neon-Connection-String': connection,
          'Neon-Array-Mode': 'true',
          'Neon-Raw-Text-Output': 'true',
        },
        body: JSON.stringify({ query: sql, params }),
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('Location');
        await response.body?.cancel();
        if (!location)
          throw new ApiError(
            'DATABASE_REDIRECT',
            'The database redirect was incomplete.',
          );
        url = new URL(location, url);
        continue;
      }
      if (!response.ok) {
        const detail = (await response.json().catch(() => ({}))) as {
          code?: string;
        };
        if (detail.code === '42P01')
          throw new ApiError(
            'STORAGE_MISSING',
            'Run the transport storage setup script in Neon first.',
            503,
          );
        throw new ApiError(
          'DATABASE_QUERY',
          'The database could not complete this request. Please try again.',
        );
      }
      const data = (await response.json()) as { rows?: string[][] };
      if (!Array.isArray(data.rows))
        throw new ApiError(
          'DATABASE_RESPONSE',
          'The database returned an unexpected response.',
        );
      return data.rows;
    }
    throw new ApiError(
      'DATABASE_REDIRECT',
      'The database returned too many redirects.',
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      abort.signal.aborted ? 'DATABASE_TIMEOUT' : 'DATABASE_CONNECTION',
      'The database connection was interrupted. Reload saved data before retrying a change.',
    );
  } finally {
    clearTimeout(timeout);
  }
};
