import { MinusIcon, PlusIcon } from "@heroicons/react/24/solid"
import { usePlayer } from "../../contexts/PlayerContext"

const FontSizeControls = () => {
  const { handleFontSizeUp, handleFontSizeDown } = usePlayer()

  return (
    <div className="right-5 fixed bottom-0 mb-5 z-50">
      <div
        className="
          flex
          flex-col
          justify-center
          items-center
          gap-5
          p-5
          rounded-4xl
          backdrop-blur-md
          shadow-lg
          dark:bg-black/30
          bg-white/30
          border
          dark:border-white/30
          border-black
          "
      >
        <PlusIcon
          onClick={handleFontSizeUp}
          className="size-5 cursor-pointer"
        />
        <MinusIcon
          onClick={handleFontSizeDown}
          className="size-5 cursor-pointer"
        />
      </div>
    </div>
  )
}

export default FontSizeControls
