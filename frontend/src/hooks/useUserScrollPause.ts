import { useEffect, useRef } from "react"

// How long auto scroll stays paused after the user scrolls by hand
export const USER_SCROLL_PAUSE_MS = 4000

// Lets the user scroll freely: returns a function telling whether following
// the reading is paused because they recently touched or wheeled the page
export const useUserScrollPause = () => {
  const pausedUntil = useRef(0)

  useEffect(() => {
    const pause = () => {
      pausedUntil.current = Date.now() + USER_SCROLL_PAUSE_MS
    }
    window.addEventListener("wheel", pause, { passive: true })
    window.addEventListener("touchmove", pause, { passive: true })
    return () => {
      window.removeEventListener("wheel", pause)
      window.removeEventListener("touchmove", pause)
    }
  }, [])

  return () => Date.now() < pausedUntil.current
}
