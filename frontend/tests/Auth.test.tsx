import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "./test-utils"
import Home from "../src/pages/Home"
import { configureStore } from "@reduxjs/toolkit"
import authReducer from "../src/redux/reducer/authSlice"
import themeModeSlice from "../src/redux/reducer/themeModeSlice"

const mockNavigate = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

vi.mock("../src/utils/authUtils", () => ({
  checkAuthentication: vi.fn(() => false) // Return false for unauthenticated
}))

describe("User not authenticated", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    mockNavigate.mockReset()
  })

  it("gets redirected to login page if no jwt is found", () => {
    const testStore = configureStore({
      reducer: {
        user: authReducer,
        darkMode: themeModeSlice
      },
      preloadedState: {
        user: {
          isLoggedIn: false,
          userId: -1,
          username: ""
        }
      }
    })

    render(<Home />, { store: testStore })

    expect(mockNavigate).toHaveBeenCalledWith("/login")
  })
})
