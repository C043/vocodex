import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch } from "react-redux"
import { setIsLoggedIn } from "../redux/reducer/authSlice"

const Player = () => {
  const env = import.meta.env

  const { id } = useParams()
  const navigate = useNavigate()

  const dispatch = useDispatch()

  const [content, setContent] = useState("")
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
      setContent(data.content)
      setTitle(data.title)
    } catch (err) {
      console.error(err)
      navigate("/")
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
      <h1>{title}</h1>
      <p>{content}</p>
    </div>
  )
}

export default Player
