import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export const authSlice = createSlice({
  name: "user",
  initialState: {
    isLoggedIn: false,
    userId: -1,
    username: ""
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
    }
  }
})

export const { setIsLoggedIn, setUsername, setUserId } = authSlice.actions

export default authSlice.reducer
