import { describe, expect, it } from "vitest"
import { chunkIndexAt, chunkPage, wordSpans } from "../utils/pageChunks"
import { readPage } from "../utils/pageText"

const page = (markup: string) => {
  document.body.innerHTML = markup
  return readPage(document.body)
}

describe("chunkPage", () => {
  it("reads a heading on its own, then the sentences of the paragraph", () => {
    const text = page("<h1>Title</h1><p>One here. Two here.</p>")
    const chunks = chunkPage(text, 10)
    expect(chunks.map(chunk => chunk.text)).toEqual(["Title", "One here.", "Two here."])
  })

  it("tells where each chunk is in the page text", () => {
    const text = page("<h1>Title</h1><p>One here.</p>")
    for (const chunk of chunkPage(text)) {
      expect(text.text.slice(chunk.start, chunk.end)).toBe(chunk.text)
    }
  })
})

describe("chunkIndexAt", () => {
  it("finds the chunk an offset of the page falls in", () => {
    const text = page("<h1>Title</h1><p>One here.</p>")
    const chunks = chunkPage(text)
    expect(chunkIndexAt(chunks, text.text.indexOf("here"))).toBe(1)
    expect(chunkIndexAt(chunks, 0)).toBe(0)
  })

  it("is -1 past the last chunk", () => {
    const chunks = chunkPage(page("<p>One.</p>"))
    expect(chunkIndexAt(chunks, 99)).toBe(-1)
  })
})

describe("wordSpans", () => {
  it("places each spoken word on the page, with the time it starts", () => {
    const text = page("<h1>Title</h1><p>Say it now.</p>")
    const chunk = chunkPage(text)[1]
    const spans = wordSpans(chunk, [
      { text: "Say", start: 0, end: 0.3 },
      { text: "it", start: 0.3, end: 0.6 },
      { text: "now", start: 0.6, end: 0.9 }
    ])
    expect(spans.map(span => text.text.slice(span.start, span.end))).toEqual([
      "Say", "it", "now."
    ])
    expect(spans.map(span => span.time)).toEqual([0, 0.3, 0.6])
  })
})
