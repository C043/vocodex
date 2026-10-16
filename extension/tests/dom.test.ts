import { afterEach, describe, expect, it, vi } from "vitest"
import { caretAt, cssHighlighter, follow } from "../utils/dom"

const rect = (top: number, bottom: number, left = 0, right = 100) =>
  ({ top, bottom, left, right, width: right - left, height: bottom - top }) as DOMRect

// jsdom does no layout, so ranges have no box to spy on
Range.prototype.getBoundingClientRect ??= () => rect(0, 0, 0, 0)

afterEach(() => {
  vi.restoreAllMocks()
  document.head.innerHTML = ""
})

describe("cssHighlighter", () => {
  it("paints with the CSS highlights of the page and styles them once", () => {
    const registry = new Map<string, unknown>()
    class FakeHighlight { constructor(public range: Range) {} }
    vi.stubGlobal("CSS", { highlights: registry })
    vi.stubGlobal("Highlight", FakeHighlight)
    const range = document.createRange()

    const highlighter = cssHighlighter(document)
    cssHighlighter(document)
    highlighter.set("vocodex-word", range)
    expect((registry.get("vocodex-word") as FakeHighlight).range).toBe(range)
    highlighter.set("vocodex-word", null)
    expect(registry.has("vocodex-word")).toBe(false)
    expect(document.querySelectorAll("style[data-vocodex]")).toHaveLength(1)
    vi.unstubAllGlobals()
  })

  it("does nothing where the browser has no CSS highlights", () => {
    vi.stubGlobal("CSS", {})
    expect(() => cssHighlighter(document).set("vocodex-word", document.createRange())).not.toThrow()
    vi.unstubAllGlobals()
  })
})

describe("caretAt", () => {
  const withText = () => {
    document.body.innerHTML = "<p>Hello</p>"
    return document.querySelector("p")!.firstChild as Text
  }

  it("finds the character under the point", () => {
    const text = withText()
    Object.assign(document, { caretPositionFromPoint: () => ({ offsetNode: text, offset: 2 }) })
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(rect(0, 20, 0, 50))
    expect(caretAt(document, 10, 10)).toEqual({ node: text, offset: 2 })
  })

  it("is nothing over a margin, away from the nearest text", () => {
    const text = withText()
    Object.assign(document, { caretPositionFromPoint: () => ({ offsetNode: text, offset: 5 }) })
    vi.spyOn(Range.prototype, "getBoundingClientRect").mockReturnValue(rect(0, 20, 0, 50))
    expect(caretAt(document, 300, 10)).toBeNull()
  })

  it("is nothing over what is not text", () => {
    withText()
    Object.assign(document, { caretPositionFromPoint: () => ({ offsetNode: document.body, offset: 0 }) })
    expect(caretAt(document, 10, 10)).toBeNull()
  })
})

describe("follow", () => {
  it("scrolls the word into view when it leaves the screen", () => {
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {})
    const range = document.createRange()
    vi.spyOn(range, "getBoundingClientRect").mockReturnValue(rect(window.innerHeight + 50, window.innerHeight + 70))
    follow(window, range)
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: "smooth" }))
  })

  it("leaves the page alone while the word is in view", () => {
    const scrollBy = vi.spyOn(window, "scrollBy").mockImplementation(() => {})
    const range = document.createRange()
    vi.spyOn(range, "getBoundingClientRect").mockReturnValue(rect(300, 320))
    follow(window, range)
    expect(scrollBy).not.toHaveBeenCalled()
  })
})
