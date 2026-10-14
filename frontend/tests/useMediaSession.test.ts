import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook } from "@testing-library/react"
import { useMediaSession } from "../src/hooks/useMediaSession"

type Handler = (() => void) | null

const createMediaSession = () => {
  const handlers = new Map<string, Handler>()
  return {
    handlers,
    session: {
      metadata: null as MediaMetadata | null,
      playbackState: "none" as MediaSessionPlaybackState,
      setActionHandler: vi.fn((action: string, handler: Handler) => {
        handlers.set(action, handler)
      })
    }
  }
}

// jsdom has no MediaMetadata
class FakeMediaMetadata {
  title: string
  artist: string
  artwork: MediaImage[]
  constructor(init: MediaMetadataInit) {
    this.title = init.title ?? ""
    this.artist = init.artist ?? ""
    this.artwork = init.artwork ? [...init.artwork] : []
  }
}

const controls = () => ({
  onPlay: vi.fn(),
  onPause: vi.fn(),
  onNext: vi.fn(),
  onPrevious: vi.fn()
})

describe("useMediaSession", () => {
  let mediaSession: ReturnType<typeof createMediaSession>

  beforeEach(() => {
    mediaSession = createMediaSession()
    vi.stubGlobal("MediaMetadata", FakeMediaMetadata)
    Object.defineProperty(navigator, "mediaSession", {
      value: mediaSession.session,
      configurable: true
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(navigator, "mediaSession")
  })

  it("shows the title of the entry being read", () => {
    renderHook(() =>
      useMediaSession({ title: "My book", isPlaying: false, ...controls() })
    )

    expect(mediaSession.session.metadata?.title).toBe("My book")
    expect(mediaSession.session.metadata?.artist).toBe("VOCODEX")
    expect(mediaSession.session.metadata?.artwork.length).toBeGreaterThan(0)
  })

  it("tells the system whether it is playing", () => {
    const { rerender } = renderHook(
      ({ isPlaying }) =>
        useMediaSession({ title: "My book", isPlaying, ...controls() }),
      { initialProps: { isPlaying: true } }
    )
    expect(mediaSession.session.playbackState).toBe("playing")

    rerender({ isPlaying: false })
    expect(mediaSession.session.playbackState).toBe("paused")
  })

  it("lets the lock screen controls drive the player", () => {
    const actions = controls()
    renderHook(() =>
      useMediaSession({ title: "My book", isPlaying: false, ...actions })
    )

    mediaSession.handlers.get("play")?.()
    mediaSession.handlers.get("pause")?.()
    mediaSession.handlers.get("nexttrack")?.()
    mediaSession.handlers.get("previoustrack")?.()

    expect(actions.onPlay).toHaveBeenCalledOnce()
    expect(actions.onPause).toHaveBeenCalledOnce()
    expect(actions.onNext).toHaveBeenCalledOnce()
    expect(actions.onPrevious).toHaveBeenCalledOnce()
  })

  it("calls the latest controls after a rerender", () => {
    const first = controls()
    const latest = controls()
    const { rerender } = renderHook(
      ({ actions }) =>
        useMediaSession({ title: "My book", isPlaying: true, ...actions }),
      { initialProps: { actions: first } }
    )

    rerender({ actions: latest })
    mediaSession.handlers.get("pause")?.()

    expect(first.onPause).not.toHaveBeenCalled()
    expect(latest.onPause).toHaveBeenCalledOnce()
  })

  it("clears the session when the player closes", () => {
    const { unmount } = renderHook(() =>
      useMediaSession({ title: "My book", isPlaying: true, ...controls() })
    )

    unmount()

    expect(mediaSession.session.metadata).toBeNull()
    expect(mediaSession.session.playbackState).toBe("none")
    expect(mediaSession.handlers.get("play")).toBeNull()
    expect(mediaSession.handlers.get("nexttrack")).toBeNull()
  })

  it("does nothing where the Media Session API is missing", () => {
    Reflect.deleteProperty(navigator, "mediaSession")

    expect(() =>
      renderHook(() =>
        useMediaSession({ title: "My book", isPlaying: true, ...controls() })
      )
    ).not.toThrow()
  })
})
