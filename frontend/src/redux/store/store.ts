import { configureStore } from "@reduxjs/toolkit"
import authReducer from "../reducer/authSlice"
import themeModeSlice from "../reducer/themeModeSlice"
import focusModeReducer from "../reducer/focusModeSlice"

export default configureStore({
  reducer: {
    user: authReducer,
    darkMode: themeModeSlice,
    focusMode: focusModeReducer
  }
})
