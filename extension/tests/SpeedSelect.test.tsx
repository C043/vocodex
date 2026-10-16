import { describe, it, expect, vi } from "vitest"
import { useState } from "react"
import userEvent from "@testing-library/user-event"
import { fireEvent, render, screen } from "./render"
import { SpeedSelect } from "../components/SpeedSelect"
import { speedOptions } from "../utils/speed"

const renderSelect = (initial = "+0%") => {
  const onChange = vi.fn()
  const Wrapper = () => {
    const [speed, setSpeed] = useState(initial)
    return (
      <SpeedSelect
        speeds={speedOptions}
        selectedSpeed={speed}
        onChange={selected => {
          onChange(selected)
          setSpeed(selected)
        }}
      />
    )
  }
  render(<Wrapper />)
  return { onChange, trigger: screen.getByRole("button", { name: /Select Speed/ }) }
}

describe("speedOptions", () => {
  it("offers 2x, 1.5x and 1x", () => {
    expect(speedOptions).toEqual([
      { key: "+100%", label: "2x" },
      { key: "+50%", label: "1.5x" },
      { key: "+0%", label: "1x" }
    ])
  })
})

describe("SpeedSelect", () => {
  it("shows the current speed", () => {
    const { trigger } = renderSelect("+50%")
    expect(trigger).toHaveTextContent("1.5x")
  })

  it("picks a speed", async () => {
    const { trigger, onChange } = renderSelect()
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByRole("option", { name: "2x" }))
    expect(onChange).toHaveBeenCalledWith("+100%")
    expect(trigger).toHaveTextContent("2x")
  })

  it("keeps the current speed when it is picked again", async () => {
    const { trigger, onChange } = renderSelect()
    await userEvent.click(trigger)
    await userEvent.click(await screen.findByRole("option", { name: "1x" }))
    expect(onChange).not.toHaveBeenCalled()
    expect(trigger).toHaveTextContent("1x")
  })

  it("keeps the list open while the page scrolls", async () => {
    const { trigger } = renderSelect()
    await userEvent.click(trigger)
    fireEvent.scroll(document)
    expect(trigger).toHaveAttribute("aria-expanded", "true")
  })
})
