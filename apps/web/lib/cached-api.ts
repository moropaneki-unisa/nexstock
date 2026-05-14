import { apiFetch } from "@/lib/api"

type PersistedRoot = {
  app?: {
    organization?: CachedValue | null
    layouts?: CachedValue | null
    suppliers?: CachedValue | null
    selectedLayoutId?: string | null
  } | null
}

type CachedValue<T = unknown> = {
  data: T
  savedAt: number
}

const CACHE_TTL = {
  organization: 5 * 60 * 1000,
  layouts: 5 * 60 * 1000,
  suppliers: 2 * 60 * 1000,
}

function readPersistedRoot(): PersistedRoot {
  if (typeof window === "undefined") return {}
  try {
    const raw = window.localStorage.getItem("persist:nexstock-web")
    if (!raw) return {}
    const parsed = JSON.parse(raw) as Record<string, string>
    return {
      app: parsed.app ? JSON.parse(parsed.app) : null,
    }
  } catch {
    return {}
  }
}

function writePersistedApp(patch: Record<string, unknown>) {
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem("persist:nexstock-web")
    const root = raw ? (JSON.parse(raw) as Record<string, string>) : {}
    const app = root.app ? JSON.parse(root.app) : {}
    root.app = JSON.stringify({ ...app, ...patch })
    window.localStorage.setItem("persist:nexstock-web", JSON.stringify(root))
  } catch {
    // Ignore storage errors.
  }
}

function isFresh(value: CachedValue | null | undefined, ttl: number) {
  return Boolean(value?.savedAt && Date.now() - value.savedAt < ttl)
}

async function cachedFetch<T>(key: "organization" | "layouts" | "suppliers", url: string, ttl: number, force = false) {
  const cached = readPersistedRoot().app?.[key] as CachedValue<T> | null | undefined
  if (!force && isFresh(cached, ttl)) return cached!.data
  const data = await apiFetch<T>(url)
  writePersistedApp({ [key]: { data, savedAt: Date.now() } })
  return data
}

export function getCachedOrganization<T = unknown>(force = false) {
  return cachedFetch<T>("organization", "/api/organization", CACHE_TTL.organization, force)
}

export function getCachedLayouts<T = unknown>(force = false) {
  return cachedFetch<T>("layouts", "/api/products/types", CACHE_TTL.layouts, force)
}

export function getCachedSuppliers<T = unknown>(force = false) {
  return cachedFetch<T>("suppliers", "/api/suppliers?limit=100", CACHE_TTL.suppliers, force)
}

export function invalidateCachedLayouts() {
  writePersistedApp({ layouts: null })
}

export function invalidateCachedOrganization() {
  writePersistedApp({ organization: null })
}

export function invalidateCachedSuppliers() {
  writePersistedApp({ suppliers: null })
}

export function setCachedSelectedLayoutId(layoutId: string | null) {
  writePersistedApp({ selectedLayoutId: layoutId })
}

export function getCachedSelectedLayoutId() {
  return readPersistedRoot().app?.selectedLayoutId || null
}
