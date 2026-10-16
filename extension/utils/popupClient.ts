import { browser } from "wxt/browser"
import { fetchVoices, loadSettings, saveSettings, type Settings, type VoiceOption } from "./api"
import type { ReaderChanged, ReaderCommand } from "./messages"
import type { ReaderState } from "./reader"

// What the popup needs from the extension, for the tab it was opened on
export type PopupClient = {
  loadSettings: () => Promise<Settings>
  saveSettings: (changes: Partial<Settings>) => Promise<Settings>
  fetchVoices: (serverUrl: string) => Promise<VoiceOption[]>
  // null while the page is not being read
  readerState: () => Promise<ReaderState | null>
  switchOn: () => Promise<ReaderState>
  send: (command: ReaderCommand) => Promise<ReaderState | null>
  onState: (listener: (state: ReaderState) => void) => () => void
}

// Built by WXT from entrypoints/reader.content.ts
const READER_SCRIPT = "/content-scripts/reader.js"

const activeTabId = async () => {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
  if (tab?.id === undefined) throw new Error("No tab to read")
  return tab.id
}

export const createPopupClient = (): PopupClient => {
  const tabId = activeTabId()

  // A page without the reader has nothing to answer
  const send = async (command: ReaderCommand) => {
    try {
      return ((await browser.tabs.sendMessage(await tabId, command)) as ReaderState) ?? null
    } catch {
      return null
    }
  }

  return {
    loadSettings,
    saveSettings,
    fetchVoices,
    readerState: () => send({ type: "reader:state" }),
    send,
    switchOn: async () => {
      // The reader is only added once switched on, so it is off on every
      // page until then
      await browser.scripting.executeScript({
        target: { tabId: await tabId },
        files: [READER_SCRIPT]
      })
      const state = await send({ type: "reader:state" })
      if (!state) throw new Error("The reader did not start")
      return state
    },
    onState: listener => {
      const onMessage = (message: unknown, sender: { tab?: { id?: number } }) => {
        const changed = message as ReaderChanged
        if (changed?.type !== "reader:changed") return
        tabId.then(id => {
          if (sender.tab?.id === id) listener(changed.state)
        })
      }
      browser.runtime.onMessage.addListener(onMessage)
      return () => browser.runtime.onMessage.removeListener(onMessage)
    }
  }
}
