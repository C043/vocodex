import { configureStore } from "@reduxjs/toolkit"
import authReducer from "../reducer/authSlice"
import themeModeSlice from "../reducer/themeModeSlice"

export default configureStore({
  reducer: {
    user: authReducer,
    darkMode: themeModeSlice
  }
})
