import { describe, it, expect, vi } from "vitest"
import type { ComponentProps } from "react"
import { render, screen, fireEvent } from "./test-utils"
import FontSizeControls from "../src/components/player/FontSizeControls"
import { PlayerContext } from "../src/contexts/PlayerContext"

type PlayerValue = NonNullable<
  ComponentProps<typeof PlayerContext.Provider>["value"]
>

const renderControls = (overrides: Partial<PlayerValue> = {}) => {
  const value = {
    handleFontSizeUp: vi.fn(),
    handleFontSizeDown: vi.fn(),
    isAutoScroll: true,
    toggleAutoScroll: vi.fn(),
    togglePdfView: vi.fn(),
    ...overrides
  } as PlayerValue
  render(
    <PlayerContext.Provider value={value}>
      <FontSizeControls />
    </PlayerContext.Provider>
  )
  return value
}

describe("FontSizeControls auto scroll button", () => {
  it("shows auto scroll as pressed when enabled", () => {
    renderControls({ isAutoScroll: true })

    expect(
      screen.getByRole("button", { name: "Auto scroll" })
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("shows auto scroll as not pressed when disabled", () => {
    renderControls({ isAutoScroll: false })

    expect(
      screen.getByRole("button", { name: "Auto scroll" })
    ).toHaveAttribute("aria-pressed", "false")
  })

  it("toggles auto scroll when clicked", () => {
    const value = renderControls()

    fireEvent.click(screen.getByRole("button", { name: "Auto scroll" }))

    expect(value.toggleAutoScroll).toHaveBeenCalledTimes(1)
  })
})

describe("FontSizeControls size buttons", () => {
  it("change the font size of a text", () => {
    const value = renderControls({ kind: "text" })

    fireEvent.click(screen.getByRole("button", { name: "Increase font size" }))
    fireEvent.click(screen.getByRole("button", { name: "Decrease font size" }))

    expect(value.handleFontSizeUp).toHaveBeenCalledTimes(1)
    expect(value.handleFontSizeDown).toHaveBeenCalledTimes(1)
  })

  it("zoom the pages of a PDF", () => {
    const value = renderControls({ kind: "pdf" })

    fireEvent.click(screen.getByRole("button", { name: "Zoom in" }))
    fireEvent.click(screen.getByRole("button", { name: "Zoom out" }))

    expect(value.handleFontSizeUp).toHaveBeenCalledTimes(1)
    expect(value.handleFontSizeDown).toHaveBeenCalledTimes(1)
  })
})

describe("FontSizeControls text view switch", () => {
  it("is not shown for a text entry", () => {
    renderControls({ kind: "text" })

    expect(
      screen.queryByRole("button", { name: "Text view" })
    ).not.toBeInTheDocument()
  })

  it("shows whether a PDF is read as text", () => {
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

  it("switches the view of a PDF when clicked", () => {
    const value = renderControls({ kind: "pdf", pdfView: "pdf" })

    fireEvent.click(screen.getByRole("button", { name: "Text view" }))

    expect(value.togglePdfView).toHaveBeenCalledTimes(1)
  })

  it("lets the size buttons change the font size of a PDF read as text", () => {
    renderControls({ kind: "pdf", pdfView: "text" })

    expect(
      screen.getByRole("button", { name: "Increase font size" })
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Decrease font size" })
    ).toBeInTheDocument()
  })
})
