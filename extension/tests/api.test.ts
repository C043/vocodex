import { afterEach, describe, expect, it, vi } from "vitest"
import { fetchVoices, loadSettings, saveSettings, synthesize } from "../utils/api"

const respond = (body: unknown, ok = true) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify(body), { status: ok ? 200 : 500 })
  )

afterEach(() => vi.restoreAllMocks())

describe("settings", () => {
  it("defaults to a local server, its default voice and normal speed", async () => {
    expect(await loadSettings()).toEqual({
      serverUrl: "http://localhost:8000",
      voice: "",
      speed: "+0%"
    })
  })

  it("keeps what was changed", async () => {
    await saveSettings({ voice: "en-US-AriaNeural" })
    await saveSettings({ speed: "+50%" })
    expect(await loadSettings()).toMatchObject({ voice: "en-US-AriaNeural", speed: "+50%" })
  })

  it("drops the trailing slash of the server address", async () => {
    await saveSettings({ serverUrl: "https://vocodex.home/api/ " })
    expect((await loadSettings()).serverUrl).toBe("https://vocodex.home/api")
  })
})

describe("server", () => {
  it("lists the voices", async () => {
    const voices = [{ key: "en-A", name: "A", locale: "en-US", language: "English" }]
    const fetch = respond(voices)
    expect(await fetchVoices("http://s")).toEqual(voices)
    expect(fetch).toHaveBeenCalledWith("http://s/voices")
  })

  it("synthesizes a text with a voice", async () => {
    const fetch = respond({ audio: "AAA", boundaries: [] })
    expect(await synthesize("http://s", "Hi.", "en-A")).toEqual({ audio: "AAA", boundaries: [] })
    expect(fetch).toHaveBeenCalledWith("http://s/synthesis/GET", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hi.", voice: "en-A" })
    })
  })

  it("fails with a message the popup can show", async () => {
    respond({}, false)
    await expect(synthesize("http://s", "Hi.", "")).rejects.toThrow("The server could not read this text")
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("Failed to fetch"))
    await expect(fetchVoices("http://s")).rejects.toThrow("Cannot reach the server at http://s")
  })
})
