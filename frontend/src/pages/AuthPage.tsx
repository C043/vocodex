import { FormEvent, useEffect, useState } from "react"

type Mode = "login" | "register"

const AuthPage = ({ mode = "login" }: { mode?: Mode }) => {
  const [isLogin, setLogin] = useState<Mode>(mode)

  const [loginUsername, setLoginUsername] = useState("")
  const [loginPassword, setLoginPassword] = useState("")

  const [registerUsername, setRegisterUsername] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerRepeatPassword, setRegisterRepeatPassword] = useState("")

  const handleLoginRequest = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
  }

  const handleRegisterRequest = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault()
  }

  const refreshData = () => {
    setLoginUsername("")
    setLoginPassword("")

    setRegisterUsername("")
    setRegisterPassword("")
    setRegisterRepeatPassword("")
  }

  useEffect(() => {
    refreshData()
  }, [isLogin])

  return (
    <div>
      {isLogin === "login" ? (
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Login</h1>
          <form onSubmit={handleLoginRequest}>
            <input
              type="text"
              placeholder="Username"
              value={loginUsername}
              onChange={ev => setLoginUsername(ev.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={ev => setLoginPassword(ev.target.value)}
              required
            />
            <button type="submit">Login!</button>
          </form>
          <button onClick={() => setLogin("register")}>Need an account?</button>
        </div>
      ) : (
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">Register</h1>
          <form onSubmit={handleRegisterRequest}>
            <input
              type="text"
              placeholder="Username"
              value={registerUsername}
              onChange={ev => setRegisterUsername(ev.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={registerPassword}
              onChange={ev => setRegisterPassword(ev.target.value)}
            />
            <input
              type="password"
              placeholder="Repeat Password"
              value={registerRepeatPassword}
              onChange={ev => setRegisterRepeatPassword(ev.target.value)}
            />
            <button type="submit">Register!</button>
          </form>
          <button onClick={() => setLogin("login")}>
            Already have an account?
          </button>
        </div>
      )}
    </div>
  )
}

export default AuthPage
