import { usePlayer } from "../../contexts/PlayerContext"

const EntryContent = () => {
  const {
    title,
    sentencesMap,
    currentIndex,
    activeWordIndex,
    setCurrentIndex,
    isLoading,
    currentFontSize
  } = usePlayer()

  // Map font size to complete Tailwind classes
  const getFontSizeClasses = (size: number) => {
    const sizeMap: Record<number, { text: string; margin: string }> = {
      1: { text: "text-lg md:text-xl", margin: "mb-1" },
      2: { text: "text-xl md:text-2xl", margin: "mb-2" },
      3: { text: "text-2xl md:text-3xl", margin: "mb-3" },
      4: { text: "text-3xl md:text-4xl", margin: "mb-4" }
    }
    return sizeMap[size] || sizeMap[1]
  }
  const fontClasses = getFontSizeClasses(currentFontSize)

  return (
    <article className="max-w-3xl mx-auto">
      <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50 mb-2">
        Now reading
      </p>
      <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-gradient leading-[1.05] pb-2 mb-8 md:mb-12 break-words">
        {title}
      </h1>
      <div className="font-serif leading-relaxed mb-72 md:mb-52">
        {Array.from(sentencesMap.values()).map(sentence => {
          const boundaries = sentence.boundaries ?? []
          let wordCounter = 0

          const tokens = sentence.text
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
            <div
              key={sentence.id}
              className={`
              ${fontClasses.text}
              rounded-2xl
              px-2
              py-1.5
              -mx-2
              md:px-3
              md:-mx-3
              transition-colors
              duration-300
              ${fontClasses.margin}
              ${isLoading ? "" : currentIndex === sentence.id ? "bg-violet-500/15 ring-1 ring-violet-500/30 dark:bg-violet-500/20" : "text-foreground/75 hover:bg-foreground/5 cursor-pointer"}
            `}
            >
              <p
                className="whitespace-pre-wrap"
                onClick={() => {
                  if (!isLoading) {
                    setCurrentIndex(sentence.id)
                  }
                }}
              >
                {tokens.map((token, idx) => {
                  if (token.wordIndex === null) return token.text

                  const isActive =
                    sentence.id === currentIndex &&
                    boundaries.length > 0 &&
                    token.wordIndex === activeWordIndex

                  return (
                    <span
                      key={`${sentence.id}-${idx}`}
                      className={`
                        inline-block
                        relative
                        rounded-3xl
                        ${isActive ? "after:z-0 after:content-[''] after:pointer-events-none after:absolute after:-inset-x-2 after:-inset-y-1 after:block after:bg-brand after:rounded-xl after:shadow-md after:shadow-violet-500/40" : ""}
                      `}
                    >
                      <span
                        className={`relative z-10 ${isActive ? "text-white" : ""}`}
                      >
                        {token.text}
                      </span>
                    </span>
                  )
                })}
              </p>
            </div>
          )
        })}
      </div>
    </article>
  )
}

export default EntryContent
