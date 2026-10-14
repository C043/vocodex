import { createSlice, PayloadAction } from "@reduxjs/toolkit"

// The player's zoom is saved apart for each kind of entry
export type ZoomMode = "text" | "pdf"
export type ZoomPreferences = Partial<Record<ZoomMode, number>>

export type UserPreferences = {
  speed: string
  voice: string
  zoom: ZoomPreferences
}

const initialPreferences: UserPreferences = {
  speed: "+0%",
  voice: "",
  zoom: {}
}

export const authSlice = createSlice({
  name: "user",
  initialState: {
    isLoggedIn: false,
    userId: -1,
    username: "",
    preferences: initialPreferences
  },

  reducers: {
    setIsLoggedIn: (state, action: PayloadAction<boolean>) => {
      state.isLoggedIn = action.payload
    },
    setUserId: (state, action: PayloadAction<number>) => {
      state.userId = action.payload
    },
    setUsername: (state, action: PayloadAction<string>) => {
      state.username = action.payload
    },
    // Only the preferences given are changed
    setUserPreferences: (
      state,
      action: PayloadAction<Partial<UserPreferences> | null | undefined>
    ) => {
      const { speed, voice, zoom } = action.payload ?? {}
      if (speed !== undefined) state.preferences.speed = speed
      if (voice !== undefined) state.preferences.voice = voice
      if (zoom) state.preferences.zoom = { ...state.preferences.zoom, ...zoom }
    }
  }
})

export const { setIsLoggedIn, setUsername, setUserId, setUserPreferences } =
  authSlice.actions

export default authSlice.reducer
