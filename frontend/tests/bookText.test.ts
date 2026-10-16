import { describe, it, expect } from "vitest"
import { splitBookIntoChunks } from "../src/utils/bookText"

describe("splitBookIntoChunks", () => {
  it("never puts two paragraphs in the same chunk", () => {
    const chunks = splitBookIntoChunks("A heading\n\nThe first paragraph.")

    expect(chunks.map(c => c.text)).toEqual([
      "A heading",
      "The first paragraph."
    ])
    expect(chunks.map(c => c.paragraphStart)).toEqual([false, true])
  })

  it("turns marked paragraphs into headings, without the mark", () => {
    const chunks = splitBookIntoChunks(
      "# CHAPTER II.\nThe Pool of Tears\n\n## A section\n\nSome text."
    )

    expect(chunks.map(c => [c.text, c.block])).toEqual([
      ["CHAPTER II.\nThe Pool of Tears", "heading"],
      ["A section", "subheading"],
      ["Some text.", "paragraph"]
    ])
  })

  it("keeps a paragraph's line breaks, even between two chunks", () => {
    const chunks = splitBookIntoChunks(
      "How doth the little crocodile\nImprove his shining tail!\nAnd pour the waters of the Nile.",
      60
    )

    expect(chunks).toEqual([
      expect.objectContaining({
        text: "How doth the little crocodile\nImprove his shining tail!",
        lineStart: false
      }),
      expect.objectContaining({
        text: "And pour the waters of the Nile.",
        paragraphStart: false,
        lineStart: true
      })
    ])
  })

  it("keeps every chunk of a long heading a heading", () => {
    const chunks = splitBookIntoChunks(
      "# A very long heading. That goes on and on.\n\nText.",
      25
    )

    expect(chunks.map(c => [c.text, c.block])).toEqual([
      ["A very long heading.", "heading"],
      ["That goes on and on.", "heading"],
      ["Text.", "paragraph"]
    ])
  })
})
