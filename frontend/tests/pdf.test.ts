import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { getDocument, PDFDataRangeTransport } from "pdfjs-dist"
import {
  fetchFileRange,
  INITIAL_BYTES,
  openPdf,
  readPageText
} from "../src/utils/pdf"

vi.mock("pdfjs-dist", () => {
  class FakeRangeTransport {
    length: number
    initialData: Uint8Array | null
    onDataRange = vi.fn()
    constructor(length: number, initialData: Uint8Array | null) {
      this.length = length
      this.initialData = initialData
    }
  }
  return {
    GlobalWorkerOptions: {},
    PDFDataRangeTransport: FakeRangeTransport,
    getDocument: vi.fn(() => ({ promise: Promise.resolve("the document") }))
  }
})

const bytes = (length: number, fill = 1) => new Uint8Array(length).fill(fill)

const partial = (body: Uint8Array, start: number, total: number) =>
  new Response(body.slice().buffer, {
    status: 206,
    headers: {
      "Content-Range": `bytes ${start}-${start + body.length - 1}/${total}`
    }
  })

describe("fetchFileRange", () => {
  beforeEach(() => {
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(
      "fake-token"
    )
  })
  afterEach(() => vi.restoreAllMocks())

  it("asks only for the given bytes and reads the file size", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(partial(bytes(10), 20, 500))

    const { data, total } = await fetchFileRange("http://api/file", 20, 30)

    const [url, init] = fetchSpy.mock.calls[0]
    expect(url).toBe("http://api/file")
    expect(init?.headers).toEqual({
      Authorization: "Bearer fake-token",
      Range: "bytes=20-29"
    })
    expect(data).toEqual(bytes(10))
    expect(total).toBe(500)
  })

  it("accepts a server sending the whole file", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(bytes(42).buffer, { status: 200 })
    )

    const { data, total } = await fetchFileRange("http://api/file", 0, 10)

    expect(data.length).toBe(42)
    expect(total).toBe(42)
  })

  it("fails on error responses", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response("{}", { status: 404 })
    )

    await expect(fetchFileRange("http://api/file", 0, 10)).rejects.toThrow()
  })
})

describe("openPdf", () => {
  beforeEach(() => {
    vi.mocked(getDocument).mockClear()
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(
      "fake-token"
    )
  })
  afterEach(() => vi.restoreAllMocks())

  it("opens a small file from the first request", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(partial(bytes(100), 0, 100))

    const doc = await openPdf("7")

    expect(doc).toBe("the document")
    expect(getDocument).toHaveBeenCalledWith({ data: bytes(100) })
  })

  it("loads a long file piece by piece, only when pdf.js asks for it", async () => {
    const total = INITIAL_BYTES * 40
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValueOnce(partial(bytes(INITIAL_BYTES), 0, total))

    await openPdf("7")

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(String(fetchSpy.mock.calls[0][0])).toMatch(/\/entries\/7\/file$/)

    const params = vi.mocked(getDocument).mock.calls[0][0] as {
      range: PDFDataRangeTransport
      disableAutoFetch: boolean
      disableStream: boolean
    }
    expect(params.disableAutoFetch).toBe(true)
    expect(params.disableStream).toBe(true)
    const transport = params.range
    expect(transport.length).toBe(total)
    expect(transport.initialData).toEqual(bytes(INITIAL_BYTES))

    // pdf.js asks for [begin, end) when it needs a part of the file
    fetchSpy.mockResolvedValueOnce(partial(bytes(50, 9), 1000, total))
    transport.requestDataRange(1000, 1050)

    await vi.waitFor(() =>
      expect(transport.onDataRange).toHaveBeenCalledWith(1000, bytes(50, 9))
    )
    expect(fetchSpy.mock.calls[1][1]?.headers).toMatchObject({
      Range: "bytes=1000-1049"
    })
  })
})

describe("readPageText", () => {
  it("returns the text items and the size of a page", async () => {
    const textItem = {
      str: "Hello",
      hasEOL: true,
      transform: [1, 0, 0, 1, 10, 20],
      width: 30,
      height: 12,
      dir: "ltr",
      fontName: "f1"
    }
    const page = {
      getViewport: vi.fn(() => ({ width: 600, height: 800 })),
      getTextContent: vi.fn(async () => ({
        items: [{ type: "beginMarkedContent" }, textItem],
        styles: {}
      }))
    }
    const doc = { getPage: vi.fn(async () => page) }

    const result = await readPageText(doc as never, 3)

    expect(doc.getPage).toHaveBeenCalledWith(3)
    expect(page.getViewport).toHaveBeenCalledWith({ scale: 1 })
    expect(result).toEqual({
      width: 600,
      height: 800,
      items: [{ str: "Hello", hasEOL: true, transform: [1, 0, 0, 1, 10, 20] }]
    })
  })
})
