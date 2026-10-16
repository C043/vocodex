import type { BlockKind, TextBlock } from "./chunks"

// A text node of the page and where its text starts in the page text
export type Segment = {
  node: Text
  start: number
}

export type PageText = {
  // What gets read aloud: the text nodes in order, a line between blocks
  text: string
  segments: Segment[]
  blocks: TextBlock[]
}

// Elements whose text is never read
const SKIPPED = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "TEXTAREA", "INPUT", "SELECT",
  "OPTION", "BUTTON", "SVG", "CANVAS", "IFRAME", "OBJECT", "VIDEO", "AUDIO"
])

// Elements that start a new block of text, like a paragraph
const BLOCKS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "BODY", "DD", "DETAILS", "DIV",
  "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2",
  "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE",
  "SECTION", "SUMMARY", "TABLE", "TD", "TH", "TR", "UL"
])

const isHidden = (el: Element) => {
  if (el instanceof HTMLElement && el.hidden) return true
  if (el.getAttribute("aria-hidden") === "true") return true
  const style = el.ownerDocument.defaultView?.getComputedStyle(el)
  return style?.display === "none" || style?.visibility === "hidden"
}

const kindOf = (block: Element): BlockKind => {
  if (block.tagName === "H1" || block.tagName === "H2") return "heading"
  if (/^H[3-6]$/.test(block.tagName)) return "subheading"
  return "paragraph"
}

const blockOf = (node: Node, root: Element) => {
  let el = node.parentElement
  while (el && el !== root && !BLOCKS.has(el.tagName)) el = el.parentElement
  return el ?? root
}

// The part of the page worth reading: the article, or the main content
export const readingRoot = (doc: Document): HTMLElement =>
  doc.querySelector<HTMLElement>("article, main, [role=main]") ?? doc.body

// Reads the text of the page. Each text node keeps its length, its
// whitespace turned into spaces, so an offset in the page text always points
// to a character of a node
export const readPage = (root: Element): PageText => {
  const walker = root.ownerDocument.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode: node => {
        if (node.nodeType === Node.TEXT_NODE) return NodeFilter.FILTER_ACCEPT
        const el = node as Element
        return SKIPPED.has(el.tagName.toUpperCase()) || isHidden(el)
          ? NodeFilter.FILTER_REJECT
          : NodeFilter.FILTER_SKIP
      }
    }
  )

  let text = ""
  const segments: Segment[] = []
  const blocks: TextBlock[] = []
  let block: Element | null = null

  const endBlock = () => {
    const last = blocks.at(-1)
    if (last) last.end = last.start + text.slice(last.start).trimEnd().length
  }

  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.nodeType !== Node.TEXT_NODE) continue
    const textNode = node as Text
    const content = textNode.data.replace(/\s/g, " ")
    const blank = content.trim() === ""
    const nodeBlock = blockOf(textNode, root)

    if (nodeBlock !== block) {
      // Whitespace between blocks is only page layout
      if (blank) continue
      endBlock()
      if (text !== "") text += "\n"
      block = nodeBlock
      const leading = content.length - content.trimStart().length
      blocks.push({ start: text.length + leading, end: 0, kind: kindOf(nodeBlock) })
    }

    segments.push({ node: textNode, start: text.length })
    text += content
  }
  endBlock()

  return { text, segments, blocks }
}

// The segment a page offset falls in, or the first one after it
const segmentAt = (page: PageText, offset: number) => {
  let low = 0
  let high = page.segments.length
  while (low < high) {
    const mid = (low + high) >> 1
    const segment = page.segments[mid]
    if (segment.start + segment.node.data.length <= offset) low = mid + 1
    else high = mid
  }
  return low
}

// The part of the page a range of the page text covers
export const rangeOf = (page: PageText, start: number, end: number) => {
  const first = segmentAt(page, start)
  const last = segmentAt(page, end - 1)
  const from = page.segments[first]
  const to = page.segments[Math.min(last, page.segments.length - 1)]
  if (!from || !to || from.start >= end) return null

  const range = from.node.ownerDocument.createRange()
  range.setStart(from.node, Math.max(0, start - from.start))
  range.setEnd(to.node, Math.min(to.node.data.length, end - to.start))
  return range
}

// The page offset of a point in a text node, or -1 when it is not read
export const offsetOf = (page: PageText, node: Node, offset: number) => {
  const segment = page.segments.find(segment => segment.node === node)
  return segment ? segment.start + offset : -1
}
