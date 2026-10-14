import {
  getDocument,
  GlobalWorkerOptions,
  PDFDataRangeTransport
} from "pdfjs-dist"
import type { PDFDocumentProxy } from "pdfjs-dist"
import type { TextItem } from "pdfjs-dist/types/src/display/api"
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import type { PdfTextItem } from "./pdfText"

GlobalWorkerOptions.workerSrc = workerSrc

// Size of the first request and of each later one: a long book is never
// downloaded whole, pdf.js asks only for the parts of the pages it shows
export const INITIAL_BYTES = 256 * 1024

const authHeader = () => ({
  Authorization: `Bearer ${window.localStorage.getItem("vocodex-jwt")}`
})

// Fetches bytes [start, end) of the file, and tells the full file size
export const fetchFileRange = async (url: string, start: number, end: number) => {
  const resp = await fetch(url, {
    headers: { ...authHeader(), Range: `bytes=${start}-${end - 1}` }
  })
  if (!resp.ok) throw new Error(`Fetching the PDF failed: ${resp.status}`)

  const data = new Uint8Array(await resp.arrayBuffer())
  const contentRange = resp.headers.get("Content-Range")
  // A 200 response is the whole file
  const total =
    resp.status === 206 && contentRange
      ? Number(contentRange.split("/")[1])
      : data.length

  return { data, total }
}

class EntryFileTransport extends PDFDataRangeTransport {
  url: string

  constructor(url: string, length: number, initialData: Uint8Array) {
    super(length, initialData)
    this.url = url
  }

  requestDataRange(begin: number, end: number) {
    fetchFileRange(this.url, begin, end)
      .then(({ data }) => this.onDataRange(begin, data))
      .catch(console.error)
  }
}

export const openPdf = async (entryId: string): Promise<PDFDocumentProxy> => {
  const url = `${import.meta.env.VITE_API_URL}/entries/${entryId}/file`
  const { data, total } = await fetchFileRange(url, 0, INITIAL_BYTES)

  if (data.length >= total) {
    return getDocument({ data }).promise
  }

  return getDocument({
    range: new EntryFileTransport(url, total, data),
    rangeChunkSize: INITIAL_BYTES,
    // Only fetch what the shown pages need, never the whole file
    disableAutoFetch: true,
    disableStream: true
  }).promise
}

export type PageTextContent = {
  items: PdfTextItem[]
  width: number
  height: number
}

export const readPageText = async (
  doc: PDFDocumentProxy,
  pageNumber: number
): Promise<PageTextContent> => {
  const page = await doc.getPage(pageNumber)
  const { width, height } = page.getViewport({ scale: 1 })
  const content = await page.getTextContent()

  // Marked content entries have no str and no element in the text layer
  const items = content.items
    .filter((item): item is TextItem => "str" in item)
    .map(({ str, hasEOL, transform }) => ({ str, hasEOL, transform }))

  return { items, width, height }
}
