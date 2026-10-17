import { describe, it, expect, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useIsTouch } from "../src/hooks/useIsTouch"
import { setScreenWidth, resetScreenWidth } from "./mediaQuery"

describe("useIsTouch", () => {
  afterEach(resetScreenWidth)

  it("is true on a wide touch screen", () => {
    setScreenWidth(1024, { touch: true })
    expect(renderHook(() => useIsTouch()).result.current).toBe(true)
  })

  it("is false with a mouse", () => {
    setScreenWidth(1280)
    expect(renderHook(() => useIsTouch()).result.current).toBe(false)
  })

  it("defaults to a mouse when media queries are unavailable", () => {
    resetScreenWidth()
    expect(renderHook(() => useIsTouch()).result.current).toBe(false)
  })
})
