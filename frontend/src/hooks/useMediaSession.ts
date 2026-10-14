import { useEffect, useRef } from "react"

type MediaControls = {
  onPlay: () => void
  onPause: () => void
  onNext: () => void
  onPrevious: () => void
}

type Options = MediaControls & {
  title: string
  isPlaying: boolean
}

const ACTIONS: [MediaSessionAction, keyof MediaControls][] = [
  ["play", "onPlay"],
  ["pause", "onPause"],
  ["nexttrack", "onNext"],
  ["previoustrack", "onPrevious"]
]

const ARTWORK: MediaImage[] = [
  { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
  { src: "/icon-512.png", sizes: "512x512", type: "image/png" }
]

const getSession = () =>
  "mediaSession" in navigator ? navigator.mediaSession : null

// Registers the player with the system media controls (lock screen,
// notification, headset buttons). Mobile browsers keep a page that owns an
// active media session running when it is minimized.
export const useMediaSession = ({ title, isPlaying, ...controls }: Options) => {
  // The handlers are registered once, so they call the latest controls
  const controlsRef = useRef(controls)
  controlsRef.current = controls

  useEffect(() => {
    const session = getSession()
    if (!session) return
    for (const [action, name] of ACTIONS) {
      try {
        session.setActionHandler(action, () => controlsRef.current[name]())
      } catch {
        // Browsers throw on actions they do not support
      }
    }
    return () => {
      for (const [action] of ACTIONS) {
        try {
          session.setActionHandler(action, null)
        } catch {
          // Same as above
        }
      }
      session.metadata = null
      session.playbackState = "none"
    }
  }, [])

  useEffect(() => {
    const session = getSession()
    if (!session || typeof MediaMetadata === "undefined") return
    session.metadata = new MediaMetadata({
      title,
      artist: "VOCODEX",
      artwork: ARTWORK
    })
  }, [title])

  useEffect(() => {
    const session = getSession()
    if (session) session.playbackState = isPlaying ? "playing" : "paused"
  }, [isPlaying])
}
