export type TextChunk = {
  text: string
  // True when this chunk opens a new paragraph in the original content
  paragraphStart: boolean
}

// A hyphen at the end of a line that breaks a word in two, and the line
// break after it
const BROKEN_WORD = /(?<=[\p{L}\p{N}][-\u2010\u2011\u00ad])[^\S\n]*\r?\n[^\S\n]*(?=[\p{L}\p{N}])/gu

// The voice pauses on line breaks and reads the two halves of a word broken
// by a hyphen as two words. The line break becomes soft hyphens, which the
// voice skips and which keep the text the same length, so offsets still match
export const joinBrokenWords = (text: string) =>
  text.replace(BROKEN_WORD, gap => "\u00ad".repeat(gap.length))

// Groups sentences into chunks of at most maxChars, remembering which
// chunks start a new paragraph so the reader can keep the original layout
export const splitIntoChunks = (
  content: string,
  maxChars = 200
): TextChunk[] => {
  // A sentence ends at its punctuation, with any closing quotes or brackets,
  // when a space or the end follows; other periods (3.5, www.site.com,
  // ...and) stay inside it, so no text is ever left out
  const sentences = (
    joinBrokenWords(content).match(/[^]*?(?:[.!?]+["'”’»)\]]*(?=\s|$)|$)/g) ?? []
  ).filter(sentence => sentence !== "")
  const chunks: TextChunk[] = []
  let current = ""

  const pushChunk = (raw: string) => {
    const text = raw.trim()
    if (!text) return
    chunks.push({
      text,
      paragraphStart: chunks.length > 0 && /^\s*\n/.test(raw)
    })
  }

  for (const sentence of sentences) {
    if (current.concat(sentence).length > maxChars) {
      pushChunk(current)
      current = sentence
    } else {
      current += sentence
    }
  }
  pushChunk(current)

  return chunks
}
