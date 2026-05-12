const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.nexstock.co.za";

let isRefreshing = false;
let pendingRequests: Array<() => void> = [];

const GET_CACHE_TTL_MS = 30_000;
const getCache = new Map<string, { expiresAt: number; data: unknown }>();
const pendingGetRequests = new Map<string, Promise<unknown>>();

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

function getRequestMethod(options: RequestInit) {
  return String(options.method || "GET").toUpperCase();
}

function shouldCacheGet(url: string, options: RequestInit) {
  if (typeof window === "undefined") return false;
  if (getRequestMethod(options) !== "GET") return false;
  if (options.cache === "no-store") return false;
  if (url.includes("/auth/refresh")) return false;
  return true;
}

function getCacheKey(url: string, options: RequestInit) {
  const token = getAccessToken() || "public";
  const headers = JSON.stringify(options.headers || {});
  return `${token}:${url}:${headers}`;
}

function clearApiCacheForMutation(url: string) {
  const prefixes = [url];

  if (url.startsWith("/api/products")) prefixes.push("/api/products", "/api/dashboard");
  if (url.startsWith("/api/suppliers")) prefixes.push("/api/suppliers", "/api/products", "/api/dashboard");
  if (url.startsWith("/api/purchase-orders")) prefixes.push("/api/purchase-orders", "/api/products", "/api/dashboard");
  if (url.startsWith("/api/organization")) prefixes.push("/api/organization", "/api/users/me", "/api/dashboard");
  if (url.startsWith("/api/product-fields")) prefixes.push("/api/product-fields", "/api/products");
  if (url.startsWith("/api/billing")) prefixes.push("/api/billing", "/api/organization", "/api/users/me");

  for (const key of Array.from(getCache.keys())) {
    if (prefixes.some((prefix) => key.includes(prefix))) getCache.delete(key);
  }

  for (const key of Array.from(pendingGetRequests.keys())) {
    if (prefixes.some((prefix) => key.includes(prefix))) pendingGetRequests.delete(key);
  }
}

export function clearApiCache(prefix?: string) {
  if (!prefix) {
    getCache.clear();
    pendingGetRequests.clear();
    return;
  }

  for (const key of Array.from(getCache.keys())) {
    if (key.includes(prefix)) getCache.delete(key);
  }

  for (const key of Array.from(pendingGetRequests.keys())) {
    if (key.includes(prefix)) pendingGetRequests.delete(key);
  }
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
      clearApiCache();
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
  return typeof FormData !== "undefined" && body instanceof FormData;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json() as Promise<T>;
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return (text as unknown) as T;
  }
}

async function executeApiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const body = options.body as any;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  if (body && !isFormData(body) && !("Content-Type" in headers) && !("content-type" in headers)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    const nextToken = await refreshAccessToken();

    if (!nextToken) {
      clearAccessToken();
      clearApiCache();
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new Error("Authentication required");
    }

    const retryHeaders: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
      Authorization: `Bearer ${nextToken}`,
    };

    if (body && !isFormData(body) && !("Content-Type" in retryHeaders) && !("content-type" in retryHeaders)) {
      retryHeaders["Content-Type"] = "application/json";
    }

    const retry = await fetch(`${API_URL}${url}`, {
      ...options,
      headers: retryHeaders,
      credentials: "include",
    });

    if (!retry.ok) {
      const parsed = await parseResponse<any>(retry).catch(() => null);
      throw new Error(parsed?.message || parsed?.error || "API request failed");
    }

    return parseResponse<T>(retry);
  }

  if (!response.ok) {
    const parsed = await parseResponse<any>(response).catch(() => null);
    throw new Error(parsed?.message || parsed?.error || "API request failed");
  }

  return parseResponse<T>(response);
}

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}): Promise<T> {
  const method = getRequestMethod(options);
  const cacheable = shouldCacheGet(url, options);
  const cacheKey = cacheable ? getCacheKey(url, options) : "";

  if (cacheable) {
    const cached = getCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.data as T;

    const pending = pendingGetRequests.get(cacheKey);
    if (pending) return pending as Promise<T>;

    const request = executeApiFetch<T>(url, options)
      .then((data) => {
        getCache.set(cacheKey, { expiresAt: Date.now() + GET_CACHE_TTL_MS, data });
        return data;
      })
      .finally(() => pendingGetRequests.delete(cacheKey));

    pendingGetRequests.set(cacheKey, request as Promise<unknown>);
    return request;
  }

  const result = await executeApiFetch<T>(url, options);
  if (method !== "GET") clearApiCacheForMutation(url);
  return result;
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
  if (data.accessToken) {
    setAccessToken(data.accessToken);
    clearApiCache();
  }
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
  if (data.accessToken) {
    setAccessToken(data.accessToken);
    clearApiCache();
  }
  return data;
}

export async function verifyEmail(payload: { email: string; otp: string }) {
  const response = await fetch(`${API_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Verification failed");
  }

  const data = await response.json();
  if (data.accessToken) {
    setAccessToken(data.accessToken);
    clearApiCache();
  }
  return data;
}

export async function resendVerificationOtp(email: string) {
  const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Could not resend code");
  }

  return response.json();
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_URL}/api/auth/account-recovery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Could not send reset link");
  }

  return response.json();
}

export async function resetPassword(payload: { email: string; token: string; password: string }) {
  const response = await fetch(`${API_URL}/api/auth/account-recovery/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "Could not reset password");
  }

  return response.json();
}

export type SubscriptionPlan = "starter" | "growth";

export async function initializeSubscriptionCheckout(plan: SubscriptionPlan) {
  return apiFetch<{ authorization_url?: string; checkout_url?: string; reference?: string; provider?: string }>("/api/billing/lemon-squeezy/initialize", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
}

export async function verifySubscriptionPayment(reference: string) {
  return apiFetch<{ success: boolean; plan?: string; status?: string }>(`/api/billing/lemon-squeezy/verify/${encodeURIComponent(reference)}`, { cache: "no-store" });
}

export async function logout() {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => null);

  clearAccessToken();
  clearApiCache();
  if (typeof window !== "undefined") window.location.href = "/login";
}
