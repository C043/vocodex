import { beforeEach, describe, expect, it, vi } from "vitest"
import { createPageReader } from "../utils/pageReader"

const settle = () => new Promise(resolve => setTimeout(resolve))

const setup = (autoScroll = true) => {
  document.body.innerHTML = "<h1>Title</h1><p>First line. <b>Second</b> line.</p>"
  const highlights = new Map<string, string>()
  const highlighter = {
    set: vi.fn((name: string, range: Range | null) => {
      if (range) highlights.set(name, range.toString())
      else highlights.delete(name)
    })
  }
  // The point under the mouse: the text node and offset given by the test
  let caret: { node: Node; offset: number } | null = null
  const audio = { play: vi.fn(), pause: vi.fn(), setRate: vi.fn() }
  const notify = vi.fn()
  const follow = vi.fn()
  const reader = createPageReader({
    root: document.body,
    settings: { voice: "en-A", speed: "+0%" },
    synthesize: vi.fn(async (text: string) => ({
      audio: text,
      boundaries: text.split(" ").map((word, idx) => ({ text: word, start: idx, end: idx + 1 }))
    })),
    audio,
    notify,
    highlighter,
    caretAt: () => caret,
    follow,
    autoScroll,
    // One sentence per chunk
    maxChars: 12
  })
  const pointAt = (selector: string, offset = 1) => {
    caret = { node: document.querySelector(selector)!.firstChild!, offset }
  }
  const pointAway = () => { caret = null }
  return { reader, audio, notify, highlights, pointAt, pointAway, follow }
}

describe("page reader", () => {
  let r: ReturnType<typeof setup>
  beforeEach(() => { r = setup() })

  it("splits the page into chunks to read, starting paused", () => {
    expect(r.reader.handle({ type: "reader:state" })).toMatchObject({
      playing: false, index: 0, count: 3
    })
  })

  it("plays and pauses from the popup commands", async () => {
    r.reader.handle({ type: "reader:play" })
    await settle()
    expect(r.audio.play).toHaveBeenCalledWith("Title", 0, 1)
    const state = r.reader.handle({ type: "reader:pause" })
    expect(state.playing).toBe(false)
  })

  it("skips forward and back from the popup", async () => {
    r.reader.handle({ type: "reader:next" })
    await settle()
    expect(r.audio.play).toHaveBeenLastCalledWith("First line.", 0, 1)
    r.reader.handle({ type: "reader:previous" })
    await settle()
    expect(r.audio.play).toHaveBeenLastCalledWith("Title", 0, 1)
  })

  it("changes voice and speed from the popup", () => {
    r.reader.handle({ type: "reader:voice", voice: "en-B" })
    const state = r.reader.handle({ type: "reader:speed", speed: "+50%" })
    expect(state).toMatchObject({ voice: "en-B", speed: "+50%" })
  })

  it("tells the popup every change", async () => {
    r.reader.handle({ type: "reader:play" })
    await settle()
    expect(r.notify).toHaveBeenLastCalledWith(expect.objectContaining({ playing: true }))
  })

  it("highlights the chunk read and the word being said, following it", async () => {
    r.reader.handle({ type: "reader:next" })
    await settle()
    r.reader.onAudioEvent({ type: "audio:time", time: 1.5 })
    expect(r.highlights.get("vocodex-chunk")).toBe("First line.")
    expect(r.highlights.get("vocodex-word")).toBe("line.")
    expect(r.follow).toHaveBeenLastCalledWith(expect.any(Range))
  })

  it("does not scroll the page while auto scroll is off", async () => {
    r = setup(false)
    r.reader.handle({ type: "reader:next" })
    await settle()
    r.reader.onAudioEvent({ type: "audio:time", time: 1.5 })
    expect(r.highlights.get("vocodex-word")).toBe("line.")
    expect(r.follow).not.toHaveBeenCalled()
  })

  it("turns auto scroll on and off from the popup", async () => {
    r.reader.handle({ type: "reader:autoScroll", autoScroll: false })
    r.reader.handle({ type: "reader:next" })
    await settle()
    r.reader.onAudioEvent({ type: "audio:time", time: 1.5 })
    expect(r.follow).not.toHaveBeenCalled()
    r.reader.handle({ type: "reader:autoScroll", autoScroll: true })
    r.reader.onAudioEvent({ type: "audio:time", time: 0.5 })
    expect(r.follow).toHaveBeenCalled()
  })

  it("moves on when the chunk ends, and stops when another tab plays", async () => {
    r.reader.handle({ type: "reader:play" })
    await settle()
    r.reader.onAudioEvent({ type: "audio:ended" })
    await settle()
    expect(r.audio.play).toHaveBeenLastCalledWith("First line.", 0, 1)
    r.reader.onAudioEvent({ type: "audio:interrupted" })
    expect(r.reader.handle({ type: "reader:state" }).playing).toBe(false)
  })

  it("highlights the chunk under the mouse", () => {
    r.pointAt("b")
    document.body.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }))
    expect(r.highlights.get("vocodex-hover")).toBe("Second line.")
    r.pointAway()
    document.body.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }))
    expect(r.highlights.has("vocodex-hover")).toBe(false)
  })

  it("plays from the chunk clicked", async () => {
    r.pointAt("b")
    document.querySelector("b")!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await settle()
    expect(r.audio.play).toHaveBeenLastCalledWith("Second line.", 0, 1)
  })

  it("does not skip when the click ends selecting text", async () => {
    const b = document.querySelector("b")!
    window.getSelection()!.selectAllChildren(b)
    r.pointAt("b")
    b.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await settle()
    expect(r.audio.play).not.toHaveBeenCalled()
    window.getSelection()!.removeAllRanges()
  })

  it("is switched off: stops, clears its highlights and ignores the mouse", async () => {
    r.reader.handle({ type: "reader:play" })
    await settle()
    r.reader.handle({ type: "reader:off" })
    expect(r.audio.pause).toHaveBeenCalled()
    expect(r.highlights.size).toBe(0)
    r.pointAt("b")
    document.querySelector("b")!.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    document.body.dispatchEvent(new MouseEvent("mousemove", { bubbles: true }))
    await settle()
    expect(r.audio.play).toHaveBeenCalledTimes(1)
    expect(r.highlights.size).toBe(0)
  })
})
