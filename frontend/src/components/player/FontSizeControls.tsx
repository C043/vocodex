import {
  MinusIcon,
  PlusIcon,
  ViewfinderCircleIcon
} from "@heroicons/react/24/solid"
import { usePlayer } from "../../contexts/PlayerContext"

const FontSizeControls = () => {
  const {
    handleFontSizeUp,
    handleFontSizeDown,
    isAutoScroll,
    toggleAutoScroll,
    kind
  } = usePlayer()
  // The same buttons zoom the pages of a PDF
  const isPdf = kind === "pdf"

  const button =
    "grid place-items-center size-9 rounded-full hover:bg-foreground/10 active:scale-90 transition cursor-pointer"

  return (
    // Mobile: floats above the docked player. Desktop: bottom right
    <div className="fixed z-40 right-4 bottom-[calc(env(safe-area-inset-bottom)+10.5rem)] md:bottom-8 md:right-6">
      <div className="glass flex flex-col items-center gap-1 p-1 rounded-full">
        <button
          type="button"
          aria-label={isPdf ? "Zoom in" : "Increase font size"}
          onMouseDown={ev => ev.preventDefault()}
          onClick={handleFontSizeUp}
          className={button}
        >
          <PlusIcon className="size-4" />
        </button>
        <span className="text-[10px] font-bold text-foreground/50 select-none">
          {isPdf ? "Zoom" : "Aa"}
        </span>
        <button
          type="button"
          aria-label={isPdf ? "Zoom out" : "Decrease font size"}
          onMouseDown={ev => ev.preventDefault()}
          onClick={handleFontSizeDown}
          className={button}
        >
          <MinusIcon className="size-4" />
        </button>
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
