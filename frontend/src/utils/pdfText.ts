import { splitIntoChunks } from "./splitIntoChunks"

// The parts of a pdf.js TextItem the reader needs
export type PdfTextItem = {
  str: string
  hasEOL: boolean
  // [scaleX, skewY, skewX, scaleY, x, y], y measured from the page bottom
  transform: number[]
}

export type BlockKind = "heading" | "subheading" | "paragraph"

// A heading or a paragraph of the page, as a range of the page text
export type TextBlock = {
  start: number
  end: number
  kind: BlockKind
}

export type PageText = {
  // What gets read aloud
  text: string
  // Where each item starts in text, or -1 when it was left out
  itemStarts: number[]
  blocks: TextBlock[]
}

export type PdfChunk = {
  id: number
  text: string
  // Position of the chunk in the page text
  start: number
  end: number
  // Index of the block the chunk is part of
  block: number
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

// How much larger than the body text a line is to be a heading or a
// subheading
const HEADING_RATIO = 1.5
const SUBHEADING_RATIO = 1.15

// Gap between two lines, as a share of their font size, above which a new
// paragraph starts: lines in a paragraph are usually 1.2 sizes apart
const PARAGRAPH_GAP = 1.6

type Line = {
  start: number
  end: number
  // Baseline of the line and size of its largest font
  y: number
  size: number
}

const fontSize = (item: PdfTextItem) =>
  Math.hypot(item.transform[2], item.transform[3])

// The most used font size, counted by characters, is the body text one
const bodySize = (lines: Line[]) => {
  const chars = new Map<number, number>()
  for (const line of lines) {
    const size = Math.round(line.size * 2) / 2
    chars.set(size, (chars.get(size) ?? 0) + line.end - line.start)
  }
  let best = 0
  let bestChars = -1
  chars.forEach((count, size) => {
    if (count > bestChars) [best, bestChars] = [size, count]
  })
  return best
}

// Splits the lines into headings and paragraphs, by their font size and
// the room left between them
const findBlocks = (lines: Line[]): TextBlock[] => {
  const body = bodySize(lines)
  const kindOf = (line: Line): BlockKind => {
    if (line.size >= body * HEADING_RATIO) return "heading"
    if (line.size >= body * SUBHEADING_RATIO) return "subheading"
    return "paragraph"
  }

  const blocks: TextBlock[] = []
  let previous: Line | null = null
  for (const line of lines) {
    const kind = kindOf(line)
    const last = blocks.at(-1)
    const gap = previous ? previous.y - line.y : 0
    const isNewBlock =
      !last ||
      !previous ||
      last.kind !== kind ||
      // Going up the page, like at the top of a new column
      gap < 0 ||
      gap > Math.max(line.size, previous.size) * PARAGRAPH_GAP

    if (isNewBlock) blocks.push({ start: line.start, end: line.end, kind })
    else last.end = line.end
    previous = line
  }
  return blocks
}

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
  const lines: Line[] = []
  let line: Line | null = null
  const endLine = () => {
    if (line && text.slice(line.start).trim() !== "") {
      lines.push({ ...line, end: text.length })
    }
    line = null
  }

  const itemStarts = items.map((item, idx) => {
    if (skipped.has(idx)) {
      if (item.hasEOL) endLine()
      return -1
    }
    const start = text.length
    text += item.str
    if (item.hasEOL) text += "\n"

    // Empty items only mark line ends, their position means nothing
    if (item.str.trim() !== "") {
      if (!line) line = { start, end: start, y: item.transform[5], size: 0 }
      line.size = Math.max(line.size, fontSize(item))
    }
    if (item.hasEOL) endLine()
    return start
  })
  endLine()

  return { text, itemStarts, blocks: findBlocks(lines) }
}

// Chunks never run over two blocks, so a heading, which has no period to
// end it, is read on its own
export const chunkPageText = (
  page: number,
  text: string,
  maxChars = 200,
  blocks: TextBlock[] = [{ start: 0, end: text.length, kind: "paragraph" }]
): PdfChunk[] => {
  const chunks: PdfChunk[] = []
  blocks.forEach((block, blockIdx) => {
    let cursor = block.start
    const blockText = text.slice(block.start, block.end)
    for (const chunk of splitIntoChunks(blockText, maxChars)) {
      // Chunks are trimmed slices of the text, in order
      const start = text.indexOf(chunk.text, cursor)
      cursor = start + chunk.text.length
      // PDF lines break mid-sentence and the voice pauses on line breaks, so
      // they become spaces: only the punctuation decides the pauses. Same
      // length, so offsets in the chunk still match the page text
      const spoken = chunk.text.replace(/\n/g, " ")
      chunks.push({
        id: chunkId(page, chunks.length),
        text: spoken,
        start,
        end: cursor,
        block: blockIdx
      })
    }
  })
  return chunks
}

export const chunkAtOffset = (chunks: PdfChunk[], offset: number) =>
  chunks.find(chunk => offset < chunk.end)

// A token the voice says: it has a letter or a digit, in any alphabet
export const isWord = (token: string) => /[\p{L}\p{N}]/u.test(token)

// Same words as the reader counts for text entries, so the word index sent
// by the voice points to the same word
export const wordRanges = (text: string) =>
  [...text.matchAll(/\S+/g)]
    .filter(match => isWord(match[0]))
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
