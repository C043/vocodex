import { joinBrokenWords, splitIntoChunks } from "./splitIntoChunks"
import type { TextChunk } from "./splitIntoChunks"
import type { BlockKind } from "./pdfText"

// A part of a text in italic or bold, as a range of it
export type InlineStyle = {
  start: number
  end: number
  style: "italic" | "bold"
}

// A book as the backend saves it: blocks of text, scene breaks and pictures
export type BookBlock =
  | { kind: BlockKind; text: string; styles?: InlineStyle[] }
  | { kind: "break" }
  | { kind: "image"; image: number; alt: string }

export type Book = { blocks: BookBlock[] }

// What is shown between the blocks of text, but never read aloud
export type Decoration =
  { kind: "break" } | { kind: "image"; src: string; alt: string }

export type BookChunk = TextChunk & {
  // The heading or paragraph the chunk is part of
  block: BlockKind
  // True when the chunk starts a new line of its block, as in a poem
  lineStart: boolean
  // Styles of the chunk, as ranges of its text
  styles: InlineStyle[]
  // Shown before the chunk, and after it when it is the last one
  before: Decoration[]
  after: Decoration[]
}

// Splits a book block by block, so each heading gets chunks of its own, and
// keeps the line breaks and styles of the book. Breaks and pictures go
// along the chunks around them, so they are shown but never read
export const splitBookIntoChunks = (
  book: Book,
  imageSrc: (image: number) => string,
  maxChars = 200
): BookChunk[] => {
  const chunks: BookChunk[] = []
  let pending: Decoration[] = []

  for (const block of book.blocks) {
    if (block.kind === "break") {
      pending.push({ kind: "break" })
      continue
    }
    if (block.kind === "image") {
      pending.push({
        kind: "image",
        src: imageSrc(block.image),
        alt: block.alt
      })
      continue
    }

    // Chunks are trimmed parts of the text, in order: find each one to
    // move the styles to it
    const text = joinBrokenWords(block.text)
    let cursor = 0
    splitIntoChunks(block.text, maxChars).forEach((chunk, idx) => {
      const start = text.indexOf(chunk.text, cursor)
      const end = start + chunk.text.length
      cursor = end

      chunks.push({
        text: chunk.text,
        paragraphStart: idx === 0 && chunks.length > 0,
        // Inside one block, only a line break can start a chunk anew
        lineStart: idx > 0 && chunk.paragraphStart,
        block: block.kind,
        styles: (block.styles ?? [])
          .filter(s => s.start < end && s.end > start)
          .map(s => ({
            start: Math.max(s.start, start) - start,
            end: Math.min(s.end, end) - start,
            style: s.style
          })),
        before: idx === 0 ? pending : [],
        after: []
      })
      if (idx === 0) pending = []
    })
  }

  if (chunks.length > 0) chunks[chunks.length - 1].after = pending
  return chunks
}
