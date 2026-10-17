import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { TextLayer } from "pdfjs-dist"
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist"
import { measureRanges } from "../../utils/highlightRects"
import type { Box } from "../../utils/highlightRects"
import type { ItemRange } from "../../utils/pdfText"

type PdfPageViewProps = {
  doc: PDFDocumentProxy
  pageNumber: number
  // Size of the page at scale 1
  width: number
  height: number
  scale: number
  // Only the pages around the reading and on screen are drawn
  isActive: boolean
  chunkRanges: ItemRange[]
  wordRanges: ItemRange[]
  // The chunk a click on the hovered text would go to
  hoverRanges: ItemRange[]
  onTextClick: (item: number) => void
  // Called with the text item under the pointer, or null when leaving it
  onTextHover: (item: number | null) => void
  // Called with the highlight of a new chunk, once it is drawn
  onChunkShown?: (el: HTMLElement) => void
  pageRef?: (el: HTMLElement | null) => void
}

type Highlights = {
  chunk: Box[]
  word: Box[]
  hover: Box[]
  // The chunk the boxes were measured for
  chunkRanges: ItemRange[] | null
}

const NO_HIGHLIGHTS: Highlights = {
  chunk: [],
  word: [],
  hover: [],
  chunkRanges: null
}

// iOS kills a page whose canvases take too much memory, so each page is
// drawn with at most as many pixels as PDF.js allows there
const MAX_CANVAS_PIXELS = 5242880

const boxStyle = (box: Box) => ({
  left: `${box.left}px`,
  top: `${box.top}px`,
  width: `${box.width}px`,
  height: `${box.height}px`
})

const PdfPageView = ({
  doc,
  pageNumber,
  width,
  height,
  scale,
  isActive,
  chunkRanges,
  wordRanges,
  hoverRanges,
  onTextClick,
  onTextHover,
  onChunkShown,
  pageRef
}: PdfPageViewProps) => {
  const rootRef = useRef<HTMLElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const textLayerRef = useRef<HTMLDivElement>(null)
  const shownChunk = useRef<ItemRange[] | null>(null)
  const [textDivs, setTextDivs] = useState<HTMLElement[]>([])
  const [highlights, setHighlights] = useState<Highlights>(NO_HIGHLIGHTS)

  const setRoot = useCallback(
    (el: HTMLElement | null) => {
      rootRef.current = el
      pageRef?.(el)
    },
    [pageRef]
  )

  // Draw the page and its invisible, selectable text on top
  useEffect(() => {
    if (!isActive) return

    let cancelled = false
    let pdfPage: PDFPageProxy | undefined
    let renderTask: RenderTask | undefined
    let textLayer: TextLayer | undefined

    ;(async () => {
      pdfPage = await doc.getPage(pageNumber)
      const canvas = canvasRef.current
      const layer = textLayerRef.current
      if (cancelled || !canvas || !layer) return

      const viewport = pdfPage.getViewport({ scale })
      // Sharp on high density screens, within what a phone can hold
      const ratio = Math.min(
        window.devicePixelRatio || 1,
        Math.sqrt(MAX_CANVAS_PIXELS / (viewport.width * viewport.height))
      )
      canvas.width = Math.floor(viewport.width * ratio)
      canvas.height = Math.floor(viewport.height * ratio)
      renderTask = pdfPage.render({
        canvas,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0]
      })

      layer.replaceChildren()
      textLayer = new TextLayer({
        textContentSource: pdfPage.streamTextContent(),
        container: layer,
        viewport
      })
      await Promise.all([renderTask.promise, textLayer.render()])
      if (!cancelled) setTextDivs(textLayer.textDivs)
    })().catch(err => {
      // Leaving a page cancels its drawing, which is not an error
      if (!cancelled) console.error(err)
    })

    return () => {
      cancelled = true
      renderTask?.cancel()
      textLayer?.cancel()
      pdfPage?.cleanup()
      setTextDivs([])
    }
  }, [doc, pageNumber, scale, isActive])

  // A canvas taken off the page keeps its memory until it is collected:
  // emptying it gives it back at once
  useLayoutEffect(() => {
    const canvas = canvasRef.current
    if (!isActive || !canvas) return
    return () => {
      canvas.width = 0
      canvas.height = 0
    }
  }, [isActive])

  // Measure where the chunk and the word being read are drawn, and the
  // chunk under the pointer
  useLayoutEffect(() => {
    const root = rootRef.current
    if (
      !root ||
      textDivs.length === 0 ||
      (chunkRanges.length === 0 && hoverRanges.length === 0)
    ) {
      setHighlights(NO_HIGHLIGHTS)
      return
    }
    const origin = root.getBoundingClientRect()
    setHighlights({
      chunk: measureRanges(textDivs, chunkRanges, origin),
      word: measureRanges(textDivs, wordRanges, origin),
      hover: measureRanges(textDivs, hoverRanges, origin),
      chunkRanges: chunkRanges.length > 0 ? chunkRanges : null
    })
  }, [textDivs, chunkRanges, wordRanges, hoverRanges])

  // Zooming moves the chunk on screen: tell it again once redrawn
  useEffect(() => {
    shownChunk.current = null
  }, [scale])

  // Tell when a new chunk is highlighted, not for every word
  useEffect(() => {
    const el = rootRef.current?.querySelector<HTMLElement>(
      "[data-highlight=chunk]"
    )
    if (!el || highlights.chunkRanges === shownChunk.current) return
    shownChunk.current = highlights.chunkRanges
    onChunkShown?.(el)
  }, [highlights])

  return (
    <section
      aria-label={`Page ${pageNumber}`}
      data-page-number={pageNumber}
      ref={setRoot}
      // Jumping to the page stops it below the top bar
      className="scroll-mt-[calc(env(safe-area-inset-top)+4.5rem)] md:scroll-mt-20 relative isolate mx-auto bg-white rounded-sm shadow-lg shadow-black/20 overflow-hidden"
      style={
        {
          width: `${width * scale}px`,
          height: `${height * scale}px`,
          "--total-scale-factor": scale,
          "--scale-round-x": "1px",
          "--scale-round-y": "1px"
        } as React.CSSProperties
      }
    >
      {isActive && (
        <>
          <canvas ref={canvasRef} className="absolute inset-0 size-full" />
          <div className="absolute inset-0 pointer-events-none">
            {highlights.hover.map((box, idx) => (
              <div
                key={`hover-${idx}`}
                data-highlight="hover"
                className="absolute rounded-sm bg-violet-500/10"
                style={boxStyle(box)}
              />
            ))}
            {highlights.chunk.map((box, idx) => (
              <div
                key={`chunk-${idx}`}
                data-highlight="chunk"
                className="absolute rounded-sm bg-violet-500/15 scroll-mb-40 md:scroll-mb-0"
                style={boxStyle(box)}
              />
            ))}
            {highlights.word.map((box, idx) => (
              <div
                key={`word-${idx}`}
                data-highlight="word"
                className="absolute"
                style={boxStyle(box)}
              >
                {/* Same as the text reader's light theme word, white text on
                    the brand gradient: the page is white in either theme.
                    The glyphs are drawn on the canvas, so the box inverts
                    them to white on black, then screens the gradient over
                    the black */}
                <div className="absolute -inset-x-1 -inset-y-0.5 rounded-md shadow-md shadow-violet-500/40" />
                <div className="absolute -inset-x-1 -inset-y-0.5 rounded-md bg-white mix-blend-difference" />
                <div className="absolute -inset-x-1 -inset-y-0.5 rounded-md bg-brand mix-blend-screen" />
              </div>
            ))}
          </div>
          <div
            ref={textLayerRef}
            className="textLayer"
            onClick={ev => {
              const item = textDivs.indexOf(ev.target as HTMLElement)
              if (item !== -1) onTextClick(item)
            }}
            onMouseOver={ev => {
              const item = textDivs.indexOf(ev.target as HTMLElement)
              onTextHover(item === -1 ? null : item)
            }}
            onMouseLeave={() => onTextHover(null)}
          />
        </>
      )}
    </section>
  )
}

export default PdfPageView
