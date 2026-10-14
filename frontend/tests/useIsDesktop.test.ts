import { describe, it, expect, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useIsDesktop } from "../src/hooks/useIsDesktop"
import { setScreenWidth, resetScreenWidth } from "./mediaQuery"

describe("useIsDesktop", () => {
  afterEach(resetScreenWidth)

  it("is true on a wide screen", () => {
    setScreenWidth(1280)
    expect(renderHook(() => useIsDesktop()).result.current).toBe(true)
  })

  it("is false on a phone", () => {
    setScreenWidth(390)
    expect(renderHook(() => useIsDesktop()).result.current).toBe(false)
  })

  it("defaults to desktop when media queries are unavailable", () => {
    resetScreenWidth()
    expect(renderHook(() => useIsDesktop()).result.current).toBe(true)
  })
})
