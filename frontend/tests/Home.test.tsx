import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "./test-utils"
import Home from "../src/pages/Home"
import { configureStore } from "@reduxjs/toolkit"
import authReducer from "../src/redux/reducer/authSlice"
import themeModeSlice from "../src/redux/reducer/themeModeSlice"

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

describe("Home Page", () => {
  beforeEach(() => {
    global.fetch = vi.fn()
    window.localStorage.setItem("vocodex-jwt", "test-token")
  })

  it("renders Welcome heading with username", () => {
    const testUsername = "testuser"

    const testStore = configureStore({
      reducer: {
        user: authReducer,
        darkMode: themeModeSlice
      },
      preloadedState: {
        user: {
          isLoggedIn: true,
          userId: 1,
          username: testUsername
        }
      }
    })

    render(<Home />, { store: testStore })

    expect(screen.getByText(`Welcome, ${testUsername}`)).toBeInTheDocument()
  })
})
