import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { ComponentProps } from "react"
import { render, screen, fireEvent, act, within } from "@testing-library/react"
import PdfTextContent from "../src/components/player/PdfTextContent"
import { PlayerContext } from "../src/contexts/PlayerContext"
import type { PdfPage } from "../src/hooks/usePdfDocument"
import { chunkPageText } from "../src/utils/pdfText"

type PlayerValue = NonNullable<
  ComponentProps<typeof PlayerContext.Provider>["value"]
>

const makePage = (pageNumber: number, text: string): PdfPage => ({
  pageNumber,
  width: 600,
  height: 800,
  text: { text, itemStarts: [0] },
  itemStrs: [text],
  chunks: chunkPageText(pageNumber, text, 20)
})

// Pages 1 and 2 loaded, 3 not yet. Lines break mid-sentence, like in PDFs
const page1 = makePage(1, "First page\nopens. It ends.")
const page2 = makePage(2, "Second page here.")

const makeValue = (overrides: Partial<PlayerValue> = {}): PlayerValue =>
  ({
    title: "A book",
    kind: "pdf",
    pdfView: "text",
    pdf: {
      doc: { numPages: 3 },
      numPages: 3,
      pages: new Map([
        [2, page2],
        [1, page1]
      ]),
      defaultPageSize: { width: 600, height: 800 },
      loadPage: vi.fn(async () => null)
    },
    sentencesMap: new Map(),
    // "Second page here." on page 2
    currentIndex: 10000,
    activeWordIndex: -1,
    setCurrentIndex: vi.fn(),
    isLoading: false,
    currentFontSize: 1,
    isAutoScroll: true,
    ...overrides
  }) as PlayerValue

const renderContent = (value: PlayerValue) => {
  const ui = (v: PlayerValue) => (
    <PlayerContext.Provider value={v}>
      <PdfTextContent />
    </PlayerContext.Provider>
  )
  const utils = render(ui(value))
  return { ...utils, update: (v: PlayerValue) => utils.rerender(ui(v)) }
}

const chunk = (text: string) =>
  screen.getByText(
    (_, el) => !!el?.matches("[data-chunk-id]") && el.textContent === text
  )

describe("PdfTextContent", () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockClear()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("shows the title and every page, in order", () => {
    renderContent(makeValue())

    expect(screen.getByRole("heading", { name: "A book" })).toBeInTheDocument()
    expect(screen.getAllByRole("region").map(el => el.ariaLabel)).toEqual([
      "Page 1",
      "Page 2",
      "Page 3"
    ])
  })

  it("shows the text of the loaded pages as flowing text, without the PDF line breaks", () => {
    renderContent(makeValue())

    const page = screen.getByRole("region", { name: "Page 1" })
    expect(page).toHaveTextContent("First page opens. It ends.")
    expect(chunk("First page opens.").closest("p")).toBe(
      chunk("It ends.").closest("p")
    )
  })

  it("marks the chunk being read", () => {
    renderContent(makeValue())

    expect(chunk("Second page here.")).toHaveAttribute("aria-current", "true")
    expect(chunk("First page opens.")).not.toHaveAttribute("aria-current")
  })

  it("highlights the word being spoken", () => {
    renderContent(makeValue({ activeWordIndex: 1 }))

    const reading = within(chunk("Second page here."))
    expect(reading.getByText("page")).toHaveClass("bg-brand")
    expect(reading.getByText("Second")).not.toHaveClass("bg-brand")
    // Only in the chunk being read
    expect(within(chunk("First page opens.")).getByText("page")).not.toHaveClass(
      "bg-brand"
    )
  })

  it("jumps to a chunk when clicked", () => {
    const value = makeValue()
    renderContent(value)

    fireEvent.click(chunk("It ends."))

    expect(value.setCurrentIndex).toHaveBeenCalledWith(1)
  })

  it("does not jump while loading", () => {
    const value = makeValue({ isLoading: true })
    renderContent(value)

    fireEvent.click(chunk("It ends."))

    expect(value.setCurrentIndex).not.toHaveBeenCalled()
  })

  it("uses the reader font size", () => {
    renderContent(makeValue({ currentFontSize: 3 }))

    expect(chunk("It ends.").closest("p")).toHaveClass("text-2xl")
  })

  it("keeps the chunk being read on screen", () => {
    renderContent(makeValue())

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toBe(chunk("Second page here."))
  })

  it("follows the reading when it moves on", () => {
    const { update } = renderContent(makeValue())

    update(makeValue({ currentIndex: 1 }))

    expect(scrollIntoView.mock.contexts.at(-1)).toBe(chunk("It ends."))
  })

  it("does not scroll when auto scroll is off", () => {
    renderContent(makeValue({ isAutoScroll: false }))

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("scrolls to the chunk once its page has loaded", () => {
    const value = makeValue({ currentIndex: 20000 })
    const { update } = renderContent(value)
    expect(scrollIntoView).not.toHaveBeenCalled()

    const page3 = makePage(3, "Third page.")
    update(
      makeValue({
        currentIndex: 20000,
        pdf: {
          ...value.pdf,
          pages: new Map([...value.pdf.pages, [3, page3]])
        }
      })
    )

    expect(scrollIntoView.mock.contexts.at(-1)).toBe(chunk("Third page."))
  })

  it("loads the pages scrolled into view", () => {
    let observe: IntersectionObserverCallback = () => {}
    const observed: Element[] = []
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          observe = callback
        }
        observe(el: Element) {
          observed.push(el)
        }
        unobserve() {}
        disconnect() {}
      }
    )
    const value = makeValue()
    renderContent(value)

    const page3 = screen.getByRole("region", { name: "Page 3" })
    expect(observed).toContain(page3)
    act(() =>
      observe(
        [
          {
            target: page3,
            isIntersecting: true
          } as unknown as IntersectionObserverEntry
        ],
        {} as IntersectionObserver
      )
    )

    expect(value.pdf.loadPage).toHaveBeenCalledWith(3)
  })
})
