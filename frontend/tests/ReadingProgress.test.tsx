import { describe, it, expect } from "vitest"
import type { ComponentProps } from "react"
import { render, screen } from "./test-utils"
import { ReadingProgress } from "../src/components/player/ReadingProgress"
import { PlayerContext } from "../src/contexts/PlayerContext"
import type { SentenceObj } from "../src/contexts/PlayerContext"
import type { PdfPage } from "../src/hooks/usePdfDocument"
import { DEFAULT_CHARS_PER_SECOND } from "../src/utils/readingTime"

type PlayerValue = NonNullable<
  ComponentProps<typeof PlayerContext.Provider>["value"]
>

const cps = DEFAULT_CHARS_PER_SECOND
const textOf = (seconds: number) => "a".repeat(cps * seconds)

const sentence = (id: number, seconds: number): SentenceObj => ({
  id,
  boundaries: [],
  text: textOf(seconds),
  prev: null,
  audio: { url: null, voice: null },
  next: null
})

const pdfPage = (pageNumber: number, seconds: number[]): PdfPage => ({
  pageNumber,
  width: 600,
  height: 800,
  text: { text: "", itemStarts: [] },
  itemStrs: [],
  chunks: seconds.map((s, idx) => ({
    id: (pageNumber - 1) * 10000 + idx,
    text: textOf(s),
    start: 0,
    end: 0
  }))
})

const renderProgress = (overrides: Partial<PlayerValue> = {}) => {
  const value = {
    audioRef: { current: document.createElement("audio") },
    kind: "text",
    currentIndex: 1,
    currentSpeed: "+0%",
    currentVoice: "voice-a",
    sentencesMap: new Map([
      [0, sentence(0, 60)],
      [1, sentence(1, 30)],
      [2, sentence(2, 90)]
    ]),
    pdf: { numPages: 0, pages: new Map() },
    ...overrides
  } as PlayerValue
  return render(
    <PlayerContext.Provider value={value}>
      <ReadingProgress />
    </PlayerContext.Provider>
  )
}

describe("ReadingProgress", () => {
  it("shows the time read before the bar and the time left after it", () => {
    renderProgress()

    expect(screen.getByLabelText("Time read")).toHaveTextContent("1:00")
    expect(screen.getByLabelText("Time left")).toHaveTextContent("-2:00")
    expect(
      screen.getByRole("progressbar", { name: "Reading progress" })
    ).toHaveAttribute("aria-valuenow", "33")
  })

  it("scales the times to the voice speed", () => {
    renderProgress({ currentSpeed: "+100%" })

    expect(screen.getByLabelText("Time read")).toHaveTextContent("0:30")
    expect(screen.getByLabelText("Time left")).toHaveTextContent("-1:00")
  })

  it("estimates the whole document for a PDF", () => {
    renderProgress({
      kind: "pdf",
      currentIndex: 10001,
      sentencesMap: new Map(),
      pdf: {
        numPages: 3,
        pages: new Map([
          [1, pdfPage(1, [60])],
          [2, pdfPage(2, [30, 30])]
        ])
      } as PlayerValue["pdf"]
    })

    // Page 3 is not loaded and counted as long as the average page (60s)
    expect(screen.getByLabelText("Time read")).toHaveTextContent("1:30")
    expect(screen.getByLabelText("Time left")).toHaveTextContent("-1:30")
  })
})
