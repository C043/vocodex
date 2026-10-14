import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import {
  USER_SCROLL_PAUSE_MS,
  useUserScrollPause
} from "../src/hooks/useUserScrollPause"

describe("useUserScrollPause", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("is not paused until the user scrolls", () => {
    const { result } = renderHook(() => useUserScrollPause())
    expect(result.current()).toBe(false)
  })

  it.each(["wheel", "touchmove"])(
    "pauses for a while after a %s event",
    eventName => {
      vi.useFakeTimers()
      const { result } = renderHook(() => useUserScrollPause())

      window.dispatchEvent(new Event(eventName))
      expect(result.current()).toBe(true)

      vi.advanceTimersByTime(USER_SCROLL_PAUSE_MS + 1)
      expect(result.current()).toBe(false)
    }
  )

  it("stops listening on unmount", () => {
    const remove = vi.spyOn(window, "removeEventListener")
    const { unmount } = renderHook(() => useUserScrollPause())

    unmount()

    const removed = remove.mock.calls.map(([name]) => name)
    expect(removed).toEqual(expect.arrayContaining(["wheel", "touchmove"]))
  })
})
