import { beforeEach, describe, expect, it, vi } from "vitest"
import type { PdfChunk } from "@vocodex/utils/pdfText"
import { createReader, type ReaderState } from "../utils/reader"

const chunks: PdfChunk[] = [
  { id: 0, text: "One two.", start: 0, end: 8, block: 0 },
  { id: 1, text: "Three.", start: 9, end: 15, block: 1 },
  { id: 2, text: "Four.", start: 16, end: 21, block: 1 }
]

const setup = (synthesize = vi.fn(async (text: string, voice: string) => ({
  audio: `${voice}:${text}`,
  boundaries: text.split(" ").map((word, idx) => ({ text: word.replace(".", ""), start: idx, end: idx + 1 }))
}))) => {
  const audio = { play: vi.fn(), pause: vi.fn(), setRate: vi.fn() }
  const states: ReaderState[] = []
  const reader = createReader({
    chunks,
    synthesize,
    audio,
    onChange: state => states.push(state)
  }, { voice: "en-A", speed: "+0%" })
  const last = () => states.at(-1) ?? reader.state()
  return { reader, audio, synthesize, last }
}

const settle = () => new Promise(resolve => setTimeout(resolve))

describe("reader", () => {
  let r: ReturnType<typeof setup>
  beforeEach(() => { r = setup() })

  it("starts paused on the first chunk", () => {
    expect(r.reader.state()).toMatchObject({ playing: false, index: 0, count: 3, word: null })
  })

  it("plays the chunk with the voice and speed chosen", async () => {
    r.reader.setSpeed("+50%")
    r.reader.play()
    await settle()
    expect(r.synthesize).toHaveBeenCalledWith("One two.", "en-A")
    expect(r.audio.play).toHaveBeenCalledWith("en-A:One two.", 0, 1.5)
    expect(r.last()).toMatchObject({ playing: true, loading: false })
  })

  it("shows it is loading while the voice is synthesized", () => {
    r.reader.play()
    expect(r.last()).toMatchObject({ loading: true })
  })

  it("asks for the next chunks ahead, once each", async () => {
    r.reader.play()
    await settle()
    r.reader.next()
    await settle()
    const texts = r.synthesize.mock.calls.map(call => call[0])
    expect(texts).toEqual(["One two.", "Three.", "Four."])
  })

  it("highlights the word being said", async () => {
    r.reader.play()
    await settle()
    r.reader.onTime(1.2)
    expect(r.last().word).toEqual({ start: 4, end: 8 })
  })

  it("pauses where it is and resumes from there", async () => {
    r.reader.play()
    await settle()
    r.reader.onTime(0.7)
    r.reader.pause()
    expect(r.audio.pause).toHaveBeenCalled()
    expect(r.last().playing).toBe(false)
    r.reader.play()
    await settle()
    expect(r.audio.play).toHaveBeenLastCalledWith("en-A:One two.", 0.7, 1)
  })

  it("goes on to the next chunk when one ends, and stops after the last", async () => {
    r.reader.play()
    await settle()
    r.reader.onEnded()
    await settle()
    expect(r.audio.play).toHaveBeenLastCalledWith("en-A:Three.", 0, 1)
    r.reader.onEnded()
    await settle()
    r.reader.onEnded()
    expect(r.last()).toMatchObject({ playing: false, index: 2 })
  })

  it("skips forward and backward, playing from there, within the page", async () => {
    r.reader.previous()
    expect(r.last().index).toBe(0)
    r.reader.next()
    r.reader.next()
    r.reader.next()
    await settle()
    expect(r.last()).toMatchObject({ index: 2, playing: true })
    r.reader.previous()
    await settle()
    expect(r.audio.play).toHaveBeenLastCalledWith("en-A:Three.", 0, 1)
  })

  it("plays from a chunk picked on the page", async () => {
    r.reader.seek(2)
    await settle()
    expect(r.audio.play).toHaveBeenLastCalledWith("en-A:Four.", 0, 1)
    expect(r.last()).toMatchObject({ index: 2, word: null })
  })

  it("only plays the last chunk asked for when skipping fast", async () => {
    r.reader.seek(1)
    r.reader.seek(2)
    await settle()
    expect(r.audio.play).toHaveBeenCalledTimes(1)
    expect(r.audio.play).toHaveBeenCalledWith("en-A:Four.", 0, 1)
  })

  it("changes the speed of what is playing", async () => {
    r.reader.play()
    await settle()
    r.reader.setSpeed("+100%")
    expect(r.audio.setRate).toHaveBeenCalledWith(2)
    expect(r.last().speed).toBe("+100%")
  })

  it("restarts the chunk with a new voice", async () => {
    r.reader.play()
    await settle()
    r.reader.setVoice("en-B")
    await settle()
    expect(r.audio.play).toHaveBeenLastCalledWith("en-B:One two.", 0, 1)
  })

  it("stops when another tab takes over the audio", async () => {
    r.reader.play()
    await settle()
    r.reader.onInterrupted()
    expect(r.last().playing).toBe(false)
  })

  it("stops and tells why when the voice cannot be synthesized", async () => {
    r = setup(vi.fn(async () => { throw new Error("Server unreachable") }))
    r.reader.play()
    await settle()
    expect(r.last()).toMatchObject({ playing: false, loading: false, error: "Server unreachable" })
    expect(r.audio.play).not.toHaveBeenCalled()
  })
})
