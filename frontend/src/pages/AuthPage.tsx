import { jwtDecode } from "jwt-decode"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { checkAuthentication } from "../utils/authUtils"

type Mode = "login" | "register"

const AuthPage = ({ mode = "login" }: { mode?: Mode }) => {
  const env = import.meta.env

  const [isLogin, setLogin] = useState<Mode>(mode)
  const [hasError, setError] = useState(false)
  const [isLoading, setLoading] = useState(false)

  const navigate = useNavigate()

  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [registerUsername, setRegisterUsername] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerRepeatPassword, setRegisterRepeatPassword] = useState("")

  const handleLoginRequest = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
    try {
      setLoading(true)
      setError(false)

      const url = `${env.VITE_API_URL}/auth/login`
      const headers = {
        "Content-Type": "application/json"
      }
      const body = {
        username: loginUsername,
        password: loginPassword
      }
      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      })

      if (!resp.ok) {
        throw new Error(`There was an error: ${resp.status}`)
      }

      const data = await resp.json()
      const token = data.token

      window.localStorage.setItem("vocodex-jwt", token)
      navigate("/")
    } catch (err) {
      setError(true)
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  const checkPasswords = (target: HTMLInputElement) => {
    if (registerPassword !== target.value) {
      target.setCustomValidity("Password Must be Matching")
    } else if (registerPassword === target.value) {
      target.setCustomValidity("")
    }
  }
  const handleRegisterRequest = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()

    try {
      setLoading(true)
      setError(false)
      const url = `${env.VITE_API_URL}/auth/register`
      const headers = {
        "Content-Type": "application/json"
      }
      const body = {
        username: registerUsername,
        password: registerPassword
      }
      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      })
      if (!resp.ok) {
        throw new Error(`There was an error: ${resp.status}`)
      }
      const data = await resp.json()
      setLogin("login")
    } catch (err) {
      console.log(err)
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const refreshData = () => {
    setLoading(false)
    setError(false)

    setLoginUsername("")
    setLoginPassword("")

    setRegisterUsername("")
    setRegisterPassword("")
    setRegisterRepeatPassword("")
  }

  useEffect(() => {
    const token = window.localStorage.getItem("vocodex-jwt")
    const isAuthenticated = checkAuthentication(token)
    if (isAuthenticated) navigate("/")
  }, [])

  useEffect(() => {
    refreshData()
  }, [isLogin])

  return (
    <div>
      {isLogin === "login" ? (
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-5">Login</h1>
          {hasError ? <div>There was an error...</div> : <></>}
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <form
              className="flex flex-col gap-5 mb-5"
              onSubmit={handleLoginRequest}
            >
              <input
                type="text"
                className="border rounded-xl p-2"
                placeholder="Username"
                value={loginUsername}
                minLength={4}
                onChange={ev => setLoginUsername(ev.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="border rounded-xl p-2"
                minLength={4}
                value={loginPassword}
                onChange={ev => setLoginPassword(ev.target.value)}
                required
              />
              <button type="submit">Login!</button>
            </form>
          )}
          <button onClick={() => setLogin("register")}>Need an account?</button>
        </div>
      ) : (
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-5">Register</h1>
          {hasError ? <div>There was an error...</div> : <></>}
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <form
              className="flex flex-col gap-5 mb-5"
              onSubmit={handleRegisterRequest}
            >
              <input
                type="text"
                placeholder="Username"
                className="border rounded-xl p-2"
                minLength={4}
                value={registerUsername}
                onChange={ev => setRegisterUsername(ev.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="border rounded-xl p-2"
                minLength={4}
                value={registerPassword}
                onChange={ev => setRegisterPassword(ev.target.value)}
              />
              <input
                type="password"
                placeholder="Repeat Password"
                className="border rounded-xl p-2"
                minLength={4}
                value={registerRepeatPassword}
                onChange={ev => {
                  setRegisterRepeatPassword(ev.target.value)
                  checkPasswords(ev.target)
                }}
              />
              <button type="submit">Register!</button>
            </form>
          )}
          <button onClick={() => setLogin("login")}>
            Already have an account?
          </button>
        </div>
      )}
    </div>
  )
}

export default AuthPage
