import type { AudioEvent, ReaderCommand } from "./messages"
import { chunkIndexAt, chunkPage } from "./pageChunks"
import { offsetOf, rangeOf, readPage } from "./pageText"
import {
  createReader,
  type AudioOutput,
  type ReaderSettings,
  type ReaderState,
  type Synthesis
} from "./reader"

// Paints a named highlight over a range of the page, or clears it
export type Highlighter = {
  set: (name: string, range: Range | null) => void
}

type PageReaderDeps = {
  root: Element
  settings: ReaderSettings
  synthesize: (text: string, voice: string) => Promise<Synthesis>
  audio: AudioOutput
  notify: (state: ReaderState) => void
  highlighter: Highlighter
  // The text node and offset under a point of the screen
  caretAt: (x: number, y: number) => { node: Node; offset: number } | null
  // Keeps the word being said in view
  follow: (range: Range) => void
  maxChars?: number
}

export const HIGHLIGHTS = ["vocodex-chunk", "vocodex-word", "vocodex-hover"] as const

// Reads a web page aloud, switched on from the popup: highlights the chunk
// and the word being said, and plays from a chunk clicked, like the reader
// of the app
export const createPageReader = (deps: PageReaderDeps) => {
  const { highlighter } = deps
  const page = readPage(deps.root)
  const chunks = chunkPage(page, deps.maxChars)
  const doc = deps.root.ownerDocument

  const chunkRange = (idx: number) => {
    const chunk = chunks[idx]
    return chunk ? rangeOf(page, chunk.start, chunk.end) : null
  }

  const render = (state: ReaderState) => {
    highlighter.set("vocodex-chunk", chunkRange(state.index))
    const word = state.word && rangeOf(page, state.word.start, state.word.end)
    highlighter.set("vocodex-word", word)
    if (word && state.playing) deps.follow(word)
  }

  const reader = createReader(
    {
      chunks,
      synthesize: deps.synthesize,
      audio: deps.audio,
      onChange: state => {
        render(state)
        deps.notify(state)
      }
    },
    deps.settings
  )

  // The chunk under the mouse, or -1 off the text read
  const chunkAtPoint = (event: MouseEvent) => {
    const caret = deps.caretAt(event.clientX, event.clientY)
    if (!caret) return -1
    const offset = offsetOf(page, caret.node, caret.offset)
    return offset === -1 ? -1 : chunkIndexAt(chunks, offset)
  }

  let hovered = -1
  const onMove = (event: MouseEvent) => {
    const idx = chunkAtPoint(event)
    if (idx === hovered) return
    hovered = idx
    highlighter.set("vocodex-hover", chunkRange(idx))
  }

  const onClick = (event: MouseEvent) => {
    // The click that ends a selection is not a skip
    if (!(doc.getSelection()?.isCollapsed ?? true)) return
    const idx = chunkAtPoint(event)
    if (idx !== -1) reader.seek(idx)
  }

  doc.addEventListener("mousemove", onMove)
  doc.addEventListener("click", onClick)

  const off = () => {
    reader.destroy()
    doc.removeEventListener("mousemove", onMove)
    doc.removeEventListener("click", onClick)
    HIGHLIGHTS.forEach(name => highlighter.set(name, null))
  }

  return {
    handle: (command: ReaderCommand): ReaderState => {
      switch (command.type) {
        case "reader:play": reader.play(); break
        case "reader:pause": reader.pause(); break
        case "reader:next": reader.next(); break
        case "reader:previous": reader.previous(); break
        case "reader:voice": reader.setVoice(command.voice); break
        case "reader:speed": reader.setSpeed(command.speed); break
        case "reader:off": off(); break
      }
      return reader.state()
    },
    onAudioEvent: (event: AudioEvent) => {
      if (event.type === "audio:time") reader.onTime(event.time)
      else if (event.type === "audio:ended") reader.onEnded()
      else reader.onInterrupted()
    }
  }
}

export type PageReader = ReturnType<typeof createPageReader>
