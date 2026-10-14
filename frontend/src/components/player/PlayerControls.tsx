import { useEffect, useState } from "react"
import { usePlayer } from "../../contexts/PlayerContext"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { addToast, Select, SelectItem, Spinner } from "@heroui/react"
import {
  AdjustmentsHorizontalIcon,
  BackwardIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
  ViewfinderCircleIcon
} from "@heroicons/react/24/solid"
import { useDispatch } from "react-redux"
import { setUserPreferences } from "../../redux/reducer/authSlice"
import { VoiceSelect } from "./VoiceSelect"
import { ReadingProgress } from "./ReadingProgress"
import FontSizeControls from "./FontSizeControls"
import { FontSelect } from "./FontSelect"
import { useIsDesktop } from "../../hooks/useIsDesktop"

export const PlayerControls = () => {
  const env = import.meta.env
  const token = window.localStorage.getItem("vocodex-jwt")

  const {
    isPlaying,
    isLoading,
    handlePlay,
    handlePause,
    handleForward,
    handleBackwards,
    setVoice,
    currentVoice,
    setSpeed,
    currentSpeed,
    voiceOptions,
    speedOptions,
    kind,
    pdfView,
    togglePdfView,
    isAutoScroll,
    toggleAutoScroll
  } = usePlayer()
  const isPdfText = kind === "pdf" && pdfView === "text"
  // The pages of a PDF keep their own fonts
  const hasReaderFont = kind !== "pdf" || isPdfText

  const dispatch = useDispatch()
  const isDesktop = useIsDesktop()
  // Mobile keeps the settings in a sheet that slides out of the bar
  const [isOptionsOpen, setIsOptionsOpen] = useState(false)

  const saveUserPreferences = async (speed: string, voice: string) => {
    try {
      const userPreferences = {
        speed,
        voice
      }
      const url = `${env.VITE_API_URL}/me/preferences`
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-type": "application/json"
      }
      const body = JSON.stringify(userPreferences)

      const resp = await fetch(url, { method: "POST", headers, body })

      if (!resp.ok) throw new Error("Update user preferences failed")

      addToast({
        title: "User preferences updated successfully.",
        color: "success"
      })
    } catch (err) {
      console.error(err)
      addToast({
        title: "Failed to update user preferences.",
        color: "danger"
      })
    }
  }

  const [forwardIndex, setForwardIndex] = useState(0)
  const forwardVariants: Variants = {
    enter: {
      x: -40,
      opacity: 0
    },
    center: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    },
    exit: {
      x: 40,
      opacity: 0,
      transition: { duration: 0.2 }
    }
  }
  const handleForwardAnimation = () => {
    setForwardIndex(prev => prev + 1)
  }

  const [backwardIndex, setBackwardIndex] = useState(0)
  const backwardVariants: Variants = {
    enter: {
      x: 40,
      opacity: 0
    },
    center: {
      x: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 400, damping: 25 }
    },
    exit: {
      x: -40,
      opacity: 0,
      transition: { duration: 0.2 }
    }
  }
  const handleBackwardAnimation = () => {
    setBackwardIndex(prev => prev - 1)
  }

  // Adds keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Enter":
        case " ": // spacebar
          event.preventDefault()
          if (isPlaying) {
            handlePause()
          } else {
            handlePlay()
          }
          break
        case "ArrowRight":
          event.preventDefault()
          handleForwardAnimation()
          handleForward()
          break
        case "ArrowLeft":
          event.preventDefault()
          handleBackwardAnimation()
          handleBackwards()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    // Cleanup: remove listener when component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [
    isPlaying,
    handlePlay,
    handlePause,
    handleForward,
    handleBackwards,
    handleForwardAnimation,
    handleBackwardAnimation
  ]) // dependencies for the handlers
  const iconButton =
    "grid place-items-center size-12 rounded-full overflow-hidden hover:bg-foreground/10 active:scale-90 transition cursor-pointer"

  const selectClassNames = {
    trigger:
      "bg-foreground/5 data-[hover=true]:bg-foreground/10 rounded-full min-h-10 h-10"
  }

  const voiceSelect = (className: string) => (
    <VoiceSelect
      className={className}
      voices={voiceOptions}
      selectedVoice={currentVoice}
      onChange={selected => {
        setVoice(selected)
        saveUserPreferences(currentSpeed, selected)
        dispatch(setUserPreferences({ speed: currentSpeed, voice: selected }))
      }}
      isDisabled={isLoading ? true : false}
    />
  )

  const speedSelect = (className: string) => (
    <Select
      className={className}
      classNames={selectClassNames}
      items={speedOptions}
      selectedKeys={[currentSpeed]}
      disallowEmptySelection
      aria-label="Select Speed"
      size="sm"
      // Auto scroll moves the page while reading; keep the list open
      popoverProps={{ shouldCloseOnScroll: false }}
      onSelectionChange={keys => {
        const selected = Array.from(keys)[0] as string | undefined
        if (!selected) return
        setSpeed(selected)
        saveUserPreferences(selected, currentVoice)
        dispatch(setUserPreferences({ speed: selected, voice: currentVoice }))
      }}
      isDisabled={isLoading ? true : false}
    >
      {speed => <SelectItem>{speed.label}</SelectItem>}
    </Select>
  )

  // A PDF can be read as plain text, easier on small screens
  const textViewButton = (className = "") =>
    kind === "pdf" && (
      <button
        type="button"
        aria-label="Text view"
        aria-pressed={isPdfText}
        title={isPdfText ? "Show the pages" : "Show the text only"}
        onMouseDown={ev => ev.preventDefault()}
        onClick={togglePdfView}
        className={`grid place-items-center size-10 shrink-0 rounded-full active:scale-90 transition cursor-pointer ${className} ${isPdfText ? "bg-brand text-white shadow-md shadow-violet-500/40" : "bg-foreground/5 hover:bg-foreground/10 text-foreground/60"}`}
      >
        <span aria-hidden className="text-sm font-bold select-none">
          Aa
        </span>
      </button>
    )

  const transport = (className: string) => (
    <div className={`flex items-center justify-center ${className}`}>
      <button
        type="button"
        aria-label="Previous sentence"
        className={iconButton}
        onMouseDown={ev => ev.preventDefault()}
        onClick={() => {
          handleBackwardAnimation()
          handleBackwards()
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={backwardIndex}
            variants={backwardVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <BackwardIcon className="size-7" />
          </motion.div>
        </AnimatePresence>
      </button>

      <button
        type="button"
        aria-label={isPlaying ? "Pause" : "Play"}
        disabled={isLoading}
        onMouseDown={ev => ev.preventDefault()}
        onClick={isPlaying ? handlePause : handlePlay}
        className="grid place-items-center size-14 rounded-full bg-brand text-white shadow-xl shadow-violet-500/40 hover:scale-105 active:scale-95 transition cursor-pointer disabled:cursor-wait"
      >
        {isLoading ? (
          <Spinner size="sm" color="white" />
        ) : isPlaying ? (
          <PauseIcon className="size-7" />
        ) : (
          <PlayIcon className="size-7 translate-x-0.5" />
        )}
      </button>

      <button
        type="button"
        aria-label="Next sentence"
        className={iconButton}
        onMouseDown={ev => ev.preventDefault()}
        onClick={() => {
          handleForwardAnimation()
          handleForward()
        }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={forwardIndex}
            variants={forwardVariants}
            initial="enter"
            animate="center"
            exit="exit"
          >
            <ForwardIcon className="size-7" />
          </motion.div>
        </AnimatePresence>
      </button>
    </div>
  )

  const barButton =
    "grid place-items-center size-10 shrink-0 rounded-full active:scale-90 transition cursor-pointer"
  const barButtonOn = "bg-brand text-white shadow-md shadow-violet-500/40"

  return (
    // A compact bar, docked on mobile and floating on desktop, the settings
    // slide out of it
    <div
      className={
        isDesktop
          ? "fixed z-50 left-1/2 -translate-x-1/2 bottom-6 w-[26rem]"
          : "fixed z-50 inset-x-0 bottom-0"
      }
    >
      {isOptionsOpen && (
        <div
          aria-hidden
          className="fixed inset-0"
          onClick={() => setIsOptionsOpen(false)}
        />
      )}
      <div
        className={`relative glass flex flex-col gap-2 px-4 ${isDesktop ? "rounded-[2rem] py-3" : "!border-x-0 !border-b-0 rounded-t-3xl pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]"}`}
      >
        {!isDesktop && (
          <span
            aria-hidden
            className="mx-auto w-9 h-1 rounded-full bg-foreground/15"
          />
        )}
        <AnimatePresence initial={false}>
          {isOptionsOpen && (
            <motion.div
              id="player-options"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 pt-1 pb-2">
                <div className="flex gap-2">
                  {voiceSelect("flex-1 min-w-0")}
                  {speedSelect("w-24 shrink-0")}
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <FontSizeControls />
                  </div>
                  {textViewButton()}
                </div>
                {hasReaderFont && <FontSelect />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <ReadingProgress />
        <div className="flex items-center justify-between">
          <button
            type="button"
            aria-label="Auto scroll"
            aria-pressed={isAutoScroll}
            title={isAutoScroll ? "Auto scroll on" : "Auto scroll off"}
            onMouseDown={ev => ev.preventDefault()}
            onClick={toggleAutoScroll}
            className={`${barButton} ${isAutoScroll ? barButtonOn : "text-foreground/50 hover:bg-foreground/10"}`}
          >
            <ViewfinderCircleIcon className="size-5" />
          </button>
          {transport("gap-5")}
          <button
            type="button"
            aria-label="Player options"
            aria-expanded={isOptionsOpen}
            aria-controls="player-options"
            onMouseDown={ev => ev.preventDefault()}
            onClick={() => setIsOptionsOpen(open => !open)}
            className={`${barButton} ${isOptionsOpen ? barButtonOn : "text-foreground/60 hover:bg-foreground/10"}`}
          >
            <AdjustmentsHorizontalIcon className="size-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
