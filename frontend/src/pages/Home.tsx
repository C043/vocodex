import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch } from "react-redux"
import { setIsLoggedIn } from "../redux/reducer/authSlice"

const Home = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    const token = window.localStorage.getItem("vocodex-jwt")
    const isAuthenticated = checkAuthentication(token)
    if (!isAuthenticated) {
      dispatch(setIsLoggedIn(false))
      navigate("/login")
    } else {
      dispatch(setIsLoggedIn(true))
    }
  }, [])

  return <h1 className="text-2xl font-bold">Home</h1>
}

export default Home
