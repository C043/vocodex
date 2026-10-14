import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { ComponentProps } from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, fireEvent } from "./test-utils"
import { PlayerControls } from "../src/components/player/PlayerControls"
import { PlayerContext } from "../src/contexts/PlayerContext"
import { setScreenWidth, resetScreenWidth } from "./mediaQuery"

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
    togglePdfView: vi.fn(),
    currentFont: "literata",
    setFont: vi.fn(),
    ...overrides
  } as PlayerValue
  render(
    <PlayerContext.Provider value={value}>
      <PlayerControls />
    </PlayerContext.Provider>
  )
  return value
}

// The voice, speed and view settings live in the options
const openOptions = () =>
  userEvent.click(screen.getByRole("button", { name: "Player options" }))

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
    await openOptions()
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

describe("PlayerControls text view switch", () => {
  it("is not shown for a text entry", () => {
    renderControls({ kind: "text" })

    expect(
      screen.queryByRole("button", { name: "Text view" })
    ).not.toBeInTheDocument()
  })

  it("shows an Aa icon for a PDF", async () => {
    renderControls({ kind: "pdf", pdfView: "pdf" })
    await openOptions()

    expect(screen.getByRole("button", { name: "Text view" })).toHaveTextContent(
      "Aa"
    )
  })

  it("is not pressed while a PDF shows its pages", async () => {
    renderControls({ kind: "pdf", pdfView: "pdf" })
    await openOptions()

    expect(
      screen.getByRole("button", { name: "Text view" })
    ).toHaveAttribute("aria-pressed", "false")
  })

  it("is pressed while a PDF is read as text", async () => {
    renderControls({ kind: "pdf", pdfView: "text" })
    await openOptions()

    expect(
      screen.getByRole("button", { name: "Text view" })
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("switches the view of a PDF when clicked", async () => {
    const value = renderControls({ kind: "pdf", pdfView: "pdf" })
    await openOptions()

    await userEvent.click(screen.getByRole("button", { name: "Text view" }))

    expect(value.togglePdfView).toHaveBeenCalledTimes(1)
  })
})

// Desktop has the same commands and options as mobile, in a floating card
describe.each([
  ["mobile", 390],
  ["desktop", 1280]
])("PlayerControls on %s", (_, width) => {
  beforeEach(() => setScreenWidth(width))
  afterEach(resetScreenWidth)

  it("keeps only the playback commands in the bar", () => {
    renderControls({ kind: "pdf", pdfView: "pdf" })

    expect(screen.getByRole("button", { name: "Play" })).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Player options" })
    ).toHaveAttribute("aria-expanded", "false")
    expect(
      screen.queryByRole("combobox", { name: "Select Voice" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Text view" })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Zoom in" })
    ).not.toBeInTheDocument()
  })

  it("toggles auto scroll from the bar", async () => {
    const value = renderControls({ isAutoScroll: true, toggleAutoScroll: vi.fn() })
    const button = screen.getByRole("button", { name: "Auto scroll" })

    expect(button).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(button)
    expect(value.toggleAutoScroll).toHaveBeenCalledTimes(1)
  })

  it("shows voice, speed, zoom and text view in the options", async () => {
    const value = renderControls({
      kind: "pdf",
      pdfView: "pdf",
      handleFontSizeUp: vi.fn(),
      handleFontSizeDown: vi.fn()
    })
    await openOptions()

    expect(
      screen.getByRole("button", { name: "Player options" })
    ).toHaveAttribute("aria-expanded", "true")
    expect(
      screen.getByRole("combobox", { name: "Select Voice" })
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Select Speed")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    await userEvent.click(screen.getByRole("button", { name: "Zoom out" }))
    await userEvent.click(screen.getByRole("button", { name: "Text view" }))

    expect(value.handleFontSizeUp).toHaveBeenCalledTimes(1)
    expect(value.handleFontSizeDown).toHaveBeenCalledTimes(1)
    expect(value.togglePdfView).toHaveBeenCalledTimes(1)
  })

  it("shows the font size buttons for a text entry", async () => {
    renderControls({ kind: "text" })
    await openOptions()

    expect(
      screen.getByRole("button", { name: "Increase font size" })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Text view" })
    ).not.toBeInTheDocument()
  })
})

describe("PlayerControls font select", () => {
  const fontSelect = () => screen.queryByRole("button", { name: /Select Font/ })
  afterEach(resetScreenWidth)

  it("is shown in the desktop options for a text entry", async () => {
    setScreenWidth(1280)
    renderControls({ kind: "text" })
    await openOptions()

    expect(fontSelect()).toBeInTheDocument()
  })

  it("is shown in the mobile options for a PDF read as text", async () => {
    setScreenWidth(390)
    renderControls({ kind: "pdf", pdfView: "text" })
    await openOptions()

    expect(fontSelect()).toBeInTheDocument()
  })

  it("is hidden while a PDF shows its pages", async () => {
    setScreenWidth(390)
    renderControls({ kind: "pdf", pdfView: "pdf" })
    await openOptions()

    expect(fontSelect()).not.toBeInTheDocument()
  })
})

describe("PlayerControls speed select", () => {
  afterEach(resetScreenWidth)

  it("keeps the current speed when it is picked again", async () => {
    setScreenWidth(390)
    const value = renderControls({
      speedOptions: [
        { key: "+0%", label: "1x" },
        { key: "+50%", label: "1.5x" }
      ]
    })
    await userEvent.click(screen.getByRole("button", { name: "Player options" }))
    const trigger = screen.getByRole("button", { name: /Select Speed/ })
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByRole("option", { name: "1x" }))

    expect(value.setSpeed).not.toHaveBeenCalledWith(undefined)
    expect(trigger).toHaveTextContent("1x")
  })
})

describe("PlayerControls selects while auto scrolling", () => {
  beforeEach(() => setScreenWidth(1280))
  afterEach(resetScreenWidth)

  it("keeps the voice list open", async () => {
    renderControls()
    const input = screen.getByRole("combobox", { name: "Select Voice" })
    await userEvent.click(input)
    expect(input).toHaveAttribute("aria-expanded", "true")

    fireEvent.scroll(document)

    expect(input).toHaveAttribute("aria-expanded", "true")
  })

  it("keeps the speed list open", async () => {
    renderControls()
    const trigger = screen.getByRole("button", { name: /Select Speed/ })
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute("aria-expanded", "true")

    fireEvent.scroll(document)

    expect(trigger).toHaveAttribute("aria-expanded", "true")
  })
})
