import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"

const Home = () => {
  const navigate = useNavigate()

  useEffect(() => {
    const token = window.localStorage.getItem("vocodex-jwt")
    const isAuthenticated = checkAuthentication(token)
    if (!isAuthenticated) navigate("/login")
  }, [])

  return <h1 className="text-2xl font-bold">Home</h1>
}

export default Home
