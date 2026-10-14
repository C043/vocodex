import { useEffect, useState } from "react"

// Tailwind's md breakpoint
const QUERY = "(min-width: 768px)"

// Without media queries (old browsers, tests) the full layout is the safe bet
const matches = () => window.matchMedia?.(QUERY).matches ?? true

export const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(matches)

  useEffect(() => {
    const media = window.matchMedia?.(QUERY)
    if (!media) return
    const onChange = () => setIsDesktop(media.matches)
    media.addEventListener("change", onChange)
    return () => media.removeEventListener("change", onChange)
  }, [])

  return isDesktop
}
