import { useEffect, useState } from "react"
import { usePlayer } from "../../contexts/PlayerContext"
import { motion, AnimatePresence, Variants } from "framer-motion"
import { Select, SelectItem, Spinner } from "@heroui/react"
import {
  BackwardIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon
} from "@heroicons/react/24/solid"

export const PlayerControls = () => {
  const {
    isPlaying,
    isLoading,
    handlePlay,
    handlePause,
    handleForward,
    handleBackwards,
    setVoice,
    setSpeed,
    voiceOptions,
    speedOptions,
    isDarkMode
  } = usePlayer()

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
  return (
    <div className="left-1/2 -translate-x-1/2 fixed bottom-0 mb-5">
      <div
        className="
          flex
          justify-center
          items-center
          gap-5
          p-10
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
        <Select
          className={`w-25`}
          items={voiceOptions}
          defaultSelectedKeys={[""]}
          aria-label="Select Voice"
          onSelectionChange={keys => {
            const selected = Array.from(keys)[0] as string
            setVoice(selected)
          }}
          isDisabled={isLoading ? true : false}
        >
          {voice => <SelectItem>{voice.label}</SelectItem>}
        </Select>
        <div className="cursor-pointer overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={backwardIndex}
              variants={backwardVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <BackwardIcon
                onClick={() => {
                  handleBackwardAnimation()
                  handleBackwards()
                }}
                className="size-10"
              />
            </motion.div>
          </AnimatePresence>
        </div>
        {isLoading ? (
          <Spinner size="md" color={isDarkMode ? "white" : "warning"} />
        ) : (
          <div className="cursor-pointer">
            {isPlaying ? (
              <PauseIcon onClick={handlePause} className="size-10" />
            ) : (
              <PlayIcon onClick={handlePlay} className="size-10" />
            )}
          </div>
        )}
        <div className="cursor-pointer overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={forwardIndex}
              variants={forwardVariants}
              initial="enter"
              animate="center"
              exit="exit"
            >
              <ForwardIcon
                onClick={() => {
                  handleForwardAnimation()
                  handleForward()
                }}
                className="size-10"
              />
            </motion.div>
          </AnimatePresence>
        </div>
        <Select
          className={`w-20`}
          items={speedOptions}
          defaultSelectedKeys={["+0%"]}
          aria-label="Select Speed"
          onSelectionChange={keys => {
            const selected = Array.from(keys)[0] as string
            setSpeed(selected)
          }}
          isDisabled={isLoading ? true : false}
        >
          {speed => <SelectItem>{speed.label}</SelectItem>}
        </Select>
      </div>
    </div>
  )
}
