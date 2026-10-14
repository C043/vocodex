import { useEffect } from "react"
import type { RefObject } from "react"
import type { PageJump } from "./usePlayerData"

// Brings a PDF page jumped to at the top of the screen, whether auto scroll
// is on or not. Jumps can be far: the page shows up at once, no smoothing
export const usePageJumpScroll = (
  pageJump: PageJump | null,
  pageEls: RefObject<Map<number, HTMLElement>>
) => {
  useEffect(() => {
    if (!pageJump) return
    pageEls.current.get(pageJump.page)?.scrollIntoView?.({
      behavior: "auto",
      block: "start"
    })
  }, [pageJump, pageEls])
}
