import { FormEvent, useEffect, useState } from "react"
import { Form, Input, Spinner } from "@heroui/react"
import { addToast, Button } from "@heroui/react"
import { useNavigate } from "react-router-dom"
import { checkAuthentication, parseJwt } from "../utils/authUtils"
import { useDispatch } from "react-redux"
import {
  setIsLoggedIn,
  setUserId,
  setUsername,
  setUserPreferences
} from "../redux/reducer/authSlice"

type Mode = "login" | "register"

type UserPreferences = {
  speed: string
  voice: string
}

const AuthPage = ({ mode = "login" }: { mode?: Mode }) => {
  const env = import.meta.env

  const [isLogin, setLogin] = useState<Mode>(mode)
  const [hasError, setError] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})
  const [isLoading, setLoading] = useState(false)

  const navigate = useNavigate()
  const dispatch = useDispatch()

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

      const { sub, username, preferences } = parseJwt(token)

      dispatch(setUserId(sub))
      dispatch(setUsername(username))
      dispatch(setUserPreferences(preferences))

      window.localStorage.setItem("vocodex-jwt", token)
      navigate("/")
    } catch (err) {
      setError(true)
      addToast({
        title: "There was an error.",
        description: "Check the credentials and try again.",
        color: "danger"
      })
      refreshData()
      console.log(err)
    } finally {
      setLoading(false)
    }
  }

  const handleRegisterRequest = async (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()

    const data = Object.fromEntries(new FormData(ev.currentTarget))

    if (data.password !== data.repeatPassword) {
      setValidationErrors({ repeatPassword: "Passwords must match" })
      return
    }

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
        const data = await resp.json().catch(() => null)
        const detail = data?.detail ?? `HTTP ${resp.status}`
        const error = new Error(detail)
        ;(error as any).status = resp.status
        throw error
      }
      await resp.json()
      setLogin("login")
    } catch (err) {
      setError(true)
      let errors = {}
      if (err instanceof Error && (err as any).status === 409) {
        errors = {
          username: "Sorry, this username is already taken."
        }
      }
      setValidationErrors(errors)
      addToast({
        title: "There was an error.",
        description: "Please try again later.",
        color: "danger"
      })
      console.log(err)
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
    if (isAuthenticated && token) {
      const { sub, username } = parseJwt(token)
      dispatch(setUsername(username))
      dispatch(setUserId(sub))
      dispatch(setIsLoggedIn(true))
      navigate("/")
    } else {
      dispatch(setIsLoggedIn(false))
    }
  }, [])

  useEffect(() => {
    refreshData()
  }, [isLogin])

  const inputClassNames = {
    inputWrapper:
      "bg-foreground/5 data-[hover=true]:bg-foreground/10 group-data-[focus=true]:bg-foreground/10"
  }

  const submitClass =
    "w-full bg-brand font-semibold shadow-lg shadow-violet-500/30 mt-2"

  const switchLink =
    "w-full text-center text-sm text-foreground/60 hover:text-foreground transition-colors cursor-pointer mt-1"

  return (
    <div className="min-h-[calc(100dvh-10rem)] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            {isLogin === "login" ? "Welcome back" : "Create account"}
          </h1>
          <p className="text-foreground/60 mt-1">
            {isLogin === "login"
              ? "Sign in to keep listening."
              : "Turn any text into audio in seconds."}
          </p>
        </div>

        <div className="glass rounded-3xl p-6 md:p-8">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner color="primary" size="lg" />
            </div>
          ) : isLogin === "login" ? (
            <Form onSubmit={handleLoginRequest} className="gap-4">
              <Input
                label="Username"
                placeholder="Enter your username"
                name="loginUsername"
                autoComplete="username"
                value={loginUsername}
                minLength={4}
                classNames={inputClassNames}
                onChange={ev => setLoginUsername(ev.target.value)}
                isRequired
              />
              <Input
                label="Password"
                type="password"
                name="loginPassword"
                autoComplete="current-password"
                placeholder="Enter your password"
                minLength={4}
                value={loginPassword}
                classNames={inputClassNames}
                onChange={ev => setLoginPassword(ev.target.value)}
                isRequired
              />
              <Button
                className={submitClass}
                color="primary"
                size="lg"
                type="submit"
              >
                Login
              </Button>
              <button
                type="button"
                className={switchLink}
                onClick={() => setLogin("register")}
              >
                Need an account?{" "}
                <span className="font-semibold text-primary">Sign up</span>
              </button>
            </Form>
          ) : (
            <Form
              validationErrors={validationErrors}
              onSubmit={handleRegisterRequest}
              className="gap-4"
            >
              <Input
                label="Username"
                labelPlacement="inside"
                name="username"
                autoComplete="username"
                placeholder="Enter your username"
                minLength={4}
                value={registerUsername}
                classNames={inputClassNames}
                onChange={ev => setRegisterUsername(ev.target.value)}
                isRequired
              />
              <Input
                label="Password"
                labelPlacement="inside"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Enter your password"
                minLength={4}
                value={registerPassword}
                classNames={inputClassNames}
                onChange={ev => setRegisterPassword(ev.target.value)}
                isRequired
              />
              <Input
                label="Repeat Password"
                labelPlacement="inside"
                name="repeatPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat Password"
                minLength={4}
                value={registerRepeatPassword}
                classNames={inputClassNames}
                onChange={ev => {
                  setRegisterRepeatPassword(ev.target.value)
                }}
                isRequired
              />
              <Button
                className={submitClass}
                color="primary"
                size="lg"
                type="submit"
              >
                Register
              </Button>
              <button
                type="button"
                className={switchLink}
                onClick={() => setLogin("login")}
              >
                Already have an account?{" "}
                <span className="font-semibold text-primary">Sign in</span>
              </button>
            </Form>
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthPage
