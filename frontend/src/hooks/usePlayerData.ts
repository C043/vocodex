import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import {
  boundaryObj,
  SentenceObj,
  SpeedOption,
  VoiceOption
} from "../contexts/PlayerContext"
import { audio } from "framer-motion/m"

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
  const [currentIndex, setCurrentIndex] = useState<number>(-1)
  const [activeWordIndex, setActiveWordIndex] = useState(-1)
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
      setIsLoading(true)
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

      splitIntoSentences(data.content, data.progress)
      setTitle(data.title)
    } catch (err) {
      console.error(err)
      navigate("/")
    }
  }

  const splitIntoSentences = async (
    content: string,
    progress: number,
    maxChars = 200
  ) => {
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

    const newMap = new Map<number, SentenceObj>()
    for (const [idx, sentence] of chunks.entries()) {
      if (idx > 0) {
        previous = chunks[idx - 1]
      }
      if (idx < chunks.length) {
        next = chunks[idx + 1]
      } else {
        next = null
      }

      newMap.set(idx, {
        id: idx,
        boundaries: [],
        text: sentence,
        prev: previous,
        audio: {
          voice: null,
          url: null
        },
        next: next
      })
    }
    setSentencesMap(newMap)

    // At the end of splitIntoSentences, after setSentencesMap(newMap):
    await fetchSentenceAudio(chunks[progress], currentVoice)

    setCurrentIndex(progress)
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
        const { audioUrl, boundaries } = await fetchSentenceAudio(
          sentence.text,
          currentVoice
        )

        if (audioUrl) {
          updateSentence(audioUrl, boundaries, currentVoice, targetIndex)
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

      const data = await resp.json()
      const audioData = `data:audio/mpeg;base64,${data.audio}`
      const blob = base64ToBlob(audioData)

      const boundaries: boundaryObj[] = data.boundaries
      let audioUrl = ""
      if (blob) {
        audioUrl = URL.createObjectURL(blob)
      } else {
        throw new Error("Failed to convert base64 url to blob")
      }

      return { audioUrl, boundaries }
    } catch (err) {
      console.error(err)
      return { audioUrl: "", boundaries: [] }
    }
  }

  const base64ToBlob = (base64DataUrl: string) => {
    if (!base64DataUrl || typeof base64DataUrl !== "string") {
      console.error("Invalid base64DataUrl provided.")
      return null
    }

    const parts = base64DataUrl.split(";base64,")
    if (parts.length !== 2) {
      console.error("base64DataUrl format is incorrect.")
      return null
    }

    const mimeType = parts[0].split(":")[1]
    const base64 = parts[1]

    const binaryString = atob(base64)
    const len = binaryString.length
    const bytes = new Uint8Array(len)

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    return new Blob([bytes], { type: mimeType })
  }

  const handlePause = () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
      setActiveWordIndex(-1)
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
    setCurrentIndex(nextIndex)
  }

  const handleBackwards = async () => {
    if (isLoading) return
    const prevIndex = currentIndex - 1
    setCurrentIndex(prevIndex)
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
    boundaries: boundaryObj[],
    voice: string,
    targetIndex: number
  ) => {
    setSentencesMap(prev => {
      const updated = new Map(prev)
      const target = updated.get(targetIndex)
      if (target) {
        const updatedSentence: SentenceObj = {
          ...target,
          audio: {
            ...target.audio,
            url: audioUrl,
            voice
          },
          boundaries
        }
        updated.set(targetIndex, updatedSentence)
      }
      return updated
    })
  }

  // Handle entry fetch
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

      const track = audioRef.current?.textTracks[0]
      if (track) track.removeEventListener("cuechange", handleCueChange)
    }
  }, [])

  // Handle smoothless transition from a sentence to another
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = async () => {
        setActiveWordIndex(-1)
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
    if (sentencesMap.size === 0 || currentIndex === -1 || !audioRef.current)
      return

    if (audioRef.current) {
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

    const audio = audioRef.current
    audio.pause()
    setIsPlaying(false)
    setIsLoading(true)
    setActiveWordIndex(-1)
    ;(async () => {
      try {
        const text = sentencesMap.get(currentIndex)?.text
        if (!text) throw new Error("No current sentence text")
        const { audioUrl, boundaries } = await fetchSentenceAudio(
          text,
          currentVoice
        )
        if (!audioUrl) return

        updateSentence(audioUrl, boundaries, currentVoice, currentIndex)

        audio.src = audioUrl
        handleVoiceSpeed()
        await audio.play()
        setIsPlaying(true)
      } catch (err) {
        console.error(err)
        setIsPlaying(false)
      } finally {
        setIsLoading(false)
      }
    })()
  }, [currentVoice])

  const handleCueChange = () => {
    if (audioRef.current) {
      const track =
        audioRef.current.textTracks[0] ??
        audioRef.current.addTextTrack("metadata")
      const cue = track.activeCues?.[0] as VTTCue | undefined
      const idx = cue ? Number(cue.text) : -1
      setActiveWordIndex(Number.isNaN(idx) ? -1 : idx)
    }
  }

  // Handle sentence change
  useEffect(() => {
    if (!audioRef.current || sentencesMap.size === 0 || currentIndex === -1)
      return // Don't run before sentences are loaded

    audioRef.current.pause()
    updateProgress()
    setActiveWordIndex(-1)

    // Fast Forward to the sentence if we have the audio, if not, we fetch it
    ;(async () => {
      let audioUrl = sentencesMap.get(currentIndex)?.audio.url
      if (!audioUrl) {
        setIsPlaying(false)
        setIsLoading(true)
        const text = sentencesMap.get(currentIndex)?.text
        if (text) {
          const { audioUrl: fetchedAudioUrl, boundaries } =
            await fetchSentenceAudio(text, currentVoice)
          if (fetchedAudioUrl) {
            updateSentence(
              fetchedAudioUrl,
              boundaries,
              currentVoice,
              currentIndex
            )
            audioUrl = fetchedAudioUrl
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

    // Ensure the audio tag has the right settings
    const track =
      audioRef.current.textTracks[0] ??
      audioRef.current.addTextTrack("metadata")
    track.mode = "hidden"

    // Remove stale cues
    const cues = track.cues
    if (cues) {
      for (let i = cues.length - 1; i >= 0; i--) {
        track.removeCue(track.cues[i])
      }
    }

    // Add new cues
    const boundaries = sentencesMap.get(currentIndex)?.boundaries ?? []
    boundaries.forEach((boundary: boundaryObj, idx) => {
      const cue = new VTTCue(boundary.start, boundary.end, String(idx))
      track.addCue(cue)
    })

    // Add the cue event listener
    track.addEventListener("cuechange", handleCueChange)

    prefetchNextSentences(currentIndex, 5)

    return () => {
      track.removeEventListener("cuechange", handleCueChange)
    }
  }, [currentIndex, sentencesMap.get(currentIndex)?.boundaries])

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
    activeWordIndex,
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
    setActiveWordIndex,
    setVoice,
    setSpeed,
    handleFontSizeUp,
    handleFontSizeDown
  }
}
