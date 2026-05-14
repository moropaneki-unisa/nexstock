import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type CachedValue<T = unknown> = {
  data: T
  savedAt: number
}

type AppCacheState = {
  organization: CachedValue | null
  layouts: CachedValue | null
  suppliers: CachedValue | null
  selectedLayoutId: string | null
}

const initialState: AppCacheState = {
  organization: null,
  layouts: null,
  suppliers: null,
  selectedLayoutId: null,
}

export const appSlice = createSlice({
  name: "app",
  initialState,
  reducers: {
    cacheOrganization: (state, action: PayloadAction<unknown>) => {
      state.organization = { data: action.payload, savedAt: Date.now() }
    },
    cacheLayouts: (state, action: PayloadAction<unknown>) => {
      state.layouts = { data: action.payload, savedAt: Date.now() }
    },
    cacheSuppliers: (state, action: PayloadAction<unknown>) => {
      state.suppliers = { data: action.payload, savedAt: Date.now() }
    },
    setSelectedLayoutId: (state, action: PayloadAction<string | null>) => {
      state.selectedLayoutId = action.payload
    },
    clearAppCache: (state) => {
      state.organization = null
      state.layouts = null
      state.suppliers = null
      state.selectedLayoutId = null
    },
  },
})

export const { cacheOrganization, cacheLayouts, cacheSuppliers, setSelectedLayoutId, clearAppCache } = appSlice.actions
export type { AppCacheState, CachedValue }
