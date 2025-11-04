import { createSlice, PayloadAction } from "@reduxjs/toolkit"

type UserPreferences = {
  speed: string
  voice: string
}

export const authSlice = createSlice({
  name: "user",
  initialState: {
    isLoggedIn: false,
    userId: -1,
    username: "",
    preferences: {
      speed: "+0%",
      voice: ""
    }
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
    setUserPreferences: (state, action: PayloadAction<UserPreferences>) => {
      state.preferences.speed = action.payload.speed
      state.preferences.voice = action.payload.voice
    }
  }
})

export const { setIsLoggedIn, setUsername, setUserId, setUserPreferences } =
  authSlice.actions

export default authSlice.reducer
