import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch, useSelector } from "react-redux"
import { setIsLoggedIn } from "../redux/reducer/authSlice"
import {
  BackwardIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon
} from "@heroicons/react/24/solid"
import { Spinner } from "@heroui/react"
import { Select, SelectItem } from "@heroui/react"

type sentenceObj = {
  id: number
  text: string
  prev: string | null
  audio: {
    url: string | null
    voice: string | null
    speed: string | null
  }
  next: string | null
}

type State = {
  darkMode: {
    value: boolean
  }
}

const Player = () => {
  const env = import.meta.env
  const token = window.localStorage.getItem("vocodex-jwt")

  const isDarkMode = useSelector((state: State) => state.darkMode.value)

  const { id } = useParams()
  const navigate = useNavigate()

  const dispatch = useDispatch()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [sentencesMap, setSentencesMap] = useState<Map<number, sentenceObj>>(
    new Map()
  )
  const [title, setTitle] = useState("")

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentSpeed, setSpeed] = useState("+0%")
  const [currentVoice, setVoice] = useState("en-GB-AdaMultilingualNeural")

  const speedOptions = [
    { key: "+100%", label: "2x" },
    { key: "+50%", label: "1.5x" },
    { key: "+0%", label: "1x" }
  ]

  const voiceOptions = [
    { key: "en-GB-LibbyNeural", label: "Libby" },
    { key: "en-GB-AdaMultilingualNeural", label: "Ada" },
    { key: "en-GB-OllieMultilingualNeural", label: "Ollie" },
    { key: "en-GB-RyanNeural", label: "Ryan" }
  ]

  const audioRef = useRef<HTMLAudioElement>(null)

  const fetchEntry = async () => {
    try {
      const token = window.localStorage.getItem("vocodex-jwt")
      const url = `${env.VITE_API_URL}/entries/${id}`
      const headers = {
        Authorization: `Bearer ${token}`
      }

      const resp = await fetch(url, {
        method: "GET",
        headers
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => null)
        const detail = data?.detail ?? `HTTP ${resp.status}`
        throw new Error(detail)
      }

      const data = await resp.json()

      splitIntoSentences(data.content)
      setTitle(data.title)
    } catch (err) {
      console.error(err)
      navigate("/")
    }
  }

  const splitIntoSentences = async (content: string, maxChars = 500) => {
    const sentences: string[] = content.match(/[^.!?]+[.!?]+/g) || [content]
    const chunks: string[] = []
    let current: string = ""
    let previous: string | null = null
    let next: string | null = null

    for (const sentence of sentences) {
      if (current.concat(sentence).length > maxChars) {
        if (current) {
          chunks.push(current.trim())
        }
        current = sentence
      } else {
        current += sentence
      }
    }

    if (current) {
      chunks.push(current.trim())
    }

    for (const [idx, sentence] of chunks.entries()) {
      if (idx > 0) {
        previous = chunks[idx - 1]
      }
      if (idx < chunks.length) {
        next = chunks[idx + 1]
      } else {
        next = null
      }

      sentencesMap.set(idx, {
        id: idx,
        text: sentence,
        prev: previous,
        audio: {
          voice: null,
          speed: null,
          url: null
        },
        next: next
      })
    }

    // At the end of splitIntoSentences, after setSentencesMap(newMap):
    const firstAudioUrl = await fetchSentenceAudio(
      chunks[0],
      currentVoice,
      currentSpeed
    )

    // We start the first sentence
    audioRef.current.src = firstAudioUrl
    audioRef.current.play()
    setIsPlaying(true)
    setCurrentIndex(0)

    if (firstAudioUrl) {
      setIsLoading(false)
      updateSentence(firstAudioUrl, currentVoice, currentSpeed, 0)

      // Prefetch the next 3 sentences
      prefetchNextSentences(0, 3)
    }
  }

  const handlePause = () => {
    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handlePlay = () => {
    if (!isPlaying) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleForward = async () => {
    if (isLoading) return
    const nextIndex = currentIndex + 1
    if (sentencesMap.has(nextIndex)) {
      audioRef.current.pause()
      let url = sentencesMap.get(nextIndex)?.audio.url

      // Retry mechanism: poll for audio URL if not ready
      if (!url) {
        const maxRetries = 50
        const retryDelay = 500 // ms

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          setIsLoading(true)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          url = sentencesMap.get(nextIndex)?.audio.url
          if (url) break
        }
        setIsLoading(false)
      }
      if (audioRef.current && url) {
        setCurrentIndex(nextIndex)
        audioRef.current.src = url
        audioRef.current?.play()
        setIsLoading(false)
        setIsPlaying(true)

        // Prefetch the next 3 sentences from the new current index
        prefetchNextSentences(nextIndex, 3)
      }
    }
  }

  const handleBackwards = async () => {
    if (isLoading) return
    const prevIndex = currentIndex - 1
    if (sentencesMap.has(prevIndex)) {
      audioRef.current.pause()
      let url = sentencesMap.get(prevIndex)?.audio.url

      // Retry mechanism: poll for audio URL if not ready
      if (!url) {
        const maxRetries = 10
        const retryDelay = 500 // ms

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          url = sentencesMap.get(prevIndex)?.audio.url
          if (url) break
        }
      }
      if (audioRef.current && url) {
        setCurrentIndex(prevIndex)
        audioRef.current.src = url
        audioRef.current?.play()
        setIsPlaying(true)

        // Prefetch the next 3 sentences from the new current index
        prefetchNextSentences(prevIndex, 3)
      }
    }
  }

  const fetchSentenceAudio = async (
    text: string,
    voice: string,
    speed: string = currentSpeed
  ) => {
    try {
      const url = `${env.VITE_API_URL}/synthesis/GET`
      const method = "POST"
      const headers = {
        Authentication: `Bearer ${token}`,
        "Content-Type": "application/json"
      }

      const body = {
        voice,
        text,
        speed
      }

      const resp = await fetch(url, {
        headers,
        method,
        body: JSON.stringify(body)
      })

      if (!resp.ok) throw new Error("Synthesis failed")

      const blob = await resp.blob()
      const audioUrl = URL.createObjectURL(blob)

      return audioUrl
    } catch (err) {
      console.error(err)
    }
  }

  const updateSentence = (
    audioUrl: string,
    voice: string,
    speed: string,
    targetIndex: number
  ) => {
    setSentencesMap(prev => {
      const updated = new Map(prev)
      const target = updated.get(targetIndex)
      if (target) {
        target.audio.url = audioUrl
        target.audio.voice = voice
        target.audio.speed = speed
        updated.set(targetIndex, target)
      }
      return updated
    })
  }

  const prefetchNextSentences = async (
    fromIndex: number,
    count: number = 3
  ) => {
    for (let i = 1; i <= count; i++) {
      const targetIndex = fromIndex + i
      const sentence = sentencesMap.get(targetIndex)

      if (
        (sentence && !sentence.audio.url) ||
        (sentence && sentence.audio.speed !== currentSpeed) ||
        (sentence && sentence.audio.voice !== currentVoice)
      ) {
        const audioUrl = await fetchSentenceAudio(
          sentence.text,
          currentVoice,
          currentSpeed
        )

        if (audioUrl) {
          updateSentence(audioUrl, currentVoice, currentSpeed, targetIndex)
        }
      }
    }
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = async () => {
        setIsPlaying(false)
        await handleForward()
      }
    }
  }, [currentIndex, sentencesMap])

  useEffect(() => {
    const token = window.localStorage.getItem("vocodex-jwt")
    const isAuthenticated = checkAuthentication(token)
    if (!isAuthenticated) {
      dispatch(setIsLoggedIn(false))
      navigate("/login")
    } else {
      dispatch(setIsLoggedIn(true))
      ;(async () => {
        await fetchEntry()
      })().catch(console.error)
    }
  }, [])

  useEffect(() => {
    // Cleanup only on component unmount
    return () => {
      sentencesMap.forEach(sentence => {
        if (sentence.audio.url) {
          URL.revokeObjectURL(sentence.audio.url)
        }
      })
    }
  }, [])

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
          handleForward()
          break
        case "ArrowLeft":
          event.preventDefault()
          handleBackwards()
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    // Cleanup: remove listener when component unmounts
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [isPlaying, currentIndex]) // dependencies for the handlers

  useEffect(() => {
    if (sentencesMap.size === 0) return // Don't run before sentences are loaded

    const currentSentence = sentencesMap.get(currentIndex)

    audioRef.current.pause()

    // Invalidate all cached audio that doesn't match current settings
    setSentencesMap(prev => {
      const updated = new Map(prev)
      updated.forEach((sentence, index) => {
        if (
          sentence.audio.speed !== currentSpeed ||
          sentence.audio.voice !== currentVoice
        ) {
          if (sentence.audio.url) {
            URL.revokeObjectURL(sentence.audio.url) // Free memory
          }
          sentence.audio.url = null
          sentence.audio.speed = null
          sentence.audio.voice = null
          updated.set(index, sentence)
        }
      })
      return updated
    })

    // Refetch current sentence if speed/voice changed
    if (
      currentSentence &&
      (currentSentence.audio.speed !== currentSpeed ||
        currentSentence.audio.voice !== currentVoice)
    ) {
      setIsLoading(true)
      ;(async () => {
        setIsPlaying(false)
        const audioUrl = await fetchSentenceAudio(
          currentSentence.text,
          currentVoice,
          currentSpeed
        )

        if (audioUrl && audioRef.current) {
          updateSentence(audioUrl, currentVoice, currentSpeed, currentIndex)
          audioRef.current.src = audioUrl
          if (isPlaying) {
            audioRef.current.play()
            setIsPlaying(true)
          }
          setIsLoading(false)
        }
      })()
    }

    // Refetch next 3 sentences
    prefetchNextSentences(currentIndex, 3)
  }, [currentSpeed, currentVoice])

  return (
    <div>
      <h1 className="text-9xl mb-10">{title}</h1>
      <audio ref={audioRef} />
      <div className="mb-52">
        {Array.from(sentencesMap.values()).map(sentence => (
          <p key={sentence.id} className="text-3xl mb-10">
            {sentence.text}
          </p>
        ))}
      </div>

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
            className="w-25"
            items={voiceOptions}
            defaultSelectedKeys={["en-GB-AdaMultilingualNeural"]}
            aria-label="Select Voice"
            onSelectionChange={keys => {
              const selected = Array.from(keys)[0] as string
              setVoice(selected)
            }}
          >
            {voice => <SelectItem>{voice.label}</SelectItem>}
          </Select>
          <div className="cursor-pointer">
            <BackwardIcon onClick={handleBackwards} className="size-10" />
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
          <div className="cursor-pointer">
            <ForwardIcon onClick={handleForward} className="size-10" />
          </div>
          <Select
            className="w-20"
            items={speedOptions}
            defaultSelectedKeys={["+0%"]}
            aria-label="Select Speed"
            onSelectionChange={keys => {
              const selected = Array.from(keys)[0] as string
              setSpeed(selected)
            }}
          >
            {speed => <SelectItem>{speed.label}</SelectItem>}
          </Select>
        </div>
      </div>
    </div>
  )
}

export default Player
