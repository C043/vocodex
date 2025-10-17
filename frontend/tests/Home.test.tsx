import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "./test-utils"
import "@testing-library/jest-dom"
import Home from "../src/pages/Home"
import { configureStore } from "@reduxjs/toolkit"
import authReducer from "../src/redux/reducer/authSlice"
import themeModeSlice from "../src/redux/reducer/themeModeSlice"
import { checkAuthentication, parseJwt } from "../src/utils/authUtils"

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => vi.fn()
  }
})

vi.mock("../src/utils/authUtils", () => ({
  checkAuthentication: vi.fn(), // Return false for unauthenticated
  parseJwt: vi.fn()
}))

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

describe("Upload text", () => {
  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(true)
    global.fetch = vi.fn()
  })

  it("should call the right api endpoint", async () => {
    const { userEvent } = await import("@testing-library/user-event")

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ entries: [] })
      })
    ) as any

    const testStore = configureStore({
      reducer: { user: authReducer, darkMode: themeModeSlice },
      preloadedState: {
        user: { isLoggedIn: true, userId: 1, username: "testuser" }
      }
    })

    render(<Home />, { store: testStore })

    await userEvent.click(screen.getByRole("button"))
    await userEvent.type(screen.getByLabelText(/title/i), "title")
    await userEvent.type(screen.getByLabelText(/content/i), "content")
    await userEvent.click(screen.getByRole("button", { name: /Upload/i }))

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/entries/text"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          title: "title",
          content: "content"
        })
      })
    )
  })
})

describe("Entries", () => {
  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(true)
    global.fetch = vi.fn()
  })

  it("should render one row", async () => {
    const { waitFor } = await import("@testing-library/react")

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ entries: [{ id: 1, title: "title" }] })
      })
    ) as any

    const testStore = configureStore({
      reducer: { user: authReducer, darkMode: themeModeSlice },
      preloadedState: {
        user: { isLoggedIn: true, userId: 1, username: "testuser" }
      }
    })

    render(<Home />, { store: testStore })

    await waitFor(() => {
      expect(screen.getByText("title")).toBeInTheDocument()
    })
  })

  it("should call delete api when delete button is clicked", async () => {
    const { userEvent } = await import("@testing-library/user-event")
    const { waitFor } = await import("@testing-library/react")

    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ entries: [{ id: 1, title: "title" }] })
      })
    ) as any

    const testStore = configureStore({
      reducer: { user: authReducer, darkMode: themeModeSlice },
      preloadedState: {
        user: { isLoggedIn: true, userId: 1, username: "testuser" }
      }
    })

    render(<Home />, { store: testStore })

    await waitFor(() => {
      expect(screen.getByText("title")).toBeInTheDocument()
    })

    const deleteIcon = screen.getByTestId("delete-entry-1")
    await userEvent.click(deleteIcon)

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/entries/1"),
      expect.objectContaining({
        method: "DELETE"
      })
    )
  })
})
