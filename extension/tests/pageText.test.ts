import { describe, expect, it } from "vitest"
import { offsetOf, rangeOf, readPage, readingRoot } from "../utils/pageText"

const html = (markup: string) => {
  document.body.innerHTML = markup
  return document.body
}

describe("readPage", () => {
  it("joins the text of the page, one line per block", () => {
    const page = readPage(html("<h1>Title</h1><p>First <b>bold</b> line.</p><p>Second.</p>"))
    expect(page.text).toBe("Title\nFirst bold line.\nSecond.")
  })

  it("keeps each text node the same length, so offsets point into it", () => {
    const page = readPage(html("<p>one\n   two</p>"))
    expect(page.text).toBe("one    two")
  })

  it("tells where each block starts and ends", () => {
    const page = readPage(html("<h2>Head</h2><p>Body text.</p>"))
    expect(page.blocks).toEqual([
      { start: 0, end: 4, kind: "heading" },
      { start: 5, end: 15, kind: "paragraph" }
    ])
  })

  it("leaves out what is not read: scripts, styles, forms, hidden parts", () => {
    const page = readPage(
      html(
        "<p>Kept.</p><script>code()</script><style>p{}</style>" +
          "<textarea>typed</textarea><p hidden>gone</p>" +
          "<p aria-hidden='true'>gone</p><p style='display:none'>gone</p>"
      )
    )
    expect(page.text).toBe("Kept.")
  })

  it("skips blocks with no text", () => {
    const page = readPage(html("<p>A.</p><div>  </div><p>B.</p>"))
    expect(page.text).toBe("A.\nB.")
    expect(page.blocks).toHaveLength(2)
  })
})

describe("rangeOf", () => {
  it("covers the words of the page, across text nodes", () => {
    const page = readPage(html("<p>First <b>bold</b> line.</p>"))
    expect(rangeOf(page, 3, 10)?.toString()).toBe("st bold")
  })

  it("starts in the next block when the start is a line between blocks", () => {
    const page = readPage(html("<p>One.</p><p>Two.</p>"))
    expect(rangeOf(page, 4, 9)?.toString()).toBe("Two.")
  })

  it("is null outside the text", () => {
    const page = readPage(html("<p>One.</p>"))
    expect(rangeOf(page, 10, 12)).toBeNull()
  })
})

describe("offsetOf", () => {
  it("finds the page offset of a point in a text node", () => {
    const body = html("<p>One.</p><p>Two <i>words</i>.</p>")
    const page = readPage(body)
    const words = body.querySelector("i")!.firstChild!
    expect(offsetOf(page, words, 2)).toBe(page.text.indexOf("words") + 2)
  })

  it("is -1 for a node that is not read", () => {
    const body = html("<p>One.</p><script>x</script>")
    const page = readPage(body)
    expect(offsetOf(page, body.querySelector("script")!.firstChild!, 0)).toBe(-1)
  })
})

describe("readingRoot", () => {
  it("reads the article when the page has one", () => {
    html("<nav>Menu</nav><article><p>Story.</p></article>")
    expect(readingRoot(document).tagName).toBe("ARTICLE")
  })

  it("falls back to the main content, then to the whole body", () => {
    html("<nav>Menu</nav><main><p>Story.</p></main>")
    expect(readingRoot(document).tagName).toBe("MAIN")
    html("<p>Story.</p>")
    expect(readingRoot(document)).toBe(document.body)
  })
})
