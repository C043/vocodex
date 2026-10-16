import type { Settings } from "./api"
import type { AudioEvent, OffscreenCommand } from "./messages"
import type { Synthesis } from "./reader"

type Player = {
  play: (tabId: number, audio: string, at: number, rate: number) => unknown
  pause: (tabId: number) => unknown
  setRate: (tabId: number, rate: number) => unknown
}

type RouterDeps = {
  player: Player
  sendToTab: (tabId: number, event: AudioEvent) => unknown
  loadSettings: () => Promise<Settings>
  synthesize: (serverUrl: string, text: string, voice: string) => Promise<Synthesis>
}

type Sender = { tab?: { id?: number } }

// What the background does with a message. Messages it does not handle
// get undefined, so the popup or the offscreen page can answer them
export const createRouter = (deps: RouterDeps) =>
  // Any message of the extension reaches the background
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (message: any, sender: Sender): Promise<unknown> | undefined => {
    if (message?.target === "offscreen") return undefined
    const tabId = sender.tab?.id

    switch (message?.type) {
      case "synthesize":
        return (async () => {
          try {
            const { serverUrl } = await deps.loadSettings()
            return await deps.synthesize(serverUrl, message.text, message.voice)
          } catch (err) {
            return { error: err instanceof Error ? err.message : String(err) }
          }
        })()
      case "audio:play":
        if (tabId === undefined) return undefined
        return Promise.resolve(deps.player.play(tabId, message.audio, message.at, message.rate))
      case "audio:pause":
        if (tabId === undefined) return undefined
        return Promise.resolve(deps.player.pause(tabId))
      case "audio:rate":
        if (tabId === undefined) return undefined
        return Promise.resolve(deps.player.setRate(tabId, message.rate))
      case "audio:event":
        return Promise.resolve(deps.sendToTab(message.tabId, message.event))
      default:
        return undefined
    }
  }

// Chrome plays from an offscreen page: the service worker has no audio. The
// page is opened before playing, as Chrome closes it after a while of silence
export const createOffscreenPlayer = (
  ensureDocument: () => Promise<void>,
  send: (command: OffscreenCommand) => Promise<unknown> | unknown
): Player => {
  // A closed offscreen page has nothing to pause
  const trySend = async (command: OffscreenCommand) => {
    try {
      await send(command)
    } catch {
      // No offscreen page open
    }
  }
  return {
    play: async (tabId, audio, at, rate) => {
      await ensureDocument()
      await send({ target: "offscreen", type: "audio:play", tabId, audio, at, rate })
    },
    pause: tabId => trySend({ target: "offscreen", type: "audio:pause", tabId }),
    setRate: (tabId, rate) => trySend({ target: "offscreen", type: "audio:rate", tabId, rate })
  }
}
