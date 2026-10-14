import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { ComponentProps } from "react"
import { render, screen, fireEvent, act } from "./test-utils"
import EntryContent from "../src/components/player/EntryContent"
import { PlayerContext } from "../src/contexts/PlayerContext"
import type { SentenceObj } from "../src/contexts/PlayerContext"

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
})
