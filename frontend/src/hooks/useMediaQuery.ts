import { useEffect, useState } from "react"

// Without media queries (old browsers, tests) `fallback` is used
export const useMediaQuery = (query: string, fallback: boolean) => {
  const [matches, setMatches] = useState(
    () => window.matchMedia?.(query).matches ?? fallback
  )

  useEffect(() => {
    const media = window.matchMedia?.(query)
    if (!media) return
    const onChange = () => setMatches(media.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [query])

  return matches
}
