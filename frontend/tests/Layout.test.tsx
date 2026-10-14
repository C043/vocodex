import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { render, screen, act, createTestStore } from "./test-utils"
import Layout from "../src/components/Layout"
import { checkAuthentication, parseJwt } from "../src/utils/authUtils"
import {
  showChrome,
  toggleFocusMode
} from "../src/redux/reducer/focusModeSlice"

vi.mock("../src/utils/authUtils", () => ({
  checkAuthentication: vi.fn(),
  parseJwt: vi.fn()
}))

const topBar = () => screen.getByText("VOCODEX").closest("nav")!

describe("Layout top bar in focus mode", () => {
  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(true)
    vi.mocked(parseJwt).mockReturnValue({
      sub: 1,
      username: "me",
      preferences: {},
      iat: 0,
      exp: 0
    })
    window.localStorage.setItem("vocodex-jwt", "token")
    global.fetch = vi.fn().mockResolvedValue({ ok: false })
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    window.history.pushState({}, "", "/player/1")
  })

  afterEach(() => {
    window.localStorage.removeItem("vocodex-jwt")
    window.history.pushState({}, "", "/")
    vi.restoreAllMocks()
  })

  it("is shown by default", () => {
    render(<Layout />)
    expect(topBar()).not.toHaveAttribute("aria-hidden")
  })

  it("hides with the player controls", () => {
    const store = createTestStore()
    render(<Layout />, { store })

    act(() => {
      store.dispatch(toggleFocusMode())
    })

    expect(topBar()).toHaveAttribute("aria-hidden", "true")
    expect(topBar()).toHaveAttribute("inert")

    act(() => {
      store.dispatch(showChrome())
    })
    expect(topBar()).not.toHaveAttribute("aria-hidden")
  })

  it("stays shown outside the player", () => {
    window.history.pushState({}, "", "/")
    const store = createTestStore()
    render(<Layout />, { store })

    act(() => {
      store.dispatch(toggleFocusMode())
    })

    expect(topBar()).not.toHaveAttribute("aria-hidden")
  })
})
