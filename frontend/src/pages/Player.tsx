import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch } from "react-redux"
import { setIsLoggedIn } from "../redux/reducer/authSlice"

type sentenceObj = {
  prev: string | null
  audio: string | null
  next: string | null
}

const Player = () => {
  const env = import.meta.env

  const { id } = useParams()
  const navigate = useNavigate()

  const dispatch = useDispatch()

  const [content, setContent] = useState<string[]>([])
  const [sentencesMap, setSentencesMap] = useState<Map<string, sentenceObj>>(
    new Map()
  )
  const [title, setTitle] = useState("")

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

  const splitIntoSentences = (content: string, maxChars = 500) => {
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

    setContent(chunks)

    for (const [idx, sentence] of chunks.entries()) {
      if (idx > 0) {
        previous = chunks[idx - 1]
      }
      if (idx < chunks.length) {
        next = chunks[idx + 1]
      } else {
        next = null
      }

      sentencesMap.set(sentence, { prev: previous, audio: null, next: next })
    }
  }

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

  return (
    <div>
      <h1 className="text-9xl mb-10">{title}</h1>
      {content.map(sentence => (
        <p key={sentence} className="text-3xl mb-10">
          {sentence}
        </p>
      ))}
    </div>
  )
}

export default Player
