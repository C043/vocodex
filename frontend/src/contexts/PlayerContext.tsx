import { createContext, useContext } from "react"
import type { PDFDocumentProxy } from "pdfjs-dist"
import type { PdfPage, PageSize } from "../hooks/usePdfDocument"
import type { PdfView } from "../hooks/usePdfView"
import type { PageJump } from "../hooks/usePlayerData"
import type { BlockKind } from "../utils/pdfText"

export type boundaryObj = {
  text: string
  start: number
  end: number
}

export type SentenceObj = {
  id: number
  boundaries: boundaryObj[]
  text: string
  paragraphStart?: boolean
  // Set for books: the heading or paragraph the chunk is part of, and
  // whether it starts a new line of it
  block?: BlockKind
  lineStart?: boolean
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
  name: string
  locale: string
  language: string
}

export type PdfState = {
  doc: PDFDocumentProxy | null
  numPages: number
  pages: Map<number, PdfPage>
  defaultPageSize: PageSize | null
  loadPage: (page: number) => Promise<PdfPage | null>
}

interface PlayerContextType {
  // State
  isPlaying: boolean
  isLoading: boolean
  currentIndex: number
  activeWordIndex: number
  sentencesMap: Map<number, SentenceObj>
  title: string
  kind: "text" | "pdf"
  pdf: PdfState
  pdfView: PdfView
  currentFontSize: number
  currentFont: string
  voiceOptions: VoiceOption[]
  currentVoice: string
  speedOptions: SpeedOption[]
  currentSpeed: string
  isDarkMode: boolean
  isAutoScroll: boolean
  // The PDF page last jumped to, for the views to scroll to
  pageJump: PageJump | null

  // Functions
  handleFontSizeUp: () => void
  handleFontSizeDown: () => void
  setFont: (font: string) => void
  toggleAutoScroll: () => void
  togglePdfView: () => void
  goToPage: (page: number) => Promise<void>
  handlePause: () => void
  handlePlay: () => void
  handleForward: () => void
  handleBackwards: () => void
  setVoice: (voice: string) => void
  setSpeed: (speed: string) => void
  setCurrentIndex: (id: number) => void
  setActiveWordIndex: (num: number) => void
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
