import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest"
import type { AudioEvent } from "../utils/messages"
import { createAudioPlayer } from "../utils/audioPlayer"

describe("audio player", () => {
  let el: HTMLAudioElement
  let emit: Mock<(tabId: number, event: AudioEvent) => void>
  let player: ReturnType<typeof createAudioPlayer>

  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement("audio")
    vi.spyOn(el, "play").mockResolvedValue()
    vi.spyOn(el, "pause").mockImplementation(() => {})
    emit = vi.fn()
    player = createAudioPlayer(el, emit)
  })
  afterEach(() => vi.useRealTimers())

  it("plays the mp3 from a time, at a speed", () => {
    player.play(7, "QUJD", 1.5, 2)
    expect(el.src).toBe("data:audio/mpeg;base64,QUJD")
    expect(el.currentTime).toBe(1.5)
    expect(el.playbackRate).toBe(2)
    expect(el.play).toHaveBeenCalled()
  })

  it("tells the tab the time often, so words light up on time", () => {
    player.play(7, "QUJD", 0, 1)
    el.currentTime = 0.4
    vi.advanceTimersByTime(60)
    expect(emit).toHaveBeenCalledWith(7, { type: "audio:time", time: 0.4 })
  })

  it("stops telling the time once paused", () => {
    player.play(7, "QUJD", 0, 1)
    player.pause(7)
    emit.mockClear()
    vi.advanceTimersByTime(200)
    expect(emit).not.toHaveBeenCalled()
    expect(el.pause).toHaveBeenCalled()
  })

  it("tells the tab when the chunk ends", () => {
    player.play(7, "QUJD", 0, 1)
    el.dispatchEvent(new Event("ended"))
    expect(emit).toHaveBeenCalledWith(7, { type: "audio:ended" })
  })

  it("changes the speed of what plays", () => {
    player.play(7, "QUJD", 0, 1)
    player.setRate(7, 1.5)
    expect(el.playbackRate).toBe(1.5)
  })

  it("plays one tab at a time, telling the last one it was stopped", () => {
    player.play(7, "QUJD", 0, 1)
    player.play(8, "REVG", 0, 1)
    expect(emit).toHaveBeenCalledWith(7, { type: "audio:interrupted" })
  })

  it("ignores another tab pausing or changing the speed", () => {
    player.play(7, "QUJD", 0, 1)
    player.pause(8)
    player.setRate(8, 2)
    expect(el.pause).not.toHaveBeenCalled()
    expect(el.playbackRate).toBe(1)
  })

  it("stops the tab when the audio cannot play", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(el.play).mockRejectedValue(new DOMException("bad", "NotSupportedError"))
    player.play(7, "QUJD", 0, 1)
    await vi.waitFor(() => expect(emit).toHaveBeenCalledWith(7, { type: "audio:interrupted" }))
  })
})
