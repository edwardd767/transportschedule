// URL fragments stay in the browser; only Authorization carries the key to our API.
export const privateKeyPattern = /^hx_link_v1_[A-Za-z0-9_-]{43}$/;
export function privateAccessFromHash(hash: string) {
  const values = new URLSearchParams(hash.replace(/^#/, '')).getAll('access');
  return {
    present: values.length > 0,
    token:
      values.length === 1 && privateKeyPattern.test(values[0]) ? values[0] : '',
  };
}
