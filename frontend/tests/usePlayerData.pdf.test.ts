import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { usePlayerData } from "../src/hooks/usePlayerData"
import { setUserPreferences } from "../src/redux/reducer/authSlice"
import { openPdf, readPageText } from "../src/utils/pdf"
import type { PdfTextItem } from "../src/utils/pdfText"

vi.mock("../src/utils/pdf", () => ({
  openPdf: vi.fn(),
  readPageText: vi.fn()
}))

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
      zoom: {} as Record<string, number>
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

const NUM_PAGES = 30

const line = (str: string): PdfTextItem => ({
  str,
  hasEOL: true,
  transform: [12, 0, 0, 12, 72, 400]
})

// Every page has two chunks
const pageText = (page: number) => [
  line(`Page ${page} opens here.`),
  line(`Page ${page} ends here.`)
]

const synthesized: string[] = []

const mockFetch = (progress: number) =>
  vi.spyOn(window, "fetch").mockImplementation(async (input, init) => {
    const url = String(input)
    if (url.endsWith("/entries/book-id"))
      return new Response(
        JSON.stringify({ title: "A book", content: "", kind: "pdf", progress }),
        { status: 200 }
      )
    if (url.endsWith("/synthesis/GET")) {
      synthesized.push(JSON.parse(String(init?.body)).text)
      return new Response(
        JSON.stringify({ audio: btoa("audio"), boundaries: [] }),
        { status: 200 }
      )
    }
    return new Response(JSON.stringify([]), { status: 200 })
  })

const renderPlayer = () => {
  const hook = renderHook(() => usePlayerData("book-id"))
  hook.result.current.audioRef.current = createMockAudio()
  return hook
}

const loadedPages = () =>
  new Set(vi.mocked(readPageText).mock.calls.map(([, page]) => page))

describe("usePlayerData with a PDF entry", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.user.preferences.zoom = {}
    synthesized.length = 0
    vi.spyOn(window.localStorage.__proto__, "getItem").mockReturnValue(
      "fake-token"
    )
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.mocked(openPdf).mockResolvedValue({ numPages: NUM_PAGES } as never)
    vi.mocked(readPageText).mockImplementation(async (_, page) => ({
      items: pageText(page),
      width: 600,
      height: 800
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("opens the PDF and starts reading the first page", async () => {
    mockFetch(0)
    const { result } = renderPlayer()

    await waitFor(() => expect(result.current.isPlaying).toBe(true))

    expect(openPdf).toHaveBeenCalledWith("book-id")
    expect(result.current.kind).toBe("pdf")
    expect(result.current.title).toBe("A book")
    expect(result.current.currentIndex).toBe(0)
    expect(synthesized[0]).toBe("Page 1 opens here. Page 1 ends here.")
  })

  it("sends a word broken over two lines to the voice as one word", async () => {
    vi.mocked(readPageText).mockImplementation(async () => ({
      items: [line("It is self-"), line("hosted.")],
      width: 600,
      height: 800
    }))
    mockFetch(0)
    const { result } = renderPlayer()

    await waitFor(() => expect(result.current.isPlaying).toBe(true))

    expect(synthesized[0]).toBe("It is selfhosted.")
  })

  it("resumes on the saved page, loading only the pages around it", async () => {
    // Chunk 0 of page 12
    mockFetch(110000)
    const { result } = renderPlayer()

    await waitFor(() => expect(result.current.currentIndex).toBe(110000))
    await waitFor(() => {
      expect(result.current.pdf.pages.has(11)).toBe(true)
      expect(result.current.pdf.pages.has(13)).toBe(true)
    })

    expect(result.current.sentencesMap.get(110000)?.text).toContain("Page 12")
    // Neighbors are read for running headers; the rest of the book is not
    for (const page of loadedPages()) {
      expect(page === 1 || (page >= 9 && page <= 15)).toBe(true)
    }
  })

  it("moves on to the next page when a page is over", async () => {
    mockFetch(0)
    const { result } = renderPlayer()
    await waitFor(() => expect(result.current.isPlaying).toBe(true))

    await act(async () => {
      await result.current.handleForward()
    })

    expect(result.current.currentIndex).toBe(10000)
    await waitFor(() => expect(result.current.pdf.pages.has(3)).toBe(true))
    await waitFor(() =>
      expect(result.current.sentencesMap.get(10000)?.text).toContain("Page 2")
    )
  })

  it("starts the next page inside the ended event, for a locked iPhone", async () => {
    let blobs = 0
    vi.mocked(URL.createObjectURL).mockImplementation(() => `blob:${blobs++}`)
    mockFetch(0)
    const { result } = renderPlayer()
    const audio = result.current.audioRef.current as HTMLAudioElement
    await waitFor(() =>
      expect(result.current.sentencesMap.get(10000)?.audio.url).toBeTruthy()
    )
    const nextUrl = result.current.sentencesMap.get(10000)?.audio.url

    act(() => {
      audio.onended?.(new Event("ended"))
      expect(audio.src).toBe(nextUrl)
    })

    await waitFor(() => expect(result.current.currentIndex).toBe(10000))
    vi.mocked(URL.createObjectURL).mockImplementation(
      () => "blob:mock-audio-url"
    )
  })

  it("goes back to the previous page", async () => {
    mockFetch(10000)
    const { result } = renderPlayer()
    await waitFor(() => expect(result.current.currentIndex).toBe(10000))

    await act(async () => {
      await result.current.handleBackwards()
    })

    expect(result.current.currentIndex).toBe(0)
  })

  it("stays on the last chunk at the end of the document", async () => {
    mockFetch((NUM_PAGES - 1) * 10000)
    const { result } = renderPlayer()
    await waitFor(() =>
      expect(result.current.currentIndex).toBe((NUM_PAGES - 1) * 10000)
    )
    await waitFor(() =>
      expect(
        result.current.sentencesMap.get((NUM_PAGES - 1) * 10000)?.text
      ).toContain(`Page ${NUM_PAGES}`)
    )

    await act(async () => {
      await result.current.handleForward()
    })

    expect(result.current.currentIndex).toBe((NUM_PAGES - 1) * 10000)
  })

  it("jumps to the start of a chosen page", async () => {
    mockFetch(0)
    const { result } = renderPlayer()
    await waitFor(() => expect(result.current.currentIndex).toBe(0))

    await act(async () => {
      await result.current.goToPage(7)
    })

    expect(result.current.currentIndex).toBe(60000)
    expect(result.current.pageJump?.page).toBe(7)
    await waitFor(() =>
      expect(result.current.sentencesMap.get(60000)?.text).toContain("Page 7")
    )
  })

  it("keeps a page jump inside the document", async () => {
    mockFetch(0)
    const { result } = renderPlayer()
    await waitFor(() => expect(result.current.currentIndex).toBe(0))

    await act(async () => {
      await result.current.goToPage(NUM_PAGES + 50)
    })
    expect(result.current.currentIndex).toBe((NUM_PAGES - 1) * 10000)
    expect(result.current.pageJump?.page).toBe(NUM_PAGES)

    await act(async () => {
      await result.current.goToPage(-3)
    })
    expect(result.current.currentIndex).toBe(0)
    expect(result.current.pageJump?.page).toBe(1)
  })

  it("asks to scroll again when jumping to the same page twice", async () => {
    mockFetch(0)
    const { result } = renderPlayer()
    await waitFor(() => expect(result.current.currentIndex).toBe(0))

    await act(async () => {
      await result.current.goToPage(4)
    })
    const first = result.current.pageJump

    await act(async () => {
      await result.current.goToPage(4)
    })
    expect(result.current.pageJump).not.toBe(first)
    expect(result.current.pageJump?.page).toBe(4)
  })

  it("uses and saves the zoom of PDFs, apart from the text one", async () => {
    mockState.user.preferences.zoom = { text: 1, pdf: 3 }
    const fetchSpy = mockFetch(0)
    const { result } = renderPlayer()
    await waitFor(() => expect(result.current.kind).toBe("pdf"))

    expect(result.current.currentFontSize).toBe(3)

    act(() => result.current.handleFontSizeDown())

    expect(mockDispatch).toHaveBeenCalledWith(
      setUserPreferences({ zoom: { pdf: 2 } })
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/me/preferences"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ zoom: { pdf: 2 } })
      })
    )
  })

  it("switches a PDF between its pages and its text", async () => {
    mockFetch(0)
    const { result } = renderPlayer()
    await waitFor(() => expect(result.current.kind).toBe("pdf"))

    expect(result.current.pdfView).toBe("pdf")
    act(() => result.current.togglePdfView())
    expect(result.current.pdfView).toBe("text")
  })

  it("uses and saves the text size while a PDF is read as text", async () => {
    mockState.user.preferences.zoom = { text: 2, pdf: 4 }
    const fetchSpy = mockFetch(0)
    const { result } = renderPlayer()
    await waitFor(() => expect(result.current.kind).toBe("pdf"))
    act(() => result.current.togglePdfView())

    expect(result.current.currentFontSize).toBe(2)

    act(() => result.current.handleFontSizeUp())

    expect(mockDispatch).toHaveBeenCalledWith(
      setUserPreferences({ zoom: { text: 3 } })
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining("/me/preferences"),
      expect.objectContaining({ body: JSON.stringify({ zoom: { text: 3 } }) })
    )
  })
})
