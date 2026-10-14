import { createSlice } from "@reduxjs/toolkit"

// Focus mode lets the reader hide the top bar and the player controls; they
// come back while the mouse moves
export const focusModeSlice = createSlice({
  name: "focusMode",
  initialState: {
    isEnabled: false,
    isChromeHidden: false
  },

  reducers: {
    toggleFocusMode: state => {
      state.isEnabled = !state.isEnabled
      state.isChromeHidden = state.isEnabled
    },
    showChrome: state => {
      state.isChromeHidden = false
    },
    hideChrome: state => {
      state.isChromeHidden = state.isEnabled
    },
    resetFocusMode: state => {
      state.isEnabled = false
      state.isChromeHidden = false
    }
  }
})

export const { toggleFocusMode, showChrome, hideChrome, resetFocusMode } =
  focusModeSlice.actions

export default focusModeSlice.reducer
