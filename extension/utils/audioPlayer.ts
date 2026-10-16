import { playAudio } from "./playAudio"
import type { AudioEvent } from "./messages"

// How often the tab is told the time: often enough for the word highlight
// to follow the voice
const TICK_MS = 50

// Plays the chunks of one tab at a time, from a page of the extension, where
// the CSP of the web page cannot block the audio
export const createAudioPlayer = (
  el: HTMLAudioElement,
  emit: (tabId: number, event: AudioEvent) => void
) => {
  let owner: number | null = null
  let ticker: ReturnType<typeof setInterval> | undefined

  const stopTicking = () => clearInterval(ticker)
  const tell = (event: AudioEvent) => {
    if (owner !== null) emit(owner, event)
  }

  el.addEventListener("ended", () => {
    stopTicking()
    tell({ type: "audio:ended" })
  })

  return {
    play: (tabId: number, audio: string, at: number, rate: number) => {
      if (owner !== null && owner !== tabId) tell({ type: "audio:interrupted" })
      owner = tabId
      el.src = `data:audio/mpeg;base64,${audio}`
      el.currentTime = at
      el.playbackRate = rate
      playAudio(el, () => {
        stopTicking()
        tell({ type: "audio:interrupted" })
      })
      stopTicking()
      ticker = setInterval(() => tell({ type: "audio:time", time: el.currentTime }), TICK_MS)
    },
    pause: (tabId: number) => {
      if (tabId !== owner) return
      stopTicking()
      el.pause()
    },
    setRate: (tabId: number, rate: number) => {
      if (tabId === owner) el.playbackRate = rate
    }
  }
}

export type AudioPlayer = ReturnType<typeof createAudioPlayer>
