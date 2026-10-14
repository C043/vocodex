import { RefObject, useEffect, useMemo, useRef, useState } from "react"
import { readingTimeline, speedRate } from "../utils/readingTime"
import type { ChunkLength } from "../utils/readingTime"

type Options = {
  audioRef: RefObject<HTMLAudioElement | null>
  pages: Map<number, ChunkLength[]>
  numPages: number
  currentPage: number
  currentIndex: number
  speed: string
  voice: string
}

// Time read and left of an entry at the current speed, following the audio
// of the chunk being read
export const useReadingProgress = ({
  audioRef,
  pages,
  numPages,
  currentPage,
  currentIndex,
  speed,
  voice
}: Options) => {
  // Real length of the audio of each chunk heard, which differs per voice
  const [durations, setDurations] = useState<Map<number, number>>(new Map())
  // Seconds played of the current chunk
  const [played, setPlayed] = useState({ index: currentIndex, seconds: 0 })

  const indexRef = useRef(currentIndex)
  // The audio element keeps the previous chunk until the new one loads
  const loadedRef = useRef(false)

  useEffect(() => {
    if (indexRef.current === currentIndex) return
    indexRef.current = currentIndex
    loadedRef.current = false
  }, [currentIndex])

  useEffect(() => {
    setDurations(new Map())
  }, [voice])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleLoaded = () => {
      const index = indexRef.current
      loadedRef.current = true
      setPlayed({ index, seconds: 0 })
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurations(prev => new Map(prev).set(index, audio.duration))
      }
    }
    const handleTime = () => {
      if (!loadedRef.current) return
      setPlayed({ index: indexRef.current, seconds: audio.currentTime })
    }

    audio.addEventListener("loadedmetadata", handleLoaded)
    audio.addEventListener("timeupdate", handleTime)
    return () => {
      audio.removeEventListener("loadedmetadata", handleLoaded)
      audio.removeEventListener("timeupdate", handleTime)
    }
  }, [audioRef])

  const { before, current, total } = useMemo(
    () =>
      readingTimeline({
        pages,
        numPages,
        currentPage,
        currentId: currentIndex,
        durations
      }),
    [pages, numPages, currentPage, currentIndex, durations]
  )

  const seconds = played.index === currentIndex ? played.seconds : 0
  const rate = speedRate(speed)
  const read = before + Math.min(seconds, current)

  return {
    elapsed: read / rate,
    remaining: (total - read) / rate,
    total: total / rate,
    fraction: total > 0 ? read / total : 0
  }
}
