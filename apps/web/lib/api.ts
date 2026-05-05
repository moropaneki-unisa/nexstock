const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://product-hub-869g.onrender.com";

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

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: "include",
  });

  if (response.status === 401) {
    const nextToken = await refreshAccessToken();

    if (!nextToken) {
      clearAccessToken();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Authentication required");
    }

    const retry = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nextToken}`,
        ...(options.headers || {}),
      },
      credentials: "include",
    });

    if (!retry.ok) {
      const body = await retry.json().catch(() => null);
      throw new Error(body?.message || body?.error || "API request failed");
    }

    if (retry.status === 204) return undefined as T;
    return retry.json();
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || body?.error || "API request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Login failed");
  }

  const data = await response.json();
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
}

export async function signup(payload: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Signup failed");
  }

  const data = await response.json();
  if (data.accessToken) setAccessToken(data.accessToken);
  return data;
}

export async function logout() {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => null);

  clearAccessToken();
  if (typeof window !== "undefined") window.location.href = "/login";
}
