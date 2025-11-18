import { createContext, useContext } from "react"

export type SentenceObj = {
  id: number
  words: string[]
  text: string
  prev: string | null
  audio: {
    url: string | null
    voice: string | null
  }
  next: string | null
}

export type SpeedOption = {
  key: string
  label: string
}

export type VoiceOption = {
  key: string
  label: string
}

interface PlayerContextType {
  // State
  isPlaying: boolean
  isLoading: boolean
  currentIndex: number
  currentWordIndex: number
  sentencesMap: Map<number, SentenceObj>
  title: string
  currentFontSize: number
  voiceOptions: VoiceOption[]
  currentVoice: string
  speedOptions: SpeedOption[]
  currentSpeed: string
  isDarkMode: boolean

  // Functions
  handleFontSizeUp: () => void
  handleFontSizeDown: () => void
  handlePause: () => void
  handlePlay: () => void
  handleForward: () => void
  handleBackwards: () => void
  setVoice: (voice: string) => void
  setSpeed: (speed: string) => void
  setCurrentIndex: (id: number) => void
}

export const PlayerContext = createContext<PlayerContextType | undefined>(
  undefined
)

export const usePlayer = () => {
  const context = useContext(PlayerContext)
  if (!context) {
    throw new Error("usePlayer must be used withing a PlayerProvider")
  }
  return context
}
