import { useMediaQuery } from "./useMediaQuery"

// Tailwind's md breakpoint. Without media queries the full layout is the safe bet
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)", true)
