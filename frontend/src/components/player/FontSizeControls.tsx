import {
  MinusIcon,
  PlusIcon,
  ViewfinderCircleIcon
} from "@heroicons/react/24/solid"
import { usePlayer } from "../../contexts/PlayerContext"

type Props = {
  // A row for the mobile player options, instead of the floating column
  inline?: boolean
}

const FontSizeControls = ({ inline = false }: Props) => {
  const {
    handleFontSizeUp,
    handleFontSizeDown,
    isAutoScroll,
    toggleAutoScroll,
    kind,
    pdfView
  } = usePlayer()
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

  if (inline) {
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

  return (
    // Desktop: floats at the bottom right
    <div className="fixed z-40 bottom-8 right-6">
      <div className="glass flex flex-col items-center gap-1 p-1 rounded-full">
        {sizeUp}
        <span className="text-[10px] font-bold text-foreground/50 select-none">
          {isZoom ? "Zoom" : "Aa"}
        </span>
        {sizeDown}
        <span className="w-5 h-px bg-foreground/15" />
        <button
          type="button"
          aria-label="Auto scroll"
          aria-pressed={isAutoScroll}
          title={isAutoScroll ? "Auto scroll on" : "Auto scroll off"}
          onMouseDown={ev => ev.preventDefault()}
          onClick={toggleAutoScroll}
          className={`${button} ${isAutoScroll ? "bg-brand text-white shadow-md shadow-violet-500/40 hover:bg-brand" : "text-foreground/50"}`}
        >
          <ViewfinderCircleIcon className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default FontSizeControls
