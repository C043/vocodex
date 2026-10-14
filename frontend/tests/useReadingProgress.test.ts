import { describe, it, expect } from "vitest"
import { act, renderHook } from "@testing-library/react"
import { useReadingProgress } from "../src/hooks/useReadingProgress"
import { DEFAULT_CHARS_PER_SECOND } from "../src/utils/readingTime"

const cps = DEFAULT_CHARS_PER_SECOND

// jsdom audio elements never load media, so the times are set by hand
const createAudio = () => {
  const audio = document.createElement("audio")
  let currentTime = 0
  let duration = NaN
  Object.defineProperty(audio, "currentTime", { get: () => currentTime })
  Object.defineProperty(audio, "duration", { get: () => duration })
  return {
    audio,
    load: (seconds: number) => {
      duration = seconds
      currentTime = 0
      audio.dispatchEvent(new Event("loadedmetadata"))
    },
    seek: (seconds: number) => {
      currentTime = seconds
      audio.dispatchEvent(new Event("timeupdate"))
    }
  }
}

const pages = new Map([
  [
    1,
    [
      { id: 0, chars: cps * 10 },
      { id: 1, chars: cps * 10 },
      { id: 2, chars: cps * 20 }
    ]
  ]
])

type Props = { currentIndex: number; speed: string; voice: string }

const setup = (initial: Partial<Props> = {}) => {
  const media = createAudio()
  const audioRef = { current: media.audio }
  const hook = renderHook(
    (props: Props) =>
      useReadingProgress({
        audioRef,
        pages,
        numPages: 1,
        currentPage: 1,
        ...props
      }),
    {
      initialProps: {
        currentIndex: 1,
        speed: "+0%",
        voice: "voice-a",
        ...initial
      }
    }
  )
  return { ...hook, ...media }
}

describe("useReadingProgress", () => {
  it("estimates the reading time from the start of the current chunk", () => {
    const { result } = setup()

    expect(result.current).toEqual({
      elapsed: 10,
      remaining: 30,
      total: 40,
      fraction: 0.25
    })
  })

  it("follows the audio of the current chunk as it plays", () => {
    const { result, load, seek } = setup()

    act(() => load(10))
    act(() => seek(5))

    expect(result.current.elapsed).toBe(15)
    expect(result.current.remaining).toBe(25)
  })

  it("updates the times when the speed changes", () => {
    const { result, rerender, load, seek } = setup()
    act(() => load(10))
    act(() => seek(5))

    rerender({ currentIndex: 1, speed: "+100%", voice: "voice-a" })

    expect(result.current.elapsed).toBe(7.5)
    expect(result.current.remaining).toBe(12.5)
    expect(result.current.total).toBe(20)
    expect(result.current.fraction).toBe(0.375)
  })

  it("learns the pace of the voice from the synthesized audio", () => {
    const { result, load } = setup()

    // The current chunk lasts twice as long as estimated
    act(() => load(20))

    expect(result.current.total).toBe(80)
  })

  it("forgets the learned pace when the voice changes", () => {
    const { result, rerender, load } = setup()
    act(() => load(20))

    rerender({ currentIndex: 1, speed: "+0%", voice: "voice-b" })

    expect(result.current.total).toBe(40)
  })

  it("starts each chunk from its beginning", () => {
    const { result, rerender, load, seek } = setup()
    act(() => load(10))
    act(() => seek(9))

    rerender({ currentIndex: 2, speed: "+0%", voice: "voice-a" })

    expect(result.current.elapsed).toBe(20)
  })
})
