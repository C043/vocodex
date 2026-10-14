import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { usePlayerData } from "../src/hooks/usePlayerData"

const mockNavigate = vi.fn()
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate
}))

const mockState = {
  darkMode: { value: false },
  user: {
    preferences: { speed: "+0%", voice: "en-GB-AdaMultilingualNeural" }
  }
}
const mockDispatch = vi.fn()
vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState)
}))

vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:mock-audio-url"),
  revokeObjectURL: vi.fn()
})

// jsdom has no VTTCue; the hook only constructs and adds them to a track
vi.stubGlobal(
  "VTTCue",
  class {
    startTime: number
    endTime: number
    text: string
    constructor(startTime: number, endTime: number, text: string) {
      this.startTime = startTime
      this.endTime = endTime
      this.text = text
    }
  }
)

const createMockAudio = () => {
  const track = {
    mode: "disabled",
    cues: [] as unknown[],
    activeCues: [] as unknown[],
    addCue: vi.fn(),
    removeCue: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  }
  return {
    play: vi.fn().mockResolvedValue(undefined),
    pause: vi.fn(),
    onended: null,
    playbackRate: 1,
    src: "",
    textTracks: [] as unknown[],
    addTextTrack: vi.fn(() => track)
  } as unknown as HTMLAudioElement
}

describe("usePlayerData hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(
      "fake-token"
    )
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should have a correct initial state", () => {
    vi.spyOn(window, "fetch").mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePlayerData("test-id"))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.title).toBe("")
    expect(result.current.currentIndex).toBe(-1)
    expect(result.current.currentSpeed).toBe("+0%")
    expect(result.current.currentVoice).toBe("en-GB-AdaMultilingualNeural")
  })

  it("should navigate home if the entry cannot be fetched", async () => {
    vi.spyOn(window, "fetch").mockImplementation(
      async () =>
        new Response(JSON.stringify({ detail: "Not found" }), { status: 404 })
    )

    renderHook(() => usePlayerData("missing-id"))

    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith("/"))
  })

  it("should fetch entry data, synthesize the current sentence and play it", async () => {
    const mockEntryData = {
      title: "title",
      content:
        "This is the content. This is fake data. This will be always fake.",
      progress: 0
    }
    const mockSynthesis = {
      audio: btoa("mock audio data"),
      boundaries: [{ text: "This", start: 0, end: 0.2 }]
    }

    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async input => {
        const url = String(input)
        if (url.endsWith("/entries/test-entry-id"))
          return new Response(JSON.stringify(mockEntryData), { status: 200 })
        if (url.endsWith("/synthesis/GET"))
          return new Response(JSON.stringify(mockSynthesis), { status: 200 })
        return new Response(JSON.stringify([]), { status: 200 })
      })

    const { result } = renderHook(() => usePlayerData("test-entry-id"))
    // The hook never renders an <audio>, so attach one before fetches resolve
    const audio = createMockAudio()
    result.current.audioRef.current = audio

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isPlaying).toBe(true)
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/entries/test-entry-id"),
      expect.objectContaining({
        headers: { Authorization: "Bearer fake-token" }
      })
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/synthesis/GET"),
      expect.objectContaining({ method: "POST" })
    )
    expect(result.current.title).toBe(mockEntryData.title)
    expect(result.current.sentencesMap.size).toBeGreaterThan(0)
    expect(result.current.currentIndex).toBe(mockEntryData.progress)
    expect(audio.src).toBe("blob:mock-audio-url")
    expect(audio.play).toHaveBeenCalled()
  })
})

describe("usePlayerData voices", () => {
  const voices = [
    {
      key: "en-GB-LibbyNeural",
      name: "Libby",
      locale: "en-GB",
      language: "English (United Kingdom)"
    }
  ]

  const mockFetch = (voicesResponse: Response) =>
    vi.spyOn(window, "fetch").mockImplementation(async input => {
      if (String(input).endsWith("/voices")) return voicesResponse
      // Entry/synthesis calls aren't under test here
      return new Response(null, { status: 404 })
    })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(
      "fake-token"
    )
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("fetches the voice list on mount", async () => {
    const fetchSpy = mockFetch(
      new Response(JSON.stringify(voices), { status: 200 })
    )

    const { result } = renderHook(() => usePlayerData("test-id"))

    await waitFor(() => expect(result.current.voiceOptions).toEqual(voices))
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\/voices$/),
      expect.objectContaining({
        method: "GET",
        headers: { Authorization: "Bearer fake-token" }
      })
    )
  })

  it("keeps an empty voice list when the request fails", async () => {
    const fetchSpy = mockFetch(new Response(null, { status: 500 }))

    const { result } = renderHook(() => usePlayerData("test-id"))

    await waitFor(() =>
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\/voices$/),
        expect.any(Object)
      )
    )
    expect(result.current.voiceOptions).toEqual([])
  })
})
