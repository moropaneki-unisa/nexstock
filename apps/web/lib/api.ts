const API_URL = process.env.NEXT_PUBLIC_API_URL;

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

function resolvePending() {
  pendingRequests.forEach((cb) => cb());
  pendingRequests = [];
}

async function refreshToken() {
  if (isRefreshing) {
    return new Promise<void>((resolve) => pendingRequests.push(resolve));
  }

  isRefreshing = true;

  try {
    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!res.ok) throw new Error('Refresh failed');

    resolvePending();
  } catch {
    localStorage.removeItem('accessToken');
    window.location.href = '/login';
  } finally {
    isRefreshing = false;
  }
}

export async function apiFetch<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const accessToken = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const res = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(options.headers || {}),
    },
    credentials: 'include',
  });

  if (res.status === 401) {
    await refreshToken();

    const retry = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(options.headers || {}),
      },
      credentials: 'include',
    });

    if (!retry.ok) {
      const body = await retry.json().catch(() => null);
      throw new Error(body?.message || 'API request failed');
    }

    return retry.json();
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'API request failed');
  }

  return res.status === 204 ? (undefined as T) : res.json();
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include',
  });

  if (!res.ok) throw new Error('Login failed');

  const data = await res.json();
  if (data.accessToken) localStorage.setItem('accessToken', data.accessToken);

  return data;
}

export async function logout() {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  localStorage.removeItem('accessToken');
  window.location.href = '/login';
}
