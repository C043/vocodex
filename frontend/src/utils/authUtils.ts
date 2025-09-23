import { jwtDecode } from "jwt-decode"

export const checkAuthentication = (token: string | null) => {
  if (!token) return false

  try {
    const { exp } = jwtDecode(token)
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
