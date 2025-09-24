import { configureStore } from "@reduxjs/toolkit"
import authReducer from "../reducer/authSlice"

export default configureStore({
  reducer: {
    user: authReducer
  }
})
