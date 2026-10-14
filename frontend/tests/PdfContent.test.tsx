import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { ComponentProps } from "react"
import { render, screen, act } from "@testing-library/react"
import PdfContent from "../src/components/player/PdfContent"
import PdfPageView from "../src/components/player/PdfPageView"
import { PlayerContext } from "../src/contexts/PlayerContext"
import type { PdfPage } from "../src/hooks/usePdfDocument"
import { chunkPageText } from "../src/utils/pdfText"

type PageProps = ComponentProps<typeof PdfPageView>
const pageProps = new Map<number, PageProps>()

vi.mock("../src/components/player/PdfPageView", () => ({
  default: (props: PageProps) => {
    pageProps.set(props.pageNumber, props)
    return (
      <section
        aria-label={`Page ${props.pageNumber}`}
        ref={props.pageRef}
      />
    )
  }
}))

type PlayerValue = NonNullable<
  ComponentProps<typeof PlayerContext.Provider>["value"]
>

// Page 2 text: three items, the middle one is a skipped running header
const page2Text = "Hello world. Bye now."
const page2: PdfPage = {
  pageNumber: 2,
  width: 500,
  height: 700,
  text: { text: page2Text, itemStarts: [0, -1, 6] },
  itemStrs: ["Hello ", "Header", "world. Bye now."],
  chunks: chunkPageText(2, page2Text, 12)
}

const makeValue = (overrides: Partial<PlayerValue> = {}): PlayerValue =>
  ({
    title: "A book",
    kind: "pdf",
    pdf: {
      doc: { numPages: 5 },
      numPages: 5,
      pages: new Map([[2, page2]]),
      defaultPageSize: { width: 600, height: 800 },
      loadPage: vi.fn(async () => null)
    },
    sentencesMap: new Map(),
    // "Hello world." on page 2
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
      <PdfContent />
    </PlayerContext.Provider>
  )
  const utils = render(ui(value))
  return { ...utils, update: (v: PlayerValue) => utils.rerender(ui(v)) }
}

describe("PdfContent", () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    pageProps.clear()
    scrollIntoView.mockClear()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("shows the title and every page, one under the other", () => {
    renderContent(makeValue())

    expect(screen.getByRole("heading", { name: "A book" })).toBeInTheDocument()
    expect(screen.getAllByRole("region").map(el => el.ariaLabel)).toEqual([
      "Page 1",
      "Page 2",
      "Page 3",
      "Page 4",
      "Page 5"
    ])
  })

  it("sizes the loaded pages with their own size, the others with the first page size", () => {
    renderContent(makeValue())

    expect(pageProps.get(2)).toMatchObject({ width: 500, height: 700 })
    expect(pageProps.get(4)).toMatchObject({ width: 600, height: 800 })
  })

  it("fits the pages to the width, zooming with the size controls", () => {
    const { update } = renderContent(makeValue())
    const fitted = pageProps.get(4)!.scale

    update(makeValue({ currentFontSize: 2 }))

    expect(pageProps.get(4)!.scale).toBeCloseTo(fitted * 1.25)
  })

  it("lets zoomed pages grow past the reading column", () => {
    renderContent(makeValue({ currentFontSize: 4 }))

    const heading = screen.getByRole("heading", { name: "A book" })
    const page = screen.getByRole("region", { name: "Page 2" })
    const column = heading.closest("[data-reading-column]")
    expect(column).not.toBeNull()
    // The page box itself gets bigger, it is not clipped by the column
    expect(column!.contains(page)).toBe(false)
  })

  describe("with measured widths", () => {
    const original = Object.getOwnPropertyDescriptor(
      Element.prototype,
      "clientWidth"
    )!

    beforeEach(() => {
      // jsdom has no layout: a 600px reading column in a 1000px pages area
      Object.defineProperty(Element.prototype, "clientWidth", {
        configurable: true,
        get(this: Element) {
          if (this.hasAttribute("data-reading-column")) return 600
          if (this.hasAttribute("data-pages-area")) return 1000
          return 0
        }
      })
    })

    afterEach(() => {
      Object.defineProperty(Element.prototype, "clientWidth", original)
    })

    const pageWidth = (page: number) =>
      pageProps.get(page)!.width * pageProps.get(page)!.scale

    it("fits the pages to the reading column at zoom 1", () => {
      renderContent(makeValue())
      expect(pageWidth(4)).toBeCloseTo(600)
    })

    it("grows the pages when zooming", () => {
      renderContent(makeValue({ currentFontSize: 2 }))
      expect(pageWidth(4)).toBeCloseTo(750)
    })

    it("never makes a page wider than the screen", () => {
      renderContent(makeValue({ currentFontSize: 4 }))
      expect(pageWidth(4)).toBeCloseTo(1000)
      expect(pageWidth(2)).toBeCloseTo(1000)
    })
  })

  it("centers the pages", () => {
    renderContent(makeValue({ currentFontSize: 4 }))

    const area = screen
      .getByRole("region", { name: "Page 2" })
      .closest("[data-pages-area]")
    expect(area).toHaveClass("items-center")
    expect(area).toHaveClass("overflow-x-clip")
  })

  it("draws only the page being read and the ones around it", () => {
    renderContent(makeValue())

    const active = [...pageProps.values()]
      .filter(props => props.isActive)
      .map(props => props.pageNumber)
    expect(active).toEqual([1, 2, 3])
  })

  it("also draws and loads the pages scrolled into view", () => {
    let observe: IntersectionObserverCallback = () => {}
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: IntersectionObserverCallback) {
          observe = callback
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    )
    const value = makeValue()
    renderContent(value)

    act(() =>
      observe(
        [
          {
            isIntersecting: true,
            target: screen.getByRole("region", { name: "Page 5" })
          } as unknown as IntersectionObserverEntry
        ],
        {} as IntersectionObserver
      )
    )

    expect(pageProps.get(5)!.isActive).toBe(true)
    expect(value.pdf.loadPage).toHaveBeenCalledWith(5)
  })

  it("watches the pages that appear after the first page size is known", () => {
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
    const loading = makeValue()
    const { update } = renderContent({
      ...loading,
      pdf: { ...loading.pdf, defaultPageSize: null }
    })
    expect(screen.queryAllByRole("region")).toHaveLength(0)

    update(loading)

    const page5 = screen.getByRole("region", { name: "Page 5" })
    expect(observed).toContain(page5)
    act(() =>
      observe(
        [
          {
            isIntersecting: true,
            target: page5
          } as unknown as IntersectionObserverEntry
        ],
        {} as IntersectionObserver
      )
    )
    expect(pageProps.get(5)!.isActive).toBe(true)
  })

  it("does not watch the pages again on every rerender", () => {
    const observe = vi.fn()
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        observe = observe
        unobserve() {}
        disconnect() {}
      }
    )
    const { update } = renderContent(makeValue())
    const calls = observe.mock.calls.length

    update(makeValue({ activeWordIndex: 1 }))

    expect(observe).toHaveBeenCalledTimes(calls)
  })

  it("highlights the chunk being read on its page only", () => {
    renderContent(makeValue())

    // "Hello world." spans the first item and the start of the third
    expect(pageProps.get(2)!.chunkRanges).toEqual([
      { item: 0, from: 0, to: 6 },
      { item: 2, from: 0, to: 6 }
    ])
    expect(pageProps.get(1)!.chunkRanges).toEqual([])
    expect(pageProps.get(2)!.wordRanges).toEqual([])
  })

  it("highlights the word being read", () => {
    renderContent(makeValue({ activeWordIndex: 1 }))

    expect(pageProps.get(2)!.wordRanges).toEqual([{ item: 2, from: 0, to: 6 }])
  })

  it("does not highlight while the audio loads", () => {
    renderContent(makeValue({ isLoading: true }))

    expect(pageProps.get(2)!.chunkRanges).toEqual([])
  })

  it("keeps the same chunk ranges while only the word changes", () => {
    const { update } = renderContent(makeValue())
    const ranges = pageProps.get(2)!.chunkRanges

    update(makeValue({ activeWordIndex: 1 }))

    expect(pageProps.get(2)!.chunkRanges).toBe(ranges)
  })

  it("jumps to the chunk of the clicked text", () => {
    const value = makeValue()
    renderContent(value)

    act(() => pageProps.get(2)!.onTextClick(2))
    // The third item starts in "world." of the first chunk
    expect(value.setCurrentIndex).toHaveBeenCalledWith(10000)

    act(() => pageProps.get(2)!.onTextClick(1))
    // Skipped header: nothing to read there
    expect(value.setCurrentIndex).toHaveBeenCalledTimes(1)
  })

  it("follows the highlighted chunk when auto scroll is on", () => {
    renderContent(makeValue())
    const highlight = document.createElement("div")

    act(() => pageProps.get(2)!.onChunkShown!(highlight))

    expect(scrollIntoView).toHaveBeenCalledWith(
      expect.objectContaining({ block: "center" })
    )
  })

  it("does not follow when auto scroll is off", () => {
    renderContent(makeValue({ isAutoScroll: false }))

    act(() => pageProps.get(2)!.onChunkShown!(document.createElement("div")))

    expect(scrollIntoView).not.toHaveBeenCalled()
  })

  it("goes back to the chunk being read when auto scroll is turned on", () => {
    const { update, container } = renderContent(
      makeValue({ isAutoScroll: false })
    )
    const highlight = document.createElement("div")
    highlight.dataset.highlight = "chunk"
    container.append(highlight)

    update(makeValue({ isAutoScroll: true }))

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    expect(scrollIntoView.mock.contexts[0]).toBe(highlight)
  })

  it("does not follow while the user scrolls by hand", () => {
    renderContent(makeValue())

    window.dispatchEvent(new Event("wheel"))
    act(() => pageProps.get(2)!.onChunkShown!(document.createElement("div")))

    expect(scrollIntoView).not.toHaveBeenCalled()
  })
})
