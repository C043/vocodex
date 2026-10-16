import type { PdfChunk } from "@vocodex/utils/pdfText"
import { speedRate } from "@vocodex/utils/speed"
import { toSpeech } from "@vocodex/utils/splitIntoChunks"
import { wordAt } from "@vocodex/utils/wordTiming"
import { wordSpans, type Boundary, type WordSpan } from "./pageChunks"

export type Synthesis = {
  // The mp3 of the chunk, in base64, as the server sends it
  audio: string
  boundaries: Boundary[]
}

// Where the audio plays: the reader only tells it what and from where
export type AudioOutput = {
  play: (audio: string, at: number, rate: number) => void
  pause: () => void
  setRate: (rate: number) => void
}

export type ReaderSettings = {
  voice: string
  speed: string
}

export type ReaderState = ReaderSettings & {
  playing: boolean
  loading: boolean
  index: number
  count: number
  // The word being said, as a range of the page text
  word: { start: number; end: number } | null
  error: string | null
}

type ReaderDeps = {
  chunks: PdfChunk[]
  synthesize: (text: string, voice: string) => Promise<Synthesis>
  audio: AudioOutput
  onChange: (state: ReaderState) => void
}

// Chunks synthesized ahead of the one playing, so the next starts right away
const PREFETCH = 2

// Reads the chunks of a page one after the other, like the player of the
// app: picking a chunk, going forward or back always plays from there
export const createReader = (deps: ReaderDeps, settings: ReaderSettings) => {
  const { chunks, audio } = deps
  let { voice, speed } = settings
  let index = 0
  // Time reached in the chunk, to resume from after a pause
  let position = 0
  let playing = false
  let loading = false
  let error: string | null = null
  let spans: WordSpan[] = []
  let word: ReaderState["word"] = null
  // Bumped on every new start or stop, so a late synthesis never plays a
  // chunk that was left
  let run = 0
  const cache = new Map<string, Promise<Synthesis>>()

  const state = (): ReaderState => ({
    voice, speed, playing, loading, index, count: chunks.length, word, error
  })
  const emit = () => deps.onChange(state())

  const load = (idx: number) => {
    const key = `${voice}|${idx}`
    let request = cache.get(key)
    if (!request) {
      request = deps.synthesize(toSpeech(chunks[idx].text), voice)
      // A failed request is asked again next time
      request.catch(() => cache.delete(key))
      cache.set(key, request)
    }
    return request
  }

  const prefetch = (from: number) => {
    for (let idx = from + 1; idx <= from + PREFETCH && idx < chunks.length; idx++) {
      load(idx).catch(() => {})
    }
  }

  const start = async () => {
    const current = ++run
    playing = true
    loading = true
    error = null
    emit()
    try {
      const synthesis = await load(index)
      if (current !== run) return
      spans = wordSpans(chunks[index], synthesis.boundaries)
      loading = false
      audio.play(synthesis.audio, position, speedRate(speed))
      emit()
      prefetch(index)
    } catch (err) {
      if (current !== run) return
      playing = false
      loading = false
      error = err instanceof Error ? err.message : String(err)
      emit()
    }
  }

  const stop = () => {
    run++
    playing = false
    loading = false
  }

  const goTo = (idx: number) => {
    index = Math.max(0, Math.min(idx, chunks.length - 1))
    position = 0
    spans = []
    word = null
    start()
  }

  return {
    state,
    play: () => {
      if (!playing && chunks.length > 0) start()
    },
    pause: () => {
      stop()
      audio.pause()
      emit()
    },
    next: () => goTo(index + 1),
    previous: () => goTo(index - 1),
    seek: goTo,
    setSpeed: (value: string) => {
      speed = value
      if (playing && !loading) audio.setRate(speedRate(speed))
      emit()
    },
    setVoice: (value: string) => {
      voice = value
      // Word timings change with the voice, so the chunk starts over
      position = 0
      spans = []
      word = null
      if (playing) start()
      else emit()
    },
    onTime: (time: number) => {
      if (!playing || loading) return
      position = time
      const span = spans[wordAt(spans.map(span => span.time), time)]
      const next = span ? { start: span.start, end: span.end } : null
      if (next?.start === word?.start && next?.end === word?.end) return
      word = next
      emit()
    },
    onEnded: () => {
      if (index < chunks.length - 1) return goTo(index + 1)
      stop()
      position = 0
      emit()
    },
    // Another tab started playing
    onInterrupted: () => {
      stop()
      emit()
    },
    destroy: () => {
      if (playing) audio.pause()
      stop()
    }
  }
}

export type Reader = ReturnType<typeof createReader>
