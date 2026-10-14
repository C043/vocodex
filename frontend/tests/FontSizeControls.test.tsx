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
