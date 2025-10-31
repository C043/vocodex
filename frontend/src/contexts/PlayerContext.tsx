import { createContext, useContext } from "react"

type sentenceObj = {
  id: number
  text: string
  prev: string | null
  audio: {
    url: string | null
    voice: string | null
  }
  next: string | null
}

type SpeedOption = {
  key: string
  label: string
}

type VoiceOption = {
  key: string
  label: string
}

interface PlayerContextType {
  // State
  isPlaying: boolean
  isLoading: boolean
  currentIndex: number
  sentencesMap: Map<number, sentenceObj>
  title: string
  currentFontSize: number
  voiceOptions: VoiceOption[]
  speedOptions: SpeedOption[]
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
