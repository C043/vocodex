import { splitIntoChunks } from "./splitIntoChunks"
import type { TextChunk } from "./splitIntoChunks"
import type { BlockKind } from "./pdfText"

export type BookChunk = TextChunk & {
  // The heading or paragraph the chunk is part of
  block: BlockKind
  // True when the chunk starts a new line of its paragraph, as in a poem
  lineStart: boolean
}

// "# " marks a heading and "## " a subheading, as the backend saves books
const HEADING_MARK = /^(#{1,2}) /

// Splits the text of a book, paragraph by paragraph, so each heading gets
// chunks of its own and the line breaks of the book are kept
export const splitBookIntoChunks = (
  content: string,
  maxChars = 200
): BookChunk[] =>
  content
    .split(/\n{2,}/)
    .filter(paragraph => paragraph.trim() !== "")
    .flatMap((paragraph, paragraphIdx) => {
      const mark = paragraph.match(HEADING_MARK)
      const block: BlockKind = !mark
        ? "paragraph"
        : mark[1] === "#"
          ? "heading"
          : "subheading"
      const text = mark ? paragraph.slice(mark[0].length) : paragraph

      // Inside one paragraph, only a line break can start a chunk anew
      return splitIntoChunks(text, maxChars).map((chunk, idx) => ({
        text: chunk.text,
        paragraphStart: idx === 0 && paragraphIdx > 0,
        lineStart: idx > 0 && chunk.paragraphStart,
        block
      }))
    })
