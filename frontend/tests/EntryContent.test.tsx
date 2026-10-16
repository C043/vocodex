import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { ComponentProps } from "react"
import { render, screen, fireEvent, act } from "./test-utils"
import EntryContent from "../src/components/player/EntryContent"
import { PlayerContext } from "../src/contexts/PlayerContext"
import type { SentenceObj } from "../src/contexts/PlayerContext"
import { readerFontFamily } from "../src/utils/fonts"

type PlayerValue = NonNullable<ComponentProps<typeof PlayerContext.Provider>["value"]>

const makeSentence = (
  id: number,
  text: string,
  paragraphStart = false
): SentenceObj => ({
  id,
  text,
  paragraphStart,
  boundaries: [],
  prev: null,
  next: null,
  audio: { url: null, voice: null }
})

const sentences = [
  makeSentence(0, "First chunk."),
  makeSentence(1, "Second chunk."),
  makeSentence(2, "Third chunk opens a paragraph.", true)
]

const makeValue = (overrides: Partial<PlayerValue> = {}): PlayerValue =>
  ({
    title: "A title",
    sentencesMap: new Map(sentences.map(s => [s.id, s])),
    currentIndex: 0,
    activeWordIndex: -1,
    setCurrentIndex: vi.fn(),
    isLoading: false,
    currentFontSize: 1,
    currentFont: "literata",
    isAutoScroll: true,
    ...overrides
  }) as PlayerValue

const renderContent = (value: PlayerValue) => {
  const ui = (v: PlayerValue) => (
    <PlayerContext.Provider value={v}>
      <EntryContent />
    </PlayerContext.Provider>
  )
  const utils = render(ui(value))
  return { ...utils, update: (v: PlayerValue) => utils.rerender(ui(v)) }
}

const chunk = (text: string) =>
  screen.getByText(
    (_, el) => !!el?.matches("[data-chunk-id]") && el.textContent === text
  )

describe("EntryContent", () => {
  const scrollIntoView = vi.fn()

  beforeEach(() => {
    scrollIntoView.mockClear()
    Element.prototype.scrollIntoView = scrollIntoView
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("text flow", () => {
    it("renders chunks as inline spans flowing in the same paragraph", () => {
      renderContent(makeValue())

      const first = chunk("First chunk.")
      const second = chunk("Second chunk.")

      expect(first.tagName).toBe("SPAN")
      expect(second.tagName).toBe("SPAN")
      expect(first.closest("p")).toBe(second.closest("p"))
    })

    it("starts a new paragraph for chunks that open one", () => {
      renderContent(makeValue())

      expect(chunk("Third chunk opens a paragraph.").closest("p")).not.toBe(
        chunk("Second chunk.").closest("p")
      )
    })

    it("shows heading chunks as headings", () => {
      const book = [
        { ...makeSentence(0, "Chapter One"), block: "heading" as const },
        { ...makeSentence(1, "A section", true), block: "subheading" as const },
        makeSentence(2, "Some text.", true)
      ]
      renderContent(
        makeValue({ sentencesMap: new Map(book.map(s => [s.id, s])) })
      )

      expect(chunk("Chapter One").closest("h2")).not.toBeNull()
      expect(chunk("A section").closest("h3")).not.toBeNull()
      expect(chunk("Some text.").closest("p")).not.toBeNull()
    })

    it("breaks the line before a chunk that starts a new line", () => {
      const poem = [
        makeSentence(0, "Improve his shining tail!"),
        { ...makeSentence(1, "And pour the waters."), lineStart: true }
      ]
      renderContent(
        makeValue({ sentencesMap: new Map(poem.map(s => [s.id, s])) })
      )

      const second = chunk("And pour the waters.")
      expect(second.closest("p")).toBe(
        chunk("Improve his shining tail!").closest("p")
      )
      expect(second.closest("p")?.querySelectorAll("br")).toHaveLength(1)
    })

    it("shows italic and bold parts of a chunk", () => {
      const styled = [
        {
          ...makeSentence(0, "A bright day in April, very bold."),
          styles: [
            { start: 16, end: 21, style: "italic" as const },
            { start: 23, end: 32, style: "bold" as const }
          ]
        }
      ]
      renderContent(
        makeValue({ sentencesMap: new Map(styled.map(s => [s.id, s])) })
      )

      const el = chunk("A bright day in April, very bold.")
      expect([...el.querySelectorAll("em")].map(e => e.textContent)).toEqual([
        "April"
      ])
      expect(
        [...el.querySelectorAll("strong")].map(e => e.textContent).join("")
      ).toBe("very bold")
    })

    it("shows scene breaks and pictures around the text", () => {
      vi.spyOn(window, "fetch").mockReturnValue(new Promise(() => {}))
      const book = [
        {
          ...makeSentence(0, "First."),
          before: [{ kind: "image" as const, src: "/images/0", alt: "Cover" }]
        },
        {
          ...makeSentence(1, "Second.", true),
          before: [{ kind: "break" as const }],
          after: [{ kind: "image" as const, src: "/images/1", alt: "End" }]
        }
      ]
      const { container } = renderContent(
        makeValue({ sentencesMap: new Map(book.map(s => [s.id, s])) })
      )

      const order = [
        ...container.querySelectorAll(
          "[data-chunk-id], [role=separator], [data-book-image]"
        )
      ].map(
        el =>
          el.getAttribute("data-book-image") ??
          el.getAttribute("role") ??
          el.textContent
      )
      expect(order).toEqual([
        "/images/0",
        "First.",
        "separator",
        "Second.",
        "/images/1"
      ])
    })

    it("marks only the chunk being read as current", () => {
      renderContent(makeValue({ currentIndex: 1 }))

      expect(chunk("Second chunk.")).toHaveAttribute("aria-current", "true")
      expect(chunk("First chunk.")).not.toHaveAttribute("aria-current")
    })

    it("jumps to a chunk when it is clicked", () => {
      const value = makeValue()
      renderContent(value)

      fireEvent.click(chunk("Second chunk."))

      expect(value.setCurrentIndex).toHaveBeenCalledWith(1)
    })
  })

  describe("font", () => {
    it("reads in the chosen font", () => {
      renderContent(makeValue({ currentFont: "inter" }))

      expect(chunk("First chunk.").closest("div")).toHaveStyle({
        fontFamily: readerFontFamily("inter")
      })
    })
  })

  describe("auto scroll", () => {
    it("centers the current chunk instantly on first render", () => {
      renderContent(makeValue({ currentIndex: 1 }))

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "auto",
        block: "center"
      })
      expect(scrollIntoView.mock.contexts[0]).toBe(chunk("Second chunk."))
    })

    it("smoothly follows the chunk being read", () => {
      const { update } = renderContent(makeValue({ currentIndex: 0 }))
      scrollIntoView.mockClear()

      update(makeValue({ currentIndex: 2 }))

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView).toHaveBeenCalledWith({
        behavior: "smooth",
        block: "center"
      })
      expect(scrollIntoView.mock.contexts[0]).toBe(
        chunk("Third chunk opens a paragraph.")
      )
    })

    it("does not scroll again while the same chunk is read word by word", () => {
      const { update } = renderContent(makeValue({ currentIndex: 0 }))
      scrollIntoView.mockClear()

      update(makeValue({ currentIndex: 0, activeWordIndex: 1 }))

      expect(scrollIntoView).not.toHaveBeenCalled()
    })

    it("does not scroll while the entry is still loading", () => {
      renderContent(makeValue({ isLoading: true }))

      expect(scrollIntoView).not.toHaveBeenCalled()
    })

    it.each(["touchmove", "wheel"])(
      "stops following for a moment after the user scrolls (%s)",
      eventName => {
        vi.useFakeTimers()
        const { update } = renderContent(makeValue({ currentIndex: 0 }))
        scrollIntoView.mockClear()

        fireEvent(window, new Event(eventName))
        update(makeValue({ currentIndex: 1 }))
        expect(scrollIntoView).not.toHaveBeenCalled()

        act(() => {
          vi.advanceTimersByTime(4000)
        })
        update(makeValue({ currentIndex: 2 }))
        expect(scrollIntoView).toHaveBeenCalledTimes(1)
      }
    )

    it("does not follow the reading when auto scroll is off", () => {
      const { update } = renderContent(
        makeValue({ currentIndex: 0, isAutoScroll: false })
      )

      update(makeValue({ currentIndex: 1, isAutoScroll: false }))

      expect(scrollIntoView).not.toHaveBeenCalled()
    })

    it("jumps back to the current chunk when auto scroll is turned on", () => {
      const { update } = renderContent(
        makeValue({ currentIndex: 0, isAutoScroll: false })
      )
      update(makeValue({ currentIndex: 2, isAutoScroll: false }))

      update(makeValue({ currentIndex: 2, isAutoScroll: true }))

      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.contexts[0]).toBe(
        chunk("Third chunk opens a paragraph.")
      )
    })

    it("keeps the centered chunk clear of the docked mobile player", () => {
      renderContent(makeValue())

      expect(chunk("First chunk.")).toHaveClass("scroll-mb-40", "md:scroll-mb-0")
    })
  })

  describe("hover", () => {
    it("tints the background of a chunk that can be selected", () => {
      renderContent(makeValue())

      expect(chunk("Second chunk.")).toHaveClass(
        "hover:bg-violet-500/15",
        "hover:text-foreground"
      )
    })

    it("leaves the current chunk without a hover tint", () => {
      renderContent(makeValue())

      expect(chunk("First chunk.")).not.toHaveClass("hover:bg-violet-500/15")
    })
  })

  describe("word highlight", () => {
    // Positioned, z-indexed layers changing word by word make the browser
    // rebuild the layers under the glass bars, which then lose their blur
    const sentenceWithWords = {
      ...makeSentence(0, "Hello brave world."),
      boundaries: [{ word: "Hello" }, { word: "brave" }, { word: "world" }]
    } as unknown as SentenceObj

    const renderWords = () =>
      renderContent(
        makeValue({
          sentencesMap: new Map([[0, sentenceWithWords]]),
          activeWordIndex: 1
        })
      )

    it("paints the word being read on the word itself", () => {
      renderWords()

      const word = screen.getByText("brave")
      expect(word).toHaveClass("bg-brand", "text-white", "box-decoration-clone")
    })

    it("adds no positioned or stacked layers around the words", () => {
      const { container } = renderWords()

      const chunkEl = container.querySelector("[data-chunk-id]")!
      expect(chunkEl.querySelector('[class*="after:"]')).toBeNull()
      expect(chunkEl.querySelector(".relative")).toBeNull()
      expect(chunkEl.querySelector('[class*="z-"]')).toBeNull()
    })

    // A fading highlight trails the voice and blinks at fast speeds
    it("moves the highlight from word to word without fading", () => {
      renderWords()

      expect(screen.getByText("brave").className).not.toMatch(/transition/)
    })

    it("highlights words without ASCII letters, like Italian è", () => {
      const italian = {
        ...makeSentence(0, "La città è bella."),
        boundaries: [{}, {}, {}, {}]
      } as unknown as SentenceObj
      renderContent(
        makeValue({
          sentencesMap: new Map([[0, italian]]),
          activeWordIndex: 2
        })
      )

      expect(screen.getByText("è")).toHaveClass("bg-brand")
    })

    it("keeps the reading in its own stacking context", () => {
      const { container } = renderWords()

      expect(container.querySelector("article")).toHaveClass("isolate")
    })
  })
})
