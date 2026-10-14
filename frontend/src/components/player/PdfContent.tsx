import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { usePlayer } from "../../contexts/PlayerContext"
import { useUserScrollPause } from "../../hooks/useUserScrollPause"
import { usePageJumpScroll } from "../../hooks/usePageJumpScroll"
import {
  chunkAtOffset,
  pageOfChunk,
  textRangeToItems,
  wordRanges
} from "../../utils/pdfText"
import type { ItemRange } from "../../utils/pdfText"
import PdfPageView from "./PdfPageView"

// The size controls zoom the pages of a PDF
const ZOOMS: Record<number, number> = { 1: 1, 2: 1.25, 3: 1.5, 4: 2 }
// Until the reader width is known
const FALLBACK_WIDTH = 800
const NO_RANGES: ItemRange[] = []

const PdfContent = () => {
  const {
    title,
    pdf,
    currentIndex,
    activeWordIndex,
    setCurrentIndex,
    isLoading,
    currentFontSize,
    isAutoScroll,
    pageJump
  } = usePlayer()

  const columnRef = useRef<HTMLDivElement>(null)
  const pageEls = useRef(new Map<number, HTMLElement>())
  const hasScrolled = useRef(false)
  const isUserScrolling = useUserScrollPause()
  const areaRef = useRef<HTMLDivElement>(null)
  const [columnWidth, setColumnWidth] = useState(FALLBACK_WIDTH)
  const [areaWidth, setAreaWidth] = useState(Infinity)
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set())

  const currentPage = currentIndex >= 0 ? pageOfChunk(currentIndex) : 1
  const zoom = ZOOMS[currentFontSize] ?? 1

  // Zoom 1 fits the pages to the reading column; zooming never makes them
  // wider than the pages area, which spans the screen
  useLayoutEffect(() => {
    const column = columnRef.current
    const area = areaRef.current
    if (!column || !area) return
    const update = () => {
      setColumnWidth(column.clientWidth || FALLBACK_WIDTH)
      setAreaWidth(area.clientWidth || Infinity)
    }
    update()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(update)
    observer.observe(column)
    observer.observe(area)
    return () => observer.disconnect()
  }, [])
  const pageWidth = Math.min(columnWidth * zoom, areaWidth)

  // Track the pages on screen, so scrolling by hand shows them too. Pages
  // register themselves as they appear (see pageRef)
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
      // Start drawing a little before a page scrolls in
      { rootMargin: "50% 0px" }
    )
    pageEls.current.forEach(el => observer.current?.observe(el))
    return () => observer.current?.disconnect()
  }, [])

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

  usePageJumpScroll(pageJump, pageEls)

  useEffect(() => {
    visiblePages.forEach(page => pdf.loadPage(page).catch(console.error))
  }, [visiblePages])

  const isActive = (page: number) =>
    Math.abs(page - currentPage) <= 1 || visiblePages.has(page)

  // Where the chunk being read is on its page. Depends on that page only,
  // so other pages loading do not move the highlight (and the scroll)
  const readingPage = pdf.pages.get(currentPage)
  const current = useMemo(() => {
    const page = readingPage
    const chunk = page?.chunks.find(c => c.id === currentIndex)
    if (!page || !chunk || isLoading) return null
    return {
      page,
      chunk,
      ranges: textRangeToItems(
        page.text.itemStarts,
        page.itemStrs,
        chunk.start,
        chunk.end
      )
    }
  }, [readingPage, currentIndex, isLoading])

  const currentWordRanges = useMemo(() => {
    const word = current && wordRanges(current.chunk.text)[activeWordIndex]
    if (!current || !word) return NO_RANGES
    const start = current.chunk.start
    return textRangeToItems(
      current.page.text.itemStarts,
      current.page.itemStrs,
      start + word.start,
      start + word.end
    )
  }, [current, activeWordIndex])

  const follow = (el: Element) => {
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches
    el.scrollIntoView?.({
      behavior: hasScrolled.current && !reduceMotion ? "smooth" : "auto",
      block: "center"
    })
    hasScrolled.current = true
  }

  // Keep the chunk being read in the middle of the screen
  const handleChunkShown = (el: HTMLElement) => {
    if (isAutoScroll && !isUserScrolling()) follow(el)
  }

  // Turning auto scroll on brings the reading back on screen
  useEffect(() => {
    if (!isAutoScroll) return
    const el = document.querySelector("[data-highlight=chunk]")
    if (el) follow(el)
  }, [isAutoScroll])

  // The chunk a text item belongs to
  const chunkAtItem = (pageNumber: number, item: number) => {
    const page = pdf.pages.get(pageNumber)
    const offset = page?.text.itemStarts[item] ?? -1
    // Running headers and page numbers are not read
    if (!page || offset < 0) return null
    return chunkAtOffset(page.chunks, offset) ?? null
  }

  const handleTextClick = (pageNumber: number, item: number) => {
    if (isLoading) return
    const chunk = chunkAtItem(pageNumber, item)
    if (chunk) setCurrentIndex(chunk.id)
  }

  // Hovering the text shows the chunk a click would go to
  const [hovered, setHovered] = useState<{
    pageNumber: number
    chunkId: number
  } | null>(null)

  const handleTextHover = (pageNumber: number, item: number | null) => {
    const chunk = item === null ? null : chunkAtItem(pageNumber, item)
    setHovered(prev => {
      if (!chunk) return prev?.pageNumber === pageNumber ? null : prev
      if (prev?.pageNumber === pageNumber && prev.chunkId === chunk.id) {
        return prev
      }
      return { pageNumber, chunkId: chunk.id }
    })
  }

  const hoveredPage = hovered && pdf.pages.get(hovered.pageNumber)
  const hoverRanges = useMemo(() => {
    const chunk = hoveredPage?.chunks.find(c => c.id === hovered?.chunkId)
    if (!hoveredPage || !chunk || isLoading || chunk.id === currentIndex) {
      return NO_RANGES
    }
    return textRangeToItems(
      hoveredPage.text.itemStarts,
      hoveredPage.itemStrs,
      chunk.start,
      chunk.end
    )
  }, [hoveredPage, hovered, isLoading, currentIndex])

  const pageNumbers = Array.from({ length: pdf.numPages }, (_, i) => i + 1)

  return (
    <article>
      {/* Zoom 1 fits the pages to this column */}
      <div ref={columnRef} data-reading-column className="max-w-4xl mx-auto">
        <p className="text-xs md:text-sm font-semibold uppercase tracking-[0.2em] text-foreground/50 mb-2">
          Now reading
        </p>
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-gradient leading-[1.05] pb-2 mb-8 md:mb-12 break-words">
          {title}
        </h1>
      </div>
      {/* Zoomed pages grow past the column, up to the screen width, centered */}
      <div
        ref={areaRef}
        data-pages-area
        className="flex flex-col items-center overflow-x-clip gap-4 md:gap-6 mb-72 md:mb-52"
      >
        {pdf.defaultPageSize &&
          pageNumbers.map(pageNumber => {
            const size = pdf.pages.get(pageNumber) ?? pdf.defaultPageSize!
            return (
              <PdfPageView
                key={pageNumber}
                doc={pdf.doc!}
                pageNumber={pageNumber}
                width={size.width}
                height={size.height}
                scale={pageWidth / size.width}
                isActive={isActive(pageNumber)}
                chunkRanges={
                  current?.page.pageNumber === pageNumber
                    ? current.ranges
                    : NO_RANGES
                }
                wordRanges={
                  current?.page.pageNumber === pageNumber
                    ? currentWordRanges
                    : NO_RANGES
                }
                hoverRanges={
                  hovered?.pageNumber === pageNumber ? hoverRanges : NO_RANGES
                }
                onTextClick={item => handleTextClick(pageNumber, item)}
                onTextHover={item => handleTextHover(pageNumber, item)}
                onChunkShown={handleChunkShown}
                pageRef={pageRef(pageNumber)}
              />
            )
          })}
      </div>
    </article>
  )
}

export default PdfContent
