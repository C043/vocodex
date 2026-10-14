import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, waitFor, act } from "@testing-library/react"
import { usePlayerData } from "../src/hooks/usePlayerData"
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
    preferences: { speed: "+0%", voice: "en-GB-AdaMultilingualNeural" }
  }
}
vi.mock("react-redux", () => ({
  useDispatch: () => vi.fn(),
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
})
