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
    loadSettings: vi.fn(async () => ({ serverUrl: "http://s", voice: "en-A", speed: "+0%" })),
    saveSettings: vi.fn(async changes => ({ serverUrl: "http://s", voice: "en-A", speed: "+0%", ...changes })),
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

  it("picks the voice, searching the list, and keeps it", async () => {
    const { client } = fakeClient({ readerState: vi.fn(async () => reading()) })
    render(<Popup client={client} />)
    const voice = await screen.findByRole("combobox", { name: "Voice" })
    await waitFor(() => expect(voice).toHaveValue("en-A"))
    await userEvent.type(screen.getByRole("searchbox", { name: "Search voices" }), "ital")
    expect(screen.queryByRole("option", { name: /Aria/ })).not.toBeInTheDocument()
    await userEvent.selectOptions(voice, "it-B")
    expect(client.saveSettings).toHaveBeenCalledWith({ voice: "it-B" })
    expect(client.send).toHaveBeenCalledWith({ type: "reader:voice", voice: "it-B" })
  })

  it("picks the speed, and keeps it", async () => {
    const { client } = fakeClient()
    render(<Popup client={client} />)
    await userEvent.selectOptions(await screen.findByRole("combobox", { name: "Speed" }), "+50%")
    expect(client.saveSettings).toHaveBeenCalledWith({ speed: "+50%" })
    // Off, nothing to tell the page
    expect(client.send).not.toHaveBeenCalled()
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
