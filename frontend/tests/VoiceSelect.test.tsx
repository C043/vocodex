import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { useState } from "react"
import userEvent from "@testing-library/user-event"
import {
  render,
  screen,
  waitForElementToBeRemoved,
  within
} from "./test-utils"
import { VoiceSelect } from "../src/components/player/VoiceSelect"
import { VoiceOption } from "../src/contexts/PlayerContext"
import { setScreenWidth, resetScreenWidth } from "./mediaQuery"

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

const renderVoiceSelect = (
  selectedVoice = "",
  onChange = vi.fn(),
  isDisabled = false
) => {
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
        isDisabled={isDisabled}
      />
    )
  }
  render(<Wrapper />)
  return { onChange }
}

const renderSelect = (selectedVoice = "", onChange = vi.fn()) => ({
  ...renderVoiceSelect(selectedVoice, onChange),
  input: screen.getByRole("combobox")
})

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

describe("VoiceSelect on a phone", () => {
  beforeEach(() => setScreenWidth(390))
  afterEach(resetScreenWidth)

  const picker = () => screen.getByRole("dialog", { name: "Choose a voice" })
  const pickerOptions = () =>
    within(picker())
      .getAllByRole("option")
      .map(option => option.textContent)

  const openPicker = async () => {
    await userEvent.click(screen.getByRole("button", { name: /voice/i }))
    return picker()
  }

  it("shows the current voice on a button instead of a combobox", () => {
    renderVoiceSelect("en-GB-RyanNeural")

    expect(screen.queryByRole("combobox")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: /voice/i })).toHaveTextContent(
      "Ryan"
    )
  })

  it("opens a full screen list of every voice grouped by language", async () => {
    renderVoiceSelect()
    const dialog = await openPicker()

    expect(pickerOptions()).toEqual(["Auto", "Katja", "Libby", "Ryan", "Ava"])
    expect(
      within(dialog).getByRole("group", { name: "English (United Kingdom)" })
    ).toBeInTheDocument()
    expect(
      within(dialog).getByRole("group", { name: "German (Germany)" })
    ).toBeInTheDocument()
  })

  it("marks the current voice", async () => {
    renderVoiceSelect("en-GB-LibbyNeural")
    const dialog = await openPicker()

    expect(within(dialog).getByRole("option", { name: "Libby" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
    expect(within(dialog).getByRole("option", { name: "Ryan" })).toHaveAttribute(
      "aria-selected",
      "false"
    )
  })

  it("searches by voice name or language", async () => {
    renderVoiceSelect()
    const dialog = await openPicker()
    const search = within(dialog).getByRole("searchbox")

    await userEvent.type(search, "lib")
    expect(pickerOptions()).toEqual(["Libby"])

    await userEvent.clear(search)
    await userEvent.type(search, "english (united k")
    expect(pickerOptions()).toEqual(["Libby", "Ryan"])
  })

  it("says so when no voice matches", async () => {
    renderVoiceSelect()
    const dialog = await openPicker()
    await userEvent.type(within(dialog).getByRole("searchbox"), "klingon")

    expect(within(dialog).getByText("No voices found")).toBeInTheDocument()
  })

  it("selects a voice and closes", async () => {
    const { onChange } = renderVoiceSelect()
    const dialog = await openPicker()
    await userEvent.click(within(dialog).getByRole("option", { name: "Ava" }))

    expect(onChange).toHaveBeenCalledWith("en-US-AvaMultilingualNeural")
    await waitForElementToBeRemoved(dialog)
    expect(screen.getByRole("button", { name: /voice/i })).toHaveTextContent(
      "Ava"
    )
  })

  it("stores Auto as an empty voice", async () => {
    const { onChange } = renderVoiceSelect("en-GB-RyanNeural")
    const dialog = await openPicker()
    await userEvent.click(within(dialog).getByRole("option", { name: "Auto" }))

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("closes without a change and starts the next search afresh", async () => {
    const { onChange } = renderVoiceSelect("en-GB-RyanNeural")
    let dialog = await openPicker()
    await userEvent.type(within(dialog).getByRole("searchbox"), "german")
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }))
    await waitForElementToBeRemoved(dialog)

    expect(onChange).not.toHaveBeenCalled()
    dialog = await openPicker()
    expect(within(dialog).getByRole("searchbox")).toHaveValue("")
  })

  it("keeps typed keys from triggering the player shortcuts", async () => {
    const onKeyDown = vi.fn()
    window.addEventListener("keydown", onKeyDown)
    renderVoiceSelect()
    const dialog = await openPicker()
    await userEvent.type(within(dialog).getByRole("searchbox"), "en gb")
    window.removeEventListener("keydown", onKeyDown)

    expect(onKeyDown).not.toHaveBeenCalled()
  })

  it("can be disabled", () => {
    renderVoiceSelect("", vi.fn(), true)
    expect(screen.getByRole("button", { name: /voice/i })).toBeDisabled()
  })
})
