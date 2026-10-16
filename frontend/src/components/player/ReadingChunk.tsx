import { Fragment, memo, useMemo } from "react"
import type { ReactNode } from "react"
import { isWord } from "../../utils/pdfText"
import type { InlineStyle } from "../../utils/bookText"

type ReadingChunkProps = {
  id: number
  text: string
  isCurrent: boolean
  // Word being spoken, or -1 when there is none to show
  activeWordIndex: number
  isLoading: boolean
  // Stable across renders, so only the chunks that change render again
  onSelect: (id: number) => void
  chunkRef: (id: number, el: HTMLSpanElement | null) => void
  // Parts of the text in italic or bold
  styles?: InlineStyle[]
}

const NO_STYLES: InlineStyle[] = []

// The part of the text from start, split where its styles change
const renderStyled = (
  text: string,
  start: number,
  styles: InlineStyle[]
): ReactNode => {
  const end = start + text.length
  const cuts = new Set([start, end])
  for (const s of styles) {
    if (s.start > start && s.start < end) cuts.add(s.start)
    if (s.end > start && s.end < end) cuts.add(s.end)
  }
  const points = [...cuts].sort((a, b) => a - b)

  return points.slice(0, -1).map((from, idx) => {
    const part = text.slice(from - start, points[idx + 1] - start)
    const has = (style: InlineStyle["style"]) =>
      styles.some(s => s.style === style && s.start <= from && s.end > from)
    let node: ReactNode = part
    if (has("italic")) node = <em>{node}</em>
    if (has("bold")) node = <strong>{node}</strong>
    return <span key={from}>{node}</span>
  })
}

// A chunk of the text being read, with its word being spoken highlighted
const ReadingChunk = ({
  id,
  text,
  isCurrent,
  activeWordIndex,
  isLoading,
  onSelect,
  chunkRef,
  styles = NO_STYLES
}: ReadingChunkProps) => {
  const tokens = useMemo(() => {
    let wordCounter = 0
    let offset = 0
    return text
      .split(/(\s+)/)
      .filter(t => t.length > 0)
      .map(token => {
        const start = offset
        offset += token.length
        return {
          text: token,
          start,
          wordIndex: isWord(token) ? wordCounter++ : null
        }
      })
  }, [text])

  // Plain text stays plain strings: only styled tokens are split
  const content = (token: { text: string; start: number }) =>
    styles.some(
      s => s.start < token.start + token.text.length && s.end > token.start
    )
      ? renderStyled(token.text, token.start, styles)
      : token.text

  return (
    <span
      data-chunk-id={id}
      aria-current={isCurrent ? "true" : undefined}
      ref={el => chunkRef(id, el)}
      onClick={() => {
        if (!isLoading) {
          onSelect(id)
        }
      }}
      className={`
        rounded-lg
        px-1
        -mx-1
        py-0.5
        box-decoration-clone
        transition-colors
        duration-500
        scroll-mb-40
        md:scroll-mb-0
        ${isCurrent ? "bg-violet-500/15 text-foreground dark:bg-violet-500/20" : "text-foreground/55"}
        ${isLoading || isCurrent ? "" : "cursor-pointer hover:text-foreground hover:bg-violet-500/15 hover:duration-150"}
      `}
    >
      {tokens.map((token, idx) => {
        if (token.wordIndex === null)
          return <Fragment key={`${id}-${idx}`}>{content(token)}</Fragment>

        const isActive = isCurrent && token.wordIndex === activeWordIndex

        // Painted on the word itself: positioned, z-indexed overlays
        // changing word by word make the glass bars lose their blur. No
        // transition: a fading highlight trails the voice
        return (
          <span
            key={`${id}-${idx}`}
            className={`
              rounded-md
              box-decoration-clone
              ${isActive ? "bg-brand text-white px-1 -mx-1 py-0.5 shadow-md shadow-violet-500/40" : ""}
            `}
          >
            {content(token)}
          </span>
        )
      })}
    </span>
  )
}

export default memo(ReadingChunk)
