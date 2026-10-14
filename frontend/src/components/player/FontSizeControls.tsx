import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid"
import { usePlayer } from "../../contexts/PlayerContext"

// The text size, or zoom, row of the player options
const FontSizeControls = () => {
  const { handleFontSizeUp, handleFontSizeDown, kind, pdfView } = usePlayer()
  const isPdf = kind === "pdf"
  const isPdfText = isPdf && pdfView === "text"
  // The same buttons zoom the pages of a PDF
  const isZoom = isPdf && !isPdfText

  const button =
    "grid place-items-center size-9 rounded-full hover:bg-foreground/10 active:scale-90 transition cursor-pointer"

  const sizeUp = (
    <button
      type="button"
      aria-label={isZoom ? "Zoom in" : "Increase font size"}
      onMouseDown={ev => ev.preventDefault()}
      onClick={handleFontSizeUp}
      className={button}
    >
      <PlusIcon className="size-4" />
    </button>
  )
  const sizeDown = (
    <button
      type="button"
      aria-label={isZoom ? "Zoom out" : "Decrease font size"}
      onMouseDown={ev => ev.preventDefault()}
      onClick={handleFontSizeDown}
      className={button}
    >
      <MinusIcon className="size-4" />
    </button>
  )

  return (
    <div className="flex items-center justify-between gap-1 h-10 px-0.5 rounded-full bg-foreground/5">
      {sizeDown}
      <span className="text-xs font-semibold text-foreground/60 select-none">
        {isZoom ? "Zoom" : "Text size"}
      </span>
      {sizeUp}
    </div>
  )
}

export default FontSizeControls
