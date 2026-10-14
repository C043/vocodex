import { describe, it, expect, vi, beforeEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { usePdfDocument } from "../src/hooks/usePdfDocument"
import { readPageText } from "../src/utils/pdf"
import type { PdfTextItem } from "../src/utils/pdfText"

vi.mock("../src/utils/pdf", () => ({ readPageText: vi.fn() }))

const line = (str: string, y = 400): PdfTextItem => ({
  str,
  hasEOL: true,
  transform: [12, 0, 0, 12, 72, y]
})

// Page texts of a fake 5 pages document; page 3 is an image only page
let pageTexts: Record<number, PdfTextItem[]>

const doc = { numPages: 5 } as never

const renderPdf = (maxChars?: number) =>
  renderHook(() => usePdfDocument(doc, maxChars))

describe("usePdfDocument", () => {
  beforeEach(() => {
    pageTexts = {
      1: [line("The Book", 780), line("First page. It has two sentences.")],
      2: [line("The Book", 780), line("Second page.")],
      3: [],
      4: [line("The Book", 780), line("Fourth page.")],
      5: [line("The Book", 780), line("Last page.")]
    }
    vi.mocked(readPageText).mockReset()
    vi.mocked(readPageText).mockImplementation(async (_, page) => ({
      items: pageTexts[page],
      width: 600,
      height: 800
    }))
  })

  it("knows the page count and the size of the first page", async () => {
    const { result } = renderPdf()

    expect(result.current.numPages).toBe(5)
    expect(result.current.doc).toBe(doc)
    await waitFor(() =>
      expect(result.current.defaultPageSize).toEqual({
        width: 600,
        height: 800
      })
    )
  })

  it("loads a page into chunks, without the running header", async () => {
    const { result } = renderPdf()

    let page
    await act(async () => {
      page = await result.current.loadPage(1)
    })

    expect(page).toBe(result.current.pages.get(1))
    expect(result.current.pages.get(1)?.chunks.map(c => c.text)).toEqual([
      "First page. It has two sentences."
    ])
    expect(result.current.pages.get(1)?.chunks[0].id).toBe(0)
    // Strings of the text layer items, to map chunks back onto the page
    expect(result.current.pages.get(1)?.itemStrs).toEqual([
      "The Book",
      "First page. It has two sentences."
    ])
  })

  it("reads a heading on its own, apart from the paragraph after it", async () => {
    pageTexts[2] = [
      { ...line("Chapter One", 600), transform: [24, 0, 0, 24, 72, 600] },
      line("The chapter text starts here.", 560)
    ]
    const { result } = renderPdf()

    await act(async () => {
      await result.current.loadPage(2)
    })

    const page = result.current.pages.get(2)
    expect(page?.text.blocks.map(b => b.kind)).toEqual(["heading", "paragraph"])
    expect(page?.chunks.map(c => [c.text, c.block])).toEqual([
      ["Chapter One", 0],
      ["The chapter text starts here.", 1]
    ])
  })

  it("reads each page only once", async () => {
    const { result } = renderPdf()

    await act(async () => {
      await Promise.all([
        result.current.loadPage(2),
        result.current.loadPage(2),
        result.current.loadPage(3)
      ])
    })

    const reads = vi.mocked(readPageText).mock.calls.map(([, page]) => page)
    expect(reads.length).toBe(new Set(reads).size)
  })

  it("does not load pages outside the document", async () => {
    const { result } = renderPdf()

    let page
    await act(async () => {
      page = await result.current.loadPage(9)
    })

    expect(page).toBeNull()
  })

  describe("adjacentChunk", () => {
    it("moves inside a page", async () => {
      // Two chunks on page 1 with a small chunk size
      pageTexts[1] = [line("One sentence here. Another sentence here.")]
      const { result } = renderPdf(20)
      await act(async () => {
        await result.current.loadPage(1)
      })

      let next
      await act(async () => {
        next = await result.current.adjacentChunk(0, 1)
      })
      expect(next).toBe(1)
    })

    it("crosses to the next page and skips pages with nothing to read", async () => {
      const { result } = renderPdf()

      let next
      await act(async () => {
        next = await result.current.adjacentChunk(10000, 1)
      })
      // Page 3 is empty: from page 2 we land on page 4
      expect(next).toBe(30000)
      expect(result.current.pages.get(4)).toBeDefined()
    })

    it("goes back to the last chunk of the previous page", async () => {
      pageTexts[2] = [line("Second page. With a second chunk that is long.")]
      const { result } = renderPdf(20)

      let prev
      await act(async () => {
        prev = await result.current.adjacentChunk(30000, -1)
      })
      expect(prev).toBe(10001)
    })

    it("returns null past the start or the end of the document", async () => {
      const { result } = renderPdf()

      let results: (number | null)[] = []
      await act(async () => {
        results = [
          await result.current.adjacentChunk(0, -1),
          await result.current.adjacentChunk(40000, 1)
        ]
      })
      expect(results).toEqual([null, null])
    })
  })

  it("finds the chunk to start from, or the first one after it", async () => {
    const { result } = renderPdf()

    let starts: (number | null)[] = []
    await act(async () => {
      starts = [
        await result.current.resolveChunk(30000),
        // Page 3 has no text: start on page 4
        await result.current.resolveChunk(20000),
        // A chunk the page no longer has: first chunk of the page
        await result.current.resolveChunk(10042)
      ]
    })
    expect(starts).toEqual([30000, 30000, 10000])
  })
})
