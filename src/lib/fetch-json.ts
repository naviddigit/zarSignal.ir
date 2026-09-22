/** AbortController works on older Safari versions without AbortSignal.any/timeout. */
export async function fetchJson<T>(url: string, signal: AbortSignal, timeoutMs = 15_000): Promise<T> {
  const request = new AbortController();
  const abort = () => request.abort();
  if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
  const timer = setTimeout(abort, timeoutMs);
  try {
    const response = await fetch(url, { signal: request.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`http_${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}
