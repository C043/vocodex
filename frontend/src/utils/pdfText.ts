import { splitIntoChunks } from "./splitIntoChunks"

// The parts of a pdf.js TextItem the reader needs
export type PdfTextItem = {
  str: string
  hasEOL: boolean
  // [scaleX, skewY, skewX, scaleY, x, y], y measured from the page bottom
  transform: number[]
}

export type PageText = {
  // What gets read aloud
  text: string
  // Where each item starts in text, or -1 when it was left out
  itemStarts: number[]
}

export type PdfChunk = {
  id: number
  text: string
  // Position of the chunk in the page text
  start: number
  end: number
}

export type ItemRange = {
  item: number
  from: number
  to: number
}

// Chunk ids are numbers, like for text entries, that also tell the page:
// page 1 uses 0, 1, 2…, page 2 uses 10000, 10001… The id is what gets saved
// as progress, so a PDF reopens on the right page without reading the rest
export const PAGE_STRIDE = 10000

export const chunkId = (page: number, index: number) =>
  (page - 1) * PAGE_STRIDE + index

export const pageOfChunk = (id: number) => Math.floor(id / PAGE_STRIDE) + 1

// Share of the page height, at the top and at the bottom, where running
// headers, footers and page numbers live
const MARGIN = 0.08

const PAGE_NUMBER =
  /^[-–—\s]*(page\s+)?(\d+|[ivxlcdm]+)(\s*(of|\/)\s*\d+)?[-–—\s]*$/i

const isInMargin = (item: PdfTextItem, pageHeight: number) => {
  const y = item.transform[5]
  return y < pageHeight * MARGIN || y > pageHeight * (1 - MARGIN)
}

// Running headers usually differ only by their numbers between pages
const lineKey = (line: string) =>
  line.toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim()

// Groups the margin items by line: line key -> item indexes
const marginLines = (items: PdfTextItem[], pageHeight: number) => {
  const byY = new Map<number, number[]>()
  items.forEach((item, idx) => {
    if (!isInMargin(item, pageHeight)) return
    const y = Math.round(item.transform[5])
    byY.set(y, [...(byY.get(y) ?? []), idx])
  })

  return [...byY.values()].map(indexes => ({
    text: indexes.map(idx => items[idx].str).join("").trim(),
    indexes
  }))
}

// The lines found in the top and bottom margins of a page, used to spot
// the ones repeated on every page
export const marginLineKeys = (items: PdfTextItem[], pageHeight: number) =>
  new Set(
    marginLines(items, pageHeight)
      .map(line => lineKey(line.text))
      .filter(key => key !== "")
  )

// Builds the text to read out of the page items, leaving out page numbers
// and the margin lines also found on the neighbor pages
export const buildPageText = (
  items: PdfTextItem[],
  pageHeight: number,
  neighborKeys: Set<string>[] = []
): PageText => {
  const skipped = new Set<number>()
  for (const line of marginLines(items, pageHeight)) {
    const key = lineKey(line.text)
    if (
      PAGE_NUMBER.test(line.text) ||
      neighborKeys.some(keys => keys.has(key))
    ) {
      line.indexes.forEach(idx => skipped.add(idx))
    }
  }

  let text = ""
  const itemStarts = items.map((item, idx) => {
    if (skipped.has(idx)) return -1
    const start = text.length
    text += item.str
    if (item.hasEOL) text += "\n"
    return start
  })

  return { text, itemStarts }
}

export const chunkPageText = (
  page: number,
  text: string,
  maxChars = 200
): PdfChunk[] => {
  let cursor = 0
  return splitIntoChunks(text, maxChars).map((chunk, idx) => {
    // Chunks are trimmed slices of the text, in order
    const start = text.indexOf(chunk.text, cursor)
    cursor = start + chunk.text.length
    // PDF lines break mid-sentence and the voice pauses on line breaks, so
    // they become spaces: only the punctuation decides the pauses. Same
    // length, so offsets in the chunk still match the page text
    const spoken = chunk.text.replace(/\n/g, " ")
    return { id: chunkId(page, idx), text: spoken, start, end: cursor }
  })
}

export const chunkAtOffset = (chunks: PdfChunk[], offset: number) =>
  chunks.find(chunk => offset < chunk.end)

// Same words as the reader counts for text entries, so the word index sent
// by the voice points to the same word
export const wordRanges = (text: string) =>
  [...text.matchAll(/\S+/g)]
    .filter(match => /[A-Za-z0-9'’]+/.test(match[0]))
    .map(match => ({ start: match.index, end: match.index + match[0].length }))

// The parts of the items that a range of the page text covers
export const textRangeToItems = (
  itemStarts: number[],
  itemStrs: string[],
  start: number,
  end: number
): ItemRange[] => {
  const ranges: ItemRange[] = []
  itemStarts.forEach((itemStart, item) => {
    if (itemStart < 0) return
    const from = Math.max(start, itemStart)
    const to = Math.min(end, itemStart + itemStrs[item].length)
    if (from < to) ranges.push({ item, from: from - itemStart, to: to - itemStart })
  })
  return ranges
}
