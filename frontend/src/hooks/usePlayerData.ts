import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import {
  SentenceObj,
  SpeedOption,
  VoiceOption
} from "../contexts/PlayerContext"

type State = {
  darkMode: {
    value: boolean
  }
  user: {
    preferences: {
      speed: string
      voice: string
    }
  }
}

export const usePlayerData = (id: string | undefined) => {
  const env = import.meta.env
  const token = window.localStorage.getItem("vocodex-jwt")

  const isDarkMode = useSelector((state: State) => state.darkMode.value)
  const userSpeed = useSelector((state: State) => state.user.preferences.speed)
  const userVoice = useSelector((state: State) => state.user.preferences.voice)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentSpeed, setSpeed] = useState(userSpeed)
  const [currentVoice, setVoice] = useState(userVoice)
  const [title, setTitle] = useState("")
  const [currentIndex, setCurrentIndex] = useState<number>(Infinity)
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(Infinity)
  const [currentFontSize, setFontSize] = useState(1)
  const [sentencesMap, setSentencesMap] = useState<Map<number, SentenceObj>>(
    new Map()
  )

  const audioRef = useRef<HTMLAudioElement>(null)

  const speedOptions: SpeedOption[] = [
    { key: "+100%", label: "2x" },
    { key: "+50%", label: "1.5x" },
    { key: "+0%", label: "1x" }
  ]
  const voiceOptions: VoiceOption[] = [
    { key: "", label: "Auto" },
    { key: "en-GB-LibbyNeural", label: "Libby" },
    { key: "en-GB-AdaMultilingualNeural", label: "Ada" },
    { key: "en-GB-OllieMultilingualNeural", label: "Ollie" },
    { key: "en-GB-RyanNeural", label: "Ryan" }
  ]

  const handleFontSizeUp = () => {
    if (currentFontSize <= 3) {
      setFontSize(currentFontSize + 1)
    }
  }
  const handleFontSizeDown = () => {
    if (currentFontSize >= 2) {
      setFontSize(currentFontSize - 1)
    }
  }

  const fetchEntry = async () => {
    try {
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

      setCurrentIndex(data.progress)
      setCurrentWordIndex(0)
      splitIntoSentences(data.content)
      setTitle(data.title)
    } catch (err) {
      console.error(err)
      navigate("/")
    }
  }

  const splitIntoSentences = async (content: string, maxChars = 200) => {
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
        words: sentence.split(" "),
        text: sentence,
        prev: previous,
        audio: {
          voice: null,
          url: null
        },
        next: next
      })
    }

    // At the end of splitIntoSentences, after setSentencesMap(newMap):
    const firstAudioUrl = await fetchSentenceAudio(
      chunks[currentIndex],
      currentVoice
    )

    // We start the first sentence
    if (audioRef.current && firstAudioUrl) {
      audioRef.current.src = firstAudioUrl
      handleVoiceSpeed()
      audioRef.current.play()
      setIsPlaying(true)
      setCurrentIndex(0)
      setCurrentWordIndex(0)
    }

    if (firstAudioUrl) {
      setIsLoading(false)
      updateSentence(firstAudioUrl, currentVoice, 0)

      prefetchNextSentences(0, 5)
    }
  }

  const handleVoiceSpeed = () => {
    if (audioRef.current) {
      let speed = null
      switch (currentSpeed) {
        case "-50%":
          speed = 0.5
          break
        case "+50%":
          speed = 1.5
          break
        case "+100%":
          speed = 2
          break
        default:
          speed = 1
      }

      audioRef.current.playbackRate = speed
    }
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
        (sentence && sentence.audio.voice !== currentVoice)
      ) {
        const audioUrl = await fetchSentenceAudio(sentence.text, currentVoice)

        if (audioUrl) {
          updateSentence(audioUrl, currentVoice, targetIndex)
        }
      }
    }
  }

  const fetchSentenceAudio = async (text: string, voice: string) => {
    try {
      const url = `${env.VITE_API_URL}/synthesis/GET`
      const method = "POST"
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }

      const body = {
        voice,
        text
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

  const handlePause = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handlePlay = () => {
    if (!isPlaying && audioRef.current) {
      audioRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleForward = async () => {
    if (isLoading) return
    const nextIndex = currentIndex + 1
    if (sentencesMap.has(nextIndex) && audioRef.current) {
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
        setCurrentWordIndex(0)
        audioRef.current.src = url
        handleVoiceSpeed()
        audioRef.current?.play()
        setIsLoading(false)
        setIsPlaying(true)

        prefetchNextSentences(nextIndex, 5)
      }
    }
  }

  const handleBackwards = async () => {
    if (isLoading) return
    const prevIndex = currentIndex - 1
    if (sentencesMap.has(prevIndex) && audioRef.current) {
      audioRef.current.pause()
      let url = sentencesMap.get(prevIndex)?.audio.url

      // Retry mechanism: poll for audio URL if not ready
      if (!url) {
        const maxRetries = 50
        const retryDelay = 500 // ms

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          setIsLoading(true)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          if (sentencesMap.get(prevIndex)?.text) {
            const text = sentencesMap.get(prevIndex)?.text as string
            url = sentencesMap.get(prevIndex)?.audio.url
              ? sentencesMap.get(prevIndex)?.audio.url
              : await fetchSentenceAudio(text, currentVoice)
          }

          if (url) {
            updateSentence(url, currentVoice, prevIndex)
            setIsLoading(false)
          }

          if (url) break
        }
      }
      if (audioRef.current && url) {
        setCurrentIndex(prevIndex)
        setCurrentWordIndex(0)
        audioRef.current.src = url
        handleVoiceSpeed()
        audioRef.current?.play()
        setIsPlaying(true)

        prefetchNextSentences(prevIndex, 5)
      }
    }
  }

  const updateProgress = async () => {
    try {
      const token = window.localStorage.getItem("vocodex-jwt")
      const url = `${env.VITE_API_URL}/entries/text/${id}/progress`
      const method = "POST"
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
      const body = {
        progress: currentIndex
      }

      const resp = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(body)
      })

      if (!resp.ok) throw new Error("Progress saving failed")
    } catch (err) {
      console.error(err)
    }
  }

  const updateSentence = (
    audioUrl: string,
    voice: string,
    targetIndex: number
  ) => {
    setSentencesMap(prev => {
      const updated = new Map(prev)
      const target = updated.get(targetIndex)
      if (target) {
        target.audio.url = audioUrl
        target.audio.voice = voice
        updated.set(targetIndex, target)
      }
      return updated
    })
  }

  // Handle authentication
  useEffect(() => {
    ;(async () => {
      await fetchEntry()
    })().catch(console.error)

    // Cleanup only on component unmount
    return () => {
      sentencesMap.forEach(sentence => {
        if (sentence.audio.url) {
          URL.revokeObjectURL(sentence.audio.url)
        }
      })
    }
  }, [])

  // Handle smoothless transition from a sentence to another
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = async () => {
        setIsPlaying(false)
        await handleForward()
      }
    }
  }, [currentIndex, sentencesMap])

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

  // Handle voice change
  useEffect(() => {
    if (sentencesMap.size === 0) return // Don't run before sentences are loaded

    const currentSentence = sentencesMap.get(currentIndex)

    if (audioRef.current) {
      audioRef.current.pause()

      // Invalidate all cached audio that doesn't match current settings
      setSentencesMap(prev => {
        const updated = new Map(prev)
        updated.forEach((sentence, index) => {
          if (sentence.audio.voice !== currentVoice) {
            if (sentence.audio.url) {
              URL.revokeObjectURL(sentence.audio.url) // Free memory
            }
            sentence.audio.url = null
            sentence.audio.voice = null
            updated.set(index, sentence)
          }
        })
        return updated
      })
    }

    // Refetch current sentence if voice changed
    if (currentSentence && currentSentence.audio.voice !== currentVoice) {
      setIsLoading(true)
      ;(async () => {
        setIsPlaying(false)
        const audioUrl = await fetchSentenceAudio(
          currentSentence.text,
          currentVoice
        )

        if (audioUrl && audioRef.current) {
          updateSentence(audioUrl, currentVoice, currentIndex)
          audioRef.current.src = audioUrl
          if (isPlaying) {
            handleVoiceSpeed()
            audioRef.current.play()
            setIsPlaying(true)
          }
          setIsLoading(false)
        }
      })()
    }

    prefetchNextSentences(currentIndex, 5)
  }, [currentVoice])

  // Handle sentence change
  useEffect(() => {
    if (sentencesMap.size === 0) return // Don't run before sentences are loaded

    if (audioRef.current) {
      audioRef.current.pause()
      updateProgress()

      // Fast Forward to the sentence if we have the audio, if not, we fetch it
      ;(async () => {
        setIsPlaying(false)
        let audioUrl = sentencesMap.get(currentIndex)?.audio.url
        if (!audioUrl) {
          setIsLoading(true)
          const text = sentencesMap.get(currentIndex)?.text
          if (text) {
            audioUrl = await fetchSentenceAudio(text, currentVoice)
            if (audioUrl) {
              updateSentence(audioUrl, currentVoice, currentIndex)
            }
          }
          setIsLoading(false)
        }
        if (audioUrl && audioRef.current) {
          audioRef.current.src = audioUrl
          handleVoiceSpeed()
          audioRef.current.play()
          setIsPlaying(true)
        }
      })()
    }

    prefetchNextSentences(currentIndex, 5)
  }, [currentIndex])

  // Handle voice speed change
  useEffect(() => {
    handleVoiceSpeed()
  }, [currentSpeed])

  return {
    audioRef,

    isPlaying,
    isLoading,
    isDarkMode,
    currentIndex,
    currentWordIndex,
    sentencesMap,
    title,
    currentFontSize,
    currentSpeed,
    currentVoice,
    speedOptions,
    voiceOptions,

    handlePlay,
    handlePause,
    handleForward,
    handleBackwards,
    setCurrentIndex,
    setVoice,
    setSpeed,
    handleFontSizeUp,
    handleFontSizeDown
  }
}
