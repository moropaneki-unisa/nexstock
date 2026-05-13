const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.nexstock.co.za"

export function getApiUrl() {
  return API_URL
}

export function getAccessToken() {
  if (typeof window === "undefined") return null
  return window.localStorage.getItem("accessToken")
}

export function setAccessToken(token: string) {
  if (typeof window === "undefined") return
  window.localStorage.setItem("accessToken", token)
}

export function clearAccessToken() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem("accessToken")
}

function sendToLogin() {
  if (typeof window === "undefined") return

  clearAccessToken()

  const pathname = window.location.pathname
  const authRoutes = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"]
  const alreadyOnAuthRoute = authRoutes.some((route) => pathname.startsWith(route))

  if (!alreadyOnAuthRoute) {
    window.location.href = "/login"
  }
}

async function parseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null)
  return body?.message || body?.error || fallback
}

export async function apiFetch<T = unknown>(url: string, options: RequestInit = {}) {
  const token = getAccessToken()
  const body = options.body as BodyInit | null | undefined
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  }

  if (body && !(body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
    credentials: "include",
  })

  if (response.status === 401 || response.status === 419) {
    sendToLogin()
    throw new Error("Your session expired. Please sign in again.")
  }

  if (!response.ok) {
    throw new Error(await parseError(response, "API request failed"))
  }

  if (response.status === 204) return undefined as T
  const contentType = response.headers.get("content-type") || ""
  if (contentType.includes("application/json")) return response.json() as Promise<T>
  return response.text() as Promise<T>
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response, "Login failed"))
  }

  const data = await response.json()
  if (data.accessToken) setAccessToken(data.accessToken)
  return data
}

export async function signup(payload: Record<string, unknown>) {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response, "Signup failed"))
  }

  const data = await response.json()
  if (data.accessToken) setAccessToken(data.accessToken)
  return data
}

export async function verifyEmail(payload: { email: string; otp: string }) {
  const response = await fetch(`${API_URL}/api/auth/verify-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response, "Verification failed"))
  }

  const data = await response.json()
  if (data.accessToken) setAccessToken(data.accessToken)
  return data
}

export async function resendVerificationOtp(email: string) {
  const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not resend code"))
  }

  return response.json()
}

export async function requestPasswordReset(email: string) {
  const response = await fetch(`${API_URL}/api/auth/account-recovery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email }),
  })

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not send reset link"))
  }

  return response.json()
}

export async function resetPassword(payload: {
  email: string
  token: string
  password: string
}) {
  const response = await fetch(`${API_URL}/api/auth/account-recovery/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(await parseError(response, "Could not reset password"))
  }

  return response.json()
}

export async function logout() {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  }).catch(() => null)

  clearAccessToken()
  if (typeof window !== "undefined") window.location.href = "/login"
}
