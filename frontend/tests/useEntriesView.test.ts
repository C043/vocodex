import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useEntriesView } from "../src/hooks/useEntriesView"

describe("useEntriesView", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it("shows a list by default", () => {
    const { result } = renderHook(() => useEntriesView())

    expect(result.current.entriesView).toBe("list")
  })

  it("switches between the list and the grid", () => {
    const { result } = renderHook(() => useEntriesView())

    act(() => result.current.setEntriesView("grid"))
    expect(result.current.entriesView).toBe("grid")

    act(() => result.current.setEntriesView("list"))
    expect(result.current.entriesView).toBe("list")
  })

  it("remembers the choice in this browser", () => {
    const first = renderHook(() => useEntriesView())
    act(() => first.result.current.setEntriesView("grid"))

    const { result } = renderHook(() => useEntriesView())

    expect(result.current.entriesView).toBe("grid")
  })

  it("ignores unknown stored values", () => {
    window.localStorage.setItem("vocodex-entries-view", "carousel")

    const { result } = renderHook(() => useEntriesView())

    expect(result.current.entriesView).toBe("list")
  })

  it("still switches when the storage is blocked", () => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockImplementation(
      () => {
        throw new Error("blocked")
      }
    )
    vi.spyOn(window.localStorage.__proto__, "setItem").mockImplementation(
      () => {
        throw new Error("blocked")
      }
    )
    const { result } = renderHook(() => useEntriesView())

    expect(result.current.entriesView).toBe("list")
    act(() => result.current.setEntriesView("grid"))
    expect(result.current.entriesView).toBe("grid")
  })
})
