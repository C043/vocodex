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
      1: { text: "text-xl", margin: "mb-1" },
      2: { text: "text-2xl", margin: "mb-2" },
      3: { text: "text-3xl", margin: "mb-3" },
      4: { text: "text-4xl", margin: "mb-4" }
    }
    return sizeMap[size] || sizeMap[1]
  }
  const fontClasses = getFontSizeClasses(currentFontSize)

  return (
    <>
      <h1 className="text-9xl mb-10">{title}</h1>
      <div className="mb-52">
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
              rounded-3xl
              px-2
              py-1
              ${fontClasses.margin}
              ${isLoading || currentIndex === sentence.id ? "" : "hover:bg-yellow-500/50 cursor-pointer"} ${currentIndex === sentence.id ? "bg-yellow-500/80" : ""}
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
                        rounded-3xl
                        ${isActive ? "bg-red-600" : ""}
                      `}
                    >
                      {token.text}
                    </span>
                  )
                })}
              </p>
            </div>
          )
        })}
      </div>
    </>
  )
}

export default EntryContent
