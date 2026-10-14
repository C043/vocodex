import { describe, it, expect } from "vitest"
import authReducer, { setUserPreferences } from "../src/redux/reducer/authSlice"

const initial = () => authReducer(undefined, { type: "init" })

describe("user preferences", () => {
  it("start with no saved zoom", () => {
    expect(initial().preferences.zoom).toEqual({})
  })

  it("keep the zoom of each mode apart", () => {
    let state = authReducer(
      initial(),
      setUserPreferences({ zoom: { text: 3 } })
    )
    state = authReducer(state, setUserPreferences({ zoom: { pdf: 2 } }))

    expect(state.preferences.zoom).toEqual({ text: 3, pdf: 2 })
  })

  it("keep the zoom when speed and voice change", () => {
    let state = authReducer(initial(), setUserPreferences({ zoom: { pdf: 4 } }))
    state = authReducer(
      state,
      setUserPreferences({
        speed: "+50%",
        voice: "en-GB-AdaMultilingualNeural"
      })
    )

    expect(state.preferences).toEqual({
      speed: "+50%",
      voice: "en-GB-AdaMultilingualNeural",
      zoom: { pdf: 4 }
    })
  })

  it("keep speed and voice when the zoom changes", () => {
    let state = authReducer(
      initial(),
      setUserPreferences({ speed: "+50%", voice: "a-voice" })
    )
    state = authReducer(state, setUserPreferences({ zoom: { text: 2 } }))

    expect(state.preferences).toMatchObject({
      speed: "+50%",
      voice: "a-voice"
    })
  })
})
