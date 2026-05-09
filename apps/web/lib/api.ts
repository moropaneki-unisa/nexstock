const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.nexstock.co.za";

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

export function getApiUrl() {
  return API_URL;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("accessToken");
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("accessToken", token);
}

function clearAccessToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("accessToken");
}

function resolvePending() {
  pendingRequests.forEach((callback) => callback());
  pendingRequests = [];
}

export async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing) {
    await new Promise<void>((resolve) => pendingRequests.push(resolve));
    return getAccessToken();
  }

  isRefreshing = true;

  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (data.accessToken) {
      setAccessToken(data.accessToken);
      return data.accessToken;
    }

    return null;
  } catch {
    return null;
  } finally {
    isRefreshing = false;
    resolvePending();
  }
}

function isFormData(body: any): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json() as Promise<T>;
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return (text as unknown) as T;
  }
}

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const body = options.body as any;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  if (body && !isFormData(body) && !('Content-Type' in headers) && !('content-type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401) {
    const nextToken = await refreshAccessToken();

    if (!nextToken) {
      clearAccessToken();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Authentication required');
    }

    const retryHeaders: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
      Authorization: `Bearer ${nextToken}`,
    };

    if (body && !isFormData(body) && !('Content-Type' in retryHeaders) && !('content-type' in retryHeaders)) {
      retryHeaders['Content-Type'] = 'application/json';
    }

    const retry = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: retryHeaders,
      credentials: 'include',
    });

    if (!retry.ok) {
      const parsed = await parseResponse<any>(retry).catch(() => null);
      throw new Error(parsed?.message || parsed?.error || 'API request failed');
    }

    return parseResponse<T>(retry);
  }

  if (!response.ok) {
    const parsed = await parseResponse<any>(response).catch(() => null);
    throw new Error(parsed?.message || parsed?.error || 'API request failed');
  }

  return parseResponse<T>(response);
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Login failed');
  }

  const data = await response.json();
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
}

export async function signup(payload: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Signup failed');
  }

  const data = await response.json();
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
}

export async function verifyEmail(payload: { email: string; otp: string }) {
  const response = await fetch(`${API_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Verification failed');
  }

  const data = await response.json();
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
}

export async function resendVerificationOtp(email: string) {
  const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Could not resend code');
  }

  return response.json();
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_URL}/api/auth/account-recovery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Could not send reset link');
  }

  return response.json();
}

export async function resetPassword(payload: { email: string; token: string; password: string }) {
  const response = await fetch(`${API_URL}/api/auth/account-recovery/complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || 'Could not reset password');
  }

  return response.json();
}

export async function logout() {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  }).catch(() => null);

  clearAccessToken();
  if (typeof window !== 'undefined') window.location.href = '/login';
}
