import { describe, it, expect, vi, afterEach } from "vitest"
import { playAudio } from "../src/utils/playAudio"

const audioWithPlay = (play: () => Promise<void>) =>
  ({ play }) as unknown as HTMLAudioElement

describe("playAudio", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("plays the audio without reporting an error", async () => {
    const play = vi.fn().mockResolvedValue(undefined)
    const onError = vi.fn()

    await playAudio(audioWithPlay(play), onError)

    expect(play).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
  })

  it("ignores AbortError from play() interrupted by pause()", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const onError = vi.fn()
    const abort = new DOMException(
      "The play() request was interrupted by a call to pause().",
      "AbortError"
    )

    await expect(
      playAudio(audioWithPlay(() => Promise.reject(abort)), onError)
    ).resolves.toBeUndefined()

    expect(onError).not.toHaveBeenCalled()
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it("reports other playback errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {})
    const onError = vi.fn()
    const notAllowed = new DOMException("Autoplay blocked", "NotAllowedError")

    await expect(
      playAudio(audioWithPlay(() => Promise.reject(notAllowed)), onError)
    ).resolves.toBeUndefined()

    expect(onError).toHaveBeenCalledOnce()
    expect(errorSpy).toHaveBeenCalledWith(notAllowed)
  })
})
