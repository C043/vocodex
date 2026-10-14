import { describe, it, expect } from "vitest"
import focusModeReducer, {
  hideChrome,
  resetFocusMode,
  showChrome,
  toggleFocusMode
} from "../src/redux/reducer/focusModeSlice"

const off = { isEnabled: false, isChromeHidden: false }
const on = { isEnabled: true, isChromeHidden: false }

describe("focusModeSlice", () => {
  it("starts off with the chrome shown", () => {
    expect(focusModeReducer(undefined, { type: "init" })).toEqual(off)
  })

  it("hides the chrome right away when turned on", () => {
    expect(focusModeReducer(off, toggleFocusMode())).toEqual({
      isEnabled: true,
      isChromeHidden: true
    })
  })

  it("shows the chrome again when turned off", () => {
    const hidden = { isEnabled: true, isChromeHidden: true }
    expect(focusModeReducer(hidden, toggleFocusMode())).toEqual(off)
  })

  it("shows and hides the chrome while on", () => {
    const hidden = focusModeReducer(on, hideChrome())
    expect(hidden.isChromeHidden).toBe(true)
    expect(focusModeReducer(hidden, showChrome()).isChromeHidden).toBe(false)
  })

  it("never hides the chrome while off", () => {
    expect(focusModeReducer(off, hideChrome())).toEqual(off)
  })

  it("resets to off", () => {
    const hidden = { isEnabled: true, isChromeHidden: true }
    expect(focusModeReducer(hidden, resetFocusMode())).toEqual(off)
  })
})
