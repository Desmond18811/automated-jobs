export async function api<T = any>(
  path: string,
  options: {
    method?: string;
    json?: any;
    body?: BodyInit;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers || {}) };
  let body: BodyInit | undefined = options.body;

  if (options.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.json);
  }

  const res = await fetch(path, {
    method: options.method || (options.json !== undefined || options.body !== undefined ? 'POST' : 'GET'),
    headers,
    body
  });

  const contentType = res.headers.get('content-type') || '';
  let data: any;

  if (contentType.includes('application/json')) {
    data = await res.json().catch(() => ({}));
  } else {
    data = await res.text().catch(() => '');
  }

  if (!res.ok) {
    const errorMsg =
      (data && typeof data === 'object' && (data.error || data.message)) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}
