import { useEffect, useRef, useState } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import { readPageText } from "../utils/pdf"
import type { PageTextContent } from "../utils/pdf"
import {
  buildPageText,
  chunkPageText,
  marginLineKeys,
  pageOfChunk
} from "../utils/pdfText"
import type { PageText, PdfChunk } from "../utils/pdfText"

export type PdfPage = {
  pageNumber: number
  width: number
  height: number
  text: PageText
  // Strings of the text layer items, in the same order as text.itemStarts
  itemStrs: string[]
  chunks: PdfChunk[]
}

export type PageSize = { width: number; height: number }

// Pages around a page compared with it to find running headers; two on each
// side because books often alternate them between even and odd pages
const NEIGHBORS = [-2, -1, 1, 2]

// Reads the text of a PDF a page at a time, only when it is needed, so long
// documents open as fast as short ones
export const usePdfDocument = (
  doc: PDFDocumentProxy | null,
  maxChars = 200
) => {
  const [pages, setPages] = useState<Map<number, PdfPage>>(new Map())
  // Used for the pages not loaded yet, which are usually all the same size
  const [defaultPageSize, setDefaultPageSize] = useState<PageSize | null>(null)
  const contents = useRef(new Map<number, Promise<PageTextContent>>())
  const loading = useRef(new Map<number, Promise<PdfPage>>())

  const numPages = doc?.numPages ?? 0
  const inDocument = (page: number) => page >= 1 && page <= numPages

  const readContent = (page: number) => {
    let content = contents.current.get(page)
    if (!content) {
      content = readPageText(doc as PDFDocumentProxy, page)
      contents.current.set(page, content)
      content.catch(() => contents.current.delete(page))
    }
    return content
  }

  const loadPage = (pageNumber: number): Promise<PdfPage | null> => {
    if (!doc || !inDocument(pageNumber)) return Promise.resolve(null)

    let page = loading.current.get(pageNumber)
    if (!page) {
      page = (async () => {
        const neighbors = NEIGHBORS.map(d => pageNumber + d).filter(inDocument)
        const [content, ...others] = await Promise.all([
          readContent(pageNumber),
          ...neighbors.map(readContent)
        ])
        const text = buildPageText(
          content.items,
          content.height,
          others.map(other => marginLineKeys(other.items, other.height))
        )
        const loaded: PdfPage = {
          pageNumber,
          width: content.width,
          height: content.height,
          text,
          itemStrs: content.items.map(item => item.str),
          chunks: chunkPageText(pageNumber, text.text, maxChars, text.blocks)
        }
        setPages(prev => new Map(prev).set(pageNumber, loaded))
        return loaded
      })()
      loading.current.set(pageNumber, page)
      // Let a failed page be tried again
      page.catch(() => loading.current.delete(pageNumber))
    }
    return page
  }

  // First (or last, going back) chunk found from a page onwards, skipping
  // the pages with nothing to read
  const findFrom = async (pageNumber: number, dir: 1 | -1) => {
    for (let p = pageNumber; inDocument(p); p += dir) {
      const page = await loadPage(p)
      if (page && page.chunks.length > 0) {
        return page.chunks[dir === 1 ? 0 : page.chunks.length - 1].id
      }
    }
    return null
  }

  // The chunk read before or after a chunk, loading pages as needed
  const adjacentChunk = async (id: number, dir: 1 | -1) => {
    const pageNumber = pageOfChunk(id)
    const page = await loadPage(pageNumber)
    const chunks = page?.chunks ?? []
    const idx = chunks.findIndex(chunk => chunk.id === id)
    if (idx !== -1 && chunks[idx + dir]) return chunks[idx + dir].id
    return findFrom(pageNumber + dir, dir)
  }

  // Where to start reading for a saved progress
  const resolveChunk = async (id: number) => {
    const pageNumber = pageOfChunk(id)
    const page = await loadPage(pageNumber)
    if (page?.chunks.some(chunk => chunk.id === id)) return id
    return findFrom(pageNumber, 1)
  }

  useEffect(() => {
    contents.current = new Map()
    loading.current = new Map()
    setPages(new Map())
    setDefaultPageSize(null)
    if (!doc) return

    let cancelled = false
    readContent(1)
      .then(({ width, height }) => {
        if (!cancelled) setDefaultPageSize({ width, height })
      })
      .catch(console.error)
    return () => {
      cancelled = true
    }
  }, [doc])

  return {
    doc,
    numPages,
    pages,
    defaultPageSize,
    loadPage,
    adjacentChunk,
    resolveChunk
  }
}
