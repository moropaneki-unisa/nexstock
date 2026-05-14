import { combineReducers, configureStore } from "@reduxjs/toolkit"
import { persistReducer, persistStore } from "redux-persist"
import createWebStorage from "redux-persist/lib/storage/createWebStorage"

import { appSlice } from "@/lib/store/app-slice"
import { authSlice } from "@/lib/store/auth-slice"

const createNoopStorage = () => ({
  getItem() {
    return Promise.resolve(null)
  },
  setItem(_key: string, value: string) {
    return Promise.resolve(value)
  },
  removeItem() {
    return Promise.resolve()
  },
})

const storage = typeof window !== "undefined" ? createWebStorage("local") : createNoopStorage()

const rootReducer = combineReducers({
  auth: authSlice.reducer,
  app: appSlice.reducer,
})

const persistedReducer = persistReducer(
  {
    key: "nexstock-web",
    version: 1,
    storage,
    whitelist: ["auth", "app"],
  },
  rootReducer,
)

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE", "persist/PAUSE", "persist/PURGE", "persist/REGISTER"],
      },
    }),
})

export const persistor = persistStore(store)
export type RootState = ReturnType<typeof rootReducer>
export type AppDispatch = typeof store.dispatch
