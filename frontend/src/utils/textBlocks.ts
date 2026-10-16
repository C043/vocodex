import type { BlockKind } from "./pdfText"

export const BLOCK_TAGS = {
  heading: "h2",
  subheading: "h3",
  paragraph: "p"
} as const satisfies Record<BlockKind, string>

// Sized in em, so they follow the reader font size
export const BLOCK_CLASSES: Record<BlockKind, string> = {
  heading:
    "text-[1.5em] font-bold leading-tight tracking-tight mt-[1.4em] first:mt-0 mb-[0.6em]",
  subheading:
    "text-[1.2em] font-semibold leading-snug mt-[1.2em] first:mt-0 mb-[0.5em]",
  paragraph: "leading-[1.8] mb-[1em] last:mb-0"
}
