import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { usePlayerData } from "../src/hooks/usePlayerData"
import { setUserPreferences } from "../src/redux/reducer/authSlice"

const mockNavigate = vi.fn()
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate
}))

const mockState = {
  darkMode: { value: false },
  user: {
    preferences: {
      speed: "+0%",
      voice: "en-GB-AdaMultilingualNeural",
      zoom: {} as Record<string, number>,
      font: ""
    }
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
    defaultPlaybackRate: 1,
    onratechange: null,
    src: "",
    currentTime: 0,
    textTracks: [] as unknown[],
    addTextTrack: vi.fn(() => track)
  } as unknown as HTMLAudioElement
}

describe("usePlayerData hook", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.user.preferences.zoom = {}
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

describe("usePlayerData EPUB entries", () => {
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

  it("reads the blocks of the book, with their styles and pictures", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(async input => {
        const url = String(input)
        if (url.endsWith("/entries/book-id"))
          return new Response(
            JSON.stringify({
              title: "A book",
              kind: "epub",
              content: JSON.stringify({
                blocks: [
                  { kind: "image", image: 0, alt: "Cover" },
                  { kind: "heading", text: "Chapter One" },
                  {
                    kind: "paragraph",
                    text: "It begins.",
                    styles: [{ start: 3, end: 9, style: "italic" }]
                  }
                ]
              }),
              progress: 0
            }),
            { status: 200 }
          )
        if (url.endsWith("/synthesis/GET"))
          return new Response(
            JSON.stringify({ audio: btoa("audio"), boundaries: [] }),
            { status: 200 }
          )
        return new Response(JSON.stringify([]), { status: 200 })
      })

    const { result } = renderHook(() => usePlayerData("book-id"))
    result.current.audioRef.current = createMockAudio()

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.kind).toBe("text")
    expect([...result.current.sentencesMap.values()]).toEqual([
      expect.objectContaining({
        text: "Chapter One",
        block: "heading",
        before: [
          {
            kind: "image",
            src: expect.stringMatching(/\/entries\/book-id\/images\/0$/),
            alt: "Cover"
          }
        ]
      }),
      expect.objectContaining({
        text: "It begins.",
        block: "paragraph",
        paragraphStart: true,
        styles: [{ start: 3, end: 9, style: "italic" }]
      })
    ])
    const synthesis = fetchSpy.mock.calls.find(([url]) =>
      String(url).endsWith("/synthesis/GET")
    )
    expect(JSON.parse(String(synthesis?.[1]?.body)).text).toBe("Chapter One")
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

describe("usePlayerData zoom", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.user.preferences.zoom = {}
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(
      "fake-token"
    )
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Only saving preferences answers; the entry stays loading
  const mockPreferencesFetch = () =>
    vi
      .spyOn(window, "fetch")
      .mockImplementation(input =>
        String(input).endsWith("/me/preferences")
          ? Promise.resolve(new Response("{}", { status: 200 }))
          : new Promise(() => {})
      )

  const savedZoom = (fetchSpy: ReturnType<typeof mockPreferencesFetch>) =>
    fetchSpy.mock.calls
      .filter(([url]) => String(url).endsWith("/me/preferences"))
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)))

  it("starts at 1 when no zoom was saved", () => {
    vi.spyOn(window, "fetch").mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePlayerData("test-id"))

    expect(result.current.currentFontSize).toBe(1)
  })

  it("starts at the zoom saved for text", () => {
    mockState.user.preferences.zoom = { text: 3, pdf: 2 }
    vi.spyOn(window, "fetch").mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePlayerData("test-id"))

    expect(result.current.currentFontSize).toBe(3)
  })

  it("saves the text zoom when it changes", () => {
    mockState.user.preferences.zoom = { text: 2 }
    const fetchSpy = mockPreferencesFetch()
    const { result } = renderHook(() => usePlayerData("test-id"))

    act(() => result.current.handleFontSizeUp())

    expect(mockDispatch).toHaveBeenCalledWith(
      setUserPreferences({ zoom: { text: 3 } })
    )
    expect(savedZoom(fetchSpy)).toEqual([{ zoom: { text: 3 } }])
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/me/preferences"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer fake-token"
        })
      })
    )
  })

  it("does not save past the largest or smallest zoom", () => {
    mockState.user.preferences.zoom = { text: 4 }
    const fetchSpy = mockPreferencesFetch()
    const { result, rerender } = renderHook(() => usePlayerData("test-id"))

    act(() => result.current.handleFontSizeUp())
    mockState.user.preferences.zoom = { text: 1 }
    rerender()
    act(() => result.current.handleFontSizeDown())

    expect(mockDispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: setUserPreferences.type })
    )
    expect(savedZoom(fetchSpy)).toEqual([])
  })
})

describe("usePlayerData font", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.user.preferences.font = ""
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(
      "fake-token"
    )
    vi.spyOn(console, "error").mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("starts at the default font when none was saved", () => {
    vi.spyOn(window, "fetch").mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePlayerData("test-id"))

    expect(result.current.currentFont).toBe("literata")
  })

  it("starts at the saved font", () => {
    mockState.user.preferences.font = "lora"
    vi.spyOn(window, "fetch").mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => usePlayerData("test-id"))

    expect(result.current.currentFont).toBe("lora")
  })

  it("saves the font when it changes", () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockImplementation(input =>
        String(input).endsWith("/me/preferences")
          ? Promise.resolve(new Response("{}", { status: 200 }))
          : new Promise(() => {})
      )
    const { result } = renderHook(() => usePlayerData("test-id"))

    act(() => result.current.setFont("inter"))

    expect(mockDispatch).toHaveBeenCalledWith(
      setUserPreferences({ font: "inter" })
    )
    const saved = fetchSpy.mock.calls
      .filter(([url]) => String(url).endsWith("/me/preferences"))
      .map(([, init]) => JSON.parse(String((init as RequestInit).body)))
    expect(saved).toEqual([{ font: "inter" }])
  })
})

describe("usePlayerData in the background", () => {
  // Sentences long enough to each make their own chunk
  const sentence = (i: number) =>
    `Sentence number ${i} is long enough to be read on its own, so it fills a whole chunk of the text by itself here.`
  const content = Array.from({ length: 30 }, (_, i) => sentence(i)).join(" ")

  // Answers the entry and the synthesis; synthesis of the sentences in
  // `pending` never answers, as if the network were still busy
  const mockBackend = (
    pending: (text: string) => boolean = () => false,
    boundaries: unknown[] = []
  ) =>
    vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith("/entries/long-id"))
        return new Response(
          JSON.stringify({ title: "Long", content, progress: 0 }),
          { status: 200 }
        )
      if (url.endsWith("/synthesis/GET")) {
        const { text } = JSON.parse(String(init?.body))
        if (pending(text)) return new Promise<Response>(() => {})
        return new Response(
          JSON.stringify({ audio: btoa("audio"), boundaries }),
          { status: 200 }
        )
      }
      return new Response(JSON.stringify([]), { status: 200 })
    })

  const synthesizedTexts = (fetchSpy: ReturnType<typeof mockBackend>) =>
    fetchSpy.mock.calls
      .filter(([url]) => String(url).endsWith("/synthesis/GET"))
      .map(([, init]) => JSON.parse(String(init?.body)).text as string)

  const setHidden = (hidden: boolean) =>
    Object.defineProperty(document, "hidden", {
      value: hidden,
      configurable: true
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
    Reflect.deleteProperty(document, "hidden")
  })

  const startPlayer = async () => {
    const { result } = renderHook(() => usePlayerData("long-id"))
    result.current.audioRef.current = createMockAudio()
    await waitFor(() => expect(result.current.isPlaying).toBe(true))
    return result
  }

  it("prefetches further ahead while the app is minimized", async () => {
    setHidden(true)
    const fetchSpy = mockBackend()

    await startPlayer()

    await waitFor(() =>
      expect(synthesizedTexts(fetchSpy)).toContain(sentence(15))
    )
  })

  it("prefetches only a few sentences while the app is visible", async () => {
    setHidden(false)
    const fetchSpy = mockBackend()

    await startPlayer()

    await waitFor(() =>
      expect(synthesizedTexts(fetchSpy)).toContain(sentence(5))
    )
    expect(synthesizedTexts(fetchSpy)).not.toContain(sentence(6))
  })

  it("prefetches further ahead as soon as the app is minimized", async () => {
    setHidden(false)
    const fetchSpy = mockBackend()
    await startPlayer()
    await waitFor(() =>
      expect(synthesizedTexts(fetchSpy)).toContain(sentence(5))
    )

    setHidden(true)
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"))
    })

    await waitFor(() =>
      expect(synthesizedTexts(fetchSpy)).toContain(sentence(15))
    )
  })

  it("does not ask twice for a sentence already being synthesized", async () => {
    const fetchSpy = mockBackend(text => text === sentence(1))
    const result = await startPlayer()

    act(() => result.current.setCurrentIndex(1))
    // Let the new sentence's requests go out
    await waitFor(() =>
      expect(synthesizedTexts(fetchSpy)).toContain(sentence(1))
    )
    await new Promise(resolve => setTimeout(resolve, 20))

    expect(
      synthesizedTexts(fetchSpy).filter(text => text === sentence(1))
    ).toHaveLength(1)
  })

  // iOS only keeps a locked phone playing when the next sentence starts
  // inside the ended event, before any await or React render
  it("starts the next sentence inside the ended event", async () => {
    let blobs = 0
    vi.mocked(URL.createObjectURL).mockImplementation(() => `blob:${blobs++}`)
    mockBackend()
    const result = await startPlayer()
    const audio = result.current.audioRef.current as HTMLAudioElement
    await waitFor(() =>
      expect(result.current.sentencesMap.get(1)?.audio.url).toBeTruthy()
    )
    const nextUrl = result.current.sentencesMap.get(1)?.audio.url
    const plays = vi.mocked(audio.play).mock.calls.length
    const pauses = vi.mocked(audio.pause).mock.calls.length

    act(() => {
      audio.onended?.(new Event("ended"))
      // Checked before React runs any effect
      expect(audio.src).toBe(nextUrl)
      expect(audio.play).toHaveBeenCalledTimes(plays + 1)
    })

    await waitFor(() => expect(result.current.currentIndex).toBe(1))
    await new Promise(resolve => setTimeout(resolve, 20))
    // The sentence already playing is not stopped and started over
    expect(audio.src).toBe(nextUrl)
    expect(audio.play).toHaveBeenCalledTimes(plays + 1)
    expect(audio.pause).toHaveBeenCalledTimes(pauses)
    expect(result.current.isPlaying).toBe(true)
    vi.mocked(URL.createObjectURL).mockImplementation(
      () => "blob:mock-audio-url"
    )
  })

  it("highlights the first word of the next sentence as soon as it starts", async () => {
    let blobs = 0
    vi.mocked(URL.createObjectURL).mockImplementation(() => `blob:${blobs++}`)
    mockBackend(() => false, [
      { text: "Sentence", start: 0.1, end: 0.4 },
      { text: "number", start: 0.5, end: 0.8 }
    ])
    const result = await startPlayer()
    const audio = result.current.audioRef.current as HTMLAudioElement
    await waitFor(() =>
      expect(result.current.sentencesMap.get(1)?.audio.url).toBeTruthy()
    )
    audio.currentTime = 0.6
    await waitFor(() => expect(result.current.activeWordIndex).toBe(1))

    act(() => {
      audio.currentTime = 0
      audio.onended?.(new Event("ended"))
    })

    expect(result.current.currentIndex).toBe(1)
    expect(result.current.activeWordIndex).toBe(0)
    vi.mocked(URL.createObjectURL).mockImplementation(
      () => "blob:mock-audio-url"
    )
  })

  // Mobile browsers reload or resume the audio on their own, e.g. when the
  // phone is turned, and that brings the rate back to its default
  it("keeps the chosen speed when the browser resets the audio rate", async () => {
    mockBackend()
    const result = await startPlayer()
    const audio = result.current.audioRef.current as HTMLAudioElement

    act(() => result.current.setSpeed("+50%"))

    expect(audio.playbackRate).toBe(1.5)
    expect(audio.defaultPlaybackRate).toBe(1.5)

    act(() => {
      audio.playbackRate = 1
      audio.onratechange?.(new Event("ratechange"))
    })

    expect(audio.playbackRate).toBe(1.5)
  })

  it("plays the next sentence at the speed chosen during the last one", async () => {
    let blobs = 0
    vi.mocked(URL.createObjectURL).mockImplementation(() => `blob:${blobs++}`)
    mockBackend()
    const result = await startPlayer()
    const audio = result.current.audioRef.current as HTMLAudioElement
    await waitFor(() =>
      expect(result.current.sentencesMap.get(5)?.audio.url).toBeTruthy()
    )
    // Let the prefetch settle, so nothing binds the ended event again
    await new Promise(resolve => setTimeout(resolve, 20))

    act(() => result.current.setSpeed("+100%"))
    act(() => {
      audio.onended?.(new Event("ended"))
    })

    expect(audio.playbackRate).toBe(2)
    vi.mocked(URL.createObjectURL).mockImplementation(
      () => "blob:mock-audio-url"
    )
  })

  it("saves progress with a request that outlives a frozen page", async () => {
    const fetchSpy = mockBackend()

    await startPlayer()

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/entries/text/long-id/progress"),
      expect.objectContaining({ method: "POST", keepalive: true })
    )
  })
})

describe("usePlayerData word highlight", () => {
  // "This is the content." spoken with a pause after each word
  const boundaries = [
    { text: "This", start: 0, end: 0.2 },
    { text: "is", start: 0.3, end: 0.4 },
    { text: "the", start: 0.5, end: 0.6 },
    { text: "content", start: 0.7, end: 1.0 }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(
      "fake-token"
    )
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(window, "fetch").mockImplementation(async input => {
      const url = String(input)
      if (url.endsWith("/entries/words-id"))
        return new Response(
          JSON.stringify({
            title: "Words",
            content: "This is the content.",
            progress: 0
          }),
          { status: 200 }
        )
      if (url.endsWith("/synthesis/GET"))
        return new Response(
          JSON.stringify({ audio: btoa("audio"), boundaries }),
          { status: 200 }
        )
      return new Response(JSON.stringify([]), { status: 200 })
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const startPlayer = async () => {
    const { result } = renderHook(() => usePlayerData("words-id"))
    const audio = createMockAudio()
    result.current.audioRef.current = audio
    await waitFor(() => expect(result.current.isPlaying).toBe(true))
    return { result, audio }
  }

  it("highlights the first word as soon as the sentence plays", async () => {
    const { result } = await startPlayer()

    await waitFor(() => expect(result.current.activeWordIndex).toBe(0))
  })

  it("follows the time of the audio", async () => {
    const { result, audio } = await startPlayer()

    audio.currentTime = 0.75
    await waitFor(() => expect(result.current.activeWordIndex).toBe(3))
    audio.currentTime = 0.35
    await waitFor(() => expect(result.current.activeWordIndex).toBe(1))
  })

  it("keeps a word highlighted in the pause between words", async () => {
    const { result, audio } = await startPlayer()

    audio.currentTime = 0.55
    await waitFor(() => expect(result.current.activeWordIndex).toBe(2))
    audio.currentTime = 0.65
    await new Promise(resolve => setTimeout(resolve, 50))

    expect(result.current.activeWordIndex).toBe(2)
  })

  it("keeps the word highlighted while paused", async () => {
    const { result, audio } = await startPlayer()
    audio.currentTime = 0.55
    await waitFor(() => expect(result.current.activeWordIndex).toBe(2))

    act(() => result.current.handlePause())

    expect(result.current.isPlaying).toBe(false)
    expect(result.current.activeWordIndex).toBe(2)
  })
})
