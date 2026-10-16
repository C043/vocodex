import type { Highlighter } from "./pageReader"

// Highlights are painted over the text, the page itself is never changed,
// so the scripts of the site do not notice anything
const STYLE = `
::highlight(vocodex-hover) { background-color: rgba(124, 92, 255, 0.12); }
::highlight(vocodex-chunk) { background-color: rgba(124, 92, 255, 0.18); }
::highlight(vocodex-word) { background-color: rgba(124, 92, 255, 0.5); color: inherit; }
`

type HighlightRegistry = Map<string, unknown>

export const cssHighlighter = (doc: Document): Highlighter => {
  const registry = (globalThis.CSS as { highlights?: HighlightRegistry } | undefined)?.highlights
  if (!registry) return { set: () => {} }

  if (!doc.querySelector("style[data-vocodex]")) {
    const style = doc.createElement("style")
    style.dataset.vocodex = ""
    style.textContent = STYLE
    doc.head.append(style)
  }

  return {
    set: (name, range) => {
      if (range) registry.set(name, new Highlight(range))
      else registry.delete(name)
    }
  }
}

const contains = (rect: DOMRect, x: number, y: number) =>
  x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom

type CaretDocument = Document & {
  caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null
  caretRangeFromPoint?: (x: number, y: number) => Range | null
}

// The character of text under a point. The browser gives the nearest text
// even over margins and images, so the character must be under the point
export const caretAt = (doc: Document, x: number, y: number) => {
  const caretDoc = doc as CaretDocument
  let node: Node | undefined
  let offset = 0
  if (caretDoc.caretPositionFromPoint) {
    const position = caretDoc.caretPositionFromPoint(x, y)
    node = position?.offsetNode
    offset = position?.offset ?? 0
  } else {
    const range = caretDoc.caretRangeFromPoint?.(x, y)
    node = range?.startContainer
    offset = range?.startOffset ?? 0
  }
  if (!node || node.nodeType !== Node.TEXT_NODE) return null

  const length = (node as Text).data.length
  // The caret falls before or after the character under the point
  for (const start of [offset, offset - 1]) {
    if (start < 0 || start >= length) continue
    const char = doc.createRange()
    char.setStart(node, start)
    char.setEnd(node, start + 1)
    if (contains(char.getBoundingClientRect(), x, y)) return { node, offset: start }
  }
  return null
}

// Room kept above and below the word, so it never reads at the very edge
const MARGIN = 80

export const follow = (win: Window, range: Range) => {
  const rect = range.getBoundingClientRect()
  if (rect.top >= MARGIN && rect.bottom <= win.innerHeight - MARGIN) return
  win.scrollBy({ top: rect.top - win.innerHeight / 3, behavior: "smooth" })
}
