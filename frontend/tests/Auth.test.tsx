import { describe, it, expect, vi, beforeEach } from "vitest"
import "@testing-library/jest-dom"
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

  it("should not navigate to home page when failed login", async () => {
    const { userEvent } = await import("@testing-library/user-event")
    const { waitFor } = await import("@testing-library/react")

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({})
      })
    ) as any

    render(<AuthPage mode="login" />)

    await userEvent.type(screen.getByLabelText(/username/i), "testuser")
    await userEvent.type(screen.getByLabelText(/password/i), "password123")
    await userEvent.click(screen.getByRole("button", { name: /login/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "testuser",
          password: "password123"
        })
      })
    )

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalledWith("/")
    })
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

  it("should call the right api endpoint when logging in", async () => {
    const { userEvent } = await import("@testing-library/user-event")

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ token: "fake-token" })
      })
    ) as any

    render(<AuthPage mode="login" />)

    await userEvent.type(screen.getByLabelText(/username/i), "testuser")
    await userEvent.type(screen.getByLabelText(/password/i), "password123")
    await userEvent.click(screen.getByRole("button", { name: /login/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "testuser",
          password: "password123"
        })
      })
    )

    expect(mockNavigate).toHaveBeenCalledWith("/")
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

describe("Registration", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    mockNavigate.mockReset()
  })

  it("should call the right api", async () => {
    const { userEvent } = await import("@testing-library/user-event")

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({})
      })
    ) as any

    render(<AuthPage mode="register" />)

    await userEvent.type(screen.getByLabelText(/Username/i), "testuser")
    await userEvent.type(screen.getByLabelText("Password"), "password123")
    await userEvent.type(
      screen.getByLabelText("Repeat Password"),
      "password123"
    )
    await userEvent.click(screen.getByRole("button", { name: /Register!/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/register"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          username: "testuser",
          password: "password123"
        })
      })
    )
  })
})
