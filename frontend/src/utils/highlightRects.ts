import type { ItemRange } from "./pdfText"

export type Box = {
  left: number
  top: number
  width: number
  height: number
}

// Boxes closer than this on the same line become one highlight
const MAX_GAP = 4

const sameLine = (a: Box, b: Box) =>
  Math.abs(a.top - b.top) < Math.min(a.height, b.height) / 2

// Joins the boxes of the pieces of a line, so a highlight looks like one
// shape instead of a patchwork of overlapping items
export const mergeLineRects = (rects: Box[]): Box[] => {
  const sorted = rects
    .filter(rect => rect.width > 0 && rect.height > 0)
    .sort((a, b) => a.top - b.top || a.left - b.left)

  const merged: Box[] = []
  for (const rect of sorted) {
    const last = merged.find(
      box =>
        sameLine(box, rect) && rect.left <= box.left + box.width + MAX_GAP
    )
    if (!last) {
      merged.push({ ...rect })
      continue
    }
    const right = Math.max(last.left + last.width, rect.left + rect.width)
    const bottom = Math.max(last.top + last.height, rect.top + rect.height)
    last.left = Math.min(last.left, rect.left)
    last.top = Math.min(last.top, rect.top)
    last.width = right - last.left
    last.height = bottom - last.top
  }
  return merged.sort((a, b) => a.top - b.top || a.left - b.left)
}

// Measures where parts of the text layer items are drawn, relative to the
// page origin
export const measureRanges = (
  textDivs: HTMLElement[],
  ranges: ItemRange[],
  origin: { left: number; top: number }
): Box[] => {
  const rects: Box[] = []
  const range = document.createRange()

  for (const { item, from, to } of ranges) {
    const node = textDivs[item]?.firstChild
    if (!node || !node.textContent) continue
    range.setStart(node, Math.min(from, node.textContent.length))
    range.setEnd(node, Math.min(to, node.textContent.length))
    for (const rect of range.getClientRects()) {
      rects.push({
        left: rect.left - origin.left,
        top: rect.top - origin.top,
        width: rect.width,
        height: rect.height
      })
    }
  }
  return mergeLineRects(rects)
}
