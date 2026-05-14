import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

type AuthUser = {
  id?: string
  email?: string
  name?: string | null
  organizationId?: string | null
  [key: string]: unknown
}

type AuthState = {
  accessToken: string | null
  user: AuthUser | null
  organizationId: string | null
  hydratedAt: number | null
}

const initialState: AuthState = {
  accessToken: null,
  user: null,
  organizationId: null,
  hydratedAt: null,
}

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ accessToken?: string | null; user?: AuthUser | null; organizationId?: string | null }>,
    ) => {
      if (action.payload.accessToken !== undefined) state.accessToken = action.payload.accessToken
      if (action.payload.user !== undefined) state.user = action.payload.user
      if (action.payload.organizationId !== undefined) state.organizationId = action.payload.organizationId
      if (!state.organizationId && action.payload.user?.organizationId) state.organizationId = action.payload.user.organizationId
      state.hydratedAt = Date.now()
    },
    setAccessToken: (state, action: PayloadAction<string | null>) => {
      state.accessToken = action.payload
      state.hydratedAt = Date.now()
    },
    clearAuth: (state) => {
      state.accessToken = null
      state.user = null
      state.organizationId = null
      state.hydratedAt = Date.now()
    },
  },
})

export const { setCredentials, setAccessToken, clearAuth } = authSlice.actions
export type { AuthState, AuthUser }
