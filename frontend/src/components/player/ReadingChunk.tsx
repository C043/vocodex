import { memo, useMemo } from "react"
import { isWord } from "../../utils/pdfText"

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
}

// A chunk of the text being read, with its word being spoken highlighted
const ReadingChunk = ({
  id,
  text,
  isCurrent,
  activeWordIndex,
  isLoading,
  onSelect,
  chunkRef
}: ReadingChunkProps) => {
  const tokens = useMemo(() => {
    let wordCounter = 0
    return text
      .split(/(\s+)/)
      .filter(t => t.length > 0)
      .map(token => ({
        text: token,
        wordIndex: isWord(token) ? wordCounter++ : null
      }))
  }, [text])

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
        if (token.wordIndex === null) return token.text

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
            {token.text}
          </span>
        )
      })}
    </span>
  )
}

export default memo(ReadingChunk)
