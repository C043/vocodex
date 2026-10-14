// How fast the voices read at normal speed, used until the audio of a few
// chunks tells the real pace of the voice
export const DEFAULT_CHARS_PER_SECOND = 15

// Speed options are percentages added to the normal speed: "+50%" -> 1.5
export const speedRate = (speed: string) => {
  const percent = parseFloat(speed)
  return Number.isNaN(percent) ? 1 : 1 + percent / 100
}

export const formatTime = (seconds: number) => {
  const total = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, "0")
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
}

export type ChunkLength = { id: number; chars: number }

type TimelineInput = {
  // Chunks of each loaded page; a text entry is a single page
  pages: Map<number, ChunkLength[]>
  numPages: number
  currentPage: number
  currentId: number
  // Seconds of audio of the chunks already synthesized, at normal speed
  durations: Map<number, number>
}

// Seconds at normal speed read before the current chunk, of the current
// chunk and of the whole entry. Chunks without audio are estimated from
// their length at the pace of the audio heard so far, and the pages not
// loaded yet as long as the average loaded page
export const readingTimeline = ({
  pages,
  numPages,
  currentPage,
  currentId,
  durations
}: TimelineInput) => {
  let heardChars = 0
  let heardSeconds = 0
  for (const chunks of pages.values()) {
    for (const chunk of chunks) {
      const seconds = durations.get(chunk.id)
      if (seconds === undefined) continue
      heardChars += chunk.chars
      heardSeconds += seconds
    }
  }
  const cps =
    heardSeconds > 0 ? heardChars / heardSeconds : DEFAULT_CHARS_PER_SECOND
  const secondsOf = (chunk: ChunkLength) =>
    durations.get(chunk.id) ?? chunk.chars / cps

  const pageSeconds = new Map<number, number>()
  for (const [page, chunks] of pages) {
    pageSeconds.set(
      page,
      chunks.reduce((sum, c) => sum + secondsOf(c), 0)
    )
  }
  const loaded = [...pageSeconds.values()]
  const averagePage =
    loaded.length > 0 ? loaded.reduce((a, b) => a + b, 0) / loaded.length : 0

  let before = 0
  let total = 0
  for (let page = 1; page <= numPages; page++) {
    const seconds = pageSeconds.get(page) ?? averagePage
    total += seconds
    if (page < currentPage) before += seconds
  }

  let current = 0
  for (const chunk of pages.get(currentPage) ?? []) {
    if (chunk.id === currentId) {
      current = secondsOf(chunk)
      break
    }
    before += secondsOf(chunk)
  }

  return { before, current, total }
}
