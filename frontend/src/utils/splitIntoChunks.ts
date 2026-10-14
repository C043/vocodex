export type TextChunk = {
  text: string
  // True when this chunk opens a new paragraph in the original content
  paragraphStart: boolean
}

// Groups sentences into chunks of at most maxChars, remembering which
// chunks start a new paragraph so the reader can keep the original layout
export const splitIntoChunks = (
  content: string,
  maxChars = 200
): TextChunk[] => {
  const sentences = content.match(/[^.!?]+(?:[!?]|\.(?=\s|$)|$)/g) || [
    content
  ]
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
