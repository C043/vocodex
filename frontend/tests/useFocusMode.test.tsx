import { describe, it, expect, vi, afterEach } from "vitest"
import type { ReactNode } from "react"
import { act, renderHook } from "@testing-library/react"
import { Provider } from "react-redux"
import { createTestStore } from "./test-utils"
import { FOCUS_IDLE_MS, useFocusMode } from "../src/hooks/useFocusMode"
import { toggleFocusMode } from "../src/redux/reducer/focusModeSlice"

const renderFocusMode = () => {
  const store = createTestStore()
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
  const hook = renderHook(() => useFocusMode(), { wrapper })
  const isHidden = () => store.getState().focusMode.isChromeHidden
  return { store, isHidden, ...hook }
}

describe("useFocusMode", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("waits five seconds of idle before hiding", () => {
    expect(FOCUS_IDLE_MS).toBe(5000)
  })

  it.each(["mousemove", "touchstart"])(
    "shows the chrome on %s, then hides it after the idle delay",
    eventName => {
      vi.useFakeTimers()
      const { store, isHidden } = renderFocusMode()
      act(() => {
        store.dispatch(toggleFocusMode())
      })
      expect(isHidden()).toBe(true)

      act(() => {
        window.dispatchEvent(new Event(eventName))
      })
      expect(isHidden()).toBe(false)

      act(() => {
        vi.advanceTimersByTime(FOCUS_IDLE_MS - 1)
      })
      expect(isHidden()).toBe(false)
      act(() => {
        vi.advanceTimersByTime(1)
      })
      expect(isHidden()).toBe(true)
    }
  )

  it("restarts the idle delay on every move", () => {
    vi.useFakeTimers()
    const { store, isHidden } = renderFocusMode()
    act(() => {
      store.dispatch(toggleFocusMode())
    })
    act(() => {
      window.dispatchEvent(new Event("mousemove"))
      vi.advanceTimersByTime(FOCUS_IDLE_MS - 1000)
      window.dispatchEvent(new Event("mousemove"))
      vi.advanceTimersByTime(FOCUS_IDLE_MS - 1000)
    })
    expect(isHidden()).toBe(false)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(isHidden()).toBe(true)
  })

  it("ignores the mouse while off", () => {
    vi.useFakeTimers()
    const { isHidden } = renderFocusMode()
    act(() => {
      window.dispatchEvent(new Event("mousemove"))
      vi.advanceTimersByTime(FOCUS_IDLE_MS)
    })
    expect(isHidden()).toBe(false)
  })

  it("does not hide the chrome after being turned off", () => {
    vi.useFakeTimers()
    const { store, isHidden } = renderFocusMode()
    act(() => {
      store.dispatch(toggleFocusMode())
    })
    act(() => {
      window.dispatchEvent(new Event("mousemove"))
    })
    act(() => {
      store.dispatch(toggleFocusMode())
    })
    act(() => {
      vi.advanceTimersByTime(FOCUS_IDLE_MS)
    })
    expect(isHidden()).toBe(false)
  })

  it("turns focus mode off when leaving", () => {
    const { store, unmount } = renderFocusMode()
    act(() => {
      store.dispatch(toggleFocusMode())
    })
    unmount()
    expect(store.getState().focusMode).toEqual({
      isEnabled: false,
      isChromeHidden: false
    })
  })
})
