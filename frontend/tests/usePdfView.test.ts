import { describe, it, expect, vi, afterEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { usePdfView } from "../src/hooks/usePdfView"

describe("usePdfView", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
  })

  it("shows the pages by default", () => {
    const { result } = renderHook(() => usePdfView())

    expect(result.current.pdfView).toBe("pdf")
  })

  it("switches between the pages and the text", () => {
    const { result } = renderHook(() => usePdfView())

    act(() => result.current.togglePdfView())
    expect(result.current.pdfView).toBe("text")

    act(() => result.current.togglePdfView())
    expect(result.current.pdfView).toBe("pdf")
  })

  it("remembers the choice in this browser", () => {
    const first = renderHook(() => usePdfView())
    act(() => first.result.current.togglePdfView())

    const { result } = renderHook(() => usePdfView())

    expect(result.current.pdfView).toBe("text")
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
    const { result } = renderHook(() => usePdfView())

    expect(result.current.pdfView).toBe("pdf")
    act(() => result.current.togglePdfView())
    expect(result.current.pdfView).toBe("text")
  })
})
