import type { boundaryObj } from "../contexts/PlayerContext"
import { wordRanges } from "./pdfText"

// The spoken word at a time of the audio, given when each word starts. The
// word stays on through the pauses after it, and the first word shows before
// the voice reaches it, so a word is always highlighted
export const wordAt = (starts: number[], time: number) => {
  if (starts.length === 0) return -1
  let low = 0
  let high = starts.length - 1
  while (low < high) {
    const mid = (low + high + 1) >> 1
    if (starts[mid] <= time) low = mid
    else high = mid - 1
  }
  return low
}

// The word of the text each spoken word belongs to. The voice may say a word
// in parts, or say what is not written as is (numbers), so it is matched by
// text and never counted
export const alignBoundaries = (text: string, boundaries: boundaryObj[]) => {
  const words = wordRanges(text)
  const lower = text.toLowerCase()
  const wordFrom = (offset: number) => {
    const idx = words.findIndex(word => word.end > offset)
    return idx === -1 ? words.length - 1 : idx
  }

  let cursor = 0
  let last = -1
  return boundaries.map(boundary => {
    const spoken = boundary.text.toLowerCase()
    const found = spoken ? lower.indexOf(spoken, cursor) : -1
    let word: number
    if (found !== -1) {
      word = wordFrom(found)
      cursor = found + spoken.length
    } else {
      word = Math.min(last + 1, words.length - 1)
      cursor = Math.max(cursor, words[word]?.end ?? cursor)
    }
    last = Math.max(last, word)
    return last
  })
}
