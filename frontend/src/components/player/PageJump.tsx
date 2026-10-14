import { useState } from "react"
import { ArrowRightIcon } from "@heroicons/react/24/solid"
import { usePlayer } from "../../contexts/PlayerContext"
import { pageOfChunk } from "../../utils/pdfText"

// Goes straight to a page of a PDF: "Page [12] of 120 →"
const PageJump = () => {
  const { currentIndex, pdf, goToPage, isLoading } = usePlayer()
  const currentPage = currentIndex >= 0 ? pageOfChunk(currentIndex) : 1
  // What is typed; null shows the page being read
  const [draft, setDraft] = useState<string | null>(null)

  const submit = () => {
    const page = Number.parseInt(draft ?? "", 10)
    setDraft(null)
    if (Number.isNaN(page)) return
    goToPage(page)
  }

  return (
    <form
      aria-label="Go to page"
      className="flex items-center gap-2 h-10 pl-4 pr-0.5 rounded-full bg-foreground/5"
      onSubmit={ev => {
        ev.preventDefault()
        submit()
        // Closes the keyboard on phones
        ;(document.activeElement as HTMLElement | null)?.blur()
      }}
    >
      <label
        htmlFor="page-jump"
        className="text-xs font-semibold text-foreground/60 select-none"
      >
        Page
      </label>
      <input
        id="page-jump"
        type="number"
        inputMode="numeric"
        aria-label="Page number"
        min={1}
        max={pdf.numPages}
        value={draft ?? currentPage}
        disabled={isLoading}
        onChange={ev => setDraft(ev.target.value)}
        onFocus={ev => ev.target.select()}
        onBlur={() => setDraft(null)}
        // Typing a page must not play, pause or skip
        onKeyDown={ev => {
          ev.stopPropagation()
          if (ev.key === "Escape") {
            setDraft(null)
            ev.currentTarget.blur()
          }
        }}
        className="w-16 min-w-0 h-8 rounded-full bg-foreground/5 text-center text-sm tabular-nums outline-none focus:bg-foreground/10 focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="flex-1 text-xs text-foreground/60 tabular-nums whitespace-nowrap select-none">
        of {pdf.numPages}
      </span>
      <button
        type="submit"
        aria-label="Go to page"
        title="Go to page"
        disabled={isLoading}
        onMouseDown={ev => ev.preventDefault()}
        className="grid place-items-center size-9 shrink-0 rounded-full hover:bg-foreground/10 active:scale-90 transition cursor-pointer disabled:opacity-50 disabled:cursor-wait"
      >
        <ArrowRightIcon className="size-4" />
      </button>
    </form>
  )
}

export default PageJump
