import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Popup } from "../entrypoints/popup/Popup"
import type { PopupClient } from "../utils/popupClient"
import type { ReaderState } from "../utils/reader"

const reading = (state: Partial<ReaderState> = {}): ReaderState => ({
  voice: "en-A", speed: "+0%", playing: false, loading: false,
  index: 0, count: 5, word: null, error: null, ...state
})

const fakeClient = (overrides: Partial<PopupClient> = {}) => {
  let listener: ((state: ReaderState) => void) | null = null
  const client: PopupClient = {
    loadSettings: vi.fn(async () => ({ serverUrl: "http://s", voice: "en-A", speed: "+0%", autoScroll: true })),
    saveSettings: vi.fn(async changes => ({ serverUrl: "http://s", voice: "en-A", speed: "+0%", autoScroll: true, ...changes })),
    fetchVoices: vi.fn(async () => [
      { key: "en-A", name: "Aria", locale: "en-US", language: "English" },
      { key: "it-B", name: "Bruno", locale: "it-IT", language: "Italian" }
    ]),
    readerState: vi.fn(async () => null),
    switchOn: vi.fn(async () => reading()),
    send: vi.fn(async command => reading({ playing: command.type === "reader:play" })),
    onState: vi.fn(cb => { listener = cb; return () => {} }),
    ...overrides
  }
  const push = (state: ReaderState) => act(() => listener?.(state))
  return { client, push }
}

const switchOf = () => screen.getByRole("switch", { name: "Read this page" })

describe("Popup", () => {
  it("is off for the page by default, with the controls disabled", async () => {
    const { client } = fakeClient()
    render(<Popup client={client} />)
    await waitFor(() => expect(switchOf()).not.toBeChecked())
    expect(screen.getByRole("button", { name: "Play" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Forward" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Backward" })).toBeDisabled()
  })

  it("shows it on when the page is already being read", async () => {
    const { client } = fakeClient({ readerState: vi.fn(async () => reading({ playing: true })) })
    render(<Popup client={client} />)
    await waitFor(() => expect(switchOf()).toBeChecked())
    expect(screen.getByRole("button", { name: "Pause" })).toBeEnabled()
  })

  it("switches the page on and off", async () => {
    const { client } = fakeClient()
    render(<Popup client={client} />)
    await userEvent.click(await screen.findByRole("switch", { name: "Read this page" }))
    expect(client.switchOn).toHaveBeenCalled()
    await waitFor(() => expect(switchOf()).toBeChecked())
    expect(screen.getByRole("button", { name: "Play" })).toBeEnabled()

    await userEvent.click(switchOf())
    expect(client.send).toHaveBeenCalledWith({ type: "reader:off" })
    await waitFor(() => expect(switchOf()).not.toBeChecked())
  })

  it("tells when the page cannot be read", async () => {
    const { client } = fakeClient({ switchOn: vi.fn(async () => { throw new Error("nope") }) })
    render(<Popup client={client} />)
    await userEvent.click(await screen.findByRole("switch", { name: "Read this page" }))
    expect(await screen.findByText("This page cannot be read")).toBeInTheDocument()
    expect(switchOf()).not.toBeChecked()
  })

  it("plays, pauses and skips the page", async () => {
    const { client } = fakeClient({ readerState: vi.fn(async () => reading()) })
    render(<Popup client={client} />)
    await userEvent.click(await screen.findByRole("button", { name: "Play" }))
    expect(client.send).toHaveBeenCalledWith({ type: "reader:play" })
    await userEvent.click(await screen.findByRole("button", { name: "Pause" }))
    expect(client.send).toHaveBeenCalledWith({ type: "reader:pause" })
    await userEvent.click(screen.getByRole("button", { name: "Forward" }))
    expect(client.send).toHaveBeenCalledWith({ type: "reader:next" })
    await userEvent.click(screen.getByRole("button", { name: "Backward" }))
    expect(client.send).toHaveBeenCalledWith({ type: "reader:previous" })
  })

  it("follows the page as it reads", async () => {
    const { client, push } = fakeClient({ readerState: vi.fn(async () => reading()) })
    render(<Popup client={client} />)
    await screen.findByRole("button", { name: "Play" })
    push(reading({ playing: true, index: 2 }))
    expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument()
    expect(screen.getByText("3 / 5")).toBeInTheDocument()
  })

  it("picks the voice with the voice select of the app, and keeps it", async () => {
    const { client } = fakeClient({ readerState: vi.fn(async () => reading()) })
    render(<Popup client={client} />)
    const voice = await screen.findByRole("combobox", { name: "Select Voice" })
    await waitFor(() => expect(voice).toHaveValue("Aria"))
    // One field to search and pick, no separate search box
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
    await userEvent.clear(voice)
    await userEvent.type(voice, "ital")
    expect(screen.queryByRole("option", { name: "Aria" })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("option", { name: "Bruno" }))
    expect(client.saveSettings).toHaveBeenCalledWith({ voice: "it-B" })
    expect(client.send).toHaveBeenCalledWith({ type: "reader:voice", voice: "it-B" })
  })

  it("offers Auto, the server's voice, like the app", async () => {
    const { client } = fakeClient({ readerState: vi.fn(async () => reading()) })
    render(<Popup client={client} />)
    const voice = await screen.findByRole("combobox", { name: "Select Voice" })
    await waitFor(() => expect(voice).toHaveValue("Aria"))
    await userEvent.click(voice)
    await userEvent.click(await screen.findByRole("option", { name: "Auto" }))
    expect(client.saveSettings).toHaveBeenCalledWith({ voice: "" })
  })

  it("picks the speed with the speed select of the app, and keeps it", async () => {
    const { client } = fakeClient()
    render(<Popup client={client} />)
    const speed = await screen.findByRole("button", { name: /Select Speed/ })
    await waitFor(() => expect(speed).toHaveTextContent("1x"))
    await userEvent.click(speed)
    const options = await screen.findAllByRole("option")
    expect(options.map(option => option.textContent)).toEqual(["2x", "1.5x", "1x"])
    await userEvent.click(screen.getByRole("option", { name: "1.5x" }))
    expect(client.saveSettings).toHaveBeenCalledWith({ speed: "+50%" })
    // Off, nothing to tell the page
    expect(client.send).not.toHaveBeenCalled()
  })

  it("tells the page the new speed while it is on", async () => {
    const { client } = fakeClient({ readerState: vi.fn(async () => reading()) })
    render(<Popup client={client} />)
    await screen.findByRole("button", { name: "Play" })
    await userEvent.click(screen.getByRole("button", { name: /Select Speed/ }))
    await userEvent.click(await screen.findByRole("option", { name: "2x" }))
    expect(client.send).toHaveBeenCalledWith({ type: "reader:speed", speed: "+100%" })
  })

  it("turns auto scroll off and on, like the app, and keeps it", async () => {
    const { client } = fakeClient()
    render(<Popup client={client} />)
    const button = await screen.findByRole("button", { name: "Auto scroll" })
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"))
    expect(button).toHaveAttribute("title", "Auto scroll on")
    await userEvent.click(button)
    expect(button).toHaveAttribute("aria-pressed", "false")
    expect(button).toHaveAttribute("title", "Auto scroll off")
    expect(client.saveSettings).toHaveBeenCalledWith({ autoScroll: false })
    // Off, nothing to tell the page
    expect(client.send).not.toHaveBeenCalled()
  })

  it("tells the page about auto scroll while it is on", async () => {
    const { client } = fakeClient({ readerState: vi.fn(async () => reading()) })
    render(<Popup client={client} />)
    await screen.findByRole("button", { name: "Play" })
    const button = screen.getByRole("button", { name: "Auto scroll" })
    await waitFor(() => expect(button).toHaveAttribute("aria-pressed", "true"))
    await userEvent.click(button)
    expect(client.send).toHaveBeenCalledWith({ type: "reader:autoScroll", autoScroll: false })
  })

  it("shows what went wrong while reading", async () => {
    const { client, push } = fakeClient({ readerState: vi.fn(async () => reading()) })
    render(<Popup client={client} />)
    await screen.findByRole("button", { name: "Play" })
    push(reading({ error: "Cannot reach the server at http://s" }))
    expect(screen.getByText("Cannot reach the server at http://s")).toBeInTheDocument()
  })

  it("changes the server, listing its voices", async () => {
    const { client } = fakeClient()
    render(<Popup client={client} />)
    const server = await screen.findByRole("textbox", { name: "Server" })
    await waitFor(() => expect(server).toHaveValue("http://s"))
    await userEvent.clear(server)
    await userEvent.type(server, "http://other")
    await userEvent.click(screen.getByRole("button", { name: "Save" }))
    expect(client.saveSettings).toHaveBeenCalledWith({ serverUrl: "http://other" })
    await waitFor(() => expect(client.fetchVoices).toHaveBeenLastCalledWith("http://other"))
  })

  it("tells when the voices cannot be listed", async () => {
    const { client } = fakeClient({
      fetchVoices: vi.fn(async () => { throw new Error("Cannot reach the server at http://s") })
    })
    render(<Popup client={client} />)
    expect(await screen.findByText("Cannot reach the server at http://s")).toBeInTheDocument()
  })
})
