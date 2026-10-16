import { describe, it, expect, vi } from "vitest"
import { useState } from "react"
import userEvent from "@testing-library/user-event"
import { render, screen, within } from "./render"
import { VoiceSelect } from "../components/VoiceSelect"
import type { VoiceOption } from "../utils/api"

const voices: VoiceOption[] = [
  {
    key: "de-DE-KatjaNeural",
    name: "Katja",
    locale: "de-DE",
    language: "German (Germany)"
  },
  {
    key: "en-GB-LibbyNeural",
    name: "Libby",
    locale: "en-GB",
    language: "English (United Kingdom)"
  },
  {
    key: "en-GB-RyanNeural",
    name: "Ryan",
    locale: "en-GB",
    language: "English (United Kingdom)"
  },
  {
    key: "en-US-AvaMultilingualNeural",
    name: "Ava",
    locale: "en-US",
    language: "English (United States)"
  }
]

const renderSelect = (selectedVoice = "", onChange = vi.fn()) => {
  const Wrapper = () => {
    const [voice, setVoice] = useState(selectedVoice)
    return (
      <VoiceSelect
        voices={voices}
        selectedVoice={voice}
        onChange={selected => {
          onChange(selected)
          setVoice(selected)
        }}
      />
    )
  }
  render(<Wrapper />)
  return { onChange, input: screen.getByRole("combobox") }
}

const optionNames = () =>
  within(screen.getByRole("listbox"))
    .getAllByRole("option")
    .map(option => option.textContent)

describe("VoiceSelect", () => {
  it("shows Auto when no voice is saved", () => {
    const { input } = renderSelect()
    expect(input).toHaveValue("Auto")
  })

  it("shows the voice name for the saved voice", () => {
    const { input } = renderSelect("en-GB-RyanNeural")
    expect(input).toHaveValue("Ryan")
  })

  it("falls back to a name parsed from an unknown voice key", () => {
    const { input } = renderSelect("en-GB-AdaMultilingualNeural")
    expect(input).toHaveValue("Ada")
  })

  it("groups every voice under its language", async () => {
    const { input } = renderSelect()
    await userEvent.click(input)

    expect(optionNames()).toEqual(["Auto", "Katja", "Libby", "Ryan", "Ava"])
    expect(screen.getByText("English (United Kingdom)")).toBeInTheDocument()
    expect(screen.getByText("German (Germany)")).toBeInTheDocument()
  })

  it("filters by voice name", async () => {
    const { input } = renderSelect()
    await userEvent.clear(input)
    await userEvent.type(input, "lib")

    expect(optionNames()).toEqual(["Libby"])
  })

  it("filters by language, including spaces", async () => {
    const { input } = renderSelect()
    await userEvent.clear(input)
    await userEvent.type(input, "english (united k")

    expect(optionNames()).toEqual(["Libby", "Ryan"])
    expect(screen.queryByText("German (Germany)")).not.toBeInTheDocument()
  })

  it("selects a voice and resets the search", async () => {
    const { input, onChange } = renderSelect()
    await userEvent.clear(input)
    await userEvent.type(input, "ava")
    await userEvent.click(screen.getByRole("option", { name: "Ava" }))

    expect(onChange).toHaveBeenCalledWith("en-US-AvaMultilingualNeural")
    expect(input).toHaveValue("Ava")
  })

  it("stores Auto as an empty voice", async () => {
    const { input, onChange } = renderSelect("en-GB-RyanNeural")
    await userEvent.click(input)
    await userEvent.click(screen.getByRole("option", { name: "Auto" }))

    expect(onChange).toHaveBeenCalledWith("")
    expect(input).toHaveValue("Auto")
  })

  it("restores the current voice when closing without selecting", async () => {
    const { input, onChange } = renderSelect("en-GB-RyanNeural")
    await userEvent.clear(input)
    await userEvent.type(input, "german")
    await userEvent.keyboard("{Escape}")
    await userEvent.tab()

    expect(onChange).not.toHaveBeenCalled()
    expect(input).toHaveValue("Ryan")
  })
})
