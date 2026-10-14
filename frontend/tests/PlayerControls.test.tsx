import { describe, it, expect, vi } from "vitest"
import type { ComponentProps } from "react"
import userEvent from "@testing-library/user-event"
import { render, screen } from "./test-utils"
import { PlayerControls } from "../src/components/player/PlayerControls"
import { PlayerContext } from "../src/contexts/PlayerContext"

type PlayerValue = NonNullable<
  ComponentProps<typeof PlayerContext.Provider>["value"]
>

const renderControls = (overrides: Partial<PlayerValue> = {}) => {
  const value = {
    isPlaying: false,
    isLoading: false,
    handlePlay: vi.fn(),
    handlePause: vi.fn(),
    handleForward: vi.fn(),
    handleBackwards: vi.fn(),
    setVoice: vi.fn(),
    setSpeed: vi.fn(),
    currentVoice: "",
    currentSpeed: "+0%",
    voiceOptions: [
      {
        key: "en-GB-LibbyNeural",
        name: "Libby",
        locale: "en-GB",
        language: "English (United Kingdom)"
      }
    ],
    speedOptions: [{ key: "+0%", label: "1x" }],
    audioRef: { current: null },
    kind: "text",
    currentIndex: -1,
    sentencesMap: new Map(),
    pdf: { numPages: 0, pages: new Map() },
    ...overrides
  } as PlayerValue
  render(
    <PlayerContext.Provider value={value}>
      <PlayerControls />
    </PlayerContext.Provider>
  )
  return value
}

describe("PlayerControls keyboard shortcuts", () => {
  it("toggles play with space outside text fields", async () => {
    const value = renderControls()
    await userEvent.keyboard(" ")

    expect(value.handlePlay).toHaveBeenCalled()
  })

  it("skips sentences with the arrow keys outside text fields", async () => {
    const value = renderControls()
    await userEvent.keyboard("{ArrowRight}{ArrowLeft}")

    expect(value.handleForward).toHaveBeenCalled()
    expect(value.handleBackwards).toHaveBeenCalled()
  })

  it("lets the voice search receive spaces and arrows", async () => {
    const value = renderControls()
    const input = screen.getByRole("combobox", { name: "Select Voice" })

    await userEvent.clear(input)
    await userEvent.type(input, "english (united{ArrowLeft}{ArrowRight}")

    expect(input).toHaveValue("english (united")
    expect(value.handlePlay).not.toHaveBeenCalled()
    expect(value.handlePause).not.toHaveBeenCalled()
    expect(value.handleForward).not.toHaveBeenCalled()
    expect(value.handleBackwards).not.toHaveBeenCalled()
  })
})

describe("PlayerControls reading progress", () => {
  it("shows the progress bar above the commands", () => {
    renderControls()
    const bar = screen.getByRole("progressbar", { name: "Reading progress" })
    const play = screen.getByRole("button", { name: "Play" })

    expect(
      bar.compareDocumentPosition(play) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
    expect(screen.getByLabelText("Time read")).toHaveTextContent("0:00")
    expect(screen.getByLabelText("Time left")).toHaveTextContent("-0:00")
  })
})
