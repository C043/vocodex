import { describe, expect, it, vi } from "vitest"
import { createOffscreenPlayer, createRouter } from "../utils/router"

const setup = () => {
  const player = { play: vi.fn(), pause: vi.fn(), setRate: vi.fn() }
  const deps = {
    player,
    sendToTab: vi.fn(),
    loadSettings: vi.fn(async () => ({ serverUrl: "http://s", voice: "", speed: "+0%" })),
    synthesize: vi.fn(async () => ({ audio: "AAA", boundaries: [] }))
  }
  return { ...deps, route: createRouter(deps) }
}

const fromTab = { tab: { id: 4 } }

describe("background router", () => {
  it("synthesizes with the server of the settings", async () => {
    const r = setup()
    const answer = await r.route({ type: "synthesize", text: "Hi.", voice: "en-A" }, fromTab)
    expect(r.synthesize).toHaveBeenCalledWith("http://s", "Hi.", "en-A")
    expect(answer).toEqual({ audio: "AAA", boundaries: [] })
  })

  it("answers with the error when synthesis fails", async () => {
    const r = setup()
    r.synthesize.mockRejectedValue(new Error("Cannot reach the server at http://s"))
    const answer = await r.route({ type: "synthesize", text: "Hi.", voice: "" }, fromTab)
    expect(answer).toEqual({ error: "Cannot reach the server at http://s" })
  })

  it("plays, pauses and sets the speed for the tab asking", async () => {
    const r = setup()
    await r.route({ type: "audio:play", audio: "AAA", at: 1, rate: 1.5 }, fromTab)
    await r.route({ type: "audio:rate", rate: 2 }, fromTab)
    await r.route({ type: "audio:pause" }, fromTab)
    expect(r.player.play).toHaveBeenCalledWith(4, "AAA", 1, 1.5)
    expect(r.player.setRate).toHaveBeenCalledWith(4, 2)
    expect(r.player.pause).toHaveBeenCalledWith(4)
  })

  it("passes the audio events of the offscreen page to their tab", async () => {
    const r = setup()
    await r.route({ type: "audio:event", tabId: 4, event: { type: "audio:ended" } }, {})
    expect(r.sendToTab).toHaveBeenCalledWith(4, { type: "audio:ended" })
  })

  it("leaves other messages to the rest of the extension", () => {
    const r = setup()
    expect(r.route({ type: "reader:changed" }, fromTab)).toBeUndefined()
    expect(r.route({ type: "audio:play", target: "offscreen" }, {})).toBeUndefined()
  })
})

describe("offscreen player", () => {
  it("opens the offscreen page, then sends it the command", async () => {
    const ensure = vi.fn(async () => {})
    const send = vi.fn()
    const player = createOffscreenPlayer(ensure, send)
    await player.play(4, "AAA", 0, 1)
    await player.setRate(4, 2)
    await player.pause(4)
    expect(ensure).toHaveBeenCalledTimes(1)
    expect(send.mock.calls.map(call => call[0])).toEqual([
      { target: "offscreen", type: "audio:play", tabId: 4, audio: "AAA", at: 0, rate: 1 },
      { target: "offscreen", type: "audio:rate", tabId: 4, rate: 2 },
      { target: "offscreen", type: "audio:pause", tabId: 4 }
    ])
  })
})
