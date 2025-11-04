import { useEffect } from "react"
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom"
import { checkAuthentication, parseJwt } from "../utils/authUtils"
import { useDispatch, useSelector } from "react-redux"
import {
  setIsLoggedIn,
  setUserId,
  setUsername,
  setUserPreferences
} from "../redux/reducer/authSlice"
import { setDarkMode } from "../redux/reducer/themeModeSlice"
import { ArrowLeftIcon, MoonIcon, SunIcon } from "@heroicons/react/24/solid"
import { motion, AnimatePresence } from "framer-motion"
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger
} from "@heroui/react"

type State = {
  user: {
    isLoggedIn: boolean
    username: String
  }
  darkMode: {
    value: boolean
  }
}

const Layout = () => {
  const isLoggedIn = useSelector((state: State) => state.user.isLoggedIn)
  const username = useSelector((state: State) => state.user.username)
  const isDarkMode = useSelector((state: State) => state.darkMode.value)
  const dispatch = useDispatch()

  const darkBg = `
    radial-gradient(ellipse at 20% 30%, rgba(56, 189, 248, 0.4) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 70%),
    radial-gradient(ellipse at 60% 20%, rgba(236, 72, 153, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse at 40% 80%, rgba(34, 197, 94, 0.2) 0%, transparent 65%)
  `

  const lightBg = `
    linear-gradient(135deg, #F8BBD9 0%, #FDD5B4 25%, #FFF2CC 50%, #E1F5FE 75%, #BBDEFB 100%)
  `

  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "font-semibold mr-4" : "mr-4"

  const navigate = useNavigate()
  const location = useLocation()
  const isPlayer = location.pathname.includes("/player/")

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
    if (isAuthenticated && token) {
      const { username, preferences } = parseJwt(token)
      dispatch(setIsLoggedIn(true))
      dispatch(setUsername(username))
      dispatch(setUserPreferences(preferences))
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
    <div className="min-h-screen bg-[#E4F4F8] dark:bg-black flex flex-col">
      <nav className="fixed top-0 left-0 right-0 z-50 p-4 border-b h-[75px] flex bg-[#E4F4F8] dark:bg-black">
        <div className="flex justify-between items-center container mx-auto">
          <NavLink to="/" className={link}>
            <div className="flex gap-2 items-center">
              {isPlayer ? (
                <ArrowLeftIcon className="size-6 cursor-pointer" />
              ) : (
                ""
              )}
              <img src="/VOCODEX.png" className="me-1 w-10 h-auto" />
              VOCODEX
            </div>
          </NavLink>

          <div className="flex items-center gap-5">
            <div className="w-6 h-6 overflow-hidden cursor-pointer">
              <AnimatePresence mode="popLayout">
                {isDarkMode ? (
                  <motion.div
                    key="moon"
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      dispatch(setDarkMode(false))
                      window.localStorage.setItem("dark-mode", "false")
                    }}
                  >
                    <MoonIcon className="size-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key={"sun"}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 20, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => {
                      dispatch(setDarkMode(true))
                      window.localStorage.setItem("dark-mode", "true")
                    }}
                  >
                    <SunIcon className="size-6 cursor-pointer text-gray-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {isLoggedIn ? (
              <>
                <Dropdown>
                  <DropdownTrigger className="cursor-pointer">
                    <Avatar
                      src={`https://ui-avatars.com/api/?name=${username}`}
                    />
                  </DropdownTrigger>
                  <DropdownMenu>
                    <DropdownItem key={"logout"} onClick={handleLogout}>
                      <a className="cursor-pointer">Logout</a>
                    </DropdownItem>
                  </DropdownMenu>
                </Dropdown>
              </>
            ) : (
              <></>
            )}
          </div>
        </div>
      </nav>
      <main className="flex flex-1 pt-[75px]">
        <div
          className="w-full relative"
          style={{
            backgroundImage: isDarkMode ? darkBg : lightBg,
            backgroundRepeat: "no-repeat"
          }}
        >
          <div className="pt-6 container mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Layout
