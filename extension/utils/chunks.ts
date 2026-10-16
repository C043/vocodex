import { joinBrokenWords, splitIntoChunks } from "./splitIntoChunks"

// Taken from the PDF reader of the app (frontend/src/utils/pdfText.ts), so
// a web page is chunked like an entry

export type BlockKind = "heading" | "subheading" | "paragraph"

// A heading or a paragraph, as a range of the text
export type TextBlock = {
  start: number
  end: number
  kind: BlockKind
}

export type Chunk = {
  text: string
  // Position of the chunk in the text
  start: number
  end: number
  // Index of the block the chunk is part of
  block: number
}

// Chunks never run over two blocks, so a heading, which has no period to
// end it, is read on its own
export const chunkText = (
  text: string,
  maxChars = 200,
  blocks: TextBlock[] = [{ start: 0, end: text.length, kind: "paragraph" }]
): Chunk[] => {
  const chunks: Chunk[] = []
  // Chunks come with their broken words joined, so they are found in the
  // joined text, which is the same length as the text
  const joined = joinBrokenWords(text)
  blocks.forEach((block, blockIdx) => {
    let cursor = block.start
    const blockText = text.slice(block.start, block.end)
    for (const chunk of splitIntoChunks(blockText, maxChars)) {
      // Chunks are trimmed slices of the text, in order
      const start = joined.indexOf(chunk.text, cursor)
      cursor = start + chunk.text.length
      // The voice pauses on line breaks, so they become spaces: only the
      // punctuation decides the pauses. Same length, so offsets still match
      chunks.push({
        text: chunk.text.replace(/\n/g, " "),
        start,
        end: cursor,
        block: blockIdx
      })
    }
  })
  return chunks
}

// A token the voice says: it has a letter or a digit, in any alphabet
export const isWord = (token: string) => /[\p{L}\p{N}]/u.test(token)

// The words the voice says, so the word timings point to them
export const wordRanges = (text: string) =>
  [...text.matchAll(/\S+/g)]
    .filter(match => isWord(match[0]))
    .map(match => ({ start: match.index, end: match.index + match[0].length }))
