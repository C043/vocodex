import { useMediaQuery } from "./useMediaQuery"

// Phones and tablets, whatever their width or orientation
export const useIsTouch = () => useMediaQuery("(pointer: coarse)", false)
