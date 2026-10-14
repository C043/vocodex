import { describe, it, expect, vi } from "vitest"
import type { ComponentProps } from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, within, fireEvent } from "./test-utils"
import { FontSelect } from "../src/components/player/FontSelect"
import { PlayerContext } from "../src/contexts/PlayerContext"
import { readerFontFamily } from "../src/utils/fonts"

type PlayerValue = NonNullable<
  ComponentProps<typeof PlayerContext.Provider>["value"]
>

const renderSelect = (overrides: Partial<PlayerValue> = {}) => {
  const value = {
    currentFont: "literata",
    setFont: vi.fn(),
    ...overrides
  } as PlayerValue
  render(
    <PlayerContext.Provider value={value}>
      <FontSelect />
    </PlayerContext.Provider>
  )
  return value
}

const trigger = () => screen.getByRole("button", { name: /Select Font/ })

describe("FontSelect", () => {
  it("shows the current font", () => {
    renderSelect({ currentFont: "lora" })

    expect(trigger()).toHaveTextContent("Lora")
  })

  it("lists every font in its own typeface", async () => {
    renderSelect()
    await userEvent.click(trigger())

    const option = screen.getByRole("option", { name: "Roboto" })
    expect(within(option).getByText("Roboto")).toHaveStyle({
      fontFamily: readerFontFamily("roboto")
    })
    expect(screen.getAllByRole("option")).toHaveLength(8)
  })

  it("changes the font when one is picked", async () => {
    const value = renderSelect()
    await userEvent.click(trigger())
    await userEvent.click(screen.getByRole("option", { name: "Merriweather" }))

    expect(value.setFont).toHaveBeenCalledWith("merriweather")
  })

  it("stays open while the reader auto scrolls", async () => {
    renderSelect()
    await userEvent.click(trigger())

    fireEvent.scroll(document)

    expect(trigger()).toHaveAttribute("aria-expanded", "true")
  })
})
