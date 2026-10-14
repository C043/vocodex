import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ComponentProps } from "react"
import { render, screen, waitFor, fireEvent } from "@testing-library/react"
import PdfPageView from "../src/components/player/PdfPageView"
import { measureRanges } from "../src/utils/highlightRects"

const textLayers: FakeTextLayer[] = []

class FakeTextLayer {
  container: HTMLElement
  textDivs: HTMLElement[] = []
  cancel = vi.fn()
  constructor({ container }: { container: HTMLElement }) {
    this.container = container
    textLayers.push(this)
  }
  async render() {
    for (const text of ["Hello", " world"]) {
      const span = document.createElement("span")
      span.textContent = text
      this.container.append(span)
      this.textDivs.push(span)
    }
  }
}

vi.mock("pdfjs-dist", () => ({
  TextLayer: class {
    constructor(params: { container: HTMLElement }) {
      return new FakeTextLayer(params)
    }
  }
}))

vi.mock("../src/utils/highlightRects", () => ({
  measureRanges: vi.fn(() => [])
}))

const renderTask = { promise: Promise.resolve(), cancel: vi.fn() }
const page = {
  getViewport: vi.fn(({ scale }: { scale: number }) => ({
    width: 600 * scale,
    height: 800 * scale,
    scale
  })),
  render: vi.fn(() => renderTask),
  streamTextContent: vi.fn(() => "text stream"),
  cleanup: vi.fn()
}
const doc = { getPage: vi.fn(async () => page) }

type Props = ComponentProps<typeof PdfPageView>

const makeProps = (overrides: Partial<Props> = {}): Props => ({
  doc: doc as never,
  pageNumber: 4,
  width: 600,
  height: 800,
  scale: 1,
  isActive: true,
  chunkRanges: [],
  wordRanges: [],
  onTextClick: vi.fn(),
  ...overrides
})

describe("PdfPageView", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    textLayers.length = 0
  })

  it("keeps the size of the page while it is not shown", () => {
    render(<PdfPageView {...makeProps({ isActive: false, scale: 1.5 })} />)

    const pageEl = screen.getByRole("region", { name: "Page 4" })
    expect(pageEl.style.width).toBe("900px")
    expect(pageEl.style.height).toBe("1200px")
    expect(pageEl.querySelector("canvas")).toBeNull()
    expect(doc.getPage).not.toHaveBeenCalled()
  })

  it("draws the page and its text layer when shown", async () => {
    const { container } = render(<PdfPageView {...makeProps({ scale: 2 })} />)

    await waitFor(() => expect(textLayers).toHaveLength(1))
    expect(doc.getPage).toHaveBeenCalledWith(4)
    expect(page.getViewport).toHaveBeenCalledWith({ scale: 2 })
    const canvas = container.querySelector("canvas")
    expect(page.render).toHaveBeenCalledWith(
      expect.objectContaining({ canvas })
    )
    expect(textLayers[0].container).toHaveClass("textLayer")
  })

  it("stops drawing and frees the page when it is not needed anymore", async () => {
    const { rerender, container } = render(<PdfPageView {...makeProps()} />)
    await waitFor(() => expect(textLayers).toHaveLength(1))

    rerender(<PdfPageView {...makeProps({ isActive: false })} />)

    expect(renderTask.cancel).toHaveBeenCalled()
    expect(textLayers[0].cancel).toHaveBeenCalled()
    expect(page.cleanup).toHaveBeenCalled()
    expect(container.querySelector("canvas")).toBeNull()
  })

  it("tells which text item was clicked", async () => {
    const onTextClick = vi.fn()
    render(<PdfPageView {...makeProps({ onTextClick })} />)
    await waitFor(() => expect(textLayers[0]?.textDivs).toHaveLength(2))

    fireEvent.click(screen.getByText("world"))

    expect(onTextClick).toHaveBeenCalledWith(1)
  })

  it("highlights the chunk and the word being read", async () => {
    vi.mocked(measureRanges).mockImplementation((_, ranges) =>
      ranges.map(range => ({
        left: range.item * 100,
        top: 10,
        width: 50,
        height: 12
      }))
    )
    const onChunkShown = vi.fn()
    const { container } = render(
      <PdfPageView
        {...makeProps({
          chunkRanges: [
            { item: 0, from: 0, to: 5 },
            { item: 1, from: 0, to: 6 }
          ],
          wordRanges: [{ item: 1, from: 1, to: 6 }],
          onChunkShown
        })}
      />
    )

    await waitFor(() =>
      expect(container.querySelectorAll("[data-highlight=chunk]")).toHaveLength(
        2
      )
    )
    const word = container.querySelector<HTMLElement>("[data-highlight=word]")
    expect(word?.style.left).toBe("100px")
    expect(word?.style.width).toBe("50px")
    // Looks like the light theme word of the text reader, in either theme:
    // the drawn glyphs are inverted to white, then laid on the brand gradient
    const invert = word?.querySelector(".mix-blend-difference")
    const brand = word?.querySelector(".mix-blend-screen")
    expect(invert).toHaveClass("bg-white")
    expect(brand).toHaveClass("bg-brand")
    expect(invert?.compareDocumentPosition(brand!)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
    expect(container.querySelector('[class*="dark:"]')).toBeNull()
    // The blend modes mix within the page only: blending into the whole app
    // makes the glass bars over it lose their blur as the word moves
    expect(container.querySelector("section")).toHaveClass("isolate")
    expect(measureRanges).toHaveBeenCalledWith(
      textLayers[0].textDivs,
      expect.any(Array),
      expect.objectContaining({ left: expect.any(Number) })
    )
    await waitFor(() =>
      expect(onChunkShown).toHaveBeenCalledWith(
        container.querySelector("[data-highlight=chunk]")
      )
    )
  })

  it("shows the chunk again after zooming, so it can be followed", async () => {
    vi.mocked(measureRanges).mockImplementation((_, ranges) =>
      ranges.map(() => ({ left: 0, top: 10, width: 50, height: 12 }))
    )
    const onChunkShown = vi.fn()
    const props = makeProps({
      chunkRanges: [{ item: 0, from: 0, to: 5 }],
      onChunkShown
    })
    const { rerender } = render(<PdfPageView {...props} />)
    await waitFor(() => expect(onChunkShown).toHaveBeenCalledTimes(1))

    rerender(<PdfPageView {...props} scale={2} />)

    await waitFor(() => expect(onChunkShown).toHaveBeenCalledTimes(2))
  })

  it("does not show the same chunk again when nothing changed", async () => {
    vi.mocked(measureRanges).mockImplementation((_, ranges) =>
      ranges.map(() => ({ left: 0, top: 10, width: 50, height: 12 }))
    )
    const onChunkShown = vi.fn()
    const props = makeProps({
      chunkRanges: [{ item: 0, from: 0, to: 5 }],
      onChunkShown
    })
    const { rerender } = render(<PdfPageView {...props} />)
    await waitFor(() => expect(onChunkShown).toHaveBeenCalledTimes(1))

    rerender(<PdfPageView {...props} wordRanges={[{ item: 0, from: 0, to: 2 }]} />)
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(onChunkShown).toHaveBeenCalledTimes(1)
  })

  it("draws no highlight on the other pages", async () => {
    const { container } = render(<PdfPageView {...makeProps()} />)
    await waitFor(() => expect(textLayers).toHaveLength(1))

    expect(container.querySelector("[data-highlight]")).toBeNull()
  })
})
