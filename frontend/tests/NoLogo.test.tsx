import { describe, it, expect, vi, beforeEach } from "vitest"
import "@testing-library/jest-dom"
import { render } from "./test-utils"
import AuthPage from "../src/pages/AuthPage"
import Layout from "../src/components/Layout"
import { checkAuthentication } from "../src/utils/authUtils"

vi.mock("../src/utils/authUtils", () => ({
  checkAuthentication: vi.fn(),
  parseJwt: vi.fn()
}))

const logoImages = (container: HTMLElement) =>
  container.querySelectorAll('img[src*="VOCODEX"]')

describe("Logo removal", () => {
  beforeEach(() => {
    vi.mocked(checkAuthentication).mockReturnValue(false)
    global.fetch = vi.fn()
  })

  it("does not show the logo on the auth page", () => {
    const { container } = render(<AuthPage />)
    expect(logoImages(container)).toHaveLength(0)
  })

  it("does not show the logo in the nav bar", () => {
    const { container, getByText } = render(<Layout />)
    expect(getByText("VOCODEX")).toBeInTheDocument()
    expect(logoImages(container)).toHaveLength(0)
  })
})
