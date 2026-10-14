import { useMemo } from "react"
import { usePlayer } from "../../contexts/PlayerContext"
import { useReadingProgress } from "../../hooks/useReadingProgress"
import { pageOfChunk } from "../../utils/pdfText"
import { formatTime } from "../../utils/readingTime"
import type { ChunkLength } from "../../utils/readingTime"

export const ReadingProgress = () => {
  const {
    audioRef,
    kind,
    currentIndex,
    currentSpeed,
    currentVoice,
    sentencesMap,
    pdf
  } = usePlayer()

  // A text entry is read as a single page
  const pages = useMemo(() => {
    const lengths = new Map<number, ChunkLength[]>()
    if (kind === "pdf") {
      for (const page of pdf.pages.values()) {
        lengths.set(
          page.pageNumber,
          page.chunks.map(chunk => ({ id: chunk.id, chars: chunk.text.length }))
        )
      }
    } else {
      lengths.set(
        1,
        [...sentencesMap.values()].map(s => ({
          id: s.id,
          chars: s.text.length
        }))
      )
    }
    return lengths
  }, [kind, pdf.pages, sentencesMap])

  const { elapsed, remaining, fraction } = useReadingProgress({
    audioRef,
    pages,
    numPages: kind === "pdf" ? pdf.numPages : 1,
    currentPage: kind === "pdf" ? pageOfChunk(currentIndex) : 1,
    currentIndex,
    speed: currentSpeed,
    voice: currentVoice
  })

  const percent = Math.round(fraction * 100)
  const time = "w-14 shrink-0 text-xs tabular-nums text-foreground/60"

  return (
    <div className="flex w-full items-center gap-3">
      <span aria-label="Time read" className={`${time} text-right`}>
        {formatTime(elapsed)}
      </span>
      <div
        role="progressbar"
        aria-label="Reading progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10"
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-300 ease-linear"
          style={{ width: `${fraction * 100}%` }}
        />
      </div>
      <span aria-label="Time left" className={time}>
        -{formatTime(remaining)}
      </span>
    </div>
  )
}
