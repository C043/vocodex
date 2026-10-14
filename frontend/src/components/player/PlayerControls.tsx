import { useEffect, useState } from "react"
import { usePlayer } from "../../contexts/PlayerContext"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { addToast, Select, SelectItem, Spinner } from "@heroui/react"
import {
  BackwardIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon
} from "@heroicons/react/24/solid"
import { useDispatch } from "react-redux"
import { setUserPreferences } from "../../redux/reducer/authSlice"

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
    speedOptions
  } = usePlayer()

  const dispatch = useDispatch()

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

  return (
    // Mobile: docked bottom sheet. Desktop: floating pill
    <div className="fixed z-50 inset-x-0 bottom-0 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:bottom-6">
      <div className="glass rounded-t-[2rem] md:rounded-full px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] md:p-3 md:pl-4 flex flex-col-reverse md:flex-row items-center gap-3 md:gap-4">
        <div className="flex w-full md:w-auto gap-3 md:contents">
          <Select
            className="flex-1 md:flex-none md:w-36 md:order-1"
            classNames={selectClassNames}
            items={voiceOptions}
            defaultSelectedKeys={[currentVoice]}
            aria-label="Select Voice"
            size="sm"
            onSelectionChange={keys => {
              const selected = Array.from(keys)[0] as string
              setVoice(selected)
              saveUserPreferences(currentSpeed, selected)
              dispatch(
                setUserPreferences({ speed: currentSpeed, voice: selected })
              )
            }}
            isDisabled={isLoading ? true : false}
          >
            {voice => <SelectItem>{voice.label}</SelectItem>}
          </Select>
          <Select
            className="w-28 md:w-24 md:order-3"
            classNames={selectClassNames}
            items={speedOptions}
            defaultSelectedKeys={[currentSpeed]}
            aria-label="Select Speed"
            size="sm"
            onSelectionChange={keys => {
              const selected = Array.from(keys)[0] as string
              setSpeed(selected)
              saveUserPreferences(selected, currentVoice)
              dispatch(
                setUserPreferences({ speed: selected, voice: currentVoice })
              )
            }}
            isDisabled={isLoading ? true : false}
          >
            {speed => <SelectItem>{speed.label}</SelectItem>}
          </Select>
        </div>

        <div className="flex items-center justify-center gap-6 md:gap-2 md:order-2">
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
            className="grid place-items-center size-16 md:size-14 rounded-full bg-brand text-white shadow-xl shadow-violet-500/40 hover:scale-105 active:scale-95 transition cursor-pointer disabled:cursor-wait"
          >
            {isLoading ? (
              <Spinner size="sm" color="white" />
            ) : isPlaying ? (
              <PauseIcon className="size-8 md:size-7" />
            ) : (
              <PlayIcon className="size-8 md:size-7 translate-x-0.5" />
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
      </div>
    </div>
  )
}
