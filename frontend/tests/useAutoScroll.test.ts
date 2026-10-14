import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useAutoScroll } from "../src/hooks/useAutoScroll"

describe("useAutoScroll", () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it("is enabled by default", () => {
    const { result } = renderHook(() => useAutoScroll())

    expect(result.current.isAutoScroll).toBe(true)
  })

  it("toggles on and off", () => {
    const { result } = renderHook(() => useAutoScroll())

    act(() => result.current.toggleAutoScroll())
    expect(result.current.isAutoScroll).toBe(false)

    act(() => result.current.toggleAutoScroll())
    expect(result.current.isAutoScroll).toBe(true)
  })

  it("remembers the choice for the next visit", () => {
    const { result } = renderHook(() => useAutoScroll())
    act(() => result.current.toggleAutoScroll())

    const { result: next } = renderHook(() => useAutoScroll())

    expect(next.current.isAutoScroll).toBe(false)
  })

  it("still works when storage is unavailable", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })

    const { result } = renderHook(() => useAutoScroll())
    expect(result.current.isAutoScroll).toBe(true)

    act(() => result.current.toggleAutoScroll())
    expect(result.current.isAutoScroll).toBe(false)
  })
})
