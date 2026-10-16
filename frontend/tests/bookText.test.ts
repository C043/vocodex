import { describe, it, expect } from "vitest"
import { splitBookIntoChunks } from "../src/utils/bookText"
import type { Book } from "../src/utils/bookText"

const imageSrc = (id: number) => `/images/${id}`
const split = (book: Book, maxChars?: number) =>
  splitBookIntoChunks(book, imageSrc, maxChars)

const para = (text: string) => ({ kind: "paragraph" as const, text })

describe("splitBookIntoChunks", () => {
  it("never puts two blocks in the same chunk", () => {
    const chunks = split({
      blocks: [{ kind: "heading", text: "A heading" }, para("The first one.")]
    })

    expect(chunks.map(c => c.text)).toEqual(["A heading", "The first one."])
    expect(chunks.map(c => c.paragraphStart)).toEqual([false, true])
  })

  it("keeps the kind of each block", () => {
    const chunks = split({
      blocks: [
        { kind: "heading", text: "CHAPTER II.\nThe Pool of Tears" },
        { kind: "subheading", text: "A section" },
        para("# Not a heading.")
      ]
    })

    expect(chunks.map(c => [c.text, c.block])).toEqual([
      ["CHAPTER II.\nThe Pool of Tears", "heading"],
      ["A section", "subheading"],
      ["# Not a heading.", "paragraph"]
    ])
  })

  it("keeps a block's line breaks, even between two chunks", () => {
    const chunks = split(
      {
        blocks: [
          para(
            "How doth the little crocodile\nImprove his shining tail!\nAnd pour the waters of the Nile."
          )
        ]
      },
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
    const chunks = split(
      {
        blocks: [
          {
            kind: "heading",
            text: "A very long heading. That goes on and on."
          },
          para("Text.")
        ]
      },
      25
    )

    expect(chunks.map(c => [c.text, c.block])).toEqual([
      ["A very long heading.", "heading"],
      ["That goes on and on.", "heading"],
      ["Text.", "paragraph"]
    ])
  })

  it("gives each chunk the styles of its own text", () => {
    const chunks = split(
      {
        blocks: [
          {
            kind: "paragraph",
            text: "It was in April. She was very bold.",
            styles: [
              { start: 10, end: 15, style: "italic" },
              // Across both chunks
              { start: 13, end: 25, style: "bold" }
            ]
          }
        ]
      },
      20
    )

    expect(chunks.map(c => [c.text, c.styles])).toEqual([
      [
        "It was in April.",
        [
          { start: 10, end: 15, style: "italic" },
          { start: 13, end: 16, style: "bold" }
        ]
      ],
      ["She was very bold.", [{ start: 0, end: 8, style: "bold" }]]
    ])
  })

  it("shows breaks and images around the chunks without reading them", () => {
    const chunks = split({
      blocks: [
        { kind: "image", image: 0, alt: "" },
        para("First."),
        { kind: "break" },
        { kind: "image", image: 3, alt: "A rabbit" },
        para("Second."),
        { kind: "image", image: 4, alt: "The end" }
      ]
    })

    expect(chunks.map(c => [c.text, c.before, c.after])).toEqual([
      ["First.", [{ kind: "image", src: "/images/0", alt: "" }], []],
      [
        "Second.",
        [
          { kind: "break" },
          { kind: "image", src: "/images/3", alt: "A rabbit" }
        ],
        [{ kind: "image", src: "/images/4", alt: "The end" }]
      ]
    ])
  })
})
