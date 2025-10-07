import { useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch } from "react-redux"
import { setIsLoggedIn } from "../redux/reducer/authSlice"

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

const Player = () => {
  const env = import.meta.env
  const token = window.localStorage.getItem("vocodex-jwt")

  const { id } = useParams()
  const navigate = useNavigate()

  const dispatch = useDispatch()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [sentencesMap, setSentencesMap] = useState<Map<number, sentenceObj>>(
    new Map()
  )
  const [title, setTitle] = useState("")

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
      "en-GB-AdaMultilingualNeural",
      "+0%"
    )

    // We start the first sentence
    audioRef.current.src = firstAudioUrl
    audioRef.current.play()
    setCurrentIndex(0)

    if (firstAudioUrl) {
      setSentencesMap(prev => {
        const updated = new Map(prev)
        const first = updated.get(0)
        if (first) {
          first.audio.url = firstAudioUrl
          updated.set(0, first)
        }
        return updated
      })

      // Prefetch the next 3 sentences
      prefetchNextSentences(0, 3)
    }
  }

  const fetchSentenceAudio = async (
    text: string,
    voice: string,
    speed: string
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

  const prefetchNextSentences = async (
    fromIndex: number,
    count: number = 3
  ) => {
    const promises: Promise<void>[] = []

    for (let i = 1; i <= count; i++) {
      const targetIndex = fromIndex + i
      const sentence = sentencesMap.get(targetIndex)

      if (sentence && !sentence.audio.url) {
        const promise = (async () => {
          const audioUrl = await fetchSentenceAudio(
            sentence.text,
            "en-GB-AdaMultilingualNeural",
            "+0%"
          )

          if (audioUrl) {
            setSentencesMap(prev => {
              const updated = new Map(prev)
              const target = updated.get(targetIndex)
              if (target) {
                target.audio.url = audioUrl
                updated.set(targetIndex, target)
              }
              return updated
            })
          }
        })()

        promises.push(promise)
      }
    }

    await Promise.all(promises)
  }

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = async () => {
        const nextIndex = currentIndex + 1
        if (sentencesMap.has(nextIndex)) {
          let url = sentencesMap.get(nextIndex)?.audio.url

          // Retry mechanism: poll for audio URL if not ready
          if (!url) {
            const maxRetries = 10
            const retryDelay = 500 // ms

            for (let attempt = 0; attempt < maxRetries; attempt++) {
              await new Promise(resolve => setTimeout(resolve, retryDelay))
              url = sentencesMap.get(nextIndex)?.audio.url
              if (url) break
            }
          }
          if (audioRef.current && url) {
            setCurrentIndex(nextIndex)
            audioRef.current.src = url
            audioRef.current?.play()

            // Prefetch the next 3 sentences from the new current index
            prefetchNextSentences(nextIndex, 3)
          } else {
          }
        }
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

  return (
    <div>
      <h1 className="text-9xl mb-10">{title}</h1>
      <audio ref={audioRef} />
      {Array.from(sentencesMap.values()).map(sentence => (
        <p key={sentence.id} className="text-3xl mb-10">
          {sentence.text}
        </p>
      ))}
    </div>
  )
}

export default Player
