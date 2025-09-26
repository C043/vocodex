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
import { motion, AnimatePresence } from "framer-motion"
import {
  Avatar,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger
} from "@heroui/react"

const Layout = () => {
  const isLoggedIn = useSelector(state => state.user.isLoggedIn)
  const username = useSelector(state => state.user.username)
  const isDarkMode = useSelector(state => state.darkMode.value)
  const dispatch = useDispatch()

  const darkBg = `
    radial-gradient(ellipse at 20% 30%, rgba(56, 189, 248, 0.4) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 70%, rgba(139, 92, 246, 0.3) 0%, transparent 70%),
    radial-gradient(ellipse at 60% 20%, rgba(236, 72, 153, 0.25) 0%, transparent 50%),
    radial-gradient(ellipse at 40% 80%, rgba(34, 197, 94, 0.2) 0%, transparent 65%)
  `

  // const lightBg = `
  // radial-gradient(circle at 50% 100%, rgba(253,224,71,.4) 0%, transparent 60%),
  // radial-gradient(circle at 50% 100%, rgba(251,191,36,.4) 0%, transparent 70%),
  // radial-gradient(circle at 50% 100%, rgba(244,114,182,.5) 0%, transparent 80%)
  // `
  const lightBg = `
    linear-gradient(135deg, #F8BBD9 0%, #FDD5B4 25%, #FFF2CC 50%, #E1F5FE 75%, #BBDEFB 100%)
  `

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
    <div className="min-h-screen bg-[#E4F4F8] dark:bg-black flex flex-col">
      <nav className="p-4 border-b">
        <div className="flex justify-between items-center container mx-auto">
          <NavLink to="/" className={link}>
            VOCODEX
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
      <main className="flex flex-1">
        <div
          className="min-w-screen relative"
          style={{
            backgroundImage: isDarkMode ? darkBg : lightBg,
            backgroundRepeat: "no-repeat"
          }}
        >
          <div className="flex flex-col flex-1 items-center justify-center p-6 container mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  )
}

export default Layout
