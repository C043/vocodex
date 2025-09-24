import { useEffect } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch, useSelector } from "react-redux"
import {
  setIsLoggedIn,
  setUserId,
  setUsername
} from "../redux/reducer/authSlice"
import { setDarkMode } from "../redux/reducer/themeModeSlice"
import { MoonIcon, SunIcon } from "@heroicons/react/24/solid"

const Layout = () => {
  const isLoggedIn = useSelector(state => state.user.isLoggedIn)
  const username = useSelector(state => state.user.username)
  const isDarkMode = useSelector(state => state.darkMode.value)
  const dispatch = useDispatch()

  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "font-semibold mr-4" : "mr-4"

  const navigate = useNavigate()

  const handleLogout = () => {
    window.localStorage.removeItem("vocodex-jwt")
    dispatch(setIsLoggedIn(false))
    dispatch(setUserId(-1))
    dispatch(setUsername(""))
    navigate("/login")
  }

  useEffect(() => {
    const token = window.localStorage.getItem("vocodex-jwt")
    const isAuthenticated = checkAuthentication(token)
    if (isAuthenticated) {
      dispatch(setIsLoggedIn(true))
    } else {
      dispatch(setIsLoggedIn(false))
    }
  }, [])

  useEffect(() => {
    const html = document.documentElement

    const localDarkMode = window.localStorage.getItem("dark-mode")

    if (localDarkMode === "false") {
      dispatch(setDarkMode(false))
    } else {
      dispatch(setDarkMode(true))
    }

    if (isDarkMode === true) {
      html.classList.add("dark")
    } else {
      html.classList.remove("dark")
    }
  }, [isDarkMode])

  return (
    <div className="flex flex-col min-h-screen min-w-screen">
      <nav className="p-4 border-b flex justify-center">
        <NavLink to="/" className={link}>
          VOCODEX
        </NavLink>
        <a className="me-4 cursor-pointer">{username}</a>
        {isLoggedIn ? (
          <a className="cursor-pointer" onClick={handleLogout}>
            Logout
          </a>
        ) : (
          <></>
        )}
        {isDarkMode ? (
          <MoonIcon
            className="size-6 cursor-pointer"
            onClick={() => {
              dispatch(setDarkMode(false))
              window.localStorage.setItem("dark-mode", "false")
            }}
          />
        ) : (
          <SunIcon
            className="size-6 cursor-pointer text-gray-500"
            onClick={() => {
              dispatch(setDarkMode(true))
              window.localStorage.setItem("dark-mode", "true")
            }}
          />
        )}
      </nav>
      <main className="flex flex-col flex-1 items-center justify-center p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
