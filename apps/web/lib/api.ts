const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.nexstock.co.za"

let refreshPromise: Promise<string | null> | null = null

export function getApiUrl() {
  return API_URL
}

function getStoredState() {
  if (typeof window === "undefined") return null
  try {
    const root = window.localStorage.getItem("persist:nexstock-web")
    if (!root) return null
    const parsedRoot = JSON.parse(root) as Record<string, string>
    return {
      auth: parsedRoot.auth ? JSON.parse(parsedRoot.auth) : null,
      app: parsedRoot.app ? JSON.parse(parsedRoot.app) : null,
    }
  } catch {
    return null
  }
}

function updatePersistedAuth(patch: Record<string, unknown>) {
  if (typeof window === "undefined") return
  try {
    const root = window.localStorage.getItem("persist:nexstock-web")
    const parsedRoot = root ? (JSON.parse(root) as Record<string, string>) : {}
    const auth = parsedRoot.auth ? JSON.parse(parsedRoot.auth) : {}
    parsedRoot.auth = JSON.stringify({ ...auth, ...patch, hydratedAt: Date.now() })
    window.localStorage.setItem("persist:nexstock-web", JSON.stringify(parsedRoot))
  } catch {
    // Ignore local persistence write errors.
  }
}

function clearPersistedState() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem("accessToken")
  try {
    const root = window.localStorage.getItem("persist:nexstock-web")
    if (!root) return
    const parsedRoot = JSON.parse(root) as Record<string, string>
    parsedRoot.auth = JSON.stringify({ accessToken: null, user: null, organizationId: null, hydratedAt: Date.now() })
    window.localStorage.setItem("persist:nexstock-web", JSON.stringify(parsedRoot))
  } catch {
    // Ignore local persistence write errors.
  }
}

export function getAccessToken() {
  if (typeof window === "undefined") return null
  const persistedToken = getStoredState()?.auth?.accessToken
  return persistedToken || window.localStorage.getItem("accessToken")
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem("accessToken", token)
  updatePersistedAuth({ accessToken: token })
}

export function clearAccessToken() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem("accessToken")
  updatePersistedAuth({ accessToken: null })
}

function isAuthRoute(pathname: string) {
  return ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"].some((route) => pathname.startsWith(route))
}

function sendToLogin() {
  if (typeof window === "undefined") return
  clearPersistedState()
  if (!isAuthRoute(window.location.pathname)) window.location.href = "/login"
}

async function parseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null)
  return body?.message || body?.error || fallback
}

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({}),
    })
      .then(async (response) => {
        if (!response.ok) return null
        const data = await response.json().catch(() => null)
        const token = data?.accessToken
        if (token) setAccessToken(token)
        return token || null
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}) {
  const body = options.body as BodyInit | null | undefined

  async function request(token: string | null) {
    const headers: Record<string, string> = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    }

    if (body && !(body instanceof FormData) && !headers["Content-Type"]) headers["Content-Type"] = "application/json"

    return fetch(`${API_URL}${url}`, { ...options, headers, credentials: "include" })
  }

  let response = await request(getAccessToken())

  if (response.status === 401 || response.status === 419) {
    const freshToken = await refreshAccessToken()
    if (freshToken) response = await request(freshToken)
  }

  if (response.status === 401 || response.status === 419) {
    sendToLogin()
    throw new Error("Your session expired. Please sign in again.")
  }

  if (!response.ok) throw new Error(await parseError(response, "API request failed"))
  if (response.status === 204) return undefined as T
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) return response.json() as Promise<T>
  return response.text() as Promise<T>
}

function persistLoginData(data: Record<string, unknown>) {
  const accessToken = typeof data.accessToken === "string" ? data.accessToken : null
  const user = data.user && typeof data.user === "object" ? data.user : null
  const organizationId = typeof data.organizationId === "string" ? data.organizationId : (user as { organizationId?: string } | null)?.organizationId || null
  if (accessToken) setAccessToken(accessToken)
  updatePersistedAuth({ accessToken, user, organizationId })
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  })
  if (!response.ok) throw new Error(await parseError(response, "Login failed"))
  const data = await response.json()
  persistLoginData(data)
  return data
}

export async function signup(payload: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await parseError(response, "Signup failed"))
  return response.json()
}

export async function verifyEmail(payload: { email: string; otp: string }) {
  const response = await fetch(`${API_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await parseError(response, "Verification failed"))
  const data = await response.json()
  persistLoginData(data)
  return data
}

export async function resendVerificationOtp(email: string) {
  const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  })
  if (!response.ok) throw new Error(await parseError(response, "Could not resend code"))
  return response.json()
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_URL}/api/auth/account-recovery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  })
  if (!response.ok) throw new Error(await parseError(response, "Could not send reset link"))
  return response.json()
}

export async function resetPassword(payload: { email: string; token: string; password: string }) {
  const response = await fetch(`${API_URL}/api/auth/account-recovery/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })
  if (!response.ok) throw new Error(await parseError(response, "Could not reset password"))
  return response.json()
}

export async function logout() {
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" }).catch(() => null)
  clearPersistedState()
  if (typeof window !== "undefined") window.location.href = "/login"
}
