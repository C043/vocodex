import { useState } from "react"

const STORAGE_KEY = "vocodex-auto-scroll"

const readStored = () => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false"
  } catch {
    return true
  }
}

// Whether the reader follows the chunk being read, remembered per browser
export const useAutoScroll = () => {
  const [isAutoScroll, setIsAutoScroll] = useState(readStored)

  const toggleAutoScroll = () => {
    const next = !isAutoScroll
    setIsAutoScroll(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next))
    } catch {
      // Storage blocked: the choice just won't survive a reload
    }
  }

  return { isAutoScroll, toggleAutoScroll }
}
