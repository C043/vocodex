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
import {
  ArrowLeftIcon,
  ArrowRightStartOnRectangleIcon,
  BookOpenIcon,
  MoonIcon,
  SunIcon
} from "@heroicons/react/24/solid"
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
    username: string
  }
  darkMode: {
    value: boolean
  }
  focusMode: {
    isChromeHidden: boolean
  }
}

const Layout = () => {
  const isLoggedIn = useSelector((state: State) => state.user.isLoggedIn)
  const username = useSelector((state: State) => state.user.username)
  const isDarkMode = useSelector((state: State) => state.darkMode.value)
  const dispatch = useDispatch()

  const navigate = useNavigate()
  const location = useLocation()
  const isPlayer = location.pathname.includes("/player/")
  // The player's focus mode hides the top bar along with its controls
  const isChromeHidden = useSelector(
    (state: State) => state.focusMode.isChromeHidden
  )
  const isTopBarHidden = isPlayer && isChromeHidden

  const env = import.meta.env
  const token = window.localStorage.getItem("vocodex-jwt")
  const fetchPreferences = async () => {
    try {
      const url = `${env.VITE_API_URL}/me/preferences`
      const headers = {
        Authorization: `Bearer ${token}`
      }
      const resp = await fetch(url, { headers })

      if (!resp.ok) throw new Error("Failed to retrieve user preferences")

      const data = await resp.json()

      dispatch(setUserPreferences(data))
    } catch (err) {
      console.error(err)
    }
  }

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
      // The token's copy can be stale: the saved preferences replace it
      fetchPreferences()
    } else {
      dispatch(setIsLoggedIn(false))
      handleLogout()
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

    // Tints the mobile browser / installed app status bar
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", isDarkMode ? "#07060D" : "#F6F5FB")
  }, [isDarkMode])

  const toggleDarkMode = () => {
    dispatch(setDarkMode(!isDarkMode))
    window.localStorage.setItem("dark-mode", String(!isDarkMode))
  }

  const themeToggle = (
    <button
      type="button"
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggleDarkMode}
      className="grid place-items-center size-10 rounded-full overflow-hidden text-foreground/70 hover:text-foreground hover:bg-foreground/5 transition-colors"
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={isDarkMode ? "moon" : "sun"}
          initial={{ y: -16, opacity: 0, rotate: -45 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          exit={{ y: 16, opacity: 0, rotate: 45 }}
          transition={{ duration: 0.25 }}
        >
          {isDarkMode ? (
            <MoonIcon className="size-5" />
          ) : (
            <SunIcon className="size-5 text-amber-500" />
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  )

  const accountMenu = (
    <Dropdown placement="bottom-end">
      <DropdownTrigger className="cursor-pointer">
        <Avatar
          size="sm"
          isBordered
          color="primary"
          src={`https://ui-avatars.com/api/?name=${username}&background=7c5cff&color=fff`}
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="Account" disabledKeys={["user"]}>
        <DropdownItem
          key="user"
          className="opacity-100"
          textValue={`Signed in as ${username}`}
        >
          <p className="text-xs text-foreground/50">Signed in as</p>
          <p className="font-semibold">{username}</p>
        </DropdownItem>
        <DropdownItem
          key={"logout"}
          color="danger"
          className="text-danger"
          startContent={<ArrowRightStartOnRectangleIcon className="size-4" />}
          onClick={handleLogout}
        >
          Logout
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  )

  // On mobile the player docks its own controls at the bottom
  const showTabBar = isLoggedIn && !isPlayer

  return (
    <div className="isolate min-h-dvh flex flex-col text-foreground">
      <div
        aria-hidden
        className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      >
        <div className="aurora-blob -top-40 -left-32 size-[32rem] bg-violet-500/35 dark:bg-violet-600/30" />
        <div
          className="aurora-blob top-1/3 -right-40 size-[28rem] bg-sky-400/30 dark:bg-sky-500/20"
          style={{ animationDelay: "-6s" }}
        />
        <div
          className="aurora-blob -bottom-40 left-1/4 size-[30rem] bg-pink-400/25 dark:bg-fuchsia-600/15"
          style={{ animationDelay: "-12s" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(rgba(127,127,127,0.14)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />
      </div>

      <nav
        aria-hidden={isTopBarHidden || undefined}
        inert={isTopBarHidden}
        className={`fixed top-0 inset-x-0 z-50 safe-top glass !border-x-0 !border-t-0 !shadow-none transition duration-300 ${isTopBarHidden ? "-translate-y-full opacity-0" : ""}`}
      >
        <div className="container mx-auto px-4 h-14 md:h-16 flex justify-between items-center">
          <NavLink
            to="/"
            className="flex gap-2.5 items-center font-extrabold tracking-[0.18em] text-sm md:text-base"
          >
            {isPlayer && (
              <span className="grid place-items-center size-9 -ml-1 rounded-full hover:bg-foreground/5 transition-colors">
                <ArrowLeftIcon className="size-5" />
              </span>
            )}
            <span className="text-gradient">VOCODEX</span>
          </NavLink>

          <div
            className={`items-center gap-3 ${showTabBar ? "hidden md:flex" : "flex"}`}
          >
            {themeToggle}
            {isLoggedIn && accountMenu}
          </div>
        </div>
      </nav>

      <main
        className={`flex-1 pt-[calc(env(safe-area-inset-top)+3.5rem)] md:pt-16 ${
          showTabBar
            ? "pb-[calc(env(safe-area-inset-bottom)+5.5rem)] md:pb-10"
            : "pb-10"
        }`}
      >
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="container mx-auto px-4 pt-6 md:pt-10"
        >
          <Outlet />
        </motion.div>
      </main>

      {showTabBar && (
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-50 glass !border-x-0 !border-b-0 safe-bottom">
          <div className="grid grid-cols-3 h-16">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold transition-colors ${
                  isActive ? "text-primary" : "text-foreground/60"
                }`
              }
            >
              <BookOpenIcon className="size-6" />
              Library
            </NavLink>
            <div className="flex items-center justify-center">
              {themeToggle}
            </div>
            <div className="flex items-center justify-center">
              {accountMenu}
            </div>
          </div>
        </nav>
      )}
    </div>
  )
}

export default Layout
