import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { ComponentProps } from "react"
import userEvent from "@testing-library/user-event"
import { render, screen } from "./test-utils"
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

describe("PlayerControls voice select", () => {
  it("keeps the voice select compact instead of stretching", () => {
    renderControls()
    const input = screen.getByRole("combobox", { name: "Select Voice" })
    const root = input.closest(".md\\:order-1")

    expect(root).toHaveClass("w-32")
    expect(root).not.toHaveClass("flex-1")
    expect(root).not.toHaveClass("md:w-44")
  })
})

describe("PlayerControls text view switch", () => {
  it("is not shown for a text entry", () => {
    renderControls({ kind: "text" })

    expect(
      screen.queryByRole("button", { name: "Text view" })
    ).not.toBeInTheDocument()
  })

  it("shows an Aa icon for a PDF", () => {
    renderControls({ kind: "pdf", pdfView: "pdf" })

    expect(screen.getByRole("button", { name: "Text view" })).toHaveTextContent(
      "Aa"
    )
  })

  it("is not pressed while a PDF shows its pages", () => {
    renderControls({ kind: "pdf", pdfView: "pdf" })

    expect(
      screen.getByRole("button", { name: "Text view" })
    ).toHaveAttribute("aria-pressed", "false")
  })

  it("is pressed while a PDF is read as text", () => {
    renderControls({ kind: "pdf", pdfView: "text" })

    expect(
      screen.getByRole("button", { name: "Text view" })
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("switches the view of a PDF when clicked", async () => {
    const value = renderControls({ kind: "pdf", pdfView: "pdf" })

    await userEvent.click(screen.getByRole("button", { name: "Text view" }))

    expect(value.togglePdfView).toHaveBeenCalledTimes(1)
  })
})

describe("PlayerControls on mobile", () => {
  beforeEach(() => setScreenWidth(390))
  afterEach(resetScreenWidth)

  const openOptions = () =>
    userEvent.click(screen.getByRole("button", { name: "Player options" }))

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

describe("PlayerControls on desktop", () => {
  beforeEach(() => setScreenWidth(1280))
  afterEach(resetScreenWidth)

  it("shows every control without an options button", () => {
    renderControls({ kind: "pdf", pdfView: "pdf" })

    expect(
      screen.queryByRole("button", { name: "Player options" })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("combobox", { name: "Select Voice" })
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Text view" })).toBeInTheDocument()
  })
})
