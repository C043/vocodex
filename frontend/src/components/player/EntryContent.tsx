import { Fragment, useCallback, useEffect, useRef } from "react"
import { usePlayer } from "../../contexts/PlayerContext"
import type { SentenceObj } from "../../contexts/PlayerContext"
import { useUserScrollPause } from "../../hooks/useUserScrollPause"
import { fontSizeClasses } from "../../utils/fontSize"
import { readerFontFamily } from "../../utils/fonts"
import { BLOCK_CLASSES, BLOCK_TAGS } from "../../utils/textBlocks"
import type { Decoration } from "../../utils/bookText"
import BookImage from "./BookImage"
import ReadingChunk from "./ReadingChunk"

// Scene breaks and pictures of a book, shown between its blocks of text
const renderDecorations = (
  decorations: Decoration[] | undefined,
  key: string
) =>
  decorations?.map((decoration, idx) =>
    decoration.kind === "break" ? (
      <div
        key={`${key}-${idx}`}
        role="separator"
        className="my-[1.4em] text-center tracking-[1em] text-foreground/40 select-none"
      >
        ∗∗∗
      </div>
    ) : (
      <BookImage
        key={`${key}-${idx}`}
        src={decoration.src}
        alt={decoration.alt}
      />
    )
  )

const EntryContent = () => {
  const {
    title,
    sentencesMap,
    currentIndex,
    activeWordIndex,
    setCurrentIndex,
    isLoading,
    currentFontSize,
    currentFont,
    isAutoScroll
  } = usePlayer()

  const chunkRefs = useRef(new Map<number, HTMLSpanElement>())
  const hasScrolled = useRef(false)
  const isUserScrolling = useUserScrollPause()
  const registerChunk = useCallback(
    (chunkId: number, el: HTMLSpanElement | null) => {
      if (el) chunkRefs.current.set(chunkId, el)
      else chunkRefs.current.delete(chunkId)
    },
    []
  )

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

  const fontClasses = fontSizeClasses(currentFontSize)

  // Chunks flow inline, and only break where the original text had a paragraph
  const paragraphs: SentenceObj[][] = []
  for (const sentence of sentencesMap.values()) {
    if (paragraphs.length === 0 || sentence.paragraphStart) {
      paragraphs.push([])
    }
    paragraphs[paragraphs.length - 1].push(sentence)
  }

  const renderChunk = (sentence: SentenceObj) => {
    const isCurrent = !isLoading && currentIndex === sentence.id
    const hasWordTiming = (sentence.boundaries ?? []).length > 0
    return (
      <ReadingChunk
        key={sentence.id}
        id={sentence.id}
        text={sentence.text}
        isCurrent={isCurrent}
        activeWordIndex={isCurrent && hasWordTiming ? activeWordIndex : -1}
        isLoading={isLoading}
        onSelect={setCurrentIndex}
        chunkRef={registerChunk}
        styles={sentence.styles}
      />
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
        className={`leading-[1.8] mb-72 md:mb-52 ${fontClasses}`}
        style={{ fontFamily: readerFontFamily(currentFont) }}
      >
        {paragraphs.map(paragraph => {
          const block = paragraph[0].block ?? "paragraph"
          const Tag = BLOCK_TAGS[block]
          const last = paragraph[paragraph.length - 1]
          return (
            <Fragment key={paragraph[0].id}>
              {renderDecorations(
                paragraph[0].before,
                `before-${paragraph[0].id}`
              )}
              <Tag
                className={`whitespace-pre-wrap break-words ${block === "paragraph" ? "mb-[1em] last:mb-0" : BLOCK_CLASSES[block]}`}
              >
                {paragraph.map((sentence, idx) => (
                  <Fragment key={sentence.id}>
                    {idx > 0 && (sentence.lineStart ? <br /> : " ")}
                    {renderChunk(sentence)}
                  </Fragment>
                ))}
              </Tag>
              {renderDecorations(last.after, `after-${last.id}`)}
            </Fragment>
          )
        })}
      </div>
    </article>
  )
}

export default EntryContent
