import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "./test-utils"
import Home from "../src/pages/Home"
import AuthPage from "../src/pages/AuthPage"
import { configureStore } from "@reduxjs/toolkit"
import authReducer from "../src/redux/reducer/authSlice"
import themeModeSlice from "../src/redux/reducer/themeModeSlice"
import { checkAuthentication, parseJwt } from "../src/utils/authUtils"

const mockNavigate = vi.fn()

vi.mock("../src/utils/authUtils", () => ({
  checkAuthentication: vi.fn(), // Return false for unauthenticated
  parseJwt: vi.fn()
}))

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe("User not authenticated", () => {
  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(false)
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

describe("Authenticated user", () => {
  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(true)
    vi.mocked(parseJwt).mockReturnValue({
      iat: new Date().getMilliseconds(),
      sub: 1,
      username: "TestUser",
      exp: 3
    })
    window.localStorage.setItem("vocodex-jwt", "fake-token")
    global.fetch = vi.fn()
    mockNavigate.mockReset()
  })

  it("should already be redirected to home page if jwt is present", () => {
    const testStore = configureStore({
      reducer: {
        user: authReducer,
        darkMode: themeModeSlice
      },
      preloadedState: {
        user: {
          isLoggedIn: true,
          userId: 1,
          username: "TestUser"
        }
      }
    })
    render(<AuthPage />, { store: testStore })

    expect(mockNavigate).toHaveBeenCalledWith("/")
  })
})
