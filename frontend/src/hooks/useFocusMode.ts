import { useEffect } from "react"
import { useDispatch, useSelector } from "react-redux"
import {
  hideChrome,
  resetFocusMode,
  showChrome
} from "../redux/reducer/focusModeSlice"

// How long the mouse must rest before focus mode hides the chrome again
export const FOCUS_IDLE_MS = 5000

type State = { focusMode: { isEnabled: boolean } }

// While focus mode is on, moving the mouse (or touching the screen) shows the
// top bar and controls until the pointer rests for a while
export const useFocusMode = () => {
  const isEnabled = useSelector((state: State) => state.focusMode.isEnabled)
  const dispatch = useDispatch()

  useEffect(() => {
    if (!isEnabled) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const reveal = () => {
      dispatch(showChrome())
      clearTimeout(timer)
      timer = setTimeout(() => dispatch(hideChrome()), FOCUS_IDLE_MS)
    }
    window.addEventListener("mousemove", reveal, { passive: true })
    window.addEventListener("touchstart", reveal, { passive: true })
    return () => {
      clearTimeout(timer)
      window.removeEventListener("mousemove", reveal)
      window.removeEventListener("touchstart", reveal)
    }
  }, [isEnabled, dispatch])

  // Leaving the player brings the top bar back
  useEffect(() => () => void dispatch(resetFocusMode()), [dispatch])
}
