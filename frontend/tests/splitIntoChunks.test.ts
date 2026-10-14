import { describe, it, expect } from "vitest"
import { splitIntoChunks } from "../src/utils/splitIntoChunks"

describe("splitIntoChunks", () => {
  it("groups sentences into chunks no longer than maxChars", () => {
    const chunks = splitIntoChunks("One. Two. Three.", 10)

    expect(chunks.map(c => c.text)).toEqual(["One. Two.", "Three."])
  })

  it("keeps the whole content when it has no punctuation", () => {
    expect(splitIntoChunks("no punctuation here")).toEqual([
      { text: "no punctuation here", paragraphStart: false }
    ])
  })

  it("marks chunks that open a new paragraph", () => {
    const chunks = splitIntoChunks(
      "First paragraph is here.\n\nSecond paragraph. Still second.",
      26
    )

    expect(chunks).toEqual([
      { text: "First paragraph is here.", paragraphStart: false },
      { text: "Second paragraph.", paragraphStart: true },
      { text: "Still second.", paragraphStart: false }
    ])
  })

  it("never marks the first chunk as a paragraph start", () => {
    const chunks = splitIntoChunks("\n\nLeading break. Then text.")

    expect(chunks[0].paragraphStart).toBe(false)
  })

  it("drops empty chunks made only of whitespace", () => {
    const chunks = splitIntoChunks("Hello.   \n\n   ", 6)

    expect(chunks).toEqual([{ text: "Hello.", paragraphStart: false }])
  })
})
