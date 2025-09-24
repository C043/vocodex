import { createSlice, PayloadAction } from "@reduxjs/toolkit"

export const themeModeSlice = createSlice({
  name: "darkMode",
  initialState: {
    value: true
  },

  reducers: {
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      state.value = action.payload
    }
  }
})

export const { setDarkMode } = themeModeSlice.actions

export default themeModeSlice.reducer
