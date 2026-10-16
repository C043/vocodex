import { chunkPageText, wordRanges, type PdfChunk } from "@vocodex/utils/pdfText"
import { alignBoundaries } from "@vocodex/utils/wordTiming"
import type { PageText } from "./pageText"

export type Boundary = {
  text: string
  start: number
  end: number
}

// A spoken word: when the voice starts it and where it is in the page text
export type WordSpan = {
  time: number
  start: number
  end: number
}

// Chunks of the page, read one after the other. Chunks never run over two
// blocks, like the pages of a PDF entry
export const chunkPage = (page: PageText, maxChars = 200): PdfChunk[] =>
  chunkPageText(1, page.text, maxChars, page.blocks)

export const chunkIndexAt = (chunks: PdfChunk[], offset: number) =>
  chunks.findIndex(chunk => offset < chunk.end)

export const wordSpans = (chunk: PdfChunk, boundaries: Boundary[]): WordSpan[] => {
  const words = wordRanges(chunk.text)
  return alignBoundaries(chunk.text, boundaries).flatMap((word, idx) => {
    const range = words[word]
    if (!range) return []
    return [{
      time: boundaries[idx].start,
      start: chunk.start + range.start,
      end: chunk.start + range.end
    }]
  })
}
