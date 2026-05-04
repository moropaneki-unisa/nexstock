const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("inventoryhub_access_token");
}

export function setAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem("inventoryhub_access_token", token);
  else window.localStorage.removeItem("inventoryhub_access_token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (!headers.has("content-type") && options.body) headers.set("content-type", "application/json");
  if (token) headers.set("authorization", `Bearer ${token}`);

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return apiFetch<T>(path, options, false);
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || body?.error || "API request failed");
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function refreshAccessToken() {
  try {
    const response = await fetch(`${API_URL}/api/auth/refresh`, { method: "POST", credentials: "include" });
    if (!response.ok) return false;
    const data = await response.json();
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string) {
  const data = await apiFetch<{ accessToken: string }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  }, false);
  setAccessToken(data.accessToken);
  return data;
}

export async function signup(values: { email: string; password: string; name: string; orgName: string }) {
  const data = await apiFetch<{ accessToken: string }>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(values),
  }, false);
  setAccessToken(data.accessToken);
  return data;
}

export async function logout() {
  await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
  setAccessToken(null);
}
