import { Fragment, useEffect, useRef } from "react"
import { usePlayer } from "../../contexts/PlayerContext"
import type { SentenceObj } from "../../contexts/PlayerContext"
import { useUserScrollPause } from "../../hooks/useUserScrollPause"

const EntryContent = () => {
  const {
    title,
    sentencesMap,
    currentIndex,
    activeWordIndex,
    setCurrentIndex,
    isLoading,
    currentFontSize,
    isAutoScroll
  } = usePlayer()

  const chunkRefs = useRef(new Map<number, HTMLSpanElement>())
  const hasScrolled = useRef(false)
  const isUserScrolling = useUserScrollPause()

  // Keep the chunk being read in the middle of the screen
  useEffect(() => {
    if (!isAutoScroll || isLoading || isUserScrolling()) return
    const el = chunkRefs.current.get(currentIndex)
    if (!el) return

    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches
    el.scrollIntoView?.({
      behavior: hasScrolled.current && !reduceMotion ? "smooth" : "auto",
      block: "center"
    })
    hasScrolled.current = true
  }, [currentIndex, isLoading, isAutoScroll])

  // Map font size to complete Tailwind classes
  const getFontSizeClasses = (size: number) => {
    const sizeMap: Record<number, string> = {
      1: "text-lg md:text-xl",
      2: "text-xl md:text-2xl",
      3: "text-2xl md:text-3xl",
      4: "text-3xl md:text-4xl"
    }
    return sizeMap[size] || sizeMap[1]
  }
  const fontClasses = getFontSizeClasses(currentFontSize)

  // Chunks flow inline, and only break where the original text had a paragraph
  const paragraphs: SentenceObj[][] = []
  for (const sentence of sentencesMap.values()) {
    if (paragraphs.length === 0 || sentence.paragraphStart) {
      paragraphs.push([])
    }
    paragraphs[paragraphs.length - 1].push(sentence)
  }

  const renderChunk = (sentence: SentenceObj) => {
    const boundaries = sentence.boundaries ?? []
    const isCurrent = !isLoading && currentIndex === sentence.id
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
      <span
        key={sentence.id}
        data-chunk-id={sentence.id}
        aria-current={isCurrent ? "true" : undefined}
        ref={el => {
          if (el) chunkRefs.current.set(sentence.id, el)
          else chunkRefs.current.delete(sentence.id)
        }}
        onClick={() => {
          if (!isLoading) {
            setCurrentIndex(sentence.id)
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

          const isActive =
            isCurrent &&
            boundaries.length > 0 &&
            token.wordIndex === activeWordIndex

          // Painted on the word itself: positioned, z-indexed overlays
          // changing word by word make the glass bars lose their blur
          return (
            <span
              key={`${sentence.id}-${idx}`}
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

  return (
    <article className="isolate max-w-3xl mx-auto">
      <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50 mb-2">
        Now reading
      </p>
      <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-gradient leading-[1.05] pb-2 mb-8 md:mb-12 break-words">
        {title}
      </h1>
      <div
        className={`font-serif leading-[1.8] mb-72 md:mb-52 ${fontClasses}`}
      >
        {paragraphs.map(paragraph => (
          <p
            key={paragraph[0].id}
            className="whitespace-pre-wrap break-words mb-[1em] last:mb-0"
          >
            {paragraph.map((sentence, idx) => (
              <Fragment key={sentence.id}>
                {idx > 0 && " "}
                {renderChunk(sentence)}
              </Fragment>
            ))}
          </p>
        ))}
      </div>
    </article>
  )
}

export default EntryContent
