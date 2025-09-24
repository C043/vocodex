import { FormEvent, useEffect, useState } from "react"
import { Form, Input, Spinner } from "@heroui/react"
import { addToast, Button } from "@heroui/react"
import { useNavigate } from "react-router-dom"
import { checkAuthentication, parseJwt } from "../utils/authUtils"
import { useDispatch } from "react-redux"
import {
  setIsLoggedIn,
  setUserId,
  setUsername
} from "../redux/reducer/authSlice"

type Mode = "login" | "register"

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

      const { sub, username } = parseJwt(token)

      dispatch(setUserId(sub))
      dispatch(setUsername(username))

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
      if (err.status === 409) {
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

  return (
    <div className="bg-gray-600 border border-white p-10 rounded-2xl">
      {isLogin === "login" ? (
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-5">Login</h1>
          {isLoading ? (
            <div className="flex justify-center mb-5">
              <Spinner color="default" size="lg" />
            </div>
          ) : (
            <Form onSubmit={handleLoginRequest}>
              <Input
                label="Username"
                placeholder="Enter your username"
                name="loginUsername"
                value={loginUsername}
                minLength={4}
                onChange={ev => setLoginUsername(ev.target.value)}
                isRequired
              />
              <Input
                label="Password"
                type="password"
                name="loginPassword"
                placeholder="Enter your password"
                minLength={4}
                value={loginPassword}
                onChange={ev => setLoginPassword(ev.target.value)}
                isRequired
              />
              <div>
                <Button className="me-5" type="submit">
                  Login!
                </Button>
                <a
                  className="cursor-pointer"
                  onClick={() => setLogin("register")}
                >
                  Need an account?
                </a>
              </div>
            </Form>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold mb-5">Register</h1>
          {isLoading ? (
            <div className="flex justify-center mb-5">
              <Spinner color="default" size="lg" />
            </div>
          ) : (
            <Form
              validationErrors={validationErrors}
              onSubmit={handleRegisterRequest}
            >
              <Input
                label="Username"
                labelPlacement="inside"
                name="username"
                placeholder="Enter your username"
                minLength={4}
                value={registerUsername}
                onChange={ev => setRegisterUsername(ev.target.value)}
                isRequired
              />
              <Input
                label="Password"
                labelPlacement="inside"
                name="password"
                type="password"
                placeholder="Enter your password"
                minLength={4}
                value={registerPassword}
                onChange={ev => setRegisterPassword(ev.target.value)}
                isRequired
              />
              <Input
                label="Repeat Password"
                labelPlacement="inside"
                name="repeatPassword"
                type="password"
                placeholder="Repeat Password"
                minLength={4}
                value={registerRepeatPassword}
                onChange={ev => {
                  setRegisterRepeatPassword(ev.target.value)
                }}
                isRequired
              />
              <div>
                <Button className="me-5" type="submit">
                  Register!
                </Button>
                <a className="cursor-pointer" onClick={() => setLogin("login")}>
                  Already have an account?
                </a>
              </div>
            </Form>
          )}
        </div>
      )}
    </div>
  )
}

export default AuthPage
