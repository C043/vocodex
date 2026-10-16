import { chunkText, wordRanges, type Chunk } from "./chunks"
import { alignBoundaries } from "./wordTiming"
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

// Chunks of the page, read one after the other, never running over two
// blocks
export const chunkPage = (page: PageText, maxChars = 200): Chunk[] =>
  chunkText(page.text, maxChars, page.blocks)

export const chunkIndexAt = (chunks: Chunk[], offset: number) =>
  chunks.findIndex(chunk => offset < chunk.end)

export const wordSpans = (chunk: Chunk, boundaries: Boundary[]): WordSpan[] => {
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
