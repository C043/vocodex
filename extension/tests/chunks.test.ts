import { describe, expect, it } from "vitest"
import { chunkText, wordRanges } from "../utils/chunks"

describe("chunkText", () => {
  it("splits the text into chunks that know where they are in it", () => {
    const text = "First sentence here. Second one!\nThird."
    const chunks = chunkText(text, 15)

    expect(chunks.map(c => c.text)).toEqual([
      "First sentence here.",
      "Second one!",
      "Third."
    ])
    for (const chunk of chunks) {
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.text)
    }
  })

  it("reads the lines of a sentence as one, without the line breaks", () => {
    const text = "A sentence that\nwraps over\nthree lines. Next."
    const chunks = chunkText(text)

    expect(chunks.map(c => c.text)).toEqual([
      "A sentence that wraps over three lines. Next."
    ])
    // Same length as the text it comes from, so word offsets still match
    expect(chunks[0].end - chunks[0].start).toBe(chunks[0].text.length)
  })

  it("keeps a word broken over two lines by a hyphen whole", () => {
    const text = "It is self-\nhosted. Next."
    const chunks = chunkText(text)

    expect(chunks.map(c => c.text)).toEqual(["It is self-­hosted. Next."])
    expect(chunks[0].start).toBe(0)
    expect(chunks[0].end).toBe(text.length)
  })

  it("never lets a chunk run over two blocks", () => {
    // A heading has no period to end it
    const text = "Chapter One\nIt begins. It ends."
    const chunks = chunkText(text, 200, [
      { start: 0, end: 12, kind: "heading" },
      { start: 12, end: text.length, kind: "paragraph" }
    ])

    expect(chunks.map(c => [c.text, c.block])).toEqual([
      ["Chapter One", 0],
      ["It begins. It ends.", 1]
    ])
    for (const chunk of chunks) {
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.text)
    }
  })

  it("returns no chunks for a text without words", () => {
    expect(chunkText("  \n ")).toEqual([])
  })
})

describe("wordRanges", () => {
  it("returns the range of each spoken word, skipping punctuation", () => {
    const text = "Hi — it's me, 42!"
    expect(wordRanges(text).map(r => text.slice(r.start, r.end))).toEqual([
      "Hi",
      "it's",
      "me,",
      "42!"
    ])
  })

  it("counts words without ASCII letters, like Italian è", () => {
    const text = "La città è bella"
    expect(wordRanges(text).map(r => text.slice(r.start, r.end))).toEqual([
      "La",
      "città",
      "è",
      "bella"
    ])
  })
})
