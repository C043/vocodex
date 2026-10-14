type ReadingChunkProps = {
  id: number
  text: string
  isCurrent: boolean
  // Word being spoken, or -1 when there is none to show
  activeWordIndex: number
  isLoading: boolean
  onSelect: () => void
  chunkRef: (el: HTMLSpanElement | null) => void
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
  let wordCounter = 0

  const tokens = text
    .split(/(\s+)/)
    .filter(t => t.length > 0)
    .map(token => {
      const isWord = /[A-Za-z0-9'’]+/.test(token)

      if (isWord) {
        const idx = wordCounter
        wordCounter += 1
        return { text: token, wordIndex: idx }
      }

      return { text: token, wordIndex: null }
    })

  return (
    <span
      data-chunk-id={id}
      aria-current={isCurrent ? "true" : undefined}
      ref={chunkRef}
      onClick={() => {
        if (!isLoading) {
          onSelect()
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
        ${isLoading || isCurrent ? "" : "cursor-pointer hover:text-foreground/90"}
      `}
    >
      {tokens.map((token, idx) => {
        if (token.wordIndex === null) return token.text

        const isActive = isCurrent && token.wordIndex === activeWordIndex

        // Painted on the word itself: positioned, z-indexed overlays
        // changing word by word make the glass bars lose their blur
        return (
          <span
            key={`${id}-${idx}`}
            className={`
              rounded-md
              box-decoration-clone
              transition-colors
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

export default ReadingChunk
