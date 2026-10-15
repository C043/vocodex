import { describe, it, expect } from "vitest"
import {
  buildPageText,
  chunkAtOffset,
  chunkId,
  chunkPageText,
  marginLineKeys,
  pageOfChunk,
  textRangeToItems,
  wordRanges
} from "../src/utils/pdfText"
import type { PdfTextItem } from "../src/utils/pdfText"

const PAGE_HEIGHT = 800

// A text item drawn with its baseline at y (PDF origin is the bottom left)
const item = (str: string, y: number, hasEOL = false): PdfTextItem => ({
  str,
  hasEOL,
  transform: [12, 0, 0, 12, 72, y]
})

// A whole line drawn with a font size
const line = (str: string, y: number, size = 12): PdfTextItem => ({
  str,
  hasEOL: true,
  transform: [size, 0, 0, size, 72, y]
})

const body = (str: string, hasEOL = true) => item(str, 400, hasEOL)
const header = (str: string) => item(str, 780, true)
const footer = (str: string) => item(str, 20, true)

describe("chunk ids", () => {
  it("encode the page and the position of the chunk in the page", () => {
    expect(chunkId(1, 0)).toBe(0)
    expect(chunkId(1, 7)).toBe(7)
    expect(chunkId(3, 2)).toBe(20002)
  })

  it("can be decoded back to their page", () => {
    expect(pageOfChunk(0)).toBe(1)
    expect(pageOfChunk(7)).toBe(1)
    expect(pageOfChunk(20002)).toBe(3)
  })
})

describe("buildPageText", () => {
  it("joins the items, putting a line break where a line ends", () => {
    const { text, itemStarts } = buildPageText(
      [item("Hello", 400), item(" world.", 400, true), body("Next line.")],
      PAGE_HEIGHT
    )

    expect(text).toBe("Hello world.\nNext line.\n")
    expect(itemStarts).toEqual([0, 5, 13])
  })

  it("drops bare page numbers in the margins", () => {
    const { text, itemStarts } = buildPageText(
      [body("Some text."), footer("12")],
      PAGE_HEIGHT
    )

    expect(text).toBe("Some text.\n")
    expect(itemStarts).toEqual([0, -1])
  })

  it.each(["iv", "Page 3", "Page 3 of 10", "- 7 -", "3 / 10"])(
    "recognizes %s as a page number",
    number => {
      const { text } = buildPageText(
        [header(number), body("Body.")],
        PAGE_HEIGHT
      )
      expect(text).toBe("Body.\n")
    }
  )

  it("keeps page number looking text in the body", () => {
    const { text } = buildPageText([body("12")], PAGE_HEIGHT)
    expect(text).toBe("12\n")
  })

  it("drops margin lines repeated on the neighbor pages", () => {
    const neighbor = marginLineKeys(
      [header("A Study of Things — Chapter 2"), body("Other body.")],
      PAGE_HEIGHT
    )

    const { text } = buildPageText(
      [header("A Study of Things — Chapter 3"), body("Body.")],
      PAGE_HEIGHT,
      [neighbor]
    )

    expect(text).toBe("Body.\n")
  })

  it("keeps margin lines that only appear on this page", () => {
    const neighbor = marginLineKeys([header("Running title")], PAGE_HEIGHT)

    const { text } = buildPageText(
      [header("A heading at the very top"), body("Body.")],
      PAGE_HEIGHT,
      [neighbor]
    )

    expect(text).toBe("A heading at the very top\nBody.\n")
  })

  it("groups the items of the same margin line", () => {
    const keys = marginLineKeys(
      [item("Chapter", 780), item(" 4", 780, true), body("Body")],
      PAGE_HEIGHT
    )
    expect([...keys]).toEqual(["chapter #"])
  })
})

describe("page blocks", () => {
  const blocksOf = (items: PdfTextItem[]) => {
    const { text, blocks } = buildPageText(items, PAGE_HEIGHT)
    return blocks.map(block => ({
      kind: block.kind,
      text: text.slice(block.start, block.end)
    }))
  }

  it("keeps the close lines of the body text in one paragraph", () => {
    expect(
      blocksOf([line("A sentence that", 500), line("wraps.", 486)])
    ).toEqual([{ kind: "paragraph", text: "A sentence that\nwraps.\n" }])
  })

  it("starts a new paragraph after a wider gap between lines", () => {
    expect(
      blocksOf([
        line("First paragraph.", 500),
        line("Second paragraph", 470),
        line("goes on.", 456)
      ])
    ).toEqual([
      { kind: "paragraph", text: "First paragraph.\n" },
      { kind: "paragraph", text: "Second paragraph\ngoes on.\n" }
    ])
  })

  it("tells the headings by their larger font", () => {
    expect(
      blocksOf([
        line("Chapter One", 600, 24),
        line("The Beginning", 560, 15),
        line("It was a dark", 530),
        line("night.", 516)
      ])
    ).toEqual([
      { kind: "heading", text: "Chapter One\n" },
      { kind: "subheading", text: "The Beginning\n" },
      { kind: "paragraph", text: "It was a dark\nnight.\n" }
    ])
  })

  it("keeps a heading on two lines together", () => {
    expect(
      blocksOf([
        line("A Very Long", 600, 24),
        line("Chapter Title", 572, 24),
        line("The body text of the chapter.", 530)
      ])
    ).toEqual([
      { kind: "heading", text: "A Very Long\nChapter Title\n" },
      { kind: "paragraph", text: "The body text of the chapter.\n" }
    ])
  })

  it("measures the body size by the amount of text, not by line count", () => {
    expect(
      blocksOf([
        line("Big", 600, 24),
        line("Big", 570, 24),
        line("Plenty of body text on this line.", 530),
        line("Some more.", 516)
      ]).map(block => block.kind)
    ).toEqual(["heading", "paragraph"])
  })

  it("leaves the dropped margin lines out", () => {
    expect(blocksOf([line("Body.", 400), line("12", 20)])).toEqual([
      { kind: "paragraph", text: "Body.\n" }
    ])
  })
})

describe("chunkPageText", () => {
  it("splits the page into chunks that know where they are in the text", () => {
    const text = "First sentence here. Second one!\nThird."
    const chunks = chunkPageText(2, text, 15)

    expect(chunks.map(c => c.text)).toEqual([
      "First sentence here.",
      "Second one!",
      "Third."
    ])
    expect(chunks.map(c => c.id)).toEqual([10000, 10001, 10002])
    for (const chunk of chunks) {
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.text)
    }
  })

  it("reads the lines of a sentence as one, without the line breaks", () => {
    // The voice pauses on line breaks, but a PDF breaks lines mid-sentence
    const text = "A sentence that\nwraps over\nthree lines. Next."
    const chunks = chunkPageText(1, text)

    expect(chunks.map(c => c.text)).toEqual([
      "A sentence that wraps over three lines. Next."
    ])
    // Same length as the page text it comes from, so word offsets still match
    expect(chunks[0].end - chunks[0].start).toBe(chunks[0].text.length)
  })

  it("keeps a word broken over two lines by a hyphen whole", () => {
    const text = "It is self-\nhosted. Next."
    const chunks = chunkPageText(1, text)

    expect(chunks.map(c => c.text)).toEqual(["It is self-\u00adhosted. Next."])
    expect(chunks[0].start).toBe(0)
    expect(chunks[0].end).toBe(text.length)
  })

  it("never lets a chunk run over two blocks", () => {
    // A heading has no period to end it
    const text = "Chapter One\nIt begins. It ends."
    const chunks = chunkPageText(1, text, 200, [
      { start: 0, end: 12, kind: "heading" },
      { start: 12, end: text.length, kind: "paragraph" }
    ])

    expect(chunks.map(c => [c.text, c.block])).toEqual([
      ["Chapter One", 0],
      ["It begins. It ends.", 1]
    ])
    expect(chunks.map(c => c.id)).toEqual([0, 1])
    for (const chunk of chunks) {
      expect(text.slice(chunk.start, chunk.end)).toBe(chunk.text)
    }
  })

  it("returns no chunks for a page without text", () => {
    expect(chunkPageText(1, "  \n ")).toEqual([])
  })
})

describe("chunkAtOffset", () => {
  const chunks = chunkPageText(1, "One two. Three four.", 10)

  it("finds the chunk containing a text offset", () => {
    expect(chunkAtOffset(chunks, 0)?.text).toBe("One two.")
    expect(chunkAtOffset(chunks, 12)?.text).toBe("Three four.")
  })

  it("picks the following chunk for the space between two chunks", () => {
    expect(chunkAtOffset(chunks, 8)?.text).toBe("Three four.")
  })

  it("returns undefined past the last chunk", () => {
    expect(chunkAtOffset(chunks, 100)).toBeUndefined()
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

describe("textRangeToItems", () => {
  const strs = ["Hello", " world.", "Skipped", "Next"]
  const starts = [0, 5, -1, 13]

  it("maps a text range to the parts of the items it covers", () => {
    expect(textRangeToItems(starts, strs, 3, 9)).toEqual([
      { item: 0, from: 3, to: 5 },
      { item: 1, from: 0, to: 4 }
    ])
  })

  it("ignores the items left out of the text", () => {
    expect(textRangeToItems(starts, strs, 12, 17)).toEqual([
      { item: 3, from: 0, to: 4 }
    ])
  })
})
