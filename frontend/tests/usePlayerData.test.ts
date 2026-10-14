import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { usePlayerData } from "../src/hooks/usePlayerData"
import { setIsLoggedIn } from "../src/redux/reducer/authSlice"

const mockNavigate = vi.fn()
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate
}))

const mockDispatch = vi.fn()
vi.mock("react-redux", () => ({
  useDispatch: () => mockDispatch,
  useSelector: () => false
}))

vi.stubGlobal("URL", {
  createObjectURL: vi.fn((blob: any) => `blob:${blob.size}`),
  revokeObjectURL: vi.fn()
})

describe("usePlayerData hook", () => {
  const mockAudioRef = {
    current: {
      play: vi.fn(),
      pause: vi.fn(),
      onended: vi.fn(),
      playbackRate: 1,
      src: ""
    } as unknown as HTMLAudioElement
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(
      "fake-token"
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("should have a correct initial state", () => {
    const { result } = renderHook(() => usePlayerData("test-id"))

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isPlaying).toBe(false)
    expect(result.current.title).toBe("")
    expect(result.current.currentIndex).toBe(Infinity)
    expect(result.current.currentSpeed).toBe("+0%")
    expect(result.current.currentVoice).toBe("en-GB-AdaMultilingualNeural")
  })

  it("should navigate to /login if user is not authenticated", () => {
    renderHook(() => usePlayerData("test-id"))

    expect(mockDispatch).toHaveBeenCalledWith(setIsLoggedIn(false))
    expect(mockNavigate).toHaveBeenCalledWith("/login")
  })

  it("should fetch entry data and set state if user is authenticated", async () => {
    const mockEntryData = {
      title: "title",
      content:
        "This is the content. This is fake data. This will be always fake.",
      progress: 0
    }

    const mockAudioUrl = "blob:http://mock-audio-url"

    const fetchSpy = vi.spyOn(window, "fetch")

    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify(mockEntryData), { status: 200 })
    )

    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response(new Blob(["mock audio data"], { type: "audio/mpgeg" }), {
        status: 200
      })
    )
    ;(URL.createObjectURL as Mock).mockReturnValue(mockAudioUrl)

    const { result } = renderHook(() => usePlayerData("test-entry-id"))

    await waitFor(
      () => {
        expect(mockDispatch).toHaveBeenCalledWith(setIsLoggedIn(true))
        expect(window.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/entries/test-entry-id"),
          expect.any(Object)
        )

        expect(window.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/synthesist/GET"),
          expect.any(Object)
        )

        expect(result.current.isLoading).toBe(false)
        expect(result.current.title).toBe(mockEntryData.title)
        expect(result.current.sentencesMap.size).toBeGreaterThan(0)
        expect(result.current.currentIndex).toBe(mockEntryData.progress)

        const audioEl = result.current.audioRef.current
        expect(audioEl?.src).toBe(mockAudioUrl)
        expect(audioEl?.play).toHaveBeenCalledTimes(1)
        expect(result.current.isPlaying).toBe(true)
      },
      { timeout: 10000 }
    )
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
