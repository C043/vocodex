import { createSlice } from "@reduxjs/toolkit"

export const authSlice = createSlice({
  name: "isLoggedIn",
  initialState: {
    value: false
  },

  reducers: {
    setIsLoggedInFalse: state => {
      state.value = false
    },
    setIsLoggedInTrue: state => {
      state.value = true
    }
  }
})

export const { setIsLoggedInFalse, setIsLoggedInTrue } = authSlice.actions

export default authSlice.reducer
