import { useEffect, useRef, useState } from "react"
import { usePlayer } from "../../contexts/PlayerContext"
import { useUserScrollPause } from "../../hooks/useUserScrollPause"
import { pageOfChunk } from "../../utils/pdfText"
import { fontSizeClasses } from "../../utils/fontSize"
import ReadingChunk from "./ReadingChunk"

// A PDF shown as plain text, page by page: much easier to read than whole
// pages on a small screen
const PdfTextContent = () => {
  const {
    title,
    pdf,
    currentIndex,
    activeWordIndex,
    setCurrentIndex,
    isLoading,
    currentFontSize,
    isAutoScroll
  } = usePlayer()

  const chunkRefs = useRef(new Map<number, HTMLSpanElement>())
  const pageEls = useRef(new Map<number, HTMLElement>())
  const hasScrolled = useRef(false)
  const isUserScrolling = useUserScrollPause()
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set())

  // The page being read, so the scroll waits for its text to load
  const readingPage =
    currentIndex >= 0 ? pdf.pages.get(pageOfChunk(currentIndex)) : undefined

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
  }, [currentIndex, isLoading, isAutoScroll, readingPage])

  // Load the text of the pages scrolled into view. Pages register
  // themselves as they appear (see pageRef)
  const observer = useRef<IntersectionObserver | null>(null)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return
    observer.current = new IntersectionObserver(
      entries => {
        setVisiblePages(prev => {
          const next = new Set(prev)
          for (const entry of entries) {
            for (const [page, el] of pageEls.current) {
              if (el !== entry.target) continue
              if (entry.isIntersecting) next.add(page)
              else next.delete(page)
            }
          }
          return next
        })
      },
      // Start loading a little before a page scrolls in
      { rootMargin: "50% 0px" }
    )
    pageEls.current.forEach(el => observer.current?.observe(el))
    return () => observer.current?.disconnect()
  }, [])

  useEffect(() => {
    visiblePages.forEach(page => pdf.loadPage(page).catch(console.error))
  }, [visiblePages])

  // One stable callback per page, so rerenders do not detach and attach
  // every page again
  const pageRefs = useRef(new Map<number, (el: HTMLElement | null) => void>())
  const pageRef = (pageNumber: number) => {
    let ref = pageRefs.current.get(pageNumber)
    if (!ref) {
      ref = el => {
        const previous = pageEls.current.get(pageNumber)
        if (previous) observer.current?.unobserve(previous)
        if (el) {
          pageEls.current.set(pageNumber, el)
          observer.current?.observe(el)
        } else {
          pageEls.current.delete(pageNumber)
        }
      }
      pageRefs.current.set(pageNumber, ref)
    }
    return ref
  }

  const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1)

  return (
    <article className="isolate max-w-3xl mx-auto">
      <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50 mb-2">
        Now reading
      </p>
      <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-gradient leading-[1.05] pb-2 mb-8 md:mb-12 break-words">
        {title}
      </h1>
      <div className="mb-72 md:mb-52">
        {pageNumbers.map(pageNumber => {
          const page = pdf.pages.get(pageNumber)
          return (
            <section
              key={pageNumber}
              aria-label={`Page ${pageNumber}`}
              ref={pageRef(pageNumber)}
              // Pages not loaded yet keep some room, so they get scrolled to
              className={page ? "mb-8" : "mb-8 min-h-[50vh]"}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-foreground/40 mb-3 select-none">
                Page {pageNumber}
              </p>
              {page && page.chunks.length === 0 && (
                <p className="text-sm italic text-foreground/40">
                  No text on this page
                </p>
              )}
              {page && page.chunks.length > 0 && (
                <p
                  className={`font-serif leading-[1.8] whitespace-pre-wrap break-words ${fontSizeClasses(currentFontSize)}`}
                >
                  {page.chunks.map((chunk, idx) => (
                    <span key={chunk.id}>
                      {idx > 0 && " "}
                      <ReadingChunk
                        id={chunk.id}
                        text={chunk.text}
                        isCurrent={!isLoading && currentIndex === chunk.id}
                        activeWordIndex={activeWordIndex}
                        isLoading={isLoading}
                        onSelect={() => setCurrentIndex(chunk.id)}
                        chunkRef={el => {
                          if (el) chunkRefs.current.set(chunk.id, el)
                          else chunkRefs.current.delete(chunk.id)
                        }}
                      />
                    </span>
                  ))}
                </p>
              )}
            </section>
          )
        })}
      </div>
    </article>
  )
}

export default PdfTextContent
