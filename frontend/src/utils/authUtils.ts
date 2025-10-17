import { jwtDecode } from "jwt-decode"

interface MyJwtPayload {
  sub: number
  username: string
  iat: number
  exp: number
}

export const checkAuthentication = (token: string | null) => {
  if (!token) return false

  try {
    const { exp } = jwtDecode<MyJwtPayload>(token)
    const now = Date.now() / 1000
    if (exp) {
      if (exp > now === true) {
        return true
      }
    } else {
      throw new Error("Failed to decode jwt.")
    }
  } catch {
    console.log("Failed to decode jwt.")
    return false
  }
}

export const parseJwt = (token: string): MyJwtPayload => {
  const { sub, username, iat, exp } = jwtDecode<MyJwtPayload>(token)
  return {
    sub,
    username,
    iat,
    exp
  }
}
