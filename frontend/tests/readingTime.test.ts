import { describe, it, expect } from "vitest"
import {
  DEFAULT_CHARS_PER_SECOND,
  formatTime,
  readingTimeline,
  speedRate
} from "../src/utils/readingTime"

const cps = DEFAULT_CHARS_PER_SECOND

describe("speedRate", () => {
  it("turns the speed options into playback rates", () => {
    expect(speedRate("+0%")).toBe(1)
    expect(speedRate("+50%")).toBe(1.5)
    expect(speedRate("+100%")).toBe(2)
    expect(speedRate("-50%")).toBe(0.5)
  })

  it("falls back to normal speed for unknown values", () => {
    expect(speedRate("")).toBe(1)
    expect(speedRate("fast")).toBe(1)
  })
})

describe("formatTime", () => {
  it("shows minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00")
    expect(formatTime(5.9)).toBe("0:05")
    expect(formatTime(65)).toBe("1:05")
  })

  it("shows hours for long readings", () => {
    expect(formatTime(3725)).toBe("1:02:05")
  })

  it("never shows negative or invalid times", () => {
    expect(formatTime(-3)).toBe("0:00")
    expect(formatTime(NaN)).toBe("0:00")
  })
})

describe("readingTimeline", () => {
  const chunks = [
    { id: 0, chars: cps * 2 },
    { id: 1, chars: cps * 4 },
    { id: 2, chars: cps * 6 }
  ]

  it("estimates the seconds before, of and in total from the text length", () => {
    expect(
      readingTimeline({
        pages: new Map([[1, chunks]]),
        numPages: 1,
        currentPage: 1,
        currentId: 1,
        durations: new Map()
      })
    ).toEqual({ before: 2, current: 4, total: 12 })
  })

  it("uses the real duration of the chunks already synthesized", () => {
    // Chunk 0 took twice as long as estimated, so the voice is slower
    // and the chunks not synthesized yet are estimated at the same pace
    expect(
      readingTimeline({
        pages: new Map([[1, chunks]]),
        numPages: 1,
        currentPage: 1,
        currentId: 1,
        durations: new Map([[0, 4]])
      })
    ).toEqual({ before: 4, current: 8, total: 24 })
  })

  it("estimates the pages not loaded yet from the loaded ones", () => {
    const pages = new Map([
      [2, [{ id: 10000, chars: cps * 10 }]],
      [
        3,
        [
          { id: 20000, chars: cps * 20 },
          { id: 20001, chars: cps * 10 }
        ]
      ]
    ])
    // Loaded pages average 20s; pages 1 and 4 are not loaded
    expect(
      readingTimeline({
        pages,
        numPages: 4,
        currentPage: 3,
        currentId: 20001,
        durations: new Map()
      })
    ).toEqual({ before: 50, current: 10, total: 80 })
  })

  it("is empty before anything is loaded", () => {
    expect(
      readingTimeline({
        pages: new Map(),
        numPages: 0,
        currentPage: 1,
        currentId: -1,
        durations: new Map()
      })
    ).toEqual({ before: 0, current: 0, total: 0 })
  })
})
