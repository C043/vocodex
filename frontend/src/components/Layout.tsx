import { useEffect, useState } from "react"
import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"
import { useDispatch, useSelector } from "react-redux"
import {
  setIsLoggedInFalse,
  setIsLoggedInTrue
} from "../redux/reducer/authSlice"

const Layout = () => {
  const isLoggedIn = useSelector(state => state.isLoggedIn.value)
  const dispatch = useDispatch()

  const link = ({ isActive }: { isActive: boolean }) =>
    isActive ? "font-semibold mr-4" : "mr-4"

  const navigate = useNavigate()

  const handleLogout = () => {
    window.localStorage.removeItem("vocodex-jwt")
    dispatch(setIsLoggedInFalse())
    navigate("/login")
  }

  useEffect(() => {
    const token = window.localStorage.getItem("vocodex-jwt")
    const isAuthenticated = checkAuthentication(token)
    if (isAuthenticated) {
      dispatch(setIsLoggedInTrue())
    } else {
      dispatch(setIsLoggedInFalse())
    }
  }, [])

  return (
    <div className="flex flex-col min-h-screen min-w-screen">
      <nav className="p-4 border-b flex justify-center">
        <NavLink to="/" className={link}>
          VOCODEX
        </NavLink>
        {isLoggedIn ? (
          <a className="cursor-pointer" onClick={handleLogout}>
            Logout
          </a>
        ) : (
          <></>
        )}
      </nav>
      <main className="flex flex-col flex-1 items-center justify-center p-6">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
