import { describe, it, expect, vi, afterEach } from "vitest"
import { measureRanges, mergeLineRects } from "../src/utils/highlightRects"

const box = (left: number, top: number, width: number, height = 10) => ({
  left,
  top,
  width,
  height
})

describe("mergeLineRects", () => {
  it("merges boxes touching on the same line", () => {
    expect(mergeLineRects([box(0, 0, 10), box(11, 0.5, 20)])).toEqual([
      box(0, 0, 31, 10.5)
    ])
  })

  it("keeps separate lines and far apart boxes apart", () => {
    const rects = [box(0, 0, 10), box(0, 20, 10), box(100, 0, 10)]
    expect(mergeLineRects(rects)).toEqual([
      box(0, 0, 10),
      box(100, 0, 10),
      box(0, 20, 10)
    ])
  })

  it("drops empty boxes", () => {
    expect(mergeLineRects([box(0, 0, 0)])).toEqual([])
  })
})

describe("measureRanges", () => {
  const original = Range.prototype.getClientRects

  afterEach(() => {
    Range.prototype.getClientRects = original
  })

  it("measures the part of each item, relative to the page", () => {
    const spans = ["Hello", " world"].map(text => {
      const span = document.createElement("span")
      span.textContent = text
      return span
    })
    const measured: [string, number, number][] = []
    Range.prototype.getClientRects = vi.fn(function (this: Range) {
      measured.push([
        this.startContainer.textContent ?? "",
        this.startOffset,
        this.endOffset
      ])
      const left = this.startContainer === spans[0].firstChild ? 110 : 200
      return [{ left, top: 220, width: 30, height: 12 }] as unknown as DOMRectList
    })

    const rects = measureRanges(
      spans,
      [
        { item: 0, from: 2, to: 5 },
        { item: 1, from: 0, to: 3 }
      ],
      { left: 100, top: 200 }
    )

    expect(measured).toEqual([
      ["Hello", 2, 5],
      [" world", 0, 3]
    ])
    expect(rects).toEqual([box(10, 20, 30, 12), box(100, 20, 30, 12)])
  })

  it("skips items with no element or text", () => {
    Range.prototype.getClientRects = vi.fn(() => [] as unknown as DOMRectList)
    const empty = document.createElement("span")

    expect(
      measureRanges([empty], [{ item: 0, from: 0, to: 1 }, { item: 5, from: 0, to: 1 }], {
        left: 0,
        top: 0
      })
    ).toEqual([])
  })
})
